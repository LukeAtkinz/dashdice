import { db } from './firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { GameSessionService, SessionPlayerData } from './gameSessionService';
import { BotMatchingService } from './botMatchingService';
import { BotProfile } from '../types/bot';
import { resolveBackgroundPath, getBackgroundById } from '../config/backgrounds';

/**
 * Casual Bot Matchmaking Service
 * 
 * PURPOSE: Eliminate matchmaking for casual games
 * - NO searching for real players
 * - NO waiting timers
 * - INSTANT bot assignment
 * - Users always play against bots in casual mode
 * 
 * This service creates a complete matched session immediately with a bot opponent.
 * The UI (waiting room, turn decider, match) stays identical - users don't notice the difference.
 */

export interface CasualMatchResult {
  sessionId: string;
  success: boolean;
  error?: string;
}

export class CasualBotMatchmakingService {
  
  /**
   * Create an instant bot match for casual games
   * 
   * FLOW:
   * 1. Create game session
   * 2. Select suitable bot immediately
   * 3. Add bot to session immediately
   * 4. Mark session as MATCHED (not waiting)
   * 5. Return complete match data
   * 
   * NO MATCHMAKING - Just instant bot assignment
   */
  static async createInstantBotMatch(
    gameMode: string,
    hostData: SessionPlayerData
  ): Promise<CasualMatchResult> {
    try {
      console.log(`🤖 Creating INSTANT bot match for ${hostData.playerDisplayName} in ${gameMode}`);
      console.log('⚠️ NO MATCHMAKING - Direct bot assignment only');
      
      // STEP 1: Create game session
      // Note: This creates a "waiting" session initially, we'll update it to "matched" after adding bot
      const sessionId = await GameSessionService.createSession(
        'quick',
        gameMode,
        hostData,
        {
          maxPlayers: 2,
          expirationTime: 20 // 20 minutes
        }
      );
      
      console.log(`✅ Session created: ${sessionId}`);
      
      // STEP 2: Select bot immediately (NO WAITING)
      console.log('🎯 Selecting bot opponent (instant, no search delay)...');
      
      const botResult = await BotMatchingService.findSuitableBot({
        gameMode,
        sessionType: 'quick',
        userSkillLevel: hostData.playerStats?.bestStreak || 5, // Use player's skill
        preferredDifficulty: this.determineDefaultDifficulty(),
        excludeBotIds: []
      });
      
      if (!botResult.success || !botResult.bot) {
        console.warn('⚠️ Bot selection failed, creating fallback bot...');
        const fallbackBot = await this.createFallbackBot(gameMode);
        return await this.finalizeBotMatch(sessionId, fallbackBot);
      }
      
      console.log(`✅ Bot selected: ${botResult.bot.displayName}`);
      
      // STEP 3: Add bot to session immediately and mark as matched
      return await this.finalizeBotMatch(sessionId, botResult.bot);
      
    } catch (error) {
      console.error('❌ Failed to create instant bot match:', error);
      return {
        sessionId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create match'
      };
    }
  }
  
  /**
   * Finalize the bot match by adding bot to session and marking as matched
   */
  private static async finalizeBotMatch(
    sessionId: string,
    bot: BotProfile
  ): Promise<CasualMatchResult> {
    try {
      console.log(`🔗 Adding bot ${bot.displayName} to session ${sessionId}...`);
      
      // Add bot to the session (this updates opponentData in the session document)
      await BotMatchingService.addBotToSession(sessionId, bot);
      
      console.log(`✅ Bot added to session`);
      
      // CRITICAL: Mark session as MATCHED immediately (not waiting)
      // This tells the UI that opponent is ready and match can start
      const sessionRef = doc(db, 'gameSessions', sessionId);
      await updateDoc(sessionRef, {
        status: 'matched', // Change from 'waiting' to 'matched'
        matchedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Session marked as MATCHED - ready to play`);
      console.log(`🎮 Instant bot match complete: ${sessionId} vs ${bot.displayName}`);
      
      return {
        sessionId,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Failed to finalize bot match:', error);
      throw error;
    }
  }
  
  /**
   * Determine default bot difficulty based on casual gameplay
   * Casual games are meant to be fun, not too challenging
   */
  private static determineDefaultDifficulty(): 'easy' | 'medium' | 'hard' | 'adaptive' {
    // For casual games, use medium difficulty as default
    // Users just want a fun, predictable experience
    return 'medium';
  }
  
  /**
   * Create a fallback bot if database selection fails
   * This ensures the match ALWAYS succeeds even if bots collection is empty
   */
  private static async createFallbackBot(gameMode: string): Promise<BotProfile> {
    console.log('🆘 Creating fallback bot (emergency backup)...');
    
    const fallbackNames = [
      'DiceBot Alpha',
      'RollerPro',
      'LuckyBot',
      'DiceWizard',
      'CubeRunner',
      'ChanceBot'
    ];
    
    const randomName = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
    const randomBotId = `bot_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get a default background
    const defaultBackground = getBackgroundById('relax') || {
      id: 'relax',
      name: 'Relax',
      file: '/backgrounds/Relax.png',
      type: 'image' as const,
      category: 'Images',
      rarity: 'COMMON'
    };
    
    const fallbackBot: BotProfile = {
      uid: randomBotId,
      displayName: randomName,
      email: `${randomBotId}@bot.dashdice.com`,
      region: 'global',
      isBot: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      personality: {
        skillLevel: 'intermediate',
        aggressiveness: 0.5,
        riskTolerance: 0.5,
        bankingTendency: 0.5,
        adaptationSpeed: 0.3,
        emotionalVolatility: 0.3,
        pressureResistance: 0.6,
        momentumAwareness: 0.5,
        tiltResistance: 0.6,
        archetypeCategory: 'balanced',
        favoriteTimeToPlay: 12
      },
      strategy: {
        bankingThresholds: {
          early: 15,
          mid: 20,
          late: 25,
          desperation: 10
        },
        riskFactors: {
          opponentScore: 0.5,
          turnLength: 0.5,
          gamePhase: 0.5
        },
        adaptationRules: {
          counterAggressive: false,
          mimicSuccessful: false,
          punishMistakes: true
        },
        commonStrategies: ['balanced', 'conservative']
      },
      stats: {
        elo: 1200,
        gamesPlayed: Math.floor(Math.random() * 100) + 50,
        matchWins: Math.floor(Math.random() * 60) + 30,
        bestStreak: Math.floor(Math.random() * 10) + 5,
        currentStreak: Math.floor(Math.random() * 5),
        totalScore: Math.floor(Math.random() * 5000) + 3000,
        averageScore: Math.floor(Math.random() * 30) + 70,
        averageGameLength: 12,
        bankingFrequency: 3.5,
        averageTurnScore: 18,
        riskyContinues: 15,
        lastActiveDate: new Date().toISOString(),
        generationDate: new Date().toISOString()
      },
      preferredGameModes: [gameMode],
      difficultyRating: 5,
      inventory: {
        displayBackgroundEquipped: defaultBackground,
        matchBackgroundEquipped: defaultBackground,
        turnDeciderBackgroundEquipped: defaultBackground,
        victoryBackgroundEquipped: defaultBackground,
        items: []
      },
      recentMatches: []
    };
    
    console.log(`✅ Fallback bot created: ${fallbackBot.displayName}`);
    
    return fallbackBot;
  }
}
