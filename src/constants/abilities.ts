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

// Placeholder for abilities - will be populated as we implement and test each one

// ==================== ABILITY COLLECTIONS ====================

// Empty arrays - will be populated as we implement abilities one by one
export const ALL_ABILITIES: DashDiceAbility[] = [];

export const ABILITIES_BY_CATEGORY: { [key in AbilityCategory]: DashDiceAbility[] } = {
  [AbilityCategory.TACTICAL]: [],
  [AbilityCategory.ATTACK]: [],
  [AbilityCategory.DEFENSE]: [],
  [AbilityCategory.UTILITY]: [],
  [AbilityCategory.GAMECHANGER]: []
};

export const ABILITIES_BY_RARITY: { [key in AbilityRarity]: DashDiceAbility[] } = {
  [AbilityRarity.COMMON]: [],
  [AbilityRarity.RARE]: [],
  [AbilityRarity.EPIC]: [],
  [AbilityRarity.LEGENDARY]: [],
  [AbilityRarity.MYTHIC]: []
};

// Empty starter set - will add basic abilities as we implement them
export const STARTER_ABILITIES: DashDiceAbility[] = [];

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