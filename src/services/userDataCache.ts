/**
 * User Data Cache Service
 * Preloads and caches user data to improve matchmaking performance
 */

import { UserService } from './userService';
import { RankedMatchmakingService } from './rankedMatchmakingService';

interface CachedUserData {
  profile: any;
  rankedStats: any;
  rankedEligibility: any;
  lastUpdated: number;
  hostData: any;
}

class UserDataCacheService {
  private cache = new Map<string, CachedUserData>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Preload and cache user data for faster matchmaking
   */
  async preloadUserData(userId: string): Promise<void> {
    try {
      console.log('🚀 Preloading user data for faster matchmaking...');
      
      // Run all queries in parallel for speed
      const [profile, rankedStats, rankedEligibility] = await Promise.all([
        UserService.getUserProfile(userId),
        RankedMatchmakingService.getUserRankedStats(userId).catch(() => null),
        RankedMatchmakingService.validateRankedEligibility(userId).catch(() => ({ valid: false, reason: 'Error validating' }))
      ]);

      if (!profile) {
        throw new Error('Could not fetch user profile');
      }

      // Prepare host data once
      const hostData = {
        playerDisplayName: profile.displayName || profile.email?.split('@')[0] || 'Anonymous',
        playerId: userId,
        displayBackgroundEquipped: profile.inventory.displayBackgroundEquipped,
        matchBackgroundEquipped: profile.inventory.matchBackgroundEquipped,
        playerStats: profile.stats
      };

      // Cache everything
      this.cache.set(userId, {
        profile,
        rankedStats,
        rankedEligibility,
        hostData,
        lastUpdated: Date.now()
      });

      console.log('✅ User data preloaded and cached');
    } catch (error) {
      console.error('❌ Error preloading user data:', error);
    }
  }

  /**
   * Get cached user data (with freshness check)
   */
  getCachedUserData(userId: string): CachedUserData | null {
    const cached = this.cache.get(userId);
    
    if (!cached) {
      return null;
    }

    // Check if cache is still fresh
    const age = Date.now() - cached.lastUpdated;
    if (age > this.CACHE_DURATION) {
      this.cache.delete(userId);
      return null;
    }

    return cached;
  }

  /**
   * Get user data with cache fallback
   */
  async getUserData(userId: string): Promise<{
    profile: any;
    hostData: any;
    rankedStats?: any;
    rankedEligibility?: any;
  }> {
    // Try cache first
    const cached = this.getCachedUserData(userId);
    if (cached) {
      console.log('⚡ Using cached user data (fast path)');
      return cached;
    }

    // Cache miss - load fresh data
    console.log('🔄 Cache miss - loading fresh user data');
    await this.preloadUserData(userId);
    
    const freshCached = this.getCachedUserData(userId);
    if (freshCached) {
      return freshCached;
    }

    throw new Error('Failed to load user data');
  }

  /**
   * Invalidate cache for user (call when user data changes)
   */
  invalidateUser(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const userDataCache = new UserDataCacheService();
