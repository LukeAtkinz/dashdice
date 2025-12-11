import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Reconnection Grace Period Service
 * Pauses match when player disconnects, gives 60s to reconnect
 */
export class ReconnectionService {
  private static readonly GRACE_PERIOD = 60000; // 60 seconds
  private static readonly CHECK_INTERVAL = 5000; // Check every 5 seconds
  private static activeTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Pause match due to player disconnection
   */
  static async pauseMatch(
    matchId: string, 
    disconnectedPlayerId: string,
    reason: 'player_disconnected' | 'network_issue' = 'player_disconnected'
  ): Promise<void> {
    try {
      console.log(`⏸️ Pausing match ${matchId} - ${reason} (player: ${disconnectedPlayerId})`);

      const matchRef = doc(db, 'matches', matchId);
      const reconnectionDeadline = Timestamp.fromMillis(Date.now() + this.GRACE_PERIOD);

      await updateDoc(matchRef, {
        'gameData.isPaused': true,
        'gameData.pauseReason': reason,
        'gameData.pausedAt': Timestamp.now(),
        'gameData.pausedBy': disconnectedPlayerId,
        'gameData.reconnectionDeadline': reconnectionDeadline
      });

      console.log(`✅ Match paused. Reconnection deadline: ${new Date(reconnectionDeadline.toMillis()).toISOString()}`);

      // Start timeout timer to check if player reconnects
      this.startReconnectionTimer(matchId, disconnectedPlayerId);

    } catch (error) {
      console.error(`❌ Error pausing match ${matchId}:`, error);
    }
  }

  /**
   * Resume match after successful reconnection
   */
  static async resumeMatch(matchId: string, reconnectedPlayerId: string): Promise<void> {
    try {
      console.log(`▶️ Resuming match ${matchId} - player ${reconnectedPlayerId} reconnected`);

      const matchRef = doc(db, 'matches', matchId);

      await updateDoc(matchRef, {
        'gameData.isPaused': false,
        'gameData.pauseReason': null,
        'gameData.pausedAt': null,
        'gameData.pausedBy': null,
        'gameData.reconnectionDeadline': null
      });

      // Clear the reconnection timer
      this.clearReconnectionTimer(matchId);

      console.log(`✅ Match resumed successfully`);

    } catch (error) {
      console.error(`❌ Error resuming match ${matchId}:`, error);
    }
  }

  /**
   * End match due to reconnection timeout
   */
  static async handleReconnectionTimeout(matchId: string, disconnectedPlayerId: string): Promise<void> {
    try {
      console.log(`⏱️ Reconnection timeout for match ${matchId} - ending match`);

      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) {
        console.log(`Match ${matchId} no longer exists`);
        return;
      }

      const matchData = matchDoc.data();

      // Determine winner (the player who stayed connected)
      const hostId = matchData.hostData?.playerId;
      const opponentId = matchData.opponentData?.playerId;
      const winnerId = disconnectedPlayerId === hostId ? opponentId : hostId;
      const winnerRole = winnerId === hostId ? 'host' : 'opponent';

      // End the match
      await updateDoc(matchRef, {
        'gameData.gamePhase': 'gameOver',
        'gameData.winner': winnerRole,
        'gameData.gameOverReason': 'opponent_disconnected',
        'gameData.isPaused': false,
        'gameData.pauseReason': null,
        'gameData.pausedAt': null,
        'gameData.pausedBy': null,
        'gameData.reconnectionDeadline': null,
        'status': 'completed'
      });

      console.log(`✅ Match ended - Winner: ${winnerRole} (${winnerId}) by disconnection`);

      // Clear the timer
      this.clearReconnectionTimer(matchId);

    } catch (error) {
      console.error(`❌ Error handling reconnection timeout for ${matchId}:`, error);
    }
  }

  /**
   * Start reconnection timer
   * Checks every 5 seconds if player reconnected, ends match after 60s
   */
  private static startReconnectionTimer(matchId: string, disconnectedPlayerId: string): void {
    // Clear any existing timer
    this.clearReconnectionTimer(matchId);

    let elapsed = 0;

    const timer = setInterval(async () => {
      elapsed += this.CHECK_INTERVAL;

      try {
        const matchRef = doc(db, 'matches', matchId);
        const matchDoc = await getDoc(matchRef);

        if (!matchDoc.exists()) {
          console.log(`Match ${matchId} no longer exists, clearing timer`);
          this.clearReconnectionTimer(matchId);
          return;
        }

        const matchData = matchDoc.data();

        // Check if match is no longer paused (player reconnected)
        if (!matchData.gameData?.isPaused) {
          console.log(`✅ Player reconnected, clearing timer`);
          this.clearReconnectionTimer(matchId);
          return;
        }

        // Check if grace period expired
        if (elapsed >= this.GRACE_PERIOD) {
          console.log(`⏱️ Grace period expired (${elapsed}ms), ending match`);
          await this.handleReconnectionTimeout(matchId, disconnectedPlayerId);
          this.clearReconnectionTimer(matchId);
          return;
        }

        console.log(`⏳ Waiting for reconnection... ${Math.round((this.GRACE_PERIOD - elapsed) / 1000)}s remaining`);

      } catch (error) {
        console.error(`Error checking reconnection status:`, error);
      }
    }, this.CHECK_INTERVAL);

    this.activeTimers.set(matchId, timer);
    console.log(`⏱️ Started reconnection timer for match ${matchId}`);
  }

  /**
   * Clear reconnection timer
   */
  private static clearReconnectionTimer(matchId: string): void {
    const timer = this.activeTimers.get(matchId);
    if (timer) {
      clearInterval(timer);
      this.activeTimers.delete(matchId);
      console.log(`🗑️ Cleared reconnection timer for match ${matchId}`);
    }
  }

  /**
   * Check if match is currently paused
   */
  static async isMatchPaused(matchId: string): Promise<boolean> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) return false;

      const matchData = matchDoc.data();
      return matchData.gameData?.isPaused === true;

    } catch (error) {
      console.error(`Error checking if match paused:`, error);
      return false;
    }
  }

  /**
   * Get reconnection time remaining
   */
  static async getReconnectionTimeRemaining(matchId: string): Promise<number> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) return 0;

      const matchData = matchDoc.data();
      const deadline = matchData.gameData?.reconnectionDeadline;

      if (!deadline) return 0;

      const remaining = deadline.toMillis() - Date.now();
      return Math.max(0, remaining);

    } catch (error) {
      console.error(`Error getting reconnection time:`, error);
      return 0;
    }
  }

  /**
   * Cleanup all active timers (call on service shutdown)
   */
  static cleanupAllTimers(): void {
    this.activeTimers.forEach((timer, matchId) => {
      clearInterval(timer);
      console.log(`🗑️ Cleaned up timer for match ${matchId}`);
    });
    this.activeTimers.clear();
  }
}
