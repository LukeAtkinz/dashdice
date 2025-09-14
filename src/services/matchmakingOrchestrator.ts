import { GameSessionService, SessionType, SessionPlayerData } from './gameSessionService';
import { RankedMatchmakingService } from './rankedMatchmakingService';
import { TournamentService } from './tournamentService';
import { UserService } from './userService';
import { RematchService } from './rematchService';
import { GameInvitationService } from './gameInvitationService';
import { MatchmakingDeduplicationService } from './matchmakingDeduplicationService';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

// Matchmaking request interface
export interface MatchmakingRequest {
  sessionType: SessionType;
  gameMode: string;
  hostData: SessionPlayerData;
  
  // Optional parameters
  friendId?: string; // For friend invites
  tournamentId?: string; // For tournament matches
  rematchData?: {
    originalMatchId: string;
    opponentId: string;
    opponentDisplayName: string;
  };
  
  // Matchmaking preferences
  skillBasedMatching?: boolean;
  allowSkillGap?: number; // Max level difference for ranked
}

// Matchmaking result
export interface MatchmakingResult {
  success: boolean;
  sessionId?: string;
  roomId?: string; // For compatibility with existing system
  isNewRoom?: boolean;
  hasOpponent?: boolean;
  error?: string;
  waitTime?: number; // Estimated wait time in seconds
}

/**
 * Unified Matchmaking Orchestrator
 * Coordinates all matchmaking types and routes to appropriate services
 */
export class MatchmakingOrchestrator {
  
  /**
   * Main matchmaking entry point
   */
  static async findMatch(request: MatchmakingRequest): Promise<MatchmakingResult> {
    try {
      console.log(`🎯 Starting matchmaking for ${request.sessionType} - ${request.gameMode}`);
      const startTime = Date.now();
      
      // 🚫 Check for duplicate/concurrent requests
      const deduplicationCheck = MatchmakingDeduplicationService.canMakeRequest(
        request.hostData.playerId,
        request.sessionType,
        request.gameMode
      );
      
      if (!deduplicationCheck.allowed) {
        console.log(`🚫 Matchmaking request blocked: ${deduplicationCheck.reason}`);
        return {
          success: false,
          error: deduplicationCheck.reason,
          waitTime: deduplicationCheck.waitTime
        };
      }
      
      // 🎯 Additional validation: Check if player is already in a session
      try {
        const { PlayerStateService } = await import('./playerStateService');
        const playerState = await PlayerStateService.getPlayerState(request.hostData.playerId);
        
        if (playerState && playerState.isInGame && playerState.currentSessionId) {
          console.log(`🚫 Player ${request.hostData.playerId} already in session ${playerState.currentSessionId}`);
          return {
            success: false,
            error: `Already in an active ${playerState.currentSessionType} game. Please finish your current game first.`
          };
        }
        
        if (playerState && playerState.isInQueue && playerState.currentStatus === 'searching') {
          console.log(`🚫 Player ${request.hostData.playerId} already searching via PlayerState`);
          return {
            success: false,
            error: 'Already searching for a match. Please wait or cancel your current search.'
          };
        }
      } catch (stateError) {
        console.warn('⚠️ Could not validate player state:', stateError);
        // Continue with matchmaking if PlayerStateService is unavailable
      }
      
      // 📝 Register the request
      const requestId = MatchmakingDeduplicationService.registerRequest(
        request.hostData.playerId,
        request.sessionType,
        request.gameMode
      );
      
      try {
        // Validate request
        await this.validateMatchmakingRequest(request);
        
        let result: MatchmakingResult;
        
        // Route to appropriate matchmaking service
        switch (request.sessionType) {
          case 'quick':
            result = await this.handleQuickMatch(request);
            break;
            
          case 'ranked':
            result = await this.handleRankedMatch(request);
            break;
            
          case 'friend':
            result = await this.handleFriendMatch(request);
            break;
            
          case 'tournament':
            result = await this.handleTournamentMatch(request);
            break;
            
          case 'rematch':
            result = await this.handleRematch(request);
            break;
            
          default:
            throw new Error(`Unsupported session type: ${request.sessionType}`);
        }
        
        // Calculate wait time
        result.waitTime = Math.round((Date.now() - startTime) / 1000);
        
        // ✅ Complete the request on success
        if (result.success) {
          MatchmakingDeduplicationService.completeRequest(request.hostData.playerId, requestId);
          console.log(`✅ Matchmaking completed in ${result.waitTime}s:`, result);
        } else {
          // ❌ Cancel the request on failure
          MatchmakingDeduplicationService.cancelRequest(request.hostData.playerId, result.error || 'Matchmaking failed');
        }
        
        return result;
        
      } catch (error) {
        // ❌ Cancel the request on exception
        MatchmakingDeduplicationService.cancelRequest(request.hostData.playerId, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Matchmaking error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown matchmaking error'
      };
    }
  }

  /**
   * 🚫 Cancel pending matchmaking request for a player
   */
  static cancelPendingRequest(playerId: string): {
    success: boolean;
    message: string;
  } {
    try {
      const wasCancelled = MatchmakingDeduplicationService.cancelRequest(playerId, 'User cancelled');
      
      if (wasCancelled) {
        return {
          success: true,
          message: 'Matchmaking request cancelled successfully'
        };
      } else {
        return {
          success: false,
          message: 'No active matchmaking request found'
        };
      }
    } catch (error) {
      console.error('❌ Error cancelling matchmaking:', error);
      return {
        success: false,
        message: 'Failed to cancel matchmaking request'
      };
    }
  }

  /**
   * 📊 Get matchmaking status for a player
   */
  static getMatchmakingStatus(playerId: string): {
    hasActiveRequest: boolean;
    request?: {
      sessionType: string;
      gameMode: string;
      timeRemaining: number;
    };
  } {
    try {
      const status = MatchmakingDeduplicationService.getRequestStatus(playerId);
      
      if (status) {
        const timeRemaining = Math.max(0, Math.ceil((status.expiresAt - Date.now()) / 1000));
        return {
          hasActiveRequest: true,
          request: {
            sessionType: status.sessionType,
            gameMode: status.gameMode,
            timeRemaining
          }
        };
      }
      
      return { hasActiveRequest: false };
    } catch (error) {
      console.error('❌ Error getting matchmaking status:', error);
      return { hasActiveRequest: false };
    }
  }

  /**
   * Handle quick match (casual) matchmaking
   */
  private static async handleQuickMatch(request: MatchmakingRequest): Promise<MatchmakingResult> {
    console.log('⚡ Processing quick match request');
    
    // 🔒 ATOMIC: Try to find and join a session atomically to prevent race conditions
    const atomicResult = await GameSessionService.findAndJoinSession(
      'quick',
      request.gameMode,
      request.hostData
    );
    
    if (atomicResult.success && atomicResult.session) {
      console.log(`✅ ATOMIC: Successfully joined session ${atomicResult.session.id}`);
      
      // Convert GameSession to MatchmakingResult format
      return {
        success: true,
        sessionId: atomicResult.session.id,
        roomId: atomicResult.session.id, // For compatibility
        hasOpponent: true,
        isNewRoom: false // Joined existing session
      };
    }
    
    console.log(`🔍 ATOMIC: No available sessions found (${atomicResult.error}), creating new session`);
    
    // Create new session
    console.log('🆕 Creating new session as no suitable sessions found after retries');
    const sessionId = await GameSessionService.createSession(
      'quick',
      request.gameMode,
      request.hostData,
      {
        maxPlayers: 2,
        expirationTime: 20 // 20 minutes
      }
    );
    
    return {
      success: true,
      sessionId,
      roomId: sessionId, // For compatibility
      isNewRoom: true,
      hasOpponent: false
    };
  }

  /**
   * Handle ranked match matchmaking
   */
  private static async handleRankedMatch(request: MatchmakingRequest): Promise<MatchmakingResult> {
    console.log('🏆 Processing ranked match request');
    
    // Validate ranked eligibility
    const eligibility = await RankedMatchmakingService.validateRankedEligibility(request.hostData.playerId);
    if (!eligibility.valid) {
      throw new Error(eligibility.reason || 'Not eligible for ranked matches');
    }

    // Remove skill-based filtering completely to allow all players to connect
    console.log('🔧 DEBUG: Searching for ANY available ranked sessions (no skill filtering)');
    
    // 🔒 ATOMIC: Try to find and join a ranked session atomically
    const atomicResult = await GameSessionService.findAndJoinSession(
      'ranked',
      request.gameMode,
      request.hostData
      // Removed skillRange parameter entirely
    );
    
    if (atomicResult.success && atomicResult.session) {
      console.log(`✅ ATOMIC: Successfully joined ranked session ${atomicResult.session.id}`);
      
      return {
        success: true,
        sessionId: atomicResult.session.id,
        roomId: atomicResult.session.id,
        isNewRoom: false,
        hasOpponent: true
      };
    }
    
    console.log(`🔍 ATOMIC: No available ranked sessions found (${atomicResult.error}), creating new session`);
    
    // Create new ranked session
    console.log('🆕 Creating new ranked session');
    const sessionId = await GameSessionService.createSession(
      'ranked',
      request.gameMode,
      request.hostData,
      {
        maxPlayers: 2,
        expirationTime: 20 // 20 minutes
      }
    );
    
    return {
      success: true,
      sessionId,
      roomId: sessionId,
      isNewRoom: true,
      hasOpponent: false
    };
  }

  /**
   * Handle friend match invitations
   */
  private static async handleFriendMatch(request: MatchmakingRequest): Promise<MatchmakingResult> {
    console.log('👥 Processing friend match request');
    
    if (!request.friendId) {
      throw new Error('Friend ID required for friend matches');
    }
    
    // Check friendship using GameInvitationService helper
    // This will be validated again in the sendGameInvitation call
    
    // Use existing friend invitation system
    try {
      const result = await GameInvitationService.sendGameInvitation(
        request.hostData.playerId,
        request.friendId,
        request.gameMode
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send game invitation');
      }
      
      return {
        success: true,
        sessionId: 'friend-invitation-sent',
        roomId: 'friend-invitation-sent',
        isNewRoom: true,
        hasOpponent: false // Waiting for friend to accept
      };
    } catch (error) {
      throw new Error(`Failed to send friend invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle tournament match creation
   */
  private static async handleTournamentMatch(request: MatchmakingRequest): Promise<MatchmakingResult> {
    console.log('🏆 Processing tournament match request');
    
    if (!request.tournamentId) {
      throw new Error('Tournament ID required for tournament matches');
    }
    
    // Validate tournament registration
    const tournament = await TournamentService.getTournament(request.tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    if (tournament.status !== 'active') {
      throw new Error('Tournament is not active');
    }
    
    // Check if player is registered
    const isRegistered = tournament.participants.some(p => p.playerId === request.hostData.playerId);
    if (!isRegistered) {
      throw new Error('Player is not registered for this tournament');
    }
    
    // Tournament matches are created by the tournament service
    // This endpoint is mainly for validation
    return {
      success: true,
      sessionId: 'tournament-managed',
      roomId: 'tournament-managed',
      isNewRoom: true,
      hasOpponent: false
    };
  }

  /**
   * Handle rematch requests
   */
  private static async handleRematch(request: MatchmakingRequest): Promise<MatchmakingResult> {
    console.log('🔄 Processing rematch request');
    
    if (!request.rematchData) {
      throw new Error('Rematch data required for rematch requests');
    }
    
    const { originalMatchId, opponentId, opponentDisplayName } = request.rematchData;
    
    // Use existing rematch service
    try {
      const rematchRoomId = await RematchService.createRematchRoom(
        request.hostData.playerId,
        request.hostData.playerDisplayName,
        opponentId,
        opponentDisplayName,
        originalMatchId,
        request.gameMode,
        request.sessionType === 'ranked' ? 'ranked' : 'quick'
      );
      
      return {
        success: true,
        sessionId: rematchRoomId,
        roomId: rematchRoomId,
        isNewRoom: true,
        hasOpponent: false // Waiting for opponent to accept
      };
    } catch (error) {
      throw new Error(`Failed to create rematch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get matchmaking statistics
   */
  static async getMatchmakingStats(sessionType: SessionType): Promise<{
    activePlayersCount: number;
    averageWaitTime: number;
    averageMatchQuality: number;
    recommendedGameModes: string[];
  }> {
    try {
      // This would query actual matchmaking data
      // For now, return mock data structure
      return {
        activePlayersCount: 0,
        averageWaitTime: 0,
        averageMatchQuality: 85,
        recommendedGameModes: ['classic', 'quickfire']
      };
    } catch (error) {
      console.error('❌ Error getting matchmaking stats:', error);
      return {
        activePlayersCount: 0,
        averageWaitTime: 0,
        averageMatchQuality: 0,
        recommendedGameModes: []
      };
    }
  }

  /**
   * Cancel matchmaking request
   */
  static async cancelMatchmaking(sessionId: string, playerId: string): Promise<void> {
    try {
      console.log(`🚫 Cancelling matchmaking for session ${sessionId}`);
      
      const session = await GameSessionService.getSession(sessionId);
      if (!session) {
        console.log('Session not found, may already be cleaned up');
        return;
      }
      
      // Verify player ownership
      if (session.hostData.playerId !== playerId && session.opponentData?.playerId !== playerId) {
        throw new Error('Player not authorized to cancel this session');
      }
      
      await GameSessionService.cancelSession(sessionId, 'User cancellation');
      console.log(`✅ Cancelled matchmaking for session ${sessionId}`);
    } catch (error) {
      console.error('❌ Error cancelling matchmaking:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Validate matchmaking request
   */
  private static async validateMatchmakingRequest(request: MatchmakingRequest): Promise<void> {
    // Basic validation
    if (!request.hostData.playerId) {
      throw new Error('Player ID is required');
    }
    
    if (!request.gameMode) {
      throw new Error('Game mode is required');
    }
    
    // Check if player already has active sessions and clean up old ones
    const activeSessionsQuery = query(
      collection(db, 'gameSessions'),
      where('hostData.playerId', '==', request.hostData.playerId),
      where('status', 'in', ['waiting', 'matched', 'active'])
    );
    
    const activeSnapshot = await getDocs(activeSessionsQuery);
    
    if (activeSnapshot.docs.length > 0) {
      // Clean up old sessions that are more than 5 minutes old
      const now = new Date();
      const cleanedSessions = [];
      
      for (const sessionDoc of activeSnapshot.docs) {
        const sessionData = sessionDoc.data();
        const createdAt = sessionData.createdAt?.toDate();
        
        // If session is older than 5 minutes or has no timestamp, clean it up
        if (!createdAt || (now.getTime() - createdAt.getTime()) > (5 * 60 * 1000)) {
          await deleteDoc(sessionDoc.ref);
          cleanedSessions.push(sessionDoc.id);
          console.log(`🧹 Cleaned up stale session: ${sessionDoc.id}`);
        }
      }
      
      // If we still have active sessions after cleanup and it's not a friend game, throw error
      const remainingActiveQuery = query(
        collection(db, 'gameSessions'),
        where('hostData.playerId', '==', request.hostData.playerId),
        where('status', 'in', ['waiting', 'matched', 'active'])
      );
      
      const remainingSnapshot = await getDocs(remainingActiveQuery);
      if (remainingSnapshot.docs.length > 0 && request.sessionType !== 'friend') {
        // Only throw error if sessions are recent (less than 5 minutes old)
        const recentSessions = remainingSnapshot.docs.filter(doc => {
          const sessionData = doc.data();
          const createdAt = sessionData.createdAt?.toDate();
          return createdAt && (now.getTime() - createdAt.getTime()) <= (5 * 60 * 1000);
        });
        
        if (recentSessions.length > 0) {
          throw new Error('Player already has an active matchmaking session');
        }
      }
      
      if (cleanedSessions.length > 0) {
        console.log(`🧹 Cleaned up ${cleanedSessions.length} stale matchmaking sessions`);
      }
    }
    
    // Session type specific validation
    switch (request.sessionType) {
      case 'ranked':
        // Already handled in handleRankedMatch
        break;
        
      case 'friend':
        if (!request.friendId) {
          throw new Error('Friend ID required for friend matches');
        }
        break;
        
      case 'tournament':
        if (!request.tournamentId) {
          throw new Error('Tournament ID required for tournament matches');
        }
        break;
        
      case 'rematch':
        if (!request.rematchData) {
          throw new Error('Rematch data required for rematch requests');
        }
        break;
    }
  }

  /**
   * Find best skill-matched session
   */
  private static findBestSkillMatch(sessions: any[], playerSkillLevel: number): any {
    if (sessions.length === 1) {
      return sessions[0];
    }
    
    // Calculate skill differences and find closest match
    return sessions.reduce((best, current) => {
      const currentHostLevel = this.getSessionSkillLevel(current);
      const bestHostLevel = this.getSessionSkillLevel(best);
      
      const currentDiff = Math.abs(currentHostLevel - playerSkillLevel);
      const bestDiff = Math.abs(bestHostLevel - playerSkillLevel);
      
      return currentDiff < bestDiff ? current : best;
    });
  }

  /**
   * Get skill level from session
   */
  private static getSessionSkillLevel(session: any): number {
    // Extract skill level from session host data
    const winRate = session.hostData.playerStats.gamesPlayed > 0 
      ? (session.hostData.playerStats.matchWins / session.hostData.playerStats.gamesPlayed) * 100 
      : 50;
    
    return Math.min(10, Math.max(1, Math.floor(winRate / 10) + 1));
  }
}

// Export singleton instance
export const matchmakingOrchestrator = MatchmakingOrchestrator;
