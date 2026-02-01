import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Determine if this is an initial load or a re-auth/login
                // If loading is already false, it means we are re-authenticating or context updating
                // We set loading true to block UI while we fetch role
                setLoading(true);

                // Fetch user role from Firestore
                try {
                    const roleDocRef = doc(db, 'role', user.uid);
                    const roleDoc = await getDoc(roleDocRef);

                    let userRole = DEFAULT_ROLE;
                    if (roleDoc.exists()) {
                        userRole = roleDoc.data().role || DEFAULT_ROLE;
                    }

                    console.log(`User ${user.email} role: ${userRole}`); // Debug log
                    setCurrentUser({ ...user, role: userRole });
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    // Fallback to default role on error
                    setCurrentUser({ ...user, role: DEFAULT_ROLE });
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
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
