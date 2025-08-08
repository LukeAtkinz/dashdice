# Leaderboards System Implementation Guide

## Overview
This README outlines the implementation of a comprehensive leaderboards system for DashDice, featuring daily, weekly, and monthly rankings across multiple performance areas including wins, points, streaks, and achievements.

## Core Features
- **Multi-Period Rankings**: Daily, weekly, and monthly leaderboards
- **Multiple Categories**: Wins, total points, win streaks, dice perfection, achievements
- **Real-Time Updates**: Live rank changes and position tracking
- **Historical Data**: Past leaderboard periods with archives
- **Regional/Global**: Support for both global and regional rankings
- **Rewards System**: Automatic rewards for top performers
- **Performance Analytics**: Detailed statistics and trends

## Database Schema

### Firestore Collections

#### Leaderboard Entries Collection
```typescript
// src/types/index.ts
interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  category: 'wins' | 'points' | 'win_streak' | 'games_played' | 'dice_perfection' | 'achievements_earned';
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  value: number; // The score/count for this category
  rank: number; // Current rank in this category/period
  previousRank?: number; // Previous rank for trend indicators
  periodStart: Timestamp; // Start of the ranking period
  periodEnd: Timestamp; // End of the ranking period
  lastUpdated: Timestamp;
  region?: string; // For regional leaderboards
  metadata: {
    gamesPlayed: number;
    winRate: number;
    averageScore: number;
    bestGame?: {
      gameId: string;
      score: number;
      timestamp: Timestamp;
    };
  };
}
```

#### Leaderboard Periods Collection
```typescript
interface LeaderboardPeriod {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
  isArchived: boolean;
  topPerformers: {
    [category: string]: {
      userId: string;
      username: string;
      value: number;
      rank: 1 | 2 | 3;
    }[];
  };
  totalParticipants: number;
  createdAt: Timestamp;
}
```

#### User Leaderboard Stats Collection
```typescript
interface UserLeaderboardStats {
  userId: string;
  username: string;
  allTimeStats: {
    totalWins: number;
    totalPoints: number;
    totalGamesPlayed: number;
    bestWinStreak: number;
    currentWinStreak: number;
    perfectRolls: number; // Number of perfect dice combinations
    achievementsEarned: number;
    averageScore: number;
    winRate: number;
    firstPlayDate: Timestamp;
    lastPlayDate: Timestamp;
  };
  currentPeriodStats: {
    daily: CategoryStats;
    weekly: CategoryStats;
    monthly: CategoryStats;
  };
  leaderboardHistory: {
    bestRanks: {
      [category: string]: {
        rank: number;
        period: string;
        value: number;
        achievedAt: Timestamp;
      };
    };
    rewardsEarned: LeaderboardReward[];
  };
  lastUpdated: Timestamp;
}

interface CategoryStats {
  wins: number;
  points: number;
  gamesPlayed: number;
  winStreak: number;
  perfectRolls: number;
  achievementsEarned: number;
}
```

#### Leaderboard Rewards Collection
```typescript
interface LeaderboardReward {
  id: string;
  userId: string;
  leaderboardPeriodId: string;
  category: string;
  rank: number;
  rewardType: 'points' | 'background' | 'title' | 'badge' | 'premium_days';
  rewardValue: number | string;
  claimed: boolean;
  claimedAt?: Timestamp;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
}
```

#### Leaderboard Configuration Collection
```typescript
interface LeaderboardConfig {
  id: string;
  categories: {
    [key: string]: {
      name: string;
      description: string;
      icon: string;
      enabled: boolean;
      updateFrequency: 'real_time' | 'hourly' | 'daily';
      minimumGames: number; // Minimum games to appear on leaderboard
    };
  };
  periods: {
    daily: { resetTime: string; timezone: string };
    weekly: { resetDay: number; resetTime: string; timezone: string };
    monthly: { resetDay: number; resetTime: string; timezone: string };
  };
  rewards: {
    [period: string]: {
      [category: string]: {
        [rank: string]: LeaderboardReward[];
      };
    };
  };
  displaySettings: {
    entriesPerPage: number;
    showTrends: boolean;
    showRegionalRankings: boolean;
    anonymizeUsernames: boolean;
  };
}
```

## Implementation Architecture

### 1. Leaderboard Service

#### Core Leaderboard Management
```typescript
// src/services/leaderboardService.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export class LeaderboardService {
  // Update user stats after a game
  static async updateUserStats(
    userId: string,
    gameData: {
      won: boolean;
      score: number;
      perfectRolls: number;
      achievementsEarned: number;
    }
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      const userStatsRef = doc(db, 'userLeaderboardStats', userId);
      
      // Get current stats
      const currentStats = await this.getUserStats(userId);
      if (!currentStats) {
        await this.initializeUserStats(userId);
        return this.updateUserStats(userId, gameData);
      }

      const now = new Date();
      const dailyPeriod = this.getDailyPeriod(now);
      const weeklyPeriod = this.getWeeklyPeriod(now);
      const monthlyPeriod = this.getMonthlyPeriod(now);

      // Update all-time stats
      const updatedAllTimeStats = {
        ...currentStats.allTimeStats,
        totalGamesPlayed: currentStats.allTimeStats.totalGamesPlayed + 1,
        totalPoints: currentStats.allTimeStats.totalPoints + gameData.score,
        perfectRolls: currentStats.allTimeStats.perfectRolls + gameData.perfectRolls,
        achievementsEarned: currentStats.allTimeStats.achievementsEarned + gameData.achievementsEarned,
        lastPlayDate: Timestamp.fromDate(now)
      };

      if (gameData.won) {
        updatedAllTimeStats.totalWins += 1;
        updatedAllTimeStats.currentWinStreak += 1;
        updatedAllTimeStats.bestWinStreak = Math.max(
          updatedAllTimeStats.bestWinStreak,
          updatedAllTimeStats.currentWinStreak
        );
      } else {
        updatedAllTimeStats.currentWinStreak = 0;
      }

      // Calculate new averages
      updatedAllTimeStats.averageScore = 
        updatedAllTimeStats.totalPoints / updatedAllTimeStats.totalGamesPlayed;
      updatedAllTimeStats.winRate = 
        updatedAllTimeStats.totalWins / updatedAllTimeStats.totalGamesPlayed;

      // Update period stats
      const updatedCurrentPeriodStats = {
        daily: this.updatePeriodStats(currentStats.currentPeriodStats.daily, gameData),
        weekly: this.updatePeriodStats(currentStats.currentPeriodStats.weekly, gameData),
        monthly: this.updatePeriodStats(currentStats.currentPeriodStats.monthly, gameData)
      };

      // Update user stats document
      batch.update(userStatsRef, {
        allTimeStats: updatedAllTimeStats,
        currentPeriodStats: updatedCurrentPeriodStats,
        lastUpdated: serverTimestamp()
      });

      // Update leaderboard entries
      await this.updateLeaderboardEntries(userId, updatedAllTimeStats, updatedCurrentPeriodStats);

      await batch.commit();
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }

  // Get leaderboard for specific category and period
  static async getLeaderboard(
    category: string,
    period: 'daily' | 'weekly' | 'monthly' | 'all_time',
    limitCount: number = 100,
    region?: string
  ): Promise<LeaderboardEntry[]> {
    try {
      let q = query(
        collection(db, 'leaderboardEntries'),
        where('category', '==', category),
        where('period', '==', period)
      );

      if (region) {
        q = query(q, where('region', '==', region));
      }

      // Add current period filter for time-based leaderboards
      if (period !== 'all_time') {
        const currentPeriod = this.getCurrentPeriod(period);
        q = query(
          q,
          where('periodStart', '>=', currentPeriod.start),
          where('periodEnd', '<=', currentPeriod.end)
        );
      }

      q = query(q, orderBy('rank', 'asc'), limit(limitCount));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaderboardEntry[];
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  // Get user's rank in specific category and period
  static async getUserRank(
    userId: string,
    category: string,
    period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ): Promise<{ rank: number; entry: LeaderboardEntry | null }> {
    try {
      const q = query(
        collection(db, 'leaderboardEntries'),
        where('userId', '==', userId),
        where('category', '==', category),
        where('period', '==', period)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const entry = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as LeaderboardEntry;
        return { rank: entry.rank, entry };
      }

      return { rank: 0, entry: null };
    } catch (error) {
      console.error('Error getting user rank:', error);
      return { rank: 0, entry: null };
    }
  }

  // Get multiple user ranks across all categories and periods
  static async getUserAllRanks(userId: string): Promise<{
    [period: string]: {
      [category: string]: { rank: number; value: number; trend: 'up' | 'down' | 'same' | 'new' };
    };
  }> {
    try {
      const q = query(
        collection(db, 'leaderboardEntries'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const ranks: any = {};

      snapshot.docs.forEach(doc => {
        const entry = doc.data() as LeaderboardEntry;
        if (!ranks[entry.period]) {
          ranks[entry.period] = {};
        }

        const trend = this.calculateTrend(entry.rank, entry.previousRank);
        ranks[entry.period][entry.category] = {
          rank: entry.rank,
          value: entry.value,
          trend
        };
      });

      return ranks;
    } catch (error) {
      console.error('Error getting user all ranks:', error);
      return {};
    }
  }

  // Real-time leaderboard subscription
  static subscribeToLeaderboard(
    category: string,
    period: 'daily' | 'weekly' | 'monthly' | 'all_time',
    callback: (entries: LeaderboardEntry[]) => void,
    limitCount: number = 100
  ): () => void {
    let q = query(
      collection(db, 'leaderboardEntries'),
      where('category', '==', category),
      where('period', '==', period)
    );

    if (period !== 'all_time') {
      const currentPeriod = this.getCurrentPeriod(period);
      q = query(
        q,
        where('periodStart', '>=', currentPeriod.start),
        where('periodEnd', '<=', currentPeriod.end)
      );
    }

    q = query(q, orderBy('rank', 'asc'), limit(limitCount));

    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaderboardEntry[];
      
      callback(entries);
    });
  }

  // Archive completed leaderboard periods
  static async archiveCompletedPeriods(): Promise<void> {
    try {
      const now = new Date();
      const batch = writeBatch(db);

      // Find completed periods
      const periodsQuery = query(
        collection(db, 'leaderboardPeriods'),
        where('isActive', '==', true),
        where('endDate', '<', Timestamp.fromDate(now))
      );

      const periodsSnapshot = await getDocs(periodsQuery);

      for (const periodDoc of periodsSnapshot.docs) {
        const period = periodDoc.data() as LeaderboardPeriod;
        
        // Generate rewards for top performers
        await this.generatePeriodRewards(period);

        // Archive the period
        batch.update(periodDoc.ref, {
          isActive: false,
          isArchived: true
        });
      }

      await batch.commit();
      
      // Create new active periods
      await this.createNewActivePeriods();
    } catch (error) {
      console.error('Error archiving completed periods:', error);
      throw error;
    }
  }

  // Recalculate all rankings (maintenance function)
  static async recalculateRankings(
    category?: string,
    period?: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      const categories = category ? [category] : ['wins', 'points', 'win_streak', 'games_played', 'dice_perfection', 'achievements_earned'];
      const periods = period ? [period] : ['daily', 'weekly', 'monthly', 'all_time'];

      for (const cat of categories) {
        for (const per of periods) {
          // Get all entries for this category/period
          const entries = await this.getLeaderboard(cat, per, 10000);
          
          // Sort by value (descending)
          entries.sort((a, b) => b.value - a.value);
          
          // Update ranks
          entries.forEach((entry, index) => {
            const newRank = index + 1;
            if (entry.rank !== newRank) {
              const entryRef = doc(db, 'leaderboardEntries', entry.id);
              batch.update(entryRef, {
                previousRank: entry.rank,
                rank: newRank,
                lastUpdated: serverTimestamp()
              });
            }
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error recalculating rankings:', error);
      throw error;
    }
  }

  private static updatePeriodStats(currentStats: CategoryStats, gameData: any): CategoryStats {
    const updated = { ...currentStats };
    updated.gamesPlayed += 1;
    updated.points += gameData.score;
    updated.perfectRolls += gameData.perfectRolls;
    updated.achievementsEarned += gameData.achievementsEarned;

    if (gameData.won) {
      updated.wins += 1;
      updated.winStreak += 1;
    } else {
      updated.winStreak = 0;
    }

    return updated;
  }

  private static async updateLeaderboardEntries(
    userId: string,
    allTimeStats: any,
    periodStats: any
  ): Promise<void> {
    const batch = writeBatch(db);
    const now = new Date();

    // Categories to update
    const categories = [
      { key: 'wins', allTimeValue: allTimeStats.totalWins, dailyValue: periodStats.daily.wins, weeklyValue: periodStats.weekly.wins, monthlyValue: periodStats.monthly.wins },
      { key: 'points', allTimeValue: allTimeStats.totalPoints, dailyValue: periodStats.daily.points, weeklyValue: periodStats.weekly.points, monthlyValue: periodStats.monthly.points },
      { key: 'win_streak', allTimeValue: allTimeStats.bestWinStreak, dailyValue: periodStats.daily.winStreak, weeklyValue: periodStats.weekly.winStreak, monthlyValue: periodStats.monthly.winStreak },
      { key: 'games_played', allTimeValue: allTimeStats.totalGamesPlayed, dailyValue: periodStats.daily.gamesPlayed, weeklyValue: periodStats.weekly.gamesPlayed, monthlyValue: periodStats.monthly.gamesPlayed },
      { key: 'dice_perfection', allTimeValue: allTimeStats.perfectRolls, dailyValue: periodStats.daily.perfectRolls, weeklyValue: periodStats.weekly.perfectRolls, monthlyValue: periodStats.monthly.perfectRolls },
      { key: 'achievements_earned', allTimeValue: allTimeStats.achievementsEarned, dailyValue: periodStats.daily.achievementsEarned, weeklyValue: periodStats.weekly.achievementsEarned, monthlyValue: periodStats.monthly.achievementsEarned }
    ];

    const periods = [
      { key: 'all_time', ...this.getAllTimePeriod() },
      { key: 'daily', ...this.getDailyPeriod(now) },
      { key: 'weekly', ...this.getWeeklyPeriod(now) },
      { key: 'monthly', ...this.getMonthlyPeriod(now) }
    ];

    for (const category of categories) {
      for (const period of periods) {
        let value: number;
        switch (period.key) {
          case 'all_time':
            value = category.allTimeValue;
            break;
          case 'daily':
            value = category.dailyValue;
            break;
          case 'weekly':
            value = category.weeklyValue;
            break;
          case 'monthly':
            value = category.monthlyValue;
            break;
          default:
            continue;
        }

        // Find existing entry
        const existingEntryQuery = query(
          collection(db, 'leaderboardEntries'),
          where('userId', '==', userId),
          where('category', '==', category.key),
          where('period', '==', period.key)
        );

        const existingSnapshot = await getDocs(existingEntryQuery);
        
        if (!existingSnapshot.empty) {
          // Update existing entry
          const entryRef = existingSnapshot.docs[0].ref;
          batch.update(entryRef, {
            value,
            lastUpdated: serverTimestamp(),
            metadata: {
              gamesPlayed: allTimeStats.totalGamesPlayed,
              winRate: allTimeStats.winRate,
              averageScore: allTimeStats.averageScore
            }
          });
        } else {
          // Create new entry
          const newEntry: Partial<LeaderboardEntry> = {
            userId,
            username: 'Unknown User', // Would be populated from user data
            category: category.key as any,
            period: period.key as any,
            value,
            rank: 999999, // Will be recalculated
            periodStart: period.start,
            periodEnd: period.end,
            lastUpdated: serverTimestamp(),
            metadata: {
              gamesPlayed: allTimeStats.totalGamesPlayed,
              winRate: allTimeStats.winRate,
              averageScore: allTimeStats.averageScore
            }
          };

          batch.set(doc(collection(db, 'leaderboardEntries')), newEntry);
        }
      }
    }

    await batch.commit();
  }

  private static async initializeUserStats(userId: string): Promise<void> {
    const initialStats: UserLeaderboardStats = {
      userId,
      username: 'Unknown User', // Would be populated from user data
      allTimeStats: {
        totalWins: 0,
        totalPoints: 0,
        totalGamesPlayed: 0,
        bestWinStreak: 0,
        currentWinStreak: 0,
        perfectRolls: 0,
        achievementsEarned: 0,
        averageScore: 0,
        winRate: 0,
        firstPlayDate: Timestamp.now(),
        lastPlayDate: Timestamp.now()
      },
      currentPeriodStats: {
        daily: { wins: 0, points: 0, gamesPlayed: 0, winStreak: 0, perfectRolls: 0, achievementsEarned: 0 },
        weekly: { wins: 0, points: 0, gamesPlayed: 0, winStreak: 0, perfectRolls: 0, achievementsEarned: 0 },
        monthly: { wins: 0, points: 0, gamesPlayed: 0, winStreak: 0, perfectRolls: 0, achievementsEarned: 0 }
      },
      leaderboardHistory: {
        bestRanks: {},
        rewardsEarned: []
      },
      lastUpdated: Timestamp.now()
    };

    await addDoc(collection(db, 'userLeaderboardStats'), initialStats);
  }

  private static async getUserStats(userId: string): Promise<UserLeaderboardStats | null> {
    try {
      const q = query(
        collection(db, 'userLeaderboardStats'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as UserLeaderboardStats;
      }
      return null;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  private static calculateTrend(
    currentRank: number, 
    previousRank?: number
  ): 'up' | 'down' | 'same' | 'new' {
    if (!previousRank) return 'new';
    if (currentRank < previousRank) return 'up';
    if (currentRank > previousRank) return 'down';
    return 'same';
  }

  private static getCurrentPeriod(period: 'daily' | 'weekly' | 'monthly') {
    const now = new Date();
    switch (period) {
      case 'daily':
        return this.getDailyPeriod(now);
      case 'weekly':
        return this.getWeeklyPeriod(now);
      case 'monthly':
        return this.getMonthlyPeriod(now);
    }
  }

  private static getDailyPeriod(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return {
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end)
    };
  }

  private static getWeeklyPeriod(date: Date) {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // End of week (Saturday)
    end.setHours(23, 59, 59, 999);
    return {
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end)
    };
  }

  private static getMonthlyPeriod(date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end)
    };
  }

  private static getAllTimePeriod() {
    return {
      start: Timestamp.fromDate(new Date('2024-01-01')),
      end: Timestamp.fromDate(new Date('2030-12-31'))
    };
  }

  private static async generatePeriodRewards(period: LeaderboardPeriod): Promise<void> {
    // Implementation for generating rewards for top performers
    // This would create LeaderboardReward entries for top 3 in each category
  }

  private static async createNewActivePeriods(): Promise<void> {
    // Implementation for creating new active periods when old ones expire
  }
}
```

### 2. Leaderboard Rewards Service

#### Reward Management
```typescript
// src/services/leaderboardRewardsService.ts
import { collection, addDoc, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export class LeaderboardRewardsService {
  // Generate rewards for completed leaderboard period
  static async generatePeriodRewards(periodId: string): Promise<void> {
    try {
      const rewardConfig = await this.getRewardConfiguration();
      const period = await this.getLeaderboardPeriod(periodId);
      
      if (!period || !rewardConfig) return;

      const categories = ['wins', 'points', 'win_streak', 'dice_perfection', 'achievements_earned'];
      
      for (const category of categories) {
        const topPerformers = await LeaderboardService.getLeaderboard(category, period.type, 10);
        
        // Award top 3 performers
        for (let i = 0; i < Math.min(3, topPerformers.length); i++) {
          const performer = topPerformers[i];
          const rank = i + 1;
          
          const rewards = this.getRewardsForRank(rewardConfig, period.type, category, rank);
          
          for (const reward of rewards) {
            await addDoc(collection(db, 'leaderboardRewards'), {
              userId: performer.userId,
              leaderboardPeriodId: periodId,
              category,
              rank,
              rewardType: reward.type,
              rewardValue: reward.value,
              claimed: false,
              expiresAt: this.getRewardExpiration(reward.type),
              createdAt: serverTimestamp()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error generating period rewards:', error);
      throw error;
    }
  }

  // Get unclaimed rewards for user
  static async getUserUnclaimedRewards(userId: string): Promise<LeaderboardReward[]> {
    try {
      const q = query(
        collection(db, 'leaderboardRewards'),
        where('userId', '==', userId),
        where('claimed', '==', false)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaderboardReward[];
    } catch (error) {
      console.error('Error getting unclaimed rewards:', error);
      return [];
    }
  }

  // Claim reward
  static async claimReward(rewardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const rewardRef = doc(db, 'leaderboardRewards', rewardId);
      await updateDoc(rewardRef, {
        claimed: true,
        claimedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error claiming reward:', error);
      return { success: false, error: 'Failed to claim reward' };
    }
  }

  private static getRewardsForRank(
    config: any, 
    period: string, 
    category: string, 
    rank: number
  ): Array<{ type: string; value: number | string }> {
    const rewards = [];
    
    // Example reward structure
    if (rank === 1) {
      rewards.push({ type: 'points', value: 1000 });
      rewards.push({ type: 'title', value: `${category}_champion_${period}` });
      if (period === 'monthly') {
        rewards.push({ type: 'background', value: 'leaderboard_champion' });
      }
    } else if (rank === 2) {
      rewards.push({ type: 'points', value: 500 });
      rewards.push({ type: 'title', value: `${category}_runner_up_${period}` });
    } else if (rank === 3) {
      rewards.push({ type: 'points', value: 250 });
      rewards.push({ type: 'badge', value: `${category}_top3_${period}` });
    }

    return rewards;
  }

  private static getRewardExpiration(rewardType: string): Timestamp {
    const now = new Date();
    const expiration = new Date(now);
    
    switch (rewardType) {
      case 'points':
        expiration.setDate(expiration.getDate() + 30); // 30 days
        break;
      case 'title':
      case 'background':
      case 'badge':
        expiration.setFullYear(expiration.getFullYear() + 1); // 1 year
        break;
      default:
        expiration.setDate(expiration.getDate() + 7); // 7 days default
    }
    
    return Timestamp.fromDate(expiration);
  }

  private static async getRewardConfiguration(): Promise<any> {
    // Implementation to get reward configuration
    return {};
  }

  private static async getLeaderboardPeriod(periodId: string): Promise<LeaderboardPeriod | null> {
    // Implementation to get leaderboard period
    return null;
  }
}
```

## Frontend Components

### 1. Leaderboards Context

```typescript
// src/context/LeaderboardsContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LeaderboardService, LeaderboardRewardsService } from '@/services';
import { useAuth } from './AuthContext';

interface LeaderboardsContextType {
  // Current leaderboard data
  currentLeaderboard: LeaderboardEntry[];
  userRanks: { [period: string]: { [category: string]: any } };
  unclaimedRewards: LeaderboardReward[];
  
  // Current filters
  selectedCategory: string;
  selectedPeriod: 'daily' | 'weekly' | 'monthly' | 'all_time';
  
  // Loading states
  isLoading: boolean;
  isLoadingUserRanks: boolean;
  
  // Actions
  setCategory: (category: string) => void;
  setPeriod: (period: 'daily' | 'weekly' | 'monthly' | 'all_time') => void;
  refreshLeaderboard: () => Promise<void>;
  claimReward: (rewardId: string) => Promise<boolean>;
  getUserPosition: (userId: string) => number;
}

const LeaderboardsContext = createContext<LeaderboardsContextType | undefined>(undefined);

export function LeaderboardsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentLeaderboard, setCurrentLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRanks, setUserRanks] = useState<{ [period: string]: { [category: string]: any } }>({});
  const [unclaimedRewards, setUnclaimedRewards] = useState<LeaderboardReward[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('wins');
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUserRanks, setIsLoadingUserRanks] = useState(false);
  const [leaderboardListener, setLeaderboardListener] = useState<(() => void) | null>(null);

  // Load initial data
  useEffect(() => {
    refreshLeaderboard();
    if (user) {
      loadUserRanks();
      loadUnclaimedRewards();
    }
  }, [selectedCategory, selectedPeriod, user]);

  // Set up real-time leaderboard listener
  useEffect(() => {
    if (leaderboardListener) {
      leaderboardListener();
    }

    const unsubscribe = LeaderboardService.subscribeToLeaderboard(
      selectedCategory,
      selectedPeriod,
      (entries) => {
        setCurrentLeaderboard(entries);
        setIsLoading(false);
      }
    );

    setLeaderboardListener(() => unsubscribe);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedCategory, selectedPeriod]);

  const refreshLeaderboard = async () => {
    setIsLoading(true);
    try {
      const entries = await LeaderboardService.getLeaderboard(selectedCategory, selectedPeriod);
      setCurrentLeaderboard(entries);
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserRanks = async () => {
    if (!user) return;
    
    setIsLoadingUserRanks(true);
    try {
      const ranks = await LeaderboardService.getUserAllRanks(user.uid);
      setUserRanks(ranks);
    } catch (error) {
      console.error('Error loading user ranks:', error);
    } finally {
      setIsLoadingUserRanks(false);
    }
  };

  const loadUnclaimedRewards = async () => {
    if (!user) return;
    
    try {
      const rewards = await LeaderboardRewardsService.getUserUnclaimedRewards(user.uid);
      setUnclaimedRewards(rewards);
    } catch (error) {
      console.error('Error loading unclaimed rewards:', error);
    }
  };

  const setCategory = (category: string) => {
    setSelectedCategory(category);
  };

  const setPeriod = (period: 'daily' | 'weekly' | 'monthly' | 'all_time') => {
    setSelectedPeriod(period);
  };

  const claimReward = async (rewardId: string): Promise<boolean> => {
    const result = await LeaderboardRewardsService.claimReward(rewardId);
    if (result.success) {
      setUnclaimedRewards(prev => prev.filter(reward => reward.id !== rewardId));
    }
    return result.success;
  };

  const getUserPosition = (userId: string): number => {
    const entry = currentLeaderboard.find(entry => entry.userId === userId);
    return entry ? entry.rank : 0;
  };

  const value: LeaderboardsContextType = {
    currentLeaderboard,
    userRanks,
    unclaimedRewards,
    selectedCategory,
    selectedPeriod,
    isLoading,
    isLoadingUserRanks,
    setCategory,
    setPeriod,
    refreshLeaderboard,
    claimReward,
    getUserPosition
  };

  return (
    <LeaderboardsContext.Provider value={value}>
      {children}
    </LeaderboardsContext.Provider>
  );
}

export function useLeaderboards() {
  const context = useContext(LeaderboardsContext);
  if (context === undefined) {
    throw new Error('useLeaderboards must be used within a LeaderboardsProvider');
  }
  return context;
}
```

### 2. Leaderboard Display Component

```typescript
// src/components/leaderboards/LeaderboardDisplay.tsx
'use client';

import React, { useState } from 'react';
import { useLeaderboards } from '@/context/LeaderboardsContext';
import { useAuth } from '@/context/AuthContext';
import LeaderboardEntry from './LeaderboardEntry';
import LeaderboardFilters from './LeaderboardFilters';
import UserRankCard from './UserRankCard';

export default function LeaderboardDisplay() {
  const {
    currentLeaderboard,
    userRanks,
    selectedCategory,
    selectedPeriod,
    isLoading,
    getUserPosition
  } = useLeaderboards();
  
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'top' | 'around_me'>('top');

  const userPosition = user ? getUserPosition(user.uid) : 0;
  const userRank = userRanks[selectedPeriod]?.[selectedCategory];

  const getDisplayEntries = () => {
    if (viewMode === 'top') {
      return currentLeaderboard.slice(0, 100);
    } else {
      // Show entries around user's position
      if (userPosition === 0) return currentLeaderboard.slice(0, 20);
      
      const startIndex = Math.max(0, userPosition - 10);
      const endIndex = Math.min(currentLeaderboard.length, userPosition + 10);
      return currentLeaderboard.slice(startIndex, endIndex);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      wins: '🏆',
      points: '💎',
      win_streak: '🔥',
      games_played: '🎮',
      dice_perfection: '🎯',
      achievements_earned: '⭐'
    };
    return icons[category] || '📊';
  };

  const getCategoryName = (category: string) => {
    const names = {
      wins: 'Total Wins',
      points: 'Points Earned',
      win_streak: 'Win Streak',
      games_played: 'Games Played',
      dice_perfection: 'Perfect Rolls',
      achievements_earned: 'Achievements'
    };
    return names[category] || category;
  };

  const getPeriodName = (period: string) => {
    const names = {
      daily: 'Today',
      weekly: 'This Week',
      monthly: 'This Month',
      all_time: 'All Time'
    };
    return names[period] || period;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getCategoryIcon(selectedCategory)}</span>
          <div>
            <h2 className="text-xl font-bold text-white">
              {getCategoryName(selectedCategory)} Leaderboard
            </h2>
            <p className="text-gray-400">{getPeriodName(selectedPeriod)}</p>
          </div>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('top')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'top'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Top Players
          </button>
          <button
            onClick={() => setViewMode('around_me')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'around_me'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Around Me
          </button>
        </div>
      </div>

      {/* Filters */}
      <LeaderboardFilters />

      {/* User Rank Card */}
      {user && userRank && (
        <UserRankCard 
          rank={userRank.rank}
          value={userRank.value}
          trend={userRank.trend}
          category={selectedCategory}
          period={selectedPeriod}
        />
      )}

      {/* Leaderboard Entries */}
      <div className="space-y-2">
        {getDisplayEntries().map((entry, index) => (
          <LeaderboardEntry 
            key={entry.id}
            entry={entry}
            position={viewMode === 'top' ? index + 1 : entry.rank}
            isCurrentUser={user?.uid === entry.userId}
            category={selectedCategory}
          />
        ))}
      </div>

      {currentLeaderboard.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No data available for this period.</p>
          <p className="text-sm mt-2">Play some games to see rankings!</p>
        </div>
      )}
    </div>
  );
}
```

### 3. Leaderboard Entry Component

```typescript
// src/components/leaderboards/LeaderboardEntry.tsx
'use client';

import React from 'react';

interface LeaderboardEntryProps {
  entry: LeaderboardEntry;
  position: number;
  isCurrentUser: boolean;
  category: string;
}

export default function LeaderboardEntry({ 
  entry, 
  position, 
  isCurrentUser, 
  category 
}: LeaderboardEntryProps) {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: 'text-yellow-400' };
    if (rank === 2) return { emoji: '🥈', color: 'text-gray-300' };
    if (rank === 3) return { emoji: '🥉', color: 'text-yellow-600' };
    return { emoji: null, color: 'text-gray-400' };
  };

  const getTrendIcon = (rank: number, previousRank?: number) => {
    if (!previousRank) return null;
    if (rank < previousRank) return <span className="text-green-400">↗️</span>;
    if (rank > previousRank) return <span className="text-red-400">↘️</span>;
    return <span className="text-gray-400">➡️</span>;
  };

  const formatValue = (value: number, category: string) => {
    switch (category) {
      case 'points':
        return value.toLocaleString();
      case 'win_streak':
        return `${value} games`;
      case 'dice_perfection':
        return `${value} perfect`;
      default:
        return value.toString();
    }
  };

  const rankBadge = getRankBadge(entry.rank);

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
      isCurrentUser 
        ? 'bg-blue-900/50 border border-blue-500' 
        : 'bg-gray-700 hover:bg-gray-650'
    }`}>
      {/* Rank and User Info */}
      <div className="flex items-center space-x-4">
        {/* Rank */}
        <div className="flex items-center space-x-2 min-w-[60px]">
          {rankBadge.emoji ? (
            <span className="text-2xl">{rankBadge.emoji}</span>
          ) : (
            <span className={`text-lg font-bold ${rankBadge.color}`}>
              #{entry.rank}
            </span>
          )}
          {getTrendIcon(entry.rank, entry.previousRank)}
        </div>

        {/* User Avatar and Name */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
            {entry.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className={`font-medium ${isCurrentUser ? 'text-blue-300' : 'text-white'}`}>
              {entry.username}
              {isCurrentUser && <span className="text-sm text-blue-400 ml-2">(You)</span>}
            </h4>
            <p className="text-sm text-gray-400">
              {entry.metadata.gamesPlayed} games • {(entry.metadata.winRate * 100).toFixed(1)}% win rate
            </p>
          </div>
        </div>
      </div>

      {/* Value and Stats */}
      <div className="text-right">
        <div className="text-lg font-bold text-white">
          {formatValue(entry.value, category)}
        </div>
        <div className="text-sm text-gray-400">
          Avg: {entry.metadata.averageScore.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
```

### 4. Leaderboard Filters Component

```typescript
// src/components/leaderboards/LeaderboardFilters.tsx
'use client';

import React from 'react';
import { useLeaderboards } from '@/context/LeaderboardsContext';

export default function LeaderboardFilters() {
  const { 
    selectedCategory, 
    selectedPeriod, 
    setCategory, 
    setPeriod 
  } = useLeaderboards();

  const categories = [
    { id: 'wins', name: 'Wins', icon: '🏆' },
    { id: 'points', name: 'Points', icon: '💎' },
    { id: 'win_streak', name: 'Win Streak', icon: '🔥' },
    { id: 'games_played', name: 'Games', icon: '🎮' },
    { id: 'dice_perfection', name: 'Perfect Rolls', icon: '🎯' },
    { id: 'achievements_earned', name: 'Achievements', icon: '⭐' }
  ];

  const periods = [
    { id: 'daily', name: 'Daily', description: 'Today' },
    { id: 'weekly', name: 'Weekly', description: 'This Week' },
    { id: 'monthly', name: 'Monthly', description: 'This Month' },
    { id: 'all_time', name: 'All Time', description: 'Forever' }
  ];

  return (
    <div className="mb-6 space-y-4">
      {/* Category Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Category</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setCategory(category.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Period Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Time Period</h3>
        <div className="flex flex-wrap gap-2">
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => setPeriod(period.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {period.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 5. User Rank Card Component

```typescript
// src/components/leaderboards/UserRankCard.tsx
'use client';

import React from 'react';

interface UserRankCardProps {
  rank: number;
  value: number;
  trend: 'up' | 'down' | 'same' | 'new';
  category: string;
  period: string;
}

export default function UserRankCard({ 
  rank, 
  value, 
  trend, 
  category, 
  period 
}: UserRankCardProps) {
  const getTrendDisplay = (trend: string) => {
    switch (trend) {
      case 'up':
        return { icon: '↗️', text: 'Rising', color: 'text-green-400' };
      case 'down':
        return { icon: '↘️', text: 'Falling', color: 'text-red-400' };
      case 'same':
        return { icon: '➡️', text: 'Steady', color: 'text-gray-400' };
      case 'new':
        return { icon: '✨', text: 'New', color: 'text-blue-400' };
      default:
        return { icon: '', text: '', color: 'text-gray-400' };
    }
  };

  const formatValue = (value: number, category: string) => {
    switch (category) {
      case 'points':
        return value.toLocaleString();
      case 'win_streak':
        return `${value} games`;
      case 'dice_perfection':
        return `${value} perfect`;
      default:
        return value.toString();
    }
  };

  const trendDisplay = getTrendDisplay(trend);

  return (
    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium mb-1">Your Current Rank</h3>
          <div className="flex items-center space-x-3">
            <span className="text-2xl font-bold text-blue-300">#{rank}</span>
            <div className={`flex items-center space-x-1 ${trendDisplay.color}`}>
              <span>{trendDisplay.icon}</span>
              <span className="text-sm">{trendDisplay.text}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold text-white">
            {formatValue(value, category)}
          </div>
          <div className="text-sm text-gray-400 capitalize">
            {period.replace('_', ' ')}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 6. Leaderboard Rewards Component

```typescript
// src/components/leaderboards/LeaderboardRewards.tsx
'use client';

import React from 'react';
import { useLeaderboards } from '@/context/LeaderboardsContext';

export default function LeaderboardRewards() {
  const { unclaimedRewards, claimReward } = useLeaderboards();

  const getRewardIcon = (rewardType: string) => {
    const icons = {
      points: '💎',
      background: '🖼️',
      title: '👑',
      badge: '🏅',
      premium_days: '⭐'
    };
    return icons[rewardType] || '🎁';
  };

  const getRewardDescription = (reward: LeaderboardReward) => {
    switch (reward.rewardType) {
      case 'points':
        return `${reward.rewardValue} points`;
      case 'background':
        return `"${reward.rewardValue}" background`;
      case 'title':
        return `"${reward.rewardValue}" title`;
      case 'badge':
        return `"${reward.rewardValue}" badge`;
      case 'premium_days':
        return `${reward.rewardValue} days premium`;
      default:
        return reward.rewardValue.toString();
    }
  };

  const handleClaimReward = async (rewardId: string) => {
    const success = await claimReward(rewardId);
    if (success) {
      // Show success notification
    }
  };

  if (unclaimedRewards.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {unclaimedRewards.map((reward) => (
        <div key={reward.id} className="bg-gradient-to-r from-yellow-900/90 to-orange-900/90 border border-yellow-500 rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">{getRewardIcon(reward.rewardType)}</span>
            <div>
              <h4 className="text-white font-medium">Leaderboard Reward!</h4>
              <p className="text-yellow-300 text-sm">
                Rank #{reward.rank} in {reward.category}
              </p>
            </div>
          </div>

          <p className="text-gray-200 text-sm mb-4">
            You earned: {getRewardDescription(reward)}
          </p>

          <button
            onClick={() => handleClaimReward(reward.id)}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            Claim Reward
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. **Database Setup**
   - Create Firestore collections and security rules
   - Implement basic leaderboard service
   - Set up user stats tracking

2. **Basic Rankings**
   - Implement wins and points leaderboards
   - Daily and weekly period support
   - Basic ranking calculations

### Phase 2: Enhanced Features (Week 2)
1. **Multiple Categories**
   - Add all leaderboard categories
   - Implement monthly and all-time periods
   - Add trend tracking and rank history

2. **Real-time Updates**
   - Live leaderboard updates
   - Real-time rank changes
   - Performance optimization

### Phase 3: Rewards System (Week 3)
1. **Reward Generation**
   - Automatic reward creation for top performers
   - Configurable reward structures
   - Reward claiming system

2. **Advanced Analytics**
   - Historical leaderboard data
   - Performance trends
   - Statistical insights

### Phase 4: Polish & Integration (Week 4)
1. **UI/UX Enhancement**
   - Beautiful leaderboard displays
   - Smooth animations and transitions
   - Mobile responsiveness

2. **Game Integration**
   - Automatic stats updates after games
   - Achievement integration
   - Social features integration

## Security Considerations

### Firestore Security Rules
```javascript
// Firestore security rules for leaderboards
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leaderboard entries - read only for users
    match /leaderboardEntries/{entryId} {
      allow read: if request.auth != null;
      allow write: if false; // Only server-side updates
    }
    
    // User leaderboard stats - users can read their own
    match /userLeaderboardStats/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only server-side updates
    }
    
    // Leaderboard rewards - users can read their own
    match /leaderboardRewards/{rewardId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.userId &&
        request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['claimed', 'claimedAt']);
    }
    
    // Leaderboard periods - read only
    match /leaderboardPeriods/{periodId} {
      allow read: if request.auth != null;
      allow write: if false; // Only server-side updates
    }
  }
}
```

### Data Integrity
- **Server-side stat updates** to prevent cheating
- **Automated rank recalculation** to ensure accuracy
- **Historical data validation** for consistency
- **Rate limiting** on leaderboard queries

## Performance Optimization

### Caching Strategy
```typescript
// Implement efficient leaderboard caching
const getCachedLeaderboard = async (category: string, period: string) => {
  const cacheKey = `leaderboard_${category}_${period}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const leaderboard = await LeaderboardService.getLeaderboard(category, period);
  await redis.setex(cacheKey, 300, JSON.stringify(leaderboard)); // 5 min cache
  
  return leaderboard;
};
```

### Database Optimization
- **Composite indexes** for efficient queries
- **Pagination** for large leaderboards
- **Batch operations** for rank updates
- **Background processing** for heavy calculations

## Testing Strategy

### Unit Tests
- Rank calculation accuracy
- Stat update logic
- Reward generation
- Trend calculation

### Integration Tests
- Real-time leaderboard updates
- Cross-period consistency
- Reward claiming workflow

### Performance Tests
- Large dataset handling
- Concurrent user load
- Real-time update latency

This comprehensive leaderboards system provides engaging competition mechanics that encourage regular play while maintaining fair and accurate rankings across multiple time periods and performance areas.
