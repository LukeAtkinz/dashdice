/**
 * Matchmaking Error Recovery Service
 * Handles all error scenarios with automatic retry and fallback mechanisms
 * Ensures matchmaking never completely fails
 */

export interface RecoveryStrategy {
  name: string;
  priority: number;
  execute: () => Promise<any>;
  fallback?: RecoveryStrategy;
}

export class MatchmakingErrorRecovery {
  private static retryAttempts = new Map<string, number>();
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 2000; // 2 seconds
  
  /**
   * Execute a matchmaking operation with automatic retry
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    userId: string
  ): Promise<T> {
    const retryKey = `${userId}:${operationName}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    
    try {
      const result = await operation();
      
      // Success - clear retry counter
      this.retryAttempts.delete(retryKey);
      
      return result;
      
    } catch (error) {
      console.error(`❌ ${operationName} failed (attempt ${currentAttempts + 1}):`, error);
      
      // Increment retry counter
      this.retryAttempts.set(retryKey, currentAttempts + 1);
      
      // Check if we should retry
      if (currentAttempts < this.MAX_RETRY_ATTEMPTS) {
        console.log(`🔄 Retrying ${operationName} in ${this.RETRY_DELAY_MS}ms (attempt ${currentAttempts + 2}/${this.MAX_RETRY_ATTEMPTS})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
        
        // Retry recursively
        return await this.executeWithRetry(operation, operationName, userId);
      } else {
        // Max retries exceeded
        console.error(`❌ ${operationName} failed after ${this.MAX_RETRY_ATTEMPTS} attempts`);
        this.retryAttempts.delete(retryKey);
        
        throw error;
      }
    }
  }
  
  /**
   * Execute with fallback strategy
   */
  static async executeWithFallback<T>(
    primaryStrategy: RecoveryStrategy,
    fallbackStrategies: RecoveryStrategy[] = []
  ): Promise<T> {
    try {
      console.log(`🎯 Executing primary strategy: ${primaryStrategy.name}`);
      return await primaryStrategy.execute();
      
    } catch (error) {
      console.error(`❌ Primary strategy ${primaryStrategy.name} failed:`, error);
      
      // Try fallback strategies in order
      for (const fallback of fallbackStrategies) {
        try {
          console.log(`🔄 Trying fallback strategy: ${fallback.name}`);
          return await fallback.execute();
        } catch (fallbackError) {
          console.error(`❌ Fallback strategy ${fallback.name} failed:`, fallbackError);
          continue;
        }
      }
      
      // All strategies failed
      throw new Error(`All recovery strategies failed. Primary: ${primaryStrategy.name}`);
    }
  }
  
  /**
   * Handle specific matchmaking errors with appropriate recovery
   */
  static async handleMatchmakingError(
    error: any,
    userId: string,
    gameMode: string,
    sessionType: string
  ): Promise<{ recovered: boolean; action: string; message: string }> {
    const errorMessage = error?.message || String(error);
    
    // User already in session
    if (errorMessage.includes('already in session') || errorMessage.includes('already hosts')) {
      console.log(`🔧 Recovery: User in existing session, cleaning up...`);
      
      try {
        const { NewMatchmakingService } = await import('./newMatchmakingService');
        await NewMatchmakingService.cleanupUserMatches(userId);
        
        return {
          recovered: true,
          action: 'cleanup_retry',
          message: 'Cleaned up existing sessions. Please try again.'
        };
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
        return {
          recovered: false,
          action: 'manual_intervention',
          message: 'Please refresh the page and try again.'
        };
      }
    }
    
    // Lock conflict (user already searching)
    if (errorMessage.includes('Already searching') || errorMessage.includes('matchmaking queue')) {
      console.log(`🔧 Recovery: Lock conflict detected, releasing lock...`);
      
      try {
        const { MatchmakingLockService } = await import('./matchmakingLockService');
        MatchmakingLockService.forceReleaseLock(userId);
        
        return {
          recovered: true,
          action: 'lock_released',
          message: 'Previous search cancelled. Please try again.'
        };
      } catch (lockError) {
        return {
          recovered: false,
          action: 'wait',
          message: 'Please wait 10 seconds and try again.'
        };
      }
    }
    
    // Network/Firebase errors
    if (errorMessage.includes('network') || errorMessage.includes('unavailable') || 
        errorMessage.includes('timeout') || errorMessage.includes('UNAVAILABLE')) {
      console.log(`🔧 Recovery: Network error, suggesting retry...`);
      
      return {
        recovered: false,
        action: 'retry',
        message: 'Network issue detected. Please check your connection and try again.'
      };
    }
    
    // Profile not found
    if (errorMessage.includes('profile not found') || errorMessage.includes('User not found')) {
      console.log(`🔧 Recovery: Profile issue, suggesting refresh...`);
      
      return {
        recovered: false,
        action: 'refresh',
        message: 'Please refresh the page and try again.'
      };
    }
    
    // Transaction conflicts
    if (errorMessage.includes('transaction') || errorMessage.includes('conflict') || 
        errorMessage.includes('aborted')) {
      console.log(`🔧 Recovery: Transaction conflict, auto-retrying...`);
      
      return {
        recovered: true,
        action: 'auto_retry',
        message: 'Retrying automatically...'
      };
    }
    
    // Unknown error
    console.error('❌ Unknown matchmaking error:', error);
    
    return {
      recovered: false,
      action: 'unknown',
      message: 'An unexpected error occurred. Please try again or contact support.'
    };
  }
  
  /**
   * Create a bot match as last resort fallback
   */
  static async createBotMatchFallback(
    userId: string,
    gameMode: string,
    sessionType: 'quick' | 'ranked'
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      console.log(`🤖 Last resort: Creating bot match for ${userId}`);
      
      const { BotMatchingService } = await import('./botMatchingService');
      const { GameSessionService } = await import('./gameSessionService');
      const { UserService } = await import('./userService');
      
      // Get user profile
      const userProfile = await UserService.getUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }
      
      // Create session with just the user
      const hostData = {
        playerId: userId,
        playerDisplayName: userProfile.displayName || 'Player',
        playerStats: userProfile.stats || {},
        displayBackgroundEquipped: userProfile.inventory?.displayBackgroundEquipped || {},
        matchBackgroundEquipped: userProfile.inventory?.matchBackgroundEquipped || {},
        ready: false,
        joinedAt: new Date()
      };
      
      const sessionId = await GameSessionService.createSession(
        sessionType,
        gameMode,
        hostData as any,
        { maxPlayers: 2, expirationTime: 20 }
      );
      
      // Immediately trigger bot match (no timeout)
      await BotMatchingService.setupBotFallback(sessionId, userId, gameMode, sessionType);
      
      return {
        success: true,
        sessionId
      };
      
    } catch (error) {
      console.error('Bot match fallback failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Clear all retry counters for a user
   */
  static clearRetryCounters(userId: string): void {
    const keys = Array.from(this.retryAttempts.keys());
    for (const key of keys) {
      if (key.startsWith(`${userId}:`)) {
        this.retryAttempts.delete(key);
      }
    }
  }
  
  /**
   * Get retry statistics
   */
  static getRetryStats(): { totalActiveRetries: number; userRetries: Map<string, number> } {
    const userRetries = new Map<string, number>();
    
    for (const [key, attempts] of this.retryAttempts.entries()) {
      const userId = key.split(':')[0];
      userRetries.set(userId, (userRetries.get(userId) || 0) + attempts);
    }
    
    return {
      totalActiveRetries: this.retryAttempts.size,
      userRetries
    };
  }
}
