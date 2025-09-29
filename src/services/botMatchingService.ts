import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy } from 'firebase/firestore';
import { BotProfile, BotMatchingCriteria, BotMatchingResult, SkillLevel } from '../types/bot';
import { SessionPlayerData } from './gameSessionService';

/**
 * Bot Matching Service
 * Handles intelligent bot selection and matching for DashDice
 */
export class BotMatchingService {
  private static readonly BOTS_COLLECTION = 'bots';
  private static readonly BOT_FALLBACK_TIMEOUT = 7000; // 7 seconds
  
  // Bot fallback timers for sessions
  private static botFallbackTimers = new Map<string, NodeJS.Timeout>();
  
  /**
   * 🤖 Setup bot fallback for a session (called when user creates/joins session)
   */
  static setupBotFallback(
    sessionId: string, 
    hostPlayerId: string, 
    gameMode: string,
    sessionType: 'quick' | 'ranked' = 'quick'
  ): void {
    console.log(`⏰ Setting up bot fallback for session ${sessionId} (${this.BOT_FALLBACK_TIMEOUT}ms timeout)`);
    
    // Clear any existing timer for this session
    this.clearBotFallbackTimer(sessionId);
    
    // Set new timer
    const timer = setTimeout(async () => {
      console.log(`⏰ Bot fallback timer triggered for session ${sessionId}`);
      try {
        await this.attemptBotMatch(sessionId, hostPlayerId, gameMode, sessionType);
      } catch (error) {
        console.error(`❌ Bot fallback failed for session ${sessionId}:`, error);
      }
    }, this.BOT_FALLBACK_TIMEOUT);
    
    this.botFallbackTimers.set(sessionId, timer);
  }
  
  /**
   * 🚫 Cancel bot fallback (called when real player joins)
   */
  static clearBotFallbackTimer(sessionId: string): void {
    const timer = this.botFallbackTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.botFallbackTimers.delete(sessionId);
      console.log(`✅ Cancelled bot fallback timer for session ${sessionId}`);
    }
  }
  
  /**
   * 🎯 Attempt to match a bot to a session
   */
  private static async attemptBotMatch(
    sessionId: string,
    hostPlayerId: string, 
    gameMode: string,
    sessionType: 'quick' | 'ranked' = 'quick'
  ): Promise<void> {
    try {
      console.log(`🤖 Attempting bot match for session ${sessionId}`);
      
      // Check if session still needs a bot (verify it's not full)
      const needsBot = await this.sessionNeedsBot(sessionId);
      if (!needsBot) {
        console.log(`✅ Session ${sessionId} no longer needs a bot (likely filled by real player)`);
        return;
      }
      
      // Get host player profile for skill matching
      const hostProfile = await this.getPlayerProfile(hostPlayerId);
      
      // Determine bot matching criteria
      const criteria: BotMatchingCriteria = {
        gameMode,
        sessionType,
        userSkillLevel: hostProfile?.stats?.elo || 1200,
        preferredDifficulty: this.determineBotDifficulty(hostProfile, sessionType),
        excludeBotIds: [] // Could track recently played bots
      };
      
      // Find suitable bot
      const botResult = await this.findSuitableBot(criteria);
      
      if (!botResult.success || !botResult.bot) {
        console.log(`❌ No suitable bot found for session ${sessionId}:`, botResult.error);
        return;
      }
      
      console.log(`🎯 Selected bot: ${botResult.bot.displayName} (${botResult.bot.personality.skillLevel})`);
      
      // Add bot to session
      await this.addBotToSession(sessionId, botResult.bot);
      
      console.log(`✅ Successfully added bot ${botResult.bot.displayName} to session ${sessionId}`);
      
    } catch (error) {
      console.error(`❌ Bot matching failed for session ${sessionId}:`, error);
    }
  }
  
  /**
   * 🔍 Find a suitable bot based on criteria
   */
  static async findSuitableBot(criteria: BotMatchingCriteria): Promise<BotMatchingResult> {
    try {
      console.log('🔍 Searching for suitable bot with criteria:', criteria);
      
      // Get available bots
      const availableBots = await this.getAvailableBots(criteria);
      
      if (availableBots.length === 0) {
        return {
          success: false,
          error: 'No available bots found'
        };
      }
      
      // Score and rank bots based on criteria
      const rankedBots = this.rankBotsByCriteria(availableBots, criteria);
      
      if (rankedBots.length === 0) {
        return {
          success: false,
          error: 'No suitable bots match the criteria'
        };
      }
      
      // Select best bot (with some randomness to avoid always picking the same one)
      const selectedBot = this.selectBotWithVariety(rankedBots);
      
      return {
        success: true,
        bot: selectedBot.bot,
        matchingReason: selectedBot.reason
      };
      
    } catch (error) {
      console.error('❌ Error finding suitable bot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * 📊 Get available bots from database
   */
  private static async getAvailableBots(criteria: BotMatchingCriteria): Promise<BotProfile[]> {
    try {
      // Base query for active bots
      let botQuery = query(
        collection(db, this.BOTS_COLLECTION),
        where('isActive', '==', true),
        where('isBot', '==', true),
        limit(50) // Reasonable limit for performance
      );
      
      // Add game mode filter if the bot supports it
      if (criteria.gameMode) {
        // Note: This assumes bots have a preferredGameModes array field
        // If not available, we'll filter in memory
      }
      
      const snapshot = await getDocs(botQuery);
      const bots: BotProfile[] = [];
      
      snapshot.forEach((doc) => {
        const botData = doc.data() as BotProfile;
        
        // Skip excluded bots
        if (criteria.excludeBotIds?.includes(botData.uid)) {
          return;
        }
        
        // Filter by game mode support (in memory if not in query)
        if (criteria.gameMode && botData.preferredGameModes) {
          if (!botData.preferredGameModes.includes(criteria.gameMode)) {
            return;
          }
        }
        
        bots.push({ ...botData, uid: doc.id });
      });
      
      console.log(`🤖 Found ${bots.length} available bots for matching`);
      return bots;
      
    } catch (error) {
      console.error('❌ Error getting available bots:', error);
      return [];
    }
  }
  
  /**
   * 🏆 Rank bots by suitability for the given criteria
   */
  private static rankBotsByCriteria(
    bots: BotProfile[], 
    criteria: BotMatchingCriteria
  ): Array<{ bot: BotProfile; score: number; reason: string }> {
    return bots.map(bot => {
      let score = 0;
      let reasons: string[] = [];
      
      // Skill level matching
      const skillScore = this.calculateSkillMatchScore(bot, criteria);
      score += skillScore * 0.4; // 40% weight
      if (skillScore > 0.7) reasons.push('skill match');
      
      // Difficulty preference
      const difficultyScore = this.calculateDifficultyScore(bot, criteria);
      score += difficultyScore * 0.3; // 30% weight
      if (difficultyScore > 0.8) reasons.push('difficulty fit');
      
      // Game mode expertise
      const gameModeScore = this.calculateGameModeScore(bot, criteria);
      score += gameModeScore * 0.2; // 20% weight
      if (gameModeScore > 0.8) reasons.push('game mode expert');
      
      // Activity and availability
      const availabilityScore = this.calculateAvailabilityScore(bot);
      score += availabilityScore * 0.1; // 10% weight
      if (availabilityScore > 0.9) reasons.push('highly available');
      
      return {
        bot,
        score,
        reason: reasons.join(', ') || 'general match'
      };
    }).filter(item => item.score > 0.3) // Minimum threshold
      .sort((a, b) => b.score - a.score); // Highest score first
  }
  
  /**
   * 🎲 Select bot with some variety to avoid repetition
   */
  private static selectBotWithVariety(
    rankedBots: Array<{ bot: BotProfile; score: number; reason: string }>
  ): { bot: BotProfile; reason: string } {
    if (rankedBots.length === 0) {
      throw new Error('No ranked bots available for selection');
    }
    
    // Take top 3 candidates (or all if less than 3)
    const topCandidates = rankedBots.slice(0, Math.min(3, rankedBots.length));
    
    // Add some weighted randomness (favor higher scored bots but allow variety)
    const weights = topCandidates.map((_, index) => Math.pow(0.7, index)); // Decreasing weights
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    let random = Math.random() * totalWeight;
    for (let i = 0; i < topCandidates.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        const selected = topCandidates[i];
        console.log(`🎯 Selected bot ${selected.bot.displayName} (rank ${i + 1}): ${selected.reason}`);
        return selected;
      }
    }
    
    // Fallback to first candidate
    return topCandidates[0];
  }
  
  /**
   * 📈 Calculate skill match score between bot and user
   */
  private static calculateSkillMatchScore(bot: BotProfile, criteria: BotMatchingCriteria): number {
    if (!criteria.userSkillLevel) return 0.5; // Neutral if no user skill info
    
    const userElo = criteria.userSkillLevel;
    const botElo = bot.stats.elo;
    
    // Calculate ELO difference (closer = better)
    const eloDiff = Math.abs(userElo - botElo);
    
    // Convert to score (0-1, where 1 is perfect match)
    const maxAcceptableDiff = 400; // ELO points
    const score = Math.max(0, 1 - (eloDiff / maxAcceptableDiff));
    
    return Math.min(1, score);
  }
  
  /**
   * 🎯 Calculate difficulty preference score
   */
  private static calculateDifficultyScore(bot: BotProfile, criteria: BotMatchingCriteria): number {
    if (!criteria.preferredDifficulty) return 0.5;
    
    const botDifficulty = this.getBotDifficultyLevel(bot);
    
    switch (criteria.preferredDifficulty) {
      case 'easy':
        return botDifficulty <= 3 ? 1.0 : Math.max(0, 1 - (botDifficulty - 3) / 7);
      case 'medium':
        return Math.abs(botDifficulty - 5) <= 2 ? 1.0 : Math.max(0, 1 - Math.abs(botDifficulty - 5) / 5);
      case 'hard':
        return botDifficulty >= 7 ? 1.0 : Math.max(0, (botDifficulty - 3) / 7);
      case 'adaptive':
        return 0.8; // Adaptive bots are generally good
      default:
        return 0.5;
    }
  }
  
  /**
   * 🎮 Calculate game mode expertise score
   */
  private static calculateGameModeScore(bot: BotProfile, criteria: BotMatchingCriteria): number {
    if (!bot.preferredGameModes || !criteria.gameMode) return 0.5;
    
    return bot.preferredGameModes.includes(criteria.gameMode) ? 1.0 : 0.3;
  }
  
  /**
   * ⏰ Calculate bot availability score
   */
  private static calculateAvailabilityScore(bot: BotProfile): number {
    // Factor in recent activity, time of day preferences, etc.
    const now = new Date();
    const currentHour = now.getHours();
    
    // Check if it's the bot's preferred time
    const hourDiff = Math.abs(currentHour - bot.personality.favoriteTimeToPlay);
    const timeScore = Math.max(0.5, 1 - (hourDiff / 12)); // 12 hours = complete opposite
    
    // Check recent activity (prefer bots that haven't been used recently)
    const lastActive = new Date(bot.stats.lastActiveDate);
    const hoursSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
    const freshnessScore = Math.min(1, hoursSinceActive / 24); // Full score after 24 hours
    
    return (timeScore * 0.3 + freshnessScore * 0.7);
  }
  
  /**
   * 🔢 Get bot difficulty level (1-10)
   */
  private static getBotDifficultyLevel(bot: BotProfile): number {
    return bot.difficultyRating || this.calculateDifficultyFromStats(bot);
  }
  
  /**
   * 📊 Calculate difficulty from bot stats and personality
   */
  private static calculateDifficultyFromStats(bot: BotProfile): number {
    const elo = bot.stats.elo;
    const winRate = bot.stats.gamesPlayed > 0 ? bot.stats.matchWins / bot.stats.gamesPlayed : 0.5;
    
    // Convert ELO to 1-10 scale (assuming 800-2000 ELO range)
    const eloScore = Math.max(1, Math.min(10, (elo - 800) / 120));
    
    // Factor in win rate
    const winRateScore = winRate * 10;
    
    // Combine and clamp
    return Math.max(1, Math.min(10, (eloScore + winRateScore) / 2));
  }
  
  /**
   * 🎯 Determine appropriate bot difficulty for user
   */
  private static determineBotDifficulty(
    hostProfile: any, 
    sessionType: 'quick' | 'ranked'
  ): 'easy' | 'medium' | 'hard' | 'adaptive' {
    if (sessionType === 'ranked') {
      return 'adaptive'; // Use skill-matched bots for ranked
    }
    
    if (!hostProfile || !hostProfile.stats) {
      return 'easy'; // Default for new players
    }
    
    const gamesPlayed = hostProfile.stats.gamesPlayed || 0;
    const winRate = gamesPlayed > 0 ? (hostProfile.stats.matchWins || 0) / gamesPlayed : 0;
    
    if (gamesPlayed < 10) return 'easy';
    if (gamesPlayed < 50 && winRate < 0.6) return 'easy';
    if (winRate < 0.4) return 'easy';
    if (winRate > 0.7) return 'hard';
    
    return 'medium';
  }
  
  /**
   * 🔍 Check if session still needs a bot
   */
  private static async sessionNeedsBot(sessionId: string): Promise<boolean> {
    try {
      // Check if this is a Go backend session
      if (sessionId.startsWith('match-') || sessionId.startsWith('match_')) {
        return this.goBackendSessionNeedsBot(sessionId);
      }
      
      // Check Firebase session
      return this.firebaseSessionNeedsBot(sessionId);
      
    } catch (error) {
      console.error(`❌ Error checking if session ${sessionId} needs bot:`, error);
      return false;
    }
  }
  
  /**
   * 🔍 Check if Go backend session needs a bot
   */
  private static async goBackendSessionNeedsBot(sessionId: string): Promise<boolean> {
    try {
      const { default: DashDiceAPI } = await import('./apiClientNew');
      
      const matchResponse = await DashDiceAPI.getMatch(sessionId);
      if (!matchResponse.success || !matchResponse.data?.match) {
        return false; // Session doesn't exist or is invalid
      }
      
      const match = matchResponse.data.match;
      const playerCount = Array.isArray(match.players) ? match.players.length : 0;
      const maxPlayers = match.max_players || 2;
      
      // Check if it's waiting and has space
      return match.status === 'waiting' && playerCount < maxPlayers;
      
    } catch (error) {
      console.error(`❌ Error checking Go backend session ${sessionId}:`, error);
      return false;
    }
  }
  
  /**
   * 🔍 Check if Firebase session needs a bot
   */
  private static async firebaseSessionNeedsBot(sessionId: string): Promise<boolean> {
    try {
      const sessionDoc = await getDoc(doc(db, 'gameSessions', sessionId));
      
      if (!sessionDoc.exists()) {
        return false; // Session doesn't exist
      }
      
      const sessionData = sessionDoc.data();
      const playerCount = sessionData.players?.length || 0;
      const maxPlayers = sessionData.maxPlayers || 2;
      
      return sessionData.status === 'waiting' && playerCount < maxPlayers;
      
    } catch (error) {
      console.error(`❌ Error checking Firebase session ${sessionId}:`, error);
      return false;
    }
  }
  
  /**
   * 🤖 Add bot to session
   */
  private static async addBotToSession(sessionId: string, bot: BotProfile): Promise<void> {
    try {
      // Check session type and route to appropriate handler
      if (sessionId.startsWith('match-') || sessionId.startsWith('match_')) {
        await this.addBotToGoBackendSession(sessionId, bot);
      } else {
        await this.addBotToFirebaseSession(sessionId, bot);
      }
      
      // Update bot's last active time
      await this.updateBotLastActive(bot.uid);
      
    } catch (error) {
      console.error(`❌ Error adding bot to session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * 🤖 Add bot to Go backend session
   */
  private static async addBotToGoBackendSession(sessionId: string, bot: BotProfile): Promise<void> {
    try {
      const { default: DashDiceAPI } = await import('./apiClientNew');
      
      const updateResult = await DashDiceAPI.updateMatch(sessionId, {
        action: 'join',
        playerId: bot.uid,
        playerName: bot.displayName,
        playerType: 'bot'
      });
      
      if (!updateResult.success) {
        throw new Error(`Failed to add bot to Go backend session: ${updateResult.error}`);
      }
      
      console.log(`✅ Bot ${bot.displayName} added to Go backend session ${sessionId}`);
      
    } catch (error) {
      console.error(`❌ Error adding bot to Go backend session:`, error);
      throw error;
    }
  }
  
  /**
   * 🤖 Add bot to Firebase session (handles both GameSessions and WaitingRoom)
   */
  private static async addBotToFirebaseSession(sessionId: string, bot: BotProfile): Promise<void> {
    try {
      // First check if this is a waiting room entry
      const waitingRoomDoc = await getDoc(doc(db, 'waitingroom', sessionId));
      
      if (waitingRoomDoc.exists()) {
        // Update waiting room with bot opponent data
        console.log(`🤖 Adding bot ${bot.displayName} to waiting room ${sessionId}`);
        
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'waitingroom', sessionId), {
          opponentData: {
            playerDisplayName: bot.displayName,
            playerId: bot.uid,
            displayBackgroundEquipped: bot.inventory?.displayBackgroundEquipped || null,
            matchBackgroundEquipped: bot.inventory?.matchBackgroundEquipped || null,
            playerStats: {
              bestStreak: bot.stats.bestStreak,
              currentStreak: bot.stats.currentStreak,
              gamesPlayed: bot.stats.gamesPlayed,
              matchWins: bot.stats.matchWins
            }
          }
        });
        
        console.log(`✅ Bot ${bot.displayName} added to waiting room ${sessionId}`);
        return;
      }
      
      // If not in waiting room, try game sessions
      const { GameSessionService } = await import('./gameSessionService');
      
      // Create bot player data for game sessions
      const botPlayerData: SessionPlayerData = {
        playerId: bot.uid,
        playerDisplayName: bot.displayName,
        playerStats: {
          bestStreak: bot.stats.bestStreak,
          currentStreak: bot.stats.currentStreak,
          gamesPlayed: bot.stats.gamesPlayed,
          matchWins: bot.stats.matchWins
        },
        displayBackgroundEquipped: bot.inventory?.displayBackgroundEquipped || null,
        matchBackgroundEquipped: bot.inventory?.matchBackgroundEquipped || null,
        ready: true,
        joinedAt: new Date(),
        isConnected: true,
        lastHeartbeat: new Date()
      };
      
      const result = await GameSessionService.joinSession(sessionId, botPlayerData);
      
      if (!result.success) {
        throw new Error(`Failed to add bot to Firebase session`);
      }
      
      console.log(`✅ Bot ${bot.displayName} added to Firebase session ${sessionId}`);
      
    } catch (error) {
      console.error(`❌ Error adding bot to Firebase session:`, error);
      throw error;
    }
  }
  
  /**
   * 👤 Get player profile for skill matching
   */
  private static async getPlayerProfile(playerId: string): Promise<any> {
    try {
      const playerDoc = await getDoc(doc(db, 'users', playerId));
      return playerDoc.exists() ? playerDoc.data() : null;
    } catch (error) {
      console.error(`❌ Error getting player profile for ${playerId}:`, error);
      return null;
    }
  }
  
  /**
   * ⏰ Update bot's last active time
   */
  private static async updateBotLastActive(botId: string): Promise<void> {
    try {
      const { updateDoc, serverTimestamp } = await import('firebase/firestore');
      const botRef = doc(db, this.BOTS_COLLECTION, botId);
      await updateDoc(botRef, {
        'stats.lastActiveDate': serverTimestamp()
      });
    } catch (error) {
      console.error(`❌ Error updating bot last active time for ${botId}:`, error);
    }
  }
}