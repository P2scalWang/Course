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
    serverTimestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'companyFolders';

export const companyService = {
    // Get all companies
    getAllCompanies: async () => {
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching companies:", error);
            throw error;
        }
    },

    // Create a new company folder
    createCompany: async (companyData) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...companyData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating company:", error);
            throw error;
        }
    },

    // Update a company folder
    updateCompany: async (id, companyData) => {
        try {
            const ref = doc(db, COLLECTION_NAME, id);
            await updateDoc(ref, {
                ...companyData,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating company:", error);
            throw error;
        }
    },

    // Delete a company folder
    deleteCompany: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error("Error deleting company:", error);
            throw error;
        }
    }
};
