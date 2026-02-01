import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'registrations';

export const registrationService = {
    // Register for a course
    registerCourse: async (userId, courseId) => {
        try {
            // Check for duplicate
            const isRegistered = await registrationService.checkRegistration(userId, courseId);
            if (isRegistered) return null;

            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                userId,
                courseId,
                registeredAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error registering:", error);
            throw error;
        }
    },

    // Alias for registerCourse (fixes "registrationService.register is not a function")
    register: async (userId, courseId) => {
        return await registrationService.registerCourse(userId, courseId);
    },

    // Check if user is registered
    checkRegistration: async (userId, courseId) => {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('userId', '==', userId),
                where('courseId', '==', courseId)
            );
            const snapshot = await getDocs(q);
            return !snapshot.empty;
        } catch (error) {
            console.error("Error checking registration:", error);
            throw error;
        }
    },

    // Get user's registered courses
    getMyRegistrations: async (userId) => {
        try {
            const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching registrations:", error);
            throw error;
        }
    }
};
