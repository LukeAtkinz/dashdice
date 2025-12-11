/**
 * Matchmaking Lock Service
 * Prevents duplicate/concurrent matchmaking requests from same user
 * Part of the 20+ player scalability fix
 */

export interface MatchmakingLock {
  userId: string;
  sessionType: string;
  gameMode: string;
  lockedAt: number;
  requestId: string;
}

export class MatchmakingLockService {
  private static locks = new Map<string, MatchmakingLock>();
  private static readonly LOCK_EXPIRATION_MS = 10000; // 10 seconds lock timeout
  
  /**
   * Try to acquire a matchmaking lock for a user
   * Returns true if lock acquired, false if user already has active lock
   */
  static acquireLock(userId: string, sessionType: string, gameMode: string): { success: boolean; requestId?: string; reason?: string } {
    const now = Date.now();
    const existingLock = this.locks.get(userId);
    
    // Check if lock already exists and is still valid
    if (existingLock && now - existingLock.lockedAt < this.LOCK_EXPIRATION_MS) {
      const timeRemaining = Math.ceil((this.LOCK_EXPIRATION_MS - (now - existingLock.lockedAt)) / 1000);
      return {
        success: false,
        reason: `Already searching for ${existingLock.sessionType} ${existingLock.gameMode} match. Please wait ${timeRemaining}s or cancel current search.`
      };
    }
    
    // Create new lock
    const requestId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lock: MatchmakingLock = {
      userId,
      sessionType,
      gameMode,
      lockedAt: now,
      requestId
    };
    
    this.locks.set(userId, lock);
    
    console.log(`🔒 Matchmaking lock acquired for ${userId} (${sessionType}/${gameMode}) - ID: ${requestId}`);
    
    return { success: true, requestId };
  }
  
  /**
   * Release a matchmaking lock for a user
   */
  static releaseLock(userId: string, requestId?: string): void {
    const lock = this.locks.get(userId);
    
    // Verify request ID if provided (prevents accidental release by wrong request)
    if (requestId && lock && lock.requestId !== requestId) {
      console.warn(`⚠️ Attempted to release lock with wrong requestId for ${userId}`);
      return;
    }
    
    if (lock) {
      this.locks.delete(userId);
      console.log(`🔓 Matchmaking lock released for ${userId}`);
    }
  }
  
  /**
   * Force release a lock (for cleanup/emergency)
   */
  static forceReleaseLock(userId: string): void {
    this.locks.delete(userId);
    console.log(`🔓 Force-released matchmaking lock for ${userId}`);
  }
  
  /**
   * Check if user has active lock
   */
  static hasActiveLock(userId: string): boolean {
    const lock = this.locks.get(userId);
    if (!lock) return false;
    
    const now = Date.now();
    const isExpired = now - lock.lockedAt >= this.LOCK_EXPIRATION_MS;
    
    if (isExpired) {
      // Auto-cleanup expired lock
      this.locks.delete(userId);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get lock details for user
   */
  static getLock(userId: string): MatchmakingLock | null {
    const lock = this.locks.get(userId);
    if (!lock) return null;
    
    const now = Date.now();
    const isExpired = now - lock.lockedAt >= this.LOCK_EXPIRATION_MS;
    
    if (isExpired) {
      this.locks.delete(userId);
      return null;
    }
    
    return lock;
  }
  
  /**
   * Cleanup expired locks (run periodically)
   */
  static cleanupExpiredLocks(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [userId, lock] of this.locks.entries()) {
      if (now - lock.lockedAt >= this.LOCK_EXPIRATION_MS) {
        this.locks.delete(userId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired matchmaking locks`);
    }
  }
  
  /**
   * Get statistics about current locks
   */
  static getStats(): { totalLocks: number; locksByType: Record<string, number> } {
    const locksByType: Record<string, number> = {};
    
    for (const lock of this.locks.values()) {
      const key = `${lock.sessionType}/${lock.gameMode}`;
      locksByType[key] = (locksByType[key] || 0) + 1;
    }
    
    return {
      totalLocks: this.locks.size,
      locksByType
    };
  }
  
  /**
   * Initialize cleanup interval
   */
  static initialize(): void {
    // Clean up expired locks every 30 seconds
    setInterval(() => {
      this.cleanupExpiredLocks();
    }, 30000);
    
    console.log('🔒 MatchmakingLockService initialized with 30s cleanup interval');
  }
}
