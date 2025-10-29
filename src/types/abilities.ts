import { Timestamp } from 'firebase/firestore';

/**
 * Core Ability Interface
 * Defines the structure for all abilities in the game
 */
export interface Ability {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  starCost: number; // 1-5 star points required to equip
  category: 'tactical' | 'attack' | 'defense' | 'utility' | 'gamechanger';
  cooldown: number; // seconds
  maxUses?: number; // per match, undefined = unlimited
  auraCost: number; // total aura required to activate
  hidden?: boolean; // default true — hidden from other player
  unlockLevel: number;
  timing?: 'any_turn' | 'own_turn' | 'opponent_turn'; // NEW - when ability can be used
  iconUrl?: string;
  animationUrl?: string;
  sounds?: {
    activation: string;
    effect: string;
  };
  effects: AbilityEffect[];
  isActive: boolean;
}

/**
 * Ability Effect Types
 * Defines what happens when an ability is activated
 */
export interface AbilityEffect {
  type: 'dice_reroll' | 'score_multiply' | 'shield' | 'combo_chain' | 'time_freeze' | 'steal_turn' | 'bonus_roll' | 'reveal_abilities' | 'steal_ability' | 'aura_gain' | 'aura_drain' | 'steal_points';
  value?: number; // Numeric value for the effect
  duration?: number; // Duration in seconds
  condition?: string; // Special condition for activation ('on_bank', 'on_bust', etc.)
  target?: 'self' | 'opponent' | 'both';
  metadata?: { [key: string]: any }; // Additional effect data
}

/**
 * User's Abilities Collection
 * Tracks which abilities a user has unlocked and their usage stats
 */
export interface UserAbility {
  id: string;
  userId: string;
  abilityId: string;
  unlockedAt: Timestamp;
  timesUsed: number;
  successRate: number; // percentage
  isEquipped: boolean;
  equippedSlot?: 'tactical' | 'attack' | 'defense' | 'utility' | 'gamechanger';
  // Optional persistent aura charge (for passive abilities)
  auraProgress?: number;
}

/**
 * User Loadout - Updated for Category-Based System
 * Now enforces one ability per category instead of numbered slots
 */
export interface UserLoadout {
  id: string;
  userId: string;
  name: string;
  abilities: {
    tactical?: string; // ability ID
    attack?: string;
    defense?: string;
    utility?: string;
    gamechanger?: string;
  };
  totalStarCost: number;
  maxStarPoints: number; // based on level
  isActive: boolean;
  createdAt: Timestamp;
  lastUsed: Timestamp;
}

/**
 * User Progression System
 * Tracks XP, level, unlocked abilities, and achievements
 */
export interface UserProgression {
  userId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalWins: number;
  totalMatches: number;
  winStreak: number;
  maxStarPoints: number; // increases with level
  unlockedAbilities: string[]; // ability IDs
  stats: {
    abilitiesUsed: number;
    mostUsedAbility: string;
    favoriteCategory: string;
    averageMatchXP: number;
  };
  milestones: Array<{
    type: 'level' | 'wins' | 'abilities_unlocked';
    value: number;
    achievedAt: Timestamp;
    reward?: string;
  }>;
}

/**
 * Match Ability Usage Log
 * Tracks ability usage for analytics and abuse prevention
 */
export interface MatchAbilityUsage {
  id: string;
  matchId: string;
  userId: string;
  abilityId: string;
  usedAt: Timestamp;
  auraSpent: number; // NEW — track aura consumption
  gameState: {
    round: number;
    userScore: number;
    opponentScore: number;
    diceValues: number[];
    playerAura: number; // aura before activation
  };
  result: {
    success: boolean;
    effectValue?: number;
    scoreImpact?: number;
    auraGranted?: number; // if ability grants aura
  };
  target?: string; // target player ID if applicable
  wasStolen?: boolean; // if this was a stolen ability usage
  revealedCount?: number; // number of abilities revealed (for Vision Surge)
}

/**
 * Enhanced Match Data for Abilities System
 * Extends existing MatchData with aura pools and ability state
 */
export interface AbilityMatchData {
  // Aura system
  playerAura: {
    [playerId: string]: number; // current aura available
  };
  
  // Ability cooldowns (server-managed)
  abilityCooldowns: {
    [playerId: string]: { 
      [abilityId: string]: Timestamp; // expiry timestamp
    };
  };
  
  // Revealed abilities tracking
  revealedAbilities?: {
    [playerId: string]: {
      [targetPlayerId: string]: {
        abilityIds: string[];
        revealedAt: Timestamp;
        expiresAt?: Timestamp; // auto-hide after duration
      };
    };
  };
  
  // Active ability effects
  activeEffects: {
    [playerId: string]: {
      effectId: string;
      abilityId: string;
      type: string;
      value?: number;
      expiresAt: Timestamp;
      metadata?: any;
    }[];
  };
  
  // Temporary stolen abilities (for match duration only)
  tempStolenAbilities?: {
    [playerId: string]: {
      abilityId: string;
      stolenFrom: string;
      stolenAt: Timestamp;
    }[];
  };
  
  // Match-specific ability usage counts
  abilityUsageCounts: {
    [playerId: string]: {
      [abilityId: string]: number;
    };
  };
}

/**
 * Aura Event Types
 * Defines what actions grant aura during matches
 */
export interface AuraEvent {
  type: 'roll' | 'bank' | 'double' | 'snake_eyes' | 'opponent_bust' | 'ability_grant';
  playerId: string;
  auraGranted: number;
  timestamp: Timestamp;
  metadata?: { [key: string]: any };
}

/**
 * Ability Categories with Metadata
 */
export const ABILITY_CATEGORIES = {
  tactical: {
    name: 'Tactical',
    icon: '/Abilities/Catagories/Tactical/Tactical.webp',
    color: 'blue',
    description: 'Information and strategic advantages'
  },
  attack: {
    name: 'Attack',
    icon: '/Abilities/Catagories/Attack/Attack.webp',
    color: 'red',
    description: 'Offensive abilities that affect opponents'
  },
  defense: {
    name: 'Defense',
    icon: '/Abilities/Catagories/Defense/Defense.webp',
    color: 'green',
    description: 'Protective abilities and counters'
  },
  utility: {
    name: 'Utility',
    icon: '/Abilities/Catagories/Utility/Utility.webp',
    color: 'yellow',
    description: 'Dice manipulation and turn control'
  },
  gamechanger: {
    name: 'Game Changer',
    icon: '/Abilities/Catagories/Game Changer/Game Changer.webp',
    color: 'purple',
    description: 'Powerful abilities that can change the match'
  }
} as const;

/**
 * Category Colors for UI (re-exported from predefined abilities)
 */
export const CATEGORY_COLORS = {
  tactical: {
    primary: '#3B82F6', // blue-500
    secondary: '#1E40AF', // blue-700
    accent: '#60A5FA' // blue-400
  },
  attack: {
    primary: '#EF4444', // red-500
    secondary: '#B91C1C', // red-700
    accent: '#F87171' // red-400
  },
  defense: {
    primary: '#10B981', // green-500
    secondary: '#047857', // green-700
    accent: '#34D399' // green-400
  },
  utility: {
    primary: '#F59E0B', // yellow-500
    secondary: '#D97706', // yellow-600
    accent: '#FBBF24' // yellow-400
  },
  gamechanger: {
    primary: '#8B5CF6', // purple-500
    secondary: '#6D28D9', // purple-700
    accent: '#A78BFA' // purple-400
  }
} as const;

/**
 * Aura Generation Rates
 * Standard rates for aura generation during matches
 */
export const AURA_RATES = {
  ROLL: 1,           // +1 AURA per roll
  BANK: 2,           // +2 AURA for banking
  DOUBLE: 1,         // +1 AURA for doubles (in addition to ROLL)
  SNAKE_EYES: 0,     // +0 AURA for bust (snake eyes)
  OPPONENT_BUST: 0,  // +0 AURA when opponent busts
  BUST: 0,           // +0 AURA for any bust
  // Ability-specific aura grants
  ABILITY_GRANT: (value: number) => value
} as const;

/**
 * Star Point Progression
 * How star points increase with level
 */
export const STAR_POINT_PROGRESSION = {
  BASE_POINTS: 5,
  POINTS_PER_LEVEL: 1,
  MAX_POINTS: 15,
  calculateStarPoints: (level: number) => Math.min(15, 5 + level)
} as const;

/**
 * XP and Level Progression
 * How players gain XP and level up
 */
export const XP_PROGRESSION = {
  BASE_XP_PER_LEVEL: 100,
  WIN_XP: 100,
  LOSS_XP: 50,
  QUICK_WIN_BONUS: 25,
  ABILITY_USE_BONUS: 10,
  SCORE_BONUS_DIVISOR: 100,
  MAX_MATCH_XP: 200,
  calculateXPForLevel: (level: number) => level * 100,
  calculateMatchXP: (
    isWin: boolean,
    matchDuration: number,
    abilitiesUsed: number,
    scoreAchieved: number
  ) => {
    let baseXP = isWin ? 100 : 50;
    
    // Quick win bonus
    if (isWin && matchDuration < 60) {
      baseXP += 25;
    }
    
    // Ability usage bonus
    if (abilitiesUsed > 0) {
      baseXP += abilitiesUsed * 10;
    }
    
    // Score achievement bonus
    baseXP += Math.floor(scoreAchieved / 100) * 5;
    
    return Math.min(baseXP, 200); // Cap at 200 XP
  }
} as const;

/**
 * Ability Unlock Schedule
 * Defines when abilities are unlocked based on level/achievements
 */
export interface AbilityUnlock {
  abilityId: string;
  level?: number;
  wins?: number;
  specialCondition?: string;
  milestone?: string;
}

export const ABILITY_UNLOCK_SCHEDULE: AbilityUnlock[] = [
  { abilityId: 'lucky_reroll', level: 1 },
  { abilityId: 'focus_shot', level: 2 },
  { abilityId: 'shield_wall', level: 3 },
  { abilityId: 'vision_surge', level: 5 },
  { abilityId: 'double_trouble', level: 5 },
  { abilityId: 'time_warp', level: 7 },
  { abilityId: 'combo_chain', level: 10 },
  { abilityId: 'ability_theft', wins: 50, specialCondition: 'Win 50 matches' },
  { abilityId: 'grand_theft', level: 15 },
];