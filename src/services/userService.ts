import { doc, getDoc, updateDoc, setDoc, increment, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from './firebase';
import { validateDisplayName, formatDisplayName } from '@/utils/contentModeration';

// Background interface to match the structure used throughout the app
interface Background {
  name: string;
  file: string;
  type: 'image' | 'video' | 'gradient';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  createdAt: any;
  lastLoginAt: any;
  userTag: string;
  rankedStatus: 'Ranked - Active' | 'Ranked - Inactive' | 'Unranked';
  inventory: {
    displayBackgroundEquipped: Background;
    matchBackgroundEquipped: Background;
    ownedBackgrounds: string[];
  };
  stats: {
    bestStreak: number;
    currentStreak: number;
    gamesPlayed: number;
    matchWins: number;
  };
  settings: {
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    theme: string;
  };
  updatedAt: any;
}

export class UserService {
  /**
   * Get user profile data from Firebase
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      console.log('🔍 UserService: Fetching user document for UID:', uid);
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log('📊 UserService: Raw user data from Firebase:', userData);
        
        // Handle both old and new user document formats
        const profile: UserProfile = {
          uid,
          email: userData.email,
          displayName: userData.displayName,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          userTag: userData.userTag || userData.email?.split('@')[0] || 'Anonymous',
          rankedStatus: userData.rankedStatus || 'Ranked - Active', // Default all players to Ranked - Active
          inventory: {
            // Read from inventory object only - ensure background objects are passed through
            displayBackgroundEquipped: userData.inventory?.displayBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
            matchBackgroundEquipped: userData.inventory?.matchBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
            ownedBackgrounds: userData.inventory?.ownedBackgrounds || userData.ownedBackgrounds || ['Relax']
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
            theme: userData.settings?.theme || 'auto'
          },
          updatedAt: userData.updatedAt
        };
        
        console.log('✅ UserService: Processed user profile:', profile);
        return profile;
      } else {
        console.log('❌ UserService: User document not found for UID:', uid);
      }
      
      return null;
    } catch (error) {
      console.error('❌ UserService: Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Convert user profile to player data format for matchmaking
   */
  static convertToPlayerData(profile: UserProfile) {
    return {
      playerDisplayName: profile.displayName || profile.email?.split('@')[0] || 'Anonymous',
      playerId: profile.uid,
      displayBackgroundEquipped: profile.inventory.displayBackgroundEquipped,
      matchBackgroundEquipped: profile.inventory.matchBackgroundEquipped,
      playerStats: profile.stats
    };
  }

  /**
   * Update user stats when a game is played (regardless of win/loss)
   */
  static async updateGamePlayed(uid: string): Promise<void> {
    try {
      console.log('🎮 UserService: Updating gamesPlayed for user:', uid);
      
      const userRef = doc(db, 'users', uid);
      
      // Use setDoc with merge to ensure document exists
      await setDoc(userRef, {
        stats: {
          gamesPlayed: increment(1)
        },
        updatedAt: new Date()
      }, { merge: true });
      
      console.log('✅ UserService: Successfully updated gamesPlayed');
    } catch (error: any) {
      console.error('❌ UserService: Error updating gamesPlayed:', error);
      
      // Log specific Firebase error details
      if (error?.code) {
        console.error(`🔍 Firebase Error Code: ${error.code}`);
        console.error(`🔍 Firebase Error Message: ${error.message}`);
        
        if (error.code === 'permission-denied') {
          console.error('🚫 Permission denied - check Firebase security rules for users collection');
        }
      }
      
      throw error;
    }
  }

  /**
   * Update user stats when they win a match
   * This handles matchWins and streak tracking
   */
  static async updateMatchWin(uid: string): Promise<void> {
    try {
      console.log('🏆 UserService: Processing match win for user:', uid);
      const userRef = doc(db, 'users', uid);
      
      // Get current user data to handle streak logic
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userSnap.data();
      const currentStats = userData.stats || {};
      const currentStreak = currentStats.currentStreak || 0;
      const bestStreak = currentStats.bestStreak || 0;
      
      // Calculate new streak values
      const newCurrentStreak = currentStreak + 1;
      const newBestStreak = newCurrentStreak > bestStreak ? newCurrentStreak : bestStreak;
      
      console.log('📊 UserService: Streak update -', {
        previousCurrent: currentStreak,
        newCurrent: newCurrentStreak,
        previousBest: bestStreak,
        newBest: newBestStreak
      });
      
      // Update all win-related stats using setDoc with merge
      await setDoc(userRef, {
        stats: {
          matchWins: increment(1),
          currentStreak: newCurrentStreak,
          bestStreak: newBestStreak
        },
        updatedAt: new Date()
      }, { merge: true });
      
      console.log('✅ UserService: Successfully updated match win stats');
    } catch (error: any) {
      console.error('❌ UserService: Error updating match win:', error);
      
      if (error?.code) {
        console.error(`🔍 Firebase Error Code: ${error.code}`);
        console.error(`🔍 Firebase Error Message: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Update user stats when they lose a match
   * This resets the current streak to 0
   */
  static async updateMatchLoss(uid: string): Promise<void> {
    try {
      console.log('💔 UserService: Processing match loss for user:', uid);
      const userRef = doc(db, 'users', uid);
      
      // Use setDoc with merge to ensure document exists and reset current streak to 0
      await setDoc(userRef, {
        stats: {
          currentStreak: 0
        },
        updatedAt: new Date()
      }, { merge: true });
      
      console.log('✅ UserService: Successfully reset current streak');
    } catch (error: any) {
      console.error('❌ UserService: Error updating match loss:', error);
      
      if (error?.code) {
        console.error(`🔍 Firebase Error Code: ${error.code}`);
        console.error(`🔍 Firebase Error Message: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Update user profile information
   */
  static async updateProfile(uid: string, updates: { displayName?: string }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('👤 UserService: Updating profile for user:', uid, updates);
      
      const userRef = doc(db, 'users', uid);
      const updateData: any = {
        updatedAt: new Date()
      };

      // Handle display name update
      if (updates.displayName !== undefined) {
        const validation = validateDisplayName(updates.displayName);
        if (!validation.isValid) {
          return { success: false, error: validation.error };
        }
        
        const formattedName = formatDisplayName(updates.displayName);
        updateData.displayName = formattedName;
        
        console.log('✅ UserService: Display name validated and formatted:', formattedName);
      }

      await updateDoc(userRef, updateData);
      
      console.log('✅ UserService: Profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ UserService: Error updating profile:', error);
      return { success: false, error: 'Failed to update profile. Please try again.' };
    }
  }

  /**
   * Debug utility: Get and log user stats
   */
  static async debugUserStats(uid: string): Promise<void> {
    try {
      const profile = await this.getUserProfile(uid);
      if (profile) {
        console.log('📊 USER STATS DEBUG:', {
          user: profile.displayName || profile.email,
          stats: profile.stats
        });
      }
    } catch (error) {
      console.error('❌ Error debugging user stats:', error);
    }
  }

  /**
   * Set all users to Ranked - Active status (Migration utility)
   */
  static async setAllUsersRankedActive(): Promise<void> {
    try {
      console.log('🔄 Starting migration: Setting all users to Ranked - Active...');
      
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let updateCount = 0;
      const batchSize = 500; // Firestore batch limit
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const doc of snapshot.docs) {
        const userData = doc.data();
        
        // Only update if rankedStatus is not already set
        if (!userData.rankedStatus) {
          batch.update(doc.ref, {
            rankedStatus: 'Ranked - Active',
            updatedAt: new Date()
          });
          
          updateCount++;
          batchCount++;
          
          // Commit batch when it reaches the limit
          if (batchCount >= batchSize) {
            await batch.commit();
            console.log(`✅ Committed batch of ${batchCount} user updates`);
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }
      
      // Commit remaining updates
      if (batchCount > 0) {
        await batch.commit();
        console.log(`✅ Committed final batch of ${batchCount} user updates`);
      }
      
      console.log(`✅ Migration complete: Updated ${updateCount} users to Ranked - Active`);
    } catch (error) {
      console.error('❌ Error in user migration:', error);
      throw error;
    }
  }

  /**
   * Update user's ranked status
   */
  static async updateRankedStatus(uid: string, status: 'Ranked - Active' | 'Ranked - Inactive' | 'Unranked'): Promise<void> {
    try {
      console.log(`🏆 Updating ranked status for ${uid} to: ${status}`);
      
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        rankedStatus: status,
        updatedAt: new Date()
      });
      
      console.log(`✅ Successfully updated ranked status to: ${status}`);
    } catch (error) {
      console.error('❌ Error updating ranked status:', error);
      throw error;
    }
  }
}
