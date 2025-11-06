import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface AbandonedMatch {
  originalMatchId: string;
  gameMode: string;
  gameType: string;
  players: any[];
  abandonedAt: Date;
  reason: 'player_disconnect' | 'timeout' | 'inactivity' | 'system_cleanup';
  originalData: any;
  duration?: number; // How long the match was active before abandonment
}

export class AbandonedMatchService {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static inactivityThreshold = 300000; // 5 minutes
  private static timeoutThreshold = 600000; // 10 minutes max match duration (was 30 minutes)

  /**
   * Initialize abandoned match cleanup service
   */
  static initializeCleanupService(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup every 1 minute (was 2 minutes) - more aggressive to prevent stagnant matches
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupInactiveMatches();
    }, 60000);

    console.log('🗑️ Abandoned match cleanup service initialized');
  }

  /**
   * Move a match to abandoned matches collection
   */
  static async abandonMatch(
    matchId: string, 
    reason: AbandonedMatch['reason'], 
    collection_name: string = 'waitingroom'
  ): Promise<void> {
    try {
      console.log(`🗑️ Abandoning match ${matchId} due to ${reason}`);

      // Get the original match data
      const matchRef = doc(db, collection_name, matchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) {
        console.log(`Match ${matchId} not found in ${collection_name}`);
        return;
      }

      const matchData = matchDoc.data();
      const createdAt = matchData.createdAt?.toDate() || new Date();
      const duration = Date.now() - createdAt.getTime();

      // Check if this is a match against a BOT player
      const hostIsBot = matchData.hostData?.playerId?.includes('bot') || false;
      const opponentIsBot = matchData.opponentData?.playerId?.includes('bot') || false;
      const hasBot = hostIsBot || opponentIsBot;

      console.log(`🤖 Bot detection:`, {
        matchId,
        hostId: matchData.hostData?.playerId,
        hostIsBot,
        opponentId: matchData.opponentData?.playerId,
        opponentIsBot,
        hasBot
      });

      // If the match is against a BOT, apply loss penalty to the human player
      if (hasBot) {
        const humanPlayerId = hostIsBot 
          ? matchData.opponentData?.playerId 
          : matchData.hostData?.playerId;

        if (humanPlayerId && !humanPlayerId.includes('bot')) {
          console.log(`💔 Applying abandonment loss penalty to ${humanPlayerId} for leaving BOT match`);
          
          try {
            // Import UserService dynamically to avoid circular dependencies
            const { UserService } = await import('./userService');
            await UserService.updateMatchLoss(humanPlayerId);
            console.log(`✅ Successfully applied loss penalty for abandoning BOT match`);
          } catch (lossError) {
            console.error(`❌ Error applying loss penalty:`, lossError);
          }
        }
      }

      // Create abandoned match record
      const abandonedMatchData: AbandonedMatch = {
        originalMatchId: matchId,
        gameMode: matchData.gameMode || 'unknown',
        gameType: matchData.gameType || 'unknown',
        players: matchData.players || [],
        abandonedAt: new Date(),
        reason,
        originalData: matchData,
        duration
      };

      // Add to abandoned matches collection
      await addDoc(collection(db, 'abandonedMatches'), {
        ...abandonedMatchData,
        abandonedAt: serverTimestamp()
      });

      // Remove from original collection
      await deleteDoc(matchRef);

      // Clean up player references
      if (matchData.players && Array.isArray(matchData.players)) {
        const batch = writeBatch(db);
        
        for (const player of matchData.players) {
          if (player.playerId) {
            const userRef = doc(db, 'users', player.playerId);
            batch.update(userRef, {
              currentRoom: null,
              currentGame: null
            });
          }
        }

        await batch.commit();
      }

      console.log(`✅ Match ${matchId} moved to abandoned matches`);

    } catch (error: any) {
      // Handle permission errors more gracefully
      if (error?.code === 'permission-denied') {
        console.warn(`⚠️ Permission denied abandoning match ${matchId} - insufficient permissions`);
        return; // Don't throw, just log and continue
      }
      console.error(`Error abandoning match ${matchId}:`, error);
      // Don't throw error to prevent breaking the cleanup batch
    }
  }

  /**
   * Check for inactive matches and clean them up
   */
  static async cleanupInactiveMatches(): Promise<void> {
    try {
      // Only clean up collections that actually exist and are used
      const collections_to_check = ['waitingroom', 'gameSessions'];
      let totalCleaned = 0;

      for (const collection_name of collections_to_check) {
        const cleaned = await this.cleanupCollectionMatches(collection_name);
        totalCleaned += cleaned;
      }

      if (totalCleaned > 0) {
        console.log(`🧹 Cleaned up ${totalCleaned} inactive matches`);
      }

    } catch (error) {
      console.error('Error during inactive match cleanup:', error);
    }
  }

  /**
   * Clean up matches in a specific collection
   */
  private static async cleanupCollectionMatches(collection_name: string): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - this.inactivityThreshold);
      const timeoutCutoff = new Date(Date.now() - this.timeoutThreshold);

      // Query for old matches
      const q = query(collection(db, collection_name));
      const querySnapshot = await getDocs(q);
      
      let cleanedCount = 0;
      const batch = writeBatch(db);
      const abandonPromises: Promise<void>[] = [];

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const createdAt = data.createdAt?.toDate() || new Date(0);
        const lastActivity = data.lastActivity?.toDate() || data.updatedAt?.toDate() || createdAt;

        let shouldAbandon = false;
        let reason: AbandonedMatch['reason'] = 'system_cleanup';

        // Check for timeout (very old matches)
        if (createdAt < timeoutCutoff) {
          shouldAbandon = true;
          reason = 'timeout';
        }
        // Check for inactivity
        else if (lastActivity < cutoffTime) {
          shouldAbandon = true;
          reason = 'inactivity';
        }
        // Check for player disconnections
        else if (data.players && Array.isArray(data.players)) {
          const disconnectedPlayers = await this.checkPlayersOnlineStatus(data.players);
          if (disconnectedPlayers > 0 && disconnectedPlayers === data.players.length) {
            shouldAbandon = true;
            reason = 'player_disconnect';
          }
        }

        if (shouldAbandon) {
          abandonPromises.push(this.abandonMatch(docSnapshot.id, reason, collection_name));
          cleanedCount++;
        }
      }

      // Wait for all abandonment operations to complete
      await Promise.all(abandonPromises);

      return cleanedCount;

    } catch (error: any) {
      // Handle permission errors more gracefully
      if (error?.code === 'permission-denied') {
        console.warn(`⚠️ Permission denied cleaning up ${collection_name} - skipping collection`);
        return 0;
      }
      console.error(`Error cleaning up ${collection_name}:`, error);
      return 0;
    }
  }

  /**
   * Check how many players in a match are offline
   */
  private static async checkPlayersOnlineStatus(players: any[]): Promise<number> {
    try {
      let offlineCount = 0;

      for (const player of players) {
        if (player.playerId) {
          const userRef = doc(db, 'users', player.playerId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const lastSeen = userData.lastSeen?.toDate() || new Date(0);
            const isOnline = userData.isOnline === true;
            const timeSinceLastSeen = Date.now() - lastSeen.getTime();
            
            // Consider offline if not marked online or haven't been seen in 5 minutes
            if (!isOnline || timeSinceLastSeen > 300000) {
              offlineCount++;
            }
          } else {
            offlineCount++; // User doesn't exist = offline
          }
        }
      }

      return offlineCount;

    } catch (error) {
      console.error('Error checking players online status:', error);
      return 0;
    }
  }

  /**
   * Get abandoned matches for analytics
   */
  static async getAbandonedMatchesStats(hours: number = 24): Promise<{
    total: number;
    byReason: Record<string, number>;
    byGameMode: Record<string, number>;
    averageDuration: number;
  }> {
    try {
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      const q = query(
        collection(db, 'abandonedMatches'),
        where('abandonedAt', '>=', Timestamp.fromDate(cutoffTime))
      );

      const querySnapshot = await getDocs(q);
      
      const stats = {
        total: querySnapshot.size,
        byReason: {} as Record<string, number>,
        byGameMode: {} as Record<string, number>,
        averageDuration: 0
      };

      let totalDuration = 0;
      let durationCount = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Count by reason
        const reason = data.reason || 'unknown';
        stats.byReason[reason] = (stats.byReason[reason] || 0) + 1;
        
        // Count by game mode
        const gameMode = data.gameMode || 'unknown';
        stats.byGameMode[gameMode] = (stats.byGameMode[gameMode] || 0) + 1;
        
        // Calculate average duration
        if (data.duration && typeof data.duration === 'number') {
          totalDuration += data.duration;
          durationCount++;
        }
      });

      if (durationCount > 0) {
        stats.averageDuration = Math.round(totalDuration / durationCount);
      }

      return stats;

    } catch (error) {
      console.error('Error getting abandoned matches stats:', error);
      return {
        total: 0,
        byReason: {},
        byGameMode: {},
        averageDuration: 0
      };
    }
  }

  /**
   * Manual cleanup trigger (for admin use)
   */
  static async forceCleanup(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    try {
      console.log('🧹 Starting manual cleanup of inactive matches...');
      
      // Only clean up collections that actually exist and are used
      const collections_to_check = ['waitingroom', 'gameSessions'];
      let totalCleaned = 0;
      const errors: string[] = [];

      for (const collection_name of collections_to_check) {
        try {
          const cleaned = await this.cleanupCollectionMatches(collection_name);
          totalCleaned += cleaned;
        } catch (error) {
          const errorMsg = `Failed to clean ${collection_name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`✅ Manual cleanup complete. Cleaned ${totalCleaned} matches.`);
      
      return {
        cleaned: totalCleaned,
        errors
      };

    } catch (error) {
      console.error('Error during manual cleanup:', error);
      return {
        cleaned: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Stop the cleanup service
   */
  static stopCleanupService(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🗑️ Abandoned match cleanup service stopped');
    }
  }
}
