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
  ...createBaseAbility('luck_turner', 'Luck Turner', AbilityCategory.TACTICAL, AbilityRarity.EPIC, 3, 4),
  description: 'Manipulate dice probability to reduce failure chance or increase doubles.',
  longDescription: 'Luck Turner lets you take control of chance itself, mechanically adjusting the odds of your dice rolls for a full turn. Spend 3 AURA to reduce bust chance by 50%, or 6 AURA to also increase double chance by 50%.',
  flavorText: 'Fortune favors the prepared mind that knows how to tune the odds.',
  iconUrl: '/abilities/tactical/hand_holding_screwdriver.webp',
  cooldown: 2, // 2 turns cooldown
  
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
      name: 'Basic Luck Manipulation',
      description: '50% less chance to roll a 1 (reduces bust risk)',
      type: EffectType.MODIFY_DICE_PROBABILITY,
      magnitude: 'luck_basic', // Custom magnitude for luck manipulation
      target: {
        type: 'self',
        property: 'diceRollProbability'
      },
      duration: 1 // Lasts for one turn
    },
    {
      id: 'luck_turner_advanced',
      name: 'Advanced Luck Manipulation',
      description: '50% less chance to roll a 1 AND 50% increased chance of doubles',
      type: EffectType.MODIFY_DICE_PROBABILITY,
      magnitude: 'luck_advanced', // Custom magnitude for advanced luck manipulation
      target: {
        type: 'self',
        property: 'diceRollProbability'
      },
      duration: 1, // Lasts for one turn
      conditions: [
        {
          type: 'aura_cost',
          comparison: 'greater_than',
          value: 5, // Requires 6 AURA total
          target: 'currentAura'
        }
      ]
    }
  ],
  
  // Special conditions for variable AURA cost
  conditions: [
    {
      type: 'variable_aura_cost',
      description: 'Costs 3 AURA for basic effect, 6 AURA for advanced effect',
      checkFunction: 'checkVariableAuraCost',
      parameters: {
        basicCost: 3,
        advancedCost: 6,
        basicEffect: 'luck_basic',
        advancedEffect: 'luck_advanced'
      }
    }
  ],
  
  persistence: {
    duration: 1, // One turn duration
    stackable: false, // Cannot stack multiple luck effects
    dispellable: true // Can be removed by dispel effects
  },
  
  // Custom interactions for probability manipulation
  interactions: {
    synergiesWith: ['focus', 'foresight'], // Works well with other dice control
    counters: [], // Doesn't directly counter abilities
    counteredBy: ['dispel', 'chaos'], // Dispel effects and chaos abilities counter it
    blockedBy: ['silence', 'lock'] // Silence or lock effects prevent use
  },
  
  tags: ['probability', 'tactical', 'risk-management', 'turn-modifier']
} as DashDiceAbility;

// Add to collections
// addAbilityToCollections(LUCK_TURNER); // Will be called after collections are defined

// ==================== ABILITY COLLECTIONS ====================

// Populated with implemented abilities
export const ALL_ABILITIES: DashDiceAbility[] = [LUCK_TURNER];

export const ABILITIES_BY_CATEGORY: { [key in AbilityCategory]: DashDiceAbility[] } = {
  [AbilityCategory.TACTICAL]: [LUCK_TURNER],
  [AbilityCategory.ATTACK]: [],
  [AbilityCategory.DEFENSE]: [],
  [AbilityCategory.UTILITY]: [],
  [AbilityCategory.GAMECHANGER]: []
};

export const ABILITIES_BY_RARITY: { [key in AbilityRarity]: DashDiceAbility[] } = {
  [AbilityRarity.COMMON]: [],
  [AbilityRarity.RARE]: [],
  [AbilityRarity.EPIC]: [LUCK_TURNER],
  [AbilityRarity.LEGENDARY]: [],
  [AbilityRarity.MYTHIC]: []
};

// Starter abilities for new players - add basic abilities as we implement them
export const STARTER_ABILITIES: DashDiceAbility[] = [LUCK_TURNER];

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