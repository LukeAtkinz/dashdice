import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  serverTimestamp,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GameType, RankedStats, RankedMatch } from '@/types/ranked';
import { SeasonService } from './seasonService';

export class RankedMatchmakingService {
  private static readonly COLLECTION_NAME = 'rankedMatches';

  /**
   * Validate if user can play ranked matches
   */
  static async validateRankedEligibility(userId: string, opponentId?: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Check if playing with friends (ranked not allowed with friends)
      if (opponentId) {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData?.friends && Array.isArray(userData.friends) && userData.friends.includes(opponentId)) {
            return { 
              valid: false, 
              reason: 'Ranked matches are not available when playing with friends. Please use Quick Game mode.' 
            };
          }
        }
      }

      // Check if current season exists
      const currentSeason = await SeasonService.getCurrentSeason();
      if (!currentSeason) {
        return { 
          valid: false, 
          reason: 'No active season found. Please try again later.' 
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating ranked eligibility:', error);
      return { 
        valid: false, 
        reason: 'Unable to validate ranked eligibility. Please try again.' 
      };
    }
  }

  /**
   * Initialize ranked stats for a new user
   */
  static async initializeRankedStats(userId: string): Promise<RankedStats> {
    try {
      const currentSeason = await SeasonService.checkAndRotateSeason();
      
      const initialStats: RankedStats = {
        currentSeason: {
          dashNumber: currentSeason.dashNumber,
          level: 1,
          winsInLevel: 0,
          totalWins: 0,
          totalLosses: 0,
          winStreak: 0,
          longestWinStreak: 0,
          gamesPlayed: 0
        },
        allTime: {
          totalDashes: 1,
          maxLevelReached: 1,
          totalRankedWins: 0,
          totalRankedLosses: 0,
          totalRankedGames: 0,
          longestWinStreak: 0,
          averageLevel: 1.0
        }
      };

      // Update user document with ranked stats
      await updateDoc(doc(db, 'users', userId), {
        rankedStats: initialStats,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Initialized ranked stats for user ${userId}`);
      return initialStats;
    } catch (error) {
      console.error('Error initializing ranked stats:', error);
      throw error;
    }
  }

  /**
   * Get user's current ranked stats
   */
  static async getUserRankedStats(userId: string): Promise<RankedStats | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const userData = userDoc.data();
      
      if (!userData?.rankedStats) {
        // User doesn't have ranked stats yet, initialize them
        return await this.initializeRankedStats(userId);
      }

      // Check if user needs season update
      const currentSeason = await SeasonService.getCurrentSeason();
      if (currentSeason && userData.rankedStats.currentSeason.dashNumber !== currentSeason.dashNumber) {
        // User's season is outdated, update it
        return await this.updateUserForNewSeason(userId, currentSeason.dashNumber);
      }

      return userData.rankedStats;
    } catch (error) {
      console.error('Error getting user ranked stats:', error);
      return null;
    }
  }

  /**
   * Update user for new season
   */
  private static async updateUserForNewSeason(userId: string, newDashNumber: number): Promise<RankedStats> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return await this.initializeRankedStats(userId);
      }
      
      const userData = userDoc.data();
      const oldStats = userData?.rankedStats;

      if (!oldStats) {
        return await this.initializeRankedStats(userId);
      }

      // Calculate new all-time stats
      const updatedAllTime = {
        ...oldStats.allTime,
        totalDashes: oldStats.allTime.totalDashes + 1,
        maxLevelReached: Math.max(oldStats.allTime.maxLevelReached, oldStats.currentSeason.level),
        totalRankedWins: oldStats.allTime.totalRankedWins + oldStats.currentSeason.totalWins,
        totalRankedLosses: oldStats.allTime.totalRankedLosses + oldStats.currentSeason.totalLosses,
        totalRankedGames: oldStats.allTime.totalRankedGames + oldStats.currentSeason.gamesPlayed,
        longestWinStreak: Math.max(oldStats.allTime.longestWinStreak, oldStats.currentSeason.longestWinStreak)
      };

      // Calculate average level
      updatedAllTime.averageLevel = updatedAllTime.totalDashes > 0 
        ? (updatedAllTime.averageLevel * (updatedAllTime.totalDashes - 1) + oldStats.currentSeason.level) / updatedAllTime.totalDashes
        : 1.0;

      // Reset current season stats
      const newStats: RankedStats = {
        currentSeason: {
          dashNumber: newDashNumber,
          level: 1,
          winsInLevel: 0,
          totalWins: 0,
          totalLosses: 0,
          winStreak: 0,
          longestWinStreak: 0,
          gamesPlayed: 0
        },
        allTime: updatedAllTime
      };

      // Update user document
      await updateDoc(doc(db, 'users', userId), {
        rankedStats: newStats,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Updated user ${userId} for new season ${newDashNumber}`);
      return newStats;
    } catch (error) {
      console.error('Error updating user for new season:', error);
      throw error;
    }
  }

  /**
   * Process ranked match completion
   */
  static async processRankedMatchCompletion(
    matchId: string,
    winnerId: string,
    loserId: string,
    gameMode: string
  ): Promise<void> {
    try {
      const currentSeason = await SeasonService.checkAndRotateSeason();
      
      // Use transaction to ensure consistency
      await runTransaction(db, async (transaction) => {
        // Get both users' current stats
        const winnerRef = doc(db, 'users', winnerId);
        const loserRef = doc(db, 'users', loserId);
        
        const [winnerDoc, loserDoc] = await Promise.all([
          transaction.get(winnerRef),
          transaction.get(loserRef)
        ]);

        if (!winnerDoc.exists() || !loserDoc.exists()) {
          throw new Error('User documents not found');
        }

        const winnerData = winnerDoc.data();
        const loserData = loserDoc.data();

        // Get current ranked stats or initialize
        const winnerStats = winnerData.rankedStats || await this.initializeRankedStats(winnerId);
        const loserStats = loserData.rankedStats || await this.initializeRankedStats(loserId);

        // Store pre-match levels for match record
        const winnerLevelBefore = winnerStats.currentSeason.level;
        const loserLevelBefore = loserStats.currentSeason.level;
        const winnerWinsBefore = winnerStats.currentSeason.winsInLevel;
        const loserWinsBefore = loserStats.currentSeason.winsInLevel;

        // Update winner stats
        const newWinnerWinsInLevel = winnerStats.currentSeason.winsInLevel + 1;
        const winnerLevelUp = newWinnerWinsInLevel >= 5 && winnerStats.currentSeason.level < 10;
        
        const updatedWinnerStats: RankedStats = {
          currentSeason: {
            ...winnerStats.currentSeason,
            level: winnerLevelUp ? winnerStats.currentSeason.level + 1 : winnerStats.currentSeason.level,
            winsInLevel: winnerLevelUp ? 0 : newWinnerWinsInLevel,
            totalWins: winnerStats.currentSeason.totalWins + 1,
            winStreak: winnerStats.currentSeason.winStreak + 1,
            longestWinStreak: Math.max(winnerStats.currentSeason.longestWinStreak, winnerStats.currentSeason.winStreak + 1),
            gamesPlayed: winnerStats.currentSeason.gamesPlayed + 1
          },
          allTime: winnerStats.allTime
        };

        // Update loser stats
        const updatedLoserStats: RankedStats = {
          currentSeason: {
            ...loserStats.currentSeason,
            totalLosses: loserStats.currentSeason.totalLosses + 1,
            winStreak: 0, // Reset win streak on loss
            gamesPlayed: loserStats.currentSeason.gamesPlayed + 1
          },
          allTime: loserStats.allTime
        };

        // Update user documents
        transaction.update(winnerRef, {
          rankedStats: updatedWinnerStats,
          updatedAt: serverTimestamp()
        });

        transaction.update(loserRef, {
          rankedStats: updatedLoserStats,
          updatedAt: serverTimestamp()
        });

        // Create ranked match record
        const rankedMatchData: Omit<RankedMatch, 'id'> = {
          gameType: 'ranked',
          gameMode,
          dashNumber: currentSeason.dashNumber,
          hostData: {
            playerId: winnerId, // Assuming winner was host for simplicity
            levelBefore: winnerLevelBefore,
            levelAfter: updatedWinnerStats.currentSeason.level,
            winsBefore: winnerWinsBefore,
            winsAfter: updatedWinnerStats.currentSeason.winsInLevel
          },
          opponentData: {
            playerId: loserId,
            levelBefore: loserLevelBefore,
            levelAfter: updatedLoserStats.currentSeason.level,
            winsBefore: loserWinsBefore,
            winsAfter: updatedLoserStats.currentSeason.winsInLevel
          },
          winnerId,
          createdAt: new Date(),
          completedAt: new Date(),
          originalRoomId: matchId
        };

        const rankedMatchRef = doc(collection(db, this.COLLECTION_NAME));
        transaction.set(rankedMatchRef, {
          ...rankedMatchData,
          createdAt: serverTimestamp(),
          completedAt: serverTimestamp()
        });

        console.log(`✅ Processed ranked match completion: ${winnerId} beat ${loserId}`);
        
        if (winnerLevelUp) {
          console.log(`🎉 ${winnerId} leveled up to level ${updatedWinnerStats.currentSeason.level}!`);
        }
      });
    } catch (error) {
      console.error('Error processing ranked match completion:', error);
      throw error;
    }
  }

  /**
   * Get user's ranked match history
   */
  static async getUserRankedMatches(userId: string, limitCount: number = 20): Promise<RankedMatch[]> {
    try {
      const matchesRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        matchesRef,
        where('hostData.playerId', '==', userId),
        orderBy('completedAt', 'desc'),
        firestoreLimit(limitCount)
      );

      const opponentMatchesQuery = query(
        matchesRef,
        where('opponentData.playerId', '==', userId),
        orderBy('completedAt', 'desc'),
        firestoreLimit(limitCount)
      );

      const [hostMatches, opponentMatches] = await Promise.all([
        getDocs(q),
        getDocs(opponentMatchesQuery)
      ]);

      const matches: RankedMatch[] = [];

      hostMatches.forEach((doc) => {
        const data = doc.data();
        matches.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          completedAt: data.completedAt.toDate()
        } as RankedMatch);
      });

      opponentMatches.forEach((doc) => {
        const data = doc.data();
        matches.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          completedAt: data.completedAt.toDate()
        } as RankedMatch);
      });

      // Sort by completion date and remove duplicates
      return matches
        .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
        .slice(0, limitCount);
    } catch (error) {
      console.error('Error getting user ranked matches:', error);
      return [];
    }
  }
}
