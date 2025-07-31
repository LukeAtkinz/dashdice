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

      console.log('✅ Match moved to completed collection:', completedMatchRef.id);
      return completedMatchRef.id;

    } catch (error) {
      console.error('❌ Error moving match to completed:', error);
      throw error;
    }
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
