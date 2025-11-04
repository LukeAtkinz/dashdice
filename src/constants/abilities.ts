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
    iconUrl: `/abilities/${category}/${id}.webp`,
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
  iconUrl: '/Abilities/Base Images/hand holding screwdriver.png',
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
  iconUrl: '/Abilities/Base Images/hand holding pan.png',
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

// Add to collections
// addAbilityToCollections(LUCK_TURNER); // Will be called after collections are defined

// ==================== ABILITY COLLECTIONS ====================

// Populated with implemented abilities
export const ALL_ABILITIES: DashDiceAbility[] = [LUCK_TURNER, PAN_SLAP];

export const ABILITIES_BY_CATEGORY: { [key in AbilityCategory]: DashDiceAbility[] } = {
  [AbilityCategory.TACTICAL]: [LUCK_TURNER],
  [AbilityCategory.ATTACK]: [],
  [AbilityCategory.DEFENSE]: [PAN_SLAP],
  [AbilityCategory.UTILITY]: [],
  [AbilityCategory.GAMECHANGER]: []
};

export const ABILITIES_BY_RARITY: { [key in AbilityRarity]: DashDiceAbility[] } = {
  [AbilityRarity.COMMON]: [],
  [AbilityRarity.RARE]: [],
  [AbilityRarity.EPIC]: [LUCK_TURNER, PAN_SLAP],
  [AbilityRarity.LEGENDARY]: [],
  [AbilityRarity.MYTHIC]: []
};

// Starter abilities for new players - add basic abilities as we implement them
export const STARTER_ABILITIES: DashDiceAbility[] = [LUCK_TURNER, PAN_SLAP];

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