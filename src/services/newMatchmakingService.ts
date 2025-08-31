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

/**
 * NEW UNIFIED MATCHMAKING SERVICE
 * This replaces the old matchmakingService.ts with the new architecture
 */
export class NewMatchmakingService {
  
  /**
   * Initialize the matchmaking system
   */
  static initialize(): void {
    console.log('🎯 Initializing Unified Matchmaking System...');
    
    // Initialize cleanup services
    PlayerHeartbeatService.initializeCleanupService();
    AbandonedMatchService.initializeCleanupService();
    
    console.log('✅ Unified Matchmaking System initialized');
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

      // Start heartbeat for the user
      await PlayerHeartbeatService.startHeartbeat(userId);

      // Get user profile and data
      const userProfile = await UserService.getUserProfile(userId);
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
          file: '/backgrounds/Relax.png',
          type: 'image'
        },
        matchBackgroundEquipped: userProfile.inventory?.matchBackgroundEquipped || {
          name: 'Relax',
          file: '/backgrounds/Relax.png',
          type: 'image'
        },
        ready: false
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
        
        return {
          success: true,
          sessionId,
          roomId: sessionId, // For backward compatibility
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
   * Leave a session
   */
  static async leaveSession(userId: string, sessionId: string): Promise<void> {
    try {
      console.log(`🚪 NewMatchmakingService: ${userId} leaving session ${sessionId}`);

      // Remove from session
      await GameSessionService.removePlayer(sessionId, userId);

      // Clear user's current room
      await PlayerHeartbeatService.updateCurrentRoom(userId, null);

      // Stop heartbeat if not in any other session
      PlayerHeartbeatService.stopHeartbeat(userId);

    } catch (error) {
      console.error('Error leaving session:', error);
    }
  }

  /**
   * Cancel matchmaking
   */
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
      await AbandonedMatchService.forceCleanup();
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
  }> {
    try {
      const [activePlayers, activeSessions, waitingPlayers, abandonedMatches] = await Promise.all([
        PlayerHeartbeatService.getActivePlayersCount(),
        this.getActiveSessionsCount(),
        this.getWaitingPlayersCount(),
        AbandonedMatchService.getAbandonedMatchesStats(24)
      ]);

      return {
        activePlayers,
        activeSessions,
        waitingPlayers,
        abandonedMatches
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
        expirationTime: 30 // 30 minutes for friend matches
      };

      // Create the session using GameSessionService
      const sessionId = await GameSessionService.createSession(
        'friend',
        gameMode,
        hostData,
        sessionConfig
      );

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
      return {
        success: true,
        sessionId: sessionId,
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
}