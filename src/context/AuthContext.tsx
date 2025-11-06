'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, appleProvider } from '@/services/firebase';
import { User, AuthContextType } from '@/types';
import { AVAILABLE_BACKGROUNDS, getDefaultBackground, toUserBackground } from '@/config/backgrounds';
import { UserService } from '@/services/userService';
import { FriendsService } from '@/services/friendsService';
import { validateDisplayName, formatDisplayName, generateDisplayNameFromEmail } from '@/utils/contentModeration';
import AchievementTrackingService from '@/services/achievementTrackingService';
import { analyticsService } from '@/services/analyticsService';

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
      // Set "New Day" as the default display background and "Long Road Ahead" as match background for new users
      const newDayBackground = AVAILABLE_BACKGROUNDS.find(bg => bg.id === 'new-day') || getDefaultBackground();
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
            displayBackgroundEquipped: toUserBackground(newDayBackground),
            matchBackgroundEquipped: toUserBackground(longRoadAheadBackground),
            ownedBackgrounds: AVAILABLE_BACKGROUNDS.map(bg => bg.id) // Grant all backgrounds to new users
          },
          ownedBackgrounds: AVAILABLE_BACKGROUNDS.map(bg => bg.id), // Grant all backgrounds to new users (legacy support)
          equippedBackground: newDayBackground.id, // Set "New Day" as default display background
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
          profilePicture: userData.profilePicture,
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
      
      // Track login analytics
      analyticsService.trackLogin('email');
      analyticsService.trackDailyLogin();
      
      // Track daily login achievement
      const achievementService = AchievementTrackingService.getInstance();
      await achievementService.recordDailyLogin(result.user.uid);
      
    } catch (error) {
      console.error('Error signing in:', error);
      analyticsService.trackError('auth_signin', error instanceof Error ? error.message : 'Unknown error');
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
      
      // Initialize starter abilities for new user
      try {
        const { initializeStarterAbilities } = await import('@/services/abilityFirebaseService');
        await initializeStarterAbilities(result.user.uid);
        console.log('✅ Initialized starter abilities for new user');
      } catch (abilityError) {
        console.error('Error initializing starter abilities (non-critical):', abilityError);
        // Don't throw - this is non-critical, abilities can be initialized on first vault visit
      }
      
      // Track signup analytics
      analyticsService.trackSignUp('email');
      analyticsService.trackDailyLogin();
      
      // Track daily login achievement
      const achievementService = AchievementTrackingService.getInstance();
      await achievementService.recordDailyLogin(result.user.uid);
      
    } catch (error: any) {
      console.error('Error signing up:', error);
      analyticsService.trackError('auth_signup', error instanceof Error ? error.message : 'Unknown error');
      // Re-throw with proper error message for display name validation
      if (error.message && !error.code) {
        throw new Error(error.message);
      }
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = await createUserDocument(result.user);
      
      // Initialize starter abilities for new user (if new)
      if (userRef) {
        try {
          const { initializeStarterAbilities } = await import('@/services/abilityFirebaseService');
          await initializeStarterAbilities(result.user.uid);
          console.log('✅ Initialized starter abilities for new Google user');
        } catch (abilityError) {
          console.error('Error initializing starter abilities (non-critical):', abilityError);
        }
      }
      
      // Track Google login analytics
      analyticsService.trackLogin('google');
      analyticsService.trackDailyLogin();
      
      // Track daily login achievement
      const achievementService = AchievementTrackingService.getInstance();
      await achievementService.recordDailyLogin(result.user.uid);
      
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      analyticsService.trackError('auth_google', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      const result = await signInWithPopup(auth, appleProvider);
      const userRef = await createUserDocument(result.user);
      
      // Initialize starter abilities for new user (if new)
      if (userRef) {
        try {
          const { initializeStarterAbilities } = await import('@/services/abilityFirebaseService');
          await initializeStarterAbilities(result.user.uid);
          console.log('✅ Initialized starter abilities for new Apple user');
        } catch (abilityError) {
          console.error('Error initializing starter abilities (non-critical):', abilityError);
        }
      }
      
      // Track Apple login analytics
      analyticsService.trackLogin('apple');
      analyticsService.trackDailyLogin();
      
      // Track daily login achievement
      const achievementService = AchievementTrackingService.getInstance();
      await achievementService.recordDailyLogin(result.user.uid);
      
      return result.user;
    } catch (error) {
      console.error('Error signing in with Apple:', error);
      analyticsService.trackError('auth_apple', error instanceof Error ? error.message : 'Unknown error');
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
        
        // Track user analytics
        if (userData) {
          // Get user stats for analytics
          try {
            const userProfile = await UserService.getUserProfile(firebaseUser.uid);
            const userStats = userProfile?.stats || { gamesPlayed: 0, matchWins: 0 };
            
            analyticsService.setUser(firebaseUser.uid, {
              display_name: userData.displayName,
              email: userData.email,
              account_age: Math.floor((Date.now() - userData.createdAt.getTime()) / (1000 * 60 * 60 * 24)), // days
              games_played: userStats.gamesPlayed || 0,
              match_wins: userStats.matchWins || 0
            });
          } catch (error) {
            // Fallback analytics without stats
            analyticsService.setUser(firebaseUser.uid, {
              display_name: userData.displayName,
              email: userData.email,
              account_age: Math.floor((Date.now() - userData.createdAt.getTime()) / (1000 * 60 * 60 * 24)) // days
            });
          }
          
          // Track session start
          analyticsService.trackSessionStart();
        }
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
    signInWithGoogle,
    signInWithApple,
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
