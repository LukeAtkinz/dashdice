// Achievement Context Provider
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Unsubscribe } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import AchievementDefinitionsService from '@/services/achievementDefinitionsService';
import AchievementTrackingService from '@/services/achievementTrackingService';
import {
  AchievementDefinition,
  UserAchievement,
  AchievementProgress,
  AchievementNotification,
  AchievementContextValue,
  AchievementCategory,
  MetricUpdate
} from '@/types/achievements';

const AchievementContext = createContext<AchievementContextValue | undefined>(undefined);

interface AchievementProviderProps {
  children: React.ReactNode;
}

export const AchievementProvider: React.FC<AchievementProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // Services
  const [definitionsService] = useState(() => AchievementDefinitionsService.getInstance());
  const [trackingService] = useState(() => AchievementTrackingService.getInstance());
  
  // State
  const [allAchievements, setAllAchievements] = useState<AchievementDefinition[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [userProgress, setUserProgress] = useState<AchievementProgress | null>(null);
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Subscriptions
  const [achievementSubscription, setAchievementSubscription] = useState<Unsubscribe | null>(null);
  const [userAchievementSubscription, setUserAchievementSubscription] = useState<Unsubscribe | null>(null);
  const [notificationSubscription, setNotificationSubscription] = useState<Unsubscribe | null>(null);

  /**
   * Initialize achievement data
   */
  const initializeAchievements = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      console.log('🎯 Initializing achievement system...');

      // Initialize user achievements if needed (don't throw on failure)
      try {
        await trackingService.initializeUserAchievements(user.uid);
      } catch (initError) {
        console.log('⚠️ Achievement initialization failed, continuing with read-only mode');
      }

      // Load achievement definitions (with fallback)
      try {
        const achievements = await definitionsService.getAllAchievements();
        setAllAchievements(achievements);
        console.log(`✅ Loaded ${achievements.length} achievement definitions`);
      } catch (defError) {
        console.error('❌ Failed to load achievement definitions:', defError);
        // Achievements should still show from fallback system
        setAllAchievements([]);
      }

      // Load user progress (graceful failure)
      try {
        const progress = await trackingService.getUserProgress(user.uid);
        setUserProgress(progress);
      } catch (progressError) {
        console.log('⚠️ Could not load user progress, starting fresh');
        setUserProgress(null);
      }

      // Load user achievements (graceful failure)
      try {
        const userAchs = await trackingService.getUserAchievements(user.uid);
        setUserAchievements(userAchs);
      } catch (userAchError) {
        console.log('⚠️ Could not load user achievements, starting fresh');
        setUserAchievements([]);
      }

      // Load notifications (graceful failure)
      try {
        const notifs = await trackingService.getUserNotifications(user.uid);
        setNotifications(notifs);
      } catch (notifError) {
        console.log('⚠️ Could not load notifications');
        setNotifications([]);
      }

      setIsLoading(false);
      console.log('✅ Achievement system initialization complete');
    } catch (error) {
      console.error('❌ Critical error initializing achievements:', error);
      // Even on critical error, don't leave in loading state
      setIsLoading(false);
      
      // Set empty arrays so UI can still show achievement placeholders
      setAllAchievements([]);
      setUserAchievements([]);
      setUserProgress(null);
      setNotifications([]);
    }
  }, [user, definitionsService, trackingService]);

  /**
   * Set up real-time subscriptions
   */
  const setupSubscriptions = useCallback(() => {
    if (!user) return;

    // Clean up existing subscriptions
    if (achievementSubscription) achievementSubscription();
    if (userAchievementSubscription) userAchievementSubscription();
    if (notificationSubscription) notificationSubscription();

    // Subscribe to achievement definitions
    const achSub = definitionsService.subscribeToAchievements((achievements) => {
      setAllAchievements(achievements);
    });
    setAchievementSubscription(achSub);

    // Subscribe to user achievements
    const userAchSub = trackingService.subscribeToUserAchievements(user.uid, (userAchs) => {
      setUserAchievements(userAchs);
    });
    setUserAchievementSubscription(userAchSub);

    // Subscribe to notifications
    const notifSub = trackingService.subscribeToUserNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });
    setNotificationSubscription(notifSub);
  }, [user, definitionsService, trackingService, achievementSubscription, userAchievementSubscription, notificationSubscription]);

  /**
   * Effects
   */
  useEffect(() => {
    if (user) {
      initializeAchievements();
      setupSubscriptions();
    } else {
      // Clear data when user logs out
      setAllAchievements([]);
      setUserAchievements([]);
      setUserProgress(null);
      setNotifications([]);
      setIsLoading(false);
    }

    // Cleanup subscriptions on unmount
    return () => {
      if (achievementSubscription) achievementSubscription();
      if (userAchievementSubscription) userAchievementSubscription();
      if (notificationSubscription) notificationSubscription();
    };
  }, [user, initializeAchievements, setupSubscriptions]);

  /**
   * Context methods
   */
  const getAchievementProgress = useCallback((achievementId: string): UserAchievement | undefined => {
    // First check if user has a record for this achievement
    const existingProgress = userAchievements.find(ua => ua.achievementId === achievementId);
    if (existingProgress) {
      return existingProgress;
    }
    
    // If no user achievement record exists, create a default one for display
    const achievementDef = allAchievements.find(a => a.id === achievementId);
    if (achievementDef) {
      return {
        id: `temp-${achievementId}`,
        userId: user?.uid || '',
        achievementId: achievementId,
        isCompleted: false,
        progress: 0,
        lastUpdated: new Date() as any, // This will be converted to Timestamp when saved
        metadata: {}
      } as UserAchievement;
    }
    
    return undefined;
  }, [userAchievements, allAchievements, user]);

  const getAchievementsByCategory = useCallback((category: AchievementCategory): AchievementDefinition[] => {
    return allAchievements.filter(achievement => achievement.category === category);
  }, [allAchievements]);

  const getCompletionPercentage = useCallback((): number => {
    if (allAchievements.length === 0) return 0;
    
    const completedCount = userAchievements.filter(ua => ua.isCompleted).length;
    return Math.round((completedCount / allAchievements.length) * 100);
  }, [allAchievements, userAchievements]);

  const markNotificationRead = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await trackingService.markNotificationRead(notificationId);
      // The real-time subscription will update the state
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }, [trackingService]);

  const updateMetric = useCallback(async (
    metric: string, 
    value: number, 
    operation: 'increment' | 'set' | 'max' = 'increment'
  ): Promise<void> => {
    if (!user) return;

    try {
      setIsUpdating(true);
      await trackingService.updateMetric(user.uid, metric, value, operation);
      
      // Refresh user progress
      const progress = await trackingService.getUserProgress(user.uid);
      setUserProgress(progress);
    } catch (error) {
      console.error('Error updating metric:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [user, trackingService]);

  const updateMultipleMetrics = useCallback(async (updates: MetricUpdate[]): Promise<void> => {
    if (!user) return;

    try {
      setIsUpdating(true);
      await trackingService.updateMultipleMetrics(user.uid, updates);
      
      // Refresh user progress
      const progress = await trackingService.getUserProgress(user.uid);
      setUserProgress(progress);
    } catch (error) {
      console.error('Error updating multiple metrics:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [user, trackingService]);

  const refreshAchievements = useCallback(async (): Promise<void> => {
    try {
      const achievements = await definitionsService.getAllAchievements(true);
      setAllAchievements(achievements);
    } catch (error) {
      console.error('Error refreshing achievements:', error);
      throw error;
    }
  }, [definitionsService]);

  const refreshUserProgress = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const [progress, userAchs, notifs] = await Promise.all([
        trackingService.getUserProgress(user.uid),
        trackingService.getUserAchievements(user.uid),
        trackingService.getUserNotifications(user.uid)
      ]);

      setUserProgress(progress);
      setUserAchievements(userAchs);
      setNotifications(notifs);
    } catch (error) {
      console.error('Error refreshing user progress:', error);
      throw error;
    }
  }, [user, trackingService]);

  /**
   * Context value
   */
  const contextValue: AchievementContextValue = {
    // Data
    allAchievements,
    userAchievements,
    userProgress,
    notifications,
    
    // Loading states
    isLoading,
    isUpdating,
    
    // Methods
    getAchievementProgress,
    getAchievementsByCategory,
    getCompletionPercentage,
    markNotificationRead,
    updateMetric,
    updateMultipleMetrics,
    refreshAchievements,
    refreshUserProgress
  };

  return (
    <AchievementContext.Provider value={contextValue}>
      {children}
    </AchievementContext.Provider>
  );
};

/**
 * Hook to use achievement context
 */
export const useAchievements = (): AchievementContextValue => {
  const context = useContext(AchievementContext);
  
  if (context === undefined) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  
  return context;
};

/**
 * Hook for recording common game events
 */
export const useAchievementTracking = () => {
  const { updateMultipleMetrics } = useAchievements();
  const { user } = useAuth();
  const trackingService = AchievementTrackingService.getInstance();

  const recordGameEnd = useCallback(async (
    won: boolean,
    diceRolled: number[],
    gameData?: any
  ) => {
    if (!user) return;

    try {
      await trackingService.recordGameEnd(user.uid, won, diceRolled, gameData);
    } catch (error) {
      console.error('Error recording game end:', error);
    }
  }, [user, trackingService]);

  const recordSocialAction = useCallback(async (action: string, value: number = 1) => {
    const updates = [{ metric: action, value, operation: 'increment' as const }];
    await updateMultipleMetrics(updates);
  }, [updateMultipleMetrics]);

  const recordProgressMilestone = useCallback(async (metric: string, value: number) => {
    const updates = [{ metric, value, operation: 'set' as const }];
    await updateMultipleMetrics(updates);
  }, [updateMultipleMetrics]);

  return {
    recordGameEnd,
    recordSocialAction,
    recordProgressMilestone
  };
};

export default AchievementContext;
