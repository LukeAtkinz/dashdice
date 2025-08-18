// Achievement type definitions based on the documentation
import { Timestamp } from 'firebase/firestore';

// Achievement difficulty levels
export type AchievementDifficulty = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

// Achievement categories
export type AchievementCategory = 'gameplay' | 'social' | 'progression' | 'special' | 'seasonal';

// Achievement types
export type AchievementType = 'milestone' | 'counter' | 'streak' | 'conditional' | 'time_based';

// Operators for achievement requirements
export type AchievementOperator = 'greater_than' | 'greater_than_equal' | 'equal' | 'less_than' | 'less_than_equal' | 'streak' | 'custom';

// Achievement requirements interface
export interface AchievementRequirements {
  metric: string;
  operator: AchievementOperator;
  value: number;
  timeframe?: number; // in days, for time-based achievements
  conditions?: {
    type: string;
    requirements: Array<{
      metric: string;
      value: number;
    }>;
  };
}

// Achievement rewards interface
export interface AchievementRewards {
  points?: number;
  currency?: number;
  title?: string;
  badge?: string;
  cosmetics?: string[];
  specialPrivileges?: string[];
  nextLevelUnlock?: string;
}

// Main achievement definition interface
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  type: AchievementType;
  difficulty: AchievementDifficulty;
  requirements: AchievementRequirements;
  rewards: AchievementRewards;
  icon: string;
  rarity_color: string;
  isActive: boolean;
  isHidden: boolean; // Secret achievements
  releaseDate: Timestamp;
  prerequisites?: string[]; // Other achievement IDs required
  series?: string; // For grouped achievements
  order?: number; // Order within series
}

// User achievement progress interface
export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  isCompleted: boolean;
  completedAt?: Timestamp;
  progress: number;
  lastUpdated: Timestamp;
  metadata?: Record<string, any>; // For storing additional data
}

// Achievement progress tracking interface
export interface AchievementProgress {
  userId: string;
  metrics: Record<string, number>; // metric name -> current value
  streaks: Record<string, {
    current: number;
    best: number;
    lastUpdate: Timestamp;
  }>;
  lastUpdated: Timestamp;
}

// Achievement notification interface
export interface AchievementNotification {
  id: string;
  userId: string;
  achievementId: string;
  type: 'unlock' | 'progress' | 'milestone';
  message: string;
  createdAt: Timestamp;
  isRead: boolean;
  metadata?: {
    progress?: number;
    maxProgress?: number;
    rewardsEarned?: AchievementRewards;
  };
}

// Metric update interface for tracking
export interface MetricUpdate {
  metric: string;
  value: number;
  operation: 'increment' | 'set' | 'max';
  timestamp?: Timestamp;
  context?: Record<string, any>; // Additional context for the update
}

// Achievement context interface
export interface AchievementContextValue {
  // Achievement definitions
  allAchievements: AchievementDefinition[];
  
  // User progress
  userAchievements: UserAchievement[];
  userProgress: AchievementProgress | null;
  notifications: AchievementNotification[];
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  
  // Methods
  getAchievementProgress: (achievementId: string) => UserAchievement | undefined;
  getAchievementsByCategory: (category: AchievementCategory) => AchievementDefinition[];
  getCompletionPercentage: () => number;
  markNotificationRead: (notificationId: string) => Promise<void>;
  
  // Tracking methods
  updateMetric: (metric: string, value: number, operation?: 'increment' | 'set' | 'max') => Promise<void>;
  updateMultipleMetrics: (updates: MetricUpdate[]) => Promise<void>;
  
  // Refresh methods
  refreshAchievements: () => Promise<void>;
  refreshUserProgress: () => Promise<void>;
}

// Common game metrics that can trigger achievements
export interface GameMetrics {
  // Game statistics
  games_played: number;
  games_won: number;
  games_lost: number;
  win_streak: number;
  best_win_streak: number;
  
  // Dice statistics
  dice_ones_rolled: number;
  dice_twos_rolled: number;
  dice_threes_rolled: number;
  dice_fours_rolled: number;
  dice_fives_rolled: number;
  dice_sixes_rolled: number;
  total_dice_rolled: number;
  
  // Social metrics
  friends_added: number;
  messages_sent: number;
  games_with_friends: number;
  friend_wins: number;
  max_wins_against_single_friend: number;
  max_losses_to_single_friend_streak: number;
  
  // Progression metrics
  level: number;
  total_xp: number;
  currency_earned: number;
  items_purchased: number;
  
  // Time-based metrics
  total_playtime: number; // in minutes
  daily_logins: number;
  consecutive_days_played: number;
  daily_games_played: number;
  hourly_game_streak: number;
  
  // Special game events
  perfect_games: number; // Games won without losing a round
  comeback_wins: number; // Games won after being behind
  last_second_wins: number; // Games won in final turn
  
  // Streak metrics
  same_number_streak: number; // For Rollception achievement
  consecutive_games_streak: number; // For Iron Will achievement
  
  // Pattern-based metrics for eclipse achievements
  game_only_even_rolls: number;
  game_only_odd_rolls: number;
  game_equal_odd_even: number;
  sequential_1_to_6: number;
  
  // Victory condition metrics
  exact_winning_roll: number;
  exact_losing_roll: number;
  game_all_high_rolls: number;
  win_by_one_point: number;
  win_by_fifty_plus: number;
  win_without_sixes: number;
  
  // Special pattern metrics
  triple_snake_eyes_game: number;
  five_double_sixes_game: number;
  one_six_consecutive: number;
  ten_sixes_in_match: number;
  ten_ones_in_match: number;
  three_sixes_streak: number;
  three_ones_streak: number;
  five_doubles_in_game: number;
  same_number_three_streak: number;
}

// Achievement evaluation result
export interface AchievementEvaluationResult {
  achievementId: string;
  wasUnlocked: boolean;
  progressChanged: boolean;
  newProgress: number;
  notification?: AchievementNotification;
}

// Batch evaluation result
export interface BatchEvaluationResult {
  results: AchievementEvaluationResult[];
  newNotifications: AchievementNotification[];
  updatedAchievements: UserAchievement[];
}
