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
      console.log('🎯 Initializing achievement tracking for user:', userId);
      
      const progressRef = doc(db, 'achievementProgress', userId);
      const progressDoc = await getDoc(progressRef);

      if (!progressDoc.exists()) {
        console.log('📝 Creating new achievement progress document...');
        const initialProgress: AchievementProgress = {
          userId,
          metrics: {
            // Initialize with default values to prevent undefined errors
            dice_rolls_total: 0,
            games_played: 0,
            games_won: 0,
            win_streak: 0,
            friends_added: 0,
            friend_games_played: 0,
            friend_wins: 0
          },
          streaks: {},
          lastUpdated: Timestamp.now()
        };

        await setDoc(progressRef, initialProgress);
        console.log('✅ Achievement progress initialized successfully');
      } else {
        console.log('✅ Achievement progress already exists');
      }
    } catch (error: any) {
      console.error('❌ Error initializing user achievements:', error);
      
      // Handle permissions errors gracefully
      if (error?.code === 'permission-denied') {
        console.log('⚠️ Permission denied - achievements will work in read-only mode');
        return; // Don't throw, just log
      }
      
      // For other errors, don't throw to prevent breaking the app
      console.log('⚠️ Achievement initialization failed, but app will continue');
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
   * Update multiple metrics for a user with transaction safety
   */
  async updateMultipleMetrics(
    userId: string, 
    updates: MetricUpdate[],
    retryCount: number = 0
  ): Promise<AchievementEvaluationResult[]> {
    const maxRetries = 3;
    
    try {
      console.log(`🎯 Updating metrics for user ${userId} (attempt ${retryCount + 1}):`, updates);
      
      return await runTransaction(db, async (transaction) => {
        // Get current progress within transaction
        const progressRef = doc(db, 'achievementProgress', userId);
        const progressDoc = await transaction.get(progressRef);
        
        let currentProgress: AchievementProgress;
        if (progressDoc.exists()) {
          currentProgress = progressDoc.data() as AchievementProgress;
        } else {
          // Initialize new progress document
          currentProgress = {
            userId,
            metrics: {},
            streaks: {},
            lastUpdated: Timestamp.now()
          };
        }

        // Apply all metric updates
        const updatedMetrics = { ...currentProgress.metrics };
        const updatedStreaks = { ...currentProgress.streaks };
        
        for (const update of updates) {
          const currentValue = updatedMetrics[update.metric] || 0;
          
          switch (update.operation) {
            case 'increment':
              updatedMetrics[update.metric] = currentValue + update.value;
              break;
            case 'set':
              updatedMetrics[update.metric] = update.value;
              break;
            case 'max':
              updatedMetrics[update.metric] = Math.max(currentValue, update.value);
              break;
          }
        }

        // Update the document within transaction
        const updatedProgress: AchievementProgress = {
          ...currentProgress,
          metrics: updatedMetrics,
          streaks: updatedStreaks,
          lastUpdated: Timestamp.now()
        };

        transaction.set(progressRef, updatedProgress);
        
        console.log(`✅ Transaction completed for user ${userId}`);
        return []; // Return empty array for now, achievement checking will be done separately
      });
    } catch (error: any) {
      console.error(`❌ Error updating metrics for user ${userId} (attempt ${retryCount + 1}):`, error);
      
      // Handle specific Firebase errors with improved retry logic
      if (error?.code === 'failed-precondition' && retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000) + Math.random() * 1000;
        console.log(`⚠️ Document conflict detected, retrying in ${Math.round(delay)}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.updateMultipleMetrics(userId, updates, retryCount + 1);
      }
      
      if (error?.code === 'permission-denied') {
        console.log('⚠️ Permission denied for metric update');
        return [];
      }
      
      if (retryCount >= maxRetries) {
        console.error(`❌ Max retries (${maxRetries}) exceeded for user ${userId}`);
      }
      
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

    // Enhanced pattern analysis
    await this.analyzeGamePatterns(userId, diceRolled, won, gameData, updates);

    // Check for consecutive same rolls (Rollception achievement)
    await this.checkConsecutiveRolls(userId, diceRolled);

    // Prepare all metric updates in a single batch to avoid concurrent document updates
    const batchUpdates: MetricUpdate[] = [...updates];

    // Add daily games count update
    batchUpdates.push({ metric: 'daily_games_played', value: 1, operation: 'increment' });

    // Add hourly game streak update  
    batchUpdates.push({ metric: 'hourly_game_streak', value: 1, operation: 'increment' });

    if (won) {
      batchUpdates.push({ metric: 'games_won', value: 1, operation: 'increment' });
      // Handle win streak
      batchUpdates.push({ metric: 'win_streak', value: 1, operation: 'increment' });
      
      // Track friend wins if this was against a friend
      if (gameData?.opponentId && gameData?.isFriend) {
        batchUpdates.push({ metric: 'friend_wins', value: 1, operation: 'increment' });
        batchUpdates.push({ metric: 'games_with_friends', value: 1, operation: 'increment' });
        
        // Handle friend-specific stats separately to avoid document conflicts
        await this.updateWinsAgainstFriend(userId, gameData.opponentId);
        await this.resetLossStreakToFriend(userId, gameData.opponentId);
      }
    } else {
      batchUpdates.push({ metric: 'games_lost', value: 1, operation: 'increment' });
      // Break win streak
      batchUpdates.push({ metric: 'win_streak', value: 0, operation: 'set' });
      
      // Track friend losses if this was against a friend
      if (gameData?.opponentId && gameData?.isFriend) {
        batchUpdates.push({ metric: 'games_with_friends', value: 1, operation: 'increment' });
        
        // Handle friend-specific stats separately to avoid document conflicts
        await this.updateLossStreakToFriend(userId, gameData.opponentId);
      }
    }

    // Perform ALL achievement updates in a single transaction to prevent conflicts
    await this.updateAllGameMetrics(userId, batchUpdates, won, gameData);
  }

  /**
   * Comprehensive pattern analysis for new achievements
   */
  private async analyzeGamePatterns(
    userId: string,
    diceRolled: number[],
    won: boolean,
    gameData: any,
    updates: MetricUpdate[]
  ): Promise<void> {
    // Eclipse Patterns
    const oddNumbers = diceRolled.filter(d => d % 2 === 1);
    const evenNumbers = diceRolled.filter(d => d % 2 === 0);
    
    // Solar Eclipse - only even numbers
    if (diceRolled.length >= 5 && evenNumbers.length === diceRolled.length) {
      updates.push({ metric: 'game_only_even_rolls', value: 1, operation: 'increment' });
    }
    
    // Lunar Eclipse - only odd numbers  
    if (diceRolled.length >= 5 && oddNumbers.length === diceRolled.length) {
      updates.push({ metric: 'game_only_odd_rolls', value: 1, operation: 'increment' });
    }
    
    // Equinox - equal odd and even
    if (diceRolled.length >= 6 && oddNumbers.length === evenNumbers.length) {
      updates.push({ metric: 'game_equal_odd_even', value: 1, operation: 'increment' });
    }

    // Sequential Pattern Detection
    if (this.hasSequence123456(diceRolled)) {
      updates.push({ metric: 'sequential_1_to_6', value: 1, operation: 'increment' });
    }

    // Victory/Loss Analysis
    if (won && gameData?.finalRoll && gameData?.pointsNeeded) {
      if (gameData.finalRoll === gameData.pointsNeeded) {
        updates.push({ metric: 'exact_winning_roll', value: 1, operation: 'increment' });
      }
    }
    
    if (!won && gameData?.finalRoll && gameData?.pointsNeeded) {
      if (gameData.finalRoll === gameData.pointsNeeded) {
        updates.push({ metric: 'exact_losing_roll', value: 1, operation: 'increment' });
      }
    }

    // Perfect Run - all rolls above 4
    if (won && diceRolled.every(d => d > 4)) {
      updates.push({ metric: 'game_all_high_rolls', value: 1, operation: 'increment' });
    }

    // Victory Margins
    if (won && gameData?.winMargin) {
      if (gameData.winMargin === 1) {
        updates.push({ metric: 'win_by_one_point', value: 1, operation: 'increment' });
      }
      if (gameData.winMargin >= 50) {
        updates.push({ metric: 'win_by_fifty_plus', value: 1, operation: 'increment' });
      }
    }

    // Win without sixes
    if (won && !diceRolled.includes(6)) {
      updates.push({ metric: 'win_without_sixes', value: 1, operation: 'increment' });
    }

    // Special patterns
    if (this.countDoubleOnes(diceRolled) >= 3) {
      updates.push({ metric: 'triple_snake_eyes_game', value: 1, operation: 'increment' });
    }

    if (this.countDoubleSixes(diceRolled) >= 5) {
      updates.push({ metric: 'five_double_sixes_game', value: 1, operation: 'increment' });
    }

    if (this.hasOneSixConsecutive(diceRolled)) {
      updates.push({ metric: 'one_six_consecutive', value: 1, operation: 'increment' });
    }

    // Count specific numbers
    const sixCount = diceRolled.filter(d => d === 6).length;
    const oneCount = diceRolled.filter(d => d === 1).length;
    
    if (sixCount >= 10) {
      updates.push({ metric: 'ten_sixes_in_match', value: 1, operation: 'increment' });
    }
    
    if (oneCount >= 10) {
      updates.push({ metric: 'ten_ones_in_match', value: 1, operation: 'increment' });
    }

    // Doubles count
    if (this.countDoublesInGame(diceRolled) >= 5) {
      updates.push({ metric: 'five_doubles_in_game', value: 1, operation: 'increment' });
    }

    // Streak detection in real-time
    await this.checkStreakPatterns(userId, diceRolled, updates);
  }

  /**
   * Update all game metrics in a single transaction to prevent document conflicts
   */
  private async updateAllGameMetrics(
    userId: string,
    batchUpdates: MetricUpdate[],
    won: boolean,
    gameData: any
  ): Promise<void> {
    try {
      console.log(`🎯 Updating all game metrics for user ${userId} in single transaction`);
      
      await runTransaction(db, async (transaction) => {
        // Get all document references
        const progressRef = doc(db, 'achievementProgress', userId);
        const today = new Date().toISOString().split('T')[0];
        const currentHour = new Date().getHours();
        const dailyMetricsRef = doc(db, 'dailyMetrics', `${userId}_${today}`);
        const hourlyMetricsRef = doc(db, 'hourlyMetrics', `${userId}_${today}_${currentHour}`);

        // Get current documents
        const [progressDoc, dailyDoc, hourlyDoc] = await Promise.all([
          transaction.get(progressRef),
          transaction.get(dailyMetricsRef),
          transaction.get(hourlyMetricsRef)
        ]);

        // Initialize progress document if needed
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

        // Apply all metric updates
        const updatedMetrics = { ...currentProgress.metrics };
        const updatedStreaks = { ...currentProgress.streaks };
        
        for (const update of batchUpdates) {
          const currentValue = updatedMetrics[update.metric] || 0;
          
          switch (update.operation) {
            case 'increment':
              updatedMetrics[update.metric] = currentValue + update.value;
              break;
            case 'set':
              updatedMetrics[update.metric] = update.value;
              break;
            case 'max':
              updatedMetrics[update.metric] = Math.max(currentValue, update.value);
              break;
          }
        }

        // Update consecutive games streak
        const currentStreak = updatedStreaks.consecutive_games_streak?.current || 0;
        const bestStreak = updatedStreaks.consecutive_games_streak?.best || 0;
        const newCurrentStreak = currentStreak + 1;
        const newBestStreak = Math.max(bestStreak, newCurrentStreak);
        
        updatedStreaks.consecutive_games_streak = {
          current: newCurrentStreak,
          best: newBestStreak,
          lastUpdate: Timestamp.now()
        };

        // Update all documents in the transaction
        const updatedProgress: AchievementProgress = {
          ...currentProgress,
          metrics: updatedMetrics,
          streaks: updatedStreaks,
          lastUpdated: Timestamp.now()
        };

        transaction.set(progressRef, updatedProgress);

        // Update daily metrics
        const dailyData = dailyDoc.exists() ? dailyDoc.data() : {};
        transaction.set(dailyMetricsRef, {
          ...dailyData,
          userId,
          date: today,
          games_played: (dailyData.games_played || 0) + 1,
          lastUpdated: Timestamp.now()
        });

        // Update hourly metrics
        const hourlyData = hourlyDoc.exists() ? hourlyDoc.data() : {};
        transaction.set(hourlyMetricsRef, {
          ...hourlyData,
          userId,
          date: today,
          hour: currentHour,
          games_played: (hourlyData.games_played || 0) + 1,
          lastUpdated: Timestamp.now()
        });

        console.log(`✅ All metrics updated successfully for user ${userId}`);
      });
    } catch (error: any) {
      console.error(`❌ Error updating all game metrics for user ${userId}:`, error);
      
      // Handle specific Firebase errors with retry logic
      if (error?.code === 'failed-precondition') {
        console.log('⚠️ Document version conflict detected, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
        return this.updateAllGameMetrics(userId, batchUpdates, won, gameData);
      }
      
      if (error?.code === 'permission-denied') {
        console.log('⚠️ Permission denied for comprehensive metric update');
        return;
      }
      
      throw error;
    }
  }

  /**
   * Check for streak patterns during the game
   */
  private async checkStreakPatterns(userId: string, diceRolled: number[], updates: MetricUpdate[]): Promise<void> {
    // Check for three 6s in a row
    if (this.hasConsecutiveNumbers(diceRolled, 6, 3)) {
      updates.push({ metric: 'three_sixes_streak', value: 1, operation: 'increment' });
    }

    // Check for three 1s in a row
    if (this.hasConsecutiveNumbers(diceRolled, 1, 3)) {
      updates.push({ metric: 'three_ones_streak', value: 1, operation: 'increment' });
    }

    // Check for same number three times in a row (any number)
    for (let i = 1; i <= 6; i++) {
      if (this.hasConsecutiveNumbers(diceRolled, i, 3)) {
        updates.push({ metric: 'same_number_three_streak', value: 1, operation: 'increment' });
        break;
      }
    }
  }

  /**
   * Helper methods for pattern detection
   */
  private hasSequence123456(diceRolled: number[]): boolean {
    const sequence = [1, 2, 3, 4, 5, 6];
    for (let i = 0; i <= diceRolled.length - 6; i++) {
      let found = true;
      for (let j = 0; j < 6; j++) {
        if (diceRolled[i + j] !== sequence[j]) {
          found = false;
          break;
        }
      }
      if (found) return true;
    }
    return false;
  }

  private countDoubleOnes(diceRolled: number[]): number {
    let count = 0;
    for (let i = 0; i < diceRolled.length - 1; i++) {
      if (diceRolled[i] === 1 && diceRolled[i + 1] === 1) {
        count++;
        i++; // Skip next to avoid overlapping
      }
    }
    return count;
  }

  private countDoubleSixes(diceRolled: number[]): number {
    let count = 0;
    for (let i = 0; i < diceRolled.length - 1; i++) {
      if (diceRolled[i] === 6 && diceRolled[i + 1] === 6) {
        count++;
        i++; // Skip next to avoid overlapping
      }
    }
    return count;
  }

  private hasOneSixConsecutive(diceRolled: number[]): boolean {
    for (let i = 0; i < diceRolled.length - 1; i++) {
      if ((diceRolled[i] === 1 && diceRolled[i + 1] === 6) ||
          (diceRolled[i] === 6 && diceRolled[i + 1] === 1)) {
        return true;
      }
    }
    return false;
  }

  private countDoublesInGame(diceRolled: number[]): number {
    let count = 0;
    for (let i = 0; i < diceRolled.length - 1; i++) {
      if (diceRolled[i] === diceRolled[i + 1]) {
        count++;
        i++; // Skip next to avoid overlapping
      }
    }
    return count;
  }

  private hasConsecutiveNumbers(diceRolled: number[], number: number, count: number): boolean {
    let consecutive = 0;
    for (const roll of diceRolled) {
      if (roll === number) {
        consecutive++;
        if (consecutive >= count) return true;
      } else {
        consecutive = 0;
      }
    }
    return false;
  }

  /**
   * Track when a friend is added
   */
  async recordFriendAdded(userId: string): Promise<void> {
    const updates: MetricUpdate[] = [
      { metric: 'friends_added', value: 1, operation: 'increment' }
    ];

    await this.updateMultipleMetrics(userId, updates);
  }

  /**
   * Check for consecutive same rolls (Rollception)
   */
  private async checkConsecutiveRolls(userId: string, diceRolled: number[]): Promise<void> {
    try {
      const progressRef = doc(db, 'achievementProgress', userId);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) return;
      
      const progress = progressDoc.data() as AchievementProgress;
      const streaks = progress.streaks || {};
      
      // Check each roll for consecutive patterns
      for (let i = 0; i < diceRolled.length - 2; i++) {
        const roll1 = diceRolled[i];
        const roll2 = diceRolled[i + 1];
        const roll3 = diceRolled[i + 2];
        
        if (roll1 === roll2 && roll2 === roll3) {
          // Found 3 consecutive same rolls
          const streakKey = 'same_number_streak';
          const currentStreak = streaks[streakKey]?.current || 0;
          
          await updateDoc(progressRef, {
            [`streaks.${streakKey}.current`]: Math.max(currentStreak, 3),
            [`streaks.${streakKey}.best`]: Math.max(streaks[streakKey]?.best || 0, 3),
            [`streaks.${streakKey}.lastUpdate`]: Timestamp.now()
          });
          
          break; // Only count once per game
        }
      }
    } catch (error) {
      console.error('Error checking consecutive rolls:', error);
    }
  }

  /**
   * Update daily games count
   */
  private async updateDailyGamesCount(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyRef = doc(db, 'dailyMetrics', `${userId}_${today}`);
      const dailyDoc = await getDoc(dailyRef);
      
      if (dailyDoc.exists()) {
        await updateDoc(dailyRef, {
          games_played: increment(1),
          lastUpdated: Timestamp.now()
        });
      } else {
        await setDoc(dailyRef, {
          userId,
          date: today,
          games_played: 1,
          lastUpdated: Timestamp.now()
        });
      }
      
      // Update user's daily games metric using setDoc with merge
      const progressRef = doc(db, 'achievementProgress', userId);
      await setDoc(progressRef, {
        userId,
        metrics: {
          daily_games_played: increment(1)
        }
      }, { merge: true });
      
    } catch (error) {
      console.error('Error updating daily games count:', error);
    }
  }

  /**
   * Update consecutive games streak (Iron Will)
   */
  private async updateConsecutiveGamesStreak(userId: string): Promise<void> {
    try {
      const progressRef = doc(db, 'achievementProgress', userId);
      const progressDoc = await getDoc(progressRef);
      
      let currentStreak = 0;
      let bestStreak = 0;
      
      if (progressDoc.exists()) {
        const progress = progressDoc.data() as AchievementProgress;
        const streaks = progress.streaks || {};
        currentStreak = streaks.consecutive_games_streak?.current || 0;
        bestStreak = streaks.consecutive_games_streak?.best || 0;
      }
      
      const newCurrentStreak = currentStreak + 1;
      const newBestStreak = Math.max(bestStreak, newCurrentStreak);
      
      await setDoc(progressRef, {
        userId,
        streaks: {
          consecutive_games_streak: {
            current: newCurrentStreak,
            best: newBestStreak,
            lastUpdate: Timestamp.now()
          }
        }
      }, { merge: true });
      
    } catch (error) {
      console.error('Error updating consecutive games streak:', error);
    }
  }

  /**
   * Reset consecutive games streak (when user logs out)
   */
  async resetConsecutiveGamesStreak(userId: string): Promise<void> {
    try {
      const progressRef = doc(db, 'achievementProgress', userId);
      await setDoc(progressRef, {
        userId,
        streaks: {
          consecutive_games_streak: {
            current: 0,
            lastUpdate: Timestamp.now()
          }
        }
      }, { merge: true });
      
    } catch (error) {
      console.error('Error resetting consecutive games streak:', error);
    }
  }

  /**
   * Update hourly game streak (Clockbreaker)
   */
  private async updateHourlyGameStreak(userId: string): Promise<void> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const today = now.toISOString().split('T')[0];
      
      const hourlyRef = doc(db, 'hourlyMetrics', `${userId}_${today}`);
      const hourlyDoc = await getDoc(hourlyRef);
      
      let hourlyData: any = {
        userId,
        date: today,
        hoursPlayed: {},
        lastUpdated: Timestamp.now()
      };
      
      if (hourlyDoc.exists()) {
        hourlyData = hourlyDoc.data();
      }
      
      // Mark this hour as having games played
      hourlyData.hoursPlayed[currentHour] = true;
      
      // Count consecutive hours with games
      let consecutiveHours = 0;
      const sortedHours = Object.keys(hourlyData.hoursPlayed).map(Number).sort((a, b) => a - b);
      
      for (let i = 0; i < sortedHours.length; i++) {
        if (i === 0 || sortedHours[i] === sortedHours[i - 1] + 1) {
          consecutiveHours++;
        } else {
          consecutiveHours = 1;
        }
      }
      
      await setDoc(hourlyRef, hourlyData);
      
      // Update user's hourly streak metric using setDoc with merge
      const progressRef = doc(db, 'achievementProgress', userId);
      await setDoc(progressRef, {
        userId,
        metrics: {
          hourly_game_streak: Math.max(consecutiveHours, 0)
        }
      }, { merge: true });
      
    } catch (error) {
      console.error('Error updating hourly game streak:', error);
    }
  }

  /**
   * Update wins against specific friend
   */
  private async updateWinsAgainstFriend(userId: string, friendId: string): Promise<void> {
    try {
      const friendStatsRef = doc(db, 'friendStats', `${userId}_${friendId}`);
      const friendStatsDoc = await getDoc(friendStatsRef);
      
      let wins = 1;
      if (friendStatsDoc.exists()) {
        const data = friendStatsDoc.data();
        wins = (data.wins || 0) + 1;
        await updateDoc(friendStatsRef, {
          wins: wins,
          lastUpdated: Timestamp.now()
        });
      } else {
        await setDoc(friendStatsRef, {
          userId,
          friendId,
          wins: 1,
          losses: 0,
          lossStreak: 0,
          lastUpdated: Timestamp.now()
        });
      }
      
      // Update max wins against single friend metric
      const progressRef = doc(db, 'achievementProgress', userId);
      const progressDoc = await getDoc(progressRef);
      
      if (progressDoc.exists()) {
        const progress = progressDoc.data() as AchievementProgress;
        const currentMax = progress.metrics?.max_wins_against_single_friend || 0;
        
        if (wins > currentMax) {
          await updateDoc(progressRef, {
            'metrics.max_wins_against_single_friend': wins
          });
        }
      }
      
    } catch (error) {
      console.error('Error updating wins against friend:', error);
    }
  }

  /**
   * Update loss streak to specific friend
   */
  private async updateLossStreakToFriend(userId: string, friendId: string): Promise<void> {
    try {
      const friendStatsRef = doc(db, 'friendStats', `${userId}_${friendId}`);
      const friendStatsDoc = await getDoc(friendStatsRef);
      
      let lossStreak = 1;
      if (friendStatsDoc.exists()) {
        const data = friendStatsDoc.data();
        lossStreak = (data.lossStreak || 0) + 1;
        await updateDoc(friendStatsRef, {
          losses: increment(1),
          lossStreak: lossStreak,
          lastUpdated: Timestamp.now()
        });
      } else {
        await setDoc(friendStatsRef, {
          userId,
          friendId,
          wins: 0,
          losses: 1,
          lossStreak: 1,
          lastUpdated: Timestamp.now()
        });
      }
      
      // Update max loss streak metric
      const progressRef = doc(db, 'achievementProgress', userId);
      const progressDoc = await getDoc(progressRef);
      
      if (progressDoc.exists()) {
        const progress = progressDoc.data() as AchievementProgress;
        const currentMax = progress.metrics?.max_losses_to_single_friend_streak || 0;
        
        if (lossStreak > currentMax) {
          await updateDoc(progressRef, {
            'metrics.max_losses_to_single_friend_streak': lossStreak
          });
        }
      }
      
    } catch (error) {
      console.error('Error updating loss streak to friend:', error);
    }
  }

  /**
   * Reset loss streak to specific friend
   */
  private async resetLossStreakToFriend(userId: string, friendId: string): Promise<void> {
    try {
      const friendStatsRef = doc(db, 'friendStats', `${userId}_${friendId}`);
      const friendStatsDoc = await getDoc(friendStatsRef);
      
      if (friendStatsDoc.exists()) {
        await updateDoc(friendStatsRef, {
          lossStreak: 0,
          lastUpdated: Timestamp.now()
        });
      }
      
    } catch (error) {
      console.error('Error resetting loss streak to friend:', error);
    }
  }

  /**
   * Reset daily metrics (call this at midnight)
   */
  async resetDailyMetrics(userId: string): Promise<void> {
    try {
      const progressRef = doc(db, 'achievementProgress', userId);
      await updateDoc(progressRef, {
        'metrics.daily_games_played': 0
      });
      
    } catch (error) {
      console.error('Error resetting daily metrics:', error);
    }
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
