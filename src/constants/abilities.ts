import { Timestamp } from 'firebase/firestore';
import { 
  DashDiceAbility, 
  AbilityCategory, 
  AbilityType, 
  AbilityRarity,
  TimingConstraint,
  EffectType
} from '../types/abilityBlueprint';

/**
 * Ability Constants
 * 
 * Code-based ability definitions for type safety and immediate access.
 * These serve as the canonical ability definitions that sync to Firebase.
 */

// ==================== HELPER FUNCTIONS ====================

function createBaseAbility(
  id: string,
  name: string,
  category: AbilityCategory,
  rarity: AbilityRarity,
  auraCost: number,
  starCost: number
): Partial<DashDiceAbility> {
  return {
    id,
    name,
    version: 1,
    category,
    type: AbilityType.ACTIVE,
    rarity,
    auraCost,
    starCost,
    cooldown: 0,
    iconUrl: `/Abilities/${category}/${id}.webp`,
    targeting: {
      type: 'opponent',
      allowSelfTarget: false,
      maxTargets: 1
    },
    timing: {
      usableWhen: [TimingConstraint.MY_TURN_START, TimingConstraint.MY_TURN_END]
    },
    effects: [],
    unlockRequirements: {
      level: 1
    },
    balancing: {
      powerLevel: 50,
      winRateImpact: 0,
      usageFrequency: 'medium',
      lastBalanceUpdate: Timestamp.now()
    },
    isActive: true,
    isHidden: false,
    isDevelopment: false,
    tags: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: 'system'
  };
}

// ==================== ABILITIES SECTION ====================
// 
// Abilities will be implemented one by one and added here for testing
// Each ability will be thoroughly tested before adding the next one
//
// TODO: Implement abilities in this order:
// 1. Start with simple utility abilities (Reroll)
// 2. Add basic attack abilities (Siphon)  
// 3. Add defense abilities (Shield)
// 4. Add tactical abilities (Scout)
// 5. Add complex gamechanger abilities last

// ==================== TACTICAL ABILITIES ====================

export const LUCK_TURNER: DashDiceAbility = {
  id: 'luck_turner',
  name: 'Luck Turner',
  version: 1,
  category: AbilityCategory.TACTICAL,
  type: AbilityType.ACTIVE,
  rarity: AbilityRarity.EPIC,
  description: 'Risk–Reward Probability Manipulation: Take control of chance itself.',
  longDescription: 'Luck Turner lets players take control of chance itself, mechanically adjusting the odds of their dice rolls for a full turn. By "tuning" the dice, a player can reduce the risk of failure or amplify the potential for high-impact outcomes. This ability embodies skill, timing, and strategic risk management — a perfect tool for turning momentum in critical moments.',
  flavorText: '"A twist here, a tweak there — sometimes fortune just needs a little guidance."',
  iconUrl: '/Abilities/Formatted/hand holding screwdriver.webp',
  cooldown: 2, // 2 turns cooldown
  auraCost: 3, // Base cost, can spend 6 for enhanced effect
  starCost: 4, // Power Rating: 4
  
  targeting: {
    type: 'self',
    allowSelfTarget: true,
    maxTargets: 1
  },
  
  timing: {
    usableWhen: [TimingConstraint.MY_TURN_START, TimingConstraint.BEFORE_ROLL]
  },
  
  effects: [
    {
      id: 'luck_turner_basic',
      name: 'Basic Luck Manipulation (3 Aura)',
      description: '50% less chance to roll a 1 - Reduces the likelihood of a bust on risky turns',
      type: EffectType.MODIFY_DICE_PROBABILITY,
      magnitude: 'reduce_bust_50', 
      target: {
        type: 'self',
        property: 'bustProbability'
      },
      duration: 1 // Lasts for one turn
    },
    {
      id: 'luck_turner_advanced',
      name: 'Advanced Luck Manipulation (6 Aura)',
      description: '50% less chance to roll a 1 AND 50% increased chance of rolling a double - Higher risk, higher reward',
      type: EffectType.MODIFY_DICE_PROBABILITY,
      magnitude: 'luck_advanced_combo',
      target: {
        type: 'self',
        property: 'diceRollProbability'
      },
      duration: 1 // Lasts for one turn
    }
  ],
  
  conditions: [
    {
      type: 'variable_aura_cost',
      description: 'Costs 3 AURA for basic effect, 6 AURA for advanced effect',
      checkFunction: 'checkVariableAuraCost',
      parameters: {
        basicCost: 3,
        advancedCost: 6
      }
    }
  ],
  
  unlockRequirements: {
    level: 1
  },
  
  // Required balancing data
  balancing: {
    powerLevel: 75, // High power level (1-100 scale)
    winRateImpact: 0.15, // 15% estimated win rate improvement
    usageFrequency: 'medium', // Expected medium usage
    lastBalanceUpdate: new Date() as any
  },
  
  // Metadata
  isActive: true,
  isHidden: false,
  isDevelopment: false,
  tags: ['probability', 'tactical', 'risk-management', 'turn-modifier'],
  
  // Timestamps
  createdAt: new Date() as any,
  updatedAt: new Date() as any,
  createdBy: 'system'
};

// ==================== PAN SLAP ====================

export const PAN_SLAP: DashDiceAbility = {
  id: 'pan_slap',
  name: 'Pan Slap',
  version: 1,
  category: AbilityCategory.DEFENSE,
  type: AbilityType.ACTIVE, // Changed from INSTANT to ACTIVE
  rarity: AbilityRarity.EPIC,
  description: 'Turn Control / Instant Stop: Deliver a swift and decisive intervention — instantly ending your opponent\'s turn.',
  longDescription: 'Pan Slap delivers a swift and decisive intervention — instantly ending your opponent\'s turn and auto-banking their current turn score. With the iconic frying pan in hand, the player asserts control over the flow of the match, stopping momentum, thwarting combos, and creating space to strike back. It\'s high-impact, high-risk, and high-fun: timing is everything, and a misplay could mean spending 6 aura for minimal disruption if the opponent\'s turn was already weak.',
  flavorText: '"One swing to stop them in their tracks. The pan is heavy, the timing heavier, but victory waits for the bold."',
  iconUrl: '/Abilities/Formatted/hand holding pan.webp',
  cooldown: 2, // 2 turns before it can be used again
  auraCost: 6, // High cost reflects its powerful turn-ending capability
  starCost: 5, // Power Rating: 5
  
  targeting: {
    type: 'opponent',
    allowSelfTarget: false,
    maxTargets: 1
  },
  
  timing: {
    usableWhen: [TimingConstraint.OPPONENT_TURN_END]
  },
  
  effects: [
    {
      id: 'pan_slap_end_turn',
      name: 'Instant Turn End',
      description: 'Immediately ends the opponent\'s turn and auto-banks their current turn score',
      type: EffectType.SKIP_TURN, // Changed to available effect type
      magnitude: 'instant_with_banking',
      target: {
        type: 'opponent',
        property: 'turnState'
      },
      duration: 0 // Instant effect
    },
    {
      id: 'pan_slap_momentum_break',
      name: 'Momentum Disruption',
      description: 'Breaks combo chains and disrupts opponent strategy',
      type: EffectType.FREEZE_OPPONENT, // Changed to available effect type
      magnitude: 'full_disruption',
      target: {
        type: 'opponent',
        property: 'momentum'
      },
      duration: 0 // Instant effect
    }
  ],
  
  conditions: [
    {
      type: 'timing_restriction',
      description: 'Can only be used during opponent\'s turn',
      checkFunction: 'checkOpponentTurnOnly',
      parameters: {
        allowedPhases: ['opponent_turn_active']
      }
    },
    {
      type: 'cooldown_restriction',
      description: 'Cannot be used for 2 turns after activation to prevent abuse',
      checkFunction: 'checkCooldownRestriction',
      parameters: {
        cooldownTurns: 2
      }
    }
  ],
  
  unlockRequirements: {
    level: 1
  },
  
  // Required balancing data
  balancing: {
    powerLevel: 85, // Very high power level due to turn control capability
    winRateImpact: 0.20, // 20% estimated win rate improvement when used strategically
    usageFrequency: 'medium', // Changed to valid enum value
    lastBalanceUpdate: new Date() as any
  },
  
  // Metadata
  isActive: true,
  isHidden: false,
  isDevelopment: false,
  tags: ['defensive', 'turn-control', 'momentum-breaker', 'instant-stop', 'high-cost'],
  
  // Timestamps
  createdAt: new Date() as any,
  updatedAt: new Date() as any,
  createdBy: 'system'
};

// ==================== SCORE SAW ====================

export const SCORE_SAW: DashDiceAbility = {
  id: 'score_saw',
  name: 'Score Saw',
  version: 1,
  category: AbilityCategory.ATTACK,
  type: AbilityType.ACTIVE,
  rarity: AbilityRarity.EPIC,
  description: 'Risk–Reward Score Sabotage: Channel AURA into devastating strikes against opponent scores. The more you invest, the deeper you cut.',
  longDescription: 'Score Saw channels a player\'s aura into a sharp, decisive strike against an opponent\'s current turn score — and with higher investment, their banked points. The more aura spent, the more destructive the strike: from minor disruption to a devastating reset. Timing and strategy are critical: use it too early, and your opponent may recover; spend too much aura, and your own resources are at risk.',
  flavorText: '"A well-timed strike can undo an empire built in a single turn. Precision is everything — slice carefully, or bleed yourself dry."',
  iconUrl: '/Abilities/Formatted/hand holding saw.webp',
  cooldown: 0, // No cooldown, limited by AURA cost
  auraCost: 2, // Minimum cost, scales up to 10
  starCost: 4, // Power Rating: 4
  
  targeting: {
    type: 'opponent',
    allowSelfTarget: false,
    maxTargets: 1
  },
  
  timing: {
    usableWhen: [TimingConstraint.OPPONENT_TURN_END]
  },
  
  effects: [
    {
      id: 'score_saw_light_cut',
      name: 'Light Cut (2 Aura)',
      description: 'Reduce opponent\'s current turn score by 25% - Low risk disruption',
      type: EffectType.MODIFY_SCORE,
      magnitude: 'reduce_turn_score_25',
      target: {
        type: 'opponent',
        property: 'currentTurnScore'
      },
      duration: 0 // Instant effect
    },
    {
      id: 'score_saw_deep_cut',
      name: 'Deep Cut (4 Aura)',
      description: 'Reduce opponent\'s current turn score by 50% - Moderate risk disruption',
      type: EffectType.MODIFY_SCORE,
      magnitude: 'reduce_turn_score_50',
      target: {
        type: 'opponent',
        property: 'currentTurnScore'
      },
      duration: 0 // Instant effect
    },
    {
      id: 'score_saw_reset_cut',
      name: 'Reset Cut (6 Aura)',
      description: 'Reset opponent\'s current turn score to 0 - High risk turn destruction',
      type: EffectType.MODIFY_SCORE,
      magnitude: 'reset_turn_score',
      target: {
        type: 'opponent',
        property: 'currentTurnScore'
      },
      duration: 0 // Instant effect
    },
    {
      id: 'score_saw_bank_devastation',
      name: 'Bank Devastation (10 Aura)',
      description: 'Remove 50% of opponent\'s banked score - Very high risk game changer',
      type: EffectType.MODIFY_SCORE,
      magnitude: 'reduce_banked_score_50',
      target: {
        type: 'opponent',
        property: 'bankedScore'
      },
      duration: 0 // Instant effect
    }
  ],
  
  conditions: [
    {
      type: 'variable_aura_cost',
      description: 'Costs 2/4/6/10 AURA for different effect levels',
      checkFunction: 'checkScoreSawAuraCost',
      parameters: {
        lightCut: 2,
        deepCut: 4,
        resetCut: 6,
        bankDevastiation: 10
      }
    },
    {
      type: 'opponent_turn_only',
      description: 'Can only be used during opponent\'s turn',
      checkFunction: 'checkOpponentTurnOnly',
      parameters: {
        allowedPhases: ['opponent_turn_active']
      }
    },
    {
      type: 'no_stacking',
      description: 'Cannot stack with other score-altering abilities on the same turn',
      checkFunction: 'checkNoScoreStackingThisTurn',
      parameters: {
        conflictingTypes: ['score_modification', 'turn_alteration']
      }
    },
    {
      type: 'backfire_risk',
      description: 'Rolling a double after activation triggers backfire',
      checkFunction: 'checkScoreSawBackfire',
      parameters: {
        backfireChance: 0.15,
        backfireEffect: 'opponent_recovers_half_and_player_loses_10_percent'
      }
    }
  ],
  
  unlockRequirements: {
    level: 1
  },
  
  // Required balancing data
  balancing: {
    powerLevel: 90, // Very high power level due to scaling devastation
    winRateImpact: 0.25, // 25% estimated win rate improvement when used strategically
    usageFrequency: 'medium', // High cost limits overuse
    lastBalanceUpdate: new Date() as any
  },
  
  // Metadata
  isActive: true,
  isHidden: false,
  isDevelopment: false,
  tags: ['tactical', 'score-sabotage', 'scaling-cost', 'high-risk', 'comeback-mechanic'],
  
  // Timestamps
  createdAt: new Date() as any,
  updatedAt: new Date() as any,
  createdBy: 'system'
};

// ==================== SCORE SIPHON ====================

export const SCORE_SIPHON: DashDiceAbility = {
  id: 'score_siphon',
  name: 'Score Siphon',
  version: 1,
  category: AbilityCategory.ATTACK,
  type: AbilityType.ACTIVE,
  rarity: AbilityRarity.EPIC,
  description: 'Risk–Reward Turn Steal: Siphon points from opponent\'s current turn — but timing is critical. Strike during their first roll.',
  longDescription: 'Score Siphon lets a player siphon points directly from their opponent\'s current turn score — but timing is critical. It must be played during the opponent\'s first roll or before their second throw. If the opponent busts or avoids rolling, the ability fails and is lost. This makes it a high-risk, high-reward tool that rewards careful observation and predictive skill.',
  flavorText: '"Strike while they hesitate. Seize what could have been theirs, before it slips away."',
  iconUrl: '/Abilities/Formatted/hand holding sprayer.webp',
  cooldown: 0, // No cooldown, limited by AURA cost and timing
  auraCost: 2, // Minimum cost, scales up to 6
  starCost: 4, // Power Rating: 4
  
  targeting: {
    type: 'opponent',
    allowSelfTarget: false,
    maxTargets: 1
  },
  
  timing: {
    usableWhen: [TimingConstraint.AFTER_ROLL, TimingConstraint.OPPONENT_TURN_START],
    triggerEvents: ['opponent_first_roll_complete']
  },
  
  effects: [
    {
      id: 'siphon_moderate',
      name: 'Moderate Siphon (2 Aura)',
      description: 'Steal 25% of opponent\'s current turn score - Moderate risk: low reward if opponent busts',
      type: EffectType.STEAL_SCORE,
      magnitude: 'steal_turn_score_25',
      target: {
        type: 'opponent',
        property: 'currentTurnScore'
      },
      duration: 0, // Instant effect
      probability: 1.0 // Always succeeds if conditions met
    },
    {
      id: 'siphon_medium',
      name: 'Medium Siphon (4 Aura)',
      description: 'Steal 50% of opponent\'s current turn score - Medium risk: larger impact if opponent survives',
      type: EffectType.STEAL_SCORE,
      magnitude: 'steal_turn_score_50',
      target: {
        type: 'opponent',
        property: 'currentTurnScore'
      },
      duration: 0,
      probability: 1.0
    },
    {
      id: 'siphon_full',
      name: 'Full Siphon (6 Aura)',
      description: 'Steal 100% of opponent\'s current turn score - High risk: full turn steal, but lost if opponent busts',
      type: EffectType.STEAL_SCORE,
      magnitude: 'steal_turn_score_100',
      target: {
        type: 'opponent',
        property: 'currentTurnScore'
      },
      duration: 0,
      probability: 1.0
    }
  ],
  
  conditions: [
    {
      type: 'variable_aura_cost',
      description: 'Costs 2/4/6 AURA for different steal percentages',
      checkFunction: 'checkScoreSiphonAuraCost',
      parameters: {
        moderateSiphon: 2,
        mediumSiphon: 4,
        fullSiphon: 6
      }
    },
    {
      type: 'timing_restriction',
      description: 'Can only be played after opponent\'s first roll but before second throw',
      checkFunction: 'checkSiphonTiming',
      parameters: {
        allowedPhases: ['opponent_after_first_roll', 'opponent_before_second_roll'],
        requiredState: 'opponent_has_rolled_once'
      }
    },
    {
      type: 'failure_on_bust',
      description: 'Fails and ability is lost if opponent busts',
      checkFunction: 'checkOpponentBustStatus',
      parameters: {
        onBust: 'ability_lost',
        refundAura: false
      }
    },
    {
      type: 'no_stacking',
      description: 'Cannot stack with other Tactical buffs on same opponent turn',
      checkFunction: 'checkNoTacticalStackingSameTurn',
      parameters: {
        conflictingCategories: ['tactical'],
        scope: 'opponent_current_turn'
      }
    }
  ],
  
  unlockRequirements: {
    level: 1 // Available from start
  },
  
  // Synergies and counterplay
  interactions: {
    synergiesWith: [
      'pulse_shield', // Protects your turn points if countered
      'echo_veil',    // Hides activation cue to reduce counterplay
      'adrenal_surge' // Adds bonus to your next turn after successful steal
    ],
    counters: [
      'dicebreaker',  // Reduces opponent turn score potential
      'null_pulse',   // Cancels tactical buffs for the turn
      'mirror_veil'   // Reflects portion of stolen points back
    ],
    counteredBy: [
      'opponent_bust', // Automatic failure if opponent busts
      'early_bank'     // Opponent banks before siphon can activate
    ],
    blockedBy: []
  },
  
  // Required balancing data
  balancing: {
    powerLevel: 85, // High power level due to direct score manipulation
    winRateImpact: 0.22, // 22% estimated win rate improvement with good timing
    usageFrequency: 'medium', // Timing restriction prevents overuse
    lastBalanceUpdate: new Date() as any
  },
  
  // Metadata
  isActive: true,
  isHidden: false,
  isDevelopment: false,
  tags: ['tactical', 'turn-steal', 'timing-based', 'risk-reward', 'prediction-skill', 'momentum-shift'],
  
  // Timestamps
  createdAt: new Date() as any,
  updatedAt: new Date() as any,
  createdBy: 'system'
};

// ==================== HARD HAT ====================

export const HARD_HAT: DashDiceAbility = {
  id: 'hard_hat',
  name: 'Hard Hat',
  version: 1,
  category: AbilityCategory.DEFENSE,
  type: AbilityType.REACTIVE,
  rarity: AbilityRarity.EPIC,
  description: 'Tactical Block: Fortify yourself against opponent\'s next ability. Blocks their effect entirely but halves your aura gain while active.',
  longDescription: 'Hard Hat puts your opponent on notice. By activating it, you fortify yourself against their next ability, blocking its effect entirely until they trigger an ability of their own. It\'s a high-stakes strategic play: you sacrifice part of your aura gain in exchange for control, timing, and protection. This ability rewards foresight, anticipation, and risk–reward decision-making, making it a critical tool for tactical mastery.',
  flavorText: '"Fortify your mind, brace your hand — nothing gets through this time."',
  iconUrl: '/Abilities/Formatted/hand holding helmet.webp',
  cooldown: 0,
  auraCost: 4,
  starCost: 4, // Power Rating: 4
  
  targeting: {
    type: 'self',
    allowSelfTarget: true,
    maxTargets: 1
  },
  
  timing: {
    usableWhen: [TimingConstraint.OPPONENT_TURN_START, TimingConstraint.OPPONENT_TURN_END],
    triggerEvents: ['opponent_ability_activation']
  },
  
  effects: [
    {
      id: 'hard_hat_block',
      name: 'Ability Block',
      description: 'Blocks opponent\'s next ability completely until they activate one',
      type: EffectType.IMMUNITY,
      magnitude: 'block_next_ability',
      target: {
        type: 'self',
        property: 'abilityResistance'
      },
      duration: -1, // Persists until opponent uses ability
      probability: 1.0
    },
    {
      id: 'hard_hat_penalty',
      name: 'Aura Gain Reduction',
      description: 'Player gains 50% less aura while Hard Hat is active',
      type: EffectType.MODIFY_SCORE, // Using as modifier for aura gain
      magnitude: 'reduce_aura_gain_50',
      target: {
        type: 'self',
        property: 'auraGeneration'
      },
      duration: -1, // Persists until ability blocks something
      probability: 1.0
    }
  ],
  
  conditions: [
    {
      type: 'opponent_turn_only',
      description: 'Can only be played during opponent\'s turn',
      checkFunction: 'checkOpponentTurnOnly',
      parameters: {
        allowedPhases: ['opponent_turn_active']
      }
    },
    {
      type: 'no_stacking',
      description: 'Cannot stack with other Defensive or Block abilities',
      checkFunction: 'checkNoDefensiveStacking',
      parameters: {
        conflictingCategories: ['defense'],
        conflictingTypes: ['block', 'immunity']
      }
    },
    {
      type: 'persistent_until_triggered',
      description: 'Remains active until opponent triggers an ability',
      checkFunction: 'checkHardHatPersistence',
      parameters: {
        endCondition: 'opponent_ability_used',
        autoRemove: true
      }
    }
  ],
  
  // Persistence configuration
  persistence: {
    duration: -1, // Indefinite until triggered
    stackable: false,
    dispellable: true // Can be removed by certain abilities
  },
  
  unlockRequirements: {
    level: 1 // Available from start
  },
  
  // Synergies and counterplay
  interactions: {
    synergiesWith: [
      'vital_rush',  // Block opponent counter while making big play
      'safe_dose',   // Protect the points you save
      'anticipate'   // Predict when opponent will use ability
    ],
    counters: [
      'opponent_delay', // Opponent can delay ability use to extend penalty
      'aura_pressure'   // Forces difficult choice between blocking and gaining aura
    ],
    counteredBy: [
      'aura_burst',   // Bypasses halved aura penalty temporarily
      'null_pulse',   // Cancels block effects for one turn
      'dicebreaker'   // Reduces effectiveness of abilities under Hard Hat
    ],
    blockedBy: []
  },
  
  // Required balancing data
  balancing: {
    powerLevel: 80, // High defensive power but significant drawback
    winRateImpact: 0.18, // 18% win rate improvement when timed correctly
    usageFrequency: 'medium', // Aura penalty prevents constant use
    lastBalanceUpdate: new Date() as any
  },
  
  // Metadata
  isActive: true,
  isHidden: false,
  isDevelopment: false,
  tags: ['defense', 'tactical-block', 'ability-denial', 'risk-reward', 'anticipation', 'psychological'],
  
  // Timestamps
  createdAt: new Date() as any,
  updatedAt: new Date() as any,
  createdBy: 'system'
};

// Add to collections
// addAbilityToCollections(LUCK_TURNER); // Will be called after collections are defined

// ==================== ABILITY COLLECTIONS ====================

// Populated with implemented abilities
export const ALL_ABILITIES: DashDiceAbility[] = [LUCK_TURNER, PAN_SLAP, SCORE_SAW, SCORE_SIPHON, HARD_HAT];

export const ABILITIES_BY_CATEGORY: { [key in AbilityCategory]: DashDiceAbility[] } = {
  [AbilityCategory.TACTICAL]: [LUCK_TURNER],
  [AbilityCategory.ATTACK]: [SCORE_SAW, SCORE_SIPHON],
  [AbilityCategory.DEFENSE]: [PAN_SLAP, HARD_HAT],
  [AbilityCategory.UTILITY]: [],
  [AbilityCategory.GAMECHANGER]: []
};

export const ABILITIES_BY_RARITY: { [key in AbilityRarity]: DashDiceAbility[] } = {
  [AbilityRarity.COMMON]: [],
  [AbilityRarity.RARE]: [],
  [AbilityRarity.EPIC]: [LUCK_TURNER, PAN_SLAP, SCORE_SAW, SCORE_SIPHON, HARD_HAT],
  [AbilityRarity.LEGENDARY]: [],
  [AbilityRarity.MYTHIC]: []
};

// Starter abilities for new players - add basic abilities as we implement them
export const STARTER_ABILITIES: DashDiceAbility[] = [LUCK_TURNER, PAN_SLAP, SCORE_SAW, SCORE_SIPHON, HARD_HAT];

// ==================== ABILITY MAP ====================

export const ABILITY_MAP = ALL_ABILITIES.reduce((map, ability) => {
  map[ability.id] = ability;
  return map;
}, {} as { [id: string]: DashDiceAbility });

// ==================== UTILITY FUNCTIONS ====================

export function getAbilityById(id: string): DashDiceAbility | undefined {
  return ABILITY_MAP[id];
}

export function getAbilitiesByCategory(category: AbilityCategory): DashDiceAbility[] {
  return ABILITIES_BY_CATEGORY[category] || [];
}

export function getAbilitiesByRarity(rarity: AbilityRarity): DashDiceAbility[] {
  return ABILITIES_BY_RARITY[rarity] || [];
}

export function getAbilitiesByStarCost(starCost: number): DashDiceAbility[] {
  return ALL_ABILITIES.filter(ability => ability.starCost === starCost);
}

export function getAbilitiesByAuraCost(minCost: number, maxCost: number): DashDiceAbility[] {
  return ALL_ABILITIES.filter(ability => 
    ability.auraCost >= minCost && ability.auraCost <= maxCost
  );
}

export function getUnlockedAbilities(playerLevel: number): DashDiceAbility[] {
  return ALL_ABILITIES.filter(ability => 
    ability.unlockRequirements.level <= playerLevel
  );
}

/**
 * Helper function to add a new ability to all collections
 * Use this when implementing new abilities one by one
 */
export function addAbilityToCollections(ability: DashDiceAbility): void {
  // Add to main array
  ALL_ABILITIES.push(ability);
  
  // Add to category collection
  ABILITIES_BY_CATEGORY[ability.category].push(ability);
  
  // Add to rarity collection
  ABILITIES_BY_RARITY[ability.rarity].push(ability);
  
  // Add to ability map
  ABILITY_MAP[ability.id] = ability;
  
  console.log(`Added ability: ${ability.name} (${ability.id})`);
}

export default {
  ALL_ABILITIES,
  ABILITIES_BY_CATEGORY,
  ABILITIES_BY_RARITY,
  STARTER_ABILITIES,
  ABILITY_MAP,
  getAbilityById,
  getAbilitiesByCategory,
  getAbilitiesByRarity,
  getAbilitiesByStarCost,
  getAbilitiesByAuraCost,
  getUnlockedAbilities
};