# Luck Turner Ability Implementation Guide

## 🎯 Ability Overview

**Luck Turner** is a tactical Epic ability that allows players to manipulate dice probability for risk management and strategic advantage.

### Basic Stats
- **ID**: `luck_turner`
- **Name**: Luck Turner
- **Category**: Tactical
- **Type**: Risk–Reward Probability Manipulation
- **Rarity**: Epic
- **Power Rating**: 4/5
- **Base Aura Cost**: 3 (Basic) / 6 (Advanced)
- **Star Cost**: 4
- **Cooldown**: 2 Turns
- **Icon**: `/abilities/tactical/hand_holding_screwdriver.webp`

## 🎲 Gameplay Mechanics

### Variable Cost System
The ability has two tiers based on AURA investment:

#### Basic Effect (3 AURA)
- **50% reduction** in chance to roll a 1
- Reduces bust risk on risky turns
- Perfect for defensive play when you have a decent score

#### Advanced Effect (6 AURA)  
- **50% reduction** in chance to roll a 1
- **50% increase** in chance to roll doubles
- Higher risk, higher reward strategy
- Can accelerate turn score but doubles are still risky

### Duration & Cooldown
- **Effect Duration**: Lasts for the entire current turn
- **Cooldown**: Cannot be used again for 2 full turns after activation
- **Timing**: Can be activated at turn start or before rolling

## 🔧 Technical Implementation

### Effect Structure
```typescript
// Basic effect: Reduces 1s probability
{
  type: EffectType.MODIFY_DICE_PROBABILITY,
  magnitude: 'luck_basic',
  target: { type: 'self', property: 'diceRollProbability' },
  duration: 1
}

// Advanced effect: Reduces 1s, increases doubles
{
  type: EffectType.MODIFY_DICE_PROBABILITY,
  magnitude: 'luck_advanced', 
  target: { type: 'self', property: 'diceRollProbability' },
  duration: 1
}
```

### Game Logic Integration Points

#### 1. Dice Roll Probability Modification
```typescript
// In dice rolling logic
function rollDice(player, diceCount) {
  const luckEffect = player.activeEffects.find(e => e.id.includes('luck_turner'));
  
  if (luckEffect) {
    if (luckEffect.magnitude === 'luck_basic') {
      // Reduce chance of rolling 1 by 50%
      return rollWithModifiedProbability(diceCount, { 
        ones: 0.5,  // 50% less 1s
      });
    } else if (luckEffect.magnitude === 'luck_advanced') {
      // Reduce 1s by 50%, increase doubles by 50%
      return rollWithModifiedProbability(diceCount, {
        ones: 0.5,     // 50% less 1s
        doubles: 1.5   // 50% more doubles
      });
    }
  }
  
  return normalDiceRoll(diceCount);
}
```

#### 2. Variable AURA Cost Handler
```typescript
function handleLuckTurnerActivation(player, targetEffect) {
  const currentAura = player.currentAura;
  
  if (targetEffect === 'advanced' && currentAura >= 6) {
    // Apply advanced effect, cost 6 AURA
    player.currentAura -= 6;
    applyLuckEffect(player, 'luck_advanced');
  } else if (currentAura >= 3) {
    // Apply basic effect, cost 3 AURA
    player.currentAura -= 3;
    applyLuckEffect(player, 'luck_basic');
  } else {
    throw new Error('Insufficient AURA');
  }
}
```

#### 3. Cooldown Management
```typescript
function applyLuckTurnerCooldown(player) {
  player.abilityCooldowns.luck_turner = {
    turnsRemaining: 2,
    appliedAt: currentTurn
  };
}
```

## 🎮 UI Integration

### Ability Button States
```typescript
function LuckTurnerButton({ player, onActivate }) {
  const canUseBasic = player.currentAura >= 3 && !onCooldown;
  const canUseAdvanced = player.currentAura >= 6 && !onCooldown;
  
  return (
    <div className="luck-turner-ability">
      <button 
        onClick={() => onActivate('basic')}
        disabled={!canUseBasic}
        className="luck-basic-btn"
      >
        Basic (3 AURA): -50% 1s
      </button>
      
      <button 
        onClick={() => onActivate('advanced')}
        disabled={!canUseAdvanced}
        className="luck-advanced-btn"
      >
        Advanced (6 AURA): -50% 1s, +50% Doubles
      </button>
    </div>
  );
}
```

### Visual Feedback
- **Active Effect Indicator**: Show probability modification icon during turn
- **Dice Roll Animation**: Slightly different animation when luck is active
- **Cost Display**: Clear indication of AURA cost for each tier
- **Cooldown Timer**: Visual countdown showing remaining cooldown turns

## 📊 Balancing Considerations

### Risk vs Reward Analysis
- **Basic Effect**: Low risk, moderate benefit - good for score preservation
- **Advanced Effect**: Higher risk due to doubles, but potential for big gains
- **Cooldown**: Prevents spamming, forces strategic timing decisions
- **AURA Cost**: Significant investment requires resource management

### Synergies & Counters
- **Synergizes with**: Focus (dice control), Foresight (prediction)
- **Countered by**: Dispel effects, Chaos abilities that randomize outcomes
- **Strategic Use**: Best on turns with moderate scores when bust risk is high

## 🧪 Testing Scenarios

### Scenario 1: Basic Effect Testing
1. Player has 20 points, 3 AURA
2. Activate Luck Turner (Basic)
3. Roll dice and verify 1s appear ~50% less frequently
4. Confirm AURA cost deducted correctly
5. Verify cooldown applied

### Scenario 2: Advanced Effect Testing  
1. Player has 15 points, 6 AURA
2. Activate Luck Turner (Advanced) 
3. Roll dice and verify both 1s reduction and doubles increase
4. Confirm higher AURA cost and same cooldown

### Scenario 3: Edge Cases
1. Test with insufficient AURA (should fail gracefully)
2. Test during cooldown period (should be disabled)
3. Test interaction with other dice-modifying abilities
4. Test effect duration (should last only current turn)

## 🎯 Strategic Use Cases

### Defensive Play
- **Situation**: You have 25+ points and want to bank safely
- **Strategy**: Use Basic effect to reduce bust risk
- **Timing**: Activate before rolling when you have moderate score

### Aggressive Play  
- **Situation**: Behind in score, need big gains
- **Strategy**: Use Advanced effect for potential double acceleration
- **Risk**: Doubles still carry bust risk, but with higher probability

### Resource Management
- **Conservative**: Save AURA, use Basic effect when necessary
- **Aggressive**: Invest 6 AURA early for momentum building
- **Emergency**: Use when one bust would lose the game

## 📝 Implementation Checklist

### Core Functionality
- [ ] Variable AURA cost system (3/6)
- [ ] Probability modification logic
- [ ] Turn duration tracking
- [ ] 2-turn cooldown system

### Game Integration
- [ ] Dice roll probability hooks
- [ ] Effect application and removal
- [ ] AURA cost deduction
- [ ] Cooldown management

### UI Components
- [ ] Dual-tier activation buttons
- [ ] AURA cost indicators
- [ ] Cooldown timer display
- [ ] Active effect visualization

### Testing & Validation
- [ ] Basic effect reduces 1s by ~50%
- [ ] Advanced effect modifies both probabilities
- [ ] Cooldown prevents reuse correctly
- [ ] AURA costs applied accurately

This implementation provides a sophisticated risk-management tool that adds strategic depth while maintaining balance through cooldown and resource costs. The variable cost system gives players meaningful choices about their level of investment and risk tolerance.