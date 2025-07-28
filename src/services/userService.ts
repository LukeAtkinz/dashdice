import { doc, getDoc } from 'firebase/firestore';
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
            // Handle both old format (equippedBackground) and new format (inventory.displayBackgroundEquipped)
            displayBackgroundEquipped: userData.inventory?.displayBackgroundEquipped || userData.equippedBackground || 'default',
            matchBackgroundEquipped: userData.inventory?.matchBackgroundEquipped || userData.equippedBackground || 'default',
            ownedBackgrounds: userData.inventory?.ownedBackgrounds || userData.ownedBackgrounds || ['default']
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
}
