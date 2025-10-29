import { Timestamp } from 'firebase/firestore';

/**
 * Enhanced Ability Effect System
 * 
 * This system is designed to handle complex, multi-step abilities with:
 * - Conditional triggers and requirements
 * - Persistent and temporary effects
 * - Multi-target abilities
 * - Complex resource management
 * - State-dependent behavior
 */

// ==================== ENHANCED EFFECT TYPES ====================

/**
 * Primary effect categories for complex abilities
 */
export type EffectCategory = 
  // Direct manipulation effects
  | 'dice_manipulation'     // Rerolls, force values, add dice
  | 'score_manipulation'    // Multiply, add, steal, transfer points
  | 'resource_manipulation' // Aura gain/drain, cooldown changes
  
  // Defensive and protective effects
  | 'protection'           // Shields, immunity, damage reduction
  | 'counters'            // Counter-attacks, reflect damage
  
  // Control and disruption effects
  | 'control'             // Freeze, skip turns, forced actions
  | 'disruption'          // Ability stealing, cooldown increases
  | 'information'         // Reveal hidden info, predict outcomes
  
  // Persistent state effects
  | 'aura_field'          // Area effects that persist
  | 'transformation'      // Change game rules temporarily
  | 'ritual'              // Multi-turn setup abilities
  
  // Meta-game effects
  | 'meta_game'           // Affect match settings, rules
  | 'psychological'       // Mind games, bluffs, misdirection;

/**
 * Enhanced ability effect with complex logic support
 */
export interface EnhancedAbilityEffect {
  id: string;
  category: EffectCategory;
  
  // Basic effect properties
  name: string;
  description: string;
  
  // Execution properties
  executionType: 'immediate' | 'delayed' | 'persistent' | 'triggered' | 'channeled';
  priority: number; // Higher numbers execute first
  
  // Targeting system
  targeting: {
    type: 'self' | 'opponent' | 'both' | 'game_state' | 'conditional';
    conditions?: TargetingCondition[];
    maxTargets?: number;
    allowSelfTarget?: boolean;
  };
  
  // Resource requirements
  costs: {
    aura?: number;
    health?: number; // For risky abilities
    turnActions?: number; // Abilities that cost turn actions
    stackedEffects?: string[]; // Consume other effects
  };
  
  // Activation conditions
  activationConditions: {
    timing: AbilityTiming[];
    requirements: ActivationRequirement[];
    playerState?: PlayerStateRequirement[];
    gameState?: GameStateRequirement[];
  };
  
  // Core effect logic
  effects: EffectAction[];
  
  // Persistence properties
  persistence: {
    duration?: number; // Seconds, or -1 for permanent
    turnsRemaining?: number; // Turn-based duration
    triggerLimit?: number; // Max number of triggers
    stackable?: boolean; // Can multiple instances exist
    overrides?: string[]; // Effect IDs this overrides
  };
  
  // Side effects and consequences
  sideEffects?: SideEffect[];
  onExpire?: EffectAction[];
  onInterrupt?: EffectAction[];
  
  // Animation and feedback
  animations?: {
    activation: string;
    ongoing?: string;
    completion: string;
  };
  
  // Metadata for complex abilities
  metadata?: {
    isHidden?: boolean;
    isStealable?: boolean;
    canBeCountered?: boolean;
    tags?: string[]; // For categorization and interaction
    customData?: { [key: string]: any };
  };
}

/**
 * Timing constraints for ability usage
 */
export interface AbilityTiming {
  phase: 'turn_start' | 'before_roll' | 'after_roll' | 'before_bank' | 'after_bank' | 'turn_end' | 'any_time' | 'opponent_turn' | 'game_start' | 'game_end';
  playerTurn?: 'own' | 'opponent' | 'any';
  roundConstraints?: {
    minRound?: number;
    maxRound?: number;
    specificRounds?: number[];
  };
}

/**
 * Conditions for ability activation
 */
export interface ActivationRequirement {
  type: 'dice_value' | 'score_threshold' | 'aura_amount' | 'effect_present' | 'turn_count' | 'probability' | 'custom';
  condition: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'range' | 'custom_function';
  value: any;
  target?: 'self' | 'opponent' | 'both';
  description: string;
}

/**
 * Player state requirements for activation
 */
export interface PlayerStateRequirement {
  type: 'health' | 'score' | 'aura' | 'effects_active' | 'abilities_used' | 'streak' | 'turn_score';
  comparison: 'equals' | 'greater_than' | 'less_than' | 'range' | 'has' | 'not_has';
  value: any;
  target: 'self' | 'opponent';
}

/**
 * Game state requirements for activation
 */
export interface GameStateRequirement {
  type: 'round_number' | 'total_turns' | 'game_duration' | 'active_effects' | 'dice_history' | 'weather' | 'special_conditions';
  comparison: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: any;
}

/**
 * Targeting conditions for complex target selection
 */
export interface TargetingCondition {
  type: 'score_based' | 'aura_based' | 'effect_based' | 'random' | 'player_choice' | 'highest' | 'lowest';
  criteria: any;
  fallback?: 'self' | 'opponent' | 'random' | 'none';
}

/**
 * Core effect actions that can be performed
 */
export interface EffectAction {
  actionType: EffectActionType;
  parameters: { [key: string]: any };
  conditions?: ActionCondition[];
  probability?: number; // 0-1 chance of this action occurring
  delay?: number; // Seconds to delay this action
  repeatCount?: number; // How many times to repeat
  failureHandling?: 'ignore' | 'abort' | 'retry' | 'alternative';
}

/**
 * All possible effect action types
 */
export type EffectActionType = 
  // Direct game manipulation
  | 'modify_dice' | 'force_dice_value' | 'add_bonus_dice' | 'reroll_dice'
  | 'modify_score' | 'transfer_score' | 'multiply_score' | 'reset_score'
  | 'modify_aura' | 'transfer_aura' | 'block_aura_gain' | 'force_aura_cost'
  
  // Turn and flow control
  | 'skip_turn' | 'extra_turn' | 'force_action' | 'prevent_action'
  | 'modify_turn_limit' | 'change_turn_order' | 'split_turn'
  
  // Ability and effect manipulation
  | 'steal_ability' | 'copy_ability' | 'disable_ability' | 'modify_cooldown'
  | 'add_effect' | 'remove_effect' | 'modify_effect_duration' | 'stack_effect'
  
  // Information and psychological
  | 'reveal_hand' | 'reveal_next_dice' | 'hide_information' | 'fake_information'
  | 'force_choice' | 'limit_choices' | 'suggest_action' | 'misdirect'
  
  // Game rule modification
  | 'change_game_rules' | 'modify_victory_condition' | 'add_special_rule'
  | 'change_dice_mechanics' | 'modify_scoring_rules' | 'alter_physics'
  
  // Resource and economy
  | 'generate_resource' | 'consume_resource' | 'trade_resources' | 'gamble_resources'
  | 'create_temporary_resource' | 'modify_resource_generation' | 'resource_conversion'
  
  // Advanced mechanics
  | 'create_clone' | 'swap_positions' | 'time_manipulation' | 'parallel_universe'
  | 'quantum_effect' | 'reality_alteration' | 'chaos_injection' | 'order_enforcement';

/**
 * Conditions for individual actions within effects
 */
export interface ActionCondition {
  type: 'dice_result' | 'score_state' | 'aura_state' | 'effect_active' | 'random_chance' | 'player_choice' | 'turn_number';
  comparison: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'probability';
  value: any;
  target?: 'self' | 'opponent' | 'game';
}

/**
 * Side effects that can occur during ability execution
 */
export interface SideEffect {
  type: 'recoil_damage' | 'aura_burn' | 'cooldown_increase' | 'random_effect' | 'chain_reaction' | 'backlash';
  severity: 'minor' | 'moderate' | 'major' | 'catastrophic';
  probability: number; // 0-1
  effects: EffectAction[];
  canBeBlocked?: boolean;
  description: string;
}

// ==================== MATCH STATE ENHANCEMENT ====================

/**
 * Game state modifier for temporary changes to game mechanics
 */
export interface GameStateModifier {
  id: string;
  type: 'dice_mechanics' | 'scoring_rules' | 'turn_structure' | 'resource_generation';
  modification: { [key: string]: any };
  sourceAbilityId: string;
  sourcePlayerId: string;
  endsAt?: Timestamp;
  priority: number;
}

/**
 * Enhanced match state to support complex abilities
 */
export interface EnhancedMatchState {
  // Active effects on players
  activeEffects: {
    [playerId: string]: ActiveEffect[];
  };
  
  // Global game state modifications
  gameStateModifiers: GameStateModifier[];
  
  // Ability usage tracking
  abilityUsage: {
    [playerId: string]: {
      [abilityId: string]: AbilityUsageTracker;
    };
  };
  
  // Resource pools
  resourcePools: {
    [playerId: string]: PlayerResourcePool;
  };
  
  // Temporary game rule changes
  ruleOverrides: GameRuleOverride[];
  
  // Effect interaction history for complex combos
  effectHistory: EffectHistoryEntry[];
  
  // Pending delayed effects
  delayedEffects: DelayedEffect[];
  
  // Environmental conditions
  environmentalConditions: EnvironmentalCondition[];
}

/**
 * Active effect on a player or game state
 */
export interface ActiveEffect {
  id: string;
  sourceAbilityId: string;
  sourcePlayerId: string;
  targetPlayerId?: string;
  
  effect: EnhancedAbilityEffect;
  startTime: Timestamp;
  
  // Dynamic state
  remainingDuration?: number;
  remainingTriggers?: number;
  stackCount: number;
  
  // Effect state data
  persistentData: { [key: string]: any };
  
  // Interaction flags
  isHidden: boolean;
  canBeDispelled: boolean;
  suppressesOtherEffects: string[]; // Effect IDs that are suppressed
}

/**
 * Track ability usage for complex interactions
 */
export interface AbilityUsageTracker {
  timesUsed: number;
  lastUsedAt?: Timestamp;
  cooldownEndsAt?: Timestamp;
  successfulActivations: number;
  resourcesSpent: { [resource: string]: number };
  targetsAffected: string[];
}

/**
 * Player resource pool for abilities
 */
export interface PlayerResourcePool {
  aura: number;
  health: number; // For abilities with health costs
  momentum: number; // Builds up over turns for powerful abilities
  focus: number; // Resource for precision abilities
  chaos: number; // Resource for random/chaotic abilities
  
  // Temporary resources
  temporaryResources: { [name: string]: { amount: number; expiresAt: Timestamp } };
  
  // Resource generation modifiers
  generationModifiers: { [resource: string]: number };
}

/**
 * Game rule override for temporary rule changes
 */
export interface GameRuleOverride {
  id: string;
  sourceAbilityId: string;
  sourcePlayerId: string;
  
  ruleType: 'dice_mechanics' | 'scoring' | 'turn_structure' | 'victory_conditions' | 'resource_generation' | 'ability_timing';
  modification: { [key: string]: any };
  
  priority: number;
  endsAt?: Timestamp;
  
  affectedPlayers: 'all' | 'self' | 'opponents' | string[]; // specific player IDs
}

/**
 * Effect history for tracking complex interactions
 */
export interface EffectHistoryEntry {
  timestamp: Timestamp;
  effectId: string;
  abilityId: string;
  playerId: string;
  action: 'activated' | 'triggered' | 'expired' | 'interrupted' | 'modified';
  details: { [key: string]: any };
}

/**
 * Delayed effect for time-based abilities
 */
export interface DelayedEffect {
  id: string;
  sourceAbilityId: string;
  sourcePlayerId: string;
  
  triggerAt: Timestamp;
  triggerCondition?: ActivationRequirement;
  
  effect: EnhancedAbilityEffect;
  targetData: { [key: string]: any };
}

/**
 * Environmental conditions that affect the match
 */
export interface EnvironmentalCondition {
  id: string;
  name: string;
  description: string;
  
  sourceAbilityId?: string; // If created by an ability
  duration?: number;
  
  effects: {
    onDiceRoll?: EffectAction[];
    onScoreBank?: EffectAction[];
    onAbilityUse?: EffectAction[];
    onTurnStart?: EffectAction[];
    onTurnEnd?: EffectAction[];
  };
  
  affectedPlayers: 'all' | string[];
}

// ==================== EXECUTION ENGINE TYPES ====================

/**
 * Ability execution context for the execution engine
 */
export interface AbilityExecutionContext {
  matchId: string;
  executingPlayerId: string;
  targetPlayerIds: string[];
  
  // Current match state
  matchState: EnhancedMatchState;
  gameData: any; // Current game data
  
  // Execution metadata
  executionId: string;
  timestamp: Timestamp;
  
  // Ability being executed
  ability: EnhancedAbilityEffect;
  inputParameters: { [key: string]: any };
  
  // Execution options
  options: {
    dryRun?: boolean; // Test execution without applying
    validateOnly?: boolean; // Only validate, don't execute
    ignoreValidation?: boolean; // Skip validation (for system abilities)
    logExecution?: boolean; // Log detailed execution steps
  };
}

/**
 * Result of ability execution
 */
export interface AbilityExecutionResult {
  success: boolean;
  errorMessage?: string;
  
  // Changes made to match state
  stateChanges: StateChange[];
  
  // Effects that were applied
  appliedEffects: ActiveEffect[];
  
  // Resource costs paid
  resourceCosts: { [resource: string]: number };
  
  // Side effects that occurred
  sideEffects: SideEffect[];
  
  // UI feedback data
  feedback: {
    animations: string[];
    sounds: string[];
    messages: string[];
    visualEffects: any[];
  };
  
  // Execution metadata
  executionTime: number; // milliseconds
  stepsExecuted: number;
  validationsPassed: number;
}

/**
 * Represents a change to match state
 */
export interface StateChange {
  type: 'player_score' | 'player_aura' | 'active_effect' | 'game_rule' | 'resource_pool' | 'delayed_effect' | 'environmental_condition';
  target: string; // player ID or 'game'
  property: string;
  oldValue: any;
  newValue: any;
  source: string; // ability ID that caused the change
}

export { type EnhancedAbilityEffect as AbilityEffect };