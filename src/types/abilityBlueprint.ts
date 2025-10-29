import { Timestamp } from 'firebase/firestore';

/**
 * Ability Management Blueprint Types
 * 
 * Complete type definitions for the DashDice ability system
 * based on the comprehensive blueprint for ability management.
 */

// ==================== ENUMS ====================

export enum AbilityCategory {
  TACTICAL = 'tactical',      // Strategic positioning, information
  ATTACK = 'attack',          // Offensive abilities, score manipulation  
  DEFENSE = 'defense',        // Protection, damage prevention
  UTILITY = 'utility',        // Resource management, flexibility
  GAMECHANGER = 'gamechanger' // High-impact, match-altering effects
}

export enum AbilityType {
  ACTIVE = 'active',         // Player manually activates
  PASSIVE = 'passive',       // Always active/automatic
  REACTIVE = 'reactive',     // Triggers on specific events
  CONDITIONAL = 'conditional' // Activates when conditions met
}

export enum AbilityRarity {
  COMMON = 'common',         // 1-2 star cost, basic effects
  RARE = 'rare',            // 2-3 star cost, moderate effects
  EPIC = 'epic',            // 3-4 star cost, powerful effects
  LEGENDARY = 'legendary',   // 4-5 star cost, game-changing
  MYTHIC = 'mythic'         // 5+ star cost, reality-bending
}

export enum TimingConstraint {
  // Turn-based timing
  MY_TURN_START = 'my_turn_start',
  MY_TURN_END = 'my_turn_end', 
  OPPONENT_TURN_START = 'opponent_turn_start',
  OPPONENT_TURN_END = 'opponent_turn_end',
  ANY_TURN = 'any_turn',
  
  // Action-based timing
  BEFORE_ROLL = 'before_roll',
  AFTER_ROLL = 'after_roll',
  BEFORE_BANK = 'before_bank', 
  AFTER_BANK = 'after_bank',
  BEFORE_BUST = 'before_bust',
  AFTER_BUST = 'after_bust',
  
  // Match timing
  MATCH_START = 'match_start',
  MATCH_END = 'match_end',
  ROUND_START = 'round_start',
  
  // Conditional timing
  WHEN_BEHIND = 'when_behind',     // When losing
  WHEN_AHEAD = 'when_ahead',       // When winning
  LOW_AURA = 'low_aura',          // When aura < 10
  HIGH_AURA = 'high_aura'         // When aura > 30
}

export enum EffectType {
  // Score manipulation
  MODIFY_SCORE = 'modify_score',
  STEAL_SCORE = 'steal_score',
  MULTIPLY_SCORE = 'multiply_score',
  
  // Dice manipulation  
  REROLL_DICE = 'reroll_dice',
  FORCE_DICE_VALUE = 'force_dice_value',
  ADD_DICE = 'add_dice',
  
  // Aura manipulation
  GAIN_AURA = 'gain_aura',
  DRAIN_AURA = 'drain_aura', 
  STEAL_AURA = 'steal_aura',
  
  // Turn control
  SKIP_TURN = 'skip_turn',
  EXTRA_TURN = 'extra_turn',
  FREEZE_OPPONENT = 'freeze_opponent',
  
  // Protection
  SHIELD_SCORE = 'shield_score',
  IMMUNITY = 'immunity',
  REFLECT_DAMAGE = 'reflect_damage',
  
  // Information
  REVEAL_HAND = 'reveal_hand',
  PREDICT_DICE = 'predict_dice',
  SCAN_ABILITIES = 'scan_abilities',
  
  // Advanced
  COPY_ABILITY = 'copy_ability',
  STEAL_ABILITY = 'steal_ability', 
  SWAP_SCORES = 'swap_scores',
  TIME_REWIND = 'time_rewind'
}

// ==================== CORE INTERFACES ====================

/**
 * Complete DashDice Ability Definition
 */
export interface DashDiceAbility {
  // === BASIC IDENTIFICATION ===
  id: string;                    // Unique identifier (e.g., 'siphon_v2')
  name: string;                  // Display name (e.g., 'Siphon')
  version: number;               // Version for updates/balancing
  
  // === CATEGORIZATION ===
  category: AbilityCategory;     // tactical | attack | defense | utility | gamechanger
  type: AbilityType;            // active | passive | reactive | conditional
  rarity: AbilityRarity;        // common | rare | epic | legendary | mythic
  
  // === VISUAL & NARRATIVE ===
  description: string;           // Short description (1-2 sentences)
  longDescription: string;       // Detailed explanation with examples
  flavorText?: string;          // Lore/story text
  iconUrl: string;              // Icon path (e.g., '/abilities/attack/siphon.webp')
  animationUrl?: string;        // Animation asset path
  sounds?: {
    activation: string;          // Sound when activated
    effect: string;             // Sound when effect occurs
    failure?: string;           // Sound when fails/blocked
  };
  
  // === GAME MECHANICS ===
  auraCost: number;             // AURA required to activate (0-50)
  cooldown: number;             // Cooldown in seconds (0 = no cooldown)
  maxUsesPerMatch?: number;     // Usage limit per match (undefined = unlimited)
  starCost: number;             // Star points to equip (1-5)
  
  // === TARGETING & TIMING ===
  targeting: AbilityTargeting;
  timing: AbilityTiming;
  
  // === EFFECTS SYSTEM ===
  effects: AbilityEffect[];     // Primary effects of the ability
  conditions?: ActivationCondition[]; // Requirements to activate
  
  // === ADVANCED FEATURES ===
  persistence?: AbilityPersistence;
  interactions?: AbilityInteractions;
  
  // === PROGRESSION & UNLOCKING ===
  unlockRequirements: UnlockRequirements;
  
  // === BALANCING & ANALYTICS ===
  balancing: BalancingData;
  
  // === METADATA ===
  isActive: boolean;           // Can be used in matches
  isHidden: boolean;          // Hidden from opponent
  isDevelopment: boolean;     // Only available in dev mode
  tags: string[];             // For searching/filtering
  
  // === TIMESTAMPS ===
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;          // Designer/developer ID
}

/**
 * Ability targeting configuration
 */
export interface AbilityTargeting {
  type: 'self' | 'opponent' | 'both' | 'choice' | 'conditional';
  allowSelfTarget: boolean;
  maxTargets: number;
  validTargets?: string[];    // Specific player types that can be targeted
}

/**
 * Ability timing configuration
 */
export interface AbilityTiming {
  usableWhen: TimingConstraint[];  // When ability can be used
  triggerEvents?: string[];        // Events that can auto-trigger (for reactives)
  channelTime?: number;            // Time to channel/cast (seconds)
}

/**
 * Individual ability effect
 */
export interface AbilityEffect {
  id: string;
  name: string;
  description: string;
  
  // Effect execution
  type: EffectType;
  magnitude: number | string;    // Amount or formula
  target: EffectTarget;
  duration?: number;
  
  // Conditions
  probability?: number;          // 0-1 chance of occurring
  conditions?: EffectCondition[];
  
  // Chaining
  chainedEffects?: AbilityEffect[]; // Effects that trigger after this
  failureEffects?: AbilityEffect[]; // Effects if this fails
}

/**
 * Effect target specification
 */
export interface EffectTarget {
  type: 'self' | 'opponent' | 'both' | 'game_state';
  property?: string;            // Specific property to affect
  selector?: string;            // CSS-like selector for complex targeting
}

/**
 * Condition for effect activation
 */
export interface EffectCondition {
  type: string;                 // Type of condition to check
  comparison: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: any;                   // Value to compare against
  target?: string;              // What to check the condition against
}

/**
 * Activation condition for ability usage
 */
export interface ActivationCondition {
  type: string;                 // Type of condition
  description: string;          // Human-readable description
  checkFunction: string;        // Function name to validate condition
  parameters?: { [key: string]: any }; // Parameters for the check function
}

/**
 * Ability persistence configuration
 */
export interface AbilityPersistence {
  duration?: number;           // How long effects last (seconds)
  turnsRemaining?: number;     // Turn-based duration
  stackable: boolean;         // Can multiple instances exist
  dispellable: boolean;       // Can be removed by dispel effects
}

/**
 * Ability interactions with other abilities
 */
export interface AbilityInteractions {
  synergiesWith: string[];    // Ability IDs that combo well
  counters: string[];         // Ability IDs this counters
  counteredBy: string[];      // Ability IDs that counter this
  blockedBy: string[];        // Effects that prevent activation
}

/**
 * Unlock requirements for ability
 */
export interface UnlockRequirements {
  level: number;              // Minimum player level
  prerequisiteAbilities?: string[]; // Required abilities first
  achievementRequired?: string;     // Specific achievement
  specialCondition?: string;        // Custom unlock condition
}

/**
 * Balancing and analytics data
 */
export interface BalancingData {
  powerLevel: number;         // Internal power rating (1-100)
  winRateImpact: number;      // Expected win rate change (-0.1 to +0.1)
  usageFrequency: 'low' | 'medium' | 'high'; // Expected usage
  lastBalanceUpdate: Timestamp;
}

// ==================== BOT INTEGRATION ====================

/**
 * Bot ability usage profile
 */
export interface BotAbilityProfile {
  playStyle: 'aggressive' | 'defensive' | 'balanced' | 'chaotic';
  preferredCategories: AbilityCategory[];
  abilityUsagePatterns: {
    [abilityId: string]: BotAbilityUsagePattern;
  };
  resourceManagement: BotResourceManagement;
}

/**
 * How a bot uses a specific ability
 */
export interface BotAbilityUsagePattern {
  frequency: number;        // How often to use (0-1)
  triggerConditions: string[]; // When to use
  priority: number;         // Usage priority (1-10)
  minimumAura: number;      // Min aura before considering
  gameStateConditions?: {   // Specific game state requirements
    scoreRange?: [number, number]; // [min, max] score to use
    opponentScoreRange?: [number, number];
    turnRange?: [number, number]; // [min, max] turn number
  };
}

/**
 * Bot resource management strategy
 */
export interface BotResourceManagement {
  auraThreshold: number;      // Min aura before using abilities
  saveForFinisher: boolean;   // Save aura for final abilities
  emergencyThreshold: number; // Aura level to trigger emergency abilities
  conservativeMode: boolean;  // Use abilities more sparingly
}

// ==================== ANALYTICS ====================

/**
 * Ability usage analytics
 */
export interface AbilityUsageAnalytics {
  abilityId: string;
  totalUsages: number;
  successRate: number;
  averageGameImpact: number;
  winRateWhenUsed: number;
  mostCommonCombinations: string[]; // Other abilities used with this
  countersEffectiveness: { [abilityId: string]: number };
  
  // Time-based data
  usageByTimeOfDay: { [hour: string]: number };
  usageByGameMode: { [mode: string]: number };
  usageByPlayerLevel: { [level: string]: number };
  
  // Recent trends
  last30DaysUsage: number;
  trendDirection: 'increasing' | 'stable' | 'decreasing';
  
  updatedAt: Timestamp;
}

/**
 * Ability balancing metrics
 */
export interface AbilityBalancingMetrics {
  abilityId: string;
  currentPowerLevel: number;
  recommendedPowerLevel: number;
  balanceStatus: 'underpowered' | 'balanced' | 'overpowered';
  
  suggestedChanges: {
    auraCost?: number;
    cooldown?: number;
    effectMagnitude?: number;
    starCost?: number;
  };
  
  confidence: number; // 0-1 confidence in recommendations
  sampleSize: number; // Number of games analyzed
  lastAnalysis: Timestamp;
}

// ==================== UI INTEGRATION ====================

/**
 * Ability display information for UI components
 */
export interface AbilityDisplayInfo {
  ability: DashDiceAbility;
  isUnlocked: boolean;
  isEquipped: boolean;
  isUsable: boolean;
  usabilityReason?: string; // Why it can't be used
  cooldownRemaining?: number;
  usesRemaining?: number;
  
  // UI-specific data
  displayPriority: number; // For sorting in UI
  newlyUnlocked: boolean; // Show "NEW" badge
  isRecommended: boolean; // Recommended for player
}

/**
 * Ability search and filter criteria
 */
export interface AbilitySearchCriteria {
  query?: string;            // Text search
  categories?: AbilityCategory[];
  rarities?: AbilityRarity[];
  types?: AbilityType[];
  unlocked?: boolean;        // Only unlocked abilities
  equipped?: boolean;        // Only equipped abilities
  auraCostRange?: [number, number]; // [min, max] aura cost
  starCostRange?: [number, number]; // [min, max] star cost
  tags?: string[];           // Must have these tags
  
  // Sorting
  sortBy: 'name' | 'category' | 'rarity' | 'auraCost' | 'starCost' | 'unlockLevel' | 'winRate';
  sortOrder: 'asc' | 'desc';
  
  // Pagination
  limit?: number;
  offset?: number;
}

// ==================== MATCH INTEGRATION ====================

/**
 * Ability execution context in a match
 */
export interface MatchAbilityExecution {
  matchId: string;
  playerId: string;
  abilityId: string;
  targetPlayerIds: string[];
  
  // Execution state
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startedAt: Timestamp;
  completedAt?: Timestamp;
  
  // Results
  success: boolean;
  effectsApplied: string[]; // IDs of effects that were applied
  resourcesSpent: { [resource: string]: number };
  errorMessage?: string;
  
  // Analytics
  gameStateBeforeExecution: any;
  gameStateAfterExecution: any;
  impactMetrics: {
    scoreChange: number;
    auraChange: number;
    gamePhaseChange?: string;
  };
}

/**
 * Player's available abilities in a match
 */
export interface MatchPlayerAbilities {
  playerId: string;
  matchId: string;
  
  // Equipped abilities from loadout
  equippedAbilities: {
    [category in AbilityCategory]?: string; // ability ID
  };
  
  // Ability states
  abilityStates: {
    [abilityId: string]: {
      usesRemaining: number;
      cooldownEndsAt?: Timestamp;
      isBlocked: boolean;
      blockReason?: string;
    };
  };
  
  // Resources
  currentAura: number;
  maxAura: number;
  
  updatedAt: Timestamp;
}

// ==================== EXPORTS ====================

// Re-export commonly used types
export type { 
  DashDiceAbility as Ability,
  AbilityEffect as Effect,
  BotAbilityProfile as BotProfile,
  AbilityUsageAnalytics as UsageAnalytics,
  MatchAbilityExecution as MatchExecution
};