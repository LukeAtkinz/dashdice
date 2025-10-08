import { Ability } from '@/types/abilities';

/**
 * Predefined Abilities Collection
 * Currently featuring only Siphon for focused testing
 */

// ATTACK ABILITIES
export const ATTACK_ABILITIES: Ability[] = [
  {
    id: 'siphon',
    name: 'Siphon',
    description: 'Steal half of opponent\'s banked turn points',
    longDescription: 'Can only be played during opponent\'s turn. If they bank, you steal 50% of their turn points. If they bust, ability is consumed but has no effect.',
    rarity: 'rare',
    starCost: 3,
    category: 'attack',
    cooldown: 0,
    maxUses: 1,
    auraCost: 8,
    hidden: false,
    unlockLevel: 1,
    timing: 'opponent_turn',
    effects: [
      {
        type: 'steal_points',
        value: 50,
        target: 'opponent',
        condition: 'on_bank'
      }
    ],
    isActive: true
  }
];

// Legacy arrays (empty for focused testing)
export const COMMON_ABILITIES: Ability[] = [];
export const RARE_ABILITIES: Ability[] = [];
export const EPIC_ABILITIES: Ability[] = [];
export const LEGENDARY_ABILITIES: Ability[] = [];

// ALL ABILITIES - Currently only Siphon
export const ALL_PREDEFINED_ABILITIES: Ability[] = [
  ...ATTACK_ABILITIES
];

// Export by category
export const ABILITIES_BY_CATEGORY = {
  tactical: [],
  attack: ATTACK_ABILITIES,
  defense: [],
  utility: [],
  gamechanger: []
};

// Export by rarity
export const ABILITIES_BY_RARITY = {
  common: COMMON_ABILITIES,
  rare: ATTACK_ABILITIES,
  epic: EPIC_ABILITIES,
  legendary: LEGENDARY_ABILITIES
};

// Color schemes for categories
export const CATEGORY_COLORS = {
  tactical: {
    primary: '#10B981', // emerald-500
    secondary: '#059669', // emerald-600
    accent: '#D1FAE5', // emerald-100
    gradient: 'from-emerald-500 to-emerald-600'
  },
  attack: {
    primary: '#EF4444', // red-500
    secondary: '#DC2626', // red-600
    accent: '#FEE2E2', // red-100
    gradient: 'from-red-500 to-red-600'
  },
  defense: {
    primary: '#3B82F6', // blue-500
    secondary: '#2563EB', // blue-600
    accent: '#DBEAFE', // blue-100
    gradient: 'from-blue-500 to-blue-600'
  },
  utility: {
    primary: '#8B5CF6', // violet-500
    secondary: '#7C3AED', // violet-600
    accent: '#EDE9FE', // violet-100
    gradient: 'from-violet-500 to-violet-600'
  },
  gamechanger: {
    primary: '#F59E0B', // amber-500
    secondary: '#D97706', // amber-600
    accent: '#FEF3C7', // amber-100
    gradient: 'from-amber-500 to-amber-600'
  }
};

// Color schemes for rarities
export const RARITY_COLORS = {
  common: {
    primary: '#6B7280', // gray-500
    secondary: '#4B5563', // gray-600
    accent: '#F3F4F6', // gray-100
    gradient: 'from-gray-500 to-gray-600',
    background: 'bg-gray-500/20',
    border: '#6B7280'
  },
  rare: {
    primary: '#3B82F6', // blue-500
    secondary: '#2563EB', // blue-600
    accent: '#DBEAFE', // blue-100
    gradient: 'from-blue-500 to-blue-600',
    background: 'bg-blue-500/20',
    border: '#3B82F6'
  },
  epic: {
    primary: '#8B5CF6', // violet-500
    secondary: '#7C3AED', // violet-600
    accent: '#EDE9FE', // violet-100
    gradient: 'from-violet-500 to-violet-600',
    background: 'bg-violet-500/20',
    border: '#8B5CF6'
  },
  legendary: {
    primary: '#F59E0B', // amber-500
    secondary: '#D97706', // amber-600
    accent: '#FEF3C7', // amber-100
    gradient: 'from-amber-500 to-amber-600',
    background: 'bg-amber-500/20',
    border: '#F59E0B'
  }
};

// Starter abilities for new users (currently just Siphon)
export const STARTER_ABILITIES = ['siphon'];