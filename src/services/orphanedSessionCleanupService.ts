import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

export interface OrphanedSessionStats {
  total: number;
  byStatus: Record<string, number>;
  byGameMode: Record<string, number>;
  byDisconnectionType: Record<string, number>;
  averageAge: number;
}

export interface PlayerDisconnectionInfo {
  playerId: string;
  lastSeen: Date | null;
  isOnline: boolean;
  heartbeatAge: number;
  disconnectionDuration: number;
}

/**
 * Orphaned Session Cleanup Service
 * Handles sessions where all players have disconnected or left without proper cleanup
 * Focuses on sessions that are "stuck" in the database with no active players
 */
export class OrphanedSessionCleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly CLEANUP_INTERVAL = 3 * 60 * 1000; // Run every 3 minutes
  private static readonly PLAYER_OFFLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes offline = disconnected
  private static readonly SESSION_ORPHAN_THRESHOLD = 10 * 60 * 1000; // 10 minutes with all players offline = orphaned
  private static readonly HEARTBEAT_STALE_THRESHOLD = 3 * 60 * 1000; // 3 minutes without heartbeat = stale

  /**
   * Start the orphaned session cleanup service
   */
  static startCleanupService(): void {
    if (this.cleanupInterval) {
      console.log('🧹 OrphanedSessionCleanupService: Service already running');
      return;
    }

    console.log('🚀 OrphanedSessionCleanupService: Starting orphaned session cleanup...');
    
    // Run initial cleanup
    this.runOrphanedSessionCleanup().catch(error => {
      console.error('❌ Error in initial orphaned session cleanup:', error);
    });
    
    // Schedule recurring cleanup
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.runOrphanedSessionCleanup();
      } catch (error) {
        console.error('❌ Error in scheduled orphaned session cleanup:', error);
      }
    }, this.CLEANUP_INTERVAL);

    console.log(`✅ OrphanedSessionCleanupService: Service started (runs every ${this.CLEANUP_INTERVAL / 1000}s)`);
  }

  /**
   * Stop the orphaned session cleanup service
   */
  static stopCleanupService(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 OrphanedSessionCleanupService: Service stopped');
    }
  }

  /**
   * Main cleanup runner - identifies and cleans orphaned sessions
   */
  private static async runOrphanedSessionCleanup(): Promise<void> {
    try {
      console.log('🔍 OrphanedSessionCleanupService: Scanning for orphaned sessions...');

      const cleanupResults = await Promise.allSettled([
        this.cleanupOrphanedWaitingSessions(),
        this.cleanupOrphanedMatchedSessions(),
        this.cleanupOrphanedActiveSessions(),
        this.cleanupAbandonedHeartbeats(),
        this.cleanupStaleWaitingRooms()
      ]);

      let totalCleaned = 0;
      const errors: string[] = [];

      cleanupResults.forEach((result, index) => {
        const operationNames = [
          'Waiting Sessions',
          'Matched Sessions', 
          'Active Sessions',
          'Abandoned Heartbeats',
          'Stale Waiting Rooms'
        ];
        
        if (result.status === 'fulfilled') {
          totalCleaned += result.value;
          if (result.value > 0) {
            console.log(`✅ ${operationNames[index]}: cleaned ${result.value} items`);
          }
        } else {
          const error = `${operationNames[index]} failed: ${result.reason?.message || 'Unknown error'}`;
          errors.push(error);
          console.error(`❌ ${error}`);
        }
      });

      if (totalCleaned > 0) {
        console.log(`🧹 OrphanedSessionCleanupService: Total cleaned ${totalCleaned} orphaned items`);
      }

      if (errors.length > 0) {
        console.warn(`⚠️ OrphanedSessionCleanupService: ${errors.length} cleanup operations failed`);
      }

    } catch (error) {
      console.error('❌ OrphanedSessionCleanupService: Critical error during cleanup:', error);
    }
  }

  /**
   * Clean up waiting sessions where all players have disconnected
   */
  private static async cleanupOrphanedWaitingSessions(): Promise<number> {
    try {
      const waitingSessionsQuery = query(
        collection(db, 'gameSessions'),
        where('status', '==', 'waiting')
      );

      const snapshot = await getDocs(waitingSessionsQuery);
      let cleanedCount = 0;

      for (const sessionDoc of snapshot.docs) {
        const sessionData = sessionDoc.data();
        const sessionId = sessionDoc.id;

        // Check if session is actually orphaned
        const isOrphaned = await this.isSessionOrphaned(sessionData);
        
        if (isOrphaned.isOrphaned) {
          console.log(`🗑️ Cleaning orphaned waiting session: ${sessionId}`, {
            reason: isOrphaned.reason,
            playersDisconnected: isOrphaned.disconnectedPlayers.length,
            sessionAge: isOrphaned.sessionAge
          });

          await this.cleanupOrphanedSession(sessionId, sessionData, 'waiting_orphaned');
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning orphaned waiting sessions:', error);
      return 0;
    }
  }

  /**
   * Clean up matched sessions where players never started the game
   */
  private static async cleanupOrphanedMatchedSessions(): Promise<number> {
    try {
      const matchedSessionsQuery = query(
        collection(db, 'gameSessions'),
        where('status', '==', 'matched')
      );

      const snapshot = await getDocs(matchedSessionsQuery);
      let cleanedCount = 0;

      for (const sessionDoc of snapshot.docs) {
        const sessionData = sessionDoc.data();
        const sessionId = sessionDoc.id;

        // Check if session is orphaned (matched but no activity)
        const isOrphaned = await this.isSessionOrphaned(sessionData);
        
        // Additional check for matched sessions: how long have they been matched?
        const matchedAt = sessionData.matchedAt?.toDate() || sessionData.createdAt?.toDate();
        const matchedAge = matchedAt ? Date.now() - matchedAt.getTime() : 0;
        const matchedTooLong = matchedAge > (15 * 60 * 1000); // 15 minutes matched without starting

        if (isOrphaned.isOrphaned || matchedTooLong) {
          console.log(`🗑️ Cleaning orphaned matched session: ${sessionId}`, {
            reason: isOrphaned.isOrphaned ? isOrphaned.reason : 'matched_too_long',
            playersDisconnected: isOrphaned.disconnectedPlayers.length,
            matchedAge: Math.round(matchedAge / 1000) + 's'
          });

          await this.cleanupOrphanedSession(sessionId, sessionData, 'matched_orphaned');
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning orphaned matched sessions:', error);
      return 0;
    }
  }

  /**
   * Clean up active sessions where all players have disconnected for extended periods
   */
  private static async cleanupOrphanedActiveSessions(): Promise<number> {
    try {
      const activeSessionsQuery = query(
        collection(db, 'gameSessions'),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(activeSessionsQuery);
      let cleanedCount = 0;

      for (const sessionDoc of snapshot.docs) {
        const sessionData = sessionDoc.data();
        const sessionId = sessionDoc.id;

        // Check if all players have been disconnected for a long time
        const isOrphaned = await this.isSessionOrphaned(sessionData);
        const lastActivity = sessionData.lastActivityAt?.toDate() || sessionData.updatedAt?.toDate();
        const inactivityAge = lastActivity ? Date.now() - lastActivity.getTime() : 0;
        const longInactive = inactivityAge > (30 * 60 * 1000); // 30 minutes without activity

        if (isOrphaned.isOrphaned && longInactive) {
          console.log(`🗑️ Cleaning orphaned active session: ${sessionId}`, {
            reason: 'all_players_disconnected_long_inactive',
            playersDisconnected: isOrphaned.disconnectedPlayers.length,
            inactivityAge: Math.round(inactivityAge / 1000) + 's'
          });

          // Mark as abandoned instead of deleting (preserve for stats)
          await this.markSessionAbandoned(sessionId, 'All players disconnected for extended period');
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning orphaned active sessions:', error);
      return 0;
    }
  }

  /**
   * Clean up abandoned heartbeat entries
   */
  private static async cleanupAbandonedHeartbeats(): Promise<number> {
    try {
      // Clean up heartbeat records for non-existent sessions
      const heartbeatsRef = collection(db, 'playerHeartbeats');
      const heartbeatsSnapshot = await getDocs(heartbeatsRef);
      let cleanedCount = 0;

      for (const heartbeatDoc of heartbeatsSnapshot.docs) {
        const heartbeatData = heartbeatDoc.data();
        const lastHeartbeat = heartbeatData.lastHeartbeat?.toDate();
        const heartbeatAge = lastHeartbeat ? Date.now() - lastHeartbeat.getTime() : Date.now();

        // Clean up very stale heartbeats
        if (heartbeatAge > this.HEARTBEAT_STALE_THRESHOLD) {
          await deleteDoc(heartbeatDoc.ref);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning abandoned heartbeats:', error);
      return 0;
    }
  }

  /**
   * Clean up stale waiting room entries
   */
  private static async cleanupStaleWaitingRooms(): Promise<number> {
    try {
      const waitingRoomsRef = collection(db, 'waitingroom');
      const waitingRoomsSnapshot = await getDocs(waitingRoomsRef);
      let cleanedCount = 0;

      for (const roomDoc of waitingRoomsSnapshot.docs) {
        const roomData = roomDoc.data();
        
        // Check if corresponding session exists
        if (roomData.sessionId) {
          const sessionExists = await this.checkSessionExists(roomData.sessionId);
          if (!sessionExists) {
            console.log(`🗑️ Cleaning stale waiting room: ${roomDoc.id} (session ${roomData.sessionId} not found)`);
            await deleteDoc(roomDoc.ref);
            cleanedCount++;
          }
        } else {
          // Old waiting room without session reference
          const createdAt = roomData.createdAt?.toDate();
          const age = createdAt ? Date.now() - createdAt.getTime() : Date.now();
          
          if (age > this.SESSION_ORPHAN_THRESHOLD) {
            console.log(`🗑️ Cleaning old waiting room: ${roomDoc.id} (age: ${Math.round(age / 1000)}s)`);
            await deleteDoc(roomDoc.ref);
            cleanedCount++;
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning stale waiting rooms:', error);
      return 0;
    }
  }

  /**
   * Check if a session is orphaned (all players disconnected)
   */
  private static async isSessionOrphaned(sessionData: any): Promise<{
    isOrphaned: boolean;
    reason: string;
    disconnectedPlayers: PlayerDisconnectionInfo[];
    sessionAge: number;
  }> {
    try {
      const participants = sessionData.participants || [];
      const createdAt = sessionData.createdAt?.toDate();
      const sessionAge = createdAt ? Date.now() - createdAt.getTime() : 0;

      if (participants.length === 0) {
        return {
          isOrphaned: true,
          reason: 'no_participants',
          disconnectedPlayers: [],
          sessionAge
        };
      }

      const disconnectedPlayers: PlayerDisconnectionInfo[] = [];

      for (const participant of participants) {
        const playerInfo = await this.checkPlayerDisconnection(participant.playerId);
        
        if (playerInfo.disconnectionDuration > this.PLAYER_OFFLINE_THRESHOLD) {
          disconnectedPlayers.push(playerInfo);
        }
      }

      // Session is orphaned if ALL players are disconnected for too long
      const isOrphaned = disconnectedPlayers.length === participants.length && 
                        disconnectedPlayers.length > 0 &&
                        sessionAge > this.SESSION_ORPHAN_THRESHOLD;

      return {
        isOrphaned,
        reason: isOrphaned ? 'all_players_disconnected' : 'has_active_players',
        disconnectedPlayers,
        sessionAge
      };

    } catch (error) {
      console.error('❌ Error checking if session is orphaned:', error);
      return {
        isOrphaned: false,
        reason: 'check_failed',
        disconnectedPlayers: [],
        sessionAge: 0
      };
    }
  }

  /**
   * Check individual player disconnection status
   */
  private static async checkPlayerDisconnection(playerId: string): Promise<PlayerDisconnectionInfo> {
    try {
      // Check user document for online status and last seen
      const userDoc = await getDoc(doc(db, 'users', playerId));
      let lastSeen: Date | null = null;
      let isOnline = false;

      if (userDoc.exists()) {
        const userData = userDoc.data();
        lastSeen = userData.lastSeen?.toDate() || null;
        isOnline = userData.isOnline === true;
      }

      // Check heartbeat collection
      const heartbeatDoc = await getDoc(doc(db, 'playerHeartbeats', playerId));
      let heartbeatAge = Date.now(); // Assume very old if no heartbeat

      if (heartbeatDoc.exists()) {
        const heartbeatData = heartbeatDoc.data();
        const lastHeartbeat = heartbeatData.lastHeartbeat?.toDate();
        heartbeatAge = lastHeartbeat ? Date.now() - lastHeartbeat.getTime() : Date.now();
      }

      const disconnectionDuration = lastSeen ? Date.now() - lastSeen.getTime() : Date.now();

      return {
        playerId,
        lastSeen,
        isOnline,
        heartbeatAge,
        disconnectionDuration
      };

    } catch (error) {
      console.error(`❌ Error checking player ${playerId} disconnection:`, error);
      return {
        playerId,
        lastSeen: null,
        isOnline: false,
        heartbeatAge: Date.now(),
        disconnectionDuration: Date.now()
      };
    }
  }

  /**
   * Clean up an orphaned session with proper state tracking
   */
  private static async cleanupOrphanedSession(sessionId: string, sessionData: any, reason: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, 'gameSessions', sessionId);
        
        // Update session to abandoned state instead of deleting
        transaction.update(sessionRef, {
          status: 'abandoned',
          gameEndReason: `Orphaned session cleanup: ${reason}`,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          cleanupReason: reason,
          cleanupTimestamp: serverTimestamp(),
          // Set short expiry for final cleanup
          expiresAt: Timestamp.fromDate(new Date(Date.now() + (24 * 60 * 60 * 1000))) // 24 hours
        });

        // Clean up player states
        const participants = sessionData.participants || [];
        for (const participant of participants) {
          try {
            // Clear player's current session references
            const userRef = doc(db, 'users', participant.playerId);
            transaction.update(userRef, {
              currentRoom: null,
              currentGame: null,
              lastCleanup: serverTimestamp()
            });
          } catch (playerError) {
            console.warn(`⚠️ Failed to cleanup player state for ${participant.playerId}:`, playerError);
          }
        }
      });

      console.log(`✅ Cleaned up orphaned session ${sessionId} (reason: ${reason})`);

    } catch (error) {
      console.error(`❌ Error cleaning up orphaned session ${sessionId}:`, error);
    }
  }

  /**
   * Mark session as abandoned (for active sessions)
   */
  private static async markSessionAbandoned(sessionId: string, reason: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'gameSessions', sessionId), {
        status: 'abandoned',
        gameEndReason: reason,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        abandonmentReason: reason,
        abandonmentTimestamp: serverTimestamp()
      });

      console.log(`🔄 Marked session ${sessionId} as abandoned: ${reason}`);
    } catch (error) {
      console.error(`❌ Error marking session ${sessionId} as abandoned:`, error);
    }
  }

  /**
   * Check if a session exists
   */
  private static async checkSessionExists(sessionId: string): Promise<boolean> {
    try {
      const sessionDoc = await getDoc(doc(db, 'gameSessions', sessionId));
      return sessionDoc.exists();
    } catch (error) {
      console.error(`❌ Error checking session existence ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get orphaned session statistics
   */
  static async getOrphanedSessionStats(hours: number = 24): Promise<OrphanedSessionStats> {
    try {
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      const abandonedQuery = query(
        collection(db, 'gameSessions'),
        where('status', '==', 'abandoned'),
        where('completedAt', '>=', Timestamp.fromDate(cutoffTime))
      );

      const snapshot = await getDocs(abandonedQuery);
      
      const stats: OrphanedSessionStats = {
        total: snapshot.size,
        byStatus: {},
        byGameMode: {},
        byDisconnectionType: {},
        averageAge: 0
      };

      let totalAge = 0;
      let ageCount = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Count by original status
        const originalStatus = data.status || 'unknown';
        stats.byStatus[originalStatus] = (stats.byStatus[originalStatus] || 0) + 1;
        
        // Count by game mode
        const gameMode = data.gameMode || 'unknown';
        stats.byGameMode[gameMode] = (stats.byGameMode[gameMode] || 0) + 1;
        
        // Count by cleanup/abandonment reason
        const reason = data.cleanupReason || data.abandonmentReason || data.gameEndReason || 'unknown';
        stats.byDisconnectionType[reason] = (stats.byDisconnectionType[reason] || 0) + 1;
        
        // Calculate average age
        const createdAt = data.createdAt?.toDate();
        const abandonedAt = data.completedAt?.toDate();
        if (createdAt && abandonedAt) {
          const age = abandonedAt.getTime() - createdAt.getTime();
          totalAge += age;
          ageCount++;
        }
      });

      if (ageCount > 0) {
        stats.averageAge = Math.round(totalAge / ageCount);
      }

      return stats;

    } catch (error) {
      console.error('❌ Error getting orphaned session stats:', error);
      return {
        total: 0,
        byStatus: {},
        byGameMode: {},
        byDisconnectionType: {},
        averageAge: 0
      };
    }
  }

  /**
   * Manual cleanup trigger (for admin use)
   */
  static async runManualCleanup(): Promise<{
    cleaned: number;
    errors: string[];
    stats: OrphanedSessionStats;
  }> {
    try {
      console.log('🧹 OrphanedSessionCleanupService: Starting manual cleanup...');

      await this.runOrphanedSessionCleanup();
      
      // Get statistics
      const stats = await this.getOrphanedSessionStats(24);

      console.log('✅ OrphanedSessionCleanupService: Manual cleanup completed');
      
      return {
        cleaned: stats.total,
        errors: [],
        stats
      };

    } catch (error) {
      console.error('❌ Error during manual orphaned session cleanup:', error);
      return {
        cleaned: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        stats: {
          total: 0,
          byStatus: {},
          byGameMode: {},
          byDisconnectionType: {},
          averageAge: 0
        }
      };
    }
  }
}
