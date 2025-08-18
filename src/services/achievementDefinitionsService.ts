// Achievement Definitions Service
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { AchievementDefinition, AchievementCategory } from '@/types/achievements';

class AchievementDefinitionsService {
  private static instance: AchievementDefinitionsService;
  private cache: Map<string, AchievementDefinition> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private listeners: Set<Unsubscribe> = new Set();

  // Default achievements fallback
  private getDefaultAchievements(): AchievementDefinition[] {
    return [
      {
        id: 'first_roll',
        name: 'First Roll',
        description: 'Roll your first dice',
        category: 'gameplay',
        type: 'milestone',
        difficulty: 'common',
        requirements: {
          metric: 'games_played',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 5
        },
        icon: '🎲',
        rarity_color: '#6b7280',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 1
      },
      {
        id: 'rolling_strong',
        name: 'Rolling Strong',
        description: 'Win 10 matches',
        category: 'progression',
        type: 'counter',
        difficulty: 'common',
        requirements: {
          metric: 'match_wins',
          operator: 'greater_than_equal',
          value: 10
        },
        rewards: {
          points: 25
        },
        icon: '🏆',
        rarity_color: '#6b7280',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 2
      },
      {
        id: 'dice_master',
        name: 'Dice Master',
        description: 'Roll a 6 three times in a row',
        category: 'special',
        type: 'streak',
        difficulty: 'rare',
        requirements: {
          metric: 'dice_roll_streak',
          operator: 'streak',
          value: 3,
          conditions: {
            type: 'specific_roll',
            requirements: [{ metric: 'dice_value', value: 6 }]
          }
        },
        rewards: {
          points: 50
        },
        icon: '🎯',
        rarity_color: '#3b82f6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 3
      },
      {
        id: 'champion',
        name: 'Champion',
        description: 'Win 50 matches',
        category: 'progression',
        type: 'counter',
        difficulty: 'legendary',
        requirements: {
          metric: 'match_wins',
          operator: 'greater_than_equal',
          value: 50
        },
        rewards: {
          points: 100,
          title: 'Champion'
        },
        icon: '👑',
        rarity_color: '#f59e0b',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 4
      },
      // Dice Rolling Achievements
      {
        id: 'dice_gremlin',
        name: 'Dice Gremlin',
        description: 'Roll the dice 1,000 times total',
        category: 'progression',
        type: 'counter',
        difficulty: 'common',
        requirements: {
          metric: 'total_dice_rolled',
          operator: 'greater_than_equal',
          value: 1000
        },
        rewards: {
          points: 30,
          badge: 'Gremlin'
        },
        icon: '🎲',
        rarity_color: '#6b7280',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 5
      },
      {
        id: 'dice_dragon',
        name: 'Dice Dragon',
        description: 'Roll the dice 10,000 times total',
        category: 'progression',
        type: 'counter',
        difficulty: 'epic',
        requirements: {
          metric: 'total_dice_rolled',
          operator: 'greater_than_equal',
          value: 10000
        },
        rewards: {
          points: 100,
          badge: 'Dragon',
          title: 'Dragon'
        },
        icon: '🐉',
        rarity_color: '#8b5cf6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        prerequisites: ['dice_gremlin'],
        order: 6
      },
      {
        id: 'dice_god',
        name: 'Dice God',
        description: 'Roll the dice 100,000 times total',
        category: 'progression',
        type: 'counter',
        difficulty: 'mythic',
        requirements: {
          metric: 'total_dice_rolled',
          operator: 'greater_than_equal',
          value: 100000
        },
        rewards: {
          points: 500,
          badge: 'Deity',
          title: 'Dice God',
          specialPrivileges: ['golden_dice', 'god_mode_cosmetics']
        },
        icon: '⚡',
        rarity_color: '#dc2626',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        prerequisites: ['dice_dragon'],
        order: 7
      },
      // Special Dice Pattern Achievements
      {
        id: 'rollception',
        name: 'Rollception',
        description: 'Roll the same number 3 times in a row',
        category: 'special',
        type: 'streak',
        difficulty: 'rare',
        requirements: {
          metric: 'same_number_streak',
          operator: 'streak',
          value: 3,
          conditions: {
            type: 'consecutive_same_roll',
            requirements: [{ metric: 'consecutive_count', value: 3 }]
          }
        },
        rewards: {
          points: 50,
          badge: 'Triple Roll'
        },
        icon: '🔄',
        rarity_color: '#3b82f6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 8
      },
      // Time-Based Achievements
      {
        id: 'the_clockbreaker',
        name: 'The Clockbreaker',
        description: 'Play at least one game every hour for 24 hours',
        category: 'special',
        type: 'time_based',
        difficulty: 'legendary',
        requirements: {
          metric: 'hourly_game_streak',
          operator: 'greater_than_equal',
          value: 24,
          timeframe: 1, // within 1 day
          conditions: {
            type: 'hourly_consistency',
            requirements: [{ metric: 'games_per_hour', value: 1 }]
          }
        },
        rewards: {
          points: 200,
          badge: 'Clockbreaker',
          title: 'The Clockbreaker',
          specialPrivileges: ['time_master']
        },
        icon: '⏰',
        rarity_color: '#f59e0b',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 9
      },
      {
        id: 'iron_will',
        name: 'Iron Will',
        description: 'Play 10 games in a row without logging off',
        category: 'progression',
        type: 'streak',
        difficulty: 'rare',
        requirements: {
          metric: 'consecutive_games_streak',
          operator: 'streak',
          value: 10
        },
        rewards: {
          points: 75,
          badge: 'Iron Will'
        },
        icon: '🛡️',
        rarity_color: '#3b82f6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 10
      },
      {
        id: 'marathoner',
        name: 'Marathoner',
        description: 'Play 25 games in a single day',
        category: 'progression',
        type: 'time_based',
        difficulty: 'epic',
        requirements: {
          metric: 'daily_games_played',
          operator: 'greater_than_equal',
          value: 25,
          timeframe: 1 // within 1 day
        },
        rewards: {
          points: 100,
          badge: 'Marathoner',
          title: 'Marathoner'
        },
        icon: '🏃',
        rarity_color: '#8b5cf6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 11
      },
      // Social Achievements
      {
        id: 'the_challenger',
        name: 'The Challenger',
        description: 'Invite your first friend',
        category: 'social',
        type: 'milestone',
        difficulty: 'common',
        requirements: {
          metric: 'friends_added',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 25,
          badge: 'Challenger'
        },
        icon: '🤝',
        rarity_color: '#6b7280',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 12
      },
      {
        id: 'circle_of_fate',
        name: 'Circle of Fate',
        description: 'Play 10 games with friends',
        category: 'social',
        type: 'counter',
        difficulty: 'common',
        requirements: {
          metric: 'games_with_friends',
          operator: 'greater_than_equal',
          value: 10
        },
        rewards: {
          points: 50,
          badge: 'Circle Member'
        },
        icon: '⭕',
        rarity_color: '#6b7280',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        prerequisites: ['the_challenger'],
        order: 13
      },
      {
        id: 'guildmaster',
        name: 'Guildmaster',
        description: 'Play 100 games with friends',
        category: 'social',
        type: 'counter',
        difficulty: 'epic',
        requirements: {
          metric: 'games_with_friends',
          operator: 'greater_than_equal',
          value: 100
        },
        rewards: {
          points: 150,
          badge: 'Guildmaster',
          title: 'Guildmaster',
          specialPrivileges: ['guild_leader']
        },
        icon: '🏛️',
        rarity_color: '#8b5cf6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        prerequisites: ['circle_of_fate'],
        order: 14
      },
      // Friend Competition Achievements
      {
        id: 'duelist',
        name: 'Duelist',
        description: 'Beat a friend for the first time',
        category: 'social',
        type: 'milestone',
        difficulty: 'common',
        requirements: {
          metric: 'friend_wins',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 30,
          badge: 'Duelist'
        },
        icon: '⚔️',
        rarity_color: '#6b7280',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        prerequisites: ['the_challenger'],
        order: 15
      },
      {
        id: 'nemesis',
        name: 'Nemesis',
        description: 'Beat the same friend 10 times',
        category: 'social',
        type: 'counter',
        difficulty: 'rare',
        requirements: {
          metric: 'max_wins_against_single_friend',
          operator: 'greater_than_equal',
          value: 10
        },
        rewards: {
          points: 75,
          badge: 'Nemesis',
          title: 'Nemesis'
        },
        icon: '😈',
        rarity_color: '#3b82f6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        prerequisites: ['duelist'],
        order: 16
      },
      {
        id: 'unlucky_pal',
        name: 'Unlucky Pal',
        description: 'Lose 10 times in a row to the same friend',
        category: 'social',
        type: 'streak',
        difficulty: 'rare',
        requirements: {
          metric: 'max_losses_to_single_friend_streak',
          operator: 'streak',
          value: 10
        },
        rewards: {
          points: 50,
          badge: 'Unlucky Pal'
        },
        icon: '😅',
        rarity_color: '#3b82f6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        prerequisites: ['duelist'],
        order: 17
      },
      // Eclipse Pattern Achievements
      {
        id: 'solar_eclipse',
        name: 'Solar Eclipse',
        description: 'Roll only even numbers in a game',
        category: 'special',
        type: 'conditional',
        difficulty: 'rare',
        requirements: {
          metric: 'game_only_even_rolls',
          operator: 'greater_than_equal',
          value: 1,
          conditions: {
            type: 'all_even_in_game',
            requirements: [{ metric: 'min_rolls_in_game', value: 5 }]
          }
        },
        rewards: {
          points: 75,
          badge: 'Solar Eclipse'
        },
        icon: '☀️',
        rarity_color: '#f59e0b',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 18
      },
      {
        id: 'lunar_eclipse',
        name: 'Lunar Eclipse',
        description: 'Roll only odd numbers in a game',
        category: 'special',
        type: 'conditional',
        difficulty: 'rare',
        requirements: {
          metric: 'game_only_odd_rolls',
          operator: 'greater_than_equal',
          value: 1,
          conditions: {
            type: 'all_odd_in_game',
            requirements: [{ metric: 'min_rolls_in_game', value: 5 }]
          }
        },
        rewards: {
          points: 75,
          badge: 'Lunar Eclipse'
        },
        icon: '🌙',
        rarity_color: '#8b5cf6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 19
      },
      {
        id: 'equinox',
        name: 'Equinox',
        description: 'Roll the same number of odd and even in one game',
        category: 'special',
        type: 'conditional',
        difficulty: 'epic',
        requirements: {
          metric: 'game_equal_odd_even',
          operator: 'greater_than_equal',
          value: 1,
          conditions: {
            type: 'equal_odd_even_in_game',
            requirements: [{ metric: 'min_rolls_in_game', value: 6 }]
          }
        },
        rewards: {
          points: 100,
          badge: 'Equinox',
          title: 'Balancer'
        },
        icon: '⚖️',
        rarity_color: '#8b5cf6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 20
      },
      // Sequential Pattern Achievements
      {
        id: 'the_convergence',
        name: 'The Convergence',
        description: 'Roll 1,2,3,4,5,6 in order',
        category: 'special',
        type: 'conditional',
        difficulty: 'legendary',
        requirements: {
          metric: 'sequential_1_to_6',
          operator: 'greater_than_equal',
          value: 1,
          conditions: {
            type: 'exact_sequence',
            requirements: [
              { metric: 'sequence_pattern', value: 123456 }
            ]
          }
        },
        rewards: {
          points: 250,
          badge: 'Convergence',
          title: 'The Convergence',
          specialPrivileges: ['cosmic_dice']
        },
        icon: '🌌',
        rarity_color: '#f59e0b',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 21
      },
      // Perfect Victory Achievements
      {
        id: 'the_chosen_one',
        name: 'The Chosen One',
        description: 'Win by exact number needed on final roll',
        category: 'special',
        type: 'conditional',
        difficulty: 'epic',
        requirements: {
          metric: 'exact_winning_roll',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 150,
          badge: 'Chosen One',
          title: 'The Chosen One'
        },
        icon: '⭐',
        rarity_color: '#f59e0b',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 22
      },
      {
        id: 'the_fated',
        name: 'The Fated',
        description: 'Lose by exact number needed on final roll',
        category: 'special',
        type: 'conditional',
        difficulty: 'rare',
        requirements: {
          metric: 'exact_losing_roll',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 100,
          badge: 'Fated One'
        },
        icon: '💀',
        rarity_color: '#6b7280',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 23
      },
      {
        id: 'perfect_run',
        name: 'Perfect Run',
        description: 'Win a game with all rolls above 4',
        category: 'special',
        type: 'conditional',
        difficulty: 'epic',
        requirements: {
          metric: 'game_all_high_rolls',
          operator: 'greater_than_equal',
          value: 1,
          conditions: {
            type: 'all_rolls_above',
            requirements: [{ metric: 'min_roll_value', value: 4 }]
          }
        },
        rewards: {
          points: 125,
          badge: 'Perfect Runner',
          title: 'Perfect Runner'
        },
        icon: '🏃‍♂️',
        rarity_color: '#8b5cf6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 24
      },
      // Victory Margin Achievements
      {
        id: 'the_closer',
        name: 'The Closer',
        description: 'Win by 1 point',
        category: 'special',
        type: 'conditional',
        difficulty: 'rare',
        requirements: {
          metric: 'win_by_one_point',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 75,
          badge: 'The Closer'
        },
        icon: '🎯',
        rarity_color: '#3b82f6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 25
      },
      {
        id: 'the_crusher',
        name: 'The Crusher',
        description: 'Win by 50+ points',
        category: 'special',
        type: 'conditional',
        difficulty: 'epic',
        requirements: {
          metric: 'win_by_fifty_plus',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 125,
          badge: 'The Crusher',
          title: 'The Crusher'
        },
        icon: '💥',
        rarity_color: '#dc2626',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 26
      },
      // Special Roll Pattern Achievements
      {
        id: 'mind_over_matter',
        name: 'Mind Over Matter',
        description: 'Win a game without rolling a 6',
        category: 'special',
        type: 'conditional',
        difficulty: 'epic',
        requirements: {
          metric: 'win_without_sixes',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 100,
          badge: 'Mind Master',
          title: 'Mind Over Matter'
        },
        icon: '🧠',
        rarity_color: '#8b5cf6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 27
      },
      {
        id: 'snake_whisperer',
        name: 'Snake Whisperer',
        description: 'Roll double 1 three times in a game',
        category: 'special',
        type: 'conditional',
        difficulty: 'rare',
        requirements: {
          metric: 'triple_snake_eyes_game',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 100,
          badge: 'Snake Whisperer'
        },
        icon: '🐍',
        rarity_color: '#22c55e',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 28
      },
      {
        id: 'twin_titans',
        name: 'Twin Titans',
        description: 'Roll double 6 five times in a game',
        category: 'special',
        type: 'conditional',
        difficulty: 'legendary',
        requirements: {
          metric: 'five_double_sixes_game',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 200,
          badge: 'Twin Titans',
          title: 'Twin Titans',
          specialPrivileges: ['titan_dice']
        },
        icon: '👯',
        rarity_color: '#f59e0b',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 29
      },
      {
        id: 'the_balance',
        name: 'The Balance',
        description: 'Roll 1 and 6 back-to-back',
        category: 'special',
        type: 'conditional',
        difficulty: 'common',
        requirements: {
          metric: 'one_six_consecutive',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 50,
          badge: 'The Balance'
        },
        icon: '⚖️',
        rarity_color: '#6b7280',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 30
      },
      // Fortune Achievements
      {
        id: 'fortunes_child',
        name: "Fortune's Child",
        description: 'Roll 10 sixes in one match',
        category: 'special',
        type: 'conditional',
        difficulty: 'epic',
        requirements: {
          metric: 'ten_sixes_in_match',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 150,
          badge: "Fortune's Child",
          title: "Fortune's Child"
        },
        icon: '🍀',
        rarity_color: '#22c55e',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 31
      },
      {
        id: 'cursed_hands',
        name: 'Cursed Hands',
        description: 'Roll 10 ones in one match',
        category: 'special',
        type: 'conditional',
        difficulty: 'rare',
        requirements: {
          metric: 'ten_ones_in_match',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 75,
          badge: 'Cursed Hands'
        },
        icon: '👻',
        rarity_color: '#6b7280',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 32
      },
      // Streak Achievements
      {
        id: 'lucky_streak',
        name: 'Lucky Streak',
        description: 'Roll 3 sixes in a row',
        category: 'special',
        type: 'streak',
        difficulty: 'rare',
        requirements: {
          metric: 'three_sixes_streak',
          operator: 'streak',
          value: 3
        },
        rewards: {
          points: 100,
          badge: 'Lucky Streak'
        },
        icon: '🎰',
        rarity_color: '#f59e0b',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 33
      },
      {
        id: 'doomed_streak',
        name: 'Doomed Streak',
        description: 'Roll 3 ones in a row',
        category: 'special',
        type: 'streak',
        difficulty: 'rare',
        requirements: {
          metric: 'three_ones_streak',
          operator: 'streak',
          value: 3
        },
        rewards: {
          points: 75,
          badge: 'Doomed Streak'
        },
        icon: '💀',
        rarity_color: '#6b7280',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 34
      },
      {
        id: 'dice_jester',
        name: 'Dice Jester',
        description: 'Roll doubles five times in one game',
        category: 'special',
        type: 'conditional',
        difficulty: 'epic',
        requirements: {
          metric: 'five_doubles_in_game',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 125,
          badge: 'Dice Jester',
          title: 'Dice Jester'
        },
        icon: '🃏',
        rarity_color: '#8b5cf6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 35
      },
      {
        id: 'cosmic_alignment',
        name: 'Cosmic Alignment',
        description: 'Roll the exact same number 3 times in a row',
        category: 'special',
        type: 'streak',
        difficulty: 'rare',
        requirements: {
          metric: 'same_number_three_streak',
          operator: 'streak',
          value: 3
        },
        rewards: {
          points: 100,
          badge: 'Cosmic Alignment'
        },
        icon: '🌌',
        rarity_color: '#8b5cf6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 36
      },
      // Victory Streak Achievements
      {
        id: 'first_blood',
        name: 'First Blood',
        description: 'Win your first game',
        category: 'progression',
        type: 'milestone',
        difficulty: 'common',
        requirements: {
          metric: 'games_won',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 25,
          badge: 'First Blood'
        },
        icon: '🩸',
        rarity_color: '#dc2626',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 37
      },
      {
        id: 'victorys_child',
        name: "Victory's Child",
        description: 'Win 3 games in a row',
        category: 'progression',
        type: 'streak',
        difficulty: 'common',
        requirements: {
          metric: 'win_streak',
          operator: 'streak',
          value: 3
        },
        rewards: {
          points: 50,
          badge: "Victory's Child"
        },
        icon: '🏆',
        rarity_color: '#f59e0b',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        order: 38
      },
      {
        id: 'stormbringer',
        name: 'Stormbringer',
        description: 'Win 5 games in a row',
        category: 'progression',
        type: 'streak',
        difficulty: 'rare',
        requirements: {
          metric: 'win_streak',
          operator: 'streak',
          value: 5
        },
        rewards: {
          points: 100,
          badge: 'Stormbringer',
          title: 'Stormbringer'
        },
        icon: '⛈️',
        rarity_color: '#3b82f6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        prerequisites: ['victorys_child'],
        order: 39
      },
      {
        id: 'the_ascended',
        name: 'The Ascended',
        description: 'Reach a 10 win streak',
        category: 'progression',
        type: 'streak',
        difficulty: 'epic',
        requirements: {
          metric: 'win_streak',
          operator: 'streak',
          value: 10
        },
        rewards: {
          points: 200,
          badge: 'The Ascended',
          title: 'The Ascended',
          specialPrivileges: ['ascended_aura']
        },
        icon: '👑',
        rarity_color: '#8b5cf6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        prerequisites: ['stormbringer'],
        order: 40
      },
      {
        id: 'legendborn',
        name: 'Legendborn',
        description: 'Reach a 15 win streak',
        category: 'progression',
        type: 'streak',
        difficulty: 'legendary',
        requirements: {
          metric: 'win_streak',
          operator: 'streak',
          value: 15
        },
        rewards: {
          points: 350,
          badge: 'Legendborn',
          title: 'Legendborn',
          specialPrivileges: ['legend_status', 'golden_crown']
        },
        icon: '⚡',
        rarity_color: '#f59e0b',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        prerequisites: ['the_ascended'],
        order: 41
      },
      {
        id: 'immortal_sovereign',
        name: 'Immortal Sovereign',
        description: 'Reach a 20 win streak',
        category: 'progression',
        type: 'streak',
        difficulty: 'mythic',
        requirements: {
          metric: 'win_streak',
          operator: 'streak',
          value: 20
        },
        rewards: {
          points: 500,
          badge: 'Immortal Sovereign',
          title: 'Immortal King/Queen',
          specialPrivileges: ['immortal_status', 'divine_crown', 'god_mode_unlocked']
        },
        icon: '👑',
        rarity_color: '#dc2626',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now(),
        prerequisites: ['legendborn'],
        order: 42
      }
    ];
  }

  static getInstance(): AchievementDefinitionsService {
    if (!AchievementDefinitionsService.instance) {
      AchievementDefinitionsService.instance = new AchievementDefinitionsService();
    }
    return AchievementDefinitionsService.instance;
  }

  /**
   * Get all active achievement definitions
   */
  async getAllAchievements(forceRefresh = false): Promise<AchievementDefinition[]> {
    if (!forceRefresh && this.isCacheValid()) {
      return Array.from(this.cache.values());
    }

    try {
      const achievementsRef = collection(db, 'achievementDefinitions');
      const q = query(
        achievementsRef,
        where('isActive', '==', true),
        orderBy('category'),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.docs.length > 0) {
        const achievements: AchievementDefinition[] = [];

        snapshot.forEach(doc => {
          const data = doc.data() as AchievementDefinition;
          data.id = doc.id;
          achievements.push(data);
          this.cache.set(doc.id, data);
        });

        this.lastCacheUpdate = Date.now();
        return achievements;
      }
      
      // If no data in Firestore, return default achievements
      console.log('No achievements found in Firestore, using default achievements');
      const defaultAchievements = this.getDefaultAchievements();
      
      // Update cache with defaults
      defaultAchievements.forEach((achievement: AchievementDefinition) => {
        this.cache.set(achievement.id, achievement);
      });
      this.lastCacheUpdate = Date.now();
      
      return defaultAchievements;
    } catch (error) {
      console.error('Error fetching achievement definitions:', error);
      console.log('Falling back to default achievements');
      
      const defaultAchievements = this.getDefaultAchievements();
      
      // Update cache with defaults
      defaultAchievements.forEach((achievement: AchievementDefinition) => {
        this.cache.set(achievement.id, achievement);
      });
      this.lastCacheUpdate = Date.now();
      
      return defaultAchievements;
    }
  }

  /**
   * Get achievements by category
   */
  async getAchievementsByCategory(category: AchievementCategory): Promise<AchievementDefinition[]> {
    const allAchievements = await this.getAllAchievements();
    return allAchievements.filter(achievement => achievement.category === category);
  }

  /**
   * Get a specific achievement definition
   */
  async getAchievement(achievementId: string): Promise<AchievementDefinition | null> {
    // Check cache first
    if (this.cache.has(achievementId)) {
      return this.cache.get(achievementId)!;
    }

    try {
      const achievementRef = doc(db, 'achievementDefinitions', achievementId);
      const achievementDoc = await getDoc(achievementRef);

      if (achievementDoc.exists()) {
        const data = achievementDoc.data() as AchievementDefinition;
        data.id = achievementDoc.id;
        this.cache.set(achievementId, data);
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching achievement:', error);
      throw error;
    }
  }

  /**
   * Get achievements that should be visible to user (not hidden unless completed)
   */
  async getVisibleAchievements(completedAchievementIds: string[] = []): Promise<AchievementDefinition[]> {
    const allAchievements = await this.getAllAchievements();
    
    return allAchievements.filter(achievement => 
      !achievement.isHidden || completedAchievementIds.includes(achievement.id)
    );
  }

  /**
   * Get achievements by difficulty
   */
  async getAchievementsByDifficulty(difficulty: string): Promise<AchievementDefinition[]> {
    const allAchievements = await this.getAllAchievements();
    return allAchievements.filter(achievement => achievement.difficulty === difficulty);
  }

  /**
   * Get achievements in a series
   */
  async getAchievementSeries(seriesName: string): Promise<AchievementDefinition[]> {
    const allAchievements = await this.getAllAchievements();
    return allAchievements
      .filter(achievement => achievement.series === seriesName)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Search achievements by name or description
   */
  async searchAchievements(searchTerm: string): Promise<AchievementDefinition[]> {
    const allAchievements = await this.getAllAchievements();
    const term = searchTerm.toLowerCase();
    
    return allAchievements.filter(achievement => 
      achievement.name.toLowerCase().includes(term) ||
      achievement.description.toLowerCase().includes(term)
    );
  }

  /**
   * Set up real-time listener for achievement definitions
   */
  subscribeToAchievements(callback: (achievements: AchievementDefinition[]) => void): Unsubscribe {
    const achievementsRef = collection(db, 'achievementDefinitions');
    const q = query(
      achievementsRef,
      where('isActive', '==', true),
      orderBy('category'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const achievements: AchievementDefinition[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as AchievementDefinition;
        data.id = doc.id;
        achievements.push(data);
        this.cache.set(doc.id, data);
      });

      // If no achievements in database, use defaults
      if (achievements.length === 0) {
        console.log('No achievements found in database, using defaults');
        const defaultAchievements = this.getDefaultAchievements();
        defaultAchievements.forEach((achievement: AchievementDefinition) => {
          this.cache.set(achievement.id, achievement);
        });
        this.lastCacheUpdate = Date.now();
        callback(defaultAchievements);
      } else {
        this.lastCacheUpdate = Date.now();
        callback(achievements);
      }
    }, (error) => {
      console.error('Error in achievements subscription:', error);
      // On error, fallback to default achievements
      console.log('Falling back to default achievements due to error');
      const defaultAchievements = this.getDefaultAchievements();
      callback(defaultAchievements);
    });

    this.listeners.add(unsubscribe);
    return unsubscribe;
  }

  /**
   * Admin functions (would be restricted to admin users)
   */
  async createAchievement(achievement: Omit<AchievementDefinition, 'id'>): Promise<string> {
    try {
      const achievementsRef = collection(db, 'achievementDefinitions');
      const docRef = await addDoc(achievementsRef, {
        ...achievement,
        releaseDate: achievement.releaseDate || Timestamp.now()
      });
      
      // Invalidate cache
      this.invalidateCache();
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating achievement:', error);
      throw error;
    }
  }

  async updateAchievement(achievementId: string, updates: Partial<AchievementDefinition>): Promise<void> {
    try {
      const achievementRef = doc(db, 'achievementDefinitions', achievementId);
      await updateDoc(achievementRef, updates);
      
      // Update cache
      if (this.cache.has(achievementId)) {
        const current = this.cache.get(achievementId)!;
        this.cache.set(achievementId, { ...current, ...updates });
      }
    } catch (error) {
      console.error('Error updating achievement:', error);
      throw error;
    }
  }

  async deleteAchievement(achievementId: string): Promise<void> {
    try {
      const achievementRef = doc(db, 'achievementDefinitions', achievementId);
      await deleteDoc(achievementRef);
      
      // Remove from cache
      this.cache.delete(achievementId);
    } catch (error) {
      console.error('Error deleting achievement:', error);
      throw error;
    }
  }

  /**
   * Cache management
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.CACHE_DURATION && this.cache.size > 0;
  }

  invalidateCache(): void {
    this.cache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.invalidateCache();
  }

  /**
   * Get predefined sample achievements for initial setup
   */
  static getSampleAchievements(): Omit<AchievementDefinition, 'id'>[] {
    return [
      {
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
        isHidden: true,
        releaseDate: Timestamp.now()
      }
    ];
  }
}

export default AchievementDefinitionsService;
