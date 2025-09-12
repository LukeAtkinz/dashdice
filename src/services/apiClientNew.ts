/**
 * DashDice API Client Service
 * Handles communication with Go microservices backend
 */

import { auth } from './firebase';

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  code?: string;
  data?: T;
  message?: string;
  [key: string]: any;
}

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  stats: {
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
    elo: number;
  };
  preferences: {
    theme?: string;
    soundEnabled?: boolean;
    musicEnabled?: boolean;
    notifications?: boolean;
  };
  isActive: boolean;
  lastSeen: string;
}

interface Match {
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  game_mode: string;
  max_players: number;
  players: string[];
  created_at: number;
  started_at?: number;
  ended_at?: number;
  winner?: string;
  scores?: Record<string, number>;
}

interface CreateMatchRequest {
  game_mode: string;
  max_players?: number;
  is_private?: boolean;
  settings?: any;
}

interface JoinQueueRequest {
  game_mode: string;
  skill_level?: number;
  preferences?: any;
}

interface QueueStatus {
  position: number;
  estimated_wait: string;
  total_waiting: number;
}

export class DashDiceAPI {
  private static readonly BASE_URL = this.getApiGatewayUrl();
  private static readonly WS_URL = this.getWebSocketUrl();
  
  // Cache for auth token to avoid multiple calls
  private static authTokenCache: string | null = null;
  private static authTokenExpiry: number = 0;

  /**
   * Get API Gateway URL based on environment
   */
  private static getApiGatewayUrl(): string {
    // Check if we're in production
    if (typeof window !== 'undefined' && 
        (window.location.hostname === 'www.dashdice.gg' || 
         window.location.hostname === 'dashdice.gg' ||
         window.location.hostname.includes('vercel.app'))) {
      // Use same-origin proxy to avoid CORS issues
      return '/api/proxy';
    }
    
    // Development or local - use direct Go backend
    return process.env.NEXT_PUBLIC_LOCAL_API_GATEWAY_URL || 'http://localhost:8080/api/v1';
  }

  /**
   * Get WebSocket URL based on environment
   */
  private static getWebSocketUrl(): string {
    // Check if we're in production
    if (typeof window !== 'undefined' && 
        (window.location.hostname === 'www.dashdice.gg' || 
         window.location.hostname === 'dashdice.gg' ||
         window.location.hostname.includes('vercel.app'))) {
      // Use environment variable if set, otherwise use localhost (will fail fast for fallback)
      return process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080/api/v1/realtime/ws';
    }
    
    // Development or local
    return process.env.NEXT_PUBLIC_LOCAL_WEBSOCKET_URL || 'ws://localhost:8080/api/v1/realtime/ws';
  }

  /**
   * Get current Firebase Auth token with caching
   */
  private static async getAuthToken(): Promise<string | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn('No authenticated user found');
        return null;
      }

      // Check if cached token is still valid (with 5 minute buffer)
      const now = Date.now();
      if (this.authTokenCache && this.authTokenExpiry > now + 300000) {
        return this.authTokenCache;
      }

      // Get fresh token
      const token = await currentUser.getIdToken(false);
      
      // Cache token with expiry (tokens are valid for 1 hour)
      this.authTokenCache = token;
      this.authTokenExpiry = now + 3600000; // 1 hour
      
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      this.authTokenCache = null;
      this.authTokenExpiry = 0;
      return null;
    }
  }

  /**
   * Clear cached auth token (useful for logout)
   */
  static clearAuthToken(): void {
    this.authTokenCache = null;
    this.authTokenExpiry = 0;
  }

  /**
   * Make authenticated request to Go services
   */
  private static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.BASE_URL}${endpoint}`;
    
    // Get authentication token
    const token = await this.getAuthToken();
    
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('User-Agent', 'DashDice-Frontend/1.0');
    
    // Add auth token if available
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      console.log(`🔗 API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }
      
      if (!response.ok) {
        console.error(`❌ API Error: ${response.status}`, data);
        
        // Return properly formatted error response
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
          code: response.status.toString(),
          data: data
        };
      }

      console.log(`✅ API Response: ${response.status}`, data);
      
      // ✅ FIX: Wrap successful Go backend responses with success flag
      // Check if response already has success property (for backwards compatibility)
      if (data.hasOwnProperty('success')) {
        return data;
      }
      
      // Wrap raw Go backend response in ApiResponse format
      return {
        success: true,
        data: data,
        message: data.message || 'Request successful'
      };
    } catch (error) {
      console.error('❌ API Request Error:', error);
      
      // Return properly formatted error response
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'NETWORK_ERROR'
      };
    }
  }

  // ==================== AUTH ENDPOINTS ====================

  /**
   * Verify current authentication status with backend
   */
  static async verifyAuth(): Promise<ApiResponse<{ valid: boolean; user_id: string }>> {
    return this.request('/public/auth/verify', { method: 'POST' });
  }

  // ==================== USER ENDPOINTS ====================

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/users/me');
  }

  /**
   * Update current user profile
   */
  static async updateCurrentUser(updateData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<ApiResponse<any>> {
    return this.request('/users/me/stats');
  }

  // ==================== MATCH ENDPOINTS ====================

  /**
   * List matches with optional filters
   */
  static async listMatches(params?: {
    status?: string;
    limit?: number;
    game_mode?: string;
  }): Promise<ApiResponse<{ matches: Match[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.game_mode) queryParams.set('game_mode', params.game_mode);
    
    const endpoint = `/matches/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  /**
   * Create a new match
   */
  static async createMatch(matchData: CreateMatchRequest): Promise<ApiResponse<{ match: Match }>> {
    return this.request('/matches/', {
      method: 'POST',
      body: JSON.stringify(matchData),
    });
  }

  /**
   * Get match details by ID
   */
  static async getMatch(matchId: string): Promise<ApiResponse<{ match: Match }>> {
    return this.request(`/matches/${matchId}`);
  }

  /**
   * Update match (for game actions, etc.)
   */
  static async updateMatch(matchId: string, updateData: any): Promise<ApiResponse<Match>> {
    return this.request(`/matches/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * End/delete match
   */
  static async endMatch(matchId: string): Promise<ApiResponse> {
    return this.request(`/matches/${matchId}`, { method: 'DELETE' });
  }

  // ==================== QUEUE ENDPOINTS ====================

  /**
   * Join matchmaking queue
   */
  static async joinQueue(queueData: JoinQueueRequest): Promise<ApiResponse<QueueStatus>> {
    return this.request('/queue/join', {
      method: 'POST',
      body: JSON.stringify(queueData),
    });
  }

  /**
   * Leave matchmaking queue
   */
  static async leaveQueue(): Promise<ApiResponse> {
    return this.request('/queue/leave', { method: 'DELETE' });
  }

  /**
   * Get current queue status
   */
  static async getQueueStatus(): Promise<ApiResponse<QueueStatus>> {
    return this.request('/queue/status');
  }

  // ==================== PRESENCE ENDPOINTS ====================

  /**
   * Update user presence
   */
  static async updatePresence(presenceData: {
    status: string;
    location?: string;
    in_match?: boolean;
    match_id?: string;
  }): Promise<ApiResponse> {
    return this.request('/realtime/presence', {
      method: 'POST',
      body: JSON.stringify(presenceData),
    });
  }

  // ==================== WEBSOCKET CONNECTION ====================

  /**
   * Create WebSocket connection for real-time updates
   */
  static async createWebSocketConnection(): Promise<WebSocket | null> {
    try {
      // Get auth token for WebSocket connection
      const token = await this.getAuthToken();
      if (!token) {
        console.error('No auth token available for WebSocket connection');
        return null;
      }

      const wsUrl = `${this.WS_URL}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('🔌 WebSocket connected to Go services');
        
        // Send auth message
        ws.send(JSON.stringify({
          type: 'auth',
          token: token,
          timestamp: Date.now(),
        }));
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected: ${event.code} ${event.reason}`);
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      return ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      return null;
    }
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Check if Go services are available
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL.replace('/api/v1', '')}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get detailed service status
   */
  static async getDetailedHealthCheck(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.BASE_URL.replace('/api/v1', '')}/health/detailed`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get detailed health check:', error);
      throw error;
    }
  }

  /**
   * Get public status information
   */
  static async getPublicStatus(): Promise<ApiResponse> {
    return this.request('/public/status');
  }
}

// Export singleton instance
export default DashDiceAPI;

// Type exports for other files
export type {
  ApiResponse,
  User,
  Match,
  CreateMatchRequest,
  JoinQueueRequest,
  QueueStatus,
};
