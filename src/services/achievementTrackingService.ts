// Achievement Tracking Service
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc,
  updateDoc, 
  addDoc,
  query, 
  where, 
  orderBy, 
  Timestamp,
  onSnapshot,
  Unsubscribe,
  writeBatch,
  increment,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { 
  AchievementDefinition,
  UserAchievement, 
  AchievementProgress, 
  AchievementNotification, 
  MetricUpdate, 
  AchievementEvaluationResult,
  BatchEvaluationResult,
  GameMetrics
} from '@/types/achievements';
import AchievementDefinitionsService from './achievementDefinitionsService';

class AchievementTrackingService {
  private static instance: AchievementTrackingService;
  private definitionsService: AchievementDefinitionsService;
  private listeners: Set<Unsubscribe> = new Set();

  constructor() {
    this.definitionsService = AchievementDefinitionsService.getInstance();
  }

  static getInstance(): AchievementTrackingService {
    if (!AchievementTrackingService.instance) {
      AchievementTrackingService.instance = new AchievementTrackingService();
    }
    return AchievementTrackingService.instance;
  }

  /**
   * Initialize achievement tracking for a new user
   */
  async initializeUserAchievements(userId: string): Promise<void> {
    try {
      const progressRef = doc(db, 'achievementProgress', userId);
      const progressDoc = await getDoc(progressRef);

      if (!progressDoc.exists()) {
        const initialProgress: AchievementProgress = {
          userId,
          metrics: {},
          streaks: {},
          lastUpdated: Timestamp.now()
        };

        await setDoc(progressRef, initialProgress);
      }
    } catch (error) {
      console.error('Error initializing user achievements:', error);
      throw error;
    }
  }

  /**
   * Get user's achievement progress
   */
  async getUserProgress(userId: string): Promise<AchievementProgress | null> {
    try {
      const progressRef = doc(db, 'achievementProgress', userId);
      const progressDoc = await getDoc(progressRef);

      if (progressDoc.exists()) {
        return progressDoc.data() as AchievementProgress;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user progress:', error);
      throw error;
    }
  }

  /**
   * Get user's completed achievements
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const achievementsRef = collection(db, 'userAchievements');
      const q = query(
        achievementsRef,
        where('userId', '==', userId),
        orderBy('completedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const achievements: UserAchievement[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as UserAchievement;
        data.id = doc.id;
        achievements.push(data);
      });

      return achievements;
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      throw error;
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId: string, limit: number = 50): Promise<AchievementNotification[]> {
    try {
      const notificationsRef = collection(db, 'achievementNotifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const notifications: AchievementNotification[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as AchievementNotification;
        data.id = doc.id;
        notifications.push(data);
      });

      return notifications.slice(0, limit);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Update a single metric for a user
   */
  async updateMetric(
    userId: string, 
    metric: string, 
    value: number, 
    operation: 'increment' | 'set' | 'max' = 'increment'
  ): Promise<AchievementEvaluationResult[]> {
    return this.updateMultipleMetrics(userId, [{ metric, value, operation }]);
  }

  /**
   * Update multiple metrics for a user
   */
  async updateMultipleMetrics(
    userId: string, 
    updates: MetricUpdate[]
  ): Promise<AchievementEvaluationResult[]> {
    try {
      return await runTransaction(db, async (transaction) => {
        // Get current progress
        const progressRef = doc(db, 'achievementProgress', userId);
        const progressDoc = await transaction.get(progressRef);
        
        let currentProgress: AchievementProgress;
        if (progressDoc.exists()) {
          currentProgress = progressDoc.data() as AchievementProgress;
        } else {
          currentProgress = {
            userId,
            metrics: {},
            streaks: {},
            lastUpdated: Timestamp.now()
          };
        }

        // Apply metric updates
        for (const update of updates) {
          const currentValue = currentProgress.metrics[update.metric] || 0;
          
          switch (update.operation) {
            case 'increment':
              currentProgress.metrics[update.metric] = currentValue + update.value;
              break;
            case 'set':
              currentProgress.metrics[update.metric] = update.value;
              break;
            case 'max':
              currentProgress.metrics[update.metric] = Math.max(currentValue, update.value);
              break;
          }
        }

        // Update streaks
        this.updateStreaks(currentProgress, updates);

        // Save updated progress
        currentProgress.lastUpdated = Timestamp.now();
        transaction.set(progressRef, currentProgress);

        // Evaluate achievements
        const evaluationResults = await this.evaluateAchievements(userId, currentProgress);

        // Process unlocked achievements
        for (const result of evaluationResults) {
          if (result.wasUnlocked) {
            await this.processAchievementUnlock(userId, result, transaction);
          }
        }

        return evaluationResults;
      });
    } catch (error) {
      console.error('Error updating metrics:', error);
      throw error;
    }
  }

  /**
   * Update streak tracking
   */
  private updateStreaks(progress: AchievementProgress, updates: MetricUpdate[]): void {
    const now = Timestamp.now();
    
    for (const update of updates) {
      if (update.metric.includes('_streak') || update.metric === 'win_streak') {
        const streakData = progress.streaks[update.metric] || {
          current: 0,
          best: 0,
          lastUpdate: now
        };

        if (update.operation === 'increment' && update.value > 0) {
          // Continue streak
          streakData.current += update.value;
          streakData.best = Math.max(streakData.best, streakData.current);
        } else if (update.operation === 'set') {
          // Set streak value directly
          streakData.current = update.value;
          streakData.best = Math.max(streakData.best, update.value);
        } else if (update.value === 0) {
          // Break streak
          streakData.current = 0;
        }

        streakData.lastUpdate = now;
        progress.streaks[update.metric] = streakData;
      }
    }
  }

  /**
   * Evaluate achievements based on current progress
   */
  private async evaluateAchievements(
    userId: string, 
    progress: AchievementProgress
  ): Promise<AchievementEvaluationResult[]> {
    try {
      const allAchievements = await this.definitionsService.getAllAchievements();
      const userAchievements = await this.getUserAchievements(userId);
      const completedAchievementIds = new Set(
        userAchievements.filter(ua => ua.isCompleted).map(ua => ua.achievementId)
      );

      const results: AchievementEvaluationResult[] = [];

      for (const achievement of allAchievements) {
        // Skip if already completed
        if (completedAchievementIds.has(achievement.id)) {
          continue;
        }

        // Check prerequisites
        if (achievement.prerequisites) {
          const hasAllPrerequisites = achievement.prerequisites.every(prereqId =>
            completedAchievementIds.has(prereqId)
          );
          if (!hasAllPrerequisites) {
            continue;
          }
        }

        const evaluationResult = this.evaluateSingleAchievement(achievement, progress, userId);
        results.push(evaluationResult);
      }

      return results;
    } catch (error) {
      console.error('Error evaluating achievements:', error);
      throw error;
    }
  }

  /**
   * Evaluate a single achievement
   */
  private evaluateSingleAchievement(
    achievement: AchievementDefinition,
    progress: AchievementProgress,
    userId: string
  ): AchievementEvaluationResult {
    const { requirements } = achievement;
    let currentProgress = 0;
    let isUnlocked = false;

    switch (requirements.operator) {
      case 'greater_than_equal':
      case 'greater_than':
      case 'equal':
      case 'less_than':
      case 'less_than_equal':
        currentProgress = progress.metrics[requirements.metric] || 0;
        isUnlocked = this.evaluateComparison(currentProgress, requirements.operator, requirements.value);
        break;

      case 'streak':
        const streakData = progress.streaks[requirements.metric];
        currentProgress = streakData?.current || 0;
        isUnlocked = currentProgress >= requirements.value;
        break;

      case 'custom':
        const customResult = this.evaluateCustomRequirement(achievement, progress);
        currentProgress = customResult.progress;
        isUnlocked = customResult.isUnlocked;
        break;
    }

    const result: AchievementEvaluationResult = {
      achievementId: achievement.id,
      wasUnlocked: isUnlocked,
      progressChanged: true, // We'll determine this better in a real implementation
      newProgress: currentProgress
    };

    if (isUnlocked) {
      result.notification = {
        id: '', // Will be set when created
        userId,
        achievementId: achievement.id,
        type: 'unlock',
        message: `You unlocked "${achievement.name}"!`,
        createdAt: Timestamp.now(),
        isRead: false,
        metadata: {
          rewardsEarned: achievement.rewards
        }
      };
    }

    return result;
  }

  /**
   * Evaluate comparison operators
   */
  private evaluateComparison(value: number, operator: string, target: number): boolean {
    switch (operator) {
      case 'greater_than_equal': return value >= target;
      case 'greater_than': return value > target;
      case 'equal': return value === target;
      case 'less_than': return value < target;
      case 'less_than_equal': return value <= target;
      default: return false;
    }
  }

  /**
   * Evaluate custom requirements
   */
  private evaluateCustomRequirement(
    achievement: AchievementDefinition, 
    progress: AchievementProgress
  ): { progress: number; isUnlocked: boolean } {
    const { conditions } = achievement.requirements;
    
    if (!conditions) {
      return { progress: 0, isUnlocked: false };
    }

    switch (conditions.type) {
      case 'multiple_dice_milestone':
        // Check if all requirements are met
        let allMet = true;
        let totalProgress = 0;
        
        for (const req of conditions.requirements) {
          const currentValue = progress.metrics[req.metric] || 0;
          if (currentValue < req.value) {
            allMet = false;
          }
          totalProgress += Math.min(currentValue / req.value, 1);
        }
        
        return {
          progress: Math.round((totalProgress / conditions.requirements.length) * 100),
          isUnlocked: allMet
        };

      default:
        return { progress: 0, isUnlocked: false };
    }
  }

  /**
   * Process achievement unlock
   */
  private async processAchievementUnlock(
    userId: string,
    result: AchievementEvaluationResult,
    transaction: any
  ): Promise<void> {
    // Create user achievement record
    const userAchievementRef = doc(collection(db, 'userAchievements'));
    const userAchievement: Omit<UserAchievement, 'id'> = {
      userId,
      achievementId: result.achievementId,
      isCompleted: true,
      completedAt: Timestamp.now(),
      progress: result.newProgress,
      lastUpdated: Timestamp.now()
    };
    
    transaction.set(userAchievementRef, userAchievement);

    // Create notification
    if (result.notification) {
      const notificationRef = doc(collection(db, 'achievementNotifications'));
      transaction.set(notificationRef, result.notification);
    }

    // Apply rewards (this could be expanded to update user profile, currency, etc.)
    const achievement = await this.definitionsService.getAchievement(result.achievementId);
    if (achievement?.rewards) {
      await this.applyAchievementRewards(userId, achievement.rewards, transaction);
    }
  }

  /**
   * Apply achievement rewards
   */
  private async applyAchievementRewards(
    userId: string,
    rewards: any,
    transaction: any
  ): Promise<void> {
    // This would integrate with user profile/currency systems
    // For now, we'll just log what rewards would be applied
    console.log(`Applying rewards for user ${userId}:`, rewards);
    
    // In a real implementation, you might:
    // - Update user currency
    // - Unlock cosmetics
    // - Grant titles
    // - Update user profile with new badges/privileges
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'achievementNotifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Set up real-time listeners
   */
  subscribeToUserAchievements(
    userId: string,
    callback: (achievements: UserAchievement[]) => void
  ): Unsubscribe {
    const achievementsRef = collection(db, 'userAchievements');
    const q = query(
      achievementsRef,
      where('userId', '==', userId),
      orderBy('completedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const achievements: UserAchievement[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as UserAchievement;
        data.id = doc.id;
        achievements.push(data);
      });

      callback(achievements);
    }, (error) => {
      console.error('Error in user achievements subscription:', error);
    });

    this.listeners.add(unsubscribe);
    return unsubscribe;
  }

  subscribeToUserNotifications(
    userId: string,
    callback: (notifications: AchievementNotification[]) => void
  ): Unsubscribe {
    const notificationsRef = collection(db, 'achievementNotifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications: AchievementNotification[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as AchievementNotification;
        data.id = doc.id;
        notifications.push(data);
      });

      callback(notifications);
    }, (error) => {
      console.error('Error in notifications subscription:', error);
    });

    this.listeners.add(unsubscribe);
    return unsubscribe;
  }

  /**
   * Utility methods for common game events
   */
  async recordGameEnd(
    userId: string,
    won: boolean,
    diceRolled: number[],
    gameData: any
  ): Promise<void> {
    const updates: MetricUpdate[] = [
      { metric: 'games_played', value: 1, operation: 'increment' },
      { metric: 'total_dice_rolled', value: diceRolled.length, operation: 'increment' }
    ];

    // Count dice values
    for (const die of diceRolled) {
      updates.push({
        metric: `dice_${this.numberToWord(die)}s_rolled`,
        value: 1,
        operation: 'increment'
      });
    }

    if (won) {
      updates.push({ metric: 'games_won', value: 1, operation: 'increment' });
      // Handle win streak
      updates.push({ metric: 'win_streak', value: 1, operation: 'increment' });
    } else {
      updates.push({ metric: 'games_lost', value: 1, operation: 'increment' });
      // Break win streak
      updates.push({ metric: 'win_streak', value: 0, operation: 'set' });
    }

    await this.updateMultipleMetrics(userId, updates);
  }

  private numberToWord(num: number): string {
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
    return words[num] || 'unknown';
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}

export default AchievementTrackingService;
