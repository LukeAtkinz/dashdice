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
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

export interface AbandonedMatch {
  originalMatchId: string;
  gameMode: string;
  gameType?: string;
  players: any[];
  abandonedAt: Date;
  reason: 'timeout' | 'inactivity' | 'conflict_resolution' | 'player_disconnect' | 'system_cleanup' | 'new_match_created';
  originalData: any;
  duration: number;
}

/**
 * Comprehensive Match Lifecycle Management Service
 * Handles match creation, conflict resolution, and automatic cleanup
 */
export class MatchLifecycleService {
  private static readonly MATCH_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly CLEANUP_INTERVAL_MS = 2 * 60 * 1000; // Check every 2 minutes
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static isCleanupRunning = false;

  /**
   * Initialize the match lifecycle service
   */
  static initialize(): void {
    console.log('🔄 Initializing Match Lifecycle Service...');
    
    // Start automatic cleanup
    this.startCleanupScheduler();
    
    console.log('✅ Match Lifecycle Service initialized');
  }

  /**
   * Clean up existing matches for a user before creating a new one
   * This prevents match conflicts and ensures clean state
   */
  static async cleanupUserMatches(userId: string, reason: string = 'new_match_created'): Promise<number> {
    console.log(`🧹 Cleaning up existing matches for user: ${userId}`);
    
    let cleanedCount = 0;
    const collections = ['matches', 'waitingroom', 'gameSessions'];
    
    try {
      for (const collectionName of collections) {
        const userMatches = await this.findUserMatches(userId, collectionName);
        
        for (const matchDoc of userMatches) {
          await this.abandonMatch(matchDoc.id, reason as AbandonedMatch['reason'], collectionName);
          cleanedCount++;
          console.log(`🗑️ Moved ${collectionName}/${matchDoc.id} to abandoned matches`);
        }
      }
      
      console.log(`✅ Cleaned up ${cleanedCount} existing matches for user ${userId}`);
      return cleanedCount;
      
    } catch (error) {
      console.error('❌ Error cleaning up user matches:', error);
      return cleanedCount;
    }
  }

  /**
   * Find all matches for a specific user in a collection
   */
  private static async findUserMatches(userId: string, collectionName: string) {
    const matches: any[] = [];
    
    try {
      // Check as host
      const hostQuery = query(
        collection(db, collectionName),
        where('hostData.playerId', '==', userId)
      );
      const hostSnapshot = await getDocs(hostQuery);
      matches.push(...hostSnapshot.docs);

      // Check as opponent
      const opponentQuery = query(
        collection(db, collectionName),
        where('opponentData.playerId', '==', userId)
      );
      const opponentSnapshot = await getDocs(opponentQuery);
      matches.push(...opponentSnapshot.docs);

      // Check in players array (for newer match format)
      try {
        const playersQuery = query(
          collection(db, collectionName),
          where('players', 'array-contains-any', [userId])
        );
        const playersSnapshot = await getDocs(playersQuery);
        matches.push(...playersSnapshot.docs);
      } catch (error) {
        // Players field might not exist in all documents, ignore error
      }

    } catch (error) {
      console.error(`Error finding user matches in ${collectionName}:`, error);
    }
    
    // Remove duplicates based on document ID
    const uniqueMatches = matches.filter((match, index, self) => 
      self.findIndex(m => m.id === match.id) === index
    );
    
    return uniqueMatches;
  }

  /**
   * Move a match to abandoned matches collection
   */
  static async abandonMatch(
    matchId: string, 
    reason: AbandonedMatch['reason'], 
    collectionName: string = 'matches'
  ): Promise<void> {
    try {
      console.log(`🗑️ Abandoning ${collectionName}/${matchId} due to ${reason}`);

      // Get the original match data
      const matchRef = doc(db, collectionName, matchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) {
        console.log(`Match ${matchId} not found in ${collectionName}`);
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

      console.log(`✅ Successfully abandoned ${collectionName}/${matchId}`);

    } catch (error) {
      console.error(`❌ Error abandoning match ${matchId}:`, error);
      // Don't throw to prevent breaking batch operations
    }
  }

  /**
   * Clean up stagnant matches across all collections
   */
  static async cleanupStagnantMatches(): Promise<{ cleaned: number; errors: string[] }> {
    if (this.isCleanupRunning) {
      console.log('⏸️ Cleanup already running, skipping');
      return { cleaned: 0, errors: [] };
    }

    this.isCleanupRunning = true;
    console.log('🧹 Starting stagnant match cleanup...');

    const results = { cleaned: 0, errors: [] as string[] };
    const collections = ['matches', 'waitingroom', 'gameSessions'];
    const cutoffTime = new Date(Date.now() - this.MATCH_TIMEOUT_MS);

    try {
      for (const collectionName of collections) {
        try {
          const cleaned = await this.cleanupCollectionMatches(collectionName, cutoffTime);
          results.cleaned += cleaned;
        } catch (error) {
          const errorMsg = `Failed to clean ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`✅ Cleanup complete. Cleaned ${results.cleaned} stagnant matches`);

    } catch (error) {
      const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error('❌', errorMsg);
    } finally {
      this.isCleanupRunning = false;
    }

    return results;
  }

  /**
   * Clean up matches in a specific collection
   */
  private static async cleanupCollectionMatches(collectionName: string, cutoffTime: Date): Promise<number> {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      let cleanedCount = 0;
      const abandonPromises: Promise<void>[] = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const createdAt = data.createdAt?.toDate() || new Date(0);
        const lastActivity = data.lastActivity?.toDate() || data.updatedAt?.toDate() || createdAt;

        // Check if match should be abandoned
        if (createdAt < cutoffTime || lastActivity < cutoffTime) {
          const reason: AbandonedMatch['reason'] = createdAt < cutoffTime ? 'timeout' : 'inactivity';
          abandonPromises.push(this.abandonMatch(docSnapshot.id, reason, collectionName));
          cleanedCount++;
        }
      }

      // Wait for all abandonment operations to complete
      await Promise.all(abandonPromises);
      
      if (cleanedCount > 0) {
        console.log(`✅ Cleaned up ${cleanedCount} matches from ${collectionName}`);
      }

      return cleanedCount;

    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        console.warn(`⚠️ Permission denied cleaning up ${collectionName} - skipping`);
        return 0;
      }
      throw error;
    }
  }

  /**
   * Start automatic cleanup scheduler
   */
  private static startCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      await this.cleanupStagnantMatches();
    }, this.CLEANUP_INTERVAL_MS);

    console.log(`🔄 Cleanup scheduler started (runs every ${this.CLEANUP_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Stop automatic cleanup scheduler
   */
  static stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('⏹️ Cleanup scheduler stopped');
    }
  }

  /**
   * Get statistics about abandoned matches
   */
  static async getAbandonedMatchStats(hours: number = 24): Promise<{
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
      console.error('Error getting abandoned match stats:', error);
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
  static async forceCleanup(): Promise<{ cleaned: number; errors: string[] }> {
    console.log('🧹 Starting manual force cleanup...');
    return await this.cleanupStagnantMatches();
  }
}