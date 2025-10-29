# DashDice Ability Management Blueprint

## 🎯 Ability Storage Strategy

After analyzing the requirements for dashboard access, match usage, and bot integration, I recommend a **hybrid storage approach**:

### Primary Storage: Firebase Firestore
**Collection: `abilities`**
- ✅ Real-time updates across all clients
- ✅ Easy querying and filtering
- ✅ Scalable for thousands of abilities
- ✅ Supports complex indexing
- ✅ Bot access without code deployment
- ✅ Dynamic ability balancing

### Secondary Storage: Code Constants
**File: `src/data/abilityDefinitions.ts`**
- ✅ Type safety and validation
- ✅ Version control tracking
- ✅ Faster initial loading
- ✅ Fallback if Firebase unavailable
- ✅ Development and testing

## 📋 Complete Ability Blueprint

### Core Ability Structure
```typescript
interface DashDiceAbility {
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
  targeting: {
    type: 'self' | 'opponent' | 'both' | 'choice' | 'conditional';
    allowSelfTarget: boolean;
    maxTargets: number;
    validTargets?: string[];    // Specific player types that can be targeted
  };
  
  timing: {
    usableWhen: TimingConstraint[];  // When ability can be used
    triggerEvents?: string[];        // Events that can auto-trigger (for reactives)
    channelTime?: number;            // Time to channel/cast (seconds)
  };
  
  // === EFFECTS SYSTEM ===
  effects: AbilityEffect[];     // Primary effects of the ability
  conditions?: ActivationCondition[]; // Requirements to activate
  
  // === ADVANCED FEATURES ===
  persistence?: {
    duration?: number;           // How long effects last (seconds)
    turnsRemaining?: number;     // Turn-based duration
    stackable: boolean;         // Can multiple instances exist
    dispellable: boolean;       // Can be removed by dispel effects
  };
  
  interactions?: {
    synergiesWith: string[];    // Ability IDs that combo well
    counters: string[];         // Ability IDs this counters
    counteredBy: string[];      // Ability IDs that counter this
    blockedBy: string[];        // Effects that prevent activation
  };
  
  // === PROGRESSION & UNLOCKING ===
  unlockRequirements: {
    level: number;              // Minimum player level
    prerequisiteAbilities?: string[]; // Required abilities first
    achievementRequired?: string;     // Specific achievement
    specialCondition?: string;        // Custom unlock condition
  };
  
  // === BALANCING & ANALYTICS ===
  balancing: {
    powerLevel: number;         // Internal power rating (1-100)
    winRateImpact: number;      // Expected win rate change (-0.1 to +0.1)
    usageFrequency: 'low' | 'medium' | 'high'; // Expected usage
    lastBalanceUpdate: Timestamp;
  };
  
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
```

## 🏷️ Ability Categories & Types

### Categories (Loadout Slots)
```typescript
enum AbilityCategory {
  TACTICAL = 'tactical',      // Strategic positioning, information
  ATTACK = 'attack',          // Offensive abilities, score manipulation  
  DEFENSE = 'defense',        // Protection, damage prevention
  UTILITY = 'utility',        // Resource management, flexibility
  GAMECHANGER = 'gamechanger' // High-impact, match-altering effects
}
```

### Types (Activation Method)
```typescript
enum AbilityType {
  ACTIVE = 'active',         // Player manually activates
  PASSIVE = 'passive',       // Always active/automatic
  REACTIVE = 'reactive',     // Triggers on specific events
  CONDITIONAL = 'conditional' // Activates when conditions met
}
```

### Rarity Levels
```typescript
enum AbilityRarity {
  COMMON = 'common',         // 1-2 star cost, basic effects
  RARE = 'rare',            // 2-3 star cost, moderate effects
  EPIC = 'epic',            // 3-4 star cost, powerful effects
  LEGENDARY = 'legendary',   // 4-5 star cost, game-changing
  MYTHIC = 'mythic'         // 5+ star cost, reality-bending
}
```

## ⏰ Timing Constraints

### When Abilities Can Be Used
```typescript
enum TimingConstraint {
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
```

## 🎮 Effect System Blueprint

### Basic Effect Structure
```typescript
interface AbilityEffect {
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

enum EffectType {
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
```

## 📁 File Structure & Organization

```
src/
├── data/
│   ├── abilities/
│   │   ├── index.ts                 // Export all abilities
│   │   ├── common/                  // Common rarity abilities
│   │   │   ├── lucky_reroll.ts
│   │   │   ├── focus_shot.ts
│   │   │   └── index.ts
│   │   ├── rare/                    // Rare abilities
│   │   │   ├── siphon.ts
│   │   │   ├── shield_wall.ts
│   │   │   └── index.ts
│   │   ├── epic/                    // Epic abilities
│   │   ├── legendary/               // Legendary abilities
│   │   └── mythic/                  // Mythic abilities
│   └── abilityCategories.ts         // Category definitions
│
├── services/
│   ├── abilitiesService.ts          // Enhanced with new blueprint
│   ├── abilityExecutionEngine.ts    // Execution logic
│   ├── abilityValidationService.ts  // Validation logic
│   └── abilityBalancingService.ts   // Balancing tools
│
├── types/
│   ├── abilities.ts                 // Current ability types
│   ├── enhancedAbilities.ts         // Enhanced system types
│   └── abilityBlueprint.ts          // New blueprint types
│
└── components/
    ├── abilities/
    │   ├── AbilityCard.tsx          // Individual ability display
    │   ├── AbilityGrid.tsx          // Grid of abilities
    │   ├── AbilityDetails.tsx       // Detailed view/modal
    │   └── AbilityExecutor.tsx      // In-match execution UI
    └── vault/
        └── AbilitiesSection.tsx     // Vault abilities tab
```

## 🗄️ Firebase Structure

### Collection: `abilities`
```typescript
// Document ID: ability.id (e.g., 'siphon_v2')
{
  // All fields from DashDiceAbility interface above
  id: 'siphon_v2',
  name: 'Siphon',
  category: 'attack',
  // ... etc
}
```

### Collection: `userAbilities` (existing)
```typescript
// Document ID: auto-generated
{
  userId: string,
  abilityId: string,        // Reference to abilities collection
  unlockedAt: Timestamp,
  timesUsed: number,
  successRate: number,
  isEquipped: boolean,
  equippedSlot: string      // Category slot
}
```

### Collection: `userLoadouts` (existing)
```typescript
// Document ID: auto-generated  
{
  userId: string,
  name: string,
  abilities: {
    tactical: 'ability_id',
    attack: 'ability_id', 
    defense: 'ability_id',
    utility: 'ability_id',
    gamechanger: 'ability_id'
  },
  isActive: boolean
}
```

## 🔧 Implementation Strategy

### Phase 1: Blueprint Implementation (Week 1)
1. **Create type definitions** from blueprint
2. **Set up Firebase collections** with initial abilities
3. **Migrate existing abilities** to new structure
4. **Update AbilitiesService** to use new blueprint

### Phase 2: Enhanced UI (Week 2)
1. **Vault integration** - browse and manage abilities
2. **Loadout builder** - drag & drop ability equipping
3. **Ability details** - rich information display
4. **Search and filtering** - find abilities easily

### Phase 3: Match Integration (Week 3)
1. **In-match UI** - ability activation interface
2. **Execution engine** - connect blueprint to execution
3. **Visual feedback** - animations and effects
4. **Bot integration** - AI ability usage

### Phase 4: Advanced Features (Week 4)
1. **Ability crafting** - custom ability creation
2. **Balancing tools** - usage analytics and adjustments
3. **Seasonal abilities** - limited-time special abilities
4. **Tournament modes** - restricted ability sets

## 📊 Example Abilities Using Blueprint

### 1. Siphon (Rare Attack)
```typescript
{
  id: 'siphon_v2',
  name: 'Siphon',
  category: 'attack',
  type: 'reactive',
  rarity: 'rare',
  description: 'Steal half of opponent\'s banked points',
  auraCost: 8,
  cooldown: 0,
  maxUsesPerMatch: 1,
  starCost: 3,
  targeting: { type: 'opponent', maxTargets: 1 },
  timing: { usableWhen: ['opponent_turn'], triggerEvents: ['opponent_banks'] },
  effects: [
    {
      type: 'steal_score',
      magnitude: 0.5,  // 50%
      target: 'opponent_turn_score',
      conditions: [{ type: 'opponent_action', value: 'bank' }]
    }
  ]
}
```

### 2. Time Freeze (Legendary Utility)
```typescript
{
  id: 'time_freeze',
  name: 'Time Freeze',
  category: 'utility', 
  type: 'active',
  rarity: 'legendary',
  description: 'Freeze opponent for 2 turns',
  auraCost: 20,
  cooldown: 45,
  starCost: 5,
  targeting: { type: 'opponent', maxTargets: 1 },
  timing: { usableWhen: ['my_turn'] },
  effects: [
    {
      type: 'freeze_opponent',
      duration: 2, // turns
      target: 'opponent'
    }
  ],
  persistence: { turnsRemaining: 2, dispellable: true }
}
```

### 3. Lucky Streak (Common Tactical)
```typescript
{
  id: 'lucky_streak',
  name: 'Lucky Streak', 
  category: 'tactical',
  type: 'passive',
  rarity: 'common',
  description: 'Gain +1 AURA for each double rolled',
  auraCost: 0, // Passive
  starCost: 1,
  targeting: { type: 'self', maxTargets: 1 },
  timing: { triggerEvents: ['dice_doubles'] },
  effects: [
    {
      type: 'gain_aura',
      magnitude: 1,
      target: 'self',
      conditions: [{ type: 'dice_result', value: 'doubles' }]
    }
  ]
}
```

## 🤖 Bot Integration Strategy

### Bot Ability Selection
```typescript
interface BotAbilityProfile {
  playStyle: 'aggressive' | 'defensive' | 'balanced' | 'chaotic';
  preferredCategories: AbilityCategory[];
  abilityUsagePatterns: {
    [abilityId: string]: {
      frequency: number;        // How often to use (0-1)
      triggerConditions: string[]; // When to use
      priority: number;         // Usage priority
    }
  };
  resourceManagement: {
    auraThreshold: number;      // Min aura before using abilities
    saveForFinisher: boolean;   // Save aura for final abilities
  };
}
```

### Bot Decision Engine
```typescript
class BotAbilityDecisionEngine {
  static async chooseBestAbility(
    botProfile: BotAbilityProfile,
    gameState: any,
    availableAbilities: DashDiceAbility[]
  ): Promise<string | null> {
    // 1. Filter usable abilities based on timing/resources
    // 2. Score abilities based on game state and bot profile  
    // 3. Apply randomness to prevent predictability
    // 4. Return best ability ID or null
  }
}
```

## 📈 Analytics & Balancing

### Usage Metrics
- **Activation Rate**: How often ability is used when available
- **Success Rate**: How often ability achieves intended effect
- **Win Rate Impact**: Win rate difference when ability is used
- **Combo Frequency**: How often used with other abilities

### Balancing Tools
- **Power Level Calculator**: Automatic power rating based on effects
- **Meta Analysis**: Track which abilities dominate
- **Dynamic Costs**: Adjust costs based on performance
- **A/B Testing**: Test ability variants

## 🚀 Migration Path

### Immediate (This Week)
1. **Fix TypeScript errors** in current system
2. **Create blueprint types** and interfaces
3. **Set up Firebase collections** with proper indexing
4. **Migrate Siphon ability** to new blueprint

### Short Term (Next 2 Weeks)
1. **Implement 5-10 basic abilities** using blueprint
2. **Update UI components** to use new structure
3. **Enhance bot system** to use abilities
4. **Add ability search/filtering**

### Long Term (Next Month)
1. **Full ability library** (50+ abilities)
2. **Advanced combo system**
3. **Seasonal content pipeline**
4. **Tournament integration**

This blueprint provides a comprehensive foundation for managing abilities across all aspects of DashDice while maintaining flexibility for future expansion and balancing needs.