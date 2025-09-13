/**
 * Go Backend Service
 * Handles all communication with the Go services backend
 */

interface GoBackendConfig {
  baseUrl: string;
  timeout: number;
}

interface RematchRequest {
  game_mode: string;
  game_type: string;
  requester_user_id: string;
  requester_display_name: string;
  opponent_user_id: string;
  opponent_display_name: string;
  original_match_id?: string;
}

interface FriendInviteRequest {
  game_mode: string;
  game_type: string;
  inviter_user_id: string;
  inviter_display_name: string;
  invitee_user_id: string;
  invitee_display_name: string;
  message?: string;
}

interface RematchResponse {
  success: boolean;
  waiting_room: any;
  waiting_room_id: string;
}

interface FriendInviteResponse {
  success: boolean;
  waiting_room: any;
  waiting_room_id: string;
}

export class GoBackendService {
  private static config: GoBackendConfig = {
    baseUrl: process.env.NODE_ENV === 'production' 
      ? 'https://dashdice-production.up.railway.app'
      : 'http://localhost:8080',
    timeout: 10000, // 10 seconds
  };

  /**
   * Get the appropriate backend URL based on environment
   */
  private static getBackendUrl(): string {
    // In production, use the proxy through Vercel
    if (process.env.NODE_ENV === 'production') {
      return '/api/proxy';
    }
    
    // In development, use direct connection to local Go services
    return this.config.baseUrl;
  }

  /**
   * Make a request to the Go backend with proper error handling
   */
  private static async makeRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<any> {
    const baseUrl = this.getBackendUrl();
    const url = `${baseUrl}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add Origin header for CORS in development
    if (process.env.NODE_ENV !== 'production') {
      defaultHeaders['Origin'] = 'http://localhost:3001';
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.config.timeout),
    };

    try {
      console.log(`🔄 GoBackendService: Making request to ${url}`);
      
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ GoBackendService: Request successful`);
      return data;
      
    } catch (error) {
      console.error(`❌ GoBackendService: Request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Create a friend invite waiting room using Go services
   */
  static async createFriendInviteWaitingRoom(
    inviterUserId: string,
    inviterDisplayName: string,
    inviteeUserId: string,
    inviteeDisplayName: string,
    gameMode: string,
    gameType: string = 'Friend Invitation',
    message?: string
  ): Promise<string> {
    try {
      console.log('🔄 GoBackendService: Creating friend invite waiting room via Go services');
      
      const friendInviteRequest: FriendInviteRequest = {
        game_mode: gameMode,
        game_type: gameType,
        inviter_user_id: inviterUserId,
        inviter_display_name: inviterDisplayName,
        invitee_user_id: inviteeUserId,
        invitee_display_name: inviteeDisplayName,
        message: message,
      };

      const response: FriendInviteResponse = await this.makeRequest('/v1/matches/friend-invite', {
        method: 'POST',
        body: JSON.stringify(friendInviteRequest),
      });

      if (!response.success || !response.waiting_room_id) {
        throw new Error('Failed to create friend invite waiting room');
      }

      console.log('✅ GoBackendService: Friend invite waiting room created:', response.waiting_room_id);
      return response.waiting_room_id;
      
    } catch (error) {
      console.error('❌ GoBackendService: Error creating friend invite waiting room:', error);
      throw error;
    }
  }

  /**
   * Create a rematch waiting room using Go services
   */
  static async createRematchWaitingRoom(
    requesterUserId: string,
    requesterDisplayName: string,
    opponentUserId: string,
    opponentDisplayName: string,
    gameMode: string,
    gameType: string,
    originalMatchId?: string
  ): Promise<string> {
    try {
      console.log('🔄 GoBackendService: Creating rematch waiting room via Go services');
      
      const rematchRequest: RematchRequest = {
        game_mode: gameMode,
        game_type: gameType,
        requester_user_id: requesterUserId,
        requester_display_name: requesterDisplayName,
        opponent_user_id: opponentUserId,
        opponent_display_name: opponentDisplayName,
        original_match_id: originalMatchId,
      };

      const response: RematchResponse = await this.makeRequest('/v1/matches/rematch', {
        method: 'POST',
        body: JSON.stringify(rematchRequest),
      });

      if (!response.success || !response.waiting_room_id) {
        throw new Error('Failed to create rematch waiting room');
      }

      console.log('✅ GoBackendService: Rematch waiting room created:', response.waiting_room_id);
      return response.waiting_room_id;
      
    } catch (error) {
      console.error('❌ GoBackendService: Error creating rematch waiting room:', error);
      throw error;
    }
  }

  /**
   * Create a regular match using Go services
   */
  static async createMatch(
    gameMode: string,
    maxPlayers: number = 2,
    isPrivate: boolean = false,
    password?: string
  ): Promise<string> {
    try {
      console.log('🔄 GoBackendService: Creating match via Go services');
      
      const matchRequest = {
        game_mode: gameMode,
        max_players: maxPlayers,
        private: isPrivate,
        ...(password && { password }),
      };

      const response = await this.makeRequest('/v1/matches', {
        method: 'POST',
        body: JSON.stringify(matchRequest),
      });

      if (!response.success || !response.match?.id) {
        throw new Error('Failed to create match');
      }

      console.log('✅ GoBackendService: Match created:', response.match.id);
      return response.match.id;
      
    } catch (error) {
      console.error('❌ GoBackendService: Error creating match:', error);
      throw error;
    }
  }

  /**
   * Health check for Go services
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/health');
      return response.status === 'healthy';
    } catch (error) {
      console.warn('Go services health check failed:', error);
      return false;
    }
  }
}
