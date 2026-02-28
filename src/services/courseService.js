import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
    where
} from 'firebase/firestore';

const COLLECTION_NAME = 'courses';

export const courseService = {
    // Get all courses
    getAllCourses: async () => {
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching courses:", error);
            throw error;
        }
    },

    // Get courses by company ID
    getCoursesByCompany: async (companyId) => {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('companyId', '==', companyId)
            );
            const snapshot = await getDocs(q);
            const courses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort client-side to avoid needing a composite index
            return courses.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });
        } catch (error) {
            console.error("Error fetching courses by company:", error);
            throw error;
        }
    },

    // Get courses without a company (unassigned)
    getUnassignedCourses: async () => {
        try {
            // Firestore doesn't support where('field', '==', null) well for missing fields
            // So we fetch all and filter client-side
            const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(course => !course.companyId);
        } catch (error) {
            console.error("Error fetching unassigned courses:", error);
            throw error;
        }
    },

    // Get course by Registration Key
    getCourseByKey: async (key) => {
        try {
            const q = query(collection(db, COLLECTION_NAME), where('registrationKey', '==', key));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        } catch (error) {
            console.error("Error fetching course by key:", error);
            throw error;
        }
    },

    // Create a new course
    createCourse: async (courseData) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...courseData,
                status: 'open', // default status
                isFinished: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating course:", error);
            throw error;
        }
    },

    // Update a course
    updateCourse: async (id, courseData) => {
        try {
            const courseRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(courseRef, {
                ...courseData,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating course:", error);
            throw error;
        }
    },

    // Delete a course
    deleteCourse: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error("Error deleting course:", error);
            throw error;
        }
    },

    // Toggle registration status (Open/Closed)
    toggleStatus: async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 'open' ? 'closed' : 'open';
            const courseRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(courseRef, {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
            return newStatus;
        } catch (error) {
            console.error("Error toggling status:", error);
            throw error;
        }
    },

    // Mark class as finished (Triggers follow-up and Notifications)
    markAsFinished: async (id, courseTitle) => {
        try {
            // 1. Update Course Status
            const courseRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(courseRef, {
                isFinished: true,
                finishedAt: serverTimestamp()
            });

            // 2. Fetch Users registered for this course
            // Note: In a real large-scale app, this should be done server-side to avoid fetching thousands of docs
            const q = query(
                collection(db, 'registrations'),
                where('courseId', '==', id)
            );
            const snapshot = await getDocs(q);
            const userIds = snapshot.docs.map(doc => doc.data().userId); // Assuming 'userId' is the LINE User ID

            // 3. Call Serverless Function to Send Notifications
            if (userIds.length > 0) {
                // Import Flex Message template dynamically to keep bundle size small
                const { createCourseCompletionFlex } = await import('../lib/flexTemplates.js');

                // Get LIFF ID from environment
                const liffId = import.meta.env.VITE_LIFF_ID;

                // Create Flex Message for course completion
                const flexMessage = createCourseCompletionFlex({
                    courseTitle,
                    courseId: id,
                    liffId
                });

                // Determine if running locally or on Vercel
                // Local development requires 'vercel dev' to run functions at /api
                // For now, we try relative path 
                const response = await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userIds,
                        messages: [flexMessage]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Failed to call notification API:", errorData);
                    throw new Error(errorData.error || "Failed to send notification via line API");
                }
            }


        } catch (error) {
            console.error("Error marking finished:", error);
            throw error;
        }
    }
};
