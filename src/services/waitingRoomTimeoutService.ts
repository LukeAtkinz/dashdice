import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Waiting Room Timeout Service
 * Enforces hard 45-second timeout for waiting rooms to prevent indefinite waiting
 * Part of the 20+ player scalability fixes
 */

export interface WaitingRoomTimeout {
  sessionId: string;
  userId: string;
  gameMode: string;
  sessionType: string;
  timer: NodeJS.Timeout;
  createdAt: number;
}

export class WaitingRoomTimeoutService {
  private static readonly TIMEOUT_DURATION = 45000; // 45 seconds hard timeout
  private static timeouts = new Map<string, WaitingRoomTimeout>();
  
  /**
   * Start a timeout for a waiting room
   */
  static startTimeout(
    sessionId: string,
    userId: string,
    gameMode: string,
    sessionType: string,
    onTimeout?: (sessionId: string, userId: string) => Promise<void>
  ): void {
    // Clear any existing timeout for this session
    this.clearTimeout(sessionId);
    
    const createdAt = Date.now();
    
    const timer = setTimeout(async () => {
      console.log(`⏰ Waiting room ${sessionId} timed out after 45s`);
      
      try {
        // Check if session still exists and is still waiting
        const sessionRef = doc(db, 'gameSessions', sessionId);
        const sessionDoc = await getDoc(sessionRef);
        
        if (sessionDoc.exists()) {
          const sessionData = sessionDoc.data();
          
          // Only timeout if still in waiting status
          if (sessionData.status === 'waiting') {
            console.log(`🚫 Session ${sessionId} stuck in waiting, cleaning up and re-queueing user`);
            
            // Call the custom timeout handler if provided
            if (onTimeout) {
              await onTimeout(sessionId, userId);
            } else {
              // Default behavior: Clean up session
              await this.defaultTimeoutHandler(sessionId, userId, gameMode, sessionType);
            }
          } else {
            console.log(`✅ Session ${sessionId} is no longer waiting (status: ${sessionData.status}), no action needed`);
          }
        } else {
          console.log(`ℹ️ Session ${sessionId} already cleaned up`);
        }
      } catch (error) {
        console.error(`Error handling timeout for session ${sessionId}:`, error);
      } finally {
        // Clean up the timeout tracking
        this.timeouts.delete(sessionId);
      }
    }, this.TIMEOUT_DURATION);
    
    // Store the timeout
    this.timeouts.set(sessionId, {
      sessionId,
      userId,
      gameMode,
      sessionType,
      timer,
      createdAt
    });
    
    console.log(`⏲️ Started 45s timeout for waiting room ${sessionId}`);
  }
  
  /**
   * Clear a timeout (called when player joins or session starts)
   */
  static clearTimeout(sessionId: string): void {
    const timeout = this.timeouts.get(sessionId);
    
    if (timeout) {
      clearTimeout(timeout.timer);
      this.timeouts.delete(sessionId);
      console.log(`✅ Cleared timeout for session ${sessionId}`);
    }
  }
  
  /**
   * Default timeout handler - cleanup and notify user
   */
  private static async defaultTimeoutHandler(
    sessionId: string,
    userId: string,
    gameMode: string,
    sessionType: string
  ): Promise<void> {
    try {
      // 1. Delete the stale session
      const sessionRef = doc(db, 'gameSessions', sessionId);
      await deleteDoc(sessionRef);
      console.log(`🗑️ Deleted stale waiting room ${sessionId}`);
      
      // 2. Import and use AbandonedMatchService to properly cleanup
      const { AbandonedMatchService } = await import('./abandonedMatchService');
      await AbandonedMatchService.abandonMatch(sessionId, 'timeout', 'gameSessions');
      
      // 3. Clear user's current room
      const { PlayerHeartbeatService } = await import('./playerHeartbeatService');
      await PlayerHeartbeatService.updateCurrentRoom(userId, null);
      
      console.log(`✅ Timeout cleanup complete for session ${sessionId}, user ${userId} can re-queue`);
      
      // Note: User will be notified via the UI when they detect the session is gone
      // The matchmaking system will handle automatic re-queue if needed
      
    } catch (error) {
      console.error(`Failed to cleanup timed out session ${sessionId}:`, error);
    }
  }
  
  /**
   * Check if a session has an active timeout
   */
  static hasActiveTimeout(sessionId: string): boolean {
    return this.timeouts.has(sessionId);
  }
  
  /**
   * Get timeout info for a session
   */
  static getTimeoutInfo(sessionId: string): { remainingMs: number; userId: string } | null {
    const timeout = this.timeouts.get(sessionId);
    
    if (!timeout) return null;
    
    const elapsed = Date.now() - timeout.createdAt;
    const remaining = Math.max(0, this.TIMEOUT_DURATION - elapsed);
    
    return {
      remainingMs: remaining,
      userId: timeout.userId
    };
  }
  
  /**
   * Get all active timeouts (for monitoring)
   */
  static getActiveTimeouts(): Array<{
    sessionId: string;
    userId: string;
    gameMode: string;
    sessionType: string;
    remainingMs: number;
  }> {
    const now = Date.now();
    const active: Array<any> = [];
    
    for (const timeout of this.timeouts.values()) {
      const elapsed = now - timeout.createdAt;
      const remaining = Math.max(0, this.TIMEOUT_DURATION - elapsed);
      
      active.push({
        sessionId: timeout.sessionId,
        userId: timeout.userId,
        gameMode: timeout.gameMode,
        sessionType: timeout.sessionType,
        remainingMs: remaining
      });
    }
    
    return active;
  }
  
  /**
   * Force clear all timeouts (for cleanup/testing)
   */
  static clearAllTimeouts(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout.timer);
    }
    
    this.timeouts.clear();
    console.log('🧹 Cleared all waiting room timeouts');
  }
  
  /**
   * Get statistics
   */
  static getStats(): {
    totalActive: number;
    bySessionType: Record<string, number>;
  } {
    const bySessionType: Record<string, number> = {};
    
    for (const timeout of this.timeouts.values()) {
      bySessionType[timeout.sessionType] = (bySessionType[timeout.sessionType] || 0) + 1;
    }
    
    return {
      totalActive: this.timeouts.size,
      bySessionType
    };
  }
}
