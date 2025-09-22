/**
 * 🤖 Profile Integration Service
 * Handles seamless integration between real user profiles and bot profiles
 * Makes bots appear indistinguishable from real users in the UI
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserService, UserProfile } from './userService';
import { BotProfile } from './botProfileGenerator';

export interface UnifiedProfile {
  uid: string;
  email: string;
  displayName: string | null;
  profilePicture: string | null;
  photoURL?: string | null;
  createdAt: any;
  lastLoginAt: any;
  userTag: string;
  rankedStatus: 'Ranked - Active' | 'Ranked - Inactive' | 'Unranked';
  inventory: {
    displayBackgroundEquipped: any;
    matchBackgroundEquipped: any;
    ownedBackgrounds: string[];
  };
  stats: {
    bestStreak: number;
    currentStreak: number;
    gamesPlayed: number;
    matchWins: number;
    elo?: number;
    rank?: string;
  };
  settings: {
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    theme: string;
  };
  updatedAt: any;
  isBot?: boolean; // Internal flag - never exposed to UI
}

export class ProfileIntegrationService {
  
  /**
   * Get profile for any user ID - automatically detects and handles bots
   */
  static async getProfile(userId: string): Promise<UnifiedProfile | null> {
    try {
      console.log('🔍 ProfileIntegration: Fetching profile for ID:', userId);
      
      // First, try to get as regular user
      const userProfile = await UserService.getUserProfile(userId);
      if (userProfile) {
        console.log('👤 ProfileIntegration: Found real user profile');
        return this.convertUserToUnified(userProfile);
      }
      
      // If not found, check if it's a bot
      const botProfile = await this.getBotProfile(userId);
      if (botProfile) {
        console.log('🤖 ProfileIntegration: Found bot profile');
        return this.convertBotToUnified(botProfile);
      }
      
      console.log('❌ ProfileIntegration: No profile found for ID:', userId);
      return null;
    } catch (error) {
      console.error('❌ ProfileIntegration: Error fetching profile:', error);
      return null;
    }
  }
  
  /**
   * Get multiple profiles efficiently
   */
  static async getProfiles(userIds: string[]): Promise<(UnifiedProfile | null)[]> {
    try {
      const profilePromises = userIds.map(userId => this.getProfile(userId));
      return await Promise.all(profilePromises);
    } catch (error) {
      console.error('❌ ProfileIntegration: Error fetching multiple profiles:', error);
      return userIds.map(() => null);
    }
  }
  
  /**
   * Check if a user ID belongs to a bot
   */
  static async isBot(userId: string): Promise<boolean> {
    try {
      const botProfile = await this.getBotProfile(userId);
      return botProfile !== null;
    } catch (error) {
      console.error('❌ ProfileIntegration: Error checking if user is bot:', error);
      return false;
    }
  }
  
  /**
   * Get bot profile from Firebase
   */
  private static async getBotProfile(botId: string): Promise<BotProfile | null> {
    try {
      const botRef = doc(db, 'bot_profiles', botId);
      const botSnap = await getDoc(botRef);
      
      if (botSnap.exists()) {
        const botData = botSnap.data() as BotProfile;
        console.log('✅ ProfileIntegration: Bot profile fetched successfully');
        return botData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ ProfileIntegration: Error fetching bot profile:', error);
      return null;
    }
  }
  
  /**
   * Convert UserProfile to UnifiedProfile
   */
  private static convertUserToUnified(userProfile: UserProfile): UnifiedProfile {
    return {
      uid: userProfile.uid,
      email: userProfile.email,
      displayName: userProfile.displayName,
      profilePicture: userProfile.profilePicture,
      photoURL: userProfile.photoURL,
      createdAt: userProfile.createdAt,
      lastLoginAt: userProfile.lastLoginAt,
      userTag: userProfile.userTag,
      rankedStatus: userProfile.rankedStatus,
      inventory: userProfile.inventory,
      stats: userProfile.stats,
      settings: userProfile.settings,
      updatedAt: userProfile.updatedAt,
      isBot: false
    };
  }
  
  /**
   * Convert BotProfile to UnifiedProfile (appears identical to real user)
   */
  private static convertBotToUnified(botProfile: BotProfile): UnifiedProfile {
    // Generate realistic creation date based on bot's game history
    const createdAt = this.generateRealisticBotDates(botProfile.stats.gamesPlayed);
    
    return {
      uid: botProfile.uid,
      email: botProfile.email, // Internal email, never shown
      displayName: botProfile.displayName,
      profilePicture: null, // Bots don't have profile pictures for now
      photoURL: null,
      createdAt: createdAt.created,
      lastLoginAt: createdAt.lastLogin,
      userTag: botProfile.displayName, // Use display name as user tag
      rankedStatus: this.getBotRankedStatus(botProfile),
      inventory: {
        displayBackgroundEquipped: botProfile.inventory.displayBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
        matchBackgroundEquipped: botProfile.inventory.matchBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
        ownedBackgrounds: botProfile.inventory.items?.map(item => item.name) || ['Relax']
      },
      stats: {
        bestStreak: botProfile.stats.bestStreak,
        currentStreak: botProfile.stats.currentStreak,
        gamesPlayed: botProfile.stats.gamesPlayed,
        matchWins: botProfile.stats.matchWins,
        elo: botProfile.stats.elo,
        rank: botProfile.stats.rank
      },
      settings: {
        notificationsEnabled: true, // Bots have "notifications enabled"
        soundEnabled: true,
        theme: 'auto'
      },
      updatedAt: botProfile.updatedAt,
      isBot: true // Internal flag - never exposed to UI
    };
  }
  
  /**
   * Generate realistic creation and login dates for bots
   */
  private static generateRealisticBotDates(gamesPlayed: number): { created: any, lastLogin: any } {
    const now = Date.now();
    
    // Bots with more games have been "around" longer
    const daysPerGame = 0.5; // Average 2 games per day
    const accountAgeDays = Math.max(7, gamesPlayed * daysPerGame); // Minimum 1 week old
    
    const createdDate = new Date(now - (accountAgeDays * 24 * 60 * 60 * 1000));
    
    // Last login should be recent but not too recent (1-24 hours ago)
    const lastLoginHoursAgo = Math.random() * 23 + 1; // 1-24 hours
    const lastLoginDate = new Date(now - (lastLoginHoursAgo * 60 * 60 * 1000));
    
    return {
      created: createdDate,
      lastLogin: lastLoginDate
    };
  }
  
  /**
   * Determine bot's ranked status based on skill level and stats
   */
  private static getBotRankedStatus(botProfile: BotProfile): 'Ranked - Active' | 'Ranked - Inactive' | 'Unranked' {
    // Most bots are ranked active, some are unranked based on their "experience"
    if (botProfile.stats.gamesPlayed < 10) {
      return 'Unranked';
    }
    
    if (botProfile.botConfig.skillLevel === 'beginner' && Math.random() < 0.3) {
      return 'Unranked';
    }
    
    // 90% chance active, 10% chance inactive for variety
    return Math.random() < 0.9 ? 'Ranked - Active' : 'Ranked - Inactive';
  }
  
  /**
   * Get player data for matchmaking (bot-aware)
   */
  static async getPlayerDataForMatchmaking(userId: string): Promise<any> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found for matchmaking');
    }
    
    return {
      playerId: profile.uid,
      playerDisplayName: profile.displayName || 'Unknown Player',
      playerStats: {
        bestStreak: profile.stats.bestStreak,
        currentStreak: profile.stats.currentStreak,
        gamesPlayed: profile.stats.gamesPlayed,
        matchWins: profile.stats.matchWins,
        elo: profile.stats.elo || 1200,
        rank: profile.stats.rank || 'Unranked'
      },
      displayBackgroundEquipped: profile.inventory.displayBackgroundEquipped,
      matchBackgroundEquipped: profile.inventory.matchBackgroundEquipped,
      settings: profile.settings,
      isBot: profile.isBot || false
    };
  }
  
  /**
   * Get recent matches for a player (including bot matches)
   */
  static async getRecentMatches(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const isBot = await this.isBot(userId);
      
      if (isBot) {
        // Get bot's recent matches from bot-specific storage
        return await this.getBotRecentMatches(userId, limit);
      } else {
        // Get user's recent matches from regular match history
        return await this.getUserRecentMatches(userId, limit);
      }
    } catch (error) {
      console.error('❌ ProfileIntegration: Error fetching recent matches:', error);
      return [];
    }
  }
  
  /**
   * Get bot's recent matches
   */
  private static async getBotRecentMatches(botId: string, limit: number): Promise<any[]> {
    // Implementation would query a bot_matches collection or generate fake recent matches
    // For now, return empty array
    console.log('🤖 ProfileIntegration: Getting bot recent matches for:', botId);
    return [];
  }
  
  /**
   * Get user's recent matches  
   */
  private static async getUserRecentMatches(userId: string, limit: number): Promise<any[]> {
    // Implementation would query the matches collection
    // For now, return empty array
    console.log('👤 ProfileIntegration: Getting user recent matches for:', userId);
    return [];
  }
  
  /**
   * Update profile (users only - bots are updated separately)
   */
  static async updateProfile(userId: string, updates: { displayName?: string }): Promise<boolean> {
    try {
      const isBot = await this.isBot(userId);
      
      if (isBot) {
        console.warn('🤖 ProfileIntegration: Cannot update bot profile through user interface');
        return false;
      }
      
      // Use existing UserService update method
      const result = await UserService.updateProfile(userId, updates);
      return result.success;
    } catch (error) {
      console.error('❌ ProfileIntegration: Error updating profile:', error);
      return false;
    }
  }
  
  /**
   * Search profiles by display name (includes bots)
   */
  static async searchProfiles(query: string, limit: number = 10): Promise<UnifiedProfile[]> {
    try {
      console.log('🔍 ProfileIntegration: Searching profiles for query:', query);
      
      // Search both users and bots
      const [userResults, botResults] = await Promise.all([
        this.searchUserProfiles(query, limit),
        this.searchBotProfiles(query, limit)
      ]);
      
      // Combine and shuffle results to mix bots and users naturally
      const allResults = [...userResults, ...botResults];
      const shuffled = this.shuffleArray(allResults);
      
      return shuffled.slice(0, limit);
    } catch (error) {
      console.error('❌ ProfileIntegration: Error searching profiles:', error);
      return [];
    }
  }
  
  /**
   * Search user profiles
   */
  private static async searchUserProfiles(query: string, limit: number): Promise<UnifiedProfile[]> {
    // Implementation would search the users collection
    // For now, return empty array
    return [];
  }
  
  /**
   * Search bot profiles
   */
  private static async searchBotProfiles(query: string, limit: number): Promise<UnifiedProfile[]> {
    // Implementation would search the bot_profiles collection
    // For now, return empty array  
    return [];
  }
  
  /**
   * Utility function to shuffle an array
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  /**
   * Get profile viewing data (sanitized for UI)
   */
  static async getProfileForViewing(userId: string): Promise<any> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return null;
    }
    
    // Remove internal bot flag and other sensitive data
    const viewingProfile = {
      uid: profile.uid,
      displayName: profile.displayName,
      profilePicture: profile.profilePicture,
      userTag: profile.userTag,
      rankedStatus: profile.rankedStatus,
      inventory: profile.inventory,
      stats: profile.stats,
      createdAt: profile.createdAt,
      lastLoginAt: profile.lastLoginAt
      // Note: isBot flag is intentionally excluded
    };
    
    return viewingProfile;
  }
  
  /**
   * Check if two players can interact (prevents bot-specific interactions)
   */
  static async canPlayersInteract(userId1: string, userId2: string): Promise<boolean> {
    try {
      const [isBot1, isBot2] = await Promise.all([
        this.isBot(userId1),
        this.isBot(userId2)
      ]);
      
      // Prevent bot-to-bot interactions
      if (isBot1 && isBot2) {
        return false;
      }
      
      // Allow all other interactions
      return true;
    } catch (error) {
      console.error('❌ ProfileIntegration: Error checking player interaction capability:', error);
      return true; // Default to allowing interaction
    }
  }
  
  /**
   * Get leaderboard data (mix of users and bots)
   */
  static async getLeaderboardData(gameMode: string = 'all', limit: number = 50): Promise<UnifiedProfile[]> {
    try {
      console.log('🏆 ProfileIntegration: Getting leaderboard data');
      
      // Get top users and bots separately, then merge
      const [topUsers, topBots] = await Promise.all([
        this.getTopUserProfiles(limit * 0.7), // 70% real users
        this.getTopBotProfiles(limit * 0.3)   // 30% bots
      ]);
      
      // Merge and sort by ELO/rank
      const combined = [...topUsers, ...topBots];
      combined.sort((a, b) => (b.stats.elo || 1200) - (a.stats.elo || 1200));
      
      return combined.slice(0, limit);
    } catch (error) {
      console.error('❌ ProfileIntegration: Error getting leaderboard data:', error);
      return [];
    }
  }
  
  /**
   * Get top user profiles for leaderboard
   */
  private static async getTopUserProfiles(limit: number): Promise<UnifiedProfile[]> {
    // Implementation would query users collection ordered by ELO/stats
    // For now, return empty array
    return [];
  }
  
  /**
   * Get top bot profiles for leaderboard
   */
  private static async getTopBotProfiles(limit: number): Promise<UnifiedProfile[]> {
    // Implementation would query bot_profiles collection ordered by ELO/stats
    // For now, return empty array
    return [];
  }
}

// Default export for easy importing
export default ProfileIntegrationService;
