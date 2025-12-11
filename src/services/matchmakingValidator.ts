import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Matchmaking Validation Service
 * Pre-flight checks to ensure matchmaking will succeed
 * Prevents errors before they happen
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class MatchmakingValidator {
  
  /**
   * Validate user is ready for matchmaking
   */
  static async validateUser(userId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Check if user profile exists
      const { UserService } = await import('./userService');
      const userProfile = await UserService.getUserProfile(userId);
      
      if (!userProfile) {
        errors.push('User profile not found');
        return { valid: false, errors, warnings };
      }
      
      // Check if user has required fields
      if (!userProfile.displayName) {
        warnings.push('User has no display name');
      }
      
      // Check if user is already in active session
      const activeSessions = await this.getUserActiveSessions(userId);
      if (activeSessions.length > 0) {
        errors.push(`User already in ${activeSessions.length} active session(s)`);
      }
      
      // Check user is not banned
      if ((userProfile as any).isBanned) {
        errors.push('User is banned from matchmaking');
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
      
    } catch (error) {
      console.error('Error validating user:', error);
      errors.push('Failed to validate user');
      return { valid: false, errors, warnings };
    }
  }
  
  /**
   * Validate matchmaking request parameters
   */
  static validateRequest(
    gameMode: string,
    sessionType: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate game mode
    const validGameModes = ['classic', 'quickfire', 'time-attack'];
    if (!validGameModes.includes(gameMode)) {
      errors.push(`Invalid game mode: ${gameMode}`);
    }
    
    // Validate session type
    const validSessionTypes = ['quick', 'ranked', 'friend', 'tournament', 'rematch'];
    if (!validSessionTypes.includes(sessionType)) {
      errors.push(`Invalid session type: ${sessionType}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate system health before matchmaking
   */
  static async validateSystemHealth(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Check if health monitor is available
      const { MatchmakingHealthMonitor } = await import('./matchmakingHealthMonitor');
      const health = MatchmakingHealthMonitor.getCurrentHealth();
      
      if (!health) {
        warnings.push('Health monitoring not yet initialized');
        return { valid: true, errors, warnings };
      }
      
      // Check system health
      if (health.systemHealth === 'critical') {
        warnings.push('System health is critical - matchmaking may be slower');
      } else if (health.systemHealth === 'degraded') {
        warnings.push('System health is degraded');
      }
      
      // Check for too many stale sessions
      if (health.staleSessions > 10) {
        warnings.push(`High number of stale sessions: ${health.staleSessions}`);
      }
      
      return {
        valid: true, // Don't block matchmaking, just warn
        errors,
        warnings
      };
      
    } catch (error) {
      // Health check failed but don't block matchmaking
      warnings.push('Could not check system health');
      return { valid: true, errors, warnings };
    }
  }
  
  /**
   * Comprehensive pre-matchmaking validation
   */
  static async validateMatchmaking(
    userId: string,
    gameMode: string,
    sessionType: string
  ): Promise<ValidationResult> {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    
    // Validate user
    const userValidation = await this.validateUser(userId);
    allErrors.push(...userValidation.errors);
    allWarnings.push(...userValidation.warnings);
    
    // Validate request
    const requestValidation = this.validateRequest(gameMode, sessionType);
    allErrors.push(...requestValidation.errors);
    allWarnings.push(...requestValidation.warnings);
    
    // Validate system health
    const healthValidation = await this.validateSystemHealth();
    allWarnings.push(...healthValidation.warnings);
    
    // Log validation results
    if (allErrors.length > 0) {
      console.error('❌ Matchmaking validation failed:', allErrors);
    }
    if (allWarnings.length > 0) {
      console.warn('⚠️ Matchmaking validation warnings:', allWarnings);
    }
    
    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }
  
  /**
   * Get user's active sessions
   */
  private static async getUserActiveSessions(userId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'gameSessions'),
        where('status', 'in', ['waiting', 'matched', 'active']),
        where('hostData.playerId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }
}
