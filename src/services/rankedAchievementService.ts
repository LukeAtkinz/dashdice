import { collection, doc, getDocs, query, where, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { RankedStats } from '../types/ranked';

export interface RankedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  category: 'progression' | 'streak' | 'seasonal' | 'competitive' | 'special';
  requirements: {
    type: 'level' | 'wins' | 'winRate' | 'streak' | 'rank' | 'games' | 'seasons';
    value: number;
    operator: 'gte' | 'eq' | 'lte';
  };
  reward?: {
    gold?: number;
    title?: string;
    badge?: string;
  };
  hidden?: boolean; // Achievement is hidden until unlocked
  seasonal?: boolean; // Achievement resets each season
}

export const RANKED_ACHIEVEMENTS: RankedAchievement[] = [
  // Progression Achievements
  {
    id: 'first_ranked_win',
    name: 'First Victory',
    description: 'Win your first ranked match',
    icon: '🏆',
    tier: 'bronze',
    category: 'progression',
    requirements: { type: 'wins', value: 1, operator: 'gte' },
    reward: { gold: 50, title: 'Ranked Rookie' }
  },
  {
    id: 'bronze_tier',
    name: 'Bronze Warrior',
    description: 'Reach Bronze tier (Level 3)',
    icon: '🥉',
    tier: 'bronze',
    category: 'progression',
    requirements: { type: 'level', value: 3, operator: 'gte' },
    reward: { gold: 100, badge: 'bronze_warrior' }
  },
  {
    id: 'gold_tier',
    name: 'Golden Champion',
    description: 'Reach Gold tier (Level 5)',
    icon: '🥇',
    tier: 'gold',
    category: 'progression',
    requirements: { type: 'level', value: 5, operator: 'gte' },
    reward: { gold: 250, title: 'Golden Champion' }
  },
  {
    id: 'sapphire_tier',
    name: 'Sapphire Elite',
    description: 'Reach Sapphire tier (Level 7)',
    icon: '💎',
    tier: 'platinum',
    category: 'progression',
    requirements: { type: 'level', value: 7, operator: 'gte' },
    reward: { gold: 500, title: 'Sapphire Elite' }
  },
  {
    id: 'amethyst_tier',
    name: 'Amethyst Master',
    description: 'Reach Amethyst tier (Level 9)',
    icon: '🔮',
    tier: 'platinum',
    category: 'progression',
    requirements: { type: 'level', value: 9, operator: 'gte' },
    reward: { gold: 750, title: 'Amethyst Master' }
  },
  {
    id: 'diamond_tier',
    name: 'Diamond Legend',
    description: 'Reach the highest Diamond tier (Level 10)',
    icon: '💠',
    tier: 'diamond',
    category: 'progression',
    requirements: { type: 'level', value: 10, operator: 'gte' },
    reward: { gold: 1000, title: 'Diamond Legend', badge: 'diamond_legend' }
  },

  // Win Streak Achievements
  {
    id: 'win_streak_3',
    name: 'Hat Trick',
    description: 'Win 3 ranked matches in a row',
    icon: '🔥',
    tier: 'bronze',
    category: 'streak',
    requirements: { type: 'streak', value: 3, operator: 'gte' },
    reward: { gold: 75 }
  },
  {
    id: 'win_streak_5',
    name: 'Unstoppable',
    description: 'Win 5 ranked matches in a row',
    icon: '⚡',
    tier: 'silver',
    category: 'streak',
    requirements: { type: 'streak', value: 5, operator: 'gte' },
    reward: { gold: 150, title: 'Unstoppable' }
  },
  {
    id: 'win_streak_10',
    name: 'Legendary Streak',
    description: 'Win 10 ranked matches in a row',
    icon: '👑',
    tier: 'gold',
    category: 'streak',
    requirements: { type: 'streak', value: 10, operator: 'gte' },
    reward: { gold: 500, title: 'Streak Legend', badge: 'legendary_streak' }
  },
  {
    id: 'win_streak_15',
    name: 'Impossible',
    description: 'Win 15 ranked matches in a row',
    icon: '🌟',
    tier: 'diamond',
    category: 'streak',
    requirements: { type: 'streak', value: 15, operator: 'gte' },
    reward: { gold: 1000, title: 'The Impossible', badge: 'impossible' },
    hidden: true
  },

  // Competitive Achievements
  {
    id: 'top_100',
    name: 'Elite Hundred',
    description: 'Reach top 100 in the leaderboard',
    icon: '📊',
    tier: 'silver',
    category: 'competitive',
    requirements: { type: 'rank', value: 100, operator: 'lte' },
    reward: { gold: 200, title: 'Elite Player' }
  },
  {
    id: 'top_50',
    name: 'Top Tier',
    description: 'Reach top 50 in the leaderboard',
    icon: '🎯',
    tier: 'gold',
    category: 'competitive',
    requirements: { type: 'rank', value: 50, operator: 'lte' },
    reward: { gold: 400, title: 'Top Tier' }
  },
  {
    id: 'top_10',
    name: 'Elite Ten',
    description: 'Reach top 10 in the leaderboard',
    icon: '🏅',
    tier: 'platinum',
    category: 'competitive',
    requirements: { type: 'rank', value: 10, operator: 'lte' },
    reward: { gold: 750, title: 'Elite Ten', badge: 'top_10' }
  },
  {
    id: 'top_3',
    name: 'Podium Finish',
    description: 'Reach top 3 in the leaderboard',
    icon: '🥇',
    tier: 'platinum',
    category: 'competitive',
    requirements: { type: 'rank', value: 3, operator: 'lte' },
    reward: { gold: 1000, title: 'Podium Finisher', badge: 'podium' }
  },
  {
    id: 'rank_1',
    name: 'Champion',
    description: 'Reach #1 in the leaderboard',
    icon: '👑',
    tier: 'diamond',
    category: 'competitive',
    requirements: { type: 'rank', value: 1, operator: 'eq' },
    reward: { gold: 2000, title: 'Ranked Champion', badge: 'champion' }
  },

  // Win Rate Achievements
  {
    id: 'high_win_rate_70',
    name: 'Consistent Winner',
    description: 'Maintain 70% win rate over 20+ games',
    icon: '📈',
    tier: 'silver',
    category: 'competitive',
    requirements: { type: 'winRate', value: 70, operator: 'gte' },
    reward: { gold: 300, title: 'Consistent Winner' }
  },
  {
    id: 'high_win_rate_80',
    name: 'Dominant Force',
    description: 'Maintain 80% win rate over 30+ games',
    icon: '⚔️',
    tier: 'gold',
    category: 'competitive',
    requirements: { type: 'winRate', value: 80, operator: 'gte' },
    reward: { gold: 600, title: 'Dominant Force', badge: 'dominant' }
  },

  // Seasonal Achievements
  {
    id: 'season_veteran',
    name: 'Season Veteran',
    description: 'Complete 5 Dash seasons',
    icon: '🗓️',
    tier: 'silver',
    category: 'seasonal',
    requirements: { type: 'seasons', value: 5, operator: 'gte' },
    reward: { gold: 250, title: 'Season Veteran' }
  },
  {
    id: 'season_master',
    name: 'Dash Master',
    description: 'Complete 10 Dash seasons',
    icon: '⏰',
    tier: 'gold',
    category: 'seasonal',
    requirements: { type: 'seasons', value: 10, operator: 'gte' },
    reward: { gold: 500, title: 'Dash Master', badge: 'dash_master' }
  },

  // Volume Achievements
  {
    id: 'games_50',
    name: 'Dedicated Player',
    description: 'Play 50 ranked matches',
    icon: '🎮',
    tier: 'bronze',
    category: 'progression',
    requirements: { type: 'games', value: 50, operator: 'gte' },
    reward: { gold: 200 }
  },
  {
    id: 'games_100',
    name: 'Ranked Enthusiast',
    description: 'Play 100 ranked matches',
    icon: '🎯',
    tier: 'silver',
    category: 'progression',
    requirements: { type: 'games', value: 100, operator: 'gte' },
    reward: { gold: 400, title: 'Ranked Enthusiast' }
  },
  {
    id: 'games_500',
    name: 'Ranked Addict',
    description: 'Play 500 ranked matches',
    icon: '🏆',
    tier: 'gold',
    category: 'progression',
    requirements: { type: 'games', value: 500, operator: 'gte' },
    reward: { gold: 1000, title: 'Ranked Addict', badge: 'addict' }
  },

  // Special Hidden Achievements
  {
    id: 'perfect_season',
    name: 'Perfect Season',
    description: 'Complete a season without losing a single match',
    icon: '✨',
    tier: 'diamond',
    category: 'special',
    requirements: { type: 'winRate', value: 100, operator: 'eq' },
    reward: { gold: 2500, title: 'Perfect Player', badge: 'perfect' },
    hidden: true,
    seasonal: true
  },
  {
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Win 10 matches after being at Level 1',
    icon: '🔄',
    tier: 'platinum',
    category: 'special',
    requirements: { type: 'wins', value: 10, operator: 'gte' },
    reward: { gold: 750, title: 'Comeback King' },
    hidden: true
  }
];

export class RankedAchievementService {
  private static instance: RankedAchievementService;

  public static getInstance(): RankedAchievementService {
    if (!RankedAchievementService.instance) {
      RankedAchievementService.instance = new RankedAchievementService();
    }
    return RankedAchievementService.instance;
  }

  /**
   * Check and award achievements for a user based on their ranked stats
   */
  async checkAndAwardAchievements(userId: string, rankedStats: RankedStats, currentRank?: number): Promise<RankedAchievement[]> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return [];

      const userData = userDoc.data();
      const unlockedAchievements = userData.rankedAchievements || [];
      
      const newAchievements: RankedAchievement[] = [];

      for (const achievement of RANKED_ACHIEVEMENTS) {
        // Skip if already unlocked
        if (unlockedAchievements.includes(achievement.id)) continue;

        // Check if requirements are met
        if (this.checkRequirements(achievement, rankedStats, currentRank)) {
          newAchievements.push(achievement);
          
          // Award the achievement
          await this.awardAchievement(userId, achievement);
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Check if achievement requirements are met
   */
  private checkRequirements(achievement: RankedAchievement, rankedStats: RankedStats, currentRank?: number): boolean {
    const { type, value, operator } = achievement.requirements;
    let actualValue: number;

    switch (type) {
      case 'level':
        actualValue = rankedStats.currentSeason.level;
        break;
      case 'wins':
        actualValue = rankedStats.currentSeason.totalWins;
        break;
      case 'winRate':
        actualValue = rankedStats.currentSeason.gamesPlayed > 0 
          ? (rankedStats.currentSeason.totalWins / rankedStats.currentSeason.gamesPlayed) * 100 
          : 0;
        // Special handling for win rate achievements - require minimum games
        if (type === 'winRate' && rankedStats.currentSeason.gamesPlayed < 20) return false;
        break;
      case 'streak':
        actualValue = rankedStats.currentSeason.winStreak;
        break;
      case 'rank':
        if (!currentRank) return false;
        actualValue = currentRank;
        break;
      case 'games':
        actualValue = rankedStats.currentSeason.gamesPlayed;
        break;
      case 'seasons':
        actualValue = rankedStats.allTime.totalDashes;
        break;
      default:
        return false;
    }

    switch (operator) {
      case 'gte':
        return actualValue >= value;
      case 'eq':
        return actualValue === value;
      case 'lte':
        return actualValue <= value;
      default:
        return false;
    }
  }

  /**
   * Award achievement to user
   */
  private async awardAchievement(userId: string, achievement: RankedAchievement): Promise<void> {
    try {
      const updateData: any = {
        rankedAchievements: arrayUnion(achievement.id)
      };

      // Add gold reward if applicable
      if (achievement.reward?.gold) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          updateData.gold = (userData.gold || 0) + achievement.reward.gold;
        }
      }

      await updateDoc(doc(db, 'users', userId), updateData);

      console.log(`✅ Awarded achievement "${achievement.name}" to user ${userId}`);
    } catch (error) {
      console.error('Error awarding achievement:', error);
    }
  }

  /**
   * Get user's unlocked achievements
   */
  async getUserAchievements(userId: string): Promise<RankedAchievement[]> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return [];

      const userData = userDoc.data();
      const unlockedIds = userData.rankedAchievements || [];
      
      return RANKED_ACHIEVEMENTS.filter(achievement => 
        unlockedIds.includes(achievement.id)
      );
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  /**
   * Get achievement progress for user
   */
  async getAchievementProgress(userId: string, rankedStats: RankedStats, currentRank?: number): Promise<Array<{
    achievement: RankedAchievement;
    progress: number;
    unlocked: boolean;
  }>> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const unlockedIds = userData.rankedAchievements || [];

      return RANKED_ACHIEVEMENTS
        .filter(achievement => !achievement.hidden || unlockedIds.includes(achievement.id))
        .map(achievement => {
          const unlocked = unlockedIds.includes(achievement.id);
          let progress = 0;

          if (!unlocked) {
            const { type, value } = achievement.requirements;
            let actualValue: number;

            switch (type) {
              case 'level':
                actualValue = rankedStats.currentSeason.level;
                break;
              case 'wins':
                actualValue = rankedStats.currentSeason.totalWins;
                break;
              case 'winRate':
                actualValue = rankedStats.currentSeason.gamesPlayed > 0 
                  ? (rankedStats.currentSeason.totalWins / rankedStats.currentSeason.gamesPlayed) * 100 
                  : 0;
                break;
              case 'streak':
                actualValue = rankedStats.currentSeason.winStreak;
                break;
              case 'rank':
                actualValue = currentRank || 999;
                break;
              case 'games':
                actualValue = rankedStats.currentSeason.gamesPlayed;
                break;
              case 'seasons':
                actualValue = rankedStats.allTime.totalDashes;
                break;
              default:
                actualValue = 0;
            }

            progress = Math.min(100, (actualValue / value) * 100);
          } else {
            progress = 100;
          }

          return {
            achievement,
            progress,
            unlocked
          };
        });
    } catch (error) {
      console.error('Error getting achievement progress:', error);
      return [];
    }
  }
}

// Export singleton instance
export const rankedAchievementService = RankedAchievementService.getInstance();
