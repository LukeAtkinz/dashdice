import { Ability } from '@/types/abilities';

/**
 * Predefined Abilities Collection
 * Comprehensive set of abilities organized by rarity and category
 */

// COMMON ABILITIES (1-2 Star Cost, 4-8 Aura Cost)
export const COMMON_ABILITIES: Ability[] = [
  {
    id: 'lucky_reroll',
    name: 'Lucky Reroll',
    description: 'Reroll one die of your choice',
    longDescription: 'Select any die from your roll and reroll it once. Perfect for turning a bust into a scoring roll.',
    rarity: 'common',
    starCost: 1,
    category: 'utility',
    cooldown: 0,
    maxUses: 3,
    auraCost: 4,
    hidden: true,
    unlockLevel: 1,
    effects: [
      {
        type: 'dice_reroll',
        value: 1,
        target: 'self'
      }
    ],
    isActive: true
  },
  {
    id: 'focus_shot',
    name: 'Focus Shot',
    description: 'Next roll adds +1 to all dice',
    longDescription: 'Your next dice roll will have +1 added to each die result. Can turn average rolls into great ones.',
    rarity: 'common',
    starCost: 2,
    category: 'utility',
    cooldown: 30,
    maxUses: 2,
    auraCost: 6,
    hidden: true,
    unlockLevel: 2,
    effects: [
      {
        type: 'bonus_roll',
        value: 1,
        duration: 1,
        target: 'self'
      }
    ],
    isActive: true
  },
  {
    id: 'shield_wall',
    name: 'Shield Wall',
    description: 'Blocks next opponent ability',
    longDescription: 'Creates a protective barrier that completely negates the next ability used against you.',
    rarity: 'common',
    starCost: 2,
    category: 'defense',
    cooldown: 45,
    maxUses: 2,
    auraCost: 8,
    hidden: true,
    unlockLevel: 3,
    effects: [
      {
        type: 'shield',
        duration: 30,
        target: 'self'
      }
    ],
    isActive: true
  },
  {
    id: 'aura_siphon',
    name: 'Aura Siphon',
    description: 'Steal 3 aura from opponent',
    longDescription: 'Drain aura energy from your opponent and add it to your own pool. Great for setting up combos.',
    rarity: 'common',
    starCost: 2,
    category: 'attack',
    cooldown: 60,
    maxUses: 2,
    auraCost: 5,
    hidden: true,
    unlockLevel: 4,
    effects: [
      {
        type: 'aura_drain',
        value: 3,
        target: 'opponent'
      },
      {
        type: 'aura_gain',
        value: 3,
        target: 'self'
      }
    ],
    isActive: true
  }
];

// RARE ABILITIES (3 Star Cost, 8-12 Aura Cost)
export const RARE_ABILITIES: Ability[] = [
  {
    id: 'vision_surge',
    name: 'Vision Surge',
    description: 'Reveal 3 opponent abilities',
    longDescription: 'Peek into your opponent\'s strategy by revealing 3 of their equipped abilities for 2 turns.',
    rarity: 'rare',
    starCost: 3,
    category: 'tactical',
    cooldown: 90,
    maxUses: 1,
    auraCost: 10,
    hidden: true,
    unlockLevel: 5,
    effects: [
      {
        type: 'reveal_abilities',
        value: 3,
        duration: 120, // 2 turns worth
        target: 'opponent'
      }
    ],
    isActive: true
  },
  {
    id: 'double_trouble',
    name: 'Double Trouble',
    description: 'Double your score for this round',
    longDescription: 'All points scored during this turn are doubled. Perfect for maximizing big rolls.',
    rarity: 'rare',
    starCost: 3,
    category: 'utility',
    cooldown: 60,
    maxUses: 1,
    auraCost: 12,
    hidden: true,
    unlockLevel: 5,
    effects: [
      {
        type: 'score_multiply',
        value: 2,
        target: 'self'
      }
    ],
    isActive: true
  },
  {
    id: 'time_warp',
    name: 'Time Warp',
    description: 'Freeze opponent\'s timer for 10 seconds',
    longDescription: 'Temporarily stop your opponent\'s turn timer, giving them less time to make decisions.',
    rarity: 'rare',
    starCost: 3,
    category: 'attack',
    cooldown: 90,
    maxUses: 1,
    auraCost: 10,
    hidden: true,
    unlockLevel: 7,
    effects: [
      {
        type: 'time_freeze',
        duration: 10,
        target: 'opponent'
      }
    ],
    isActive: true
  },
  {
    id: 'counter_strike',
    name: 'Counter Strike',
    description: 'Reflect next opponent ability back at them',
    longDescription: 'The next ability used against you will be reflected back to your opponent instead.',
    rarity: 'rare',
    starCost: 3,
    category: 'defense',
    cooldown: 120,
    maxUses: 1,
    auraCost: 11,
    hidden: true,
    unlockLevel: 8,
    effects: [
      {
        type: 'shield',
        duration: 60,
        target: 'self',
        metadata: { reflect: true }
      }
    ],
    isActive: true
  }
];

// EPIC ABILITIES (4 Star Cost, 12-16 Aura Cost)
export const EPIC_ABILITIES: Ability[] = [
  {
    id: 'combo_chain',
    name: 'Combo Chain',
    description: 'Guarantees doubles on next roll',
    longDescription: 'Your next dice roll is guaranteed to be doubles, activating the 2x multiplier for your turn.',
    rarity: 'epic',
    starCost: 4,
    category: 'gamechanger',
    cooldown: 120,
    maxUses: 1,
    auraCost: 15,
    hidden: true,
    unlockLevel: 10,
    effects: [
      {
        type: 'combo_chain',
        condition: 'guarantee_doubles',
        target: 'self'
      }
    ],
    isActive: true
  },
  {
    id: 'ability_theft',
    name: 'Ability Theft',
    description: 'Steal a random opponent ability for this match',
    longDescription: 'Permanently steal one of your opponent\'s equipped abilities for the remainder of this match.',
    rarity: 'epic',
    starCost: 4,
    category: 'attack',
    cooldown: 180,
    maxUses: 1,
    auraCost: 16,
    hidden: true,
    unlockLevel: 12,
    effects: [
      {
        type: 'steal_ability',
        value: 1,
        target: 'opponent',
        condition: 'random_equipped'
      }
    ],
    isActive: true
  },
  {
    id: 'phoenix_rise',
    name: 'Phoenix Rise',
    description: 'Comeback from behind with score boost',
    longDescription: 'If you\'re losing by 100+ points, gain a 25% score boost and +5 aura. The lower your score, the stronger the effect.',
    rarity: 'epic',
    starCost: 4,
    category: 'gamechanger',
    cooldown: 180,
    maxUses: 1,
    auraCost: 12,
    hidden: true,
    unlockLevel: 11,
    effects: [
      {
        type: 'score_multiply',
        value: 1.25,
        condition: 'behind_by_100',
        target: 'self'
      },
      {
        type: 'aura_gain',
        value: 5,
        target: 'self'
      }
    ],
    isActive: true
  },
  {
    id: 'tactical_nuke',
    name: 'Tactical Nuke',
    description: 'Reset both players to 0 points',
    longDescription: 'Nuclear option: Reset both your score and your opponent\'s score to 0. Use when desperate or for psychological warfare.',
    rarity: 'epic',
    starCost: 4,
    category: 'gamechanger',
    cooldown: 300,
    maxUses: 1,
    auraCost: 14,
    hidden: false, // This one is visible to add tension
    unlockLevel: 13,
    effects: [
      {
        type: 'score_multiply',
        value: 0,
        target: 'both',
        metadata: { reset: true }
      }
    ],
    isActive: true
  }
];

// LEGENDARY ABILITIES (5 Star Cost, 16-20 Aura Cost)
export const LEGENDARY_ABILITIES: Ability[] = [
  {
    id: 'grand_theft',
    name: 'Grand Theft',
    description: 'Steal 25% of opponent\'s score',
    longDescription: 'Take 25% of your opponent\'s current score and add it to your own. The ultimate comeback ability.',
    rarity: 'legendary',
    starCost: 5,
    category: 'gamechanger',
    cooldown: 180,
    maxUses: 1,
    auraCost: 20,
    hidden: true,
    unlockLevel: 15,
    effects: [
      {
        type: 'steal_turn',
        value: 0.25,
        target: 'opponent'
      }
    ],
    isActive: true
  },
  {
    id: 'perfect_storm',
    name: 'Perfect Storm',
    description: 'Next 3 rolls are guaranteed max values',
    longDescription: 'Your next 3 dice rolls will automatically result in double 6s (12 points each). Unstoppable momentum.',
    rarity: 'legendary',
    starCost: 5,
    category: 'gamechanger',
    cooldown: 240,
    maxUses: 1,
    auraCost: 18,
    hidden: true,
    unlockLevel: 18,
    effects: [
      {
        type: 'bonus_roll',
        value: 12,
        duration: 3,
        condition: 'fixed_result',
        target: 'self',
        metadata: { fixedResult: [6, 6] }
      }
    ],
    isActive: true
  },
  {
    id: 'total_domination',
    name: 'Total Domination',
    description: 'Disable all opponent abilities for 2 turns',
    longDescription: 'Lock down your opponent completely - they cannot use any abilities for 2 full turns. Assert your dominance.',
    rarity: 'legendary',
    starCost: 5,
    category: 'attack',
    cooldown: 300,
    maxUses: 1,
    auraCost: 17,
    hidden: false, // Visible to create fear
    unlockLevel: 20,
    effects: [
      {
        type: 'shield',
        duration: 120, // 2 turns
        target: 'opponent',
        metadata: { disable_abilities: true }
      }
    ],
    isActive: true
  },
  {
    id: 'omniscience',
    name: 'Omniscience',
    description: 'See all opponent abilities and their cooldowns',
    longDescription: 'Gain complete tactical awareness - see all opponent abilities, their cooldowns, and aura levels for the entire match.',
    rarity: 'legendary',
    starCost: 5,
    category: 'tactical',
    cooldown: 0,
    maxUses: 1,
    auraCost: 16,
    hidden: true,
    unlockLevel: 17,
    effects: [
      {
        type: 'reveal_abilities',
        value: 5, // All abilities
        duration: 999, // Permanent for match
        target: 'opponent',
        metadata: { show_cooldowns: true, show_aura: true }
      }
    ],
    isActive: true
  }
];

// COMBINED ABILITIES ARRAY
export const ALL_PREDEFINED_ABILITIES: Ability[] = [
  ...COMMON_ABILITIES,
  ...RARE_ABILITIES,
  ...EPIC_ABILITIES,
  ...LEGENDARY_ABILITIES
];

// ABILITIES BY CATEGORY
export const ABILITIES_BY_CATEGORY = {
  tactical: ALL_PREDEFINED_ABILITIES.filter(a => a.category === 'tactical'),
  attack: ALL_PREDEFINED_ABILITIES.filter(a => a.category === 'attack'),
  defense: ALL_PREDEFINED_ABILITIES.filter(a => a.category === 'defense'),
  utility: ALL_PREDEFINED_ABILITIES.filter(a => a.category === 'utility'),
  gamechanger: ALL_PREDEFINED_ABILITIES.filter(a => a.category === 'gamechanger')
};

// ABILITIES BY RARITY
export const ABILITIES_BY_RARITY = {
  common: COMMON_ABILITIES,
  rare: RARE_ABILITIES,
  epic: EPIC_ABILITIES,
  legendary: LEGENDARY_ABILITIES
};

// STARTER ABILITIES (unlocked at level 1)
export const STARTER_ABILITIES = ['lucky_reroll'];

// ABILITY LOOKUP MAP
export const ABILITY_LOOKUP = ALL_PREDEFINED_ABILITIES.reduce((acc, ability) => {
  acc[ability.id] = ability;
  return acc;
}, {} as Record<string, Ability>);

// CATEGORY COLORS FOR UI
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
};

// RARITY COLORS FOR UI
export const RARITY_COLORS = {
  common: {
    border: '#6B7280', // gray-500
    background: '#374151', // gray-700
    text: '#D1D5DB' // gray-300
  },
  rare: {
    border: '#3B82F6', // blue-500
    background: '#1E3A8A', // blue-800
    text: '#93C5FD' // blue-300
  },
  epic: {
    border: '#8B5CF6', // purple-500
    background: '#581C87', // purple-800
    text: '#C4B5FD' // purple-300
  },
  legendary: {
    border: '#F59E0B', // yellow-500
    background: '#92400E', // yellow-800
    text: '#FCD34D' // yellow-300
  }
};