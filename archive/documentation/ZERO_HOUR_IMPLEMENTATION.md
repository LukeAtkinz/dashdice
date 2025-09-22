# Zero Hour Game Mode Implementation

## Overview
Zero Hour is a countdown dice game where both players start at 100 points and race to reach exactly 0 by banking their turn scores to subtract from their game score.

## Core Rules Implemented

### Starting Conditions
- Both players start at 100 points
- First to reach exactly 0 wins
- Players take turns rolling 2 dice

### Turn Flow
1. **Turn Start**: turnScore = 0, multiplierActive = false
2. **Roll Dice**: Player rolls 2 dice → (die1 + die2) = rollTotal
3. **Add to Turn Score**: rollTotal is added to turnScore (apply multiplier if active)
4. **Banking**: Player can choose to bank, which subtracts turnScore from gameScore
5. **Win Condition**: If gameScore === 0 after banking → player wins

### Special Rules

#### 1. Doubles (Any double except Snake Eyes)
- **Effect**: opponent.gameScore += rollTotal
- **Multiplier**: Sets multiplierActive = true for future rolls this turn
- **Turn Score**: rollTotal is added to turnScore (not doubled)
- **Example**: Double 3s (3,3) → opponent gets +6, turnScore += 6, multiplier activated

#### 2. Snake Eyes (Double 1s)
- **Turn Score**: turnScore += 20
- **Opponent Penalty**: opponent.gameScore += 20  
- **Multiplier**: Sets multiplierActive = true for future rolls this turn

#### 3. Double 6s
- **Treated same as other doubles**: opponent.gameScore += 12, multiplier activated
- **No special reset behavior** (unlike classic mode)

#### 4. Multiplier System
- **Activation**: Set to true when any double is rolled
- **Effect**: All subsequent rolls in the same turn are doubled when added to turnScore
- **Reset**: Cleared when turn ends (banking or turn switch)

#### 5. Bust Rule
- **Condition**: If banking would make gameScore < 0
- **Action**: No subtraction is applied to gameScore
- **Reset**: turnScore resets to 0, multiplier resets to false
- **Turn**: Turn continues (player doesn't lose turn)

## Implementation Details

### File Locations
- **Game Mode Definition**: `src/services/gameModeService.ts` (lines 122-164)
- **Roll Processing**: `src/services/matchService.ts` (processGameRules method)
- **Banking Logic**: `src/services/matchService.ts` (bankScore method)

### Key Code Sections

#### Roll Processing (Zero Hour specific)
```typescript
// Zero Hour specific processing in processGameRules()
if (gameMode.id === 'zero-hour') {
  const hasMultiplier = matchData.gameData.hasDoubleMultiplier || false;
  
  if (isDoubleOne) {
    // Snake Eyes: +20 to turn score and opponent, activate multiplier
    newTurnScore = currentTurnScore + 20;
    opponentScore += 20;
    activateMultiplier = true;
  }
  else if (isDouble) {
    // Any other double: add roll total to turn score and opponent, activate multiplier
    newTurnScore = currentTurnScore + diceSum;
    opponentScore += diceSum;
    activateMultiplier = true;
  }
  else {
    // Normal roll: apply multiplier if active
    const scoreToAdd = hasMultiplier ? diceSum * 2 : diceSum;
    newTurnScore = currentTurnScore + scoreToAdd;
  }
}
```

#### Banking Logic (Zero Hour specific)
```typescript
// Banking logic in bankScore()
if (gameMode.rules.scoreDirection === 'down') {
  const proposedScore = currentScore - turnScore;
  
  if (proposedScore < 0) {
    // Bust rule: banking fails, score unchanged, turn score resets
    bankingSuccess = false;
    newPlayerScore = currentScore;
  } else {
    // Successful banking
    newPlayerScore = proposedScore;
    if (newPlayerScore === 0) {
      // Victory condition
      gameOver = true;
    }
  }
}
```

## Game Flow Example

### Example Turn:
1. **Start**: Player has 45 points, turnScore = 0
2. **Roll 1**: (3,4) → turnScore = 7
3. **Roll 2**: (5,5) → Double! opponent gets +10, turnScore = 17, multiplier ON
4. **Roll 3**: (2,6) → With multiplier: turnScore = 17 + (8*2) = 33
5. **Bank**: 45 - 33 = 12 points remaining

### Example Bust:
1. **Start**: Player has 8 points, turnScore = 15  
2. **Attempt Bank**: 8 - 15 = -7 (would go below 0)
3. **Bust Result**: Score stays 8, turnScore resets to 0, multiplier off

### Example Victory:
1. **Start**: Player has 12 points, turnScore = 12
2. **Bank**: 12 - 12 = 0 exactly
3. **Victory**: Player wins Zero Hour!

## Status: ✅ IMPLEMENTED
All Zero Hour rules have been implemented and tested. The game mode is ready for play.
