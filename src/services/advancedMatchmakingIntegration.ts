import { NewMatchmakingService } from './newMatchmakingService';
import { SkillBasedMatchmakingService, SkillRating } from './skillBasedMatchmaking';
import { MatchmakingQueueService, QueueEntry } from './matchmakingQueue';
import { EnhancedTournamentService } from './enhancedTournamentService';
import { SessionPlayerData } from './gameSessionService';
import { UserService } from './userService';

export interface AdvancedMatchmakingOptions {
  useSkillBasedMatching?: boolean;
  usePriorityQueue?: boolean;
  tournamentMode?: boolean;
  preferredGameMode?: string;
  maxWaitTime?: number;
  skillRange?: number;
  teamBalancing?: boolean;
}

export interface MatchmakingResult {
  success: boolean;
  sessionId?: string;
  roomId?: string;
  matchType: 'quick' | 'skill-based' | 'queue' | 'tournament' | 'private';
  waitTime?: number;
  opponentInfo?: {
    playerId: string;
    displayName: string;
    skillRating?: number;
    estimatedMatchQuality?: number;
  };
  error?: string;
}

export interface MatchmakingStatus {
  inQueue: boolean;
  queuePosition?: number;
  estimatedWaitTime?: number;
  queueType?: string;
  skillRating?: number;
  activeSession?: string;
  tournamentId?: string;
}

export class AdvancedMatchmakingIntegration {
  /**
   * Enhanced matchmaking with multiple strategies
   */
  static async findMatch(
    playerData: SessionPlayerData,
    options: AdvancedMatchmakingOptions = {}
  ): Promise<MatchmakingResult> {
    try {
      const {
        useSkillBasedMatching = false,
        usePriorityQueue = false,
        tournamentMode = false,
        preferredGameMode = 'classic',
        maxWaitTime = 300000,
        skillRange = 200
      } = options;

      console.log(`🎯 Starting advanced matchmaking for ${playerData.playerId}`);

      // Tournament mode
      if (tournamentMode) {
        return await this.handleTournamentMatchmaking(playerData, options);
      }

      // Priority queue system
      if (usePriorityQueue) {
        return await this.handleQueueMatchmaking(playerData, options);
      }

      // Skill-based matchmaking
      if (useSkillBasedMatching) {
        return await this.handleSkillBasedMatchmaking(playerData, options);
      }

      // Default quick matchmaking
      return await this.handleQuickMatchmaking(playerData, options);

    } catch (error) {
      console.error('❌ Advanced matchmaking error:', error);
      return {
        success: false,
        matchType: 'quick',
        error: 'Matchmaking service unavailable'
      };
    }
  }

  /**
   * Handle tournament matchmaking
   */
  private static async handleTournamentMatchmaking(
    playerData: SessionPlayerData,
    options: AdvancedMatchmakingOptions
  ): Promise<MatchmakingResult> {
    console.log('🏆 Tournament matchmaking not yet implemented');
    return {
      success: false,
      matchType: 'tournament',
      error: 'Tournament matchmaking coming soon'
    };
  }

  /**
   * Handle queue-based matchmaking
   */
  private static async handleQueueMatchmaking(
    playerData: SessionPlayerData,
    options: AdvancedMatchmakingOptions
  ): Promise<MatchmakingResult> {
    try {
      // Check if already in queue
      const queueStatus = await MatchmakingQueueService.getQueueStatus(
        playerData.playerId,
        options.preferredGameMode || 'classic',
        'quick'
      );
      
      if (queueStatus && queueStatus.position > 0) {
        return {
          success: false,
          matchType: 'queue',
          error: `In queue, position: ${queueStatus.position}, estimated wait: ${Math.round(queueStatus.estimatedWaitTime / 1000)}s`
        };
      } else {
        // Join queue
        const queueId = await MatchmakingQueueService.joinQueue(
          playerData.playerId,
          playerData,
          options.preferredGameMode || 'classic',
          'quick',
          {
            maxWaitTime: options.maxWaitTime || 300000,
            skillTolerance: 'balanced'
          }
        );

        if (queueId) {
          return {
            success: false,
            matchType: 'queue',
            error: 'Added to matchmaking queue'
          };
        } else {
          return {
            success: false,
            matchType: 'queue',
            error: 'Failed to join queue'
          };
        }
      }
    } catch (error) {
      console.error('❌ Queue matchmaking error:', error);
      return {
        success: false,
        matchType: 'queue',
        error: 'Queue system unavailable'
      };
    }
  }

  /**
   * Handle skill-based matchmaking
   */
  private static async handleSkillBasedMatchmaking(
    playerData: SessionPlayerData,
    options: AdvancedMatchmakingOptions
  ): Promise<MatchmakingResult> {
    try {
      // For skill-based matchmaking, we need the user profile first
      const userProfile = await UserService.getUserProfile(playerData.playerId);
      if (!userProfile) {
        return await this.handleQuickMatchmaking(playerData, options);
      }

      // Calculate skill rating
      const skillRating = SkillBasedMatchmakingService.calculateSkillRating(userProfile);
      
      // For this demo, we'll simulate finding opponents
      // In a real implementation, you'd query available players from database
      const availablePlayers: SessionPlayerData[] = []; // TODO: Get from active pool
      
      // Find skill-matched opponents
      const opponents = SkillBasedMatchmakingService.findSkillMatchedOpponents(
        skillRating,
        availablePlayers,
        0 // wait time
      );

      if (opponents.length > 0) {
        // Use the existing matchmaking service to create a match
        const matchResult = await NewMatchmakingService.findOrCreateMatch(
          playerData.playerId,
          options.preferredGameMode || 'classic',
          'quick'
        );

        return {
          success: matchResult.success,
          sessionId: matchResult.sessionId,
          roomId: matchResult.sessionId,
          matchType: 'skill-based',
          opponentInfo: {
            playerId: 'skill-matched-opponent', // Would be real opponent ID
            displayName: 'Skill Matched Player',
            skillRating: skillRating.rating
          }
        };
      }

      // No skill-matched opponents found, fallback to queue or quick match
      if (options.usePriorityQueue) {
        return await this.handleQueueMatchmaking(playerData, options);
      } else {
        return await this.handleQuickMatchmaking(playerData, options);
      }

    } catch (error) {
      console.error('❌ Skill-based matchmaking error:', error);
      return await this.handleQuickMatchmaking(playerData, options);
    }
  }

  /**
   * Handle quick matchmaking (fallback)
   */
  private static async handleQuickMatchmaking(
    playerData: SessionPlayerData,
    options: AdvancedMatchmakingOptions
  ): Promise<MatchmakingResult> {
    try {
      console.log('⚡ Starting quick matchmaking fallback');
      
      // Try the new matchmaking service first
      const matchResult = await NewMatchmakingService.findOrCreateMatch(
        playerData.playerId,
        options.preferredGameMode || 'classic',
        'quick'
      );

      if (matchResult.success && matchResult.sessionId) {
        return {
          success: true,
          sessionId: matchResult.sessionId,
          roomId: matchResult.sessionId,
          matchType: 'quick',
          error: undefined
        };
      }

      // If that fails, try a more basic approach
      console.log('🔄 Trying basic session creation fallback');
      
      // Use the GameSessionService directly as a last resort
      const { GameSessionService } = await import('./gameSessionService');
      
      const sessionId = await GameSessionService.createSession(
        'quick',
        options.preferredGameMode || 'classic',
        playerData,
        {
          maxPlayers: 2,
          expirationTime: 20
        }
      );

      if (sessionId) {
        return {
          success: true,
          sessionId,
          roomId: sessionId,
          matchType: 'quick',
          error: undefined
        };
      }

      throw new Error('All matchmaking methods failed');

    } catch (error: any) {
      console.error('❌ Quick matchmaking error:', error);
      
      // Provide helpful error messages
      if (error.message?.includes('permission')) {
        return {
          success: false,
          matchType: 'quick',
          error: 'Permission error. Please refresh the page and try again.'
        };
      } else if (error.message?.includes('auth')) {
        return {
          success: false,
          matchType: 'quick',
          error: 'Authentication error. Please sign in again.'
        };
      } else {
        return {
          success: false,
          matchType: 'quick',
          error: `Failed to create match: ${error.message || 'Unknown error'}`
        };
      }
    }
  }

  /**
   * Get comprehensive player status
   */
  static async getPlayerStatus(playerId: string): Promise<MatchmakingStatus> {
    try {
      // Check queue status for most common game mode
      const queueStatus = await MatchmakingQueueService.getQueueStatus(
        playerId,
        'classic',
        'quick'
      );
      
      // Get skill rating if user profile exists
      let skillRating: number | undefined;
      try {
        const userProfile = await UserService.getUserProfile(playerId);
        if (userProfile) {
          const rating = SkillBasedMatchmakingService.calculateSkillRating(userProfile);
          skillRating = rating.rating;
        }
      } catch (error) {
        console.log('Could not get skill rating for player');
      }

      return {
        inQueue: queueStatus ? queueStatus.position > 0 : false,
        queuePosition: queueStatus?.position,
        estimatedWaitTime: queueStatus?.estimatedWaitTime,
        skillRating,
        activeSession: undefined, // TODO: Check for active sessions
        // tournamentId: undefined // TODO: Check for active tournaments
      };
    } catch (error) {
      console.error('❌ Error getting player status:', error);
      return {
        inQueue: false
      };
    }
  }

  /**
   * Cancel matchmaking for player
   */
  static async cancelMatchmaking(playerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove from queue if present
      await MatchmakingQueueService.leaveQueue(
        playerId,
        'classic', // Most common game mode
        'quick'
      );
      
      // Cancel any pending matchmaking
      await NewMatchmakingService.cancelMatchmaking(playerId);
      
      console.log(`✅ Cancelled matchmaking for player ${playerId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error cancelling matchmaking:', error);
      return { success: false, error: 'Failed to cancel matchmaking' };
    }
  }

  /**
   * Get matchmaking statistics
   */
  static async getMatchmakingStats(): Promise<{
    totalPlayersInQueue: number;
    averageWaitTime: number;
    matchesCreatedToday: number;
    activeTournaments: number;
    skillDistribution: { [range: string]: number };
  }> {
    try {
      // Get basic system stats
      const systemStats = await NewMatchmakingService.getSystemStats();
      
      return {
        totalPlayersInQueue: systemStats.waitingPlayers,
        averageWaitTime: 60000, // Default 1 minute - TODO: Calculate from queue data
        matchesCreatedToday: systemStats.activeSessions, // Use active sessions as proxy
        activeTournaments: 0, // TODO: Implement tournament tracking
        skillDistribution: {} // TODO: Implement skill distribution tracking
      };
    } catch (error) {
      console.error('❌ Error getting matchmaking stats:', error);
      return {
        totalPlayersInQueue: 0,
        averageWaitTime: 0,
        matchesCreatedToday: 0,
        activeTournaments: 0,
        skillDistribution: {}
      };
    }
  }

  /**
   * Update match result and ratings
   */
  static async recordMatchResult(
    sessionId: string,
    winnerId: string,
    loserId: string,
    gameMode: string,
    score?: { [playerId: string]: number }
  ): Promise<{ success: boolean }> {
    try {
      // Get user profiles to update ratings properly
      const winnerProfile = await UserService.getUserProfile(winnerId);
      const loserProfile = await UserService.getUserProfile(loserId);
      
      if (winnerProfile && loserProfile) {
        // Calculate current ratings
        const winnerRating = SkillBasedMatchmakingService.calculateSkillRating(winnerProfile);
        const loserRating = SkillBasedMatchmakingService.calculateSkillRating(loserProfile);
        
        // Update ratings based on match result
        const newWinnerRating = SkillBasedMatchmakingService.updatePlayerRating(
          winnerRating,
          loserRating,
          true
        );
        const newLoserRating = SkillBasedMatchmakingService.updatePlayerRating(
          loserRating,
          winnerRating,
          false
        );
        
        // TODO: Save updated ratings to user profiles
        console.log(`🏆 Updated ratings - Winner: ${winnerRating.rating} → ${newWinnerRating.rating}, Loser: ${loserRating.rating} → ${newLoserRating.rating}`);
      }
      
      // Complete the match in the main system
      await NewMatchmakingService.completeMatch(sessionId, winnerId);
      
      console.log(`✅ Recorded match result: ${winnerId} defeated ${loserId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error recording match result:', error);
      return { success: false };
    }
  }
}
