# Achievements System Implementation Guide

## Overview
This README outlines the implementation of a comprehensive achievements system for DashDice, allowing players to earn rewards and recognition for their gaming accomplishments, skill milestones, and dedication to the platform.

## Core Features
- **Achievement Tracking**: Monitor player progress across multiple categories
- **Real-time Updates**: Instant achievement unlocks with visual notifications
- **Progress Indicators**: Show completion percentages for ongoing achievements
- **Achievement Categories**: Organize by game performance, social interaction, and platform engagement
- **Reward System**: Unlock cosmetics, titles, and special privileges
- **Achievement Showcase**: Display earned achievements on user profiles
- **Leaderboards**: Compare achievement progress with friends and global players

## Database Schema

### Firestore Collections

#### Achievement Definitions Collection
```typescript
// src/types/index.ts
interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: 'gameplay' | 'social' | 'progression' | 'special' | 'seasonal';
  type: 'counter' | 'milestone' | 'streak' | 'conditional' | 'hidden';
  difficulty: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  requirements: {
    metric: string; // e.g., 'dice_ones_rolled', 'games_won', 'friends_added'
    operator: 'equals' | 'greater_than' | 'greater_than_equal' | 'less_than' | 'streak' | 'custom';
    value: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'lifetime';
    conditions?: Record<string, any>; // Additional conditions
  };
  rewards: {
    points: number;
    title?: string;
    badge?: string;
    cosmetics?: string[];
    currency?: number;
    specialPrivileges?: string[];
  };
  icon: string;
  rarity_color: string;
  isActive: boolean;
  isHidden: boolean; // Secret achievements
  releaseDate: Timestamp;
  expiryDate?: Timestamp; // For seasonal achievements
  prerequisites?: string[]; // Other achievement IDs required
}
```

#### User Achievements Collection
```typescript
interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  completedAt?: Timestamp;
  startedAt: Timestamp;
  lastUpdated: Timestamp;
  currentStreak?: number;
  bestStreak?: number;
  metadata?: Record<string, any>; // Additional tracking data
}
```

#### Achievement Progress Collection
```typescript
interface AchievementProgress {
  id: string;
  userId: string;
  metrics: {
    // Gameplay metrics
    games_played: number;
    games_won: number;
    games_lost: number;
    total_dice_rolled: number;
    dice_ones_rolled: number;
    dice_twos_rolled: number;
    dice_threes_rolled: number;
    dice_fours_rolled: number;
    dice_fives_rolled: number;
    dice_sixes_rolled: number;
    perfect_games: number; // Games won without opponent scoring
    comeback_wins: number; // Won from behind
    quick_wins: number; // Won in under X time
    
    // Social metrics
    friends_added: number;
    messages_sent: number;
    games_with_friends: number;
    invitations_sent: number;
    
    // Streak metrics
    current_win_streak: number;
    best_win_streak: number;
    current_play_streak: number; // Days played in a row
    best_play_streak: number;
    
    // Time-based metrics
    total_playtime_minutes: number;
    daily_login_streak: number;
    
    // Special metrics
    lucky_rolls: number; // Specific combinations
    unlucky_rolls: number;
    tournaments_participated: number;
    tournaments_won: number;
  };
  lastUpdated: Timestamp;
  dailyMetrics: {
    date: string; // YYYY-MM-DD
    metrics: Partial<typeof metrics>;
  }[];
  weeklyMetrics: {
    week: string; // YYYY-WW
    metrics: Partial<typeof metrics>;
  }[];
  monthlyMetrics: {
    month: string; // YYYY-MM
    metrics: Partial<typeof metrics>;
  }[];
}
```

#### Achievement Notifications Collection
```typescript
interface AchievementNotification {
  id: string;
  userId: string;
  achievementId: string;
  type: 'unlocked' | 'progress' | 'milestone';
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  metadata?: {
    progress?: number;
    maxProgress?: number;
    rewardsClaimed?: boolean;
  };
}
```

## Implementation Architecture

### 1. Achievement Definitions Service

#### Achievement Configuration and Management
```typescript
// src/services/achievementDefinitionsService.ts
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export class AchievementDefinitionsService {
  private static achievementCache: Map<string, AchievementDefinition> = new Map();
  private static lastCacheUpdate: number = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get all active achievement definitions
  static async getAllAchievements(): Promise<AchievementDefinition[]> {
    try {
      if (this.shouldUpdateCache()) {
        await this.updateCache();
      }
      
      return Array.from(this.achievementCache.values())
        .filter(achievement => achievement.isActive);
    } catch (error) {
      console.error('Error getting achievements:', error);
      return [];
    }
  }

  // Get achievements by category
  static async getAchievementsByCategory(category: string): Promise<AchievementDefinition[]> {
    const allAchievements = await this.getAllAchievements();
    return allAchievements.filter(achievement => achievement.category === category);
  }

  // Get specific achievement definition
  static async getAchievementDefinition(achievementId: string): Promise<AchievementDefinition | null> {
    try {
      if (this.shouldUpdateCache()) {
        await this.updateCache();
      }
      
      return this.achievementCache.get(achievementId) || null;
    } catch (error) {
      console.error('Error getting achievement definition:', error);
      return null;
    }
  }

  // Check if user meets prerequisites for achievement
  static async checkPrerequisites(
    userId: string, 
    achievementId: string
  ): Promise<boolean> {
    const achievement = await this.getAchievementDefinition(achievementId);
    if (!achievement || !achievement.prerequisites) return true;

    // Check if user has completed all prerequisite achievements
    for (const prereqId of achievement.prerequisites) {
      const userAchievement = await this.getUserAchievement(userId, prereqId);
      if (!userAchievement || !userAchievement.isCompleted) {
        return false;
      }
    }

    return true;
  }

  private static shouldUpdateCache(): boolean {
    return Date.now() - this.lastCacheUpdate > this.CACHE_DURATION;
  }

  private static async updateCache(): Promise<void> {
    const q = query(collection(db, 'achievementDefinitions'));
    const snapshot = await getDocs(q);
    
    this.achievementCache.clear();
    snapshot.docs.forEach(doc => {
      const achievement = { id: doc.id, ...doc.data() } as AchievementDefinition;
      this.achievementCache.set(achievement.id, achievement);
    });
    
    this.lastCacheUpdate = Date.now();
  }

  private static async getUserAchievement(
    userId: string, 
    achievementId: string
  ): Promise<UserAchievement | null> {
    try {
      const q = query(
        collection(db, 'userAchievements'),
        where('userId', '==', userId),
        where('achievementId', '==', achievementId)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserAchievement;
    } catch (error) {
      console.error('Error getting user achievement:', error);
      return null;
    }
  }
}
```

### 2. Achievement Tracking Service

#### Core Achievement Progress Management
```typescript
// src/services/achievementTrackingService.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs,
  query, 
  where,
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { AchievementDefinitionsService } from './achievementDefinitionsService';

export class AchievementTrackingService {
  // Update a specific metric for a user
  static async updateMetric(
    userId: string,
    metric: string,
    value: number,
    operation: 'set' | 'increment' = 'increment'
  ): Promise<void> {
    try {
      const progressRef = doc(db, 'achievementProgress', userId);
      const progressDoc = await getDoc(progressRef);

      if (!progressDoc.exists()) {
        await this.initializeUserProgress(userId);
      }

      const updateData: any = {};
      updateData[`metrics.${metric}`] = operation === 'increment' ? increment(value) : value;
      updateData.lastUpdated = serverTimestamp();

      await updateDoc(progressRef, updateData);

      // Update daily/weekly/monthly metrics
      await this.updateTimeBasedMetrics(userId, metric, value);

      // Check for achievement unlocks
      await this.checkAchievementUnlocks(userId, metric);
    } catch (error) {
      console.error('Error updating metric:', error);
    }
  }

  // Track game completion and update relevant metrics
  static async trackGameCompletion(
    userId: string,
    gameResult: {
      won: boolean;
      opponentScore: number;
      userScore: number;
      gameDurationSeconds: number;
      diceRolls: number[];
      wasComeback?: boolean;
      wasPerfect?: boolean;
    }
  ): Promise<void> {
    const batch = writeBatch(db);
    const progressRef = doc(db, 'achievementProgress', userId);

    try {
      // Update game metrics
      const updates: Record<string, any> = {
        'metrics.games_played': increment(1),
        'metrics.total_dice_rolled': increment(gameResult.diceRolls.length),
        lastUpdated: serverTimestamp()
      };

      if (gameResult.won) {
        updates['metrics.games_won'] = increment(1);
        updates['metrics.current_win_streak'] = increment(1);
        
        if (gameResult.wasPerfect) {
          updates['metrics.perfect_games'] = increment(1);
        }
        
        if (gameResult.wasComeback) {
          updates['metrics.comeback_wins'] = increment(1);
        }
        
        if (gameResult.gameDurationSeconds < 60) {
          updates['metrics.quick_wins'] = increment(1);
        }
      } else {
        updates['metrics.games_lost'] = increment(1);
        updates['metrics.current_win_streak'] = 0;
      }

      // Track dice roll outcomes
      gameResult.diceRolls.forEach(roll => {
        const diceKey = `dice_${this.numberToWord(roll)}s_rolled`;
        updates[`metrics.${diceKey}`] = increment(1);
      });

      // Track special roll patterns
      const luckyRolls = this.countLuckyRolls(gameResult.diceRolls);
      const unluckyRolls = this.countUnluckyRolls(gameResult.diceRolls);
      
      if (luckyRolls > 0) {
        updates['metrics.lucky_rolls'] = increment(luckyRolls);
      }
      
      if (unluckyRolls > 0) {
        updates['metrics.unlucky_rolls'] = increment(unluckyRolls);
      }

      batch.update(progressRef, updates);
      await batch.commit();

      // Update streak tracking
      await this.updateStreakTracking(userId, gameResult.won);

      // Check for achievements
      await this.checkMultipleAchievements(userId, Object.keys(updates));
    } catch (error) {
      console.error('Error tracking game completion:', error);
    }
  }

  // Check if user has unlocked any achievements
  static async checkAchievementUnlocks(userId: string, changedMetric?: string): Promise<void> {
    try {
      const achievements = await AchievementDefinitionsService.getAllAchievements();
      const userProgress = await this.getUserProgress(userId);
      
      if (!userProgress) return;

      for (const achievement of achievements) {
        // Skip if user already has this achievement
        const existingAchievement = await this.getUserAchievement(userId, achievement.id);
        if (existingAchievement?.isCompleted) continue;

        // Check prerequisites
        const meetsPrerequisites = await AchievementDefinitionsService.checkPrerequisites(
          userId, 
          achievement.id
        );
        if (!meetsPrerequisites) continue;

        // Check if achievement is unlocked
        const isUnlocked = await this.evaluateAchievementCondition(
          achievement,
          userProgress.metrics
        );

        if (isUnlocked) {
          await this.unlockAchievement(userId, achievement.id);
        } else {
          // Update progress for non-completed achievements
          await this.updateAchievementProgress(userId, achievement, userProgress.metrics);
        }
      }
    } catch (error) {
      console.error('Error checking achievement unlocks:', error);
    }
  }

  // Unlock achievement for user
  static async unlockAchievement(userId: string, achievementId: string): Promise<void> {
    try {
      const achievement = await AchievementDefinitionsService.getAchievementDefinition(achievementId);
      if (!achievement) return;

      // Create or update user achievement
      const existingAchievement = await this.getUserAchievement(userId, achievementId);
      
      if (existingAchievement && !existingAchievement.isCompleted) {
        // Update existing achievement
        await updateDoc(doc(db, 'userAchievements', existingAchievement.id), {
          isCompleted: true,
          completedAt: serverTimestamp(),
          progress: achievement.requirements.value,
          maxProgress: achievement.requirements.value,
          lastUpdated: serverTimestamp()
        });
      } else if (!existingAchievement) {
        // Create new achievement record
        await addDoc(collection(db, 'userAchievements'), {
          userId,
          achievementId,
          progress: achievement.requirements.value,
          maxProgress: achievement.requirements.value,
          isCompleted: true,
          completedAt: serverTimestamp(),
          startedAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
      }

      // Create notification
      await this.createAchievementNotification(userId, achievementId, 'unlocked');

      // Apply rewards
      await this.applyAchievementRewards(userId, achievement);
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  }

  // Evaluate if achievement condition is met
  private static async evaluateAchievementCondition(
    achievement: AchievementDefinition,
    metrics: any
  ): Promise<boolean> {
    const { metric, operator, value, conditions } = achievement.requirements;
    const currentValue = metrics[metric] || 0;

    switch (operator) {
      case 'equals':
        return currentValue === value;
      case 'greater_than':
        return currentValue > value;
      case 'greater_than_equal':
        return currentValue >= value;
      case 'less_than':
        return currentValue < value;
      case 'streak':
        // Handle streak-based achievements
        return this.evaluateStreakCondition(achievement, metrics);
      case 'custom':
        // Handle complex custom conditions
        return this.evaluateCustomCondition(achievement, metrics);
      default:
        return false;
    }
  }

  private static evaluateStreakCondition(
    achievement: AchievementDefinition,
    metrics: any
  ): boolean {
    const { metric, value } = achievement.requirements;
    
    if (metric === 'win_streak') {
      return (metrics.current_win_streak || 0) >= value;
    }
    
    if (metric === 'play_streak') {
      return (metrics.current_play_streak || 0) >= value;
    }
    
    return false;
  }

  private static evaluateCustomCondition(
    achievement: AchievementDefinition,
    metrics: any
  ): boolean {
    const { conditions } = achievement.requirements;
    
    // Example: Rolling 100 ones AND 100 sixes
    if (conditions?.type === 'multiple_dice_milestone') {
      return conditions.requirements.every((req: any) => 
        (metrics[req.metric] || 0) >= req.value
      );
    }
    
    // Add more custom conditions as needed
    return false;
  }

  private static async updateAchievementProgress(
    userId: string,
    achievement: AchievementDefinition,
    metrics: any
  ): Promise<void> {
    const currentProgress = metrics[achievement.requirements.metric] || 0;
    const maxProgress = achievement.requirements.value;
    
    const existingAchievement = await this.getUserAchievement(userId, achievement.id);
    
    if (existingAchievement) {
      await updateDoc(doc(db, 'userAchievements', existingAchievement.id), {
        progress: currentProgress,
        lastUpdated: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'userAchievements'), {
        userId,
        achievementId: achievement.id,
        progress: currentProgress,
        maxProgress,
        isCompleted: false,
        startedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
    }
  }

  private static async getUserProgress(userId: string): Promise<AchievementProgress | null> {
    try {
      const doc = await getDoc(doc(db, 'achievementProgress', userId));
      if (!doc.exists()) return null;
      return { id: doc.id, ...doc.data() } as AchievementProgress;
    } catch (error) {
      console.error('Error getting user progress:', error);
      return null;
    }
  }

  private static async getUserAchievement(
    userId: string, 
    achievementId: string
  ): Promise<UserAchievement | null> {
    try {
      const q = query(
        collection(db, 'userAchievements'),
        where('userId', '==', userId),
        where('achievementId', '==', achievementId)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserAchievement;
    } catch (error) {
      console.error('Error getting user achievement:', error);
      return null;
    }
  }

  private static async initializeUserProgress(userId: string): Promise<void> {
    const initialProgress: Partial<AchievementProgress> = {
      userId,
      metrics: {
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        total_dice_rolled: 0,
        dice_ones_rolled: 0,
        dice_twos_rolled: 0,
        dice_threes_rolled: 0,
        dice_fours_rolled: 0,
        dice_fives_rolled: 0,
        dice_sixes_rolled: 0,
        perfect_games: 0,
        comeback_wins: 0,
        quick_wins: 0,
        friends_added: 0,
        messages_sent: 0,
        games_with_friends: 0,
        invitations_sent: 0,
        current_win_streak: 0,
        best_win_streak: 0,
        current_play_streak: 0,
        best_play_streak: 0,
        total_playtime_minutes: 0,
        daily_login_streak: 0,
        lucky_rolls: 0,
        unlucky_rolls: 0,
        tournaments_participated: 0,
        tournaments_won: 0
      },
      lastUpdated: serverTimestamp(),
      dailyMetrics: [],
      weeklyMetrics: [],
      monthlyMetrics: []
    };

    await setDoc(doc(db, 'achievementProgress', userId), initialProgress);
  }

  private static numberToWord(num: number): string {
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
    return words[num] || 'unknown';
  }

  private static countLuckyRolls(rolls: number[]): number {
    let count = 0;
    
    // Count consecutive sixes
    for (let i = 0; i < rolls.length - 2; i++) {
      if (rolls[i] === 6 && rolls[i + 1] === 6 && rolls[i + 2] === 6) {
        count++;
      }
    }
    
    // Add other lucky patterns
    return count;
  }

  private static countUnluckyRolls(rolls: number[]): number {
    let count = 0;
    
    // Count consecutive ones
    for (let i = 0; i < rolls.length - 2; i++) {
      if (rolls[i] === 1 && rolls[i + 1] === 1 && rolls[i + 2] === 1) {
        count++;
      }
    }
    
    return count;
  }

  private static async updateTimeBasedMetrics(
    userId: string,
    metric: string,
    value: number
  ): Promise<void> {
    // Implementation for daily/weekly/monthly metric tracking
    // This would update the respective time-based collections
  }

  private static async updateStreakTracking(userId: string, won: boolean): Promise<void> {
    // Implementation for streak tracking logic
  }

  private static async checkMultipleAchievements(
    userId: string,
    changedMetrics: string[]
  ): Promise<void> {
    // Check achievements related to the changed metrics
    for (const metric of changedMetrics) {
      await this.checkAchievementUnlocks(userId, metric);
    }
  }

  private static async createAchievementNotification(
    userId: string,
    achievementId: string,
    type: 'unlocked' | 'progress' | 'milestone'
  ): Promise<void> {
    const achievement = await AchievementDefinitionsService.getAchievementDefinition(achievementId);
    if (!achievement) return;

    await addDoc(collection(db, 'achievementNotifications'), {
      userId,
      achievementId,
      type,
      message: `Achievement unlocked: ${achievement.name}!`,
      isRead: false,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      metadata: {
        rewardsClaimed: false
      }
    });
  }

  private static async applyAchievementRewards(
    userId: string,
    achievement: AchievementDefinition
  ): Promise<void> {
    // Implementation for applying rewards (points, cosmetics, titles, etc.)
    // This would integrate with inventory and user profile systems
  }
}
```

### 3. Achievement Context

#### React Context for Achievement State Management
```typescript
// src/context/AchievementContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AchievementTrackingService, AchievementDefinitionsService } from '@/services';
import { useAuth } from './AuthContext';

interface AchievementContextType {
  // Achievement data
  userAchievements: UserAchievement[];
  allAchievements: AchievementDefinition[];
  notifications: AchievementNotification[];
  progress: AchievementProgress | null;
  
  // UI state
  isLoading: boolean;
  showNotification: boolean;
  latestUnlock: AchievementDefinition | null;
  
  // Actions
  trackMetric: (metric: string, value: number, operation?: 'set' | 'increment') => Promise<void>;
  trackGameCompletion: (gameResult: any) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  claimRewards: (achievementId: string) => Promise<void>;
  
  // Getters
  getAchievementsByCategory: (category: string) => AchievementDefinition[];
  getCompletionPercentage: () => number;
  getAchievementProgress: (achievementId: string) => UserAchievement | null;
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

export function AchievementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<AchievementDefinition[]>([]);
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [latestUnlock, setLatestUnlock] = useState<AchievementDefinition | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadAchievementData = async () => {
      setIsLoading(true);
      try {
        // Load all achievement definitions
        const achievements = await AchievementDefinitionsService.getAllAchievements();
        setAllAchievements(achievements);

        // Load user's achievement progress
        // This would implement real-time listeners
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading achievement data:', error);
        setIsLoading(false);
      }
    };

    loadAchievementData();
  }, [user]);

  const trackMetric = async (
    metric: string, 
    value: number, 
    operation: 'set' | 'increment' = 'increment'
  ) => {
    if (!user) return;
    await AchievementTrackingService.updateMetric(user.uid, metric, value, operation);
  };

  const trackGameCompletion = async (gameResult: any) => {
    if (!user) return;
    await AchievementTrackingService.trackGameCompletion(user.uid, gameResult);
  };

  const markNotificationRead = async (notificationId: string) => {
    // Implementation for marking notification as read
  };

  const claimRewards = async (achievementId: string) => {
    // Implementation for claiming achievement rewards
  };

  const getAchievementsByCategory = (category: string) => {
    return allAchievements.filter(achievement => achievement.category === category);
  };

  const getCompletionPercentage = () => {
    if (allAchievements.length === 0) return 0;
    const completedCount = userAchievements.filter(ua => ua.isCompleted).length;
    return Math.round((completedCount / allAchievements.length) * 100);
  };

  const getAchievementProgress = (achievementId: string) => {
    return userAchievements.find(ua => ua.achievementId === achievementId) || null;
  };

  const value: AchievementContextType = {
    userAchievements,
    allAchievements,
    notifications,
    progress,
    isLoading,
    showNotification,
    latestUnlock,
    trackMetric,
    trackGameCompletion,
    markNotificationRead,
    claimRewards,
    getAchievementsByCategory,
    getCompletionPercentage,
    getAchievementProgress
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
    </AchievementContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (context === undefined) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
}
```

## Frontend Components

### 1. Achievement Card Component

```typescript
// src/components/achievements/AchievementCard.tsx
'use client';

import React from 'react';
import { useAchievements } from '@/context/AchievementContext';

interface AchievementCardProps {
  achievement: AchievementDefinition;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
}

export default function AchievementCard({ 
  achievement, 
  size = 'medium', 
  showProgress = true 
}: AchievementCardProps) {
  const { getAchievementProgress } = useAchievements();
  
  const userProgress = getAchievementProgress(achievement.id);
  const isCompleted = userProgress?.isCompleted || false;
  const progress = userProgress?.progress || 0;
  const maxProgress = achievement.requirements.value;
  const progressPercentage = Math.min((progress / maxProgress) * 100, 100);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'common': return 'from-gray-400 to-gray-600';
      case 'rare': return 'from-blue-400 to-blue-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-yellow-600';
      case 'mythic': return 'from-red-400 to-red-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const sizeClasses = {
    small: 'w-16 h-16 text-xs',
    medium: 'w-24 h-24 text-sm',
    large: 'w-32 h-32 text-base'
  };

  return (
    <div className={`relative group ${isCompleted ? 'cursor-pointer' : ''}`}>
      {/* Achievement Icon */}
      <div className={`
        ${sizeClasses[size]} 
        rounded-lg 
        bg-gradient-to-br ${getDifficultyColor(achievement.difficulty)}
        flex items-center justify-center
        transition-all duration-300 hover:scale-105
        ${isCompleted ? 'opacity-100' : 'opacity-60'}
        ${achievement.isHidden && !isCompleted ? 'opacity-30' : ''}
      `}>
        {isCompleted ? (
          <img 
            src={achievement.icon} 
            alt={achievement.name}
            className="w-3/4 h-3/4 object-contain"
          />
        ) : (
          <div className="text-white text-2xl">🔒</div>
        )}
        
        {/* Completion Badge */}
        {isCompleted && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && !isCompleted && progress > 0 && (
        <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 max-w-xs">
          <h4 className="text-white font-semibold text-sm">{achievement.name}</h4>
          <p className="text-gray-300 text-xs mt-1">{achievement.description}</p>
          
          {!isCompleted && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Progress</span>
                <span>{progress}/{maxProgress}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {isCompleted && userProgress?.completedAt && (
            <p className="text-green-400 text-xs mt-1">
              Completed: {userProgress.completedAt.toDate().toLocaleDateString()}
            </p>
          )}
          
          {/* Rewards Preview */}
          {achievement.rewards.points > 0 && (
            <div className="mt-2 text-xs text-yellow-400">
              +{achievement.rewards.points} XP
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2. Achievements Dashboard Component

```typescript
// src/components/achievements/AchievementsDashboard.tsx
'use client';

import React, { useState } from 'react';
import { useAchievements } from '@/context/AchievementContext';
import AchievementCard from './AchievementCard';

export default function AchievementsDashboard() {
  const { 
    allAchievements, 
    userAchievements,
    getAchievementsByCategory,
    getCompletionPercentage,
    isLoading 
  } = useAchievements();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [showIncomplete, setShowIncomplete] = useState<boolean>(true);

  const categories = [
    { id: 'all', name: 'All', icon: '🏆' },
    { id: 'gameplay', name: 'Gameplay', icon: '🎲' },
    { id: 'social', name: 'Social', icon: '👥' },
    { id: 'progression', name: 'Progress', icon: '📈' },
    { id: 'special', name: 'Special', icon: '⭐' },
    { id: 'seasonal', name: 'Seasonal', icon: '🎃' }
  ];

  const filteredAchievements = selectedCategory === 'all' 
    ? allAchievements 
    : getAchievementsByCategory(selectedCategory);

  const visibleAchievements = filteredAchievements.filter(achievement => {
    const userProgress = userAchievements.find(ua => ua.achievementId === achievement.id);
    const isCompleted = userProgress?.isCompleted || false;
    
    if (isCompleted && !showCompleted) return false;
    if (!isCompleted && !showIncomplete) return false;
    
    return true;
  });

  const completedCount = userAchievements.filter(ua => ua.isCompleted).length;
  const totalCount = allAchievements.length;
  const completionPercentage = getCompletionPercentage();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">Achievements</h1>
        
        {/* Progress Overview */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Overall Progress</h2>
              <p className="text-gray-400">{completedCount} of {totalCount} achievements unlocked</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-400">{completionPercentage}%</div>
              <div className="text-sm text-gray-400">Complete</div>
            </div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
              ${selectedCategory === category.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* View Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <label className="flex items-center space-x-2 text-gray-300">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded"
          />
          <span>Show Completed</span>
        </label>
        
        <label className="flex items-center space-x-2 text-gray-300">
          <input
            type="checkbox"
            checked={showIncomplete}
            onChange={(e) => setShowIncomplete(e.target.checked)}
            className="rounded"
          />
          <span>Show In Progress</span>
        </label>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {visibleAchievements.map(achievement => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            size="medium"
            showProgress={true}
          />
        ))}
      </div>

      {/* Empty State */}
      {visibleAchievements.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">No achievements found</div>
          <p className="text-gray-500 mt-2">Try adjusting your filters or start playing to unlock achievements!</p>
        </div>
      )}
    </div>
  );
}
```

### 3. Achievement Notification Component

```typescript
// src/components/achievements/AchievementNotification.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useAchievements } from '@/context/AchievementContext';

export default function AchievementNotification() {
  const { notifications, markNotificationRead } = useAchievements();
  const [currentNotification, setCurrentNotification] = useState<AchievementNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show the latest unread notification
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length > 0) {
      const latest = unreadNotifications[0];
      setCurrentNotification(latest);
      setIsVisible(true);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          markNotificationRead(latest.id);
          setCurrentNotification(null);
        }, 300);
      }, 5000);
    }
  }, [notifications]);

  if (!currentNotification || !isVisible) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-50 transform transition-all duration-300 ease-out
      ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
    `}>
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-4 shadow-lg max-w-sm border-2 border-yellow-400">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-2xl">🏆</span>
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">Achievement Unlocked!</h3>
            <p className="text-yellow-100 text-sm">{currentNotification.message}</p>
          </div>
          
          <button
            onClick={() => setIsVisible(false)}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Achievement Examples

### Predefined Achievement Definitions

```typescript
// Example achievement definitions that would be stored in Firestore
const sampleAchievements: AchievementDefinition[] = [
  {
    id: 'first_win',
    name: 'First Victory',
    description: 'Win your first game',
    category: 'gameplay',
    type: 'milestone',
    difficulty: 'common',
    requirements: {
      metric: 'games_won',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 100,
      title: 'Victor',
      currency: 50
    },
    icon: '/achievements/first_win.png',
    rarity_color: '#9CA3AF',
    isActive: true,
    isHidden: false,
    releaseDate: Timestamp.now()
  },
  
  {
    id: 'hundred_ones',
    name: 'Snake Eyes Master',
    description: 'Roll 100 ones',
    category: 'gameplay',
    type: 'counter',
    difficulty: 'rare',
    requirements: {
      metric: 'dice_ones_rolled',
      operator: 'greater_than_equal',
      value: 100
    },
    rewards: {
      points: 500,
      badge: 'snake_eyes_badge',
      cosmetics: ['dice_skin_silver']
    },
    icon: '/achievements/hundred_ones.png',
    rarity_color: '#3B82F6',
    isActive: true,
    isHidden: false,
    releaseDate: Timestamp.now()
  },
  
  {
    id: 'win_streak_10',
    name: 'Unstoppable',
    description: 'Win 10 games in a row',
    category: 'gameplay',
    type: 'streak',
    difficulty: 'epic',
    requirements: {
      metric: 'win_streak',
      operator: 'streak',
      value: 10
    },
    rewards: {
      points: 1000,
      title: 'Unstoppable',
      specialPrivileges: ['streak_badge_display']
    },
    icon: '/achievements/win_streak_10.png',
    rarity_color: '#8B5CF6',
    isActive: true,
    isHidden: false,
    releaseDate: Timestamp.now()
  },
  
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Add 10 friends',
    category: 'social',
    type: 'counter',
    difficulty: 'common',
    requirements: {
      metric: 'friends_added',
      operator: 'greater_than_equal',
      value: 10
    },
    rewards: {
      points: 300,
      currency: 100
    },
    icon: '/achievements/social_butterfly.png',
    rarity_color: '#9CA3AF',
    isActive: true,
    isHidden: false,
    releaseDate: Timestamp.now()
  },
  
  {
    id: 'perfect_combo',
    name: 'Perfect Combination',
    description: 'Roll 50 ones AND 50 sixes',
    category: 'gameplay',
    type: 'conditional',
    difficulty: 'legendary',
    requirements: {
      metric: 'custom',
      operator: 'custom',
      value: 1,
      conditions: {
        type: 'multiple_dice_milestone',
        requirements: [
          { metric: 'dice_ones_rolled', value: 50 },
          { metric: 'dice_sixes_rolled', value: 50 }
        ]
      }
    },
    rewards: {
      points: 2000,
      title: 'Dice Master',
      cosmetics: ['dice_skin_gold', 'table_theme_royal']
    },
    icon: '/achievements/perfect_combo.png',
    rarity_color: '#F59E0B',
    isActive: true,
    isHidden: true, // Secret achievement
    releaseDate: Timestamp.now()
  }
];
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. **Database Setup**
   - Create Firestore collections and security rules
   - Implement achievement definition management
   - Set up basic tracking infrastructure

2. **Achievement Tracking Service**
   - Metric tracking and storage
   - Basic achievement evaluation
   - Progress calculation

### Phase 2: Achievement Logic (Week 2)
1. **Achievement Evaluation**
   - Complex condition evaluation
   - Streak tracking
   - Custom achievement logic

2. **Notification System**
   - Real-time achievement unlocks
   - Progress notifications
   - Reward application

### Phase 3: User Interface (Week 3)
1. **Achievement Components**
   - Achievement cards and grids
   - Progress visualization
   - Category filtering

2. **Dashboard Integration**
   - Profile achievement display
   - Achievement browser
   - Search and filtering

### Phase 4: Advanced Features (Week 4)
1. **Social Features**
   - Achievement sharing
   - Friend comparisons
   - Leaderboards

2. **Rewards Integration**
   - Cosmetic unlocks
   - Title system
   - Special privileges

## Security Considerations

### Firestore Security Rules
```javascript
// Firestore security rules for achievements
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Achievement definitions - read-only for users
    match /achievementDefinitions/{achievementId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only
    }
    
    // User achievements - users can only read their own
    match /userAchievements/{userAchievementId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow write: if false; // System only
    }
    
    // Achievement progress - users can only read their own
    match /achievementProgress/{userId} {
      allow read: if request.auth != null && 
        userId == request.auth.uid;
      allow write: if false; // System only
    }
    
    // Achievement notifications - users can only access their own
    match /achievementNotifications/{notificationId} {
      allow read, update: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create, delete: if false; // System only
    }
  }
}
```

### Anti-Cheat Measures
- **Server-side validation** for all metric updates
- **Rate limiting** to prevent spam
- **Anomaly detection** for impossible progress
- **Audit logging** for achievement unlocks
- **Encrypted progress tracking** to prevent tampering

## Performance Optimization

### Caching Strategy
- **Achievement definitions cache** with periodic refresh
- **User progress memoization** for quick lookups
- **Batch updates** for multiple metrics
- **Lazy loading** for achievement details

### Database Optimization
- **Compound indexes** for efficient queries
- **Denormalized data** for faster reads
- **Background processing** for heavy calculations
- **Metric aggregation** for reduced storage

This implementation provides a comprehensive achievements system that gamifies the DashDice experience while maintaining performance and security standards.
