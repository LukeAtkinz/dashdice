# Ability Implementation Roadmap

## 🎯 Current Status: Luck Turner Implemented

We have successfully implemented our first ability! **Luck Turner** is now added to the system and ready for testing and integration.

## 🏗️ Clean Foundation

### What's Ready:
- ✅ **Complete type system** in `src/types/abilityBlueprint.ts`
- ✅ **Firebase service** with all CRUD operations
- ✅ **React hook** for state management
- ✅ **Luck Turner ability** fully implemented
- ✅ **Helper function** `addAbilityToCollections()` for easy ability addition
- ✅ **No TypeScript errors** - clean compilation

### What's Implemented:
- ✅ **LUCK_TURNER** - Epic tactical ability with variable AURA cost (3/6)
  - Risk-reward probability manipulation
  - 2-turn cooldown system
  - Reduces bust chance and/or increases doubles

### What's Empty (Ready for Next Abilities):
- 🔧 More abilities to be added one by one
- 🔧 `STARTER_ABILITIES` - will add basic abilities as we go

## 🚀 Implementation Strategy

### Phase 1: Simple Utility Ability (Start Here)
**Target: REROLL** - Simple, self-contained, easy to test
- ✅ No complex game state modifications
- ✅ Clear immediate effect (reroll dice)
- ✅ Easy to validate and test
- ✅ Good starting point for the system

### Phase 2: Basic Attack Ability
**Target: SIPHON** - Score manipulation, opponent targeting
- Score transfer mechanics
- Opponent targeting validation
- Resource cost (AURA) management

### Phase 3: Defense Ability
**Target: SHIELD** - Protective effects, state persistence
- Defensive buff application
- Effect duration tracking
- Damage prevention logic

### Phase 4: Tactical Ability
**Target: SCOUT** - Information gathering, UI updates
- Information revelation mechanics
- UI component updates
- Non-destructive effects

### Phase 5: Advanced Abilities
**Later phases** - Complex interactions, gamechangers
- Multi-turn effects
- Complex conditions
- Advanced targeting

## 🔧 Implementation Workflow

### For Each New Ability:

1. **Define the Ability**
   ```typescript
   // In src/constants/abilities.ts
   export const REROLL: DashDiceAbility = {
     ...createBaseAbility('reroll', 'Reroll', AbilityCategory.UTILITY, AbilityRarity.COMMON, 5, 1),
     // ... complete definition
   };
   ```

2. **Add to Collections**
   ```typescript
   // Use the helper function
   addAbilityToCollections(REROLL);
   ```

3. **Test the Ability**
   - Verify it appears in UI
   - Test activation conditions
   - Validate effects work correctly
   - Check resource costs

4. **Iterate and Refine**
   - Adjust balance values
   - Fix any edge cases
   - Polish UI interactions
   - Add animations/sounds

## 📝 Implementation Template

```typescript
export const ABILITY_NAME: DashDiceAbility = {
  ...createBaseAbility(
    'ability_id',           // Unique ID
    'Display Name',         // UI name
    AbilityCategory.UTILITY,// Category
    AbilityRarity.COMMON,   // Rarity
    5,                      // AURA cost
    1                       // Star cost
  ),
  
  description: 'Short description for UI',
  longDescription: 'Detailed explanation with examples',
  flavorText: 'Optional lore text',
  
  // Timing when ability can be used
  timing: {
    usableWhen: [TimingConstraint.MY_TURN_START]
  },
  
  // Who can be targeted
  targeting: {
    type: 'self',
    allowSelfTarget: true,
    maxTargets: 1
  },
  
  // What the ability does
  effects: [
    {
      id: 'effect_id',
      name: 'Effect Name',
      description: 'What this effect does',
      type: EffectType.REROLL_DICE,
      magnitude: 'all',
      target: {
        type: 'self',
        property: 'currentDice'
      }
    }
  ],
  
  // Optional conditions for activation
  conditions: [
    {
      type: 'has_dice',
      description: 'Must have dice to reroll',
      checkFunction: 'checkHasDice',
      parameters: {}
    }
  ],
  
  tags: ['dice', 'utility', 'luck']
} as DashDiceAbility;

// Add to collections
addAbilityToCollections(ABILITY_NAME);
```

## 🧪 Testing Checklist

For each ability implementation:

### Basic Functionality
- [ ] Ability appears in collections
- [ ] Type definitions are correct
- [ ] No compilation errors
- [ ] Hook can access the ability

### Game Integration
- [ ] Can be equipped in loadout
- [ ] Appears in match interface
- [ ] Activation conditions work
- [ ] Resource costs are deducted
- [ ] Effects are applied correctly

### Edge Cases
- [ ] Works when resources are insufficient
- [ ] Handles invalid targets gracefully
- [ ] Respects timing constraints
- [ ] Cooldowns function properly

### User Experience
- [ ] Clear visual feedback
- [ ] Appropriate error messages
- [ ] Smooth animations
- [ ] Sound effects (if applicable)

## 🎮 Ready to Start!

The system is now prepared for iterative ability implementation. We can start with **REROLL** as it's the simplest ability to implement and test.

**Next Step**: Let's implement the REROLL ability first! 🎲

### File Locations:
- **Types**: `src/types/abilityBlueprint.ts`
- **Service**: `src/services/abilityFirebaseService.ts`
- **Constants**: `src/constants/abilities.ts` ← **Add abilities here**
- **Hook**: `src/hooks/useAbilities.ts`
- **Blueprint**: `ABILITY_MANAGEMENT_BLUEPRINT.md`

The foundation is solid and ready for building! 🚀