// Hook for integrating achievements with the game system
'use client';

import { useCallback } from 'react';
import { useAchievementTracking } from '@/context/AchievementContext';
import { MetricUpdate } from '@/types/achievements';

export const useGameAchievements = () => {
  const { recordGameEnd, recordSocialAction, recordProgressMilestone } = useAchievementTracking();

  // Record when a game ends
  const recordGameCompletion = useCallback(async (
    won: boolean,
    diceRolled: number[],
    gameData?: {
      gameMode?: string;
      roundsPlayed?: number;
      finalScore?: number;
      opponentScore?: number;
      wasPerfectGame?: boolean;
      wasComeback?: boolean;
      wasLastSecondWin?: boolean;
    }
  ) => {
    try {
      await recordGameEnd(won, diceRolled, gameData);
      
      // Record additional achievements based on game conditions
      if (gameData?.wasPerfectGame) {
        await recordProgressMilestone('perfect_games', 1);
      }
      
      if (gameData?.wasComeback) {
        await recordProgressMilestone('comeback_wins', 1);
      }
      
      if (gameData?.wasLastSecondWin) {
        await recordProgressMilestone('last_second_wins', 1);
      }
    } catch (error) {
      console.error('Error recording game achievements:', error);
    }
  }, [recordGameEnd, recordProgressMilestone]);

  // Record dice rolls during gameplay
  const recordDiceRoll = useCallback(async (diceValue: number) => {
    try {
      const updates: MetricUpdate[] = [
        { metric: 'total_dice_rolled', value: 1, operation: 'increment' },
        { metric: `dice_${numberToWord(diceValue)}s_rolled`, value: 1, operation: 'increment' }
      ];
      
      // Use the context method to update multiple metrics
      // We'll need to access this through the achievement context
    } catch (error) {
      console.error('Error recording dice roll achievement:', error);
    }
  }, []);

  // Record social interactions
  const recordFriendAdded = useCallback(async () => {
    try {
      await recordSocialAction('friends_added', 1);
    } catch (error) {
      console.error('Error recording friend added achievement:', error);
    }
  }, [recordSocialAction]);

  const recordMessageSent = useCallback(async () => {
    try {
      await recordSocialAction('messages_sent', 1);
    } catch (error) {
      console.error('Error recording message sent achievement:', error);
    }
  }, [recordSocialAction]);

  // Record progression milestones
  const recordLevelUp = useCallback(async (newLevel: number) => {
    try {
      await recordProgressMilestone('level', newLevel);
    } catch (error) {
      console.error('Error recording level up achievement:', error);
    }
  }, [recordProgressMilestone]);

  const recordCurrencyEarned = useCallback(async (amount: number) => {
    try {
      await recordProgressMilestone('currency_earned', amount);
    } catch (error) {
      console.error('Error recording currency earned achievement:', error);
    }
  }, [recordProgressMilestone]);

  // Record playtime
  const recordPlaySession = useCallback(async (minutes: number) => {
    try {
      await recordProgressMilestone('total_playtime', minutes);
    } catch (error) {
      console.error('Error recording playtime achievement:', error);
    }
  }, [recordProgressMilestone]);

  // Record daily login
  const recordDailyLogin = useCallback(async () => {
    try {
      await recordProgressMilestone('daily_logins', 1);
    } catch (error) {
      console.error('Error recording daily login achievement:', error);
    }
  }, [recordProgressMilestone]);

  return {
    recordGameCompletion,
    recordDiceRoll,
    recordFriendAdded,
    recordMessageSent,
    recordLevelUp,
    recordCurrencyEarned,
    recordPlaySession,
    recordDailyLogin
  };
};

// Helper function to convert dice numbers to words
function numberToWord(num: number): string {
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
  return words[num] || 'unknown';
}
