import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'assessments';

export const formService = {
    // Get all form templates
    getAllForms: async () => {
        try {
            const snapshot = await getDocs(collection(db, 'formTemplates'));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting forms:", error);
            throw error;
        }
    },

    // Get form by ID
    getFormById: async (formId) => {
        try {
            const formDoc = await getDoc(doc(db, 'formTemplates', formId));
            if (!formDoc.exists()) return null;
            return { id: formDoc.id, ...formDoc.data() };
        } catch (error) {
            console.error("Error getting form:", error);
            throw error;
        }
    },

    // Create form template
    createForm: async (formData) => {
        try {
            const docRef = await addDoc(collection(db, 'formTemplates'), {
                ...formData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating form:", error);
            throw error;
        }
    },

    // Update form template
    updateForm: async (id, formData) => {
        try {
            await updateDoc(doc(db, 'formTemplates', id), {
                ...formData,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating form:", error);
            throw error;
        }
    },

    // Delete form template
    deleteForm: async (id) => {
        try {
            await deleteDoc(doc(db, 'formTemplates', id));
        } catch (error) {
            console.error("Error deleting form:", error);
            throw error;
        }
    },

    // Submit a response
    submitResponse: async (data) => {
        try {
            await addDoc(collection(db, 'responses'), {
                ...data,
                submittedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error submitting response:", error);
            throw error;
        }
    }
};
