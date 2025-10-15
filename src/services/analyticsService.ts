// Firebase Analytics service for tracking user activities and dashboard metrics
import { analytics } from '@/services/firebase';
import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';

class AnalyticsService {
  private isEnabled = false;

  constructor() {
    // Only enable analytics in browser environment
    this.isEnabled = typeof window !== 'undefined' && !!analytics;
  }

  // Initialize user tracking
  setUser(userId: string, userProperties?: Record<string, any>) {
    if (!this.isEnabled || !analytics) return;

    try {
      setUserId(analytics, userId);
      
      if (userProperties) {
        setUserProperties(analytics, userProperties);
      }

      console.log('📊 Analytics: User initialized:', userId);
    } catch (error) {
      console.warn('Analytics setUser error:', error);
    }
  }

  // Track page views
  trackPageView(pageName: string, additionalParams?: Record<string, any>) {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'page_view', {
        page_title: pageName,
        page_location: window.location.href,
        ...additionalParams
      });

      console.log('📊 Analytics: Page view tracked:', pageName);
    } catch (error) {
      console.warn('Analytics trackPageView error:', error);
    }
  }

  // Track user login
  trackLogin(method: string = 'email') {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'login', {
        method: method
      });

      console.log('📊 Analytics: Login tracked:', method);
    } catch (error) {
      console.warn('Analytics trackLogin error:', error);
    }
  }

  // Track user signup
  trackSignUp(method: string = 'email') {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'sign_up', {
        method: method
      });

      console.log('📊 Analytics: Sign up tracked:', method);
    } catch (error) {
      console.warn('Analytics trackSignUp error:', error);
    }
  }

  // Track game events
  trackGameStart(gameMode: string, gameType: string = 'quick') {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'game_start', {
        game_mode: gameMode,
        game_type: gameType,
        timestamp: Date.now()
      });

      console.log('📊 Analytics: Game start tracked:', gameMode, gameType);
    } catch (error) {
      console.warn('Analytics trackGameStart error:', error);
    }
  }

  trackGameEnd(gameMode: string, result: 'win' | 'loss', duration: number, score?: number) {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'game_end', {
        game_mode: gameMode,
        result: result,
        duration_seconds: Math.round(duration / 1000),
        score: score || 0,
        timestamp: Date.now()
      });

      console.log('📊 Analytics: Game end tracked:', gameMode, result);
    } catch (error) {
      console.warn('Analytics trackGameEnd error:', error);
    }
  }

  // Track matchmaking events
  trackMatchmakingStart(gameMode: string, gameType: string) {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'matchmaking_start', {
        game_mode: gameMode,
        game_type: gameType
      });

      console.log('📊 Analytics: Matchmaking start tracked:', gameMode);
    } catch (error) {
      console.warn('Analytics trackMatchmakingStart error:', error);
    }
  }

  trackMatchFound(gameMode: string, opponentType: 'human' | 'bot', waitTime: number) {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'match_found', {
        game_mode: gameMode,
        opponent_type: opponentType,
        wait_time_seconds: Math.round(waitTime / 1000)
      });

      console.log('📊 Analytics: Match found tracked:', gameMode, opponentType);
    } catch (error) {
      console.warn('Analytics trackMatchFound error:', error);
    }
  }

  // Track social features
  trackFriendRequest(action: 'sent' | 'accepted' | 'declined') {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'friend_request', {
        action: action
      });

      console.log('📊 Analytics: Friend request tracked:', action);
    } catch (error) {
      console.warn('Analytics trackFriendRequest error:', error);
    }
  }

  trackChatMessage(type: 'global' | 'friend' | 'match') {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'chat_message', {
        type: type
      });

      console.log('📊 Analytics: Chat message tracked:', type);
    } catch (error) {
      console.warn('Analytics trackChatMessage error:', error);
    }
  }

  // Track achievements
  trackAchievementUnlocked(achievementId: string, category: string) {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'achievement_unlocked', {
        achievement_id: achievementId,
        achievement_category: category
      });

      console.log('📊 Analytics: Achievement unlocked tracked:', achievementId);
    } catch (error) {
      console.warn('Analytics trackAchievementUnlocked error:', error);
    }
  }

  // Track inventory/customization
  trackItemEquipped(itemType: string, itemId: string) {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'item_equipped', {
        item_type: itemType,
        item_id: itemId
      });

      console.log('📊 Analytics: Item equipped tracked:', itemType, itemId);
    } catch (error) {
      console.warn('Analytics trackItemEquipped error:', error);
    }
  }

  // Track engagement metrics
  trackSessionStart() {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'session_start', {
        timestamp: Date.now()
      });

      console.log('📊 Analytics: Session start tracked');
    } catch (error) {
      console.warn('Analytics trackSessionStart error:', error);
    }
  }

  trackFeatureUsage(feature: string, action: string, value?: string | number) {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'feature_usage', {
        feature_name: feature,
        action: action,
        value: value
      });

      console.log('📊 Analytics: Feature usage tracked:', feature, action);
    } catch (error) {
      console.warn('Analytics trackFeatureUsage error:', error);
    }
  }

  // Track user retention indicators
  trackDailyLogin() {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'daily_login', {
        date: new Date().toISOString().split('T')[0]
      });

      console.log('📊 Analytics: Daily login tracked');
    } catch (error) {
      console.warn('Analytics trackDailyLogin error:', error);
    }
  }

  // Track custom events
  trackCustomEvent(eventName: string, parameters?: Record<string, any>) {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, eventName, parameters);

      console.log('📊 Analytics: Custom event tracked:', eventName, parameters);
    } catch (error) {
      console.warn('Analytics trackCustomEvent error:', error);
    }
  }

  // Track errors for debugging
  trackError(errorType: string, errorMessage: string, context?: string) {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, 'app_error', {
        error_type: errorType,
        error_message: errorMessage,
        context: context || 'unknown'
      });

      console.log('📊 Analytics: Error tracked:', errorType, errorMessage);
    } catch (error) {
      console.warn('Analytics trackError error:', error);
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;