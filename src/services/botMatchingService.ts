import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { GameSessionService, SessionPlayerData } from './gameSessionService';

/**
 * 🤖 Bot Matching Service
 * Handles automatic bot matching after timeout periods
 */

export interface BotProfile {
  uid: string;
  displayName: string;
  email?: string;
  isBot: boolean;
  isActive: boolean;
  stats?: {
    gamesPlayed: number;
    matchWins: number;
    currentStreak: number;
    bestStreak: number;
    totalScore: number;
    averageScore: number;
    elo: number;
  };
  personality?: {
    aggressiveness: number;
    bankingTendency: number;
    riskTolerance: number;
    pressureResistance: number;
    tiltResistance: number;
    momentumAwareness: number;
    adaptationSpeed: number;
    confidenceLevel: number;
    emotionalVolatility: number;
    region: string;
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    archetypeCategory: string;
  };
  inventory?: {
    displayBackgroundEquipped: string | null;
    matchBackgroundEquipped: string | null;
    items: any[];
  };
}

export class BotMatchingService {
  private static readonly BOT_COLLECTION = 'bot_profiles';
  private static readonly FALLBACK_TIMEOUT_MS = 10000; // 10 seconds
  private static activeBotMatching = new Map<string, NodeJS.Timeout>();

  /**
   * 🎯 Start 10-second bot fallback timer for a session
   */
  static startBotFallbackTimer(
    sessionId: string,
    hostPlayerId: string,
    gameMode: string,
    sessionType: 'quick' | 'ranked'
  ): void {
    try {
      console.log(`🤖 Starting 10-second bot fallback timer for session ${sessionId}`);
      
      // Clear any existing timer for this session
      this.clearBotFallbackTimer(sessionId);
      
      // Only enable bot matching for quick games, not ranked
      if (sessionType !== 'quick') {
        console.log(`🚫 Bot matching disabled for ${sessionType} sessions`);
        return;
      }
      
      const timer = setTimeout(async () => {
        try {
          console.log(`⏰ 10-second timeout reached for session ${sessionId}, attempting bot match...`);
          await this.attemptBotMatch(sessionId, hostPlayerId, gameMode);
        } catch (error) {
          console.error(`❌ Bot matching failed for session ${sessionId}:`, error);
        } finally {
          // Clean up timer reference
          this.activeBotMatching.delete(sessionId);
        }
      }, this.FALLBACK_TIMEOUT_MS);
      
      // Store timer reference
      this.activeBotMatching.set(sessionId, timer);
      
    } catch (error) {
      console.error('❌ Error starting bot fallback timer:', error);
    }
  }

  /**
   * 🛑 Clear bot fallback timer (when human joins)
   */
  static clearBotFallbackTimer(sessionId: string): void {
    const timer = this.activeBotMatching.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.activeBotMatching.delete(sessionId);
      console.log(`🛑 Cleared bot fallback timer for session ${sessionId}`);
    }
  }

  /**
   * 🤖 Attempt to match with a bot
   */
  private static async attemptBotMatch(
    sessionId: string,
    hostPlayerId: string,
    gameMode: string
  ): Promise<void> {
    try {
      // Check if this is a Go backend session by looking at the session ID format
      const isGoBackendSession = sessionId.startsWith('match-');
      
      if (isGoBackendSession) {
        console.log(`🚀 Detected Go backend session ${sessionId}, handling bot match via Go backend`);
        return this.attemptGoBackendBotMatch(sessionId, hostPlayerId, gameMode);
      }
      
      // Original Firebase logic for Firebase sessions
      console.log(`📊 Detected Firebase session ${sessionId}, handling bot match via Firebase`);
      return this.attemptFirebaseBotMatch(sessionId, hostPlayerId, gameMode);
      
    } catch (error) {
      console.error('❌ Error in bot matching:', error);
    }
  }

  /**
   * 🎯 Select the best bot for a player and game mode
   */
  private static async selectBestBot(
    hostPlayerId: string,
    gameMode: string
  ): Promise<BotProfile | null> {
    try {
      // Get all available bots
      const bots = await this.getAvailableBots();
      if (bots.length === 0) {
        console.log('❌ No bots available in database');
        return null;
      }
      
      console.log(`🔍 Found ${bots.length} available bots`);
      
      // Filter active bots
      const activeBots = bots.filter(bot => bot.isActive);
      if (activeBots.length === 0) {
        console.log('❌ No active bots available');
        return null;
      }
      
      console.log(`🎯 ${activeBots.length} active bots available`);
      
      // For now, select a random bot (can be enhanced with ELO matching later)
      const randomBot = activeBots[Math.floor(Math.random() * activeBots.length)];
      
      console.log(`🎲 Randomly selected: ${randomBot.displayName} from ${activeBots.length} options`);
      
      return randomBot;
      
    } catch (error) {
      console.error('❌ Error selecting bot:', error);
      return null;
    }
  }

  /**
   * 📋 Get all available bot profiles
   */
  private static async getAvailableBots(): Promise<BotProfile[]> {
    try {
      // Try to get from bot_profiles collection first
      let botsQuery = query(
        collection(db, this.BOT_COLLECTION),
        where('isBot', '==', true),
        where('isActive', '==', true),
        limit(20)
      );
      
      let snapshot = await getDocs(botsQuery);
      
      if (!snapshot.empty) {
        console.log(`✅ Found ${snapshot.size} bots in bot_profiles collection`);
        const bots = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`🤖 Bot found: ${data.displayName || 'Unknown'} - Data:`, data);
          return {
            uid: doc.id,
            ...data
          } as BotProfile;
        });
        return bots;
      }
      
      // Fallback: Check if bots are in users collection
      console.log('🔄 No bots in bot_profiles collection, checking users collection...');
      botsQuery = query(
        collection(db, 'users'),
        where('isBot', '==', true),
        where('isActive', '==', true),
        limit(20)
      );
      
      snapshot = await getDocs(botsQuery);
      
      if (!snapshot.empty) {
        console.log(`✅ Found ${snapshot.size} bots in users collection`);
        const bots = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`👤 User bot found: ${data.displayName || 'Unknown'} - Data:`, data);
          return {
            uid: doc.id,
            ...data
          } as BotProfile;
        });
        return bots;
      }
      
      // Final fallback: Return hardcoded bot profiles if no bots in database
      console.log('⚠️ No bots found in database, using fallback bot');
      return [this.getFallbackBot()];
      
    } catch (error) {
      console.error('❌ Error fetching bots:', error);
      // Return fallback bot on error
      return [this.getFallbackBot()];
    }
  }

  /**
   * 🔄 Ensure bot data has the required structure
   */
  private static ensureBotDataStructure(bot: any): BotProfile {
    // If the bot data is missing critical fields, merge with fallback
    if (!bot.stats || !bot.personality || !bot.inventory) {
      console.log('⚠️ Bot data incomplete, merging with fallback data');
      const fallbackBot = this.getFallbackBot();
      
      return {
        uid: bot.uid || fallbackBot.uid,
        displayName: bot.displayName || fallbackBot.displayName,
        email: bot.email || fallbackBot.email,
        isBot: bot.isBot !== undefined ? bot.isBot : fallbackBot.isBot,
        isActive: bot.isActive !== undefined ? bot.isActive : fallbackBot.isActive,
        stats: bot.stats || fallbackBot.stats,
        personality: bot.personality || fallbackBot.personality,
        inventory: bot.inventory || fallbackBot.inventory
      };
    }
    
    return bot as BotProfile;
  }

  /**
   * 🔄 Get a hardcoded fallback bot profile
   */
  private static getFallbackBot(): BotProfile {
    return {
      uid: 'bot_fallback_hayden_wilson',
      displayName: 'Hayden Wilson',
      email: 'hayden.wilson@dashdice.bot',
      isBot: true,
      isActive: true,
      stats: {
        gamesPlayed: 94,
        matchWins: 28,
        currentStreak: 2,
        bestStreak: 6,
        totalScore: 94859,
        averageScore: 1009,
        elo: 1587
      },
      personality: {
        aggressiveness: 0.71,
        bankingTendency: 0.72,
        riskTolerance: 0.17,
        pressureResistance: 0.6,
        tiltResistance: 0.56,
        momentumAwareness: 0.74,
        adaptationSpeed: 0.65,
        confidenceLevel: 0.45,
        emotionalVolatility: 0.48,
        region: 'asia-pacific',
        skillLevel: 'beginner',
        archetypeCategory: 'aggressive'
      },
      inventory: {
        displayBackgroundEquipped: null,
        matchBackgroundEquipped: null,
        items: []
      }
    };
  }

  /**
   * 🔍 Check bot availability status
   */
  static async getBotAvailabilityStatus(): Promise<{
    available: boolean;
    count: number;
    source: 'bot_profiles' | 'users' | 'fallback';
  }> {
    try {
      const bots = await this.getAvailableBots();
      
      if (bots.length === 0) {
        return { available: false, count: 0, source: 'fallback' };
      }
      
      // Check if it's the fallback bot
      if (bots.length === 1 && bots[0].uid === 'bot_fallback_hayden_wilson') {
        return { available: true, count: 1, source: 'fallback' };
      }
      
      // Try to determine source
      let source: 'bot_profiles' | 'users' | 'fallback' = 'bot_profiles';
      try {
        const testQuery = query(collection(db, 'bot_profiles'), limit(1));
        const testSnapshot = await getDocs(testQuery);
        if (testSnapshot.empty) {
          source = 'users';
        }
      } catch {
        source = 'fallback';
      }
      
      return {
        available: true,
        count: bots.length,
        source
      };
      
    } catch (error) {
      console.error('❌ Error checking bot availability:', error);
      return { available: true, count: 1, source: 'fallback' };
    }
  }

  /**
   * 🧹 Cleanup: Clear all active bot timers
   */
  static clearAllBotTimers(): void {
    console.log(`🧹 Clearing ${this.activeBotMatching.size} active bot timers`);
    this.activeBotMatching.forEach((timer, sessionId) => {
      clearTimeout(timer);
      console.log(`  🛑 Cleared timer for session ${sessionId}`);
    });
    this.activeBotMatching.clear();
  }

  /**
   * 📊 Get active bot timer count
   */
  static getActiveTimerCount(): number {
    return this.activeBotMatching.size;
  }

  /**
   * 🤖 Attempt bot match for Firebase sessions (original logic)
   */
  private static async attemptFirebaseBotMatch(
    sessionId: string,
    hostPlayerId: string,
    gameMode: string
  ): Promise<void> {
    try {
      // First, check if the session still exists and needs a bot
      const session = await GameSessionService.getSession(sessionId);
      if (!session) {
        console.log(`❌ Firebase session ${sessionId} no longer exists, skipping bot match`);
        return;
      }
      
      if (session.status !== 'waiting') {
        console.log(`❌ Firebase session ${sessionId} status is ${session.status}, skipping bot match`);
        return;
      }
      
      if (session.participants.length >= 2) {
        console.log(`❌ Firebase session ${sessionId} already has ${session.participants.length} participants, skipping bot match`);
        return;
      }
      
      console.log(`🤖 Attempting bot match for Firebase session ${sessionId} (host: ${hostPlayerId}, mode: ${gameMode})`);

      // Get a suitable bot
      const bot = await this.selectBestBot(hostPlayerId, gameMode);
      if (!bot) {
        console.log(`❌ No suitable bot found for game mode ${gameMode}`);
        return;
      }
      
      console.log(`🎯 Selected bot: ${bot.displayName} (ELO: ${bot.stats?.elo || 'Unknown'}, Skill: ${bot.personality?.skillLevel || 'Unknown'})`);
      console.log('🔍 Bot data structure:', JSON.stringify(bot, null, 2)); // Debug log
      
      // Ensure bot has minimum required data, use fallback if needed
      const safeBotData = this.ensureBotDataStructure(bot);
      
      // Join the bot to the session
      const botPlayerData: SessionPlayerData = {
        playerId: safeBotData.uid,
        playerDisplayName: safeBotData.displayName,
        playerStats: {
          bestStreak: safeBotData.stats?.bestStreak || 0,
          currentStreak: safeBotData.stats?.currentStreak || 0,
          gamesPlayed: safeBotData.stats?.gamesPlayed || 0,
          matchWins: safeBotData.stats?.matchWins || 0
        },
        displayBackgroundEquipped: safeBotData.inventory?.displayBackgroundEquipped || null,
        matchBackgroundEquipped: safeBotData.inventory?.matchBackgroundEquipped || null,
        ready: true, // Bots are always ready
        joinedAt: new Date(),
        isConnected: true // Bots are always connected
      };
      
      const joinResult = await GameSessionService.joinSession(sessionId, botPlayerData);
      
      if (joinResult.success) {
        console.log(`✅ Bot ${bot.displayName} successfully joined Firebase session ${sessionId}`);
        
        // Clear the fallback timer since a bot has joined
        this.clearBotFallbackTimer(sessionId);
      } else {
        console.log(`❌ Bot failed to join Firebase session ${sessionId}`);
      }
      
    } catch (error) {
      console.error('❌ Error in Firebase bot matching:', error);
    }
  }

  /**
   * 🚀 Attempt bot match for Go backend sessions (new logic)
   */
  private static async attemptGoBackendBotMatch(
    sessionId: string,
    hostPlayerId: string,
    gameMode: string
  ): Promise<void> {
    try {
      // Import DashDiceAPI to check Go backend match status
      const { default: DashDiceAPI } = await import('./apiClientNew');
      
      // Check if the Go backend match still exists and needs a bot
      // Try both 'ready' and 'waiting' status since there might be inconsistency
      let response = await DashDiceAPI.listMatches({ 
        status: 'ready',
        limit: 10 
      });
      
      if (!response.success || !response.data?.matches || response.data.matches.length === 0) {
        // Try with 'waiting' status as fallback
        response = await DashDiceAPI.listMatches({ 
          status: 'waiting',
          limit: 10 
        });
      }
      
      if (!response.success || !response.data?.matches) {
        console.log(`❌ Could not fetch Go backend matches for session ${sessionId}`);
        return;
      }

      console.log(`🔍 Searching for session ${sessionId} in ${response.data.matches.length} matches`);
      console.log(`🔍 Available matches:`, response.data.matches.map((m: any) => ({ 
        matchId: m.matchId, 
        id: m.id, 
        match_id: m.match_id,
        status: m.status,
        players: m.players?.length || 0,
        fullMatch: m // Log the full object to see all properties
      })));
      
      // Find our specific match - try multiple possible ID field names
      const ourMatch = response.data.matches.find((match: any) => 
        match.matchId === sessionId || 
        match.id === sessionId || 
        match.match_id === sessionId ||
        match.MatchID === sessionId ||
        match.sessionId === sessionId ||
        match.room_id === sessionId ||
        match.roomId === sessionId
      );
      
      console.log(`🔍 Match search results for ${sessionId}:`, {
        foundMatch: !!ourMatch,
        searchedProperties: ['matchId', 'id', 'match_id', 'MatchID', 'sessionId', 'room_id', 'roomId'],
        firstMatchSample: response.data.matches[0] // Show the actual structure
      });
      
      if (!ourMatch) {
        console.log(`❌ Go backend session ${sessionId} no longer exists, skipping bot match`);
        return;
      }
      
      // Check if match status indicates it's waiting for players
      // Use type assertion since Go backend may return 'ready' which isn't in our TypeScript types
      const matchStatus = ourMatch.status as string;
      if (matchStatus !== 'ready' && matchStatus !== 'waiting') {
        console.log(`❌ Go backend session ${sessionId} status is ${matchStatus}, skipping bot match`);
        return;
      }
      
      if (ourMatch.players?.length >= 2) {
        console.log(`❌ Go backend session ${sessionId} already has ${ourMatch.players.length} participants, skipping bot match`);
        return;
      }
      
      console.log(`🚀 Go backend session ${sessionId} confirmed waiting, adding bot via Go backend API`);

      // Get a suitable bot
      const bot = await this.selectBestBot(hostPlayerId, gameMode);
      if (!bot) {
        console.log('❌ No suitable bot found for matching');
        return;
      }

      console.log(`🎯 Selected bot: ${bot.displayName} (ELO: ${bot.stats?.elo || 'unknown'}, Skill: ${bot.personality?.skillLevel || 'unknown'})`);

      // Add bot to the existing Go backend match using updateMatch
      const botMatchResponse = await DashDiceAPI.updateMatch(sessionId, {
        action: 'join',
        playerId: bot.uid,
        playerName: bot.displayName,
        playerType: 'bot'
      });

      if (botMatchResponse.success) {
        console.log(`✅ Bot ${bot.displayName} successfully joined Go backend session ${sessionId}`);
        
        // Clear the fallback timer since a bot has joined
        this.clearBotFallbackTimer(sessionId);
      } else {
        console.log(`❌ Bot failed to join Go backend session ${sessionId}:`, botMatchResponse);
      }
      
    } catch (error) {
      console.error('❌ Error in Go backend bot matching:', error);
    }
  }
}