import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Session Recovery Service
 * Handles automatic rejoin after app crash, browser close, or accidental navigation
 */
export class SessionRecoveryService {
  private static readonly STORAGE_KEY = 'activeMatchId';
  private static readonly TIMESTAMP_KEY = 'activeMatchTimestamp';
  private static readonly MAX_RECOVERY_TIME = 10 * 60 * 1000; // 10 minutes

  /**
   * Check if there's an active match to rejoin
   * Called on app initialization
   */
  static async checkForActiveMatch(userId: string): Promise<{
    hasActiveMatch: boolean;
    matchId?: string;
    shouldRejoin?: boolean;
    reason?: string;
  }> {
    try {
      const storedMatchId = localStorage.getItem(this.STORAGE_KEY);
      const storedTimestamp = localStorage.getItem(this.TIMESTAMP_KEY);

      if (!storedMatchId) {
        return { hasActiveMatch: false };
      }

      // Check if stored match is too old (> 10 minutes)
      if (storedTimestamp) {
        const timeSinceStore = Date.now() - parseInt(storedTimestamp);
        if (timeSinceStore > this.MAX_RECOVERY_TIME) {
          console.log(`🕐 Stored match ${storedMatchId} is too old (${Math.round(timeSinceStore / 1000)}s), clearing`);
          this.clearStoredMatch();
          return { 
            hasActiveMatch: false, 
            reason: 'Match session expired (> 10 minutes old)'
          };
        }
      }

      console.log(`🔍 Checking stored match ${storedMatchId} for recovery...`);

      // Verify the match still exists and is active
      const matchRef = doc(db, 'matches', storedMatchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) {
        console.log(`❌ Stored match ${storedMatchId} no longer exists`);
        this.clearStoredMatch();
        return { 
          hasActiveMatch: false, 
          reason: 'Match no longer exists'
        };
      }

      const matchData = matchDoc.data();

      // Check if match is completed or abandoned
      if (matchData.gameData?.gamePhase === 'gameOver' || 
          matchData.status === 'completed' || 
          matchData.status === 'abandoned') {
        console.log(`✅ Stored match ${storedMatchId} is already completed`);
        this.clearStoredMatch();
        return { 
          hasActiveMatch: false, 
          reason: 'Match already completed'
        };
      }

      // Check if user is actually in this match
      const isHost = matchData.hostData?.playerId === userId;
      const isOpponent = matchData.opponentData?.playerId === userId;

      if (!isHost && !isOpponent) {
        console.log(`❌ User ${userId} is not in match ${storedMatchId}`);
        this.clearStoredMatch();
        return { 
          hasActiveMatch: false, 
          reason: 'User not in this match'
        };
      }

      console.log(`✅ Found active match ${storedMatchId} for recovery!`);
      return {
        hasActiveMatch: true,
        matchId: storedMatchId,
        shouldRejoin: true
      };

    } catch (error) {
      console.error('❌ Error checking for active match:', error);
      this.clearStoredMatch();
      return { 
        hasActiveMatch: false, 
        reason: 'Error checking match status'
      };
    }
  }

  /**
   * Store active match ID (called from Match component)
   */
  static storeActiveMatch(matchId: string): void {
    localStorage.setItem(this.STORAGE_KEY, matchId);
    localStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
    console.log(`💾 Stored active match: ${matchId}`);
  }

  /**
   * Clear stored match (called on game over or manual leave)
   */
  static clearStoredMatch(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TIMESTAMP_KEY);
    console.log(`🗑️ Cleared stored match`);
  }

  /**
   * Get stored match ID without validation
   */
  static getStoredMatchId(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Check if a specific match is stored
   */
  static isMatchStored(matchId: string): boolean {
    return this.getStoredMatchId() === matchId;
  }
}
