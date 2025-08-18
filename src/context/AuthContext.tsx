'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { User, AuthContextType } from '@/types';
import { AVAILABLE_BACKGROUNDS, getDefaultBackground } from '@/config/backgrounds';
import { UserService } from '@/services/userService';
import { FriendsService } from '@/services/friendsService';
import { validateDisplayName, formatDisplayName, generateDisplayNameFromEmail } from '@/utils/contentModeration';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const createUserDocument = async (firebaseUser: FirebaseUser, additionalData?: any) => {
    if (!firebaseUser) return;

    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const { displayName, email, photoURL } = firebaseUser;
      const createdAt = new Date();
      // Set "Long Road Ahead" as the default background for new users
      const longRoadAheadBackground = AVAILABLE_BACKGROUNDS.find(bg => bg.id === 'long-road-ahead') || getDefaultBackground();

      // Ensure displayName is never null - generate from email if needed
      const finalDisplayName = displayName || 
        additionalData?.displayName || 
        generateDisplayNameFromEmail(email || '');

      // Generate unique friend code
      const friendCode = await FriendsService.generateUniqueFriendCode();

      try {
        await setDoc(userRef, {
          displayName: additionalData?.displayName || finalDisplayName,
          email,
          photoURL,
          createdAt,
          lastLoginAt: createdAt,
          friendCode,
          isOnline: false,
          status: 'offline',
          privacy: {
            allowFriendRequests: true,
            showOnlineStatus: true,
            allowGameInvites: true,
            showActivity: true
          },
          inventory: {
            displayBackgroundEquipped: {
              name: longRoadAheadBackground.name,
              file: longRoadAheadBackground.filename,
              type: longRoadAheadBackground.type
            },
            matchBackgroundEquipped: {
              name: longRoadAheadBackground.name,
              file: longRoadAheadBackground.filename,
              type: longRoadAheadBackground.type
            },
            ownedBackgrounds: AVAILABLE_BACKGROUNDS.map(bg => bg.id) // Grant all backgrounds to new users
          },
          ownedBackgrounds: AVAILABLE_BACKGROUNDS.map(bg => bg.id), // Grant all backgrounds to new users (legacy support)
          equippedBackground: longRoadAheadBackground.id, // Set "Long Road Ahead" as default background
          ...additionalData,
        });
      } catch (error) {
        console.error('Error creating user document:', error);
      }
    } else {
      // Update last login time
      try {
        await updateDoc(userRef, {
          lastLoginAt: new Date(),
        });
      } catch (error) {
        console.error('Error updating last login:', error);
      }
    }

    return userRef;
  };

  const getUserData = async (uid: string): Promise<User | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // If user doesn't have a friend code, generate one
        let friendCode = userData.friendCode;
        if (!friendCode) {
          try {
            friendCode = await FriendsService.generateUniqueFriendCode();
            await updateDoc(userRef, { friendCode });
          } catch (error) {
            console.error('Error generating friend code for existing user:', error);
            // If we can't generate one now, it will be generated on next login
          }
        }
        
        return {
          uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          friendCode: friendCode,
          createdAt: userData.createdAt?.toDate() || new Date(),
          lastLoginAt: userData.lastLoginAt?.toDate() || new Date(),
          inventory: userData.inventory || [],
          ownedBackgrounds: userData.ownedBackgrounds || AVAILABLE_BACKGROUNDS.map(bg => bg.id),
          equippedBackground: userData.equippedBackground || getDefaultBackground().id,
        };
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    return null;
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await createUserDocument(result.user);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      // Validate display name before creating account
      const validation = validateDisplayName(displayName);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const formattedDisplayName = formatDisplayName(displayName);
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name in Firebase Auth
      await updateProfile(result.user, { displayName: formattedDisplayName });
      
      // Create user document in Firestore with validated display name
      await createUserDocument(result.user, { displayName: formattedDisplayName });
    } catch (error: any) {
      console.error('Error signing up:', error);
      // Re-throw with proper error message for display name validation
      if (error.message && !error.code) {
        throw new Error(error.message);
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: { displayName?: string }) => {
    try {
      if (!user?.uid) {
        throw new Error('No user logged in');
      }

      // Update in UserService (Firestore)
      const result = await UserService.updateProfile(user.uid, updates);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Update Firebase Auth if displayName changed
      if (updates.displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: updates.displayName });
      }

      // Refresh user data
      const updatedUserData = await getUserData(user.uid);
      if (updatedUserData) {
        setUser(updatedUserData);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await createUserDocument(firebaseUser);
        const userData = await getUserData(firebaseUser.uid);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
