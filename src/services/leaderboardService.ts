import { collection, query, orderBy, limit as firestoreLimit, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { LeaderboardEntry, RankedStats } from '../types/ranked';
import { SeasonService } from './seasonService';

export class LeaderboardService {
  private static instance: LeaderboardService;

  public static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  /**
   * Generate mock leaderboard data for demonstration
   */
  private generateMockLeaderboard(): LeaderboardEntry[] {
    const mockPlayers = [
      { name: 'ProGamer123', level: 8, wins: 47, losses: 12, streak: 7 },
      { name: 'DiceQueen', level: 7, wins: 38, losses: 15, streak: 4 },
      { name: 'RankMaster', level: 6, wins: 32, losses: 18, streak: 2 },
      { name: 'CompPlayer', level: 5, wins: 25, losses: 20, streak: 1 },
      { name: 'NewbieRanked', level: 3, wins: 12, losses: 15, streak: 0 }
    ];

    return mockPlayers.map((player, index) => {
      const gamesPlayed = player.wins + player.losses;
      const winRate = gamesPlayed > 0 ? (player.wins / gamesPlayed) * 100 : 0;
      
      return {
        playerId: `mock_${index + 1}`,
        displayName: player.name,
        level: player.level,
        winsInLevel: Math.floor(Math.random() * 5),
        totalWins: player.wins,
        winRate: Math.round(winRate * 100) / 100,
        winStreak: player.streak,
        gamesPlayed,
        rank: index + 1
      };
    });
  }

  /**
   * Get current season leaderboard
   */
  async getCurrentSeasonLeaderboard(limitCount: number = 100): Promise<LeaderboardEntry[]> {
    try {
      const currentSeason = await SeasonService.getCurrentSeason();
      if (!currentSeason) return [];
      
      const q = query(
        collection(db, 'rankedStats'),
        where('currentSeason.dashNumber', '==', currentSeason.dashNumber),
        orderBy('currentSeason.level', 'desc'),
        orderBy('currentSeason.totalWins', 'desc'),
        orderBy('currentSeason.winsInLevel', 'desc'),
        firestoreLimit(limitCount)
      );

      const snapshot = await getDocs(q);
      const leaderboard: LeaderboardEntry[] = [];

      snapshot.docs.forEach((doc, index) => {
        const data = doc.data() as RankedStats;
        const winRate = data.currentSeason.gamesPlayed > 0 
          ? (data.currentSeason.totalWins / data.currentSeason.gamesPlayed) * 100 
          : 0;
        
        leaderboard.push({
          playerId: doc.id,
          displayName: 'Player', // TODO: Get from user profile
          level: data.currentSeason.level,
          winsInLevel: data.currentSeason.winsInLevel,
          totalWins: data.currentSeason.totalWins,
          winRate: Math.round(winRate * 100) / 100,
          winStreak: data.currentSeason.winStreak,
          gamesPlayed: data.currentSeason.gamesPlayed,
          rank: index + 1
        });
      });

      return leaderboard;
    } catch (error) {
      console.error('Error fetching current season leaderboard:', error);
      console.log('📊 Using mock leaderboard data for demonstration');
      return this.generateMockLeaderboard();
    }
  }

  /**
   * Get all-time leaderboard (based on max level reached)
   */
  async getAllTimeLeaderboard(limitCount: number = 100): Promise<LeaderboardEntry[]> {
    try {
      const q = query(
        collection(db, 'rankedStats'),
        orderBy('allTime.maxLevelReached', 'desc'),
        orderBy('allTime.totalRankedWins', 'desc'),
        orderBy('allTime.totalRankedGames', 'desc'),
        firestoreLimit(limitCount)
      );

      const snapshot = await getDocs(q);
      const leaderboard: LeaderboardEntry[] = [];

      snapshot.docs.forEach((doc, index) => {
        const data = doc.data() as RankedStats;
        const winRate = data.allTime.totalRankedGames > 0 
          ? (data.allTime.totalRankedWins / data.allTime.totalRankedGames) * 100 
          : 0;
        
        leaderboard.push({
          playerId: doc.id,
          displayName: 'Player', // TODO: Get from user profile
          level: data.allTime.maxLevelReached,
          winsInLevel: 0, // Not applicable for all-time
          totalWins: data.allTime.totalRankedWins,
          winRate: Math.round(winRate * 100) / 100,
          winStreak: data.allTime.longestWinStreak,
          gamesPlayed: data.allTime.totalRankedGames,
          rank: index + 1
        });
      });

      return leaderboard;
    } catch (error) {
      console.error('Error fetching all-time leaderboard:', error);
      console.log('📊 Using mock leaderboard data for demonstration');
      return this.generateMockLeaderboard();
    }
  }

  /**
   * Get user's rank in current season
   */
  async getUserCurrentSeasonRank(userId: string): Promise<number | null> {
    try {
      const currentSeason = await SeasonService.getCurrentSeason();
      if (!currentSeason) return null;
      
      // Get user's stats
      const userDoc = await getDocs(query(
        collection(db, 'rankedStats'),
        where('__name__', '==', userId)
      ));

      if (userDoc.empty) return null;

      const userData = userDoc.docs[0].data() as RankedStats;
      const userLevel = userData.currentSeason.level;
      const userWins = userData.currentSeason.totalWins;
      const userWinsInLevel = userData.currentSeason.winsInLevel;

      // Count users with better stats
      const allUsersQuery = query(
        collection(db, 'rankedStats'),
        where('currentSeason.dashNumber', '==', currentSeason.dashNumber)
      );

      const snapshot = await getDocs(allUsersQuery);
      let betterUsersCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as RankedStats;
        const stats = data.currentSeason;
        
        // Better level, or same level with better total wins, or same level/wins with better wins in level
        if (stats.level > userLevel ||
            (stats.level === userLevel && stats.totalWins > userWins) ||
            (stats.level === userLevel && stats.totalWins === userWins && stats.winsInLevel > userWinsInLevel)) {
          betterUsersCount++;
        }
      });

      return betterUsersCount + 1; // User's rank
    } catch (error) {
      console.error('Error getting user current season rank:', error);
      return null;
    }
  }

  /**
   * Get user's rank in all-time leaderboard
   */
  async getUserAllTimeRank(userId: string): Promise<number | null> {
    try {
      // Get user's stats
      const userDoc = await getDocs(query(
        collection(db, 'rankedStats'),
        where('__name__', '==', userId)
      ));

      if (userDoc.empty) return null;

      const userData = userDoc.docs[0].data() as RankedStats;
      const userMaxLevel = userData.allTime.maxLevelReached;
      const userTotalWins = userData.allTime.totalRankedWins;

      // Count users with better stats
      const snapshot = await getDocs(collection(db, 'rankedStats'));
      let betterUsersCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as RankedStats;
        const stats = data.allTime;
        
        // Better max level, or same max level with better total wins
        if (stats.maxLevelReached > userMaxLevel ||
            (stats.maxLevelReached === userMaxLevel && stats.totalRankedWins > userTotalWins)) {
          betterUsersCount++;
        }
      });

      return betterUsersCount + 1; // User's rank
    } catch (error) {
      console.error('Error getting user all-time rank:', error);
      return null;
    }
  }

  /**
   * Get leaderboard around a specific user (e.g., user + 5 above + 5 below)
   */
  async getLeaderboardAroundUser(
    userId: string, 
    gameType: 'current' | 'allTime' = 'current',
    range: number = 5
  ): Promise<LeaderboardEntry[]> {
    try {
      const userRank = gameType === 'current' 
        ? await this.getUserCurrentSeasonRank(userId)
        : await this.getUserAllTimeRank(userId);

      if (!userRank) return [];

      const startRank = Math.max(1, userRank - range);
      const endRank = userRank + range;
      const limitCount = endRank - startRank + 1;

      // Get full leaderboard and slice the range
      const fullLeaderboard = gameType === 'current'
        ? await this.getCurrentSeasonLeaderboard(Math.max(limitCount, userRank + range))
        : await this.getAllTimeLeaderboard(Math.max(limitCount, userRank + range));

      return fullLeaderboard.slice(startRank - 1, endRank);
    } catch (error) {
      console.error('Error getting leaderboard around user:', error);
      return [];
    }
  }

  /**
   * Get top players by level in current season
   */
  async getTopPlayersByLevel(level: number, limitCount: number = 20): Promise<LeaderboardEntry[]> {
    try {
      const currentSeason = await SeasonService.getCurrentSeason();
      if (!currentSeason) return [];
      
      const q = query(
        collection(db, 'rankedStats'),
        where('currentSeason.dashNumber', '==', currentSeason.dashNumber),
        where('currentSeason.level', '==', level),
        orderBy('currentSeason.totalWins', 'desc'),
        orderBy('currentSeason.winsInLevel', 'desc'),
        firestoreLimit(limitCount)
      );

      const snapshot = await getDocs(q);
      const leaderboard: LeaderboardEntry[] = [];

      snapshot.docs.forEach((doc, index) => {
        const data = doc.data() as RankedStats;
        const winRate = data.currentSeason.gamesPlayed > 0 
          ? (data.currentSeason.totalWins / data.currentSeason.gamesPlayed) * 100 
          : 0;
        
        leaderboard.push({
          playerId: doc.id,
          displayName: 'Player', // TODO: Get from user profile
          level: data.currentSeason.level,
          winsInLevel: data.currentSeason.winsInLevel,
          totalWins: data.currentSeason.totalWins,
          winRate: Math.round(winRate * 100) / 100,
          winStreak: data.currentSeason.winStreak,
          gamesPlayed: data.currentSeason.gamesPlayed,
          rank: index + 1
        });
      });

      return leaderboard;
    } catch (error) {
      console.error('Error fetching top players by level:', error);
      throw new Error('Failed to fetch top players by level');
    }
  }
}

// Export singleton instance
export const leaderboardService = LeaderboardService.getInstance();
