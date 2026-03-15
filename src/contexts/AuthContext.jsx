import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { DEFAULT_ROLE } from '../lib/permissions';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Secondary Firebase app for creating users without logging out the admin
let secondaryApp = null;
let secondaryAuth = null;

const getSecondaryAuth = () => {
    if (!secondaryAuth) {
        const config = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        };
        secondaryApp = initializeApp(config, 'SecondaryApp');
        secondaryAuth = getAuth(secondaryApp);
    }
    return secondaryAuth;
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Login function
    const login = async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    // Logout function
    const logout = async () => {
        return signOut(auth);
    };

    // Create a new user without logging out the current admin
    const createUser = async (email, password, role, companyId) => {
        const secAuth = getSecondaryAuth();
        try {
            const userCredential = await createUserWithEmailAndPassword(secAuth, email, password);
            const newUid = userCredential.user.uid;

            // Save role document
            await setDoc(doc(db, 'role', newUid), {
                role: role,
                companyId: companyId || null,
                email: email,
                createdAt: serverTimestamp(),
                createdBy: auth.currentUser?.uid || 'unknown'
            });

            // Sign out from secondary auth immediately
            await signOut(secAuth);

            return newUid;
        } catch (error) {
            // Ensure secondary auth is cleaned up
            try { await signOut(secAuth); } catch (_) {}
            throw error;
        }
    };

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setLoading(true);

                // Fetch user role from Firestore
                try {
                    const roleDocRef = doc(db, 'role', user.uid);
                    const roleDoc = await getDoc(roleDocRef);

                    let userRole = DEFAULT_ROLE;
                    let userCompanyId = null;

                    if (roleDoc.exists()) {
                        const data = roleDoc.data();
                        userRole = data.role || DEFAULT_ROLE;
                        userCompanyId = data.companyId || null;
                    }

                    console.log(`User ${user.email} role: ${userRole}, company: ${userCompanyId}`);
                    setCurrentUser({ ...user, role: userRole, companyId: userCompanyId });
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setCurrentUser({ ...user, role: DEFAULT_ROLE, companyId: null });
                } finally {
                    setLoading(false);
                }
            } else {
                setCurrentUser(null);
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        login,
        logout,
        createUser,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
