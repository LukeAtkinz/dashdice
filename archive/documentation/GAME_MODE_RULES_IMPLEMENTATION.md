# Game Mode Rules Implementation

## Overview
This document details the implementation of enhanced game mode rules for DashDice, including the advanced mechanics for Zero Hour, Last Line, and True Grit game modes.

## Zero Hour Rules

### Basic Mechanics
- **Starting Score**: 100 points
- **Win Condition**: First player to reach exactly 0 points wins
- **Score Direction**: Countdown (subtracting rolls from score)
- **Banking**: Allowed
- **Turn Counter**: Backend can handle negative values, frontend displays non-negative only

### Doubles Effects
Each double has unique effects and multiplier behavior:

#### Double 1 (Snake Eyes)
- **Score Bonus**: +20 points
- **Multiplier**: 2x for rest of turn
- **Opponent Penalty**: None
- **Banking Effect**: No additional penalty

#### Double 2
- **Score Bonus**: +12 points  
- **Multiplier**: 2x for rest of turn
- **Opponent Penalty**: +4 points (can exceed 100)
- **Banking Effect**: Penalty applied when banked

#### Double 3
- **Score Bonus**: +6 points
- **Multiplier**: None (1x)
- **Opponent Penalty**: Current turn score added to opponent
- **Banking Effect**: Penalty applied when banked

#### Double 4
- **Score Bonus**: +8 points
- **Multiplier**: 2x for rest of turn
- **Opponent Penalty**: +8 points (can exceed 100)
- **Banking Effect**: Penalty applied when banked

#### Double 5
- **Score Bonus**: +10 points
- **Multiplier**: 2x for rest of turn
- **Opponent Penalty**: +10 points (can exceed 100)
- **Banking Effect**: Penalty applied when banked

#### Double 6
- **Score Bonus**: +12 points
- **Multiplier**: None (1x)
- **Opponent Penalty**: Current turn score added to opponent
- **Banking Effect**: Penalty applied when banked

### Multiplier System
- Multipliers are set by specific doubles and last for the remainder of the turn
- New doubles can overwrite existing multipliers
- Multipliers reset at turn end
- All subsequent rolls in the turn are affected by the active multiplier

## Last Line Rules

### Basic Mechanics
- **Game Structure**: Each player gets one roll only
- **Win Condition**: Highest single roll wins the match
- **Tie Handling**: Replay if tied
- **Banking**: Not applicable (single roll)
- **Duration**: Very quick elimination rounds

### Special Rules
- Rolling doubles grants one additional roll
- Players continue rolling as long as they roll doubles
- Final score is the sum of all rolls in their single turn

## True Grit Rules

### Basic Mechanics
- **Turn Structure**: Each player has one extended turn only
- **Turn End**: Turn ends when player rolls a single 1
- **Win Condition**: Highest total when all players are done/eliminated
- **Banking**: Not allowed (continuous rolling)

### Elimination
- Rolling a single 1 ends the player's turn immediately
- Player keeps all points accumulated before the single 1

### Probability Adjustment
- Single 1 probability reduced by 20% (0.8x multiplier)
- This lengthens games and increases strategic depth

### Multiplier System
Rolling doubles sets active multiplier equal to the dice value:
- **Double 1**: 1x multiplier + 2 points base
- **Double 2**: 2x multiplier + 4 points base  
- **Double 3**: 3x multiplier + 6 points base
- **Double 4**: 4x multiplier + 8 points base
- **Double 5**: 5x multiplier + 10 points base
- **Double 6**: 6x multiplier + 12 points base

### Multiplier Rules
- New doubles overwrite previous multipliers
- Multiplier affects all subsequent rolls until another double
- Multiplier resets when turn ends (single 1 rolled)
- Only one multiplier can be active at a time

### Game End Conditions
1. **Second player elimination**: If second player rolls single 1 and has lower total than first player → first player wins
2. **Score surpass**: If second player surpasses first player's score before rolling a 1 → second player wins
3. **Extended play**: With more than 2 players, continue until all players complete their turns

## Implementation Details

### Type Definitions
- Enhanced `GameModeRules` interface with `doublesEffects` and `multiplierSystem`
- Added `activeMultipliers` tracking in `GameModeSpecificData`
- Extended `GameActionResult` with multiplier and penalty information

### Service Methods
- `processRoll()`: New enhanced method handling complex doubles effects and multipliers
- `resetTurnMultipliers()`: Resets multipliers at turn end
- `initializeModeData()`: Initializes multiplier tracking for applicable modes

### Backward Compatibility
- Legacy `calculateScore()` method maintained for existing integrations
- Gradual migration path for enhanced features

## Testing Considerations

### Zero Hour
- Test multiplier persistence across rolls
- Verify opponent penalties apply correctly on banking
- Test overshoot reset to 100 points
- Verify exact score requirement (must reach exactly 0)

### Last Line  
- Test double roll continuation
- Verify highest score wins logic
- Test tie replay functionality

### True Grit
- Test multiplier overwriting behavior
- Verify single 1 elimination
- Test probability adjustment effectiveness
- Verify turn-end multiplier reset

## Future Enhancements
- Real-time multiplier display in UI
- Advanced statistics tracking for multiplier usage
- Tournament mode with these enhanced rules
- Mobile-optimized multiplier indicators
