# Aura Axe Ability - Implementation Complete ✅

## Overview
Aura Axe is a high-impact Epic attack ability that drains 50% of the opponent's aura and transfers it directly to the player. This precision aura-manipulation ability creates tactical advantage by weakening the opponent's ability resource while strengthening your own.

## Ability Stats
- **ID**: `aura_axe`
- **Category**: Attack
- **Rarity**: Epic
- **AURA Cost**: 4
- **Star Cost**: 4 (Power Rating)
- **Cooldown**: 0 (once per match)
- **Icon**: `/Abilities/Catagories/Attack/Aura Axe.webp`
- **Image**: `hand holding axe.png`

## Mechanics

### Aura Drain & Steal
- **Drains 50% of opponent's current aura**
- **Transfers drained aura to the caster**
- **Instant effect** (no duration, immediate impact)
- **Cannot reduce opponent's aura below 0**

### Activation Rules
- Can be played at any time during your turn
- Only one Tactical/Attack ability can be active per turn (game-wide constraint)
- Cannot stack with other Attack abilities
- Target is automatically determined (opponent player)

### Calculation Example
```
Opponent has 10 AURA
→ Aura Axe drains 5 AURA (50%)
→ Caster gains 5 AURA
→ Opponent left with 5 AURA
→ Caster now has (previous AURA + 5)
```

## Implementation Files

### 1. abilities.ts
```typescript
export const AURA_AXE: DashDiceAbility = {
  id: 'aura_axe',
  name: 'Aura Axe',
  version: 1,
  category: AbilityCategory.ATTACK,
  type: AbilityType.ACTIVE,
  rarity: AbilityRarity.EPIC,
  description: 'Risk–Reward Aura Surge: Drain 50% of opponent\'s aura and steal it for yourself.',
  longDescription: 'Aura Axe channels a player\'s aura into a devastating strike aimed at the opponent\'s life force. The player commits accumulated energy to weaken their foe, draining half of their opponent\'s aura and transferring it directly to themselves. It\'s a precision–risk maneuver: powerful enough to shift momentum, but dangerous if poorly timed. Best used when opponent has high aura or is likely to commit to an attack.',
  flavorText: '"A strike fueled by intent, sharpened by aura — one swing can cleave opportunity from your foe, or leave you open to their retaliation."',
  iconUrl: '/Abilities/Catagories/Attack/Aura Axe.webp',
  cooldown: 0,
  auraCost: 4,
  starCost: 4,
  
  targeting: {
    type: 'opponent',
    allowSelfTarget: false,
    maxTargets: 1
  },
  
  timing: {
    usableWhen: [TimingConstraint.MY_TURN_START, TimingConstraint.MY_TURN_END]
  },
  
  effects: [
    {
      id: 'aura_axe_drain',
      name: 'Aura Drain',
      description: 'Drain 50% of opponent\'s aura and steal it for yourself',
      type: EffectType.STEAL_AURA,
      magnitude: 'steal_50_percent',
      target: {
        type: 'opponent',
        property: 'aura'
      },
      duration: 0 // Instant effect
    }
  ]
};
```

### 2. abilityFirebaseService.ts
- **Location**: After `vital_rush`, before `pan_slap`
- **Execution**:
  ```typescript
  else if (ability.id === 'aura_axe') {
    // Get opponent automatically
    const targetPlayerId = playerIds.find((id: string) => id !== playerId);
    
    // Get current aura values
    const playerAura = matchData.gameData?.playerAura?.[playerId] || 0;
    const opponentAura = matchData.gameData?.playerAura?.[targetPlayerId] || 0;
    
    // Calculate 50% drain
    const auraDrained = Math.floor(opponentAura * 0.5);
    
    // Update both players' aura
    const newPlayerAura = playerAura + auraDrained;
    const newOpponentAura = Math.max(0, opponentAura - auraDrained);
    
    await updateDoc(doc(db, 'matches', matchId), {
      [`gameData.playerAura.${playerId}`]: newPlayerAura,
      [`gameData.playerAura.${targetPlayerId}`]: newOpponentAura
    });
    
    console.log(`🪓 Aura Axe: Drained ${auraDrained} aura from ${targetPlayerId}. Caster now has ${newPlayerAura}, opponent has ${newOpponentAura}`);
  }
  ```

## Strategic Use Cases

### Optimal Timing:
1. **High Opponent Aura**: When opponent has accumulated 8-10+ aura, drain 4-5 aura instantly
2. **Pre-emptive Strike**: Before opponent can use their powerful abilities, reduce their resources
3. **Aura Advantage**: Create a significant aura gap to control the pace of the match
4. **Comeback Mechanic**: When trailing, steal resources to enable your own comeback abilities

### Synergies:
- **Spirit Draw** (if it exists): Gain aura → Use Aura Axe → Multiply advantage
- **Pulse Shield**: Defensive protection after aggressive aura drain
- **Echo Veil**: Mask Aura Axe activation to prevent counter-play
- **Adrenal Surge**: Bonus turn score after successful aura drain

### Counter-Strategies:
- **Aura Drain** (opponent uses first): Remove your aura before you can use Aura Axe
- **Dicebreaker**: Reduce roll effectiveness to limit aura gain
- **Mirror Veil**: Reflect portion of aura drain back
- **Null Pulse**: Cancel tactical/attack buffs activated this round

## Balance & Design Goals

| Design Intent | Mechanic | Outcome |
|--------------|----------|---------|
| Reward timing & skill | Scales with opponent's aura | Promotes strategic resource management |
| Prevent overpowering | 4 AURA cost, once per match | Fair resource investment required |
| Enhance spectacle | Visual FX + aura transfer animation | Builds tension and excitement |
| Maintain meta health | Multiple counters available | Prevents dominance of one ability |
| Risk-reward balance | Must commit 4 aura to steal potentially more | Encourages calculated risk-taking |

## Visual/Audio Design
- **Icon**: Hand gripping an axe (suggested: `hand holding axe.png`)
- **Animation**: Axe swing motion with aura energy transfer effect
- **Visual Effects**:
  - Aura particles flowing from opponent to caster
  - Pulse/strike impact on opponent
  - Aura bars visually updating with drain animation
- **Sound Effects**:
  - Activation: Axe whoosh/swing sound
  - Impact: Energy drain sound
  - Success: Aura absorption/power-up sound

## Testing Checklist
- [ ] Verify 50% aura drain calculation is correct
- [ ] Confirm aura transfer to caster works
- [ ] Test with opponent at 0 aura (should not go negative)
- [ ] Test with odd numbers (e.g., 9 aura → drain 4, not 4.5)
- [ ] Verify once-per-match limit enforcement
- [ ] Check 4 AURA cost deduction
- [ ] Test auto-targeting of opponent
- [ ] Verify timing constraints (only on player's turn)
- [ ] Check ability cannot be used when not player's turn
- [ ] Test visual feedback and console logging

## Lore & Flavor
**"A strike fueled by intent, sharpened by aura — one swing can cleave opportunity from your foe, or leave you open to their retaliation."**

In the world of DashDice, aura represents accumulated spiritual energy and momentum. The Aura Axe is a precision weapon that doesn't destroy this energy but rather severs the connection between opponent and their power source, redirecting half of it to the wielder. It's the ultimate tactical strike — weakening your enemy while empowering yourself in one decisive blow.

## Status
✅ **COMPLETE** - Core mechanics implemented
- [x] Ability definition in abilities.ts
- [x] Added to ALL_ABILITIES array
- [x] Added to ATTACK category
- [x] Added to EPIC rarity
- [x] Service execution in abilityFirebaseService.ts
- [x] 50% aura drain calculation
- [x] Aura transfer logic
- [x] Auto-targeting opponent
- [x] Console logging for debugging
- [ ] Icon/animation assets (placeholder currently)
- [ ] Live gameplay testing
- [ ] Visual effects implementation

**Last Updated**: November 19, 2025
