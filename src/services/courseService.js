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
                // Determine if running locally or on Vercel
                // Local development requires 'vercel dev' to run functions at /api
                // For now, we try relative path 
                fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userIds,
                        messages: [
                            {
                                type: 'text',
                                text: `คอร์ส "${courseTitle}" ได้สิ้นสุดลงแล้ว! \nกรุณาทำแบบประเมินติดตามผลสัปดาห์ที่ 0 (ทันทีหลังจบคาบ) ที่เมนู "คอร์สของฉัน"`
                            },
                            {
                                type: "sticker",
                                packageId: "446",
                                stickerId: "1988"
                            }
                        ]
                    })
                }).catch(err => console.error("Failed to call notification API:", err));
            }

        } catch (error) {
            console.error("Error marking finished:", error);
            throw error;
        }
    }
};
