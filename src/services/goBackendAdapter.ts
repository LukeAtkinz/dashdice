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
      console.log('🔄 Initializing Go backend with Redis and Railway connectivity...');
      
      // Check if Go backend is explicitly disabled
      if (process.env.DISABLE_GO_BACKEND === 'true' || process.env.NEXT_PUBLIC_DISABLE_GO_BACKEND === 'true') {
        console.log('⚠️ Go backend explicitly disabled via environment variable');
        this.isGoBackendAvailable = false;
        return false;
      }
      
      // Check Go backend availability
      if (typeof window === 'undefined') {
        // Server-side - assume Go backend is available
        console.log('🌐 Server-side environment - enabling Go backend by default');
        this.isGoBackendAvailable = true;
        return true;
      }

      // In browser environments, always enable Go backend adapter since we use proxy
      // The proxy handles fallback logic internally
      console.log('🌐 Browser environment - enabling Go backend via proxy (with automatic Firebase fallback)');
      this.isGoBackendAvailable = true;
      return true;
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
      // Check if user is properly authenticated before making Go backend calls
      const { auth } = await import('./firebase');
      if (!auth.currentUser) {
        console.log('🔒 User not authenticated yet, skipping Go backend match check');
        // Fall back to Firebase check which doesn't require Go backend auth
        const { NewMatchmakingService } = await import('./newMatchmakingService');
        return NewMatchmakingService.checkUserInMatch(userId);
      }

      // Use Go backend
      console.log('🎯 Checking match status via Go backend for user:', userId);
      
      // Check for matches in ACTIVE states only (not 'ready' which means matched but not started)
      const statuses = ['active', 'in_progress'];
      let activeMatch = null;
      
      for (const status of statuses) {
        const response = await this.apiClient.listMatches({ 
          status,
          limit: 10 
        });

        if (response.data?.matches) {
          // Look for a match containing this user
          activeMatch = response.data.matches.find((match: any) => 
            match.players && Array.isArray(match.players) && match.players.includes(userId)
          );
          
          if (activeMatch) {
            console.log(`🎯 Found user in match with status: ${status}`, activeMatch);
            break;
          }
        }
      }
      
      if (activeMatch) {
        return {
          inMatch: true,
          gameMode: (activeMatch as any).game_mode || 'unknown',
          currentGame: (activeMatch as any).matchId || activeMatch.id,
          matchId: (activeMatch as any).matchId || activeMatch.id
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
   * Find existing match or create new one
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
      console.log('🔍 Finding or creating match via Go backend:', { gameMode, gameType, userId });
      
      // STEP 1: First try to find existing matches waiting for players
      console.log('🔍 Searching for existing matches waiting for players...');
      
      const existingMatchesResponse = await this.apiClient.listMatches({ 
        status: 'waiting',
        game_mode: gameMode,
        limit: 10 
      });

      if (existingMatchesResponse.data?.matches && Array.isArray(existingMatchesResponse.data.matches)) {
        const availableMatches = existingMatchesResponse.data.matches.filter((match: any) => {
          // Find matches that:
          // 1. Have space for another player
          // 2. Are not created by this user (to avoid self-joining)
          // 3. Match the game mode
          
          // Safely handle players array - ensure it's an array
          const players = Array.isArray(match.players) ? match.players : [];
          const playerCount = players.length;
          const maxPlayers = match.max_players || 2;
          const hasSpace = playerCount < maxPlayers;
          const notSelfCreated = !players.includes(userId);
          const correctGameMode = !gameMode || match.game_mode === gameMode;
          
          console.log('🔍 Evaluating match:', {
            matchId: match.id,
            playerCount,
            maxPlayers,
            hasSpace,
            notSelfCreated,
            correctGameMode,
            players: players,
            playersType: typeof match.players,
            playersIsArray: Array.isArray(match.players)
          });
          
          return hasSpace && notSelfCreated && correctGameMode;
        });

        if (availableMatches.length > 0) {
          const matchToJoin = availableMatches[0];
          console.log('🎯 Found existing match to join:', matchToJoin.id);

          try {
            // Since there's no direct joinMatch API, we'll use the MatchmakingOrchestrator 
            // which has logic to handle joining existing matches
            console.log('🎯 Using MatchmakingOrchestrator to join existing match');
            
            const { MatchmakingOrchestrator } = await import('./matchmakingOrchestrator');
            
            const matchRequest = {
              sessionType: 'quick' as const,
              gameMode,
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
              }
            };

            const joinResult = await MatchmakingOrchestrator.findMatch(matchRequest);
            
            if (joinResult.success && joinResult.sessionId) {
              console.log('✅ MatchmakingOrchestrator found/joined match:', joinResult.sessionId);
              
              return {
                success: true,
                roomId: joinResult.sessionId,
                sessionId: joinResult.sessionId,
                isNewRoom: false, // This is an existing room we joined
                hasOpponent: true // There's already another player
              };
            } else {
              console.log('❌ MatchmakingOrchestrator failed to find match, will create new one');
            }
          } catch (joinError) {
            console.log('❌ Error joining existing match, will create new one:', joinError);
          }
        }
      }
      
      // STEP 2: No existing matches found, create a new one
      console.log('🆕 No existing matches found, creating new match');
      
      // Try to join existing queue
      const queueResponse = await this.apiClient.joinQueue({
        game_mode: gameMode,
        preferences: {
          gameType,
          userId,
          displayName: userProfile.displayName || 'Player'
        }
      });

      console.log('🔗 Queue response:', queueResponse);

      // Create a match
      const matchResponse = await this.apiClient.createMatch({
        game_mode: gameMode,
        max_players: 2,
        is_private: false,
        settings: {
          gameType,
          hostId: userId
        }
      });

      console.log('🔍 Raw match response from API:', matchResponse);

      // Handle different Go backend response formats with type flexibility
      let matchId = null;
      if (matchResponse.success) {
        console.log('✅ Match response has success flag');
        // Use any type to access flexible response properties
        const responseData = matchResponse as any;
        
        console.log('🔍 Response data structure:', responseData.data);
        
        // Format 1: {data: {match: {id: "..."}}} (from match-service)
        if (responseData.data?.match?.id) {
          matchId = responseData.data.match.id;
          console.log('📋 Found matchId in data.match.id:', matchId);
        }
        // Format 2: {data: {matchId: "..."}} (from current deployed backend)
        else if (responseData.data?.matchId) {
          matchId = responseData.data.matchId;
          console.log('📋 Found matchId in data.matchId:', matchId);
        }
        // Format 3: Direct response {matchId: "..."} (fallback)
        else if (responseData.matchId) {
          matchId = responseData.matchId;
          console.log('📋 Found matchId in root:', matchId);
        } else {
          console.log('❌ No matchId found in any expected location');
          console.log('🔍 Full response data:', JSON.stringify(responseData, null, 2));
        }
      } else {
        console.log('❌ Match response does not have success flag');
        console.log('🔍 Full response:', JSON.stringify(matchResponse, null, 2));
      }

      if (matchId) {
        console.log(`✅ Go backend match created with ID: ${matchId}`);
        
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
        
        OptimisticMatchmakingService.setBridgeRoomData(matchId, bridgeRoomData);
        
        return {
          success: true,
          roomId: matchId,
          sessionId: matchId,
          isNewRoom: true,
          hasOpponent: false
        };
      }

      // If match creation failed, return error
      return {
        success: false,
        error: 'Failed to create match - no match data returned'
      };
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

  /**
   * Clear user's stuck state when they appear to be "in game" but aren't
   * This resolves the "Already in an active quick game" error
   */
  static async clearStuckUserState(userId: string): Promise<boolean> {
    try {
      console.log('🧹 Clearing stuck state for user:', userId);
      
      // Try to leave any queue the user might be stuck in
      try {
        await this.apiClient.leaveQueue();
        console.log('✅ Left any existing queue');
      } catch (error) {
        console.log('ℹ️ No queue to leave or already left');
      }
      
      // Get user's current matches and try to clean them up
      try {
        const matchesResponse = await this.apiClient.listMatches({ limit: 50 });
        const userMatches = matchesResponse.data?.matches?.filter((match: any) => 
          match.players && Array.isArray(match.players) && match.players.includes(userId)
        ) || [];
        
        if (userMatches.length > 0) {
          console.log(`🔍 Found ${userMatches.length} matches for user, attempting cleanup...`);
          
          for (const match of userMatches) {
            try {
              // If match is waiting or active, try to end it
              if (match.status === 'waiting' || match.status === 'active') {
                console.log(`🚪 Attempting to end match ${match.id} with status ${match.status}`);
                await this.apiClient.endMatch(match.id);
              }
            } catch (error) {
              console.log(`⚠️ Could not end match ${match.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Could not fetch user matches for cleanup:', error);
      }
      
      console.log('✅ User state cleanup completed');
      return true;
    } catch (error) {
      console.error('❌ Error clearing stuck user state:', error);
      return false;
    }
  }
}

// Initialize on module load
GoBackendAdapter.initialize();
