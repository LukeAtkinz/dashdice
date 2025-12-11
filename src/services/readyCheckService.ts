import { doc, updateDoc, Timestamp, getDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Ready Check Service
 * Both players must confirm ready before match starts
 */
export class ReadyCheckService {
  private static readonly READY_CHECK_DURATION = 10000; // 10 seconds

  /**
   * Start ready check for a matched session
   */
  static async startReadyCheck(matchId: string): Promise<void> {
    try {
      console.log(`✅ Starting ready check for match ${matchId}`);

      const matchRef = doc(db, 'matches', matchId);
      const expiresAt = Timestamp.fromMillis(Date.now() + this.READY_CHECK_DURATION);

      await updateDoc(matchRef, {
        'gameData.readyCheck': {
          isActive: true,
          hostReady: false,
          opponentReady: false,
          startedAt: Timestamp.now(),
          expiresAt: expiresAt
        }
      });

      console.log(`✅ Ready check started. Expires at: ${new Date(expiresAt.toMillis()).toISOString()}`);

      // Start timeout monitor
      this.monitorReadyCheckTimeout(matchId);

    } catch (error) {
      console.error(`❌ Error starting ready check for ${matchId}:`, error);
    }
  }

  /**
   * Mark player as ready
   */
  static async markPlayerReady(matchId: string, playerId: string): Promise<{
    success: boolean;
    bothReady?: boolean;
    error?: string;
  }> {
    try {
      console.log(`✅ Player ${playerId} accepting ready check for match ${matchId}`);

      return await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'matches', matchId);
        const matchDoc = await transaction.get(matchRef);

        if (!matchDoc.exists()) {
          return { success: false, error: 'Match not found' };
        }

        const matchData = matchDoc.data();
        const readyCheck = matchData.gameData?.readyCheck;

        if (!readyCheck || !readyCheck.isActive) {
          return { success: false, error: 'Ready check not active' };
        }

        // Check if ready check expired
        if (readyCheck.expiresAt.toMillis() < Date.now()) {
          return { success: false, error: 'Ready check expired' };
        }

        // Determine if player is host or opponent
        const isHost = matchData.hostData?.playerId === playerId;

        if (!isHost && matchData.opponentData?.playerId !== playerId) {
          return { success: false, error: 'Player not in this match' };
        }

        // Update ready status
        const updateField = isHost ? 'gameData.readyCheck.hostReady' : 'gameData.readyCheck.opponentReady';
        transaction.update(matchRef, { [updateField]: true });

        // Check if both players are ready
        const bothReady = isHost 
          ? readyCheck.opponentReady // Host just readied, check opponent
          : readyCheck.hostReady; // Opponent just readied, check host

        console.log(`✅ Player ${playerId} marked ready. Both ready: ${bothReady}`);

        return { success: true, bothReady };
      });

    } catch (error) {
      console.error(`❌ Error marking player ready:`, error);
      return { success: false, error: 'Transaction failed' };
    }
  }

  /**
   * Complete ready check and start match
   */
  static async completeReadyCheck(matchId: string): Promise<void> {
    try {
      console.log(`🎮 Both players ready! Starting match ${matchId}`);

      const matchRef = doc(db, 'matches', matchId);

      await updateDoc(matchRef, {
        'gameData.readyCheck.isActive': false,
        'gameData.status': 'active'
      });

      console.log(`✅ Ready check completed, match starting`);

    } catch (error) {
      console.error(`❌ Error completing ready check:`, error);
    }
  }

  /**
   * Cancel match due to ready check failure
   */
  static async cancelMatchDueToReadyCheck(matchId: string, reason: 'timeout' | 'declined'): Promise<void> {
    try {
      console.log(`❌ Cancelling match ${matchId} due to ready check ${reason}`);

      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) {
        console.log(`Match ${matchId} not found`);
        return;
      }

      const matchData = matchDoc.data();

      // Return players to matchmaking
      await updateDoc(matchRef, {
        'status': 'cancelled',
        'gameData.gamePhase': 'gameOver',
        'gameData.gameOverReason': reason === 'timeout' ? 'ready_check_timeout' : 'ready_check_declined',
        'gameData.readyCheck.isActive': false
      });

      console.log(`✅ Match cancelled, players returned to queue`);

    } catch (error) {
      console.error(`❌ Error cancelling match:`, error);
    }
  }

  /**
   * Monitor ready check timeout
   */
  private static monitorReadyCheckTimeout(matchId: string): void {
    setTimeout(async () => {
      try {
        const matchRef = doc(db, 'matches', matchId);
        const matchDoc = await getDoc(matchRef);

        if (!matchDoc.exists()) return;

        const matchData = matchDoc.data();
        const readyCheck = matchData.gameData?.readyCheck;

        if (!readyCheck || !readyCheck.isActive) {
          console.log(`Ready check already completed or cancelled`);
          return;
        }

        // Check if both players accepted
        if (readyCheck.hostReady && readyCheck.opponentReady) {
          console.log(`Both players ready, match proceeding`);
          await this.completeReadyCheck(matchId);
          return;
        }

        // Timeout - at least one player didn't accept
        console.log(`⏱️ Ready check timeout for match ${matchId}`);
        console.log(`Host ready: ${readyCheck.hostReady}, Opponent ready: ${readyCheck.opponentReady}`);
        
        await this.cancelMatchDueToReadyCheck(matchId, 'timeout');

      } catch (error) {
        console.error(`Error monitoring ready check timeout:`, error);
      }
    }, this.READY_CHECK_DURATION + 500); // Add 500ms buffer
  }

  /**
   * Get ready check status
   */
  static async getReadyCheckStatus(matchId: string): Promise<{
    isActive: boolean;
    hostReady: boolean;
    opponentReady: boolean;
    timeRemaining: number;
  } | null> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) return null;

      const matchData = matchDoc.data();
      const readyCheck = matchData.gameData?.readyCheck;

      if (!readyCheck || !readyCheck.isActive) return null;

      const timeRemaining = Math.max(0, readyCheck.expiresAt.toMillis() - Date.now());

      return {
        isActive: readyCheck.isActive,
        hostReady: readyCheck.hostReady,
        opponentReady: readyCheck.opponentReady,
        timeRemaining: Math.ceil(timeRemaining / 1000) // Convert to seconds
      };

    } catch (error) {
      console.error(`Error getting ready check status:`, error);
      return null;
    }
  }
}
