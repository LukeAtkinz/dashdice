import { doc, getDoc, updateDoc, setDoc, increment, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from './firebase';
import { validateDisplayName, formatDisplayName } from '@/utils/contentModeration';
import { resolveBackgroundPath } from '@/config/backgrounds';

// Background interface to match the structure used throughout the app
interface Background {
  name: string;
  file: string;
  type: 'image' | 'video' | 'gradient';
}

// Power Loadout interface for game mode specific ability loadouts
export interface PowerLoadout {
  tactical?: string;
  attack?: string;
  defense?: string;
  utility?: string;
  gamechanger?: string;
}

export interface UserPowerLoadouts {
  'quick-fire': PowerLoadout;
  'classic': PowerLoadout;
  'zero-hour': PowerLoadout;
  'last-line': PowerLoadout;
  defaultLoadout?: PowerLoadout;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  profilePicture: string | null;
  photoURL?: string | null; // For backward compatibility
  createdAt: any;
  lastLoginAt: any;
  userTag: string;
  rankedStatus: 'Ranked - Active' | 'Ranked - Inactive' | 'Unranked';
  inventory: {
    displayBackgroundEquipped: Background;
    matchBackgroundEquipped: Background;
    turnDeciderBackgroundEquipped?: any;
    victoryBackgroundEquipped?: any;
    ownedBackgrounds: string[];
  };
  powerLoadouts?: UserPowerLoadouts;
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
      
      // Check if this is a bot UID
      if (uid.includes('bot') || uid.startsWith('bot_')) {
        console.log('🤖 UserService: Detected bot UID, fetching from bots collection');
        return this.getBotAsUserProfile(uid);
      }
      
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
          profilePicture: userData.profilePicture || userData.photoURL || null,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          userTag: userData.userTag || userData.email?.split('@')[0] || 'Anonymous',
          rankedStatus: userData.rankedStatus || 'Ranked - Active', // Default all players to Ranked - Active
          inventory: {
            // Read from inventory object only - ensure background objects are passed through
            displayBackgroundEquipped: userData.inventory?.displayBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
            matchBackgroundEquipped: userData.inventory?.matchBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
            turnDeciderBackgroundEquipped: userData.inventory?.turnDeciderBackgroundEquipped || { id: 'crazy-cough', name: 'Crazy Cough', rarity: 'COMMON' },
            victoryBackgroundEquipped: userData.inventory?.victoryBackgroundEquipped || { id: 'wind-blade', name: 'Wind Blade', rarity: 'EPIC' },
            ownedBackgrounds: userData.inventory?.ownedBackgrounds || userData.ownedBackgrounds || ['Relax']
          },
          powerLoadouts: userData.powerLoadouts || {
            'quick-fire': {},
            'classic': {},
            'zero-hour': {},
            'last-line': {},
            defaultLoadout: {}
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
        return null;
      }
      
    } catch (error) {
      console.error('❌ UserService: Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Get bot profile data and convert to UserProfile format
   */
  static async getBotAsUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      console.log('🤖 UserService: Fetching bot document for UID:', uid);
      const botRef = doc(db, 'bots', uid);
      const botSnap = await getDoc(botRef);
      
      if (botSnap.exists()) {
        const botData = botSnap.data();
        console.log('✅ UserService: Found bot profile:', botData);
        
        // Helper function to get random background using new system
        const getRandomBackground = () => {
          const backgroundIds = ['relax', 'long-road-ahead', 'new-day', 'on-a-mission', 'underwater', 'as-they-fall', 'end-of-the-dragon'];
          const randomId = backgroundIds[Math.floor(Math.random() * backgroundIds.length)];
          const resolved = resolveBackgroundPath(randomId, 'match-player-card');
          return resolved ? { name: resolved.name, file: resolved.path, type: resolved.type } : { name: 'Relax', file: '/backgrounds/Images/Best Quality/Relax.webp', type: 'image' as const };
        };
        
        // Assign random backgrounds if bot doesn't have any
        const displayBg = botData.inventory?.displayBackgroundEquipped || getRandomBackground();
        const matchBg = botData.inventory?.matchBackgroundEquipped || getRandomBackground();
        
        // Convert bot profile to user profile format
        const profile: UserProfile = {
          uid,
          email: botData.email || `${uid}@dashdice.ai`,
          displayName: botData.displayName,
          profilePicture: botData.profilePicture || null,
          createdAt: botData.createdAt,
          lastLoginAt: botData.updatedAt,
          userTag: botData.displayName || 'Bot',
          rankedStatus: 'Ranked - Active',
          inventory: {
            displayBackgroundEquipped: displayBg,
            matchBackgroundEquipped: matchBg,
            ownedBackgrounds: botData.inventory?.ownedBackgrounds || ['relax', 'long-road-ahead', 'new-day']
          },
          stats: {
            bestStreak: botData.stats?.bestStreak || 0,
            currentStreak: botData.stats?.currentStreak || 0,
            gamesPlayed: botData.stats?.gamesPlayed || 0,
            matchWins: botData.stats?.matchWins || 0
          },
          settings: {
            notificationsEnabled: false, // Bots don't need notifications
            soundEnabled: false,
            theme: 'auto'
          },
          updatedAt: botData.updatedAt
        };
        
        console.log('✅ UserService: Converted bot to user profile format:', profile);
        return profile;
      } else {
        console.log('❌ UserService: Bot document not found for UID:', uid);
        return null;
      }
      
    } catch (error) {
      console.error('❌ UserService: Error fetching bot profile:', error);
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

  /**
   * Update user's profile picture
   */
  static async updateProfilePicture(uid: string, profilePictureUrl: string): Promise<void> {
    try {
      console.log(`📸 Updating profile picture for ${uid}:`, profilePictureUrl);
      
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        profilePicture: profilePictureUrl,
        updatedAt: new Date()
      });
      
      console.log(`✅ Successfully updated profile picture`);
    } catch (error) {
      console.error('❌ Error updating profile picture:', error);
      throw error;
    }
  }

  /**
   * Get user's power loadouts
   */
  static async getUserPowerLoadouts(uid: string): Promise<UserPowerLoadouts | null> {
    try {
      console.log('⚡ UserService: Fetching power loadouts for UID:', uid);
      
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return userData.powerLoadouts || {
          'quick-fire': {},
          'classic': {},
          'zero-hour': {},
          'last-line': {},
          defaultLoadout: {}
        };
      } else {
        console.log('❌ UserService: User document not found for power loadouts:', uid);
        return null;
      }
    } catch (error) {
      console.error('❌ UserService: Error fetching power loadouts:', error);
      throw error;
    }
  }

  /**
   * Update power loadout for a specific game mode
   */
  static async updatePowerLoadout(
    uid: string, 
    gameMode: keyof UserPowerLoadouts, 
    loadout: PowerLoadout
  ): Promise<void> {
    try {
      console.log(`⚡ UserService: Updating ${gameMode} loadout for user:`, uid, loadout);
      
      const userRef = doc(db, 'users', uid);
      
      // Create the update object with nested field update
      const updateData = {
        [`powerLoadouts.${gameMode}`]: loadout,
        updatedAt: new Date()
      };
      
      await updateDoc(userRef, updateData);
      
      console.log(`✅ UserService: Successfully updated ${gameMode} loadout`);
    } catch (error: any) {
      console.error(`❌ UserService: Error updating ${gameMode} loadout:`, error);
      throw error;
    }
  }

  /**
   * Update all power loadouts at once
   */
  static async updateAllPowerLoadouts(uid: string, loadouts: UserPowerLoadouts): Promise<void> {
    try {
      console.log('⚡ UserService: Updating all power loadouts for user:', uid);
      
      const userRef = doc(db, 'users', uid);
      
      await updateDoc(userRef, {
        powerLoadouts: loadouts,
        updatedAt: new Date()
      });
      
      console.log('✅ UserService: Successfully updated all power loadouts');
    } catch (error: any) {
      console.error('❌ UserService: Error updating all power loadouts:', error);
      throw error;
    }
  }

  /**
   * Get power loadout for a specific game mode
   */
  static async getPowerLoadoutForGameMode(uid: string, gameMode: keyof UserPowerLoadouts): Promise<PowerLoadout | null> {
    try {
      console.log(`🔍 ENHANCED DEBUG: getPowerLoadoutForGameMode called with uid: ${uid}, gameMode: ${gameMode}`);
      
      const loadouts = await this.getUserPowerLoadouts(uid);
      console.log(`🔍 ENHANCED DEBUG: getUserPowerLoadouts returned:`, loadouts);
      
      if (!loadouts) {
        console.log(`🔍 ENHANCED DEBUG: No loadouts object found for user ${uid}`);
        return null;
      }
      
      const gameLoadout = loadouts[gameMode];
      console.log(`🔍 ENHANCED DEBUG: gameLoadout for ${gameMode}:`, gameLoadout);
      
      // Return null if the loadout is empty or doesn't exist
      if (!gameLoadout || Object.keys(gameLoadout).length === 0) {
        console.log(`🔮 UserService: No ${gameMode} loadout found for user ${uid}`);
        
        // 🔧 FALLBACK: Try to find abilities from other game modes
        const allGameModes = Object.keys(loadouts) as (keyof UserPowerLoadouts)[];
        for (const otherMode of allGameModes) {
          const otherLoadout = loadouts[otherMode];
          if (otherLoadout && Object.keys(otherLoadout).length > 0) {
            console.log(`🔄 UserService: Using fallback loadout from ${otherMode} for ${gameMode}:`, otherLoadout);
            return otherLoadout;
          }
        }
        
        console.log(`🔮 UserService: No loadouts found in any game mode, returning null`);
        return null;
      }
      
      console.log(`🔮 UserService: Found ${gameMode} loadout for user ${uid}:`, gameLoadout);
      return gameLoadout;
    } catch (error) {
      console.error(`❌ UserService: Error fetching ${gameMode} loadout:`, error);
      throw error;
    }
  }
}
