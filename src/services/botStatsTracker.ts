/**
 * Bot Stats Tracking Service
 * Handles real-time stats updates, achievement progression, and personality evolution for bots
 */

import { 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  getDoc,
  setDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { BotProfile } from './botProfileGenerator';

export interface MatchResult {
  botId: string;
  opponentId: string;
  won: boolean;
  finalScore: number;
  opponentFinalScore: number;
  gameMode: string;
  turnsTaken: number;
  biggestTurnScore: number;
  doublesRolled: number;
  banksExecuted: number;
  matchDuration: number; // in milliseconds
  achievements: string[]; // Achievements unlocked this match
}

export interface BotStatsUpdate {
  gamesPlayed: number;
  matchWins?: number;
  currentStreak?: number;
  bestStreak?: number;
  totalScore: number;
  averageScore: number;
  elo?: number;
  rank?: string;
}

export interface PersonalityEvolution {
  experienceGain: number;
  winRateImpact: number;
  opponentAdaptation: number;
  emotionalGrowth: number;
}

export class BotStatsTracker {
  
  /**
   * Update bot stats after a match
   */
  static async updateBotMatchResult(result: MatchResult): Promise<void> {
    try {
      console.log(`🤖 Updating stats for bot ${result.botId} - ${result.won ? 'Win' : 'Loss'}`);
      
      const botRef = doc(db, 'bot_profiles', result.botId);
      const botDoc = await getDoc(botRef);
      
      if (!botDoc.exists()) {
        console.error(`❌ Bot profile not found: ${result.botId}`);
        return;
      }
      
      const botData = botDoc.data() as BotProfile;
      
      // Calculate new stats
      const newStats = this.calculateUpdatedStats(botData.stats, result);
      
      // Update achievements
      const newAchievements = await this.updateBotAchievements(result, botData);
      
      // Evolve personality based on experience
      const evolvedPersonality = this.evolveBotPersonality(botData.personality, result, botData.stats);
      
      // Update emotional state
      const updatedEmotionalState = this.updateEmotionalState(botData.emotionalState, result);
      
      // Prepare update object
      const updateData = {
        stats: newStats,
        personality: evolvedPersonality,
        emotionalState: updatedEmotionalState,
        achievements: newAchievements,
        updatedAt: serverTimestamp(),
        'botConfig.lastActiveDate': serverTimestamp()
      };
      
      // Add recent match to history  
      if ((botData as any).recentMatches) {
        const recentMatches = [...(botData as any).recentMatches, result.opponentId].slice(-10);
        (updateData as any)['recentMatches'] = recentMatches;
      }
      
      // Atomic update
      await updateDoc(botRef, updateData);
      
      console.log(`✅ Successfully updated bot ${result.botId} stats`);
      
    } catch (error) {
      console.error(`❌ Error updating bot stats for ${result.botId}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate updated stats based on match result
   */
  private static calculateUpdatedStats(currentStats: any, result: MatchResult): BotStatsUpdate {
    const newGamesPlayed = currentStats.gamesPlayed + 1;
    const newMatchWins = result.won ? currentStats.matchWins + 1 : currentStats.matchWins;
    const newTotalScore = currentStats.totalScore + result.finalScore;
    const newAverageScore = Math.round(newTotalScore / newGamesPlayed);
    
    // Calculate streak
    let newCurrentStreak: number;
    let newBestStreak: number;
    
    if (result.won) {
      newCurrentStreak = currentStats.currentStreak >= 0 ? currentStats.currentStreak + 1 : 1;
      newBestStreak = Math.max(currentStats.bestStreak, newCurrentStreak);
    } else {
      newCurrentStreak = currentStats.currentStreak <= 0 ? currentStats.currentStreak - 1 : -1;
      newBestStreak = currentStats.bestStreak; // Best streak only increases with wins
    }
    
    // Calculate new ELO rating
    const newElo = this.calculateNewELO(currentStats.elo || 1200, result);
    
    // Calculate new rank
    const newRank = this.calculateRank(newMatchWins, newGamesPlayed, newElo);
    
    return {
      gamesPlayed: newGamesPlayed,
      matchWins: newMatchWins,
      currentStreak: newCurrentStreak,
      bestStreak: newBestStreak,
      totalScore: newTotalScore,
      averageScore: newAverageScore,
      elo: newElo,
      rank: newRank
    };
  }
  
  /**
   * Calculate new ELO rating based on match result
   */
  private static calculateNewELO(currentElo: number, result: MatchResult): number {
    // Simplified ELO calculation for bots
    const K = 32; // K-factor
    const expectedScore = 1 / (1 + Math.pow(10, (1400 - currentElo) / 400)); // Assume opponent is 1400 ELO
    const actualScore = result.won ? 1 : 0;
    
    const newElo = currentElo + K * (actualScore - expectedScore);
    
    // Clamp ELO between reasonable bounds
    return Math.max(800, Math.min(2200, Math.round(newElo)));
  }
  
  /**
   * Calculate rank based on performance
   */
  private static calculateRank(wins: number, games: number, elo: number): string {
    const winRate = wins / games;
    
    if (elo > 1800 && winRate > 0.8 && games > 100) return 'Diamond';
    if (elo > 1600 && winRate > 0.7 && games > 50) return 'Platinum';
    if (elo > 1400 && winRate > 0.6 && games > 25) return 'Gold';
    if (elo > 1200 && winRate > 0.5 && games > 10) return 'Silver';
    return 'Bronze';
  }
  
  /**
   * Update bot achievements based on match performance
   */
  private static async updateBotAchievements(result: MatchResult, botData: BotProfile): Promise<any> {
    const currentAchievements = { ...botData.achievements };
    const now = serverTimestamp() as Timestamp;
    
    // Check for new achievements
    const newStats = this.calculateUpdatedStats(botData.stats, result);
    
    // Games played achievements
    if (newStats.gamesPlayed === 10 && !currentAchievements['first_10_games']) {
      currentAchievements['first_10_games'] = { unlockedAt: now, progress: 100 };
    }
    if (newStats.gamesPlayed === 50 && !currentAchievements['experienced_player']) {
      currentAchievements['experienced_player'] = { unlockedAt: now, progress: 100 };
    }
    if (newStats.gamesPlayed === 100 && !currentAchievements['century_club']) {
      currentAchievements['century_club'] = { unlockedAt: now, progress: 100 };
    }
    
    // Win streak achievements
    if (newStats.currentStreak === 5 && !currentAchievements['hot_streak']) {
      currentAchievements['hot_streak'] = { unlockedAt: now, progress: 100 };
    }
    if (newStats.currentStreak === 10 && !currentAchievements['unstoppable']) {
      currentAchievements['unstoppable'] = { unlockedAt: now, progress: 100 };
    }
    if (newStats.currentStreak === 15 && !currentAchievements['legendary_streak']) {
      currentAchievements['legendary_streak'] = { unlockedAt: now, progress: 100 };
    }
    
    // Match-specific achievements
    if (result.doublesRolled >= 3 && !currentAchievements['double_trouble']) {
      currentAchievements['double_trouble'] = { unlockedAt: now, progress: 100 };
    }
    if (result.biggestTurnScore >= 50 && !currentAchievements['big_scorer']) {
      currentAchievements['big_scorer'] = { unlockedAt: now, progress: 100 };
    }
    if (result.banksExecuted >= 10 && !currentAchievements['strategic_banker']) {
      currentAchievements['strategic_banker'] = { unlockedAt: now, progress: 100 };
    }
    
    // Rank achievements
    if (newStats.rank === 'Gold' && !currentAchievements['golden_player']) {
      currentAchievements['golden_player'] = { unlockedAt: now, progress: 100 };
    }
    if (newStats.rank === 'Diamond' && !currentAchievements['diamond_elite']) {
      currentAchievements['diamond_elite'] = { unlockedAt: now, progress: 100 };
    }
    
    return currentAchievements;
  }
  
  /**
   * Evolve bot personality based on match experience
   */
  private static evolveBotPersonality(currentPersonality: any, result: MatchResult, stats: any): any {
    const evolutionRate = 0.01; // Very slow evolution to maintain consistency
    const evolvedPersonality = { ...currentPersonality };
    
    // Experience-based evolution
    const experienceLevel = Math.min(stats.gamesPlayed / 1000, 1.0); // Cap at 1000 games
    
    // Win rate affects confidence and aggressiveness
    const winRate = stats.matchWins / stats.gamesPlayed;
    if (winRate > 0.7) {
      evolvedPersonality.confidenceLevel = Math.min(0.95, currentPersonality.confidenceLevel + evolutionRate);
      evolvedPersonality.aggressiveness = Math.min(0.9, currentPersonality.aggressiveness + evolutionRate * 0.5);
    } else if (winRate < 0.3) {
      evolvedPersonality.confidenceLevel = Math.max(0.3, currentPersonality.confidenceLevel - evolutionRate);
      evolvedPersonality.aggressiveness = Math.max(0.1, currentPersonality.aggressiveness - evolutionRate * 0.5);
    }
    
    // Recent performance affects emotional traits
    if (result.won) {
      evolvedPersonality.tiltResistance = Math.min(0.9, currentPersonality.tiltResistance + evolutionRate * 0.5);
    } else {
      evolvedPersonality.emotionalVolatility = Math.min(0.8, currentPersonality.emotionalVolatility + evolutionRate * 0.3);
    }
    
    // Long-term adaptation
    if (stats.gamesPlayed > 100) {
      evolvedPersonality.adaptationSpeed = Math.min(0.9, currentPersonality.adaptationSpeed + evolutionRate * experienceLevel);
      evolvedPersonality.strategicThinking = Math.min(0.95, currentPersonality.strategicThinking + evolutionRate * experienceLevel);
    }
    
    return evolvedPersonality;
  }
  
  /**
   * Update emotional state based on match result
   */
  private static updateEmotionalState(currentState: any, result: MatchResult): any {
    const newState = { ...currentState };
    
    if (result.won) {
      // Positive result
      newState.confidence = Math.min(1.0, currentState.confidence + 0.1);
      newState.frustration = Math.max(0.0, currentState.frustration - 0.15);
      newState.momentum = Math.min(1.0, currentState.momentum + 0.2);
      newState.pressure = Math.max(0.0, currentState.pressure - 0.1);
      
      if (newState.confidence > 0.8) {
        newState.currentMood = 'confident';
      } else {
        newState.currentMood = 'calm';
      }
    } else {
      // Negative result
      newState.confidence = Math.max(0.0, currentState.confidence - 0.1);
      newState.frustration = Math.min(1.0, currentState.frustration + 0.1);
      newState.momentum = Math.max(-1.0, currentState.momentum - 0.2);
      
      if (newState.frustration > 0.7) {
        newState.currentMood = 'frustrated';
      } else if (newState.momentum < -0.5) {
        newState.currentMood = 'defensive';
      } else {
        newState.currentMood = 'calm';
      }
    }
    
    return newState;
  }
  
  /**
   * Get bot profile for matchmaking
   */
  static async getBotProfile(botId: string): Promise<BotProfile | null> {
    try {
      const botRef = doc(db, 'bot_profiles', botId);
      const botDoc = await getDoc(botRef);
      
      if (!botDoc.exists()) {
        return null;
      }
      
      return botDoc.data() as BotProfile;
    } catch (error) {
      console.error(`❌ Error fetching bot profile ${botId}:`, error);
      return null;
    }
  }
  
  /**
   * Get available bots for matchmaking
   */
  static async getAvailableBots(gameMode: string, region?: string, skillLevel?: string): Promise<BotProfile[]> {
    try {
      let botQuery = query(
        collection(db, 'bot_profiles'),
        where('botConfig.isActive', '==', true)
      );
      
      if (region) {
        botQuery = query(botQuery, where('botConfig.region', '==', region));
      }
      
      if (skillLevel) {
        botQuery = query(botQuery, where('botConfig.skillLevel', '==', skillLevel));
      }
      
      const querySnapshot = await getDocs(botQuery);
      const bots: BotProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        bots.push(doc.data() as BotProfile);
      });
      
      return bots;
    } catch (error) {
      console.error('❌ Error fetching available bots:', error);
      return [];
    }
  }
  
  /**
   * Select best bot opponent based on player skill and preferences
   */
  static selectBotOpponent(
    availableBots: BotProfile[],
    playerElo: number = 1200,
    playerGamesPlayed: number = 0
  ): BotProfile | null {
    if (availableBots.length === 0) return null;
    
    // Filter bots by skill level compatibility
    const playerSkillLevel = this.determinePlayerSkillLevel(playerElo, playerGamesPlayed);
    const compatibleBots = availableBots.filter(bot => 
      this.isSkillLevelCompatible(bot.botConfig.skillLevel, playerSkillLevel)
    );
    
    if (compatibleBots.length === 0) {
      // Fallback to any available bot
      return availableBots[Math.floor(Math.random() * availableBots.length)];
    }
    
    // Select random compatible bot
    return compatibleBots[Math.floor(Math.random() * compatibleBots.length)];
  }
  
  /**
   * Determine player skill level based on ELO and experience
   */
  private static determinePlayerSkillLevel(elo: number, gamesPlayed: number): string {
    if (elo > 1600 && gamesPlayed > 100) return 'expert';
    if (elo > 1400 && gamesPlayed > 50) return 'advanced';
    if (elo > 1200 && gamesPlayed > 25) return 'intermediate';
    return 'beginner';
  }
  
  /**
   * Check if bot skill level is compatible with player
   */
  private static isSkillLevelCompatible(botSkill: string, playerSkill: string): boolean {
    const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const botIndex = skillLevels.indexOf(botSkill);
    const playerIndex = skillLevels.indexOf(playerSkill);
    
    // Allow ±1 skill level difference
    return Math.abs(botIndex - playerIndex) <= 1;
  }
  
  /**
   * Batch update multiple bot stats (for performance)
   */
  static async batchUpdateBotStats(results: MatchResult[]): Promise<void> {
    try {
      console.log(`🤖 Batch updating stats for ${results.length} bots...`);
      
      const updatePromises = results.map(result => 
        this.updateBotMatchResult(result).catch(error => {
          console.error(`Failed to update bot ${result.botId}:`, error);
        })
      );
      
      await Promise.all(updatePromises);
      
      console.log(`✅ Batch update completed for ${results.length} bots`);
    } catch (error) {
      console.error('❌ Error in batch update:', error);
      throw error;
    }
  }
  
  /**
   * Reset bot emotional state (for testing)
   */
  static async resetBotEmotionalState(botId: string): Promise<void> {
    try {
      const botRef = doc(db, 'bot_profiles', botId);
      await updateDoc(botRef, {
        'emotionalState.frustration': 0.1,
        'emotionalState.confidence': 0.6,
        'emotionalState.pressure': 0.0,
        'emotionalState.momentum': 0.0,
        'emotionalState.currentMood': 'calm'
      });
      
      console.log(`✅ Reset emotional state for bot ${botId}`);
    } catch (error) {
      console.error(`❌ Error resetting bot emotional state for ${botId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get bot statistics summary
   */
  static async getBotStatsSummary(): Promise<any> {
    try {
      const botsQuery = query(collection(db, 'bot_profiles'));
      const querySnapshot = await getDocs(botsQuery);
      
      let totalBots = 0;
      let activeBots = 0;
      let totalGames = 0;
      let skillDistribution = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
      let regionDistribution: Record<string, number> = {};
      
      querySnapshot.forEach((doc) => {
        const bot = doc.data() as BotProfile;
        totalBots++;
        
        if (bot.botConfig.isActive) {
          activeBots++;
        }
        
        totalGames += bot.stats.gamesPlayed;
        skillDistribution[bot.botConfig.skillLevel]++;
        
        const region = bot.botConfig.region;
        regionDistribution[region] = (regionDistribution[region] || 0) + 1;
      });
      
      return {
        totalBots,
        activeBots,
        totalGames,
        averageGamesPerBot: totalBots > 0 ? Math.round(totalGames / totalBots) : 0,
        skillDistribution,
        regionDistribution
      };
    } catch (error) {
      console.error('❌ Error getting bot stats summary:', error);
      return null;
    }
  }
}

export default BotStatsTracker;
