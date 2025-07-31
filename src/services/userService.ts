import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  createdAt: any;
  lastLoginAt: any;
  userTag: string;
  inventory: {
    displayBackgroundEquipped: string;
    matchBackgroundEquipped: string;
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
          inventory: {
            // Read from inventory object only
            displayBackgroundEquipped: userData.inventory?.displayBackgroundEquipped || 'Relax',
            matchBackgroundEquipped: userData.inventory?.matchBackgroundEquipped || 'Relax',
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
      
      await updateDoc(userRef, {
        'stats.gamesPlayed': increment(1),
        updatedAt: new Date()
      });
      
      console.log('✅ UserService: Successfully updated gamesPlayed');
    } catch (error) {
      console.error('❌ UserService: Error updating gamesPlayed:', error);
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
      
      // Update all win-related stats
      await updateDoc(userRef, {
        'stats.matchWins': increment(1),
        'stats.currentStreak': newCurrentStreak,
        'stats.bestStreak': newBestStreak,
        updatedAt: new Date()
      });
      
      console.log('✅ UserService: Successfully updated match win stats');
    } catch (error) {
      console.error('❌ UserService: Error updating match win:', error);
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
      
      // Reset current streak to 0 (best streak remains unchanged)
      await updateDoc(userRef, {
        'stats.currentStreak': 0,
        updatedAt: new Date()
      });
      
      console.log('✅ UserService: Successfully reset current streak');
    } catch (error) {
      console.error('❌ UserService: Error updating match loss:', error);
      throw error;
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
}
