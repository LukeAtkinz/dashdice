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
      
      // Generate userTag from displayName or email
      let userTag = '';
      if (displayName) {
        userTag = `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      } else if (email) {
        userTag = `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      } else {
        userTag = `@user${firebaseUser.uid.slice(-6)}`;
      }

      try {
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          displayName,
          email,
          photoURL,
          createdAt,
          lastLoginAt: createdAt,
          updatedAt: createdAt,
          userTag,
          inventory: {
            displayBackgroundEquipped: "New Day",
            matchBackgroundEquipped: "Long Road Ahead",
            ownedBackgrounds: [
              "default",
              "All For Glory", 
              "Long Road Ahead",
              "Relax",
              "New Day",
              "On A Mission",
              "Underwater"
            ]
          },
          stats: {
            bestStreak: 0,
            currentStreak: 0,
            gamesPlayed: 0,
            matchWins: 0
          },
          settings: {
            notificationsEnabled: true,
            soundEnabled: true,
            theme: "auto"
          },
          ...additionalData,
        });
      } catch (error) {
        console.error('Error creating user document:', error);
      }
    } else {
      // Update last login time and migrate user if needed
      try {
        const userData = userSnap.data();
        
        // Check if user needs migration to new structure
        const needsMigration = !userData.inventory || Array.isArray(userData.inventory) || 
                              !userData.stats || !userData.settings || !userData.userTag;
        
        if (needsMigration) {
          console.log('Migrating user profile to new structure:', firebaseUser.uid);
          await migrateUserProfile(firebaseUser.uid, userData);
        } else {
          // Just update last login
          await updateDoc(userRef, {
            lastLoginAt: new Date(),
          });
        }
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
        
        // Check if user has old structure and migrate if needed
        const needsMigration = !userData.inventory || Array.isArray(userData.inventory) || 
                              !userData.stats || !userData.settings || !userData.userTag;
        
        if (needsMigration) {
          console.log('Migrating user profile to new structure:', uid);
          await migrateUserProfile(uid, userData);
          // Re-fetch the data after migration
          const updatedSnap = await getDoc(userRef);
          if (updatedSnap.exists()) {
            const updatedData = updatedSnap.data();
            return buildUserObject(uid, updatedData);
          }
        }
        
        return buildUserObject(uid, userData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    return null;
  };

  const buildUserObject = (uid: string, userData: any): User => {
    return {
      uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      createdAt: userData.createdAt?.toDate() || new Date(),
      lastLoginAt: userData.lastLoginAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      userTag: userData.userTag || `@${userData.email?.split('@')[0] || 'user'}`,
      inventory: {
        displayBackgroundEquipped: userData.inventory?.displayBackgroundEquipped || "New Day",
        matchBackgroundEquipped: userData.inventory?.matchBackgroundEquipped || "Long Road Ahead", 
        ownedBackgrounds: userData.inventory?.ownedBackgrounds || [
          "default",
          "All For Glory", 
          "Long Road Ahead",
          "Relax",
          "New Day",
          "On A Mission",
          "Underwater"
        ]
      },
      stats: {
        bestStreak: userData.stats?.bestStreak || 0,
        currentStreak: userData.stats?.currentStreak || 0,
        gamesPlayed: userData.stats?.gamesPlayed || 0,
        matchWins: userData.stats?.matchWins || 0
      },
      settings: {
        notificationsEnabled: userData.settings?.notificationsEnabled ?? true,
        soundEnabled: userData.settings?.soundEnabled ?? true,
        theme: userData.settings?.theme || "auto"
      }
    };
  };

  const migrateUserProfile = async (uid: string, oldData: any) => {
    try {
      const userRef = doc(db, 'users', uid);
      
      // Generate userTag if missing
      let userTag = oldData.userTag;
      if (!userTag) {
        if (oldData.displayName) {
          userTag = `@${oldData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        } else if (oldData.email) {
          userTag = `@${oldData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        } else {
          userTag = `@user${uid.slice(-6)}`;
        }
      }

      const updateData: any = {
        updatedAt: new Date(),
        userTag,
        lastLoginAt: new Date()
      };

      // Migrate inventory structure
      if (!oldData.inventory || Array.isArray(oldData.inventory)) {
        updateData.inventory = {
          displayBackgroundEquipped: oldData.displayBackgroundEquipped || oldData.equippedBackground || "New Day",
          matchBackgroundEquipped: oldData.matchBackgroundEquipped || "Long Road Ahead",
          ownedBackgrounds: oldData.ownedBackgrounds || [
            "default",
            "All For Glory", 
            "Long Road Ahead",
            "Relax",
            "New Day",
            "On A Mission",
            "Underwater"
          ]
        };
      }

      // Add stats if missing - Reset all to 0 as requested
      if (!oldData.stats) {
        updateData.stats = {
          bestStreak: 0,
          currentStreak: 0,
          gamesPlayed: 0,
          matchWins: 0
        };
      } else {
        // Reset existing stats to 0 as requested
        updateData.stats = {
          bestStreak: 0,
          currentStreak: 0,
          gamesPlayed: 0,
          matchWins: 0
        };
      }

      // Add settings if missing
      if (!oldData.settings) {
        updateData.settings = {
          notificationsEnabled: true,
          soundEnabled: true,
          theme: "auto"
        };
      }

      // Remove old fields that shouldn't exist anymore
      const fieldsToRemove = ['equippedBackground', 'ownedBackgrounds'];
      for (const field of fieldsToRemove) {
        if (oldData[field] !== undefined) {
          updateData[field] = null; // Firebase will delete fields set to null
        }
      }

      await updateDoc(userRef, updateData);
      console.log('Successfully migrated user profile:', uid);
    } catch (error) {
      console.error('Error migrating user profile:', error);
    }
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
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      await updateProfile(result.user, { displayName });
      
      // Create user document in Firestore
      await createUserDocument(result.user, { displayName });
    } catch (error) {
      console.error('Error signing up:', error);
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

  const refreshUser = async () => {
    if (user) {
      try {
        console.log('🔄 Refreshing user data from Firebase...');
        const userData = await getUserData(user.uid);
        console.log('📥 Retrieved updated user data:', userData?.inventory?.displayBackgroundEquipped);
        setUser(userData);
        console.log('✅ User data refreshed successfully');
      } catch (error) {
        console.error('❌ Error refreshing user data:', error);
      }
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
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
