# Game Mode System - ACTUAL Implementation Documentation

## Table of Contents
1. [Game Mode Architecture](#game-mode-architecture)
2. [Supported Game Modes](#supported-game-modes)
3. [Game Mode Configuration](#game-mode-configuration)
4. [Rules Engine](#rules-engine)
5. [Mode-Specific Logic](#mode-specific-logic)
6. [Integration with Matchmaking](#integration-with-matchmaking)
7. [Performance and Issues](#performance-and-issues)

---

## Game Mode Architecture

### Core Game Mode Service
**Location**: `src/services/gameModeService.ts` (545 lines)

The GameModeService handles all game mode logic, configuration, and rule management. It follows a dual-source pattern:

1. **Primary**: Attempts to fetch from Firestore `gameModes` collection
2. **Fallback**: Uses hardcoded default configurations when Firestore is empty

```typescript
export class GameModeService {
  // Main entry point - fetches modes from Firestore or defaults
  static async getAvailableGameModes(platform: 'desktop' | 'mobile'): Promise<GameMode[]>
  
  // Get specific mode configuration
  static async getGameMode(modeId: string): Promise<GameMode | null>
  
  // Initialize mode-specific data structures
  static initializeModeData(mode: GameMode, players: string[]): any
  
  // Mode validation and rules
  static validateModeTransition(from: GameMode, to: GameMode): boolean
  static getDefaultGameModes(platform: 'desktop' | 'mobile'): GameMode[]
}
```

### Game Mode Interface Structure
```typescript
interface GameMode {
  id: string;                    // Unique mode identifier
  name: string;                  // Display name
  description: string;           // Mode description
  platforms: ('desktop' | 'mobile')[]; // Supported platforms
  isActive: boolean;             // Whether mode is available
  
  // Core game rules
  rules: {
    maxPlayers: number;          // Maximum players (usually 2)
    minPlayers: number;          // Minimum players (usually 2)
    roundObjective: number;      // Target score to win
    startingScore: number;       // Starting score (usually 0)
    winCondition: 'first_to_target' | 'highest_score' | 'last_standing';
    timeLimit?: number;          // Optional time limit in minutes
    
    // Special rules per mode
    specialRules: {
      bankingRequired?: boolean;
      doublesPenalty?: boolean;
      riskMultiplier?: number;
      eliminationScore?: number;
    };
  };
  
  // Mode settings
  settings: {
    allowSpectators: boolean;
    isRanked: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    category: 'classic' | 'arcade' | 'challenge';
  };
  
  // Display and UI
  ui: {
    backgroundColor: string;
    iconPath: string;
    thumbnailPath: string;
    soundEffects?: string[];
  };
}
```

---

## Supported Game Modes

### 1. **Classic Mode** (`classic`)
**First to 100 points wins, players take turns and bank**

```typescript
{
  id: 'classic',
  name: 'Classic Mode',
  description: 'First to 100 points wins, players take turns and bank',
  rules: {
    startingScore: 0,
    targetScore: 100,
    allowBanking: true,
    allowDoubleRolls: true,
    scoreDirection: 'up',
    eliminationRules: {
      singleOne: false,         // Single 1s end turn, don't eliminate
      doubleOne: false,         // Double 1s give +20 and continue turn
      doubleSix: 'reset'        // Double 6s reset player score to 0
    }
  },
  settings: {
    timePerTurn: 30,
    estimatedDuration: 15,
    minPlayers: 2,
    maxPlayers: 4
  }
}
```

**Classic Rules Logic**:
- Players start at 0 points, race to 100
- Take turns rolling two dice, add to turn score
- Can "bank" turn score to add to total, or continue rolling
- **Snake Eyes (1,1)**: +20 points to turn score, continue turn
- **Double Sixes (6,6)**: Reset player total score to 0, end turn
- **Single One**: End turn, lose all unbanked turn score
- **Other Doubles (2,2-5,5)**: 2x multiplier for rest of turn

### 2. **Zero Hour Mode** (`zero-hour`)
**Start at 100, bank to subtract from score, first to reach exactly 0 wins**

```typescript
{
  id: 'zero-hour',
  name: 'Zero Hour',
  description: 'Start at 100, bank to subtract from score, first to reach exactly 0 wins',
  rules: {
    startingScore: 100,
    targetScore: 0,
    allowBanking: true,
    allowDoubleRolls: true,
    scoreDirection: 'down',
    eliminationRules: {
      singleOne: false,
      doubleOne: false,
      doubleSix: 'ignore'     // Doubles don't reset in Zero Hour
    },
    specialRules: {
      exactScoreRequired: true,
      multiplierSystem: true
    }
  },
  settings: {
    timePerTurn: 45,
    estimatedDuration: 15,
    minPlayers: 2,
    maxPlayers: 4
  }
}
```

**Zero Hour Rules Logic**:
- Both players start at 100 points
- First to reach exactly 0 wins
- **Snake Eyes (1,1)**: +20 to turn score, +20 to opponent, activate 2x multiplier
- **Any other double**: +roll total to turn score, +roll total to opponent, activate 2x multiplier
- **Normal rolls**: Add to turn score (doubled if multiplier active)
- **Banking**: Subtract turn score from your total
- **Bust Rule**: If banking would go below 0, score unchanged, turn score resets
### 3. **Last Line Mode** (`last-line`)
**Tug-of-war mode: start at 50 each, roll totals transfer between players**

```typescript
{
  id: 'last-line',
  name: 'Last Line',
  description: 'Tug-of-war mode: start at 50 each, roll totals transfer between players, first to reach 0 loses',
  rules: {
    startingScore: 50,
    targetScore: 0,           // Win when opponent reaches 0
    allowBanking: true,       // Re-enable banking for tug-of-war on bank
    allowDoubleRolls: true,
    scoreDirection: 'tug-of-war',
    eliminationRules: {
      singleOne: false,       // Single 1 ends turn but doesn't eliminate
      doubleOne: false,       // Double 1 has special x20 rule
      doubleSix: 'score'      // Double 6 scores with multiplier
    },
    specialRules: {
      tugOfWar: true,         // Enable tug-of-war mechanics
      combinedScoreCap: 100,  // Combined score never exceeds 100
      doubleMultiplier: true  // Doubles apply multiplier = die value
    }
  },
  settings: {
    timePerTurn: 30,
    estimatedDuration: 5,
    minPlayers: 2,
    maxPlayers: 2           // Strictly 2-player mode
  }
}
```

**Last Line Rules Logic**:
- Both players start at 50 points (combined total = 100)
- **Tug-of-war**: Points transfer between players
- **Double 1s**: +20 to turn score
- **Other doubles**: Apply 2x multiplier to dice sum, activate 2x for future rolls
- **Banking**: Current turn score is transferred from opponent to you
- **Win condition**: Opponent reaches 0 points (you reach 100)

### 4. **True Grit Mode** (`true-grit`)
**Each player gets one turn only, roll until single 1 ends turn, highest score wins**

```typescript
{
  id: 'true-grit',
  name: 'True Grit',
  description: 'Each player gets one turn only, roll until single 1 ends turn, highest score wins',
  rules: {
    startingScore: 0,
    targetScore: 999999,     // No target score, highest wins
    allowBanking: false,     // No banking allowed
    allowDoubleRolls: true,
    scoreDirection: 'up',
    eliminationRules: {
      singleOne: true,       // Single 1 ends turn (auto-banks score)
      doubleOne: false,      // Double 1 gets special x7 multiplier
      doubleSix: 'score'     // Double 6 scores normally
    },
    specialRules: {
      multiplierSystem: true,
      exactScoreRequired: false,
      doublesEffects: {
        'double1': { scoreBonus: 0, multiplier: 7 },  // Snake Eyes = x7
        'double2': { scoreBonus: 0, multiplier: 2 },  // Double 2s = x2
        'double3': { scoreBonus: 0, multiplier: 3 },  // Double 3s = x3
        'double4': { scoreBonus: 0, multiplier: 4 },  // Double 4s = x4
        'double5': { scoreBonus: 0, multiplier: 5 },  // Double 5s = x5
        'double6': { scoreBonus: 0, multiplier: 6 }   // Double 6s = x6
      }
    }
  },
  settings: {
    timePerTurn: 60,
    estimatedDuration: 5,
    minPlayers: 2,
    maxPlayers: 4
  }
}
```

**True Grit Rules Logic**:
- Each player gets exactly one turn
- Roll continuously until single 1 ends turn
- **Single 1**: Auto-bank current turn score, end turn
- **Doubles**: Apply special multiplier (1s=x7, 2s=x2, 3s=x3, etc.)
- **Normal rolls**: Add to turn score (with any active multiplier)
- **Winner**: Player with highest final score after all turns

### 6. **Tag Team Mode** (`tagteam`)
**Team-based cooperative gameplay**

```typescript
{
  id: 'tagteam',
  name: 'Tag Team',
  description: 'Team-based cooperative dice gameplay',
  rules: {
    maxPlayers: 4,              // 2v2 teams
    minPlayers: 4,
    roundObjective: 200,        // Team target
    startingScore: 0,
    winCondition: 'first_to_target',
    specialRules: {
      teamPlay: true,
      sharedScore: true,         // Team members share score
      tagSystem: true,           // Players can "tag" teammates
      cooperativeBonus: true,    // Bonus for team coordination
      riskMultiplier: 1.2
    }
  },
  settings: {
    allowSpectators: true,
    isRanked: false,            // Not ranked due to team complexity
    difficulty: 'medium',
    category: 'arcade'
  }
}
```

**Tag Team Rules Logic**:
- 2v2 team format (4 players total)
- Shared team score pool
- Players can "tag" teammates to pass turn
- Cooperative bonuses for coordinated play
- Team-based victory conditions

---

## Game Mode Configuration

### Configuration Loading System
```typescript
export class GameModeService {
  static async getAvailableGameModes(platform: 'desktop' | 'mobile'): Promise<GameMode[]> {
    try {
      // 1. Try Firestore first
      const q = query(
        collection(db, 'gameModes'),
        where('isActive', '==', true),
        where('platforms', 'array-contains', platform)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.docs.length > 0) {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GameMode[];
      }
      
      // 2. Fallback to defaults
      console.log('No game modes found in Firestore, using default modes');
      return this.getDefaultGameModes(platform);
      
    } catch (error) {
      console.error('Error fetching game modes:', error);
      return this.getDefaultGameModes(platform);
    }
  }
}
```

### Mode Configuration Mapping
The system uses a configuration object that maps mode strings to display configurations:

```typescript
// Located in GameWaitingRoom component
const gameModeConfig = {
  'classic': { name: 'Classic', description: 'Traditional dice rolling' },
  'quickfire': { name: 'Quickfire', description: 'Fast-paced dice action' },
  'zero-hour': { name: 'Zero Hour', description: 'High-stakes time pressure' },
  'zerohour': { name: 'Zero Hour', description: 'High-stakes time pressure' },
  'last-line': { name: 'Last Line', description: 'Defensive gameplay' },
  'lastline': { name: 'Last Line', description: 'Defensive gameplay' },
  'true-grit': { name: 'True Grit', description: 'Hardcore challenge' },
  'truegrit': { name: 'True Grit', description: 'Hardcore challenge' },
  'tagteam': { name: 'Tag Team', description: 'Team-based gameplay' }
};
```

**Note**: The system supports both hyphenated and non-hyphenated versions for compatibility.

---

## Rules Engine

### Core Rules Processing
The rules engine handles mode-specific game logic:

```typescript
export class GameRulesEngine {
  // Apply mode-specific rules to game state
  static applyModeRules(gameState: GameState, mode: GameMode): GameState {
    switch (mode.id) {
      case 'classic':
        return this.applyClassicRules(gameState, mode);
      case 'quickfire':
        return this.applyQuickfireRules(gameState, mode);
      case 'zero-hour':
        return this.applyZeroHourRules(gameState, mode);
      // ... other modes
    }
  }
  
  // Check win conditions
  static checkWinCondition(gameState: GameState, mode: GameMode): boolean {
    const { rules } = mode;
    
    switch (rules.winCondition) {
      case 'first_to_target':
        return gameState.playerScore >= rules.roundObjective;
      case 'last_standing':
        return gameState.opponentScore <= rules.eliminationScore;
      case 'highest_score':
        return gameState.timeRemaining <= 0; // Time-based win
    }
  }
}
```

### Score Calculation System
```typescript
// Mode-specific score calculations
static calculateScore(diceOne: number, diceTwo: number, mode: GameMode): number {
  const sum = diceOne + diceTwo;
  const baseScore = sum;
  
  // Apply mode-specific multipliers
  if (mode.rules.specialRules.riskMultiplier) {
    return Math.floor(baseScore * mode.rules.specialRules.riskMultiplier);
  }
  
  return baseScore;
}

// Doubles penalty logic
static checkDoublesPenalty(diceOne: number, diceTwo: number, mode: GameMode): boolean {
  if (!mode.rules.specialRules.doublesPenalty) return false;
  
  // Standard doubles (1,1) and (6,6)
  return (diceOne === 1 && diceTwo === 1) || (diceOne === 6 && diceTwo === 6);
}
```

---

## Mode-Specific Logic

### Classic Mode Implementation
```typescript
private static applyClassicRules(gameState: GameState, mode: GameMode): GameState {
  const { diceOne, diceTwo, roundScore } = gameState;
  
  // Check for doubles penalty
  if (this.checkDoublesPenalty(diceOne, diceTwo, mode)) {
    return {
      ...gameState,
      roundScore: 0,           // Lose round score
      turnActive: false,       // End turn
      message: 'Doubles! Turn ended, round score lost.'
    };
  }
  
  // Normal scoring
  const score = this.calculateScore(diceOne, diceTwo, mode);
  return {
    ...gameState,
    roundScore: roundScore + score
  };
}
```

### Quickfire Mode Implementation  
```typescript
private static applyQuickfireRules(gameState: GameState, mode: GameMode): GameState {
  const { diceOne, diceTwo, roundScore } = gameState;
  
  // No doubles penalty in quickfire
  const score = this.calculateScore(diceOne, diceTwo, mode);
  const newRoundScore = roundScore + score;
  
  // Auto-bank at threshold
  if (newRoundScore >= mode.rules.specialRules.autoBank) {
    return {
      ...gameState,
      playerScore: gameState.playerScore + newRoundScore,
      roundScore: 0,
      turnActive: false,
      message: `Auto-banked ${newRoundScore} points!`
    };
  }
  
  return {
    ...gameState,
    roundScore: newRoundScore
  };
}
```

### Zero Hour Mode Implementation
```typescript
private static applyZeroHourRules(gameState: GameState, mode: GameMode): GameState {
  const { diceOne, diceTwo, roundScore, playerScore } = gameState;
  
  // Hardcore doubles penalty
  if (this.checkDoublesPenalty(diceOne, diceTwo, mode)) {
    const penalty = 5; // Lose 5 banked points
    const newScore = Math.max(0, playerScore - penalty);
    
    return {
      ...gameState,
      playerScore: newScore,
      roundScore: 0,
      turnActive: false,
      message: `Doubles! Lost round score AND ${penalty} banked points!`,
      eliminated: newScore <= 0
    };
  }
  
  // High-risk scoring with multiplier
  const score = this.calculateScore(diceOne, diceTwo, mode);
  return {
    ...gameState,
    roundScore: roundScore + score
  };
}
```

---

## Integration with Matchmaking

### Mode Selection in Matchmaking
```typescript
// MatchmakingService.findOrCreateRoom integration
static async findOrCreateRoom(gameMode: string, hostData: any): Promise<string> {
  // 1. Get mode configuration
  const modeConfig = await GameModeService.getGameMode(gameMode);
  if (!modeConfig) {
    throw new Error(`Invalid game mode: ${gameMode}`);
  }
  
  // 2. Apply mode-specific room settings
  const roomSettings = this.getModeRoomSettings(modeConfig);
  
  // 3. Search for compatible rooms
  const availableRooms = await this.findAvailableRooms(gameMode, roomSettings);
  
  // 4. Create room with mode configuration
  if (availableRooms.length === 0) {
    return this.createRoom(gameMode, hostData, modeConfig);
  }
}
```

### Mode-Specific Room Configuration
```typescript
static getModeRoomSettings(mode: GameMode): RoomSettings {
  return {
    maxPlayers: mode.rules.maxPlayers,
    timeLimit: mode.rules.timeLimit,
    allowSpectators: mode.settings.allowSpectators,
    isRanked: mode.settings.isRanked,
    difficulty: mode.settings.difficulty,
    
    // Mode-specific settings
    roundObjective: mode.rules.roundObjective,
    startingScore: mode.rules.startingScore,
    specialRules: mode.rules.specialRules
  };
}
```

### Match Creation with Mode Data
```typescript
// MatchmakingService.moveToMatches integration
static async moveToMatches(roomId: string): Promise<string> {
  const roomData = await this.getRoomData(roomId);
  const modeConfig = await GameModeService.getGameMode(roomData.gameMode);
  
  const matchData = {
    gameMode: roomData.gameMode,
    modeConfiguration: modeConfig,        // Store full mode config
    
    // Initialize with mode-specific values
    gameData: {
      roundObjective: modeConfig.rules.roundObjective,
      startingScore: modeConfig.rules.startingScore,
      specialRules: modeConfig.rules.specialRules,
      turnDecider: 1,
      diceOne: 0,
      diceTwo: 0,
      status: 'active',
      gamePhase: 'turnDecider' as const
    },
    
    // Initialize player scores with mode values
    hostData: {
      ...roomData.hostData,
      playerScore: modeConfig.rules.startingScore,
      roundScore: 0
    },
    
    opponentData: {
      ...roomData.opponentData,
      playerScore: modeConfig.rules.startingScore,
      roundScore: 0
    }
  };
  
  return this.createMatch(matchData);
}
```

---

## Performance and Issues

### Current Performance Issues

#### 1. **Game Mode Loading**
- **Issue**: "No game modes found in Firestore, using default modes" warning
- **Status**: NOT CRITICAL - System has proper fallback to defaults
- **Root Cause**: Firestore `gameModes` collection is empty
- **Impact**: Uses hardcoded defaults instead of database configuration

#### 2. **Mode Configuration Duplication**
- **Issue**: Game mode configs exist in multiple places
- **Locations**: 
  - `GameModeService.getDefaultGameModes()`
  - `gameModeConfig` object in GameWaitingRoom component
  - Various service methods with hardcoded values
- **Impact**: Configuration drift and maintenance difficulties

#### 3. **Missing Firestore Indexes**
- **Issue**: No indexes for `gameModes` collection queries
- **Query**: `where('isActive', '==', true).where('platforms', 'array-contains', platform)`
- **Impact**: Poor performance when Firestore has game mode data

### Performance Optimizations

#### 1. **Mode Caching**
```typescript
class GameModeService {
  private static modeCache = new Map<string, GameMode>();
  private static cacheExpiry = new Map<string, number>();
  
  static async getGameMode(modeId: string): Promise<GameMode | null> {
    // Check cache first
    if (this.modeCache.has(modeId) && !this.isCacheExpired(modeId)) {
      return this.modeCache.get(modeId);
    }
    
    // Fetch and cache
    const mode = await this.fetchModeFromFirestore(modeId);
    if (mode) {
      this.modeCache.set(modeId, mode);
      this.cacheExpiry.set(modeId, Date.now() + 300000); // 5 min cache
    }
    
    return mode;
  }
}
```

#### 2. **Lazy Loading**
```typescript
// Load modes only when needed
static async getAvailableGameModes(platform: string): Promise<GameMode[]> {
  // Use cached modes if available
  const cacheKey = `modes_${platform}`;
  if (this.modeCache.has(cacheKey)) {
    return this.modeCache.get(cacheKey);
  }
  
  // Lazy load from Firestore or defaults
  const modes = await this.loadModesForPlatform(platform);
  this.modeCache.set(cacheKey, modes);
  return modes;
}
```

### Recommended Improvements

#### 1. **Initialize Firestore Game Modes**
```typescript
// Migration script to populate Firestore with default modes
async function initializeGameModes() {
  const defaultModes = GameModeService.getDefaultGameModes('desktop');
  
  for (const mode of defaultModes) {
    await setDoc(doc(db, 'gameModes', mode.id), mode);
  }
}
```

#### 2. **Add Firebase Indexes**
```json
{
  "collectionGroup": "gameModes",
  "queryScope": "COLLECTION", 
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "platforms", "arrayConfig": "CONTAINS" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
}
```

#### 3. **Consolidate Configuration**
- Move all mode configs to Firestore
- Remove hardcoded configurations
- Implement proper caching strategy
- Add configuration validation

---

**Document Status**: Complete - Game Mode System Analysis  
**Last Updated**: September 4, 2025  
**Next Document**: Core Game Logic & Firebase Architecture
