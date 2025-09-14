import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * 🔌 Centralized Player Disconnection Service
 * Coordinates cleanup across all game systems when a player leaves/disconnects
 */
export class PlayerDisconnectionService {
  
  /**
   * 🚨 Handle comprehensive player disconnection
   * This is the main entry point for all disconnection scenarios
   */
  static async handlePlayerDisconnection(
    playerId: string,
    context: {
      sessionId?: string;
      matchId?: string;
      reason: 'quit' | 'disconnect' | 'abandon' | 'timeout';
      isGraceful?: boolean;
    }
  ): Promise<{
    success: boolean;
    cleanupSummary: {
      sessionsCleanedUp: number;
      matchesEnded: number;
      waitingRoomsRemoved: number;
      activeGamesRemoved: number;
    };
  }> {
    console.log(`🚨 Handling disconnection for player ${playerId}:`, context);
    
    const cleanupSummary = {
      sessionsCleanedUp: 0,
      matchesEnded: 0,
      waitingRoomsRemoved: 0,
      activeGamesRemoved: 0
    };
    
    try {
      // 1. Handle specific session/match if provided
      if (context.sessionId) {
        await this.handleSessionDisconnection(context.sessionId, playerId, context.reason);
        cleanupSummary.sessionsCleanedUp = 1;
      }
      
      if (context.matchId) {
        await this.handleMatchDisconnection(context.matchId, playerId, context.reason);
        cleanupSummary.matchesEnded = 1;
      }
      
      // 2. Comprehensive cleanup of all player references
      const globalCleanup = await this.performGlobalPlayerCleanup(playerId);
      cleanupSummary.sessionsCleanedUp += globalCleanup.sessionsCleanedUp;
      cleanupSummary.matchesEnded += globalCleanup.matchesEnded;
      cleanupSummary.waitingRoomsRemoved = globalCleanup.waitingRoomsRemoved;
      cleanupSummary.activeGamesRemoved = globalCleanup.activeGamesRemoved;
      
      console.log(`✅ Disconnection cleanup completed for ${playerId}:`, cleanupSummary);
      
      return { success: true, cleanupSummary };
      
    } catch (error) {
      console.error(`❌ Error handling disconnection for ${playerId}:`, error);
      return { success: false, cleanupSummary };
    }
  }
  
  /**
   * 🎮 Handle session-specific disconnection
   */
  private static async handleSessionDisconnection(
    sessionId: string, 
    playerId: string, 
    reason: string
  ): Promise<void> {
    try {
      const { GameSessionService } = await import('./gameSessionService');
      const result = await GameSessionService.leaveSession(sessionId, playerId, reason as any);
      
      if (result.success) {
        console.log(`✅ Session ${sessionId} cleanup completed for ${playerId}`);
      }
    } catch (error) {
      console.error(`❌ Error in session disconnection:`, error);
    }
  }
  
  /**
   * 🏁 Handle match-specific disconnection
   */
  private static async handleMatchDisconnection(
    matchId: string, 
    playerId: string, 
    reason: string
  ): Promise<void> {
    try {
      const { MatchService } = await import('./matchService');
      await MatchService.handlePlayerDisconnection(matchId, playerId, true);
      console.log(`✅ Match ${matchId} cleanup completed for ${playerId}`);
    } catch (error) {
      console.error(`❌ Error in match disconnection:`, error);
    }
  }
  
  /**
   * 🧹 Perform global cleanup of all player references
   */
  private static async performGlobalPlayerCleanup(playerId: string): Promise<{
    sessionsCleanedUp: number;
    matchesEnded: number;
    waitingRoomsRemoved: number;
    activeGamesRemoved: number;
  }> {
    const cleanup = {
      sessionsCleanedUp: 0,
      matchesEnded: 0,
      waitingRoomsRemoved: 0,
      activeGamesRemoved: 0
    };
    
    try {
      // Clean up game sessions
      cleanup.sessionsCleanedUp = await this.cleanupPlayerSessions(playerId);
      
      // Clean up waiting rooms
      cleanup.waitingRoomsRemoved = await this.cleanupPlayerWaitingRooms(playerId);
      
      // Clean up active games tracking
      cleanup.activeGamesRemoved = await this.cleanupActiveGames(playerId);
      
      // Note: Matches are handled by session cleanup, so we don't double-clean
      
    } catch (error) {
      console.error(`❌ Error in global cleanup:`, error);
    }
    
    return cleanup;
  }
  
  /**
   * 🎯 Clean up all sessions involving the player
   */
  private static async cleanupPlayerSessions(playerId: string): Promise<number> {
    try {
      // Find all sessions where player is a participant
      const sessionsQuery = query(
        collection(db, 'gameSessions'),
        where('participants', 'array-contains-any', [{ playerId }])
      );
      
      // Note: Firestore array-contains-any doesn't work with complex objects
      // We need to use a different approach
      const allSessionsQuery = query(collection(db, 'gameSessions'));
      const snapshot = await getDocs(allSessionsQuery);
      
      let cleanedCount = 0;
      const { GameSessionService } = await import('./gameSessionService');
      
      for (const docSnapshot of snapshot.docs) {
        const sessionData = docSnapshot.data();
        const hasPlayer = sessionData.participants?.some((p: any) => p.playerId === playerId);
        
        if (hasPlayer) {
          try {
            await GameSessionService.leaveSession(docSnapshot.id, playerId, 'disconnect');
            cleanedCount++;
          } catch (error) {
            console.error(`❌ Error cleaning session ${docSnapshot.id}:`, error);
          }
        }
      }
      
      console.log(`🧹 Cleaned up ${cleanedCount} sessions for player ${playerId}`);
      return cleanedCount;
      
    } catch (error) {
      console.error(`❌ Error cleaning player sessions:`, error);
      return 0;
    }
  }
  
  /**
   * 🏠 Clean up waiting room entries
   */
  private static async cleanupPlayerWaitingRooms(playerId: string): Promise<number> {
    try {
      const waitingRoomsQuery = query(
        collection(db, 'waitingroom'),
        where('hostData.playerId', '==', playerId)
      );
      
      const snapshot = await getDocs(waitingRoomsQuery);
      let cleanedCount = 0;
      
      for (const docSnapshot of snapshot.docs) {
        try {
          await deleteDoc(doc(db, 'waitingroom', docSnapshot.id));
          cleanedCount++;
        } catch (error) {
          console.error(`❌ Error deleting waiting room ${docSnapshot.id}:`, error);
        }
      }
      
      console.log(`🏠 Cleaned up ${cleanedCount} waiting rooms for player ${playerId}`);
      return cleanedCount;
      
    } catch (error) {
      console.error(`❌ Error cleaning waiting rooms:`, error);
      return 0;
    }
  }
  
  /**
   * 🎮 Clean up active games tracking
   */
  private static async cleanupActiveGames(playerId: string): Promise<number> {
    try {
      const activeGamesQuery = query(
        collection(db, 'activeGamesSessions'),
        where('playerId', '==', playerId)
      );
      
      const snapshot = await getDocs(activeGamesQuery);
      let cleanedCount = 0;
      
      for (const docSnapshot of snapshot.docs) {
        try {
          await deleteDoc(doc(db, 'activeGamesSessions', docSnapshot.id));
          cleanedCount++;
        } catch (error) {
          console.error(`❌ Error deleting active game ${docSnapshot.id}:`, error);
        }
      }
      
      console.log(`🎮 Cleaned up ${cleanedCount} active game entries for player ${playerId}`);
      return cleanedCount;
      
    } catch (error) {
      console.error(`❌ Error cleaning active games:`, error);
      return 0;
    }
  }
  
  /**
   * 💓 Heartbeat system for detecting disconnections
   */
  static async startHeartbeatMonitoring(
    playerId: string, 
    sessionId: string,
    intervalMs = 30000 // 30 seconds
  ): Promise<() => void> {
    console.log(`💓 Starting heartbeat monitoring for ${playerId} in session ${sessionId}`);
    
    const heartbeatInterval = setInterval(async () => {
      try {
        const { GameSessionService } = await import('./gameSessionService');
        const success = await GameSessionService.updatePlayerHeartbeat(sessionId, playerId);
        
        if (!success) {
          console.log(`💓 Heartbeat failed for ${playerId}, session may not exist`);
          clearInterval(heartbeatInterval);
        }
      } catch (error) {
        console.error(`❌ Heartbeat error for ${playerId}:`, error);
        clearInterval(heartbeatInterval);
      }
    }, intervalMs);
    
    // Return cleanup function
    return () => {
      console.log(`💓 Stopping heartbeat monitoring for ${playerId}`);
      clearInterval(heartbeatInterval);
    };
  }
  
  /**
   * 🕰️ Check for stale players and handle timeouts
   */
  static async checkForStalePlayers(): Promise<number> {
    try {
      const { GameSessionService } = await import('./gameSessionService');
      
      // Clean up abandoned sessions
      const cleanedSessions = await GameSessionService.cleanupAbandonedSessions();
      
      // Clean up expired locks
      await GameSessionService.cleanupExpiredLocks();
      
      console.log(`🕰️ Cleaned up ${cleanedSessions} stale sessions`);
      return cleanedSessions;
      
    } catch (error) {
      console.error(`❌ Error checking for stale players:`, error);
      return 0;
    }
  }
}
