import DashDiceAPI from './apiClientNew';

/**
 * GO BACKEND ADAPTER SERVICE
 * 
 * This service provides the same interface as the Firebase services
 * but routes calls to the Go backend instead.
 * 
 * UI components remain completely unchanged - same method names,
 * same return values, same behavior.
 */
export class GoBackendAdapter {
  private static apiClient = DashDiceAPI;
  private static isGoBackendAvailable = false;
  private static initializationPromise: Promise<boolean> | null = null;

  /**
   * Initialize and test Go backend connectivity
   */
  static async initialize(): Promise<boolean> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  /**
   * Internal initialization logic
   */
  private static async _doInitialize(): Promise<boolean> {
    try {
      console.log('🔄 Testing Go backend connectivity...');
      
      // Check Go backend availability
      const isProduction = typeof window !== 'undefined' && 
        (window.location.hostname === 'www.dashdice.gg' || 
         window.location.hostname === 'dashdice.gg' ||
         window.location.hostname.includes('vercel.app'));
      
      if (isProduction) {
        console.log('🌐 Production environment - using proxy for Go backend calls');
        // In production, we use the proxy which handles fallback internally
        this.isGoBackendAvailable = true;
        return true;
      }
      
      // Test with timeout for development or configured production
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        await this.apiClient.healthCheck();
        clearTimeout(timeoutId);
        
        this.isGoBackendAvailable = true;
        console.log('✅ Go backend is available');
        return true;
      } catch (healthError) {
        clearTimeout(timeoutId);
        throw healthError;
      }
    } catch (error) {
      console.warn('⚠️ Go backend not available, using Firebase fallback:', error);
      this.isGoBackendAvailable = false;
      return false;
    }
  }

  /**
   * Check if user is in an active match
   * Same interface as NewMatchmakingService.checkUserInMatch()
   */
  static async checkUserInMatch(userId: string): Promise<{
    inMatch: boolean;
    gameMode?: string;
    currentGame?: string;
    matchId?: string;
  }> {
    // Ensure initialization is complete
    await this.initialize();

    if (!this.isGoBackendAvailable) {
      // Fallback to Firebase implementation
      const { NewMatchmakingService } = await import('./newMatchmakingService');
      return NewMatchmakingService.checkUserInMatch(userId);
    }

    try {
      // Use Go backend
      console.log('🎯 Checking match status via Go backend for user:', userId);
      
      // Get user's current matches
      const response = await this.apiClient.listMatches({ 
        status: 'active',
        limit: 1 
      });

      const activeMatch = response.data?.matches?.[0];
      
      if (activeMatch) {
        return {
          inMatch: true,
          gameMode: activeMatch.game_mode || 'unknown',
          currentGame: activeMatch.id,
          matchId: activeMatch.id
        };
      }

      return {
        inMatch: false
      };
    } catch (error) {
      console.error('Go backend match check failed, using Firebase fallback:', error);
      const { NewMatchmakingService } = await import('./newMatchmakingService');
      return NewMatchmakingService.checkUserInMatch(userId);
    }
  }

  /**
   * Create/find a match
   * Same interface as current matchmaking services
   */
  static async findOrCreateMatch(
    gameMode: string,
    gameType: 'quick' | 'ranked' | 'custom',
    userId: string,
    userProfile: any
  ): Promise<{
    success: boolean;
    sessionId?: string;
    roomId?: string;
    isNewRoom?: boolean;
    hasOpponent?: boolean;
    error?: string;
  }> {
    // Ensure initialization is complete
    await this.initialize();

    if (!this.isGoBackendAvailable) {
      // Fallback to Firebase implementation
      const { NewMatchmakingService } = await import('./newMatchmakingService');
      return NewMatchmakingService.findOrCreateMatch(userId, gameMode, 'quick', {});
    }

    try {
      console.log('🎯 Creating match via Go backend:', { gameMode, gameType, userId });
      
      // First, try to join existing queue
      const queueResponse = await this.apiClient.joinQueue({
        game_mode: gameMode,
        preferences: {
          gameType,
          userId,
          displayName: userProfile.displayName || 'Player'
        }
      });

      if (queueResponse.success && queueResponse.data?.position !== undefined) {
        return {
          success: true,
          roomId: `queue_${gameMode}_${userId}`
        };
      }

      // If no immediate match, create a match
      const matchResponse = await this.apiClient.createMatch({
        game_mode: gameMode,
        max_players: 2,
        is_private: false,
        settings: {
          gameType,
          hostId: userId
        }
      });

      if (matchResponse.success && matchResponse.data?.match) {
        // Set up bridge data for the waiting room component
        const { OptimisticMatchmakingService } = await import('./optimisticMatchmakingService');
        
        const bridgeRoomData = {
          gameMode,
          gameType,
          hostData: {
            playerId: userId,
            playerDisplayName: userProfile.displayName || 'Player',
            playerStats: userProfile.stats || {},
            displayBackgroundEquipped: userProfile.inventory?.displayBackgroundEquipped || {
              name: 'Relax',
              file: 'backgrounds/Relax.png',
              type: 'image'
            },
            matchBackgroundEquipped: userProfile.inventory?.matchBackgroundEquipped || {
              name: 'Relax', 
              file: 'backgrounds/Relax.png',
              type: 'image'
            },
            ready: false,
            joinedAt: new Date()
          },
          playersRequired: 1,
          isGoBackendRoom: true,
          createdAt: new Date()
        };
        
        OptimisticMatchmakingService.setBridgeRoomData(matchResponse.data.match.id, bridgeRoomData);
        
        return {
          success: true,
          roomId: matchResponse.data.match.id,
          sessionId: matchResponse.data.match.id,
          isNewRoom: true,
          hasOpponent: false
        };
      }

      throw new Error('Failed to create match');
    } catch (error) {
      console.error('Go backend match creation failed, using Firebase fallback:', error);
      const { NewMatchmakingService } = await import('./newMatchmakingService');
      return NewMatchmakingService.findOrCreateMatch(userId, gameMode, 'quick', {});
    }
  }

  /**
   * Force leave match - same interface as Firebase version
   */
  static async forceLeaveMatch(userId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    if (!this.isGoBackendAvailable) {
      const { NewMatchmakingService } = await import('./newMatchmakingService');
      return NewMatchmakingService.forceLeaveMatch(userId);
    }

    try {
      // Leave queue first
      await this.apiClient.leaveQueue();
      
      // Get active matches and leave them
      const response = await this.apiClient.listMatches({ 
        status: 'active',
        limit: 5 
      });

      const activeMatches = response.data?.matches || [];
      
      // Leave all active matches
      for (const match of activeMatches) {
        try {
          await this.apiClient.endMatch(match.id);
        } catch (err) {
          console.warn('Failed to end match:', match.id, err);
        }
      }

      return {
        success: true,
        message: 'Left all matches successfully'
      };
    } catch (error) {
      console.error('Go backend leave match failed, using Firebase fallback:', error);
      const { NewMatchmakingService } = await import('./newMatchmakingService');
      return NewMatchmakingService.forceLeaveMatch(userId);
    }
  }

  /**
   * Get queue status
   */
  static async getQueueStatus(): Promise<any> {
    if (!this.isGoBackendAvailable) {
      // Return mock data for Firebase fallback
      return { inQueue: false, estimatedWaitTime: 0 };
    }

    try {
      const response = await this.apiClient.getQueueStatus();
      return response.data || { inQueue: false, estimatedWaitTime: 0 };
    } catch (error) {
      console.warn('Queue status failed:', error);
      return { inQueue: false, estimatedWaitTime: 0 };
    }
  }

  /**
   * Create WebSocket connection for real-time updates
   */
  static async createWebSocketConnection(): Promise<WebSocket | null> {
    if (!this.isGoBackendAvailable) {
      console.log('Go backend not available, WebSocket connection skipped');
      return null;
    }

    try {
      return await this.apiClient.createWebSocketConnection();
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
      return null;
    }
  }

  /**
   * Health check - test if Go backend is working
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await this.apiClient.healthCheck();
      this.isGoBackendAvailable = true;
      return true;
    } catch (error) {
      this.isGoBackendAvailable = false;
      return false;
    }
  }
}

// Initialize on module load
GoBackendAdapter.initialize();
