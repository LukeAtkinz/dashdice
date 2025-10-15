import { useCallback, useRef } from 'react';
import { MetricUpdate } from '@/types/achievements';
import AchievementTrackingService from '@/services/achievementTrackingService';
import { analyticsService } from '@/services/analyticsService';
import { useAuth } from '@/context/AuthContext';

interface BatchedMetrics {
  [key: string]: number;
}

/**
 * Performance-optimized achievement tracking for matches
 * Batches all metrics during gameplay and writes them only at match end
 */
export const useMatchAchievements = () => {
  const { user } = useAuth();
  const batchedMetrics = useRef<BatchedMetrics>({});
  const matchStartTime = useRef<number>(Date.now());

  // Convert number to word for dice metrics
  const numberToWord = (num: number): string => {
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
    return words[num] || num.toString();
  };

  // Batch a metric update without writing to database
  const batchMetric = useCallback((metric: string, value: number = 1) => {
    batchedMetrics.current[metric] = (batchedMetrics.current[metric] || 0) + value;
  }, []);

  // Record dice roll (no database write - just batch)
  const recordDiceRoll = useCallback((diceValue: number) => {
    // Just accumulate metrics locally - much faster
    batchMetric('total_dice_rolled', 1);
    batchMetric(`dice_${numberToWord(diceValue)}s_rolled`, 1);
    
    console.log(`🎲 Achievement tracking: Batched dice roll ${diceValue} (no DB write)`);
  }, [batchMetric]);

  // Record turn completion (no database write - just batch)
  const recordTurn = useCallback(() => {
    batchMetric('total_turns_taken', 1);
  }, [batchMetric]);

  // Record streak achievement (no database write - just batch)
  const recordStreak = useCallback((streakLength: number) => {
    if (streakLength >= 3) {
      batchMetric('win_streaks_achieved', 1);
    }
    if (streakLength >= 5) {
      batchMetric('long_win_streaks', 1);
    }
  }, [batchMetric]);

  // Flush all batched metrics to database (call only at match end)
  const flushBatchedMetrics = useCallback(async () => {
    const metrics = batchedMetrics.current;
    const metricKeys = Object.keys(metrics);
    
    if (metricKeys.length === 0) {
      console.log('📊 No batched metrics to flush');
      return;
    }

    try {
      console.log(`📊 Flushing ${metricKeys.length} batched metrics:`, metrics);
      
      // Convert to MetricUpdate format
      const updates: MetricUpdate[] = metricKeys.map(metric => ({
        metric,
        value: metrics[metric],
        operation: 'increment' as const
      }));

      // Single database write for all metrics
      if (user?.uid) {
        const achievementService = AchievementTrackingService.getInstance();
        await achievementService.updateMultipleMetrics(user.uid, updates);
      }
      
      console.log('✅ Successfully flushed all batched achievements');
      
      // Clear the batch
      batchedMetrics.current = {};
    } catch (error) {
      console.error('❌ Error flushing batched metrics:', error);
    }
  }, [user]);

  // Record game completion with all match-end metrics
  const recordMatchEnd = useCallback(async (won: boolean, matchData?: {
    duration?: number;
    finalScore?: number;
    opponentScore?: number;
    gameMode?: string;
    wasCloseGame?: boolean;
  }) => {
    try {
      console.log('🏁 Recording match end with comprehensive achievement tracking');
      
      // Track game end in analytics
      const gameMode = matchData?.gameMode || 'classic';
      const gameDuration = matchData?.duration || 0;
      analyticsService.trackGameEnd(gameMode, won ? 'win' : 'loss', Math.floor(gameDuration / 1000));
      
      // Core game completion metrics
      batchMetric('games_played', 1);
      batchMetric('total_games_played', 1);
      
      if (won) {
        batchMetric('games_won', 1);
        batchMetric('matches_won', 1);
        console.log('🏆 Match won - recording win metrics');
      } else {
        batchMetric('games_lost', 1);
        console.log('💔 Match lost - recording loss metrics');
      }

      // Duration-based metrics
      if (matchData?.duration) {
        const durationMinutes = Math.floor(matchData.duration / 60000);
        batchMetric('total_playtime_minutes', durationMinutes);
        batchMetric('total_match_time', matchData.duration);
        
        if (matchData.duration < 60000) { // Under 1 minute
          batchMetric('quick_wins', 1);
        }
        
        console.log(`⏱️ Match duration: ${durationMinutes} minutes`);
      }

      // Score-based achievements
      if (matchData?.finalScore && matchData?.opponentScore !== undefined) {
        const scoreDifference = matchData.finalScore - matchData.opponentScore;
        
        // Close game metrics
        if (Math.abs(scoreDifference) <= 2) {
          batchMetric('close_games_won', 1);
        }
        
        // Win by large margin
        if (won && scoreDifference >= 50) {
          batchMetric('win_by_fifty_plus', 1);
        }
        
        // Win by exactly one point
        if (won && scoreDifference === 1) {
          batchMetric('win_by_one_point', 1);
        }
        
        console.log(`📊 Score difference: ${scoreDifference}`);
      }

      // Game mode specific metrics
      if (matchData?.gameMode) {
        const gameModeKey = matchData.gameMode.toLowerCase().replace(/\s+/g, '_');
        batchMetric(`${gameModeKey}_games_played`, 1);
        if (won) {
          batchMetric(`${gameModeKey}_wins`, 1);
        }
      }

      // Consecutive games streak (always increment regardless of win/loss)
      batchMetric('consecutive_games_streak', 1);

      // Now flush everything to database in one transaction
      console.log('🚀 Flushing all batched metrics to database...');
      await flushBatchedMetrics();
      
      console.log('✅ Match end achievements recorded successfully');
      
    } catch (error) {
      console.error('❌ Error recording match end achievements:', error);
      throw error; // Re-throw to let caller handle it
    }
  }, [batchMetric, flushBatchedMetrics]);

  // Reset batch for new match
  const resetBatch = useCallback(() => {
    batchedMetrics.current = {};
    matchStartTime.current = Date.now();
    console.log('🎮 Achievement batch reset for new match');
  }, []);

  // Get current batched metrics (for debugging)
  const getBatchedMetrics = useCallback(() => {
    return { ...batchedMetrics.current };
  }, []);

  return {
    recordDiceRoll,
    recordTurn, 
    recordStreak,
    recordMatchEnd,
    resetBatch,
    flushBatchedMetrics,
    getBatchedMetrics
  };
};
