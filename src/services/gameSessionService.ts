import { 
  collection, 
  doc, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  runTransaction,
  onSnapshot,
  Timestamp,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { UserService } from './userService';

// Core session types
export type SessionType = 'quick' | 'ranked' | 'friend' | 'tournament' | 'rematch';
export type SessionStatus = 'waiting' | 'matched' | 'active' | 'completed' | 'cancelled' | 'expired';

// Session configuration interface
export interface SessionConfiguration {
  maxPlayers: number;
  allowedPlayerIds?: string[]; // For friend/rematch games
  skillRange?: { min: number; max: number }; // For ranked matching
  requireActiveRanked?: boolean;
  preserveFromMatch?: string; // For rematches
  expirationTime?: number; // Minutes until expiration (default: 20)
}

// Player data interface
export interface SessionPlayerData {
  playerId: string;
  playerDisplayName: string;
  playerStats: {
    bestStreak: number;
    currentStreak: number;
    gamesPlayed: number;
    matchWins: number;
  };
  displayBackgroundEquipped: any;
  matchBackgroundEquipped: any;
  ready: boolean;
  joinedAt?: Date;
}

// Tournament specific data
export interface TournamentSessionData {
  tournamentId: string;
  bracket: string;
  round: number;
  position: number;
  matchNumber: number;
}

// Main session interface
export interface GameSession {
  id: string;
  sessionType: SessionType;
  gameMode: string;
  status: SessionStatus;
  
  // Player Data
  hostData: SessionPlayerData;
  opponentData?: SessionPlayerData;
  participants: SessionPlayerData[]; // All players in the session
  
  // Session Configuration
  gameConfiguration: SessionConfiguration;
  
  // Tournament Specific (optional)
  tournamentData?: TournamentSessionData;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  matchedAt?: Date;
  completedAt?: Date;
  winnerId?: string;
}

/**
 * Unified Game Session Service
 * Handles all types of game sessions: Quick, Ranked, Friend, Tournament, Rematch
 */
export class GameSessionService {
  private static readonly COLLECTION_NAME = 'gameSessions';
  private static readonly DEFAULT_EXPIRATION_MINUTES = 20;

  /**
   * Create a new game session
   */
  static async createSession(
    sessionType: SessionType,
    gameMode: string,
    hostData: SessionPlayerData,
    configuration: SessionConfiguration,
    tournamentData?: TournamentSessionData
  ): Promise<string> {
    try {
      console.log(`🎮 Creating ${sessionType} session for game mode: ${gameMode}`);
      
      // Validate session creation requirements
      await this.validateSessionCreation(sessionType, hostData.playerId, configuration);
      
      const expirationMinutes = configuration.expirationTime || this.DEFAULT_EXPIRATION_MINUTES;
      const expiresAt = new Date(Date.now() + (expirationMinutes * 60 * 1000));
      
      const sessionData: Omit<GameSession, 'id'> = {
        sessionType,
        gameMode,
        status: 'waiting',
        hostData: {
          ...hostData,
          joinedAt: new Date()
        },
        participants: [{
          ...hostData,
          joinedAt: new Date()
        }], // Initialize with host player
        gameConfiguration: configuration,
        tournamentData,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt
      };

      const sessionRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...sessionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      });

      console.log(`✅ Created session ${sessionRef.id} of type ${sessionType}`);
      
      // Start expiration cleanup timer
      this.scheduleSessionCleanup(sessionRef.id, expirationMinutes);
      
      return sessionRef.id;
    } catch (error) {
      console.error('❌ Error creating game session:', error);
      throw error;
    }
  }

  /**
   * Join an existing session
   */
  static async joinSession(
    sessionId: string,
    playerData: SessionPlayerData
  ): Promise<{ success: boolean; session?: GameSession }> {
    try {
      console.log(`🔄 Player ${playerData.playerId} attempting to join session ${sessionId}`);
      
      return await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);
        
        if (!sessionDoc.exists()) {
          throw new Error('Session not found');
        }
        
        const sessionData = sessionDoc.data() as GameSession;
        
        // Validate join conditions
        this.validateSessionJoin(sessionData, playerData.playerId);
        
        // Update session with opponent data and participants
        const updatedParticipants = [...sessionData.participants, {
          ...playerData,
          joinedAt: new Date()
        }];
        
        const updatedSession: Partial<GameSession> = {
          status: 'matched',
          opponentData: {
            ...playerData,
            joinedAt: new Date()
          },
          participants: updatedParticipants,
          matchedAt: new Date(),
          updatedAt: new Date()
        };
        
        transaction.update(sessionRef, {
          ...updatedSession,
          matchedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Player ${playerData.playerId} joined session ${sessionId}`);
        
        return { 
          success: true, 
          session: { ...sessionData, ...updatedSession, id: sessionId } 
        };
      });
    } catch (error) {
      console.error('❌ Error joining session:', error);
      return { success: false };
    }
  }

  /**
   * Find available sessions for matchmaking
   */
  static async findAvailableSessions(
    sessionType: SessionType,
    gameMode: string,
    playerData: SessionPlayerData,
    skillRange?: { min: number; max: number }
  ): Promise<GameSession[]> {
    try {
      console.log(`🔍 Searching for ${sessionType} sessions in ${gameMode}`);
      
      let queryConstraints = [
        where('sessionType', '==', sessionType),
        where('gameMode', '==', gameMode),
        where('status', '==', 'waiting'),
        orderBy('createdAt', 'asc'),
        firestoreLimit(10)
      ];
      
      // Add skill-based filtering for ranked games
      if (sessionType === 'ranked' && skillRange) {
        // Note: This would require composite indexes in Firebase
        // For now, we'll filter after retrieval
      }
      
      const q = query(collection(db, this.COLLECTION_NAME), ...queryConstraints);
      const snapshot = await getDocs(q);
      
      const sessions: GameSession[] = [];
      snapshot.docs.forEach(doc => {
        const sessionData = doc.data();
        
        // Convert Firestore timestamps
        const session: GameSession = {
          id: doc.id,
          ...sessionData,
          createdAt: sessionData.createdAt.toDate(),
          updatedAt: sessionData.updatedAt.toDate(),
          expiresAt: sessionData.expiresAt.toDate(),
          matchedAt: sessionData.matchedAt?.toDate(),
          completedAt: sessionData.completedAt?.toDate()
        } as GameSession;
        
        // Apply additional filtering
        if (this.isSessionSuitableForPlayer(session, playerData, skillRange)) {
          sessions.push(session);
        }
      });
      
      console.log(`📋 Found ${sessions.length} suitable sessions`);
      return sessions;
    } catch (error) {
      console.error('❌ Error finding sessions:', error);
      return [];
    }
  }

  /**
   * Update session status
   */
  static async updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    additionalData?: Partial<GameSession>
  ): Promise<void> {
    try {
      const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };
      
      if (status === 'completed') {
        updateData.completedAt = serverTimestamp();
      }
      
      if (additionalData) {
        Object.assign(updateData, additionalData);
      }
      
      await updateDoc(sessionRef, updateData);
      console.log(`✅ Updated session ${sessionId} status to: ${status}`);
    } catch (error) {
      console.error('❌ Error updating session status:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  static async getSession(sessionId: string): Promise<GameSession | null> {
    try {
      const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        return null;
      }
      
      const sessionData = sessionDoc.data();
      return {
        id: sessionDoc.id,
        ...sessionData,
        createdAt: sessionData.createdAt.toDate(),
        updatedAt: sessionData.updatedAt.toDate(),
        expiresAt: sessionData.expiresAt.toDate(),
        matchedAt: sessionData.matchedAt?.toDate(),
        completedAt: sessionData.completedAt?.toDate()
      } as GameSession;
    } catch (error) {
      console.error('❌ Error getting session:', error);
      return null;
    }
  }

  /**
   * Subscribe to session updates
   */
  static subscribeToSession(
    sessionId: string,
    callback: (session: GameSession | null) => void
  ): Unsubscribe {
    const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
    
    return onSnapshot(sessionRef, (doc) => {
      if (doc.exists()) {
        const sessionData = doc.data();
        const session: GameSession = {
          id: doc.id,
          ...sessionData,
          createdAt: sessionData.createdAt.toDate(),
          updatedAt: sessionData.updatedAt.toDate(),
          expiresAt: sessionData.expiresAt.toDate(),
          matchedAt: sessionData.matchedAt?.toDate(),
          completedAt: sessionData.completedAt?.toDate()
        } as GameSession;
        callback(session);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Cancel/delete session
   */
  static async cancelSession(sessionId: string, reason?: string): Promise<void> {
    try {
      console.log(`🚫 Cancelling session ${sessionId}. Reason: ${reason || 'User request'}`);
      
      await updateDoc(doc(db, this.COLLECTION_NAME, sessionId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
        cancellationReason: reason
      });
      
      // Schedule cleanup after a short delay
      setTimeout(() => {
        this.cleanupSession(sessionId);
      }, 30000); // 30 seconds delay
      
      console.log(`✅ Session ${sessionId} cancelled`);
    } catch (error) {
      console.error('❌ Error cancelling session:', error);
      throw error;
    }
  }

  /**
   * Clean up expired or completed sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      const expiredQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('expiresAt', '<', Timestamp.fromDate(now)),
        where('status', 'in', ['waiting', 'matched'])
      );
      
      const snapshot = await getDocs(expiredQuery);
      
      for (const doc of snapshot.docs) {
        await this.cleanupSession(doc.id);
      }
      
      if (snapshot.docs.length > 0) {
        console.log(`🧹 Cleaned up ${snapshot.docs.length} expired sessions`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Validate session creation requirements
   */
  private static async validateSessionCreation(
    sessionType: SessionType,
    playerId: string,
    configuration: SessionConfiguration
  ): Promise<void> {
    // Check for duplicate active sessions
    const activeSessionsQuery = query(
      collection(db, this.COLLECTION_NAME),
      where('hostData.playerId', '==', playerId),
      where('status', 'in', ['waiting', 'matched', 'active'])
    );
    
    const activeSnapshot = await getDocs(activeSessionsQuery);
    if (activeSnapshot.docs.length > 0) {
      throw new Error('Player already has an active session');
    }
    
    // Validate ranked eligibility
    if (sessionType === 'ranked' || configuration.requireActiveRanked) {
      const userProfile = await UserService.getUserProfile(playerId);
      if (!userProfile || userProfile.rankedStatus !== 'Ranked - Active') {
        throw new Error('Player is not eligible for ranked games');
      }
    }
    
    // Additional validations can be added here
  }

  /**
   * Validate session join conditions
   */
  private static validateSessionJoin(session: GameSession, playerId: string): void {
    if (session.status !== 'waiting') {
      throw new Error('Session is not available for joining');
    }
    
    if (session.hostData.playerId === playerId) {
      throw new Error('Cannot join own session');
    }
    
    if (session.opponentData) {
      throw new Error('Session is already full');
    }
    
    if (session.gameConfiguration.allowedPlayerIds) {
      if (!session.gameConfiguration.allowedPlayerIds.includes(playerId)) {
        throw new Error('Player is not allowed to join this session');
      }
    }
    
    // Check expiration
    if (new Date() > session.expiresAt) {
      throw new Error('Session has expired');
    }
  }

  /**
   * Check if session is suitable for player
   */
  private static isSessionSuitableForPlayer(
    session: GameSession,
    playerData: SessionPlayerData,
    skillRange?: { min: number; max: number }
  ): boolean {
    // Don't match with self
    if (session.hostData.playerId === playerData.playerId) {
      return false;
    }
    
    // Check allowed players list
    if (session.gameConfiguration.allowedPlayerIds) {
      return session.gameConfiguration.allowedPlayerIds.includes(playerData.playerId);
    }
    
    // Check skill range for ranked games
    if (session.sessionType === 'ranked' && skillRange && session.gameConfiguration.skillRange) {
      const hostSkillLevel = this.getPlayerSkillLevel(session.hostData);
      const playerSkillLevel = this.getPlayerSkillLevel(playerData);
      
      const skillDifference = Math.abs(hostSkillLevel - playerSkillLevel);
      return skillDifference <= 3; // Max 3 level difference
    }
    
    return true;
  }

  /**
   * Get player skill level (for ranked matching)
   */
  private static getPlayerSkillLevel(playerData: SessionPlayerData): number {
    // This would integrate with ranked stats
    // For now, use a simple calculation based on stats
    const winRate = playerData.playerStats.gamesPlayed > 0 
      ? (playerData.playerStats.matchWins / playerData.playerStats.gamesPlayed) * 100 
      : 50;
    
    return Math.min(10, Math.max(1, Math.floor(winRate / 10) + 1));
  }

  /**
   * Schedule session cleanup
   */
  private static scheduleSessionCleanup(sessionId: string, minutes: number): void {
    setTimeout(async () => {
      try {
        const session = await this.getSession(sessionId);
        if (session && session.status === 'waiting') {
          await this.cancelSession(sessionId, 'Session expired');
        }
      } catch (error) {
        console.error(`❌ Error in scheduled cleanup for session ${sessionId}:`, error);
      }
    }, minutes * 60 * 1000);
  }

  /**
   * Remove player from session
   */
  static async removePlayer(sessionId: string, playerId: string): Promise<boolean> {
    try {
      return await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists()) {
          throw new Error('Session not found');
        }

        const sessionData = sessionDoc.data() as GameSession;
        
        // Remove player from the session
        const updatedParticipants = sessionData.participants.filter(p => p.playerId !== playerId);
        
        // Update session
        transaction.update(sessionRef, {
          participants: updatedParticipants,
          updatedAt: serverTimestamp()
        });

        console.log(`✅ Removed player ${playerId} from session ${sessionId}`);
        return true;
      });
    } catch (error) {
      console.error(`❌ Error removing player from session:`, error);
      return false;
    }
  }

  /**
   * Mark player as ready
   */
  static async markPlayerReady(sessionId: string, playerId: string): Promise<boolean> {
    try {
      return await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists()) {
          throw new Error('Session not found');
        }

        const sessionData = sessionDoc.data() as GameSession;
        
        // Update player ready status
        const updatedParticipants = sessionData.participants.map(p => 
          p.playerId === playerId ? { ...p, ready: true } : p
        );
        
        transaction.update(sessionRef, {
          participants: updatedParticipants,
          updatedAt: serverTimestamp()
        });

        console.log(`✅ Marked player ${playerId} as ready in session ${sessionId}`);
        return true;
      });
    } catch (error) {
      console.error(`❌ Error marking player ready:`, error);
      return false;
    }
  }

  /**
   * Start match from session
   */
  static async startMatch(sessionId: string): Promise<string | null> {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists()) {
          throw new Error('Session not found');
        }

        const sessionData = sessionDoc.data() as GameSession;
        
        // Check if all players are ready
        const allReady = sessionData.participants.every(p => p.ready);
        if (!allReady) {
          throw new Error('Not all players are ready');
        }

        // Update session status to active
        transaction.update(sessionRef, {
          status: 'active',
          startedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        return sessionId; // Use sessionId as matchId for simplicity
      });

      console.log(`🚀 Started match ${result} from session ${sessionId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error starting match:`, error);
      return null;
    }
  }

  /**
   * Complete match
   */
  static async completeMatch(matchId: string, winnerId?: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, matchId);
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists()) {
          throw new Error('Session not found');
        }

        const updateData: any = {
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        if (winnerId) {
          updateData.winnerId = winnerId;
        }

        transaction.update(sessionRef, updateData);
      });

      console.log(`🏁 Completed match ${matchId}`);
    } catch (error) {
      console.error(`❌ Error completing match:`, error);
    }
  }

  /**
   * Get active sessions count
   */
  static async getActiveSessionsCount(): Promise<number> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('❌ Error getting active sessions count:', error);
      return 0;
    }
  }

  /**
   * Get waiting players count
   */
  static async getWaitingPlayersCount(): Promise<number> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('status', '==', 'waiting')
      );
      const snapshot = await getDocs(q);
      
      let totalPlayers = 0;
      snapshot.forEach(doc => {
        const data = doc.data() as GameSession;
        totalPlayers += data.participants.length;
      });
      
      return totalPlayers;
    } catch (error) {
      console.error('❌ Error getting waiting players count:', error);
      return 0;
    }
  }

  /**
   * Delete session document
   */
  private static async cleanupSession(sessionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, sessionId));
      console.log(`🗑️ Cleaned up session ${sessionId}`);
    } catch (error) {
      console.error(`❌ Error cleaning up session ${sessionId}:`, error);
    }
  }
}

// Export singleton instance
export const gameSessionService = GameSessionService;
