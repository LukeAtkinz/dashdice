import { 
  GameSessionService, 
  SessionType, 
  SessionPlayerData,
  SessionConfiguration
} from './gameSessionService';
import { MatchmakingOrchestrator, MatchmakingRequest, MatchmakingResult } from './matchmakingOrchestrator';
import { UserService } from './userService';
import { PlayerHeartbeatService } from './playerHeartbeatService';
import { AbandonedMatchService } from './abandonedMatchService';
import { DatabaseOptimizationService } from './databaseOptimizationService';
import { CDNOptimizationService } from './cdnOptimizationService';

/**
 * NEW UNIFIED MATCHMAKING SERVICE
 * This replaces the old matchmakingService.ts with the new architecture
 */
export class NewMatchmakingService {
  
  /**
   * Initialize the matchmaking system with optimization services
   */
  static initialize(): void {
    console.log('🎯 Initializing Unified Matchmaking System...');
    
    // Initialize optimization services
    DatabaseOptimizationService.initialize();
    CDNOptimizationService.initialize();
    
    // Initialize cleanup services
    PlayerHeartbeatService.initializeCleanupService();
    AbandonedMatchService.initializeCleanupService();
    
    // 🧹 IMPORTANT: Run initial cleanup to remove any stagnant matches from previous sessions
    setTimeout(() => {
      this.performStartupCleanup();
    }, 5000); // Wait 5 seconds for services to fully initialize
    
    console.log('✅ Unified Matchmaking System initialized with optimizations');
  }

  /**
   * Find or create a match (MAIN ENTRY POINT)
   */
  static async findOrCreateMatch(
    userId: string,
    gameMode: string,
    sessionType: SessionType = 'quick',
    options: {
      friendId?: string;
      tournamentId?: string;
      rematchData?: any;
      skillBasedMatching?: boolean;
    } = {}
  ): Promise<MatchmakingResult> {
    try {
      console.log(`🎯 NewMatchmakingService: Finding match for ${userId} - ${sessionType}/${gameMode}`);

      // 🧹 CRITICAL: Clean up any existing matches for this user to prevent duplicates
      await this.cleanupUserMatches(userId);

      // Start heartbeat for the user
      await PlayerHeartbeatService.startHeartbeat(userId);

      // Get user profile with optimized sharding (with fallback)
      let userProfile;
      try {
        userProfile = await DatabaseOptimizationService.getUserFromShard(userId);
      } catch (error) {
        console.warn('Sharding failed, using UserService fallback:', error);
        userProfile = await UserService.getUserProfile(userId);
      }
      
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Create session player data
      const hostData: SessionPlayerData = {
        playerId: userId,
        playerDisplayName: userProfile.displayName || 'Unknown Player',
        playerStats: {
          bestStreak: userProfile.stats?.bestStreak || 0,
          currentStreak: userProfile.stats?.currentStreak || 0,
          gamesPlayed: userProfile.stats?.gamesPlayed || 0,
          matchWins: userProfile.stats?.matchWins || 0
        },
        displayBackgroundEquipped: userProfile.inventory?.displayBackgroundEquipped || {
          name: 'Relax',
          file: CDNOptimizationService.getAssetUrl('backgrounds', 'Relax.png'),
          type: 'image'
        },
        matchBackgroundEquipped: userProfile.inventory?.matchBackgroundEquipped || {
          name: 'Relax',
          file: CDNOptimizationService.getAssetUrl('backgrounds', 'Relax.png'),
          type: 'image'
        },
        ready: false,
        joinedAt: new Date()
      };

      // Create matchmaking request
      const request: MatchmakingRequest = {
        sessionType,
        gameMode,
        hostData,
        friendId: options.friendId,
        tournamentId: options.tournamentId,
        rematchData: options.rematchData,
        skillBasedMatching: options.skillBasedMatching ?? (sessionType === 'ranked')
      };

      // Use the orchestrator to find a match
      const result = await MatchmakingOrchestrator.findMatch(request);

      // Update user's current room if successful
      if (result.success && result.sessionId) {
        await PlayerHeartbeatService.updateCurrentRoom(userId, result.sessionId);
      }

      return result;

    } catch (error) {
      console.error('Error in findOrCreateMatch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Join an existing session
   */
  static async joinSession(userId: string, sessionId: string): Promise<MatchmakingResult> {
    try {
      console.log(`🔗 NewMatchmakingService: ${userId} joining session ${sessionId}`);

      // Start heartbeat for the user
      await PlayerHeartbeatService.startHeartbeat(userId);

      // Get user profile
      const userProfile = await UserService.getUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Create player data
      const playerData: SessionPlayerData = {
        playerId: userId,
        playerDisplayName: userProfile.displayName || 'Unknown Player',
        playerStats: {
          bestStreak: userProfile.stats?.bestStreak || 0,
          currentStreak: userProfile.stats?.currentStreak || 0,
          gamesPlayed: userProfile.stats?.gamesPlayed || 0,
          matchWins: userProfile.stats?.matchWins || 0
        },
        displayBackgroundEquipped: userProfile.inventory?.displayBackgroundEquipped || {
          name: 'Relax',
          file: '/backgrounds/Relax.png',
          type: 'image'
        },
        matchBackgroundEquipped: userProfile.inventory?.matchBackgroundEquipped || {
          name: 'Relax',
          file: '/backgrounds/Relax.png',
          type: 'image'
        },
        ready: false,
        joinedAt: new Date()
      };

      // Join the session
      const success = await GameSessionService.joinSession(sessionId, playerData);

      if (success) {
        // Update user's current room
        await PlayerHeartbeatService.updateCurrentRoom(userId, sessionId);
        
        // Find the waiting room proxy ID for this session
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        
        let proxyRoomId = sessionId; // Default fallback
        
        try {
          const waitingRoomQuery = query(
            collection(db, 'waitingroom'),
            where('sessionProxy', '==', sessionId)
          );
          
          const querySnapshot = await getDocs(waitingRoomQuery);
          
          if (!querySnapshot.empty) {
            proxyRoomId = querySnapshot.docs[0].id;
            console.log(`🔗 Found waiting room proxy ${proxyRoomId} for session ${sessionId}`);
          } else {
            console.log(`⚠️ No waiting room proxy found for session ${sessionId}, using session ID`);
          }
        } catch (error) {
          console.error('Error finding waiting room proxy:', error);
        }
        
        return {
          success: true,
          sessionId,
          roomId: proxyRoomId, // Return the proxy room ID for GameWaitingRoom compatibility
          hasOpponent: true,
          isNewRoom: false
        };
      } else {
        return {
          success: false,
          error: 'Failed to join session'
        };
      }

    } catch (error) {
      console.error('Error joining session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Leave a session and clean up all related documents
   */
  static async leaveSession(userId: string, sessionId: string): Promise<void> {
    try {
      console.log(`🚪 NewMatchmakingService: ${userId} leaving session ${sessionId}`);

      // Remove from game session
      await GameSessionService.removePlayer(sessionId, userId);

      // Clean up waiting room documents (both legacy and unified)
      await this.cleanupWaitingRoomDocuments(userId, sessionId);

      // Clear user's current room and game
      await PlayerHeartbeatService.updateCurrentRoom(userId, null);
      await PlayerHeartbeatService.updateCurrentGame(userId, null);

      // Stop heartbeat if not in any other session
      PlayerHeartbeatService.stopHeartbeat(userId);

      console.log(`✅ NewMatchmakingService: ${userId} successfully left session ${sessionId}`);

    } catch (error) {
      console.error('Error leaving session:', error);
    }
  }

  /**
   * Clean up waiting room documents for a user
   */
  private static async cleanupWaitingRoomDocuments(userId: string, sessionId?: string): Promise<void> {
    try {
      const { db } = await import('./firebase');
      const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');

      console.log(`🧹 NewMatchmakingService: Cleaning up waiting room documents for ${userId}`);

      // Query for waiting room documents where user is host or participant
      const waitingRoomRef = collection(db, 'waitingroom');
      const hostQuery = query(waitingRoomRef, where('hostData.playerId', '==', userId));
      const participantQuery = query(waitingRoomRef, where('participants', 'array-contains-any', [userId]));

      // Clean up documents where user is host
      const hostSnapshot = await getDocs(hostQuery);
      for (const doc of hostSnapshot.docs) {
        console.log(`🗑️ Deleting waiting room document ${doc.id} where ${userId} is host`);
        await deleteDoc(doc.ref);
      }

      // Clean up documents where user is participant
      const participantSnapshot = await getDocs(participantQuery);
      for (const doc of participantSnapshot.docs) {
        console.log(`🗑️ Deleting waiting room document ${doc.id} where ${userId} is participant`);
        await deleteDoc(doc.ref);
      }

      // If sessionId provided, also try direct deletion in case it exists with that ID
      if (sessionId) {
        try {
          const { doc, getDoc, deleteDoc: deleteDocument } = await import('firebase/firestore');
          const waitingRoomDoc = doc(db, 'waitingroom', sessionId);
          const docSnapshot = await getDoc(waitingRoomDoc);
          if (docSnapshot.exists()) {
            console.log(`🗑️ Deleting waiting room document by sessionId: ${sessionId}`);
            await deleteDocument(waitingRoomDoc);
          }
        } catch (error) {
          // Non-critical error, document might not exist
          console.log(`ℹ️ No waiting room document found with sessionId: ${sessionId}`);
        }
      }

      console.log(`✅ NewMatchmakingService: Cleaned up waiting room documents for ${userId}`);

    } catch (error) {
      console.error('Error cleaning up waiting room documents:', error);
    }
  }

  /**
   * 🧹 Clean up ALL existing matches/rooms for a user to prevent duplicates
   * This should be called BEFORE starting any new match search
   */
  private static async cleanupUserMatches(userId: string): Promise<void> {
    try {
      console.log(`🧹 NewMatchmakingService: Cleaning up ALL existing matches for ${userId}`);

      const { db } = await import('./firebase');
      const { collection, query, where, getDocs, deleteDoc, doc, writeBatch } = await import('firebase/firestore');

      let totalCleaned = 0;
      const batch = writeBatch(db);
      const batchLimit = 500; // Firestore batch limit
      let batchOps = 0;

      // Collections to clean up from
      const collectionsToClean = [
        'waitingroom',
        'gameSessions', 
        'matches', 
        'activeGamesSessions'
      ];

      for (const collectionName of collectionsToClean) {
        try {
          const collectionRef = collection(db, collectionName);
          let queries: any[] = [];

          // Different query strategies for different collections
          if (collectionName === 'waitingroom') {
            queries = [
              query(collectionRef, where('hostData.playerId', '==', userId)),
              query(collectionRef, where('hostData.uid', '==', userId))
            ];
          } else if (collectionName === 'gameSessions') {
            // For gameSessions, we need to check participants array manually
            queries = [query(collectionRef)];
          } else if (collectionName === 'matches') {
            queries = [
              query(collectionRef, where('player1.uid', '==', userId)),
              query(collectionRef, where('player2.uid', '==', userId)),
              query(collectionRef, where('hostData.playerId', '==', userId)),
              query(collectionRef, where('opponentData.playerId', '==', userId))
            ];
          } else if (collectionName === 'activeGamesSessions') {
            queries = [query(collectionRef, where('playerId', '==', userId))];
          }

          for (const queryRef of queries) {
            const snapshot = await getDocs(queryRef);
            
            for (const docSnapshot of snapshot.docs) {
              const data = docSnapshot.data() as any;
              let shouldDelete = false;

              // Check if this document involves the user
              if (collectionName === 'gameSessions') {
                // For gameSessions, check participants array manually
                shouldDelete = data.participants?.some((p: any) => 
                  p.playerId === userId || p.uid === userId
                );
              } else {
                shouldDelete = true; // If we got it from the query, it matches
              }

              if (shouldDelete) {
                console.log(`🗑️ Cleaning ${collectionName} document: ${docSnapshot.id}`);
                
                if (batchOps < batchLimit) {
                  batch.delete(docSnapshot.ref);
                  batchOps++;
                } else {
                  // Execute current batch and start a new one
                  await batch.commit();
                  const newBatch = writeBatch(db);
                  newBatch.delete(docSnapshot.ref);
                  batchOps = 1;
                }
                
                totalCleaned++;
              }
            }
          }
        } catch (error) {
          console.error(`⚠️ Error cleaning collection ${collectionName}:`, error);
          // Continue with other collections
        }
      }

      // Commit any remaining batch operations
      if (batchOps > 0) {
        await batch.commit();
      }

      // Also clean up user state
      const userRef = doc(db, 'users', userId);
      const { updateDoc, serverTimestamp } = await import('firebase/firestore');
      
      try {
        await updateDoc(userRef, {
          currentRoom: null,
          currentGame: null,
          status: 'online',
          lastSeen: serverTimestamp()
        });
        console.log(`✅ Cleared user state for ${userId}`);
      } catch (error) {
        console.error(`⚠️ Error updating user state:`, error);
      }

      console.log(`✅ NewMatchmakingService: Cleaned up ${totalCleaned} documents for ${userId}`);

    } catch (error) {
      console.error(`❌ Error in cleanupUserMatches for ${userId}:`, error);
      // Don't throw - this is cleanup, not critical
    }
  }

  /**
   * Check if user is already in a match
   */
  static async checkUserInMatch(userId: string): Promise<{ inMatch: boolean; currentGame?: string; gameMode?: string }> {
    try {
      const { db } = await import('./firebase');
      const { doc, getDoc } = await import('firebase/firestore');

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentGame = userData.currentGame;
        
        if (currentGame) {
          // Try to get game mode from current room or game session
          let gameMode = 'unknown';
          
          // Check current room for game mode
          const currentRoom = userData.currentRoom;
          if (currentRoom) {
            try {
              const sessionDoc = await getDoc(doc(db, 'gameSessions', currentRoom));
              if (sessionDoc.exists()) {
                gameMode = sessionDoc.data()?.gameMode || 'unknown';
              }
            } catch (error) {
              console.log('Could not fetch game mode from session');
            }
          }

          return {
            inMatch: true,
            currentGame,
            gameMode
          };
        }
      }

      return { inMatch: false };
    } catch (error) {
      console.error('Error checking user match status:', error);
      return { inMatch: false };
    }
  }

  /**
   * Force leave current match (with loss penalty)
   */
  static async forceLeaveMatch(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🏃‍♂️ NewMatchmakingService: Force leaving match for ${userId}`);

      const { db } = await import('./firebase');
      const { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } = await import('firebase/firestore');

      // Get user's current game info
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }

      const userData = userDoc.data();
      const currentGame = userData.currentGame;
      const currentRoom = userData.currentRoom;

      // Record the loss for leaving
      await this.recordMatchAbandonLoss(userId);

      // Clean up user state
      await updateDoc(userRef, {
        currentGame: null,
        currentRoom: null,
        status: 'online',
        lastSeen: serverTimestamp()
      });

      // Clean up session if exists
      if (currentRoom) {
        try {
          await this.cleanupWaitingRoomDocuments(userId, currentRoom);
          await GameSessionService.removePlayer(currentRoom, userId);
        } catch (error) {
          console.log('Session cleanup error (non-critical):', error);
        }
      }

      // Stop heartbeat
      PlayerHeartbeatService.stopHeartbeat(userId);

      console.log(`✅ NewMatchmakingService: Successfully force left match for ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('Error force leaving match:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Record a loss for abandoning a match
   */
  private static async recordMatchAbandonLoss(userId: string): Promise<void> {
    try {
      const { db } = await import('./firebase');
      const { doc, updateDoc, increment } = await import('firebase/firestore');

      console.log(`📊 Recording abandon loss for ${userId}`);

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'stats.gamesPlayed': increment(1),
        'stats.currentStreak': 0, // Reset streak for abandoning
        'rankedStats.losses': increment(1),
        'rankedStats.rating': increment(-25) // Penalty for leaving
      });

      console.log(`✅ Recorded abandon loss for ${userId}`);
    } catch (error) {
      console.error('Error recording abandon loss:', error);
    }
  }
  static async cancelMatchmaking(userId: string): Promise<void> {
    try {
      console.log(`❌ NewMatchmakingService: Canceling matchmaking for ${userId}`);

      // Clear user's current room
      await PlayerHeartbeatService.updateCurrentRoom(userId, null);

      // Stop heartbeat
      PlayerHeartbeatService.stopHeartbeat(userId);

    } catch (error) {
      console.error('Error canceling matchmaking:', error);
    }
  }

  /**
   * Get session information
   */
  static async getSessionInfo(sessionId: string) {
    try {
      return await GameSessionService.getSession(sessionId);
    } catch (error) {
      console.error('Error getting session info:', error);
      return null;
    }
  }

  /**
   * Mark player as ready
   */
  static async markPlayerReady(sessionId: string, userId: string): Promise<boolean> {
    try {
      console.log(`✅ NewMatchmakingService: Marking ${userId} as ready in ${sessionId}`);
      
      const success = await GameSessionService.markPlayerReady(sessionId, userId);
      
      if (success) {
        // Send heartbeat to indicate activity
        await PlayerHeartbeatService.sendHeartbeat(userId, sessionId);
      }
      
      return success;

    } catch (error) {
      console.error('Error marking player ready:', error);
      return false;
    }
  }

  /**
   * Start a match from a session
   */
  static async startMatch(sessionId: string): Promise<string | null> {
    try {
      console.log(`🚀 NewMatchmakingService: Starting match from session ${sessionId}`);
      
      const matchId = await GameSessionService.startMatch(sessionId);
      
      if (matchId) {
        // Update all players' current game
        const session = await GameSessionService.getSession(sessionId);
        if (session?.participants) {
          for (const player of session.participants) {
            await PlayerHeartbeatService.updateCurrentGame(player.playerId, matchId);
          }
        }
      }
      
      return matchId;

    } catch (error) {
      console.error('Error starting match:', error);
      return null;
    }
  }

  /**
   * Complete a match
   */
  static async completeMatch(matchId: string, winnerId?: string): Promise<void> {
    try {
      console.log(`🏁 NewMatchmakingService: Completing match ${matchId}`);
      
      await GameSessionService.completeMatch(matchId, winnerId);
      
      // Clear players' current game status
      // This would be handled by the GameSessionService internally

    } catch (error) {
      console.error('Error completing match:', error);
    }
  }

  /**
   * Get active sessions count
   */
  static async getActiveSessionsCount(): Promise<number> {
    try {
      return await GameSessionService.getActiveSessionsCount();
    } catch (error) {
      console.error('Error getting active sessions count:', error);
      return 0;
    }
  }

  /**
   * Get waiting players count
   */
  static async getWaitingPlayersCount(): Promise<number> {
    try {
      return await GameSessionService.getWaitingPlayersCount();
    } catch (error) {
      console.error('Error getting waiting players count:', error);
      return 0;
    }
  }

  /**
   * Cleanup abandoned sessions (manual trigger)
   */
  static async cleanupAbandonedSessions(): Promise<void> {
    try {
      console.log('🧹 NewMatchmakingService: Triggering manual cleanup...');
      
      // Trigger both existing abandoned match cleanup and new orphaned session cleanup
      const [abandonedResult, orphanedResult] = await Promise.allSettled([
        AbandonedMatchService.forceCleanup(),
        import('./orphanedSessionCleanupService').then(({ OrphanedSessionCleanupService }) => 
          OrphanedSessionCleanupService.runManualCleanup()
        )
      ]);

      if (abandonedResult.status === 'fulfilled') {
        console.log('✅ Abandoned match cleanup completed');
      } else {
        console.error('❌ Abandoned match cleanup failed:', abandonedResult.reason);
      }

      if (orphanedResult.status === 'fulfilled') {
        console.log('✅ Orphaned session cleanup completed:', orphanedResult.value);
      } else {
        console.error('❌ Orphaned session cleanup failed:', orphanedResult.reason);
      }

    } catch (error) {
      console.error('Error during manual cleanup:', error);
    }
  }

  /**
   * Get system statistics
   */
  static async getSystemStats(): Promise<{
    activePlayers: number;
    activeSessions: number;
    waitingPlayers: number;
    abandonedMatches: any;
    orphanedSessions?: any;
    queueStats?: any;
  }> {
    try {
      const [activePlayers, activeSessions, waitingPlayers, abandonedMatches, orphanedSessions, queueStats] = await Promise.all([
        PlayerHeartbeatService.getActivePlayersCount(),
        this.getActiveSessionsCount(),
        this.getWaitingPlayersCount(),
        AbandonedMatchService.getAbandonedMatchesStats(24),
        import('./orphanedSessionCleanupService').then(({ OrphanedSessionCleanupService }) => 
          OrphanedSessionCleanupService.getOrphanedSessionStats(24)
        ).catch(() => null),
        import('./advancedQueueManagementService').then(({ AdvancedQueueManagementService }) => 
          AdvancedQueueManagementService.getQueueStatistics()
        ).catch(() => null)
      ]);

      return {
        activePlayers,
        activeSessions,
        waitingPlayers,
        abandonedMatches,
        orphanedSessions,
        queueStats
      };

    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        activePlayers: 0,
        activeSessions: 0,
        waitingPlayers: 0,
        abandonedMatches: { total: 0, byReason: {}, byGameMode: {}, averageDuration: 0 }
      };
    }
  }

  /**
   * Create a match between two specific friends
   */
  static async createFriendMatch(
    hostUserId: string,
    guestUserId: string,
    gameMode: string,
    gameType: 'quick' | 'ranked' = 'quick'
  ): Promise<MatchmakingResult> {
    try {
      console.log('👥 NewMatchmakingService: Creating friend match', {
        host: hostUserId,
        guest: guestUserId,
        gameMode,
        gameType
      });

      // Get both user profiles
      const [hostProfile, guestProfile] = await Promise.all([
        UserService.getUserProfile(hostUserId),
        UserService.getUserProfile(guestUserId)
      ]);

      if (!hostProfile || !guestProfile) {
        return {
          success: false,
          error: 'One or both user profiles not found'
        };
      }

      // Convert profiles to player data using the correct format
      const hostData: SessionPlayerData = {
        playerId: hostUserId,
        playerDisplayName: hostProfile.displayName || 'Unknown Player',
        playerStats: {
          bestStreak: hostProfile.stats?.bestStreak || 0,
          currentStreak: hostProfile.stats?.currentStreak || 0,
          gamesPlayed: hostProfile.stats?.gamesPlayed || 0,
          matchWins: hostProfile.stats?.matchWins || 0
        },
        displayBackgroundEquipped: hostProfile.inventory?.displayBackgroundEquipped || {
          name: 'Relax',
          file: '/backgrounds/Relax.png',
          type: 'image'
        },
        matchBackgroundEquipped: hostProfile.inventory?.matchBackgroundEquipped || {
          name: 'Relax',
          file: '/backgrounds/Relax.png',
          type: 'image'
        },
        ready: true,
        joinedAt: new Date()
      };

      // Create session configuration for friend match
      const sessionConfig: SessionConfiguration = {
        maxPlayers: 2,
        allowedPlayerIds: [hostUserId, guestUserId],
        expirationTime: 60 // 60 minutes for friend matches (extra long)
      };

      // Create the session using GameSessionService
      const sessionId = await GameSessionService.createSession(
        'friend',
        gameMode,
        hostData,
        sessionConfig
      );

      console.log('✅ Created friend session:', sessionId, 'Now adding guest player...');

      // Add a small delay to ensure session is fully created before joining
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now add the guest player to the session
      const guestData: SessionPlayerData = {
        playerId: guestUserId,
        playerDisplayName: guestProfile.displayName || 'Unknown Player',
        playerStats: {
          bestStreak: guestProfile.stats?.bestStreak || 0,
          currentStreak: guestProfile.stats?.currentStreak || 0,
          gamesPlayed: guestProfile.stats?.gamesPlayed || 0,
          matchWins: guestProfile.stats?.matchWins || 0
        },
        displayBackgroundEquipped: guestProfile.inventory?.displayBackgroundEquipped || {
          name: 'Relax',
          file: '/backgrounds/Relax.png',
          type: 'image'
        },
        matchBackgroundEquipped: guestProfile.inventory?.matchBackgroundEquipped || {
          name: 'Relax',
          file: '/backgrounds/Relax.png',
          type: 'image'
        },
        ready: true,
        joinedAt: new Date()
      };

      console.log('🔄 Adding guest player to session...', { sessionId, guestUserId });

      // Join the guest to the session
      const joinResult = await GameSessionService.joinSession(sessionId, guestData);
      
      if (!joinResult.success) {
        return {
          success: false,
          error: 'Failed to add friend to session'
        };
      }

      // Update heartbeat for both players
      await Promise.all([
        PlayerHeartbeatService.updateCurrentRoom(hostUserId, sessionId),
        PlayerHeartbeatService.updateCurrentRoom(guestUserId, sessionId)
      ]);

      console.log('✅ Friend match created successfully:', sessionId);
      
      // Create a waiting room entry for the optimistic UI experience
      console.log('🎭 Creating friend invitation waiting room for optimistic UI...');
      
      let waitingRoomId = sessionId; // Default fallback
      
      try {
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        
        const waitingRoomData = {
          gameMode,
          gameType: 'Friend Match',
          playersRequired: 0, // Both players already confirmed
          createdAt: serverTimestamp(),
          friendInvitation: true, // Mark as friend invitation room
          readyPlayers: [hostUserId, guestUserId], // Both players are ready by default
          sessionProxy: sessionId, // Reference to the actual game session
          hostData: {
            playerDisplayName: hostData.playerDisplayName,
            playerId: hostData.playerId,
            displayBackgroundEquipped: hostData.displayBackgroundEquipped,
            matchBackgroundEquipped: hostData.matchBackgroundEquipped,
            playerStats: hostData.playerStats
          },
          opponentData: {
            playerDisplayName: guestData.playerDisplayName,
            playerId: guestData.playerId,
            displayBackgroundEquipped: guestData.displayBackgroundEquipped,
            matchBackgroundEquipped: guestData.matchBackgroundEquipped,
            playerStats: guestData.playerStats
          },
          gameData: {
            type: 'dice',
            settings: {}
          }
        };

        const waitingRoomRef = await addDoc(collection(db, 'waitingroom'), waitingRoomData);
        waitingRoomId = waitingRoomRef.id;
        console.log('✅ Created friend invitation waiting room:', waitingRoomId);
      } catch (error) {
        console.error('⚠️ Failed to create waiting room for friend match:', error);
        // Use session ID as fallback if waiting room creation fails
      }
      
      return {
        success: true,
        sessionId: sessionId, // Return actual session ID for match navigation
        roomId: waitingRoomId, // Return waiting room ID for UI display
        isNewRoom: true,
        hasOpponent: true
      };

    } catch (error) {
      console.error('❌ Error creating friend match:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🧹 Perform startup cleanup to remove stagnant matches from previous sessions
   * This prevents the 20+ stagnant matches issue
   */
  private static async performStartupCleanup(): Promise<void> {
    try {
      console.log('🧹 NewMatchmakingService: Performing startup cleanup of stagnant matches...');

      const { db } = await import('./firebase');
      const { collection, getDocs, deleteDoc, writeBatch } = await import('firebase/firestore');

      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000));
      const batch = writeBatch(db);
      let batchOps = 0;
      let totalCleaned = 0;

      // Collections to clean up
      const collectionsToClean = ['waitingroom', 'gameSessions', 'matches'];

      for (const collectionName of collectionsToClean) {
        try {
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(collectionRef);
          
          console.log(`🔍 Checking ${collectionName}: ${snapshot.docs.length} documents`);

          for (const doc of snapshot.docs) {
            const data = doc.data() as any;
            const createdAt = data.createdAt?.toDate() || new Date(0);
            const lastActivity = data.lastActivity?.toDate() || data.updatedAt?.toDate() || createdAt;

            // If document is older than 10 minutes, clean it
            if (createdAt < tenMinutesAgo && lastActivity < tenMinutesAgo) {
              const ageMinutes = Math.round((now.getTime() - createdAt.getTime()) / 60000);
              console.log(`🗑️ Cleaning stagnant ${collectionName} document: ${doc.id} (${ageMinutes}min old)`);

              if (batchOps < 500) {
                batch.delete(doc.ref);
                batchOps++;
              } else {
                await batch.commit();
                const newBatch = writeBatch(db);
                newBatch.delete(doc.ref);
                batchOps = 1;
              }

              totalCleaned++;
            }
          }
        } catch (error) {
          console.error(`⚠️ Error cleaning ${collectionName} during startup:`, error);
        }
      }

      // Commit remaining operations
      if (batchOps > 0) {
        await batch.commit();
      }

      console.log(`✅ Startup cleanup completed: ${totalCleaned} stagnant documents removed`);

      // Also trigger the regular cleanup services
      if (totalCleaned > 0) {
        console.log('🔧 Triggering additional cleanup services...');
        await Promise.allSettled([
          AbandonedMatchService.forceCleanup(),
          this.cleanupAbandonedSessions()
        ]);
      }

    } catch (error) {
      console.error('❌ Error during startup cleanup:', error);
      // Don't throw - this is cleanup, app should still start
    }
  }
}