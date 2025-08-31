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
  getDocs,
  Unsubscribe,
  Timestamp
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
        ...(tournamentData && { tournamentData }),
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
      
      const result = await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);
        
        if (!sessionDoc.exists()) {
          throw new Error('Session not found');
        }
        
        const sessionData = sessionDoc.data();
        
        // Convert Firestore timestamps to Date objects
        const session: GameSession = {
          id: sessionId,
          ...sessionData,
          createdAt: sessionData.createdAt.toDate(),
          updatedAt: sessionData.updatedAt.toDate(),
          expiresAt: sessionData.expiresAt.toDate(),
          matchedAt: sessionData.matchedAt?.toDate(),
          completedAt: sessionData.completedAt?.toDate()
        } as GameSession;
        
        // Validate join conditions
        this.validateSessionJoin(session, playerData.playerId);
        
        // Update session with opponent data and participants
        const updatedParticipants = [...session.participants, {
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
          session: { ...session, ...updatedSession } as GameSession
        };
      });

      // Update waiting room proxy immediately after successful transaction
      try {
        const { SessionCompatibilityService } = await import('./sessionCompatibilityService');
        await SessionCompatibilityService.updateWaitingRoomProxy(sessionId);
        console.log(`✅ Updated waiting room proxy for session ${sessionId}`);
      } catch (error) {
        console.error('⚠️ Failed to update waiting room proxy:', error);
        // Don't fail the join operation if proxy update fails
      }

      // Create match document for compatibility with legacy match system
      if (result.success && result.session?.status === 'matched') {
        try {
          const matchId = await this.createMatchFromSession(sessionId);
          if (matchId) {
            console.log(`✅ Auto-created match document ${matchId} for session ${sessionId}`);
          }
        } catch (error) {
          console.error('⚠️ Failed to create match document:', error);
          // Don't fail the join operation if match creation fails
        }
      }

      return result;
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
      console.log(`🔍 Searching for ${sessionType} sessions in ${gameMode}`, {
        searchingPlayerId: playerData.playerId,
        sessionType,
        gameMode
      });
      
      // Primary query: Look for waiting sessions
      let queryConstraints = [
        where('sessionType', '==', sessionType),
        where('gameMode', '==', gameMode),
        where('status', '==', 'waiting'),
        orderBy('createdAt', 'asc'),
        firestoreLimit(10)
      ];
      
      const q = query(collection(db, this.COLLECTION_NAME), ...queryConstraints);
      const snapshot = await getDocs(q);
      
      console.log(`📊 Primary query returned ${snapshot.docs.length} total sessions`);
      
      // If no results, try a broader search without status filter
      if (snapshot.docs.length === 0) {
        console.log(`🔍 No sessions found with primary query, trying broader search...`);
        
        const broadQueryConstraints = [
          where('sessionType', '==', sessionType),
          where('gameMode', '==', gameMode),
          orderBy('createdAt', 'desc'),
          firestoreLimit(5)
        ];
        
        const broadQuery = query(collection(db, this.COLLECTION_NAME), ...broadQueryConstraints);
        const broadSnapshot = await getDocs(broadQuery);
        
        console.log(`📊 Broad query returned ${broadSnapshot.docs.length} total sessions of any status`);
        
        if (broadSnapshot.docs.length > 0) {
          broadSnapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`🔍 Found session ${doc.id} with status: ${data.status}, participants: ${data.participants?.length || 0}`);
          });
        }
      }
      
      const sessions: GameSession[] = [];
      const rejectedSessions: any[] = [];
      
      snapshot.docs.forEach(doc => {
        const sessionData = doc.data();
        
        console.log(`🔍 Examining session ${doc.id}:`, {
          sessionType: sessionData.sessionType,
          gameMode: sessionData.gameMode,
          status: sessionData.status,
          hostId: sessionData.hostData?.playerId,
          participantCount: sessionData.participants?.length || 0,
          maxPlayers: sessionData.gameConfiguration?.maxPlayers,
          createdAt: sessionData.createdAt
        });
        
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
        
        // Apply additional filtering (now without skill restrictions)
        if (this.isSessionSuitableForPlayer(session, playerData, skillRange)) {
          sessions.push(session);
          console.log(`✅ Session ${doc.id} is suitable`);
        } else {
          rejectedSessions.push({
            id: doc.id,
            reason: 'Failed suitability check'
          });
          console.log(`❌ Session ${doc.id} rejected by suitability check`);
        }
      });
      
      console.log(`📋 Found ${sessions.length} suitable sessions out of ${snapshot.docs.length} total`);
      if (rejectedSessions.length > 0) {
        console.log(`🚫 Rejected sessions:`, rejectedSessions);
      }
      
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
   * Create a match document from a session (for compatibility with legacy match system)
   */
  static async createMatchFromSession(sessionId: string): Promise<string | null> {
    try {
      console.log(`🎮 Creating match document from session ${sessionId}`);
      
      const session = await this.getSession(sessionId);
      if (!session) {
        console.error('❌ Session not found for match creation');
        return null;
      }

      if (!session.hostData || !session.opponentData) {
        console.error('❌ Session missing host or opponent data');
        return null;
      }

      // Create match document in matches collection for compatibility
      const matchData = {
        gameMode: session.gameMode,
        gameType: session.sessionType === 'ranked' ? 'Ranked' : 'Open Server',
        rankedGame: session.sessionType === 'ranked',
        sessionId: sessionId, // Reference back to the session
        originalRoomId: sessionId, // For compatibility with waiting room searches
        status: 'active',
        currentPlayer: 'host', // Default starting player
        // Add required gameData field
        gameData: {
          type: session.gameMode,
          settings: {},
          turnDecider: 1, // 1 = host starts
          turnScore: 0,
          diceOne: 0,
          diceTwo: 0,
          roundObjective: 10000, // Default objective
          startingScore: 0,
          status: 'active',
          startedAt: serverTimestamp(),
          
          // Pregame fields
          isPregame: false,
          
          // Enhanced game state
          gamePhase: 'turnDecider',
          isRolling: false,
          hasDoubleMultiplier: false,
          trueGritMultiplier: 1
        },
        hostData: {
          ...session.hostData,
          playerId: session.hostData.playerId,
          playerDisplayName: session.hostData.playerDisplayName,
          displayBackgroundEquipped: session.hostData.displayBackgroundEquipped,
          matchBackgroundEquipped: session.hostData.matchBackgroundEquipped,
          playerStats: session.hostData.playerStats,
          // Game-specific fields with defaults
          turnActive: true, // Host starts first
          playerScore: 0,
          roundScore: 0,
          isConnected: true,
          matchStats: {
            banks: 0,
            doubles: 0,
            biggestTurnScore: 0,
            lastDiceSum: 0
          }
        },
        opponentData: {
          ...session.opponentData,
          playerId: session.opponentData.playerId,
          playerDisplayName: session.opponentData.playerDisplayName,
          displayBackgroundEquipped: session.opponentData.displayBackgroundEquipped,
          matchBackgroundEquipped: session.opponentData.matchBackgroundEquipped,
          playerStats: session.opponentData.playerStats,
          // Game-specific fields with defaults
          turnActive: false, // Opponent waits for host
          playerScore: 0,
          roundScore: 0,
          isConnected: true,
          matchStats: {
            banks: 0,
            doubles: 0,
            biggestTurnScore: 0,
            lastDiceSum: 0
          }
        },
        createdAt: serverTimestamp(),
        lastMoveAt: serverTimestamp(),
        // Remove duplicate fields since they're now in gameData
        // hostScore: 0,
        // opponentScore: 0,
        // round: 1,
        // hostDiceValues: [],
        // opponentDiceValues: [],
        // winner: null
      };

      const matchRef = await addDoc(collection(db, 'matches'), matchData);
      console.log(`✅ Created match document ${matchRef.id} from session ${sessionId}`);
      
      return matchRef.id;
    } catch (error) {
      console.error('❌ Error creating match from session:', error);
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
    // For friend sessions, skip the duplicate active session check
    // Friend invitations should be able to override existing sessions
    if (sessionType === 'friend') {
      console.log('🤝 Skipping duplicate session check for friend invitation');
      
      // Still validate ranked eligibility if required
      if (configuration.requireActiveRanked) {
        const userProfile = await UserService.getUserProfile(playerId);
        if (!userProfile || userProfile.rankedStatus !== 'Ranked - Active') {
          throw new Error('Player is not eligible for ranked games');
        }
      }
      return;
    }
    
    // For non-friend sessions, check for duplicate active sessions
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
    
    // For friend sessions, be more lenient with expiration
    if (session.sessionType === 'friend') {
      console.log('🤝 Skipping strict expiration check for friend session');
      // Allow a bit more grace time for friend sessions
      const graceTime = 5 * 60 * 1000; // 5 minutes grace
      const expiresAtDate = session.expiresAt instanceof Date ? session.expiresAt : (session.expiresAt as any).toDate();
      if (new Date() > new Date(expiresAtDate.getTime() + graceTime)) {
        throw new Error('Session has expired');
      }
    } else {
      // Check expiration normally for non-friend sessions
      const expiresAtDate = session.expiresAt instanceof Date ? session.expiresAt : (session.expiresAt as any).toDate();
      if (new Date() > expiresAtDate) {
        throw new Error('Session has expired');
      }
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
    console.log(`🔍 Checking session suitability for ${session.id}:`, {
      sessionId: session.id,
      hostId: session.hostData?.playerId,
      playerId: playerData.playerId,
      sessionType: session.sessionType,
      gameMode: session.gameMode,
      status: session.status,
      participantCount: session.participants?.length || 0,
      maxPlayers: session.gameConfiguration?.maxPlayers || 2,
      allowedPlayerIds: session.gameConfiguration?.allowedPlayerIds || []
    });
    
    // Don't match with self
    if (session.hostData?.playerId === playerData.playerId) {
      console.log(`❌ Rejected: Same player (${playerData.playerId})`);
      return false;
    }
    
    // Check if session is already full
    const currentParticipants = session.participants?.length || 0;
    const maxPlayers = session.gameConfiguration?.maxPlayers || 2;
    if (currentParticipants >= maxPlayers) {
      console.log(`❌ Rejected: Session full (${currentParticipants}/${maxPlayers})`);
      return false;
    }
    
    // Check allowed players list
    if (session.gameConfiguration?.allowedPlayerIds && session.gameConfiguration.allowedPlayerIds.length > 0) {
      const isAllowed = session.gameConfiguration.allowedPlayerIds.includes(playerData.playerId);
      console.log(`🔐 Allowed players check: ${isAllowed}`, {
        allowedIds: session.gameConfiguration.allowedPlayerIds,
        checkingId: playerData.playerId
      });
      return isAllowed;
    }
    
    // REMOVED: Skill range checking to allow all players to connect
    // Players should be able to play against anyone for better connectivity
    if (session.sessionType === 'ranked' && skillRange && session.gameConfiguration?.skillRange) {
      console.log(`🔧 DEBUG: Skipping skill range check to allow all players to connect`);
      // Always return true for skill check now
    }
    
    console.log(`✅ Session ${session.id} is suitable for player ${playerData.playerId}`);
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
        
        // Update waiting room proxy to reflect ready status change
        try {
          const { SessionCompatibilityService } = await import('./sessionCompatibilityService');
          await SessionCompatibilityService.updateWaitingRoomProxy(sessionId);
        } catch (error) {
          console.error('⚠️ Failed to update waiting room proxy for ready status:', error);
        }
        
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
