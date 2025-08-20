import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import AchievementTrackingService from './achievementTrackingService';

export class CompletedMatchService {
  private static readonly MATCHES_COLLECTION = 'matches';
  private static readonly COMPLETED_MATCHES_COLLECTION = 'completedmatches';

  /**
   * Move a completed match to the completedmatches collection
   */
  static async moveMatchToCompleted(matchId: string, winnerData?: {
    playerId: string;
    playerDisplayName: string;
    finalScore: number;
  }) {
    try {
      console.log('🏆 Moving match to completed collection:', matchId);

      // Get the match data
      const matchRef = doc(db, this.MATCHES_COLLECTION, matchId);
      const matchSnapshot = await getDoc(matchRef);

      if (!matchSnapshot.exists()) {
        console.error('❌ Match not found:', matchId);
        throw new Error(`Match ${matchId} not found`);
      }

      const matchData = matchSnapshot.data();

      // Create completed match data with additional metadata
      const completedMatchData = {
        ...matchData,
        // Add completion metadata
        completedAt: serverTimestamp(),
        originalMatchId: matchId,
        
        // Add winner information if provided
        ...(winnerData && {
          winner: {
            playerId: winnerData.playerId,
            playerDisplayName: winnerData.playerDisplayName,
            finalScore: winnerData.finalScore
          }
        }),

        // Update status
        gameData: {
          ...matchData.gameData,
          status: 'completed'
        }
      };

      // Add to completed matches collection
      const completedMatchRef = await addDoc(
        collection(db, this.COMPLETED_MATCHES_COLLECTION), 
        completedMatchData
      );

      // Delete from active matches collection
      await deleteDoc(matchRef);

      // Track achievements for both players
      await this.trackMatchAchievements(matchData, winnerData);

      console.log('✅ Match moved to completed collection:', completedMatchRef.id);
      return completedMatchRef.id;

    } catch (error: any) {
      console.error('❌ Error moving match to completed:', error);
      
      // Log specific Firebase error details
      if (error?.code) {
        console.error(`🔍 Firebase Error Code: ${error.code}`);
        console.error(`🔍 Firebase Error Message: ${error.message}`);
        
        // Check if it's a permission error
        if (error.code === 'permission-denied') {
          console.error('🚫 Permission denied - check Firebase security rules for completedmatches collection');
        }
      }
      
      throw error;
    }
  }

  /**
   * Track achievements for both players when a match completes
   */
  private static async trackMatchAchievements(matchData: any, winnerData?: {
    playerId: string;
    playerDisplayName: string;
    finalScore: number;
  }): Promise<void> {
    try {
      console.log('🏆 Tracking achievements for completed match...');
      
      const achievementService = AchievementTrackingService.getInstance();
      
      // Determine players and winner
      const hostData = matchData.hostData;
      const opponentData = matchData.opponentData;
      const winnerId = winnerData?.playerId;
      
      // Check if this was a friend match
      const isFriendMatch = await this.checkIfFriendsMatch(hostData.playerId, opponentData.playerId);
      
      // Create dice rolls array from match data (if available)
      const hostDiceRolls = this.extractDiceRolls(matchData, hostData.playerId);
      const opponentDiceRolls = this.extractDiceRolls(matchData, opponentData.playerId);
      
      // Track game completion for host
      const hostGameData = this.buildEnhancedGameData(
        matchData, 
        hostData.playerId, 
        opponentData.playerId, 
        winnerId === hostData.playerId,
        isFriendMatch,
        hostData.playerScore || 0,
        opponentData.playerScore || 0
      );
      
      await achievementService.recordGameEnd(
        hostData.playerId,
        winnerId === hostData.playerId,
        hostDiceRolls,
        hostGameData
      );
      
      // Track game completion for opponent
      const opponentGameData = this.buildEnhancedGameData(
        matchData, 
        opponentData.playerId, 
        hostData.playerId, 
        winnerId === opponentData.playerId,
        isFriendMatch,
        opponentData.playerScore || 0,
        hostData.playerScore || 0
      );
      
      await achievementService.recordGameEnd(
        opponentData.playerId,
        winnerId === opponentData.playerId,
        opponentDiceRolls,
        opponentGameData
      );
      
      console.log('✅ Achievement tracking completed for both players');
      
    } catch (error) {
      console.error('❌ Error tracking match achievements:', error);
      // Don't throw - achievements failing shouldn't break match completion
    }
  }

  /**
   * Check if two players are friends
   */
  private static async checkIfFriendsMatch(playerId1: string, playerId2: string): Promise<boolean> {
    try {
      // Check if there's a friendship between the players
      const friendQuery = query(
        collection(db, 'friends'),
        where('userId', '==', playerId1),
        where('friendId', '==', playerId2),
        where('status', '==', 'accepted')
      );
      
      const friendSnapshot = await getDocs(friendQuery);
      return !friendSnapshot.empty;
      
    } catch (error) {
      console.error('Error checking friendship status:', error);
      return false;
    }
  }

  /**
   * Extract dice rolls from match data with enhanced pattern detection
   */
  private static extractDiceRolls(matchData: any, playerId: string): number[] {
    const diceRolls: number[] = [];
    
    try {
      // Try multiple sources for dice data
      
      // Option 1: Direct dice history storage
      if (matchData.gameData?.diceHistory) {
        const playerDiceHistory = matchData.gameData.diceHistory[playerId];
        if (playerDiceHistory && Array.isArray(playerDiceHistory)) {
          diceRolls.push(...playerDiceHistory);
        }
      }
      
      // Option 2: Turn-based history with dice
      if (matchData.gameData?.turnHistory) {
        for (const turn of matchData.gameData.turnHistory) {
          if (turn.playerId === playerId && turn.diceRoll) {
            if (Array.isArray(turn.diceRoll)) {
              diceRolls.push(...turn.diceRoll);
            } else {
              diceRolls.push(turn.diceRoll);
            }
          }
        }
      }
      
      // Option 3: Player-specific turn data
      const playerData = matchData.hostData.playerId === playerId ? matchData.hostData : matchData.opponentData;
      if (playerData?.turnData) {
        for (const turn of playerData.turnData) {
          if (turn.diceRoll) {
            if (Array.isArray(turn.diceRoll)) {
              diceRolls.push(...turn.diceRoll);
            } else {
              diceRolls.push(turn.diceRoll);
            }
          }
        }
      }
      
      // Option 4: Match events log
      if (matchData.events) {
        for (const event of matchData.events) {
          if (event.type === 'dice_roll' && event.playerId === playerId && event.value) {
            if (Array.isArray(event.value)) {
              diceRolls.push(...event.value);
            } else {
              diceRolls.push(event.value);
            }
          }
        }
      }
      
      // If we still have no dice data, create realistic estimation
      if (diceRolls.length === 0) {
        const finalScore = playerData?.playerScore || 0;
        
        // More realistic estimation based on game mechanics
        // Assume: average dice roll is 3.5, need multiple rounds
        const estimatedRolls = Math.max(3, Math.min(30, Math.floor(finalScore / 3) + 2));
        
        // Generate more realistic dice pattern instead of random
        for (let i = 0; i < estimatedRolls; i++) {
          // Weight towards middle values (2-5) as more common in actual play
          const weights = [0.1, 0.2, 0.25, 0.25, 0.15, 0.05]; // 1,2,3,4,5,6
          const random = Math.random();
          let cumulative = 0;
          for (let die = 1; die <= 6; die++) {
            cumulative += weights[die - 1];
            if (random <= cumulative) {
              diceRolls.push(die);
              break;
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error extracting dice rolls:', error);
      // Fallback to minimal realistic set
      diceRolls.push(3, 4, 2, 5, 1, 6); // Basic set for pattern detection
    }
    
    return diceRolls;
  }

  /**
   * Auto-complete matches that have been inactive for too long
   */
  static async cleanupInactiveMatches() {
    try {
      console.log('🧹 Checking for inactive matches to cleanup...');

      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

      // Query matches that haven't been updated in 2 hours
      const matchesRef = collection(db, this.MATCHES_COLLECTION);
      const snapshot = await getDocs(matchesRef);

      let cleanedUp = 0;

      for (const matchDoc of snapshot.docs) {
        const matchData = matchDoc.data();
        const lastUpdated = matchData.updatedAt?.toDate() || matchData.startedAt?.toDate();

        if (lastUpdated && lastUpdated < twoHoursAgo) {
          console.log(`⏰ Found inactive match: ${matchDoc.id} (last updated: ${lastUpdated})`);
          
          // Move to completed with "timeout" status
          await this.moveMatchToCompleted(matchDoc.id, {
            playerId: 'system',
            playerDisplayName: 'System Timeout',
            finalScore: -1
          });

          cleanedUp++;
        }
      }

      console.log(`✅ Cleaned up ${cleanedUp} inactive matches`);
      return cleanedUp;

    } catch (error) {
      console.error('❌ Error cleaning up inactive matches:', error);
      throw error;
    }
  }

  /**
   * Build enhanced game data for achievement tracking
   */
  private static buildEnhancedGameData(
    matchData: any,
    playerId: string,
    opponentId: string,
    won: boolean,
    isFriend: boolean,
    playerScore: number,
    opponentScore: number
  ): any {
    const gameData: any = {
      opponentId,
      isFriend,
      gameMode: matchData.gameData?.gameMode || matchData.gameMode || 'classic',
      finalScore: playerScore,
      opponentScore
    };

    // Calculate win margin for victory margin achievements
    if (won) {
      gameData.winMargin = playerScore - opponentScore;
    }

    // Extract final roll information if available
    const playerRolls = this.extractDiceRolls(matchData, playerId);
    if (playerRolls.length > 0) {
      gameData.finalRoll = playerRolls[playerRolls.length - 1];
      
      // Calculate points needed for exact roll achievements
      // This is a simplified calculation - adjust based on your game rules
      const targetScore = matchData.gameData?.targetScore || 100;
      const scoreBeforeFinalRoll = playerScore - gameData.finalRoll;
      gameData.pointsNeeded = targetScore - scoreBeforeFinalRoll;
    }

    return gameData;
  }

  /**
   * Get player's match history from completed matches
   */
  static async getPlayerMatchHistory(playerId: string, limit = 10) {
    try {
      console.log('📊 Fetching match history for player:', playerId);

      // Query completed matches where player was either host or opponent
      const hostQuery = query(
        collection(db, this.COMPLETED_MATCHES_COLLECTION),
        where('hostData.playerId', '==', playerId)
      );

      const opponentQuery = query(
        collection(db, this.COMPLETED_MATCHES_COLLECTION),
        where('opponentData.playerId', '==', playerId)
      );

      const [hostSnapshot, opponentSnapshot] = await Promise.all([
        getDocs(hostQuery),
        getDocs(opponentQuery)
      ]);

      const matches: any[] = [];
      
      // Combine results from both queries
      hostSnapshot.forEach(doc => {
        matches.push({ id: doc.id, ...doc.data(), playerRole: 'host' });
      });

      opponentSnapshot.forEach(doc => {
        matches.push({ id: doc.id, ...doc.data(), playerRole: 'opponent' });
      });

      // Sort by completion date (most recent first) and limit
      matches.sort((a, b) => {
        const dateA = a.completedAt?.toDate() || new Date(0);
        const dateB = b.completedAt?.toDate() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      const limitedMatches = matches.slice(0, limit);
      console.log(`✅ Found ${limitedMatches.length} completed matches for player`);
      
      return limitedMatches;

    } catch (error) {
      console.error('❌ Error fetching player match history:', error);
      throw error;
    }
  }
}
