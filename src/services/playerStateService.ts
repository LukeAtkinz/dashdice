import { collection, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

/**
 * 🎯 Player State Tracking Service
 * Prevents players from mixing quick/ranked sessions and tracks current game status
 */

export interface PlayerGameState {
  playerId: string;
  currentSessionId?: string;
  currentSessionType?: 'quick' | 'ranked' | 'friend' | 'tournament' | 'rematch';
  currentGameMode?: string;
  currentStatus: 'idle' | 'searching' | 'waiting' | 'matched' | 'playing';
  lastActivity: Date;
  isInGame: boolean;
  isInQueue: boolean;
  
  // Additional context
  sessionStartedAt?: Date;
  sessionExpiresAt?: Date;
  opponentId?: string;
  waitingRoomId?: string;
}

export class PlayerStateService {
  private static readonly COLLECTION_NAME = 'playerStates';
  private static readonly STATE_EXPIRY_MINUTES = 30;

  /**
   * 🎯 Get current player state
   */
  static async getPlayerState(playerId: string): Promise<PlayerGameState | null> {
    try {
      const stateRef = doc(db, this.COLLECTION_NAME, playerId);
      const stateDoc = await getDoc(stateRef);
      
      if (stateDoc.exists()) {
        const data = stateDoc.data();
        return {
          playerId,
          ...data,
          lastActivity: data.lastActivity?.toDate() || new Date(),
          sessionStartedAt: data.sessionStartedAt?.toDate(),
          sessionExpiresAt: data.sessionExpiresAt?.toDate()
        } as PlayerGameState;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error getting player state for ${playerId}:`, error);
      return null;
    }
  }

  /**
   * 🔄 Update player state
   */
  static async updatePlayerState(
    playerId: string, 
    updates: Partial<Omit<PlayerGameState, 'playerId' | 'lastActivity'>>
  ): Promise<boolean> {
    try {
      const stateRef = doc(db, this.COLLECTION_NAME, playerId);
      
      const updateData: any = {
        ...updates,
        lastActivity: serverTimestamp()
      };
      
      // Convert Date objects to timestamps
      if (updates.sessionStartedAt) {
        updateData.sessionStartedAt = serverTimestamp();
      }
      if (updates.sessionExpiresAt) {
        updateData.sessionExpiresAt = updates.sessionExpiresAt;
      }
      
      await updateDoc(stateRef, updateData);
      console.log(`✅ Updated player state for ${playerId}:`, updates);
      return true;
    } catch (error) {
      console.error(`❌ Error updating player state for ${playerId}:`, error);
      return false;
    }
  }

  /**
   * 🏁 Set player state to searching for specific session type
   */
  static async setPlayerSearching(
    playerId: string, 
    sessionType: 'quick' | 'ranked' | 'friend' | 'tournament' | 'rematch',
    gameMode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First check if player is already in a game or searching
      const currentState = await this.getPlayerState(playerId);
      
      if (currentState) {
        // Check for conflicts
        if (currentState.isInGame) {
          return {
            success: false,
            error: `You are already in a ${currentState.currentSessionType} game. Please finish your current game before starting a new one.`
          };
        }
        
        if (currentState.isInQueue && currentState.currentSessionType !== sessionType) {
          return {
            success: false,
            error: `You are already searching for a ${currentState.currentSessionType} match. Please cancel your current search before switching to ${sessionType} mode.`
          };
        }
        
        if (currentState.currentStatus === 'waiting' || currentState.currentStatus === 'matched') {
          return {
            success: false,
            error: `You are already waiting in a ${currentState.currentSessionType} match. Please leave your current session before starting a new search.`
          };
        }
      }
      
      // Clean up any old sessions first
      await this.cleanupPlayerSessions(playerId);
      
      // Set to searching state
      const newState: Partial<PlayerGameState> = {
        currentSessionType: sessionType,
        currentGameMode: gameMode,
        currentStatus: 'searching',
        isInGame: false,
        isInQueue: true,
        sessionStartedAt: new Date()
      };
      
      const stateRef = doc(db, this.COLLECTION_NAME, playerId);
      await updateDoc(stateRef, {
        ...newState,
        lastActivity: serverTimestamp(),
        sessionStartedAt: serverTimestamp()
      });
      
      console.log(`🔍 Player ${playerId} set to searching for ${sessionType} match`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Error setting player searching:`, error);
      return { success: false, error: 'Failed to update player state' };
    }
  }

  /**
   * 🎮 Set player state to in-session (waiting room)
   */
  static async setPlayerInSession(
    playerId: string,
    sessionId: string,
    sessionType: 'quick' | 'ranked' | 'friend' | 'tournament' | 'rematch',
    gameMode: string,
    status: 'waiting' | 'matched' = 'waiting'
  ): Promise<boolean> {
    try {
      const newState: Partial<PlayerGameState> = {
        currentSessionId: sessionId,
        currentSessionType: sessionType,
        currentGameMode: gameMode,
        currentStatus: status,
        isInGame: status === 'matched',
        isInQueue: false,
        sessionStartedAt: new Date()
      };
      
      return await this.updatePlayerState(playerId, newState);
    } catch (error) {
      console.error(`❌ Error setting player in session:`, error);
      return false;
    }
  }

  /**
   * 🎯 Set player to idle state
   */
  static async setPlayerIdle(playerId: string): Promise<boolean> {
    try {
      const newState: Partial<PlayerGameState> = {
        currentSessionId: undefined,
        currentSessionType: undefined,
        currentGameMode: undefined,
        currentStatus: 'idle',
        isInGame: false,
        isInQueue: false,
        opponentId: undefined,
        waitingRoomId: undefined,
        sessionStartedAt: undefined,
        sessionExpiresAt: undefined
      };
      
      return await this.updatePlayerState(playerId, newState);
    } catch (error) {
      console.error(`❌ Error setting player idle:`, error);
      return false;
    }
  }

  /**
   * 🔥 CRITICAL: Check if player is currently in an active match
   * This prevents race conditions where a player gets matched into 2 games simultaneously
   */
  static async hasActiveMatch(playerId: string): Promise<{ hasMatch: boolean; matchId?: string; matchData?: any }> {
    try {
      // Check for active matches where player is host
      const hostMatchQuery = query(
        collection(db, 'matches'),
        where('hostData.uid', '==', playerId),
        where('gameData.gameStatus', 'in', ['waiting', 'playing', 'active'])
      );
      
      const hostMatches = await getDocs(hostMatchQuery);
      if (!hostMatches.empty) {
        const matchDoc = hostMatches.docs[0];
        return { 
          hasMatch: true, 
          matchId: matchDoc.id,
          matchData: matchDoc.data()
        };
      }
      
      // Check for active matches where player is opponent
      const opponentMatchQuery = query(
        collection(db, 'matches'),
        where('opponentData.uid', '==', playerId),
        where('gameData.gameStatus', 'in', ['waiting', 'playing', 'active'])
      );
      
      const opponentMatches = await getDocs(opponentMatchQuery);
      if (!opponentMatches.empty) {
        const matchDoc = opponentMatches.docs[0];
        return { 
          hasMatch: true, 
          matchId: matchDoc.id,
          matchData: matchDoc.data()
        };
      }
      
      return { hasMatch: false };
      
    } catch (error) {
      console.error(`❌ Error checking active match for player ${playerId}:`, error);
      // On error, assume no match to avoid blocking legitimate players
      return { hasMatch: false };
    }
  }

  /**
   * ⚠️ Validate if player can join specific session type
   */
  static async validateSessionTypeAccess(
    playerId: string, 
    targetSessionType: 'quick' | 'ranked' | 'friend' | 'tournament' | 'rematch'
  ): Promise<{ valid: boolean; reason?: string; currentState?: PlayerGameState | null }> {
    try {
      // 🔥 CRITICAL: First check if player has an active match in Firestore
      const activeMatchCheck = await this.hasActiveMatch(playerId);
      if (activeMatchCheck.hasMatch) {
        const matchStatus = activeMatchCheck.matchData?.gameData?.gameStatus || 'unknown';
        console.log(`❌ Player ${playerId} already has active match ${activeMatchCheck.matchId} (status: ${matchStatus})`);
        return {
          valid: false,
          reason: `You are already in an active game (${activeMatchCheck.matchId}). Please finish your current game before starting a new match.`,
          currentState: null
        };
      }
      
      const currentState = await this.getPlayerState(playerId);
      
      // If no current state, player is free to join anything
      if (!currentState || currentState.currentStatus === 'idle') {
        return { valid: true, currentState };
      }
      
      // Check for active game conflicts
      if (currentState.isInGame) {
        return {
          valid: false,
          reason: `You are already in an active ${currentState.currentSessionType} game. Please finish your current game before joining a ${targetSessionType} match.`,
          currentState
        };
      }
      
      // Check for session type conflicts
      if (currentState.isInQueue || currentState.currentStatus === 'waiting') {
        if (currentState.currentSessionType !== targetSessionType) {
          return {
            valid: false,
            reason: `You are already in a ${currentState.currentSessionType} session. Please leave your current session before switching to ${targetSessionType} mode.`,
            currentState
          };
        }
      }
      
      // Check for stale states (older than 30 minutes)
      if (currentState.lastActivity) {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        if (currentState.lastActivity < thirtyMinutesAgo) {
          console.log(`🧹 Cleaning up stale state for player ${playerId}`);
          await this.setPlayerIdle(playerId);
          return { valid: true, currentState: null };
        }
      }
      
      return { valid: true, currentState };
      
    } catch (error) {
      console.error(`❌ Error validating session access:`, error);
      return { valid: false, reason: 'Unable to validate session access', currentState: null };
    }
  }

  /**
   * 🧹 Clean up player's old sessions and states
   */
  static async cleanupPlayerSessions(playerId: string): Promise<void> {
    try {
      console.log(`🧹 Cleaning up old sessions for player ${playerId}`);
      
      // Clean up game sessions
      const sessionsQuery = query(
        collection(db, 'gameSessions'),
        where('hostData.playerId', '==', playerId)
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      for (const docSnapshot of sessionsSnapshot.docs) {
        const sessionData = docSnapshot.data();
        
        // Only clean up waiting sessions, not active games
        if (sessionData.status === 'waiting') {
          console.log(`🗑️ Cleaning up waiting session ${docSnapshot.id}`);
          await deleteDoc(doc(db, 'gameSessions', docSnapshot.id));
        }
      }
      
      // Clean up waiting rooms
      const waitingRoomsQuery = query(
        collection(db, 'waitingroom'),
        where('hostData.playerId', '==', playerId)
      );
      
      const waitingSnapshot = await getDocs(waitingRoomsQuery);
      for (const docSnapshot of waitingSnapshot.docs) {
        console.log(`🗑️ Cleaning up waiting room ${docSnapshot.id}`);
        await deleteDoc(doc(db, 'waitingroom', docSnapshot.id));
      }
      
      console.log(`✅ Cleanup completed for player ${playerId}`);
    } catch (error) {
      console.error(`❌ Error cleaning up player sessions:`, error);
    }
  }

  /**
   * 🕐 Get all players with active states (for monitoring)
   */
  static async getActivePlayerStates(): Promise<PlayerGameState[]> {
    try {
      const statesQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('currentStatus', '!=', 'idle')
      );
      
      const snapshot = await getDocs(statesQuery);
      const activeStates: PlayerGameState[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        activeStates.push({
          playerId: doc.id,
          ...data,
          lastActivity: data.lastActivity?.toDate() || new Date(),
          sessionStartedAt: data.sessionStartedAt?.toDate(),
          sessionExpiresAt: data.sessionExpiresAt?.toDate()
        } as PlayerGameState);
      });
      
      return activeStates;
    } catch (error) {
      console.error(`❌ Error getting active player states:`, error);
      return [];
    }
  }

  /**
   * 🧹 Clean up stale player states
   */
  static async cleanupStaleStates(): Promise<number> {
    try {
      const staleThreshold = new Date(Date.now() - this.STATE_EXPIRY_MINUTES * 60 * 1000);
      const activeStates = await this.getActivePlayerStates();
      
      let cleanedCount = 0;
      
      for (const state of activeStates) {
        if (state.lastActivity < staleThreshold) {
          console.log(`🧹 Cleaning up stale state for player ${state.playerId}`);
          await this.setPlayerIdle(state.playerId);
          cleanedCount++;
        }
      }
      
      console.log(`🧹 Cleaned up ${cleanedCount} stale player states`);
      return cleanedCount;
    } catch (error) {
      console.error(`❌ Error cleaning up stale states:`, error);
      return 0;
    }
  }

  /**
   * 🔄 Update player state when joining opponent
   */
  static async setPlayerMatched(
    playerId: string,
    sessionId: string,
    opponentId: string
  ): Promise<boolean> {
    try {
      const updates: Partial<PlayerGameState> = {
        currentStatus: 'matched',
        isInGame: true,
        isInQueue: false,
        opponentId
      };
      
      return await this.updatePlayerState(playerId, updates);
    } catch (error) {
      console.error(`❌ Error setting player matched:`, error);
      return false;
    }
  }

  /**
   * 📊 Get session type distribution
   */
  static async getSessionTypeDistribution(): Promise<{ [sessionType: string]: number }> {
    try {
      const activeStates = await this.getActivePlayerStates();
      const distribution: { [sessionType: string]: number } = {
        quick: 0,
        ranked: 0,
        friend: 0,
        tournament: 0,
        rematch: 0
      };
      
      activeStates.forEach(state => {
        if (state.currentSessionType) {
          distribution[state.currentSessionType]++;
        }
      });
      
      return distribution;
    } catch (error) {
      console.error(`❌ Error getting session type distribution:`, error);
      return {};
    }
  }
}
