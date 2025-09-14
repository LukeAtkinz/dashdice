import { SessionType } from './gameSessionService';

/**
 * 🚫 Matchmaking Request Deduplication Service
 * Prevents players from making multiple simultaneous matchmaking requests
 */

export interface PendingMatchmakingRequest {
  playerId: string;
  sessionType: SessionType;
  gameMode: string;
  requestId: string;
  timestamp: number;
  expiresAt: number;
}

export class MatchmakingDeduplicationService {
  // 🕐 Request timeouts
  private static readonly REQUEST_TIMEOUT_MS = 30000; // 30 seconds max per request
  private static readonly THROTTLE_WINDOW_MS = 3000; // 3 seconds between requests
  
  // 📊 In-memory tracking
  private static pendingRequests = new Map<string, PendingMatchmakingRequest>();
  private static lastRequestTimes = new Map<string, number>();
  
  /**
   * 🔍 Check if player can make a new matchmaking request
   */
  static canMakeRequest(playerId: string, sessionType: SessionType, gameMode: string): {
    allowed: boolean;
    reason?: string;
    waitTime?: number;
  } {
    const now = Date.now();
    
    // 🚫 Check for existing pending request
    const existingRequest = this.pendingRequests.get(playerId);
    if (existingRequest && existingRequest.expiresAt > now) {
      return {
        allowed: false,
        reason: `Already have pending ${existingRequest.sessionType} matchmaking request. Please wait or cancel existing request.`,
        waitTime: Math.ceil((existingRequest.expiresAt - now) / 1000)
      };
    }
    
    // ⏱️ Check throttling
    const lastRequestTime = this.lastRequestTimes.get(playerId);
    if (lastRequestTime && (now - lastRequestTime) < this.THROTTLE_WINDOW_MS) {
      const waitTime = Math.ceil((this.THROTTLE_WINDOW_MS - (now - lastRequestTime)) / 1000);
      return {
        allowed: false,
        reason: `Matchmaking requests are rate-limited. Please wait ${waitTime} seconds before trying again.`,
        waitTime
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * 📝 Register a new matchmaking request
   */
  static registerRequest(playerId: string, sessionType: SessionType, gameMode: string): string {
    const now = Date.now();
    const requestId = `${playerId}_${sessionType}_${now}`;
    
    // Clean up expired requests first
    this.cleanupExpiredRequests();
    
    // Register new request
    const request: PendingMatchmakingRequest = {
      playerId,
      sessionType,
      gameMode,
      requestId,
      timestamp: now,
      expiresAt: now + this.REQUEST_TIMEOUT_MS
    };
    
    this.pendingRequests.set(playerId, request);
    this.lastRequestTimes.set(playerId, now);
    
    console.log(`📝 Registered matchmaking request ${requestId} for player ${playerId}`);
    
    // Schedule automatic cleanup
    setTimeout(() => {
      this.cleanupRequest(playerId, requestId);
    }, this.REQUEST_TIMEOUT_MS);
    
    return requestId;
  }
  
  /**
   * ✅ Complete a matchmaking request (success)
   */
  static completeRequest(playerId: string, requestId: string): void {
    const request = this.pendingRequests.get(playerId);
    if (request && request.requestId === requestId) {
      this.pendingRequests.delete(playerId);
      console.log(`✅ Completed matchmaking request ${requestId} for player ${playerId}`);
    }
  }
  
  /**
   * ❌ Cancel a matchmaking request (user-initiated or failure)
   */
  static cancelRequest(playerId: string, reason: string = 'User cancelled'): boolean {
    const request = this.pendingRequests.get(playerId);
    if (request) {
      this.pendingRequests.delete(playerId);
      console.log(`❌ Cancelled matchmaking request ${request.requestId} for player ${playerId}: ${reason}`);
      return true;
    }
    return false;
  }
  
  /**
   * 🧹 Clean up expired requests
   */
  private static cleanupExpiredRequests(): void {
    const now = Date.now();
    const expiredPlayers: string[] = [];
    
    for (const [playerId, request] of this.pendingRequests.entries()) {
      if (request.expiresAt <= now) {
        expiredPlayers.push(playerId);
      }
    }
    
    for (const playerId of expiredPlayers) {
      const request = this.pendingRequests.get(playerId);
      this.pendingRequests.delete(playerId);
      console.log(`🕐 Expired matchmaking request ${request?.requestId} for player ${playerId}`);
    }
    
    if (expiredPlayers.length > 0) {
      console.log(`🧹 Cleaned up ${expiredPlayers.length} expired matchmaking requests`);
    }
  }
  
  /**
   * 🧹 Clean up specific request (by ID for safety)
   */
  private static cleanupRequest(playerId: string, requestId: string): void {
    const request = this.pendingRequests.get(playerId);
    if (request && request.requestId === requestId) {
      this.pendingRequests.delete(playerId);
      console.log(`🕐 Auto-cleaned up expired request ${requestId} for player ${playerId}`);
    }
  }
  
  /**
   * 📊 Get current request status for a player
   */
  static getRequestStatus(playerId: string): PendingMatchmakingRequest | null {
    const request = this.pendingRequests.get(playerId);
    if (request && request.expiresAt > Date.now()) {
      return request;
    }
    return null;
  }
  
  /**
   * 📈 Get system statistics
   */
  static getStats(): {
    pendingRequests: number;
    activeThrottles: number;
    totalRequests: number;
  } {
    this.cleanupExpiredRequests();
    
    const now = Date.now();
    const activeThrottles = Array.from(this.lastRequestTimes.values())
      .filter(time => (now - time) < this.THROTTLE_WINDOW_MS).length;
    
    return {
      pendingRequests: this.pendingRequests.size,
      activeThrottles,
      totalRequests: this.lastRequestTimes.size
    };
  }
  
  /**
   * 🧹 Reset all tracking (for testing or emergency cleanup)
   */
  static reset(): void {
    this.pendingRequests.clear();
    this.lastRequestTimes.clear();
    console.log('🧹 Reset all matchmaking request tracking');
  }
}
