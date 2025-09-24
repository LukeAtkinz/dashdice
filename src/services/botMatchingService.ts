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
          console.log(`🤖 BOT_MATCHING_FLOW: { step: 'timeout_reached', sessionId: '${sessionId}', hostPlayerId: '${hostPlayerId}', gameMode: '${gameMode}' }`);
          await this.attemptBotMatch(sessionId, hostPlayerId, gameMode);
        } catch (error) {
          console.error(`❌ Bot matching failed for session ${sessionId}:`, error);
          console.error(`❌ BOT_MATCHING_ERROR: { sessionId: '${sessionId}', error: '${error}' }`);
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
   * 👤 Start 2-second bot timer for guest users (faster matching with easy bots)
   */
  static startGuestBotTimer(
    sessionId: string,
    hostPlayerId: string,
    gameMode: string,
    sessionType: 'quick' | 'ranked' = 'quick'
  ): void {
    try {
      console.log(`👤 Starting 2-second guest bot timer for session ${sessionId}`);
      
      // Clear any existing timer for this session
      this.clearBotFallbackTimer(sessionId);
      
      const timer = setTimeout(async () => {
        try {
          console.log(`⏰ 2-second guest timeout reached for session ${sessionId}, matching with easy bot...`);
          await this.attemptGuestBotMatch(sessionId, hostPlayerId, gameMode);
        } catch (error) {
          console.error(`❌ Guest bot matching failed for session ${sessionId}:`, error);
        } finally {
          // Clean up timer reference
          this.activeBotMatching.delete(sessionId);
        }
      }, 2000); // 2 seconds for guests
      
      // Store timer reference
      this.activeBotMatching.set(sessionId, timer);
      
    } catch (error) {
      console.error('❌ Error starting guest bot timer:', error);
    }
  }

  /**
   * 🤖 Attempt to match guest with an easy bot
   */
  private static async attemptGuestBotMatch(
    sessionId: string,
    hostPlayerId: string,
    gameMode: string
  ): Promise<void> {
    try {
      console.log(`👤 Attempting guest bot match for session ${sessionId} with easy difficulty`);
      
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

      // Select an easy bot specifically for guests
      const bot = await this.selectEasyBotForGuest(hostPlayerId, gameMode);
      if (!bot) {
        console.log('❌ No easy bots available for guest');
        return;
      }

      console.log(`🤖 Selected easy bot for guest: ${bot.displayName}`);

      // Join the bot to the session
      const botPlayerData: SessionPlayerData = {
        playerId: bot.uid,
        playerDisplayName: bot.displayName,
        playerStats: {
          gamesPlayed: bot.stats?.gamesPlayed || 0,
          matchWins: bot.stats?.matchWins || 0,
          currentStreak: bot.stats?.currentStreak || 0,
          bestStreak: bot.stats?.bestStreak || 0
        },
        displayBackgroundEquipped: bot.inventory?.displayBackgroundEquipped || null,
        matchBackgroundEquipped: bot.inventory?.matchBackgroundEquipped || null,
        ready: true,
        joinedAt: new Date(),
        isConnected: true,
        lastHeartbeat: new Date()
      };

      await GameSessionService.joinSession(sessionId, botPlayerData);
      console.log(`✅ Easy bot ${bot.displayName} joined guest session ${sessionId}`);

    } catch (error) {
      console.error(`❌ Guest bot matching failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * 🎯 Select an easy bot specifically for guest players
   */
  private static async selectEasyBotForGuest(
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
      
      console.log(`🔍 Found ${bots.length} available bots, filtering for easy difficulty`);
      
      // Filter for beginner/easy bots only
      const easyBots = bots.filter(bot => 
        bot.isActive && 
        (bot.personality?.skillLevel === 'beginner' || !bot.personality?.skillLevel)
      );
      
      if (easyBots.length === 0) {
        console.log('❌ No easy bots available, using first available bot');
        return bots.find(bot => bot.isActive) || null;
      }
      
      console.log(`🎯 Found ${easyBots.length} easy bots, selecting random one`);
      
      // Select a random easy bot
      const randomIndex = Math.floor(Math.random() * easyBots.length);
      return easyBots[randomIndex];
      
    } catch (error) {
      console.error('❌ Error selecting easy bot for guest:', error);
      return null;
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
      console.log(`🤖 BOT_MATCHING_FLOW: { step: 'attempt_start', sessionId: '${sessionId}', hostPlayerId: '${hostPlayerId}', gameMode: '${gameMode}' }`);
      
      // Check if this is a Go backend session by looking at the session ID format
      const isGoBackendSession = sessionId.startsWith('match-') || sessionId.startsWith('match_');
      console.log(`🔍 BOT_MATCHING_FLOW: { step: 'session_type_detection', sessionId: '${sessionId}', isGoBackendSession: ${isGoBackendSession}, startsWithHyphen: ${sessionId.startsWith('match-')}, startsWithUnderscore: ${sessionId.startsWith('match_')} }`);
      
      if (isGoBackendSession) {
        console.log(`🚀 Detected Go backend session ${sessionId}, handling bot match via Go backend`);
        console.log(`🚀 BOT_MATCHING_FLOW: { step: 'go_backend_bot_match', sessionId: '${sessionId}' }`);
        return this.attemptGoBackendBotMatch(sessionId, hostPlayerId, gameMode);
      }
      
      // Original Firebase logic for Firebase sessions
      console.log(`📊 Detected Firebase session ${sessionId}, handling bot match via Firebase`);
      console.log(`📊 BOT_MATCHING_FLOW: { step: 'firebase_bot_match', sessionId: '${sessionId}' }`);
      return this.attemptFirebaseBotMatch(sessionId, hostPlayerId, gameMode);
      
    } catch (error) {
      console.error('❌ Error in bot matching:', error);
      console.error(`❌ BOT_MATCHING_ERROR: { step: 'attempt_failed', sessionId: '${sessionId}', error: '${error}' }`);
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
      
      // First, try to get the specific match by ID
      console.log(`🔍 Attempting to fetch specific match: ${sessionId}`);
      let specificMatchResponse;
      try {
        specificMatchResponse = await DashDiceAPI.getMatch(sessionId);
        if (specificMatchResponse.success && specificMatchResponse.data?.match) {
          console.log(`✅ Found specific match ${sessionId}:`, specificMatchResponse.data.match);
          // Convert single match to array format for consistency
          const response = {
            success: true,
            data: {
              matches: [specificMatchResponse.data.match]
            }
          };
          await this.processGoBackendMatches(response, sessionId, hostPlayerId, gameMode);
          return;
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch specific match ${sessionId}, falling back to list search:`, error);
      }

      // Fallback: Search through matches with different statuses
      console.log(`🔍 Searching for session ${sessionId} via match listing`);
      let response = await DashDiceAPI.listMatches({ 
        status: 'waiting',
        limit: 50  // Increased limit to catch more matches
      });
      
      if (!response.success || !response.data?.matches || response.data.matches.length === 0) {
        // Try with 'ready' status as fallback
        response = await DashDiceAPI.listMatches({ 
          status: 'ready',
          limit: 50 
        });
      }
      
      if (!response.success || !response.data?.matches) {
        console.log(`❌ Could not fetch Go backend matches for session ${sessionId}`);
        return;
      }

      await this.processGoBackendMatches(response, sessionId, hostPlayerId, gameMode);
    } catch (error) {
      console.error('❌ Error in Go backend bot matching:', error);
    }
  }

  /**
   * Process Go backend matches to find and add bot to the session
   */
  private static async processGoBackendMatches(
    response: any,
    sessionId: string,
    hostPlayerId: string,
    gameMode: string
  ): Promise<void> {
    try {
      // Import DashDiceAPI for match operations
      const { default: DashDiceAPI } = await import('./apiClientNew');
      
      console.log(`🔍 Searching for session ${sessionId} in ${response.data.matches.length} matches`);
      
      // Enhanced logging - show FULL match details
      response.data.matches.forEach((match: any, index: number) => {
        console.log(`🔍 Match ${index}:`, {
          fullMatchObject: match,
          id: match.id,
          matchId: match.matchId,
          match_id: match.match_id,
          MatchID: match.MatchID,
          sessionId: match.sessionId,
          room_id: match.room_id,
          roomId: match.roomId,
          status: match.status,
          game_mode: match.game_mode,
          gameMode: match.gameMode,
          players: match.players,
          playersLength: match.players?.length,
          created_at: match.created_at,
          allKeys: Object.keys(match)
        });
      });
      
      console.log(`🎯 SEARCH TARGET: Looking for sessionId="${sessionId}"`);
      
      // Find our specific match - try multiple possible ID field names and matching strategies
      let ourMatch = response.data.matches.find((match: any) => {
        // Direct ID matches
        const directMatch = match.matchId === sessionId || 
               match.id === sessionId || 
               match.match_id === sessionId ||
               match.MatchID === sessionId ||
               match.sessionId === sessionId ||
               match.room_id === sessionId ||
               match.roomId === sessionId;
        
        // Format conversion: convert match-123 to match_123 and vice versa
        let formatMatch = false;
        if (!directMatch) {
          const convertedId = this.convertMatchIdFormat(sessionId);
          const matchIds = [match.matchId, match.id, match.match_id, match.MatchID, match.sessionId, match.room_id, match.roomId];
          formatMatch = matchIds.some(id => id === convertedId);
        }
        
        // Flexible matching for format differences (match- vs match_) with timestamp
        let flexibleMatch = false;
        if (!directMatch && !formatMatch && (sessionId.startsWith('match-') || sessionId.startsWith('match_'))) {
          // Extract timestamp from sessionId and check if any match has similar timestamp
          const sessionTimestamp = this.extractTimestampFromSessionId(sessionId);
          if (sessionTimestamp) {
            const matchIds = [match.matchId, match.id, match.match_id, match.MatchID, match.sessionId, match.room_id, match.roomId];
            flexibleMatch = matchIds.some(id => {
              if (!id || typeof id !== 'string') return false;
              const matchTimestamp = this.extractTimestampFromSessionId(id);
              // Allow 30 second difference for timing variations
              return matchTimestamp && Math.abs(matchTimestamp - sessionTimestamp) < 30000;
            });
          }
        }
        
        const matchFound = directMatch || flexibleMatch;
        
        console.log(`🔍 Testing match ${match.id || match.matchId || 'unknown'} against ${sessionId}:`, {
          'match.matchId === sessionId': match.matchId === sessionId,
          'match.id === sessionId': match.id === sessionId,
          'match.match_id === sessionId': match.match_id === sessionId,
          'match.MatchID === sessionId': match.MatchID === sessionId,
          'match.sessionId === sessionId': match.sessionId === sessionId,
          'match.room_id === sessionId': match.room_id === sessionId,
          'match.roomId === sessionId': match.roomId === sessionId,
          directMatch: directMatch,
          flexibleMatch: flexibleMatch,
          matchFound: matchFound
        });
        
        return matchFound;
      });
      
        // AGGRESSIVE FALLBACK: If no exact match found, add bot to ANY available match
        if (!ourMatch) {
          console.log(`🔍 No exact ID match found for ${sessionId}, trying aggressive fallback...`);
          
          // Find ANY match that could use a bot (much more permissive)
          const potentialMatches = response.data.matches.filter((match: any) => {
            const matchStatus = match.status as string;
            const playersCount = match.players?.length || 0;
            const matchGameMode = match.game_mode || match.gameMode;
            
            console.log(`🔍 Evaluating match for aggressive fallback:`, {
              matchId: match.id || match.matchId,
              status: matchStatus,
              playersCount: playersCount,
              gameMode: matchGameMode,
              targetGameMode: gameMode,
              statusOk: ['ready', 'waiting', 'waiting_for_players', 'active'].includes(matchStatus),
              hasSpace: playersCount < 2,
              gameModeMatch: matchGameMode === gameMode
            });
            
            // Much more permissive - any match with space in the right game mode
            return ['ready', 'waiting', 'waiting_for_players', 'active'].includes(matchStatus) &&
                   playersCount < 2 &&
                   matchGameMode === gameMode;
          });
          
          console.log(`🔍 Found ${potentialMatches.length} potential matches with aggressive fallback`);
          
          if (potentialMatches.length > 0) {
            // Take the first available match
            ourMatch = potentialMatches[0];
            console.log(`🎯 AGGRESSIVE FALLBACK: Using ${(ourMatch as any).id || (ourMatch as any).matchId} instead of ${sessionId} for bot addition`);
          } else {
            console.log(`❌ No matches found even with aggressive fallback`);
          }
        }      console.log(`🔍 Match search results for ${sessionId}:`, {
        foundMatch: !!ourMatch,
        searchedProperties: ['matchId', 'id', 'match_id', 'MatchID', 'sessionId', 'room_id', 'roomId'],
        targetSessionId: sessionId,
        foundMatchId: ourMatch ? ((ourMatch as any).id || (ourMatch as any).matchId) : null,
        firstMatchSample: response.data.matches[0] // Show the actual structure
      });
      
      if (!ourMatch) {
        console.log(`❌ Match ${sessionId} not found in list, attempting direct fetch...`);
        
        // Try direct match fetch as final attempt
        try {
          const directMatchResponse = await DashDiceAPI.getMatch(sessionId);
          if (directMatchResponse.success && directMatchResponse.data?.match) {
            console.log(`✅ Found match via direct fetch: ${sessionId}`);
            ourMatch = directMatchResponse.data.match;
          } else {
            console.log(`❌ Direct fetch also failed for ${sessionId}:`, directMatchResponse.error);
            console.log(`� No Go backend match found for ${sessionId}, bot matching unavailable`);
            return;
          }
        } catch (directError) {
          console.log(`❌ Direct match fetch failed for ${sessionId}:`, directError);
          console.log(`� Go backend completely failed for ${sessionId}, bot matching unavailable`);
          return;
        }
      }
      
      // Check if match status indicates it's waiting for players
      // Use type assertion since Go backend may return 'ready' which isn't in our TypeScript types
      const matchStatus = (ourMatch as any).status as string;
      if (matchStatus !== 'ready' && matchStatus !== 'waiting' && matchStatus !== 'waiting_for_players') {
        console.log(`❌ Go backend session ${sessionId} status is ${matchStatus}, skipping bot match`);
        return;
      }
      
      const currentPlayers = (ourMatch as any).players || [];
      const playerCount = Array.isArray(currentPlayers) ? currentPlayers.length : 0;
      if (playerCount >= 2) {
        console.log(`❌ Go backend session ${sessionId} already has ${playerCount} participants, skipping bot match`);
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

      // Use the actual match ID from the found match, not the session ID we were searching for
      const actualMatchId = (ourMatch as any).id || (ourMatch as any).matchId || sessionId;
      console.log(`🔧 Using actual match ID for bot addition: ${actualMatchId} (original search was for: ${sessionId})`);

      // Add bot to the existing Go backend match using updateMatch
      console.log(`🚀 ATTEMPTING_BOT_UPDATE: Calling updateMatch for ${actualMatchId} with bot ${bot.displayName}`);
      const botMatchResponse = await DashDiceAPI.updateMatch(actualMatchId, {
        action: 'join',
        playerId: bot.uid,
        playerName: bot.displayName,
        playerType: 'bot'
      });

      console.log(`🔍 BOT_UPDATE_RESPONSE: success=${botMatchResponse.success}, error=${botMatchResponse.error}, response=`, botMatchResponse);

      if (botMatchResponse.success) {
        console.log(`✅ Bot ${bot.displayName} successfully joined Go backend session ${actualMatchId} (original session ID: ${sessionId})`);
        
        // Clear the fallback timer since a bot has joined
        this.clearBotFallbackTimer(sessionId);
      } else {
        console.log(`❌ Bot failed to join Go backend session ${actualMatchId}:`, botMatchResponse.error || botMatchResponse);
        console.log(`🚫 Bot matching failed for Go backend session ${sessionId}, no fallback available`);
      }
      
    } catch (error) {
      console.error('❌ Error in Go backend bot matching:', error);
    }
  }

  /**
   * � Convert match ID format between hyphen and underscore
   */
  private static convertMatchIdFormat(matchId: string): string {
    if (!matchId || typeof matchId !== 'string') return matchId;
    
    // Convert match-123 to match_123
    if (matchId.startsWith('match-')) {
      return matchId.replace('match-', 'match_');
    }
    
    // Convert match_123 to match-123
    if (matchId.startsWith('match_')) {
      return matchId.replace('match_', 'match-');
    }
    
    return matchId;
  }

  /**
   * �🔍 Extract timestamp from session ID for flexible matching
   */
  private static extractTimestampFromSessionId(sessionId: string): number | null {
    if (!sessionId || typeof sessionId !== 'string') return null;
    
    // Handle match-timestamp or match_timestamp formats
    const patterns = [
      /^match[-_](\d+)$/,           // match-1234567890 or match_1234567890
      /^match[-_](\d+)[-_]/,       // match-1234567890-something or match_1234567890_something
      /(\d{10,13})/                // Any 10+ digit timestamp in the string
    ];
    
    for (const pattern of patterns) {
      const match = sessionId.match(pattern);
      if (match) {
        const timestamp = parseInt(match[1], 10);
        // Validate it's a reasonable timestamp (between 2020 and 2030)
        if (timestamp > 1577836800 && timestamp < 1893456000) {
          return timestamp * (timestamp < 10000000000 ? 1000 : 1); // Convert to milliseconds if needed
        }
      }
    }
    
    return null;
  }


}