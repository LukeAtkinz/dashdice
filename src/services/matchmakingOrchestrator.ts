import { GameSessionService, SessionType, SessionPlayerData } from './gameSessionService';
import { RankedMatchmakingService } from './rankedMatchmakingService';
import { TournamentService } from './tournamentService';
import { UserService } from './userService';
import { RematchService } from './rematchService';
import { GameInvitationService } from './gameInvitationService';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
      
      console.log(`✅ Matchmaking completed in ${result.waitTime}s:`, result);
      return result;
      
    } catch (error) {
      console.error('❌ Matchmaking error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown matchmaking error'
      };
    }
  }

  /**
   * Handle quick match (casual) matchmaking
   */
  private static async handleQuickMatch(request: MatchmakingRequest): Promise<MatchmakingResult> {
    console.log('⚡ Processing quick match request');
    
    // Find existing sessions with enhanced retry logic for race conditions
    let availableSessions = await GameSessionService.findAvailableSessions(
      'quick',
      request.gameMode,
      request.hostData
    );
    
    // Enhanced retry logic with multiple attempts
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelays = [500, 1000, 2000]; // Progressive delays
    
    while (availableSessions.length === 0 && retryCount < maxRetries) {
      const delay = retryDelays[retryCount];
      console.log(`🔄 No sessions found on attempt ${retryCount + 1}, waiting ${delay}ms and retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      availableSessions = await GameSessionService.findAvailableSessions(
        'quick',
        request.gameMode,
        request.hostData
      );
      
      console.log(`🔄 Retry ${retryCount + 1} found ${availableSessions.length} sessions`);
      retryCount++;
    }
    
    if (availableSessions.length > 0) {
      // Join existing session
      const session = availableSessions[0];
      console.log(`🔗 Attempting to join existing session ${session.id}`);
      
      const joinResult = await GameSessionService.joinSession(session.id, request.hostData);
      
      if (joinResult.success) {
        console.log(`✅ Successfully joined session ${session.id}`);
        return {
          success: true,
          sessionId: session.id,
          roomId: session.id, // For compatibility
          isNewRoom: false,
          hasOpponent: true
        };
      } else {
        console.log(`❌ Failed to join session ${session.id}, creating new session instead`);
      }
    }
    
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
    
    let availableSessions = await GameSessionService.findAvailableSessions(
      'ranked',
      request.gameMode,
      request.hostData
      // Removed skillRange parameter entirely
    );
    
    // Enhanced retry logic with multiple attempts  
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelays = [500, 1000, 2000]; // Progressive delays
    
    while (availableSessions.length === 0 && retryCount < maxRetries) {
      const delay = retryDelays[retryCount];
      console.log(`🔄 No ranked sessions found on attempt ${retryCount + 1}, waiting ${delay}ms and retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      availableSessions = await GameSessionService.findAvailableSessions(
        'ranked',
        request.gameMode,
        request.hostData
      );
      
      console.log(`🔄 Ranked retry ${retryCount + 1} found ${availableSessions.length} sessions`);
      retryCount++;
    }
    
    if (availableSessions.length > 0) {
      // Join the first available session (no skill matching)
      const session = availableSessions[0];
      console.log(`🔗 Joining existing ranked session: ${session.id}`);
      const joinResult = await GameSessionService.joinSession(session.id, request.hostData);
      
      if (joinResult.success) {
        return {
          success: true,
          sessionId: session.id,
          roomId: session.id,
          isNewRoom: false,
          hasOpponent: true
        };
      }
    }
    
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
    
    // Check if player already has active sessions (query directly for user sessions)
    const activeSessionsQuery = query(
      collection(db, 'gameSessions'),
      where('hostData.playerId', '==', request.hostData.playerId),
      where('status', 'in', ['waiting', 'matched', 'active'])
    );
    
    const activeSnapshot = await getDocs(activeSessionsQuery);
    if (activeSnapshot.docs.length > 0 && request.sessionType !== 'friend') {
      throw new Error('Player already has an active matchmaking session');
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
