import { collection, query, where, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { RankedStats } from '../types/ranked';

export interface MatchmakingCriteria {
  userId: string;
  userLevel: number;
  userWinRate: number;
  userGamesPlayed: number;
  maxLevelDifference?: number;
  maxWinRateDifference?: number;
  preferredOpponents?: string[]; // User IDs of preferred opponents
}

export interface MatchmakingResult {
  opponentId: string;
  opponentLevel: number;
  opponentWinRate: number;
  compatibility: number; // 0-100 score
  estimatedGameQuality: number; // 0-100 score
}

export class SkillBasedMatchmakingService {
  private static instance: SkillBasedMatchmakingService;

  public static getInstance(): SkillBasedMatchmakingService {
    if (!SkillBasedMatchmakingService.instance) {
      SkillBasedMatchmakingService.instance = new SkillBasedMatchmakingService();
    }
    return SkillBasedMatchmakingService.instance;
  }

  /**
   * Find the best opponents for a user based on skill level
   */
  async findOptimalOpponents(criteria: MatchmakingCriteria): Promise<MatchmakingResult[]> {
    try {
      const {
        userId,
        userLevel,
        userWinRate,
        userGamesPlayed,
        maxLevelDifference = 2,
        maxWinRateDifference = 20
      } = criteria;

      // Calculate level range
      const minLevel = Math.max(1, userLevel - maxLevelDifference);
      const maxLevel = Math.min(10, userLevel + maxLevelDifference);

      // Get potential opponents within level range
      const potentialOpponents = await this.getPotentialOpponents(
        userId,
        minLevel,
        maxLevel,
        userWinRate,
        maxWinRateDifference
      );

      // Score and rank opponents
      const scoredOpponents = potentialOpponents.map(opponent => {
        const compatibility = this.calculateCompatibility(
          userLevel,
          userWinRate,
          userGamesPlayed,
          opponent.level,
          opponent.winRate,
          opponent.gamesPlayed
        );

        const gameQuality = this.estimateGameQuality(
          userLevel,
          userWinRate,
          opponent.level,
          opponent.winRate
        );

        return {
          opponentId: opponent.userId,
          opponentLevel: opponent.level,
          opponentWinRate: opponent.winRate,
          compatibility,
          estimatedGameQuality: gameQuality
        };
      });

      // Sort by compatibility score (highest first)
      return scoredOpponents.sort((a, b) => b.compatibility - a.compatibility);

    } catch (error) {
      console.error('Error finding optimal opponents:', error);
      return [];
    }
  }

  /**
   * Get potential opponents from database
   */
  private async getPotentialOpponents(
    userId: string,
    minLevel: number,
    maxLevel: number,
    userWinRate: number,
    maxWinRateDifference: number
  ): Promise<Array<{ userId: string; level: number; winRate: number; gamesPlayed: number }>> {
    try {
      // Query for opponents within level range
      const q = query(
        collection(db, 'rankedStats'),
        where('currentSeason.level', '>=', minLevel),
        where('currentSeason.level', '<=', maxLevel),
        firestoreLimit(100) // Limit to reasonable number for processing
      );

      const snapshot = await getDocs(q);
      const opponents: Array<{ userId: string; level: number; winRate: number; gamesPlayed: number }> = [];

      snapshot.forEach((doc) => {
        if (doc.id === userId) return; // Skip self

        const data = doc.data() as RankedStats;
        const currentSeason = data.currentSeason;
        
        // Calculate win rate
        const winRate = currentSeason.gamesPlayed > 0 
          ? (currentSeason.totalWins / currentSeason.gamesPlayed) * 100 
          : 0;

        // Filter by win rate difference
        if (Math.abs(winRate - userWinRate) <= maxWinRateDifference) {
          opponents.push({
            userId: doc.id,
            level: currentSeason.level,
            winRate,
            gamesPlayed: currentSeason.gamesPlayed
          });
        }
      });

      return opponents;
    } catch (error) {
      console.error('Error getting potential opponents:', error);
      return [];
    }
  }

  /**
   * Calculate compatibility score between two players
   */
  private calculateCompatibility(
    userLevel: number,
    userWinRate: number,
    userGamesPlayed: number,
    opponentLevel: number,
    opponentWinRate: number,
    opponentGamesPlayed: number
  ): number {
    // Level similarity (0-40 points)
    const levelDiff = Math.abs(userLevel - opponentLevel);
    const levelScore = Math.max(0, 40 - (levelDiff * 10));

    // Win rate similarity (0-30 points)
    const winRateDiff = Math.abs(userWinRate - opponentWinRate);
    const winRateScore = Math.max(0, 30 - (winRateDiff * 1.5));

    // Experience similarity (0-20 points)
    const avgGames = (userGamesPlayed + opponentGamesPlayed) / 2;
    const gamesDiff = Math.abs(userGamesPlayed - opponentGamesPlayed);
    const experienceScore = avgGames > 0 ? Math.max(0, 20 - (gamesDiff / avgGames * 20)) : 20;

    // Avoid beginners vs experienced (0-10 points)
    const minGames = Math.min(userGamesPlayed, opponentGamesPlayed);
    const maxGames = Math.max(userGamesPlayed, opponentGamesPlayed);
    const experienceGapPenalty = maxGames > 50 && minGames < 10 ? -10 : 0;

    const totalScore = levelScore + winRateScore + experienceScore + experienceGapPenalty;
    return Math.max(0, Math.min(100, totalScore));
  }

  /**
   * Estimate game quality based on player stats
   */
  private estimateGameQuality(
    userLevel: number,
    userWinRate: number,
    opponentLevel: number,
    opponentWinRate: number
  ): number {
    // Perfect match is when players are very similar
    const levelDiff = Math.abs(userLevel - opponentLevel);
    const winRateDiff = Math.abs(userWinRate - opponentWinRate);

    // Level factor (0-50 points)
    const levelFactor = Math.max(0, 50 - (levelDiff * 15));

    // Win rate factor (0-30 points)
    const winRateFactor = Math.max(0, 30 - (winRateDiff * 2));

    // Competitive factor (0-20 points) - both players should have reasonable experience
    const avgWinRate = (userWinRate + opponentWinRate) / 2;
    const competitiveFactor = avgWinRate > 30 && avgWinRate < 80 ? 20 : 10;

    const quality = levelFactor + winRateFactor + competitiveFactor;
    return Math.max(0, Math.min(100, quality));
  }

  /**
   * Get ELO-style rating for a player
   */
  calculateELORating(level: number, winRate: number, gamesPlayed: number): number {
    const baseRating = 1000; // Starting ELO
    const levelBonus = (level - 1) * 200; // 200 points per level
    const winRateBonus = (winRate - 50) * 5; // Bonus/penalty for win rate above/below 50%
    const experienceBonus = Math.min(100, gamesPlayed * 2); // Up to 100 bonus for experience

    return Math.round(baseRating + levelBonus + winRateBonus + experienceBonus);
  }

  /**
   * Predict match outcome probability
   */
  predictMatchOutcome(
    userLevel: number,
    userWinRate: number,
    userGamesPlayed: number,
    opponentLevel: number,
    opponentWinRate: number,
    opponentGamesPlayed: number
  ): { userWinProbability: number; confidence: number } {
    const userELO = this.calculateELORating(userLevel, userWinRate, userGamesPlayed);
    const opponentELO = this.calculateELORating(opponentLevel, opponentWinRate, opponentGamesPlayed);

    // Standard ELO probability calculation
    const userWinProbability = 1 / (1 + Math.pow(10, (opponentELO - userELO) / 400));

    // Confidence based on experience levels
    const minGames = Math.min(userGamesPlayed, opponentGamesPlayed);
    const confidence = Math.min(1, minGames / 20); // Higher confidence with more games

    return {
      userWinProbability: Math.round(userWinProbability * 100) / 100,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Find balanced teams for team-based modes (future feature)
   */
  async findBalancedTeams(playerIds: string[]): Promise<{ team1: string[]; team2: string[] } | null> {
    // TODO: Implement team balancing algorithm
    // This would be useful for future team-based ranked modes
    return null;
  }

  /**
   * Get matchmaking statistics
   */
  async getMatchmakingStats(): Promise<{
    activePlayersCount: number;
    averageWaitTime: number;
    averageGameQuality: number;
  }> {
    try {
      // Get active players count (players who played in last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // This would require tracking last active timestamps
      // For now, return estimated values
      return {
        activePlayersCount: 0, // TODO: Implement active player tracking
        averageWaitTime: 30, // seconds
        averageGameQuality: 75 // percentage
      };
    } catch (error) {
      console.error('Error getting matchmaking stats:', error);
      return {
        activePlayersCount: 0,
        averageWaitTime: 0,
        averageGameQuality: 0
      };
    }
  }
}

// Export singleton instance
export const skillBasedMatchmakingService = SkillBasedMatchmakingService.getInstance();
