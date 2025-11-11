'use client'
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut as firebaseSignOut,
    onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../../../firebase';

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
    const [userTokens, setUserTokens] = useState(20);
    const [loading, setLoading] = useState(true);

    // Fetch user tokens from Firestore
    const fetchUserTokens = async (uid) => {
        if (!db) return;
        
        try {
            const userDocRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const data = userDoc.data();
                setUserTokens(data.tokens || 0);
            }
        } catch (error) {
            console.error('Error fetching user tokens:', error);
        }
    };

    // Listen to auth state changes
    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            
            if (user) {
                await fetchUserTokens(user.uid);
            } else {
                setUserTokens(0);
            }
            
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signup = async (email, password) => {
        if (!auth || !db) {
            throw new Error('Firebase not configured');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user document in Firestore with 20 starting tokens
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
            email: user.email,
            tokens: 20,
            createdAt: new Date().toISOString(),
            tokensUsed: 0
        });

        setUserTokens(20);
        return user;
    };

    const login = async (email, password) => {
        if (!auth) {
            throw new Error('Firebase not configured');
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await fetchUserTokens(userCredential.user.uid);
        return userCredential.user;
    };

    const logout = async () => {
        if (!auth) {
            throw new Error('Firebase not configured');
        }

        await firebaseSignOut(auth);
        setUserTokens(0);
    };

    const addTokens = async (amount) => {
        if (!currentUser || !db) return;

        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            
            // Update tokens in Firestore
            await updateDoc(userDocRef, {
                tokens: increment(-amount),
                tokensUsed: increment(amount)
            });

            // Update local state
            setUserTokens(prev => prev - amount);
        } catch (error) {
            console.error('Error updating tokens:', error);
            throw error;
        }
    };

    const purchaseTokens = async (amount) => {
        if (!currentUser || !db) return;

        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            
            // Add tokens in Firestore
            await updateDoc(userDocRef, {
                tokens: increment(amount)
            });

            // Update local state
            setUserTokens(prev => prev + amount);
        } catch (error) {
            console.error('Error purchasing tokens:', error);
            throw error;
        }
    };

    const value = {
        currentUser,
        userTokens,
        loading,
        signup,
        login,
        logout,
        addTokens,
        purchaseTokens,
        refreshTokens: () => currentUser ? fetchUserTokens(currentUser.uid) : null
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
