import { collection, query, where, getDocs, deleteDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Aggressive Matchmaking Cleanup Service
 * Removes stale rooms and sessions to prevent matching issues
 * Production-aware with permission error handling
 */
export class MatchmakingCleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly CLEANUP_INTERVAL = 2 * 60 * 1000; // Run every 2 minutes
  private static readonly STALE_THRESHOLD = 3 * 60 * 1000; // 3 minutes for stale rooms
  private static readonly EXPIRED_THRESHOLD = 5 * 60 * 1000; // 5 minutes for expired sessions
  private static isProductionEnvironment = typeof window !== 'undefined' && 
    (window.location.hostname === 'dashdice.gg' || 
     window.location.hostname === 'www.dashdice.gg' || 
     window.location.hostname.includes('vercel.app'));

  /**
   * Start the automatic cleanup service
   */
  static startCleanupService(): void {
    // In production, be more conservative with cleanup
    if (this.isProductionEnvironment) {
      console.log('🧹 MatchmakingCleanupService: Starting conservative cleanup for production...');
    } else {
      console.log('🧹 MatchmakingCleanupService: Starting automatic cleanup...');
    }
    
    // Run initial cleanup immediately (with delay in production)
    if (this.isProductionEnvironment) {
      setTimeout(() => this.runCleanup(), 30000); // 30 second delay in production
    } else {
      this.runCleanup();
    }
    
    // Set up periodic cleanup with longer intervals in production
    const interval = this.isProductionEnvironment ? this.CLEANUP_INTERVAL * 2 : this.CLEANUP_INTERVAL;
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, interval);

    console.log(`✅ MatchmakingCleanupService: Cleanup service started (runs every ${interval / 1000}s)`);
  }

  /**
   * Stop the automatic cleanup service
   */
  static stopCleanupService(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 MatchmakingCleanupService: Cleanup service stopped');
    }
  }

  /**
   * Run a complete cleanup cycle
   */
  private static async runCleanup(): Promise<void> {
    try {
      console.log('🔄 MatchmakingCleanupService: Starting cleanup cycle...');
      
      // In production, run cleanup with error resilience
      const cleanupTasks = [
        this.cleanupWaitingRooms(),
        this.cleanupGameSessions(),
        this.cleanupMatchmakingQueue()
      ];

      const results = await Promise.allSettled(cleanupTasks);

      // Log results with production-aware handling
      let totalCleaned = 0;
      let permissionErrors = 0;
      
      results.forEach((result, index) => {
        const serviceName = ['WaitingRooms', 'GameSessions', 'MatchmakingQueue'][index];
        if (result.status === 'fulfilled') {
          totalCleaned += result.value;
          console.log(`✅ MatchmakingCleanupService: ${serviceName} - cleaned ${result.value} items`);
        } else {
          const error = result.reason;
          if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
            permissionErrors++;
            if (!this.isProductionEnvironment) {
              console.warn(`⚠️ MatchmakingCleanupService: ${serviceName} - permission denied (expected in some environments)`);
            }
          } else {
            console.error(`❌ MatchmakingCleanupService: ${serviceName} - error:`, error);
          }
        }
      });

      if (permissionErrors > 0 && this.isProductionEnvironment) {
        console.log(`🔒 MatchmakingCleanupService: ${permissionErrors} permission-related cleanups skipped (normal in production)`);
      }

      console.log(`🎯 MatchmakingCleanupService: Cleanup cycle complete - ${totalCleaned} total items cleaned`);
    } catch (error) {
      console.error('❌ MatchmakingCleanupService: Error during cleanup cycle:', error);
    }
  }

  /**
   * Clean up stale waiting rooms
   */
  private static async cleanupWaitingRooms(): Promise<number> {
    try {
      const waitingRoomsRef = collection(db, 'waitingroom');
      const snapshot = await getDocs(waitingRoomsRef);
      const now = new Date();
      let cleaned = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate() || new Date(0);
        const age = now.getTime() - createdAt.getTime();

        // Clean up rooms older than threshold
        if (age > this.STALE_THRESHOLD) {
          try {
            await deleteDoc(doc.ref);
            cleaned++;
            console.log(`🧹 Cleaned stale waiting room: ${doc.id} (age: ${Math.round(age / 1000)}s)`);
          } catch (error: any) {
            if (error?.code === 'permission-denied') {
              if (!this.isProductionEnvironment) {
                console.warn(`🔒 Permission denied cleaning waiting room ${doc.id} (expected in some environments)`);
              }
            } else {
              console.error(`Error cleaning waiting room ${doc.id}:`, error);
            }
          }
        }
      }

      return cleaned;
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        if (!this.isProductionEnvironment) {
          console.warn('🔒 Permission denied accessing waiting rooms (expected in some environments)');
        }
        return 0;
      }
      console.error('Error cleaning waiting rooms:', error);
      throw error;
    }
  }

  /**
   * Clean up expired game sessions
   */
  private static async cleanupGameSessions(): Promise<number> {
    try {
      const gameSessionsRef = collection(db, 'gameSessions');
      const staleQuery = query(
        gameSessionsRef,
        where('status', 'in', ['waiting', 'creating'])
      );
      
      const snapshot = await getDocs(staleQuery);
      const now = new Date();
      let cleaned = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate() || new Date(0);
        const age = now.getTime() - createdAt.getTime();

        // Clean up sessions older than threshold
        if (age > this.EXPIRED_THRESHOLD) {
          try {
            await deleteDoc(doc.ref);
            cleaned++;
            console.log(`🧹 Cleaned expired game session: ${doc.id} (age: ${Math.round(age / 1000)}s)`);
          } catch (error: any) {
            if (error?.code === 'permission-denied') {
              if (!this.isProductionEnvironment) {
                console.warn(`🔒 Permission denied cleaning game session ${doc.id} (expected in some environments)`);
              }
            } else {
              console.error(`Error cleaning game session ${doc.id}:`, error);
            }
          }
        }
      }

      return cleaned;
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        if (!this.isProductionEnvironment) {
          console.warn('🔒 Permission denied accessing game sessions (expected in some environments)');
        }
        return 0;
      }
      console.error('Error cleaning game sessions:', error);
      throw error;
    }
  }

  /**
   * Clean up matchmaking queue entries
   */
  private static async cleanupMatchmakingQueue(): Promise<number> {
    try {
      const queueRef = collection(db, 'matchmakingQueue');
      const snapshot = await getDocs(queueRef);
      const now = new Date();
      let cleaned = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate() || new Date(0);
        const age = now.getTime() - createdAt.getTime();

        // Clean up queue entries older than threshold
        if (age > this.STALE_THRESHOLD) {
          try {
            await deleteDoc(doc.ref);
            cleaned++;
            console.log(`🧹 Cleaned stale queue entry: ${doc.id} (age: ${Math.round(age / 1000)}s)`);
          } catch (error: any) {
            if (error?.code === 'permission-denied') {
              if (!this.isProductionEnvironment) {
                console.warn(`🔒 Permission denied cleaning queue entry ${doc.id} (expected in some environments)`);
              }
            } else {
              console.error(`Error cleaning queue entry ${doc.id}:`, error);
            }
          }
        }
      }

      return cleaned;
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        if (!this.isProductionEnvironment) {
          console.warn('🔒 Permission denied accessing matchmaking queue (expected in some environments)');
        }
        return 0;
      }
      console.error('Error cleaning matchmaking queue:', error);
      throw error;
    }
  }

  /**
   * Manual cleanup - can be called from external scripts
   */
  static async runManualCleanup(): Promise<void> {
    console.log('🔧 MatchmakingCleanupService: Running manual cleanup...');
    await this.runCleanup();
  }
}
