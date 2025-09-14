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
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { UserService } from './userService';
import { SessionStateValidator } from './sessionStateValidator';

// Core session types
export type SessionType = 'quick' | 'ranked' | 'friend' | 'tournament' | 'rematch';
export type SessionStatus = 'waiting' | 'matched' | 'active' | 'completed' | 'cancelled' | 'expired' | 'abandoned';

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
  
  // 🔌 Connection tracking for disconnection handling
  isConnected?: boolean;
  lastHeartbeat?: Date;
  disconnectedAt?: Date;
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
  
  // 🔒 Session Locking & Version Control
  version: number; // Incremented on each update to prevent conflicts
  isLocked?: boolean; // Temporarily locked during join/leave operations
  lockedAt?: Date; // When the session was locked
  lockedBy?: string; // Player ID who locked the session
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  lastActivityAt?: Date; // 🕐 Track latest player activity for timeout extension
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
  
  // 🕐 Enhanced timeout configuration
  private static readonly TIMEOUT_RULES = {
    waiting: 10,     // 10 minutes for waiting sessions
    matched: 30,     // 30 minutes for matched sessions
    active: 120,     // 2 hours for active games
    completed: 60    // 1 hour to keep completed sessions for stats
  };
  
  // 🧹 Cleanup intervals
  private static readonly CLEANUP_INTERVAL_MINUTES = 5; // Run cleanup every 5 minutes
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * 🚀 Initialize the GameSession service with background cleanup
   * Call this when your application starts
   */
  static initialize(): void {
    console.log('🚀 Initializing GameSessionService...');
    this.startBackgroundCleanup();
    
    // 🚫 Initialize matchmaking deduplication cleanup
    try {
      setInterval(() => {
        // Import and clean up deduplication service periodically
        import('./matchmakingDeduplicationService').then(({ MatchmakingDeduplicationService }) => {
          // Trigger internal cleanup by checking stats (which calls cleanupExpiredRequests)
          MatchmakingDeduplicationService.getStats();
        }).catch(error => {
          console.warn('⚠️ Could not clean up matchmaking deduplication service:', error);
        });
      }, 60000); // Clean up every minute
    } catch (error) {
      console.warn('⚠️ Could not initialize matchmaking deduplication cleanup:', error);
    }
    
    // Register cleanup on process exit
    process.on('SIGINT', () => {
      console.log('🛑 Shutting down GameSessionService...');
      this.stopBackgroundCleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down GameSessionService...');
      this.stopBackgroundCleanup();
      process.exit(0);
    });
  }

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
      
      // 🔒 Use atomic transaction to prevent duplicate session creation
      const result = await runTransaction(db, async (transaction) => {
        // ✅ Fast check using PlayerStateService first (if available)
        let hasExistingSession = false;
        let existingSessionInfo = '';
        
        try {
          const { PlayerStateService } = await import('./playerStateService');
          const playerState = await PlayerStateService.getPlayerState(hostData.playerId);
          
          if (playerState && playerState.currentSessionId && 
              ['searching', 'waiting', 'matched', 'playing'].includes(playerState.currentStatus)) {
            hasExistingSession = true;
            existingSessionInfo = `Player in ${playerState.currentStatus} state with session ${playerState.currentSessionId} (${playerState.currentSessionType})`;
          }
        } catch (stateError) {
          console.warn('⚠️ PlayerStateService check failed, falling back to direct query:', stateError);
        }
        
        // ✅ If PlayerStateService indicates existing session, verify with direct query
        // OR if PlayerStateService unavailable, do direct query
        if (hasExistingSession || !hasExistingSession) { // Always do direct query for safety
          const hostSessionsQuery = query(
            collection(db, this.COLLECTION_NAME),
            where('hostData.playerId', '==', hostData.playerId),
            where('status', 'in', ['waiting', 'matched', 'active'])
          );
          
          const hostSnapshot = await getDocs(hostSessionsQuery);
          const hostSessions = hostSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              type: data.sessionType,
              status: data.status,
              gameMode: data.gameMode,
              role: 'host'
            };
          });
          
          // 🚫 Prevent duplicate sessions (except for friend sessions which can override)
          if (hostSessions.length > 0 && sessionType !== 'friend') {
            console.log(`🚫 Player ${hostData.playerId} already hosts ${hostSessions.length} active sessions:`, hostSessions);
            if (existingSessionInfo) {
              console.log(`📊 PlayerState info: ${existingSessionInfo}`);
            }
            throw new Error(`Player already hosts ${hostSessions.length} active session(s). Cannot create duplicate sessions.`);
          } else if (hostSessions.length > 0 && sessionType === 'friend') {
            // For friend sessions, log existing sessions but allow creation
            console.log(`🤝 Friend session creation: Player ${hostData.playerId} has ${hostSessions.length} existing host sessions that will be overridden:`, hostSessions);
          }
        }
        
        // ✅ If we get here, no duplicate sessions exist - proceed with creation
        const timeoutMinutes = this.TIMEOUT_RULES.waiting; // Use state-specific timeout
        const expiresAt = new Date(Date.now() + (timeoutMinutes * 60 * 1000));
        
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
          
          // 🔒 Initialize version control and locking
          version: 1, // Start at version 1
          isLocked: false, // Initially unlocked
          
          // 🕐 Enhanced timeout tracking
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivityAt: new Date(), // Initialize with creation time
          expiresAt
        };

        // 🆕 Create session within transaction
        const sessionRef = doc(collection(db, this.COLLECTION_NAME));
        transaction.set(sessionRef, {
          ...sessionData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastActivityAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiresAt)
        });
        
        console.log(`✅ ATOMIC: Session ${sessionRef.id} creation queued in transaction`);
        return sessionRef.id;
      });
      
      // 🎯 Validate session creation requirements (after atomic check)
      await this.validateSessionCreation(sessionType, hostData.playerId, configuration);
      
      console.log(`✅ Created session ${result} of type ${sessionType}`);
      
      // 🎯 Update player state to track session
      try {
        const { PlayerStateService } = await import('./playerStateService');
        await PlayerStateService.setPlayerInSession(
          hostData.playerId, 
          result, 
          sessionType, 
          gameMode, 
          'waiting'
        );
        console.log(`✅ Updated player state for ${hostData.playerId} in ${sessionType} session`);
      } catch (stateError) {
        console.warn('⚠️ Failed to update player state:', stateError);
      }
      
      // Start enhanced timeout management (background cleanup handles this now)
      // Keep fallback timer for redundancy
      this.scheduleSessionCleanup(result, this.TIMEOUT_RULES.waiting);
      
      return result;
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
          lastActivityAt: sessionData.lastActivityAt?.toDate(),
          matchedAt: sessionData.matchedAt?.toDate(),
          completedAt: sessionData.completedAt?.toDate()
        } as GameSession;
        
        // Validate join conditions
        this.validateSessionJoin(session, playerData.playerId);
        
        // 🔄 Validate state transition: waiting → matched
        const stateValidation = SessionStateValidator.validateStateChange(
          sessionId,
          session.status,
          'matched',
          {
            sessionId,
            playerId: playerData.playerId,
            participantCount: session.participants.length + 1,
            sessionType: session.sessionType,
            gameMode: session.gameMode,
            reason: 'player_joined'
          }
        );
        
        if (!stateValidation.valid) {
          throw new Error(`Invalid state transition: ${stateValidation.reason}`);
        }
        
        if (stateValidation.warnings && stateValidation.warnings.length > 0) {
          console.warn(`⚠️ State transition warnings:`, stateValidation.warnings);
        }
        
        // 🔒 Check version and locking for consistency
        if (session.isLocked) {
          throw new Error(`Session is locked by ${session.lockedBy}`);
        }
        
        // Update session with opponent data and participants
        const updatedParticipants = [...session.participants, {
          ...playerData,
          joinedAt: new Date()
        }];
        
        const currentVersion = session.version;
        const newVersion = currentVersion + 1;
        
        const updatedSession: Partial<GameSession> = {
          status: 'matched',
          opponentData: {
            ...playerData,
            joinedAt: new Date()
          },
          participants: updatedParticipants,
          matchedAt: new Date(),
          updatedAt: new Date(),
          version: newVersion // Increment version to prevent conflicts
        };
        
        transaction.update(sessionRef, {
          ...updatedSession,
          matchedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastActivityAt: serverTimestamp(), // 🕐 Track activity for timeout extension
          version: newVersion
        });
        
        console.log(`✅ Player ${playerData.playerId} joined session ${sessionId} (v${currentVersion} → v${newVersion})`);
        
        return { 
          success: true, 
          session: { ...session, ...updatedSession } as GameSession
        };
      });

      // 🎯 Update player states after successful join
      if (result.success && result.session) {
        try {
          const { PlayerStateService } = await import('./playerStateService');
          
          // Update joining player state
          await PlayerStateService.setPlayerMatched(
            playerData.playerId,
            sessionId,
            result.session.hostData.playerId
          );
          
          // Update host player state
          await PlayerStateService.setPlayerMatched(
            result.session.hostData.playerId,
            sessionId,
            playerData.playerId
          );
          
          console.log(`✅ Updated player states for matched session ${sessionId}`);
        } catch (stateError) {
          console.warn('⚠️ Failed to update player states:', stateError);
        }
      }

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
   * ATOMIC: Find and join a session in a single transaction to prevent race conditions
   * This replaces the separate findAvailableSessions + joinSession pattern
   */
  static async findAndJoinSession(
    sessionType: SessionType,
    gameMode: string,
    playerData: SessionPlayerData,
    skillRange?: { min: number; max: number }
  ): Promise<{ success: boolean; session?: GameSession; error?: string }> {
    try {
      console.log(`🔍🔒 ATOMIC: Finding and joining ${sessionType} session for ${playerData.playerId}`);
      
      // 🎯 Validate player state before attempting to join
      try {
        const { PlayerStateService } = await import('./playerStateService');
        const canJoin = await PlayerStateService.validateSessionTypeAccess(playerData.playerId, sessionType);
        if (!canJoin) {
          return {
            success: false,
            error: `Player ${playerData.playerId} cannot join ${sessionType} session due to existing session type conflict`
          };
        }
        console.log(`✅ Player state validation passed for ${playerData.playerId}`);
      } catch (stateError) {
        console.warn('⚠️ Failed to validate player state, continuing:', stateError);
      }
      
      // Use a transaction to atomically find and join a session
      const result = await runTransaction(db, async (transaction) => {
        // Query for available sessions
        const queryConstraints = [
          where('sessionType', '==', sessionType),
          where('gameMode', '==', gameMode),
          where('status', '==', 'waiting'),
          orderBy('createdAt', 'asc'),
          firestoreLimit(10)
        ];
        
        const q = query(collection(db, this.COLLECTION_NAME), ...queryConstraints);
        const snapshot = await getDocs(q);
        
        console.log(`📊 ATOMIC: Found ${snapshot.docs.length} potential sessions`);
        
        let selectedSession: GameSession | null = null;
        let selectedSessionRef: any = null;
        
        // Find the first suitable session within the transaction
        for (const docSnapshot of snapshot.docs) {
          const sessionRef = doc(db, this.COLLECTION_NAME, docSnapshot.id);
          
          // Re-read the session within transaction to ensure consistency
          const freshSessionDoc = await transaction.get(sessionRef);
          
          if (!freshSessionDoc.exists()) {
            console.log(`⏭️ Session ${docSnapshot.id} no longer exists`);
            continue;
          }
          
          const freshSessionData = freshSessionDoc.data();
          
          // Convert to GameSession object
          const session: GameSession = {
            id: docSnapshot.id,
            ...freshSessionData,
            createdAt: freshSessionData.createdAt.toDate(),
            updatedAt: freshSessionData.updatedAt.toDate(),
            expiresAt: freshSessionData.expiresAt.toDate(),
            lastActivityAt: freshSessionData.lastActivityAt?.toDate(),
            matchedAt: freshSessionData.matchedAt?.toDate(),
            completedAt: freshSessionData.completedAt?.toDate()
          } as GameSession;
          
          // Check if session is still available and suitable
          try {
            this.validateSessionJoin(session, playerData.playerId);
            
            // 🔒 Check if session is locked by another operation
            if (session.isLocked) {
              console.log(`🔒 Session ${session.id} is locked by ${session.lockedBy}, skipping`);
              continue;
            }
            
            // Additional suitability check
            if (this.isSessionSuitableForPlayer(session, playerData, skillRange)) {
              selectedSession = session;
              selectedSessionRef = sessionRef;
              console.log(`✅ ATOMIC: Selected session ${session.id} (version ${session.version})`);
              break;
            } else {
              console.log(`❌ Session ${session.id} not suitable`);
            }
          } catch (error) {
            console.log(`❌ Session ${session.id} validation failed: ${error}`);
            continue;
          }
        }
        
        if (!selectedSession || !selectedSessionRef) {
          throw new Error('No suitable sessions available');
        }
        
        // 🔒 Atomically lock, update version, and join the selected session
        const updatedParticipants = [...selectedSession.participants, {
          ...playerData,
          joinedAt: new Date()
        }];
        
        const currentVersion = selectedSession.version;
        const newVersion = currentVersion + 1;
        
        const updatedSession: Partial<GameSession> = {
          status: 'matched',
          opponentData: {
            ...playerData,
            joinedAt: new Date()
          },
          participants: updatedParticipants,
          matchedAt: new Date(),
          updatedAt: new Date(),
          version: newVersion, // Increment version to prevent conflicts
          isLocked: false, // Unlock after successful operation
          lockedAt: undefined,
          lockedBy: undefined
        };
        
        // Update with version check to prevent conflicts
        transaction.update(selectedSessionRef, {
          status: 'matched',
          opponentData: updatedSession.opponentData as any,
          participants: updatedParticipants as any,
          matchedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastActivityAt: serverTimestamp(), // 🕐 Track activity for timeout extension
          version: newVersion,
          isLocked: false
        });
        
        console.log(`✅ ATOMIC: Successfully joined session ${selectedSession.id} (v${currentVersion} → v${newVersion})`);
        
        return {
          success: true,
          session: { ...selectedSession, ...updatedSession } as GameSession
        };
      });
      
      // Handle post-transaction operations (same as joinSession)
      if (result.success && result.session) {
        // 🎯 Update player states after successful join
        try {
          const { PlayerStateService } = await import('./playerStateService');
          
          // Update joining player state
          await PlayerStateService.setPlayerMatched(
            playerData.playerId,
            result.session.id,
            result.session.hostData.playerId
          );
          
          // Update host player state
          await PlayerStateService.setPlayerMatched(
            result.session.hostData.playerId,
            result.session.id,
            playerData.playerId
          );
          
          console.log(`✅ ATOMIC: Updated player states for matched session ${result.session.id}`);
        } catch (stateError) {
          console.warn('⚠️ ATOMIC: Failed to update player states:', stateError);
        }
        
        // Update waiting room proxy
        try {
          const { SessionCompatibilityService } = await import('./sessionCompatibilityService');
          await SessionCompatibilityService.updateWaitingRoomProxy(result.session.id);
          console.log(`✅ ATOMIC: Updated waiting room proxy for session ${result.session.id}`);
        } catch (error) {
          console.error('⚠️ ATOMIC: Failed to update waiting room proxy:', error);
        }

        // Create match document for compatibility
        if (result.session.status === 'matched') {
          try {
            const matchId = await this.createMatchFromSession(result.session.id);
            if (matchId) {
              console.log(`✅ ATOMIC: Auto-created match document ${matchId} for session ${result.session.id}`);
            }
          } catch (error) {
            console.error('⚠️ ATOMIC: Failed to create match document:', error);
          }
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ ATOMIC: Error in findAndJoinSession:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🔒 Lock a session temporarily during critical operations
   */
  static async lockSession(sessionId: string, playerId: string): Promise<boolean> {
    try {
      return await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists()) {
          throw new Error('Session not found');
        }

        const sessionData = sessionDoc.data() as GameSession;
        
        if (sessionData.isLocked) {
          console.log(`🔒 Session ${sessionId} already locked by ${sessionData.lockedBy}`);
          return false;
        }

        transaction.update(sessionRef, {
          isLocked: true,
          lockedAt: serverTimestamp(),
          lockedBy: playerId,
          version: sessionData.version + 1,
          updatedAt: serverTimestamp()
        });

        console.log(`🔒 Locked session ${sessionId} for player ${playerId}`);
        return true;
      });
    } catch (error) {
      console.error(`❌ Error locking session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * 🔓 Unlock a session after critical operations
   */
  static async unlockSession(sessionId: string, playerId: string): Promise<boolean> {
    try {
      return await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists()) {
          throw new Error('Session not found');
        }

        const sessionData = sessionDoc.data() as GameSession;
        
        if (!sessionData.isLocked || sessionData.lockedBy !== playerId) {
          console.log(`🔓 Session ${sessionId} not locked by ${playerId}, cannot unlock`);
          return false;
        }

        transaction.update(sessionRef, {
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          version: sessionData.version + 1,
          updatedAt: serverTimestamp()
        });

        console.log(`🔓 Unlocked session ${sessionId} by player ${playerId}`);
        return true;
      });
    } catch (error) {
      console.error(`❌ Error unlocking session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * 🧹 Clean up expired locks (sessions locked for more than 30 seconds)
   */
  static async cleanupExpiredLocks(): Promise<void> {
    try {
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      
      const lockedSessionsQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('isLocked', '==', true),
        where('lockedAt', '<', Timestamp.fromDate(thirtySecondsAgo))
      );
      
      const snapshot = await getDocs(lockedSessionsQuery);
      console.log(`🧹 Found ${snapshot.docs.length} expired locks to clean up`);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        const sessionRef = doc.ref;
        batch.update(sessionRef, {
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          updatedAt: serverTimestamp()
        });
      });
      
      if (snapshot.docs.length > 0) {
        await batch.commit();
        console.log(`🧹 Cleaned up ${snapshot.docs.length} expired session locks`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up expired locks:', error);
    }
  }

  /**
   * Find available sessions for matchmaking (NON-ATOMIC - prefer findAndJoinSession)
   * @deprecated Use findAndJoinSession() to prevent race conditions
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
          lastActivityAt: sessionData.lastActivityAt?.toDate(),
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
        lastActivityAt: sessionData.lastActivityAt?.toDate(),
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
      
      // Get current session to validate state transition
      const sessionDoc = await getDoc(doc(db, this.COLLECTION_NAME, sessionId));
      if (!sessionDoc.exists()) {
        console.log(`⚠️ Session ${sessionId} not found for cancellation`);
        return;
      }
      
      const sessionData = sessionDoc.data() as GameSession;
      
      // 🔄 Validate state transition to 'cancelled'
      const stateValidation = SessionStateValidator.validateStateChange(
        sessionId,
        sessionData.status,
        'cancelled',
        {
          sessionId,
          playerId: 'system', // System-initiated cancellation
          participantCount: sessionData.participants?.length || 0,
          sessionType: sessionData.sessionType,
          gameMode: sessionData.gameMode,
          reason: reason || 'user_request'
        }
      );
      
      if (!stateValidation.valid) {
        console.warn(`⚠️ State transition warning for cancellation: ${stateValidation.reason}`);
        // Continue with cancellation anyway for system cleanup, but log the warning
      }
      
      await updateDoc(doc(db, this.COLLECTION_NAME, sessionId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
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
   * � Centralized state transition validation and execution
   */
  static async validateAndTransitionState(
    sessionId: string,
    newState: SessionStatus,
    context: {
      playerId: string;
      reason: string;
      participantCount?: number;
      sessionType?: string;
      gameMode?: string;
      additionalUpdates?: any;
    }
  ): Promise<{
    success: boolean;
    reason?: string;
    warnings?: string[];
  }> {
    try {
      // Get current session
      const session = await this.getSession(sessionId);
      if (!session) {
        return {
          success: false,
          reason: 'Session not found'
        };
      }
      
      // Validate state transition
      const stateValidation = SessionStateValidator.validateStateChange(
        sessionId,
        session.status,
        newState,
        {
          sessionId,
          playerId: context.playerId,
          participantCount: context.participantCount || session.participants.length,
          sessionType: context.sessionType || session.sessionType,
          gameMode: context.gameMode || session.gameMode,
          reason: context.reason
        }
      );
      
      if (!stateValidation.valid) {
        return {
          success: false,
          reason: stateValidation.reason
        };
      }
      
      // Perform the state transition
      const updates = {
        status: newState,
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        ...(context.additionalUpdates || {})
      };
      
      await updateDoc(doc(db, this.COLLECTION_NAME, sessionId), updates);
      
      console.log(`✅ State transition successful: ${session.status} → ${newState} for session ${sessionId}`);
      
      return {
        success: true,
        warnings: stateValidation.warnings
      };
      
    } catch (error) {
      console.error(`❌ Error in state transition for session ${sessionId}:`, error);
      return {
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * �🕐 Enhanced timeout management - extends session activity based on state and interactions
   */
  static async extendSessionTimeout(sessionId: string, newActivity: boolean = true): Promise<void> {
    try {
      if (!newActivity) return;
      
      const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        console.log(`⚠️ Cannot extend timeout for non-existent session ${sessionId}`);
        return;
      }
      
      const sessionData = sessionDoc.data() as GameSession;
      const timeoutMinutes = this.TIMEOUT_RULES[sessionData.status as keyof typeof this.TIMEOUT_RULES] || this.DEFAULT_EXPIRATION_MINUTES;
      const newExpiresAt = new Date(Date.now() + (timeoutMinutes * 60 * 1000));
      
      await updateDoc(sessionRef, {
        expiresAt: Timestamp.fromDate(newExpiresAt),
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`🕐 Extended session ${sessionId} timeout to ${newExpiresAt.toISOString()} (${timeoutMinutes} min from now)`);
    } catch (error) {
      console.error(`❌ Error extending session timeout for ${sessionId}:`, error);
    }
  }

  /**
   * 🧹 Enhanced session cleanup with comprehensive expiration logic
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      console.log('🧹 Starting comprehensive session cleanup...');
      
      const now = new Date();
      let cleanedCount = 0;
      
      // 🕐 Clean up expired sessions in different states
      const expiredQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('expiresAt', '<', Timestamp.fromDate(now))
      );
      
      const snapshot = await getDocs(expiredQuery);
      
      for (const docSnapshot of snapshot.docs) {
        const sessionData = docSnapshot.data() as GameSession;
        const sessionId = docSnapshot.id;
        
        try {
          console.log(`🕐 Processing expired session ${sessionId} (status: ${sessionData.status})`);
          
          // Handle different session states differently
          switch (sessionData.status) {
            case 'waiting':
              // Cancel waiting sessions
              await this.cancelSession(sessionId, 'Session expired due to inactivity');
              cleanedCount++;
              break;
              
            case 'matched':
              // Handle matched sessions - give grace period or cancel
              const timeSinceMatched = now.getTime() - (sessionData.matchedAt?.getTime() || sessionData.updatedAt.getTime());
              const gracePeriodMs = 5 * 60 * 1000; // 5 minute grace period
              
              if (timeSinceMatched > gracePeriodMs) {
                await this.cancelSession(sessionId, 'Matched session expired - players failed to start game');
                cleanedCount++;
              } else {
                // Extend for grace period
                await this.extendSessionTimeout(sessionId, false);
                console.log(`⏰ Extended grace period for matched session ${sessionId}`);
              }
              break;
              
            case 'active':
              // Mark active sessions as abandoned
              await this.markSessionAbandoned(sessionId, 'Game abandoned due to inactivity');
              cleanedCount++;
              break;
              
            case 'completed':
              // Archive completed sessions
              await this.archiveSession(sessionId);
              cleanedCount++;
              break;
              
            default:
              // Clean up unknown state sessions
              await this.cleanupSession(sessionId);
              cleanedCount++;
          }
        } catch (sessionError) {
          console.error(`❌ Error processing expired session ${sessionId}:`, sessionError);
        }
      }
      
      // 🧹 Additional cleanup: very old sessions that might have been missed
      await this.cleanupStaleOldSessions();
      
      if (cleanedCount > 0) {
        console.log(`✅ Enhanced cleanup completed: processed ${cleanedCount} expired sessions`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('❌ Error in enhanced session cleanup:', error);
      return 0;
    }
  }

  /**
   * 🗑️ Mark session as abandoned with proper cleanup
   */
  private static async markSessionAbandoned(sessionId: string, reason: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);
        
        if (!sessionDoc.exists()) return;
        
        const sessionData = sessionDoc.data() as GameSession;
        
        // Update session to abandoned state
        transaction.update(sessionRef, {
          status: 'abandoned',
          gameEndReason: reason,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // Preserve for stats but set short expiry
          expiresAt: Timestamp.fromDate(new Date(Date.now() + (24 * 60 * 60 * 1000))) // 24 hours
        });
        
        console.log(`🔄 Marked session ${sessionId} as abandoned: ${reason}`);
        
        // Clean up player states
        for (const participant of sessionData.participants) {
          try {
            const { PlayerStateService } = await import('./playerStateService');
            await PlayerStateService.cleanupPlayerSessions(participant.playerId);
          } catch (stateError) {
            console.warn(`⚠️ Failed to cleanup player state for ${participant.playerId}:`, stateError);
          }
        }
      });
    } catch (error) {
      console.error(`❌ Error marking session ${sessionId} as abandoned:`, error);
    }
  }

  /**
   * 📦 Archive completed session (move to archive or delete based on retention policy)
   */
  private static async archiveSession(sessionId: string): Promise<void> {
    try {
      // For now, just delete completed sessions after retention period
      // In future, could move to separate archive collection
      await this.cleanupSession(sessionId);
      console.log(`📦 Archived (deleted) completed session ${sessionId}`);
    } catch (error) {
      console.error(`❌ Error archiving session ${sessionId}:`, error);
    }
  }

  /**
   * 🧹 Clean up very old sessions that might have been missed
   */
  private static async cleanupStaleOldSessions(): Promise<void> {
    try {
      const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
      
      const oldSessionsQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('createdAt', '<', Timestamp.fromDate(sevenDaysAgo))
      );
      
      const oldSnapshot = await getDocs(oldSessionsQuery);
      
      for (const docSnapshot of oldSnapshot.docs) {
        await this.cleanupSession(docSnapshot.id);
      }
      
      if (oldSnapshot.docs.length > 0) {
        console.log(`🧹 Cleaned up ${oldSnapshot.docs.length} stale old sessions (>7 days)`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up stale old sessions:', error);
    }
  }

  /**
   * ⚡ Start background cleanup process
   */
  static startBackgroundCleanup(): void {
    if (this.cleanupTimer) {
      console.log('🔄 Background cleanup already running');
      return;
    }
    
    console.log(`🚀 Starting background session cleanup (every ${this.CLEANUP_INTERVAL_MINUTES} minutes)`);
    
    // Start orphaned session cleanup service
    import('./orphanedSessionCleanupService').then(({ OrphanedSessionCleanupService }) => {
      OrphanedSessionCleanupService.startCleanupService();
    }).catch(error => {
      console.error('❌ Failed to start orphaned session cleanup service:', error);
    });
    
    // Start advanced queue management system
    import('./advancedQueueManagementService').then(({ AdvancedQueueManagementService }) => {
      AdvancedQueueManagementService.startAdvancedQueueSystem();
    }).catch(error => {
      console.error('❌ Failed to start advanced queue management system:', error);
    });
    
    // Run initial cleanup
    this.cleanupExpiredSessions().catch(error => {
      console.error('❌ Error in initial cleanup:', error);
    });
    
    // Schedule recurring cleanup
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
        await this.cleanupExpiredLocks();
      } catch (error) {
        console.error('❌ Error in background cleanup:', error);
      }
    }, this.CLEANUP_INTERVAL_MINUTES * 60 * 1000);
  }

  /**
   * ⏹️ Stop background cleanup process
   */
  static stopBackgroundCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('⏹️ Stopped background session cleanup');
    }
    
    // Stop orphaned session cleanup service
    import('./orphanedSessionCleanupService').then(({ OrphanedSessionCleanupService }) => {
      OrphanedSessionCleanupService.stopCleanupService();
    }).catch(error => {
      console.error('❌ Error stopping orphaned session cleanup service:', error);
    });
    
    // Stop advanced queue management system
    import('./advancedQueueManagementService').then(({ AdvancedQueueManagementService }) => {
      AdvancedQueueManagementService.stopAdvancedQueueSystem();
    }).catch(error => {
      console.error('❌ Error stopping advanced queue management system:', error);
    });
  }

  /**
   * 📅 Schedule session-specific timeout (fallback for memory-based cleanup)
   * @deprecated Use background cleanup instead for reliability
   */
  private static scheduleSessionCleanup(sessionId: string, minutes: number): void {
    // Keep this as a fallback, but rely primarily on background cleanup
    setTimeout(async () => {
      try {
        const session = await this.getSession(sessionId);
        if (session && ['waiting', 'matched'].includes(session.status)) {
          console.log(`⏰ Fallback timeout triggered for session ${sessionId}`);
          await this.cancelSession(sessionId, 'Session expired (fallback timer)');
        }
      } catch (error) {
        console.error(`❌ Error in fallback cleanup for session ${sessionId}:`, error);
      }
    }, minutes * 60 * 1000);
  }

  /**
   * Validate session creation requirements
   */
  private static async validateSessionCreation(
    sessionType: SessionType,
    playerId: string,
    configuration: SessionConfiguration
  ): Promise<void> {
    // 🎯 Validate session type access with player state tracking
    try {
      const { PlayerStateService } = await import('./playerStateService');
      const validation = await PlayerStateService.validateSessionTypeAccess(playerId, sessionType);
      
      if (!validation.valid) {
        throw new Error(validation.reason || 'Cannot create session due to player state conflict');
      }
      
      console.log(`✅ Player state validation passed for ${playerId} creating ${sessionType} session`);
    } catch (importError) {
      console.warn('⚠️ PlayerStateService not available, falling back to basic validation');
    }

    // 🎯 NOTE: Duplicate session checking is now handled atomically in createSession() transaction
    // This prevents race conditions where multiple createSession calls pass validation simultaneously

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
        
        // 🔒 Check if session is locked
        if (sessionData.isLocked && sessionData.lockedBy !== playerId) {
          throw new Error(`Session is locked by ${sessionData.lockedBy}`);
        }
        
        // Remove player from the session
        const updatedParticipants = sessionData.participants.filter(p => p.playerId !== playerId);
        
        const currentVersion = sessionData.version;
        const newVersion = currentVersion + 1;
        
        // Update session with version increment
        transaction.update(sessionRef, {
          participants: updatedParticipants,
          version: newVersion,
          updatedAt: serverTimestamp()
        });

        console.log(`✅ Removed player ${playerId} from session ${sessionId} (v${currentVersion} → v${newVersion})`);
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
        
        // 🔒 Check if session is locked
        if (sessionData.isLocked && sessionData.lockedBy !== playerId) {
          throw new Error(`Session is locked by ${sessionData.lockedBy}`);
        }
        
        // Update player ready status
        const updatedParticipants = sessionData.participants.map(p => 
          p.playerId === playerId ? { ...p, ready: true } : p
        );
        
        const currentVersion = sessionData.version;
        const newVersion = currentVersion + 1;
        
        transaction.update(sessionRef, {
          participants: updatedParticipants,
          version: newVersion,
          updatedAt: serverTimestamp()
        });

        console.log(`✅ Marked player ${playerId} as ready in session ${sessionId} (v${currentVersion} → v${newVersion})`);
        
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

        const sessionData = sessionDoc.data();
        const startTime = sessionData?.createdAt?.toMillis?.() || sessionData?.startedAt?.toMillis?.();
        const currentTime = Date.now();
        
        // Calculate duration in milliseconds
        const duration = startTime ? currentTime - startTime : 0;

        const updateData: any = {
          status: 'completed',
          completedAt: serverTimestamp(),
          duration: duration, // Duration in milliseconds
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

  /**
   * 🚪 Handle player leaving a session (graceful exit)
   */
  static async leaveSession(sessionId: string, playerId: string, reason: 'quit' | 'disconnect' | 'abandon' = 'quit'): Promise<{
    success: boolean;
    shouldNotifyOpponent?: boolean;
    opponentId?: string;
    sessionEnded?: boolean;
  }> {
    try {
      console.log(`🚪 Player ${playerId} leaving session ${sessionId} (reason: ${reason})`);
      
      return await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists()) {
          console.log(`⚠️ Session ${sessionId} not found - may already be cleaned up`);
          return { success: true, sessionEnded: true };
        }

        const sessionData = sessionDoc.data() as GameSession;
        
        // 🔒 Check if session is locked by another operation
        if (sessionData.isLocked && sessionData.lockedBy !== playerId) {
          throw new Error(`Session is locked by ${sessionData.lockedBy}`);
        }

        // Find the leaving player and opponent
        const leavingPlayerIndex = sessionData.participants.findIndex(p => p.playerId === playerId);
        const opponent = sessionData.participants.find(p => p.playerId !== playerId);
        
        if (leavingPlayerIndex === -1) {
          console.log(`⚠️ Player ${playerId} not found in session ${sessionId}`);
          return { success: true };
        }

        // Determine what to do based on session status and player count
        const remainingParticipants = sessionData.participants.filter(p => p.playerId !== playerId);
        const currentVersion = sessionData.version;
        const newVersion = currentVersion + 1;

        if (remainingParticipants.length === 0) {
          // 🗑️ No players left - delete the session entirely
          console.log(`🗑️ No players remaining, deleting session ${sessionId}`);
          transaction.delete(sessionRef);
          return { 
            success: true, 
            sessionEnded: true
          };
        } else if (sessionData.status === 'matched' && opponent) {
          // 🎮 Game in progress - handle differently based on reason and session type
          if (reason === 'disconnect' && sessionData.sessionType === 'ranked') {
            // 🏆 Ranked match disconnection - opponent wins, update ranking
            console.log(`🏆 Ranked disconnection: ${opponent.playerId} wins by forfeit`);
            
            // 🔄 Validate state transition: matched → completed
            const stateValidation = SessionStateValidator.validateStateChange(
              sessionId,
              sessionData.status,
              'completed',
              {
                sessionId,
                playerId: opponent.playerId,
                participantCount: remainingParticipants.length,
                sessionType: sessionData.sessionType,
                gameMode: sessionData.gameMode,
                reason: 'disconnect'
              }
            );
            
            if (!stateValidation.valid) {
              console.error(`❌ Invalid state transition: ${stateValidation.reason}`);
              throw new Error(`Cannot complete session: ${stateValidation.reason}`);
            }
            
            // Mark session as completed with opponent as winner
            transaction.update(sessionRef, {
              status: 'completed',
              winnerId: opponent.playerId,
              completedAt: serverTimestamp(),
              gameEndReason: `${sessionData.participants[leavingPlayerIndex].playerDisplayName} disconnected`,
              participants: remainingParticipants,
              version: newVersion,
              updatedAt: serverTimestamp(),
              lastActivityAt: serverTimestamp() // 🕐 Track activity
            });

            // 📊 Update ranking for both players (async after transaction)
            setTimeout(async () => {
              await this.handleRankedDisconnection(playerId, opponent.playerId, sessionData.gameMode);
            }, 100);

            return {
              success: true,
              shouldNotifyOpponent: true,
              opponentId: opponent.playerId,
              sessionEnded: true
            };
          } else {
            // 🕐 Non-ranked or graceful quit - mark opponent as waiting or end session
            console.log(`🕐 Match interrupted (${reason}), opponent returned to waiting or session ended`);
            
            if (reason === 'quit') {
              // 🔄 Validate state transition: matched → waiting
              const stateValidation = SessionStateValidator.validateStateChange(
                sessionId,
                sessionData.status,
                'waiting',
                {
                  sessionId,
                  playerId,
                  participantCount: remainingParticipants.length,
                  sessionType: sessionData.sessionType,
                  gameMode: sessionData.gameMode,
                  reason: 'player_left'
                }
              );
              
              if (!stateValidation.valid) {
                console.error(`❌ Invalid state transition: ${stateValidation.reason}`);
                throw new Error(`Cannot return to waiting: ${stateValidation.reason}`);
              }
              
              // Graceful quit - revert to waiting for opponent
              transaction.update(sessionRef, {
                status: 'waiting',
                opponentData: null,
                participants: remainingParticipants,
                matchedAt: null,
                version: newVersion,
                updatedAt: serverTimestamp(),
                lastActivityAt: serverTimestamp() // 🕐 Track activity
              });

              return {
                success: true,
                shouldNotifyOpponent: true,
                opponentId: opponent.playerId,
                sessionEnded: false
              };
            } else {
              // 🔄 Validate state transition: matched/active → abandoned
              const stateValidation = SessionStateValidator.validateStateChange(
                sessionId,
                sessionData.status,
                'abandoned',
                {
                  sessionId,
                  playerId,
                  participantCount: remainingParticipants.length,
                  sessionType: sessionData.sessionType,
                  gameMode: sessionData.gameMode,
                  reason: reason
                }
              );
              
              if (!stateValidation.valid) {
                console.error(`❌ Invalid state transition: ${stateValidation.reason}`);
                throw new Error(`Cannot abandon session: ${stateValidation.reason}`);
              }
              
              // Disconnection - end the session
              transaction.update(sessionRef, {
                status: 'abandoned',
                gameEndReason: `${sessionData.participants[leavingPlayerIndex].playerDisplayName} ${reason === 'disconnect' ? 'disconnected' : 'abandoned'}`,
                participants: remainingParticipants,
                version: newVersion,
                updatedAt: serverTimestamp(),
                lastActivityAt: serverTimestamp() // 🕐 Track activity
              });

              return {
                success: true,
                shouldNotifyOpponent: true,
                opponentId: opponent.playerId,
                sessionEnded: true
              };
            }
          }
        } else {
          // 🕑 Waiting room - just remove the player
          console.log(`🕑 Removing player from waiting session ${sessionId}`);
          
          const updates: any = {
            participants: remainingParticipants,
            version: newVersion,
            updatedAt: serverTimestamp(),
            lastActivityAt: serverTimestamp() // 🕐 Track activity
          };

          // If the leaving player was the host, transfer host to first remaining player
          if (sessionData.hostData.playerId === playerId && remainingParticipants.length > 0) {
            updates.hostData = {
              ...remainingParticipants[0],
              joinedAt: remainingParticipants[0].joinedAt || new Date()
            };
            console.log(`👑 Host ${playerId} left, transferring to ${remainingParticipants[0].playerId}`);
          }

          transaction.update(sessionRef, updates);

          return {
            success: true,
            shouldNotifyOpponent: remainingParticipants.length > 0,
            opponentId: remainingParticipants[0]?.playerId,
            sessionEnded: false
          };
        }
      });

    } catch (error) {
      console.error(`❌ Error handling player leave:`, error);
      return { success: false };
    } finally {
      // 🧹 Clean up player states after leaving session
      try {
        const { PlayerStateService } = await import('./playerStateService');
        await PlayerStateService.cleanupPlayerSessions(playerId);
        console.log(`✅ Cleaned up player state for ${playerId} after leaving session ${sessionId}`);
      } catch (stateError) {
        console.warn('⚠️ Failed to clean up player state:', stateError);
      }
    }
  }

  /**
   * 🔌 Handle player disconnection (detected by client or server)
   */
  static async handlePlayerDisconnection(sessionId: string, playerId: string): Promise<void> {
    try {
      console.log(`🔌 Handling disconnection for player ${playerId} in session ${sessionId}`);
      
      // Mark player as disconnected first
      await this.markPlayerDisconnected(sessionId, playerId);
      
      // Wait briefly to see if they reconnect
      setTimeout(async () => {
        await this.checkAndHandleAbandonedSession(sessionId, playerId);
      }, 30000); // 30-second grace period

    } catch (error) {
      console.error(`❌ Error handling disconnection:`, error);
    }
  }

  /**
   * 🔴 Mark player as disconnected
   */
  static async markPlayerDisconnected(sessionId: string, playerId: string): Promise<boolean> {
    try {
      return await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists()) {
          return false;
        }

        const sessionData = sessionDoc.data() as GameSession;
        
        // Update participant disconnection status
        const updatedParticipants = sessionData.participants.map(p => 
          p.playerId === playerId ? { 
            ...p, 
            isConnected: false, 
            disconnectedAt: new Date() 
          } : p
        );

        // Update host/opponent data if applicable
        const updates: any = {
          participants: updatedParticipants,
          version: sessionData.version + 1,
          updatedAt: serverTimestamp()
        };

        if (sessionData.hostData?.playerId === playerId) {
          updates['hostData.isConnected'] = false;
          updates['hostData.disconnectedAt'] = serverTimestamp();
        }
        if (sessionData.opponentData?.playerId === playerId) {
          updates['opponentData.isConnected'] = false;
          updates['opponentData.disconnectedAt'] = serverTimestamp();
        }

        transaction.update(sessionRef, updates);
        console.log(`🔴 Marked player ${playerId} as disconnected in session ${sessionId}`);
        return true;
      });
    } catch (error) {
      console.error(`❌ Error marking player disconnected:`, error);
      return false;
    }
  }

  /**
   * 🟢 Mark player as reconnected
   */
  static async markPlayerReconnected(sessionId: string, playerId: string): Promise<boolean> {
    try {
      return await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists()) {
          return false;
        }

        const sessionData = sessionDoc.data() as GameSession;
        
        // Update participant connection status
        const updatedParticipants = sessionData.participants.map(p => 
          p.playerId === playerId ? { 
            ...p, 
            isConnected: true,
            disconnectedAt: null,
            lastHeartbeat: new Date()
          } : p
        );

        // Update host/opponent data if applicable
        const updates: any = {
          participants: updatedParticipants,
          version: sessionData.version + 1,
          updatedAt: serverTimestamp()
        };

        if (sessionData.hostData?.playerId === playerId) {
          updates['hostData.isConnected'] = true;
          updates['hostData.disconnectedAt'] = null;
          updates['hostData.lastHeartbeat'] = serverTimestamp();
        }
        if (sessionData.opponentData?.playerId === playerId) {
          updates['opponentData.isConnected'] = true;
          updates['opponentData.disconnectedAt'] = null;
          updates['opponentData.lastHeartbeat'] = serverTimestamp();
        }

        transaction.update(sessionRef, updates);
        console.log(`🟢 Marked player ${playerId} as reconnected in session ${sessionId}`);
        return true;
      });
    } catch (error) {
      console.error(`❌ Error marking player reconnected:`, error);
      return false;
    }
  }

  /**
   * 🕐 Check if session should be abandoned due to prolonged disconnection
   */
  private static async checkAndHandleAbandonedSession(sessionId: string, playerId: string): Promise<void> {
    try {
      const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        return;
      }

      const sessionData = sessionDoc.data() as GameSession;
      const disconnectedParticipant = sessionData.participants.find(p => p.playerId === playerId);
      
      // Check if player is still disconnected after grace period
      if (disconnectedParticipant && !disconnectedParticipant.isConnected) {
        console.log(`🕐 Player ${playerId} still disconnected after grace period, handling as abandonment`);
        await this.leaveSession(sessionId, playerId, 'abandon');
      }
    } catch (error) {
      console.error(`❌ Error checking abandoned session:`, error);
    }
  }

  /**
   * 🏆 Handle ranking updates for ranked match disconnections
   */
  private static async handleRankedDisconnection(disconnectedPlayerId: string, winnerId: string, gameMode: string): Promise<void> {
    try {
      console.log(`🏆 Updating rankings for disconnection: ${winnerId} beats ${disconnectedPlayerId} (forfeit)`);
      
      // TODO: Import and use actual RankedService once it's implemented
      // For now, log the intent for proper ranking updates
      console.log(`📊 RANKING UPDATE NEEDED:`);
      console.log(`  Winner: ${winnerId} should gain ranking points`);
      console.log(`  Disconnected: ${disconnectedPlayerId} should lose ranking points`);
      console.log(`  Game Mode: ${gameMode}`);
      console.log(`  Reason: forfeit/disconnect`);
      
      // Placeholder: Update user stats to track disconnections
      try {
        const { UserService } = await import('./userService');
        
        // Record win for winner (by forfeit)
        await UserService.updateMatchWin(winnerId);
        
        // Record loss for disconnected player
        await UserService.updateMatchLoss(disconnectedPlayerId);
        
        console.log(`✅ Basic stats updated for disconnection`);
      } catch (statsError) {
        console.error(`❌ Error updating basic stats:`, statsError);
      }

    } catch (error) {
      console.error(`❌ Error updating rankings for disconnection:`, error);
    }
  }

  /**
   * 🧹 Clean up sessions with all players disconnected
   */
  static async cleanupAbandonedSessions(): Promise<number> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      // Find sessions where all players are disconnected for more than 5 minutes
      const abandondedQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('status', 'in', ['waiting', 'matched']),
        where('updatedAt', '<', Timestamp.fromDate(fiveMinutesAgo))
      );
      
      const snapshot = await getDocs(abandondedQuery);
      let cleanedCount = 0;
      
      for (const docSnapshot of snapshot.docs) {
        const sessionData = docSnapshot.data() as GameSession;
        
        // Check if all participants are disconnected
        const allDisconnected = sessionData.participants.every(p => 
          !p.isConnected && 
          p.disconnectedAt && 
          new Date(p.disconnectedAt).getTime() < fiveMinutesAgo.getTime()
        );
        
        if (allDisconnected) {
          console.log(`🧹 Cleaning up abandoned session: ${docSnapshot.id}`);
          await this.cleanupSession(docSnapshot.id);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} abandoned sessions`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning up abandoned sessions:', error);
      return 0;
    }
  }

  /**
   * 💓 Update player heartbeat (keep-alive signal)
   */
  static async updatePlayerHeartbeat(sessionId: string, playerId: string): Promise<boolean> {
    try {
      return await runTransaction(db, async (transaction) => {
        const sessionRef = doc(db, this.COLLECTION_NAME, sessionId);
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists()) {
          return false;
        }

        const sessionData = sessionDoc.data() as GameSession;
        
        // Update participant heartbeat
        const updatedParticipants = sessionData.participants.map(p => 
          p.playerId === playerId ? { 
            ...p, 
            lastHeartbeat: new Date(),
            isConnected: true // Ensure they're marked as connected
          } : p
        );

        // Update host/opponent data if applicable
        const updates: any = {
          participants: updatedParticipants,
          version: sessionData.version + 1,
          updatedAt: serverTimestamp()
        };

        if (sessionData.hostData?.playerId === playerId) {
          updates['hostData.lastHeartbeat'] = serverTimestamp();
          updates['hostData.isConnected'] = true;
        }
        if (sessionData.opponentData?.playerId === playerId) {
          updates['opponentData.lastHeartbeat'] = serverTimestamp();
          updates['opponentData.isConnected'] = true;
        }

        transaction.update(sessionRef, updates);
        return true;
      });
    } catch (error) {
      console.error(`❌ Error updating heartbeat:`, error);
      return false;
    }
  }
  /**
   * 📊 Get session state machine information for debugging and monitoring
   */
  static getStateMachineInfo(): {
    stateMachine: any;
    possibleTransitions: (currentState: SessionStatus) => SessionStatus[];
    isTerminalState: (state: SessionStatus) => boolean;
  } {
    return {
      stateMachine: SessionStateValidator.getStateMachineInfo(),
      possibleTransitions: (currentState: SessionStatus) => SessionStateValidator.getPossibleTransitions(currentState),
      isTerminalState: (state: SessionStatus) => SessionStateValidator.isTerminalState(state)
    };
  }
}

// Export singleton instance
export const gameSessionService = GameSessionService;
