# 🎮 DashDice Match System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Game Modes](#game-modes)
3. [Match Architecture](#match-architecture)
4. [Game Phases](#game-phases)
5. [Turn Decider System](#turn-decider-system)
6. [Game Logic & Rules](#game-logic--rules)
7. [Dice Animation System](#dice-animation-system)
8. [User Interface Components](#user-interface-components)
9. [Firebase Integration](#firebase-integration)
10. [Adding New Game Modes](#adding-new-game-modes)
11. [Statistics & Analytics](#statistics--analytics)
12. [Error Handling](#error-handling)

## System Overview

The DashDice Match System is a real-time multiplayer dice game built on Firebase Firestore with sophisticated animation, game logic, and state management. The system supports multiple game modes with different scoring objectives and implements complex dice rules with visual feedback.

### Core Technologies
- **Frontend**: React with TypeScript, Framer Motion for animations
- **Backend**: Firebase Firestore for real-time data synchronization
- **State Management**: React Context API with real-time Firebase listeners
- **Animations**: Slot machine-style dice with progressive deceleration

### Key Features
- Real-time multiplayer synchronization
- Progressive dice animation system with near-miss effects
- Complex game rules with visual feedback
- Multiple game modes with different objectives
- Advanced statistics tracking
- Rematch functionality
- Background customization system

## Game Modes

The system supports multiple game modes, each with different scoring objectives and strategic gameplay:

### Current Game Modes

```typescript
// Game Mode Configuration
const GAME_MODES = {
  quickfire: {
    name: 'QUICK FIRE',
    description: 'Fast-paced dice action',
    roundObjective: 50,
    icon: '/Design Elements/finance startup.webp',
    available: true
  },
  classic: {
    name: 'CLASSIC MODE', 
    description: 'Full Force, Full Focus',
    roundObjective: 100,
    icon: '/Design Elements/Crown Mode.webp',
    available: false // Coming soon
  },
  zerohour: {
    name: 'ZERO HOUR',
    description: 'Time Runs Backwards',
    roundObjective: 150,
    icon: '/Design Elements/time out.webp',
    available: false // Coming soon
  },
  lastline: {
    name: 'LAST LINE',
    description: 'One Roll, One Life',
    roundObjective: 200,
    icon: '/Design Elements/skull.webp',
    available: false // Coming soon
  }
};
```

### Round Objectives

Each game mode has a different target score that players must reach to win:

```typescript
static getRoundObjective(gameMode: string): number {
  switch (gameMode.toLowerCase()) {
    case 'quickfire': return 50;   // Fast games, lower target
    case 'classic': return 100;    // Standard gameplay
    case 'zerohour': return 150;   // Extended gameplay
    case 'lastline': return 200;   // Extreme challenge
    default: return 100;           // Default fallback
  }
}
```

## Match Architecture

### Data Structure

The match system uses a comprehensive data structure that integrates with the existing Firebase schema:

```typescript
interface MatchData {
  id?: string;
  createdAt: Timestamp;
  gameMode: string;           // Game mode identifier
  gameType: string;           // Match type (live, custom, etc.)
  
  // Player Data
  hostData: PlayerData;       // Host player information
  opponentData: PlayerData;   // Opponent player information
  
  // Game State
  gameData: {
    type: string;
    settings: any;
    turnDecider: number;      // 1 = host, 2 = opponent
    turnScore: number;        // Current turn accumulated score
    diceOne: number;          // First dice value
    diceTwo: number;          // Second dice value
    roundObjective: number;   // Target score to win
    startingScore: number;    // Starting player scores
    status: 'active' | 'completed' | 'abandoned';
    startedAt: Timestamp;
    
    // Game Flow Control
    gamePhase: 'turnDecider' | 'gameplay' | 'gameOver';
    isRolling: boolean;       // Animation state
    rollPhase?: 'dice1' | 'dice2';
    turnDeciderChoice?: 'odd' | 'even';
    turnDeciderDice?: number;
    winner?: string;
    gameOverReason?: string;
    hasDoubleMultiplier?: boolean; // 2x scoring active
  };
}
```

### Player Data Structure

```typescript
interface PlayerData {
  playerDisplayName: string;
  playerId: string;
  displayBackgroundEquipped: any;
  matchBackgroundEquipped: any;
  playerStats: {
    bestStreak: number;
    currentStreak: number;
    gamesPlayed: number;
    matchWins: number;
  };
  
  // Game State
  turnActive: boolean;
  playerScore: number;        // Total banked score
  roundScore: number;         // Legacy field
  
  // Match Statistics
  matchStats: {
    banks: number;            // Number of times player banked
    doubles: number;          // Number of doubles rolled
    biggestTurnScore: number; // Highest single turn score
    lastDiceSum: number;      // Most recent dice total
  };
}
```

## Game Phases

The match system operates in three distinct phases:

### 1. Turn Decider Phase (`turnDecider`)

**Purpose**: Determine which player goes first through an odd/even dice choice.

**Flow**:
1. System randomly assigns a player to make the choice (turnDecider: 1 or 2)
2. Assigned player chooses "ODD" or "EVEN"
3. Single dice is rolled with 1.5-second animation
4. If player's choice matches dice parity, they go first
5. System transitions to gameplay phase

```typescript
// Turn Decider Implementation
const handleTurnDeciderChoice = async (choice: 'odd' | 'even') => {
  await MatchService.makeTurnDeciderChoice(matchId, playerId, choice);
};

// Server processes the choice
static async makeTurnDeciderChoice(matchId: string, playerId: string, choice: TurnDeciderChoice) {
  const dice = Math.floor(Math.random() * 6) + 1;
  
  await updateDoc(matchRef, {
    'gameData.turnDeciderChoice': choice,
    'gameData.turnDeciderDice': dice,
    'gameData.isRolling': true,
  });
  
  // Process result after animation
  setTimeout(() => this.processTurnDecider(matchId), 3000);
}
```

### 2. Gameplay Phase (`gameplay`)

**Purpose**: Main game loop where players take turns rolling dice and banking scores.

**Core Mechanics**:
- Players alternate turns rolling two dice
- Turn scores accumulate until banked or lost
- Special rules apply based on dice combinations
- First player to reach round objective wins

**Turn Flow**:
1. Active player rolls dice (1.2-second animation per die)
2. Game rules are processed based on dice values
3. Player can continue rolling or bank their turn score
4. Turn switches on banking or certain dice combinations

### 3. Game Over Phase (`gameOver`)

**Purpose**: Display final results, statistics, and provide rematch options.

**Features**:
- Winner announcement with celebration effects
- Detailed match statistics comparison
- Individual player performance metrics
- Rematch system with timeout handling
- Navigation back to dashboard

## Turn Decider System

The turn decider system ensures fair game starts through a choice-based dice roll:

### Implementation Details

```typescript
// Turn Decider Logic
private static async processTurnDecider(matchId: string): Promise<void> {
  const matchData = await getDoc(matchRef);
  const choice = matchData.gameData.turnDeciderChoice;
  const dice = matchData.gameData.turnDeciderDice;
  const turnDeciderPlayer = matchData.gameData.turnDecider;
  
  const isOdd = dice % 2 === 1;
  const choiceCorrect = (choice === 'odd' && isOdd) || (choice === 'even' && !isOdd);
  
  let hostGoesFirst = false;
  if (turnDeciderPlayer === 1) {
    hostGoesFirst = choiceCorrect;  // Host made choice
  } else {
    hostGoesFirst = !choiceCorrect; // Opponent made choice
  }
  
  // Start gameplay with determined turn order
  await updateDoc(matchRef, {
    'gameData.gamePhase': 'gameplay',
    'hostData.turnActive': hostGoesFirst,
    'opponentData.turnActive': !hostGoesFirst,
  });
}
```

### UI Component

```typescript
// TurnDeciderPhase.tsx - Choice Interface
{!hasChoice && isMyTurnToDecide && (
  <div className="flex gap-6 justify-center">
    <button onClick={() => onChoiceSelect('odd')}>ODD</button>
    <button onClick={() => onChoiceSelect('even')}>EVEN</button>
  </div>
)}

// Result Display
{hasDice && (
  <p>
    Result: {dice} ({dice % 2 === 0 ? 'EVEN' : 'ODD'})
    {determineWhoGoesFirst()} GO FIRST!
  </p>
)}
```

## Game Logic & Rules

The game implements sophisticated dice rules with multipliers and special conditions:

### Core Game Rules

```typescript
const GAME_RULES = {
  SINGLE_ONE: 'Single 1: Turn over, no score added to player total',
  DOUBLE_SIX: 'Double 6: Turn over, player score reset to 0', 
  SNAKE_EYES: 'Double 1 (Snake Eyes): +20 to turn score, continue playing',
  DOUBLE_MULTIPLIER: 'Any Other Double: 2x multiplier for rest of turn (22, 33, 44, 55)',
  NORMAL_SCORING: 'Normal: Add dice sum to turn score (2x if multiplier active)',
  BANKING: 'Bank score: Add turn score to player total, switch turns',
  WIN_CONDITION: 'First to reach round objective wins',
} as const;
```

### Rule Processing Implementation

```typescript
private static async processGameRules(matchId: string, dice1: number, dice2: number, isHost: boolean) {
  let turnOver = false;
  let resetPlayerScore = false;
  let newTurnScore = currentTurnScore;
  let gameOver = false;
  let winner = '';
  
  // Rule 1: Single 1 - Turn over, no score
  if ((dice1 === 1 && dice2 !== 1) || (dice2 === 1 && dice1 !== 1)) {
    turnOver = true;
    newTurnScore = 0;
  }
  // Rule 2: Double 6 - Reset player score to 0
  else if (dice1 === 6 && dice2 === 6) {
    turnOver = true;
    resetPlayerScore = true;
    newTurnScore = 0;
  }
  // Rule 3: Snake Eyes - +20 and continue
  else if (dice1 === 1 && dice2 === 1) {
    newTurnScore = currentTurnScore + 20;
    turnOver = false;
  }
  // Rule 4: Other Doubles - Activate 2x multiplier
  else if (dice1 === dice2) {
    const diceSum = dice1 + dice2;
    newTurnScore = currentTurnScore + diceSum;
    setDoubleMultiplier = true;
    turnOver = false;
  }
  // Normal scoring with multiplier consideration
  else {
    const diceSum = dice1 + dice2;
    const scoreToAdd = currentMultiplier ? diceSum * 2 : diceSum;
    newTurnScore = currentTurnScore + scoreToAdd;
    turnOver = false;
  }
  
  // Auto-win logic
  if (currentPlayerScore + newTurnScore >= roundObjective && !turnOver) {
    gameOver = true;
    winner = currentPlayer.playerDisplayName;
    // Auto-bank the winning score
    playerScore = currentPlayerScore + newTurnScore;
    newTurnScore = 0;
  }
  
  // Apply updates to Firebase
  await updateDoc(matchRef, updates);
}
```

### Banking System

```typescript
static async bankScore(matchId: string, playerId: string): Promise<void> {
  const transaction = runTransaction(db, async (transaction) => {
    const matchData = await transaction.get(matchRef);
    const currentTurnScore = matchData.gameData.turnScore;
    
    if (isHost) {
      const newScore = matchData.hostData.playerScore + currentTurnScore;
      transaction.update(matchRef, {
        'hostData.playerScore': newScore,
        'hostData.turnActive': false,
        'hostData.matchStats.banks': increment(1),
        'opponentData.turnActive': true,
        'gameData.turnScore': 0,
        'gameData.hasDoubleMultiplier': false,
      });
    }
    // Similar logic for opponent...
  });
}
```

## Dice Animation System

The dice animation system provides cinematic slot machine-style rolling with progressive deceleration:

### Animation Specifications

```typescript
/**
 * 🎰 DICE REEL ANIMATION SYSTEM
 * 
 * Animation Durations:
 * - Dice 1 & 2: 1200ms (1.2 seconds)
 * - Turn Decider: 1500ms (1.5 seconds)
 * 
 * 3-Phase Speed Progression:
 * 
 * Phase 1 (0-70%): Fast Spinning
 * - Speed: 60ms → 88ms intervals
 * - Background Reel: 0.1s (very fast)
 * 
 * Phase 2 (70-90%): Deceleration  
 * - Speed: 88ms → 200ms intervals
 * - Background Reel: 0.1s → 0.5s (slowing)
 * 
 * Phase 3 (90-100%): Final Slow
 * - Speed: 200ms → 500ms intervals  
 * - Background Reel: 0.5s → 2.0s (very slow)
 */
```

### Animation Implementation

```typescript
const startSlotMachineAnimation = (
  diceNumber: 1 | 2 | 'turnDecider', 
  finalValue: number,
  animationDuration: number = 1200
) => {
  // Initialize spinning state
  setDiceState({
    isSpinning: true,
    currentNumber: Math.floor(Math.random() * 6) + 1,
    finalNumber: null,
    reelSpeed: 0.1
  });

  // Progressive deceleration system
  let currentSpeed = 60; // Initial 60ms intervals
  let elapsedTime = 0;
  let intervalId: NodeJS.Timeout;
  
  const animateReel = () => {
    elapsedTime += currentSpeed;
    const progress = elapsedTime / animationDuration;
    
    // 3-Phase speed progression
    if (progress < 0.7) {
      // Phase 1: Fast spinning
      currentSpeed = 60 + (progress / 0.7) * 28; // 60ms → 88ms
      reelAnimationSpeed = 0.1;
    } else if (progress < 0.9) {
      // Phase 2: Deceleration
      const phase2Progress = (progress - 0.7) / 0.2;
      currentSpeed = 88 + phase2Progress * 112; // 88ms → 200ms
      reelAnimationSpeed = 0.1 + phase2Progress * 0.4; // 0.1s → 0.5s
    } else {
      // Phase 3: Final slow
      const phase3Progress = (progress - 0.9) / 0.1;
      currentSpeed = 200 + phase3Progress * 300; // 200ms → 500ms
      reelAnimationSpeed = 0.5 + phase3Progress * 1.5; // 0.5s → 2.0s
    }
    
    // Update dice number and reel speed
    setDiceState(prev => ({
      ...prev,
      currentNumber: Math.floor(Math.random() * 6) + 1,
      reelSpeed: reelAnimationSpeed
    }));
    
    if (elapsedTime < animationDuration) {
      intervalId = setTimeout(animateReel, currentSpeed);
    }
  };

  animateReel();

  // Near miss effect at 60% duration
  const nearMissTimeout = setTimeout(() => {
    if (Math.random() < 0.7) { // 70% chance
      setDiceState(prev => ({
        ...prev,
        currentNumber: 6 // Briefly show exciting number
      }));
    }
  }, animationDuration * 0.6);

  // Final overshoot and tick-back effect
  setTimeout(() => {
    clearTimeout(intervalId);
    clearTimeout(nearMissTimeout);
    
    // Show wrong number briefly (overshoot)
    const overshoot = finalValue < 6 ? finalValue + 1 : finalValue - 1;
    setDiceState({
      isSpinning: false,
      currentNumber: overshoot,
      finalNumber: finalValue,
      reelSpeed: 0.1
    });

    // Tick back to correct value after 150ms
    setTimeout(() => {
      setDiceState({
        isSpinning: false,
        currentNumber: finalValue,
        finalNumber: finalValue,
        reelSpeed: 0.1
      });
    }, 150);
    
  }, animationDuration);
};
```

### Visual Effects System

```typescript
// Conditional glow effects for special dice combinations
const getDiceNumberGlow = () => {
  const dice1Value = matchData?.gameData.diceOne;
  const dice2Value = matchData?.gameData.diceTwo;
  
  // Numbers 2, 3, 4, 5 never glow
  if (displayValue === 2 || displayValue === 3 || displayValue === 4 || displayValue === 5) {
    return { shouldGlow: false, color: '', intensity: '' };
  }
  
  // Snake Eyes - Gold glow
  if (dice1Value === 1 && dice2Value === 1) {
    return { 
      shouldGlow: true, 
      color: '#FFD700', 
      intensity: '0 0 10px rgba(255, 215, 0, 0.7), 0 0 20px rgba(255, 215, 0, 0.5)' 
    };
  }
  
  // Double 6s - Big red glow
  if (dice1Value === 6 && dice2Value === 6) {
    return { 
      shouldGlow: true, 
      color: '#FF0000', 
      intensity: '0 0 12px rgba(255, 0, 0, 0.8), 0 0 24px rgba(255, 0, 0, 0.6)' 
    };
  }
  
  // Single 1s - Red warning glow
  if ((dice1Value === 1 && dice2Value !== 1) || (dice2Value === 1 && dice1Value !== 1)) {
    return { 
      shouldGlow: true, 
      color: '#FF0000', 
      intensity: '0 0 8px rgba(255, 0, 0, 0.6), 0 0 16px rgba(255, 0, 0, 0.4)' 
    };
  }
  
  return { shouldGlow: false, color: '', intensity: '' };
};
```

## User Interface Components

### Component Architecture

The match UI is composed of modular phase-specific components:

```
Match.tsx (Main Container)
├── TurnDeciderPhase.tsx    // Odd/Even choice interface
├── GameplayPhase.tsx       // Main game interface
├── GameOverPhase.tsx       // Results and rematch
└── SlotMachineDice.tsx     // Reusable dice animation
```

### Main Match Component

```typescript
// Match.tsx - Core component structure
export const Match: React.FC<MatchProps> = ({ matchId }) => {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [dice1Animation, setDice1Animation] = useState(initialDiceState);
  const [dice2Animation, setDice2Animation] = useState(initialDiceState);
  const [turnDeciderDiceAnimation, setTurnDeciderDiceAnimation] = useState(initialDiceState);

  // Real-time match data subscription
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (doc) => {
      if (doc.exists()) {
        setMatchData({ id: doc.id, ...doc.data() } as MatchData);
      }
    });
    return () => unsubscribe();
  }, [matchId]);

  // Animation triggers based on game state
  useEffect(() => {
    if (!matchData) return;

    // Turn decider animation
    if (matchData.gameData.gamePhase === 'turnDecider' && 
        matchData.gameData.turnDeciderChoice && 
        matchData.gameData.turnDeciderDice && 
        !turnDeciderDiceAnimation.isSpinning) {
      startSlotMachineAnimation('turnDecider', matchData.gameData.turnDeciderDice, 1500);
    }

    // Gameplay dice animations
    if (matchData.gameData.isRolling && matchData.gameData.rollPhase === 'dice1' && 
        matchData.gameData.diceOne > 0 && !dice1Animation.isSpinning) {
      startSlotMachineAnimation(1, matchData.gameData.diceOne, 1200);
    }

    if (matchData.gameData.isRolling && matchData.gameData.rollPhase === 'dice2' && 
        matchData.gameData.diceTwo > 0 && !dice2Animation.isSpinning) {
      startSlotMachineAnimation(2, matchData.gameData.diceTwo, 1200);
    }
  }, [matchData?.gameData]);

  // Render appropriate phase component
  return (
    <div className="match-container">
      {matchData?.gameData.gamePhase === 'turnDecider' && (
        <TurnDeciderPhase {...props} />
      )}
      {matchData?.gameData.gamePhase === 'gameplay' && (
        <GameplayPhase {...props} />
      )}
      {matchData?.gameData.gamePhase === 'gameOver' && (
        <GameOverPhase {...props} />
      )}
    </div>
  );
};
```

### Gameplay Phase Interface

```typescript
// GameplayPhase.tsx - Main game interface
export const GameplayPhase: React.FC<GameplayPhaseProps> = ({
  matchData, currentPlayer, opponent, isHost,
  dice1Animation, dice2Animation, onRollDice, onBankScore
}) => {
  const isMyTurn = currentPlayer.turnActive;
  const canRoll = isMyTurn && !matchData.gameData.isRolling;
  const canBank = isMyTurn && !matchData.gameData.isRolling && matchData.gameData.turnScore > 0;

  return (
    <div className="gameplay-container">
      {/* Game Status Display */}
      <motion.div className="game-status">
        {isMyTurn ? (
          <div>
            <p className="text-2xl font-bold text-blue-400">YOUR TURN</p>
            {matchData.gameData.hasDoubleMultiplier && (
              <p className="text-lg text-purple-400 animate-pulse">
                🔥 2x MULTIPLIER ACTIVE! 🔥
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-2xl font-bold text-yellow-400">YOUR TURN</p>
            <p className="text-lg text-gray-300">
              Waiting for {opponent.playerDisplayName}
            </p>
          </div>
        )}
      </motion.div>

      {/* Dice Container */}
      <div className="relative flex flex-col gap-4">
        <SlotMachineDice
          diceNumber={1}
          animationState={dice1Animation}
          matchRollPhase={matchData.gameData.rollPhase}
          actualValue={matchData.gameData.diceOne}
          isGameRolling={matchData.gameData.isRolling}
          matchData={matchData}
        />

        {/* Turn Score - Positioned between dice */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-yellow-600/30 border-2 border-yellow-500 rounded-2xl px-8 py-4">
            <p className="text-lg text-yellow-300">Turn Score</p>
            <p className="text-4xl font-bold text-yellow-400">
              {matchData.gameData.turnScore}
            </p>
          </div>

          {/* 2X Multiplier Indicator */}
          {matchData.gameData.hasDoubleMultiplier && (
            <motion.div 
              className="absolute -right-24 top-1/2 transform -translate-y-1/2 
                         bg-red-600/40 border-2 border-red-400 rounded-xl px-4 py-2"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-2xl font-bold text-red-300">2X</p>
            </motion.div>
          )}
        </div>

        <SlotMachineDice
          diceNumber={2}
          animationState={dice2Animation}
          matchRollPhase={matchData.gameData.rollPhase}
          actualValue={matchData.gameData.diceTwo}
          isGameRolling={matchData.gameData.isRolling}
          matchData={matchData}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onRollDice}
          disabled={!canRoll}
          className={`px-12 py-6 rounded-xl text-2xl font-bold transition-all ${
            canRoll ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105' 
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
          }`}
        >
          PLAY
        </button>
        
        <button
          onClick={onBankScore}
          disabled={!canBank}
          className={`px-12 py-6 rounded-xl text-2xl font-bold transition-all ${
            canBank ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
          }`}
        >
          BANK
        </button>
      </div>
    </div>
  );
};
```

### Game Over Phase

```typescript
// GameOverPhase.tsx - Results and rematch interface
export const GameOverPhase: React.FC<GameOverPhaseProps> = ({
  matchData, onLeaveMatch, onRematch
}) => {
  const [rematchState, setRematchState] = useState<RematchState>('idle');
  const winner = matchData.gameData.winner;

  return (
    <div className="game-over-container">
      {/* Winner Announcement */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-6xl font-bold text-white">GAME OVER</h1>
        <div className="bg-gradient-to-r from-yellow-600/30 to-orange-600/30 
                        border-2 border-yellow-500 rounded-2xl p-8">
          <p className="text-2xl text-yellow-300">🏆 WINNER 🏆</p>
          <p className="text-4xl font-bold text-yellow-400">{winner}</p>
        </div>
      </motion.div>

      {/* Final Scores */}
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white/10 rounded-2xl p-6">
          <p className="text-xl font-bold text-white">
            {matchData.hostData.playerDisplayName}
          </p>
          <p className="text-3xl font-bold text-white">
            {matchData.hostData.playerScore}
          </p>
        </div>
        <div className="bg-white/10 rounded-2xl p-6">
          <p className="text-xl font-bold text-white">
            {matchData.opponentData.playerDisplayName}
          </p>
          <p className="text-3xl font-bold text-white">
            {matchData.opponentData.playerScore}
          </p>
        </div>
      </div>

      {/* Match Statistics */}
      <div className="grid grid-cols-3 gap-8 bg-black/20 rounded-2xl p-6">
        {/* Host Stats */}
        <div className="text-center">
          <h4 className="text-yellow-400">{matchData.hostData.playerDisplayName}</h4>
          <div className="space-y-3">
            <div>
              <p className="text-gray-300">Banks</p>
              <p className="text-white font-bold">{matchData.hostData.matchStats?.banks || 0}</p>
            </div>
            <div>
              <p className="text-gray-300">Doubles</p>
              <p className="text-white font-bold">{matchData.hostData.matchStats?.doubles || 0}</p>
            </div>
            <div>
              <p className="text-gray-300">Biggest Turn Score</p>
              <p className="text-white font-bold">{matchData.hostData.matchStats?.biggestTurnScore || 0}</p>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center justify-center">
          <div className="w-px h-48 bg-gradient-to-b from-transparent via-gray-400 to-transparent"></div>
        </div>

        {/* Opponent Stats */}
        <div className="text-center">
          <h4 className="text-yellow-400">{matchData.opponentData.playerDisplayName}</h4>
          <div className="space-y-3">
            <div>
              <p className="text-gray-300">Banks</p>
              <p className="text-white font-bold">{matchData.opponentData.matchStats?.banks || 0}</p>
            </div>
            <div>
              <p className="text-gray-300">Doubles</p>
              <p className="text-white font-bold">{matchData.opponentData.matchStats?.doubles || 0}</p>
            </div>
            <div>
              <p className="text-gray-300">Biggest Turn Score</p>
              <p className="text-white font-bold">{matchData.opponentData.matchStats?.biggestTurnScore || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <button onClick={onLeaveMatch} className="btn-primary">
          BACK TO DASHBOARD
        </button>
        
        {rematchState === 'idle' && (
          <button onClick={handleRequestRematch} className="btn-success">
            REMATCH
          </button>
        )}
        
        {rematchState === 'requesting' && (
          <div className="flex items-center gap-4 bg-yellow-600/20 border-2 border-yellow-400 rounded-xl px-8 py-4">
            <CountdownTimer
              initialSeconds={10}
              onComplete={handleRematchTimeout}
              isActive={true}
            />
            <span className="text-yellow-400 font-bold">
              WAITING FOR {opponentDisplayName}
            </span>
            <button onClick={handleCancelRematch} className="btn-danger">
              CANCEL
            </button>
          </div>
        )}
      </div>

      {/* Celebration Animation */}
      <motion.div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -100, x: Math.random() * window.innerWidth }}
            animate={{ 
              opacity: [0, 1, 0], 
              y: window.innerHeight + 100,
              rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
            }}
            transition={{ 
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              repeatDelay: 5 + Math.random() * 5
            }}
            className="absolute w-4 h-4 bg-yellow-400 rounded-full"
          />
        ))}
      </motion.div>
    </div>
  );
};
```

## Firebase Integration

### Real-time Data Flow

The match system uses Firebase Firestore for real-time synchronization between players:

```typescript
// Real-time match data subscription
useEffect(() => {
  const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (doc) => {
    if (doc.exists()) {
      const data = { id: doc.id, ...doc.data() } as MatchData;
      setMatchData(data);
      
      // Trigger animations based on state changes
      handleAnimationTriggers(data);
    }
  }, (error) => {
    console.error('Match subscription error:', error);
  });

  return () => unsubscribe();
}, [matchId]);
```

### Match Service Operations

```typescript
export class MatchService {
  /**
   * Roll dice with complete game rules implementation
   */
  static async rollDice(matchId: string, playerId: string): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    
    // Generate dice values
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    
    // Start rolling animation with dice1
    await updateDoc(matchRef, {
      'gameData.isRolling': true,
      'gameData.rollPhase': 'dice1',
      'gameData.diceOne': dice1,
      'gameData.diceTwo': 0,
    });
    
    // Reveal dice2 after dice1 animation (1200ms)
    setTimeout(async () => {
      await updateDoc(matchRef, {
        'gameData.rollPhase': 'dice2',
        'gameData.diceTwo': dice2
      });
      
      // Process game rules after dice2 animation (another 1200ms)
      setTimeout(async () => {
        await this.processGameRules(matchId, dice1, dice2, isHost);
      }, 1200);
    }, 1200);
  }

  /**
   * Bank current turn score
   */
  static async bankScore(matchId: string, playerId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await transaction.get(matchRef);
      const matchData = matchDoc.data() as MatchData;
      
      const isHost = matchData.hostData.playerId === playerId;
      const currentTurnScore = matchData.gameData.turnScore;
      
      if (isHost) {
        const newPlayerScore = matchData.hostData.playerScore + currentTurnScore;
        
        // Check for win condition
        if (newPlayerScore >= matchData.gameData.roundObjective) {
          transaction.update(matchRef, {
            'hostData.playerScore': newPlayerScore,
            'gameData.gamePhase': 'gameOver',
            'gameData.winner': matchData.hostData.playerDisplayName,
            'gameData.gameOverReason': `${matchData.hostData.playerDisplayName} reached ${matchData.gameData.roundObjective} points!`,
            'gameData.status': 'completed',
            'gameData.turnScore': 0,
            'hostData.turnActive': false,
            'opponentData.turnActive': false,
            'hostData.matchStats.banks': increment(1),
          });
        } else {
          // Normal banking
          transaction.update(matchRef, {
            'hostData.playerScore': newPlayerScore,
            'hostData.turnActive': false,
            'opponentData.turnActive': true,
            'gameData.turnScore': 0,
            'gameData.hasDoubleMultiplier': false,
            'hostData.matchStats.banks': increment(1),
          });
        }
      }
      // Similar logic for opponent...
    });
  }

  /**
   * Archive completed match to matches_archive collection
   */
  static async archiveCompletedMatch(
    matchId: string, 
    winnerId: string, 
    winnerName: string, 
    finalScore: number
  ): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    const archiveRef = doc(db, 'matches_archive', matchId);
    
    const matchDoc = await getDoc(matchRef);
    if (matchDoc.exists()) {
      const matchData = matchDoc.data();
      
      // Add archive metadata
      const archiveData = {
        ...matchData,
        archivedAt: Timestamp.now(),
        finalWinner: winnerName,
        finalWinnerId: winnerId,
        finalScore: finalScore,
      };
      
      // Save to archive and delete from active matches
      await setDoc(archiveRef, archiveData);
      await deleteDoc(matchRef);
      
      console.log(`✅ Match ${matchId} archived successfully`);
    }
  }
}
```

### Error Handling

```typescript
// Comprehensive error handling for match operations
const handleMatchError = (error: any, operation: string) => {
  console.error(`❌ Error in ${operation}:`, error);
  
  // Handle specific Firebase errors
  if (error.code === 'permission-denied') {
    throw new Error('Insufficient permissions for this operation');
  } else if (error.code === 'not-found') {
    throw new Error('Match not found');
  } else if (error.code === 'unavailable') {
    throw new Error('Service temporarily unavailable. Please try again.');
  } else {
    throw new Error(`An error occurred during ${operation}. Please try again.`);
  }
};

// Usage in service methods
static async rollDice(matchId: string, playerId: string): Promise<void> {
  try {
    // ... roll dice logic
  } catch (error) {
    handleMatchError(error, 'dice roll');
  }
}
```

## Adding New Game Modes

The system is designed for easy expansion with new game modes. Here's the complete process:

### 1. Define Game Mode Configuration

```typescript
// Add to src/components/dashboard/DashboardSectionNew.tsx
const gameConfig = {
  // Existing modes...
  
  newmode: {
    name: 'NEW\nMODE',
    icon: '/Design Elements/new-icon.webp',
    description: 'Your Custom Description',
    rotation: '0deg',
    position: { top: '-2rem', left: '-2rem' },
    available: true  // Set to true when ready
  }
};
```

### 2. Set Round Objective

```typescript
// Update src/services/matchmakingService.ts
static getRoundObjective(gameMode: string): number {
  switch (gameMode.toLowerCase()) {
    case 'quickfire': return 50;
    case 'classic': return 100;
    case 'zerohour': return 150;
    case 'lastline': return 200;
    case 'newmode': return 75;  // Add your new mode
    default: return 100;
  }
}
```

### 3. Add Waiting Room Configuration

```typescript
// Update src/components/dashboard/GameWaitingRoom.tsx
const gameModeConfig = {
  quickfire: { 
    name: 'Quick Fire', 
    description: 'Fast-paced dice action'
  },
  classic: { 
    name: 'Classic', 
    description: 'Traditional gameplay'
  },
  // Add new mode
  newmode: {
    name: 'New Mode',
    description: 'Your custom game mode description'
  }
};
```

### 4. Custom Game Rules (Optional)

If your new mode requires different game rules, you can modify the game logic:

```typescript
// Update src/services/matchService.ts
private static async processGameRules(
  matchId: string, 
  dice1: number, 
  dice2: number, 
  isHost: boolean
): Promise<void> {
  const matchData = await getDoc(doc(db, 'matches', matchId));
  const gameMode = matchData.gameMode;
  
  // Apply mode-specific rules
  if (gameMode === 'newmode') {
    // Custom rule processing for new mode
    // Example: Different multiplier behavior
    if (dice1 === dice2) {
      newTurnScore = currentTurnScore + (dice1 + dice2) * 3; // 3x instead of 2x
    }
  } else {
    // Standard rule processing
    // ... existing logic
  }
}
```

### 5. Mode-Specific UI Elements (Optional)

```typescript
// Add mode-specific styling or behavior
const getModeSpecificStyles = (gameMode: string) => {
  switch (gameMode) {
    case 'newmode':
      return {
        primaryColor: '#FF6B35',
        secondaryColor: '#F7931E',
        buttonGradient: 'linear-gradient(45deg, #FF6B35, #F7931E)'
      };
    default:
      return {
        primaryColor: '#3B82F6',
        secondaryColor: '#1D4ED8',
        buttonGradient: 'linear-gradient(45deg, #3B82F6, #1D4ED8)'
      };
  }
};
```

### 6. Testing New Game Modes

```typescript
// Create test data for new mode
// Add to src/utils/testMatchData.ts
export const newModeTestMatch: MatchData = {
  id: 'test-newmode-match',
  gameMode: 'newmode',
  gameType: 'live',
  createdAt: Timestamp.now(),
  // ... rest of match data with newmode-specific values
  gameData: {
    roundObjective: 75,  // New mode objective
    // ... other game data
  }
};
```

### 7. Update Type Definitions

```typescript
// Update src/types/match.ts if needed
export type GameMode = 'quickfire' | 'classic' | 'zerohour' | 'lastline' | 'newmode';

// Update game mode validation
export const VALID_GAME_MODES = [
  'quickfire', 'classic', 'zerohour', 'lastline', 'newmode'
] as const;
```

### Best Practices for New Game Modes

1. **Start Simple**: Begin with objective-only changes before adding complex rule modifications
2. **Maintain Compatibility**: Ensure new modes work with existing Firebase schema
3. **Test Thoroughly**: Create comprehensive test scenarios for new mode behavior
4. **Progressive Rollout**: Set `available: false` initially for internal testing
5. **Clear Documentation**: Update this README with new mode specifications
6. **User Experience**: Consider how new modes affect the overall game flow and UI

## Statistics & Analytics

### Match Statistics Tracking

The system tracks comprehensive statistics for each player during matches:

```typescript
interface MatchStats {
  banks: number;           // Number of times player banked their turn score
  doubles: number;         // Number of doubles rolled (includes all types)
  biggestTurnScore: number; // Highest single turn score achieved
  lastDiceSum: number;     // Sum of the most recent dice roll
}
```

### Statistics Updates

```typescript
// Statistics are automatically updated during gameplay
const updatePlayerStats = async (matchRef: DocumentReference, isHost: boolean, statsUpdate: Partial<MatchStats>) => {
  const playerPrefix = isHost ? 'hostData' : 'opponentData';
  
  await updateDoc(matchRef, {
    [`${playerPrefix}.matchStats.banks`]: increment(statsUpdate.banks || 0),
    [`${playerPrefix}.matchStats.doubles`]: increment(statsUpdate.doubles || 0),
    [`${playerPrefix}.matchStats.biggestTurnScore`]: statsUpdate.biggestTurnScore || 0,
    [`${playerPrefix}.matchStats.lastDiceSum`]: statsUpdate.lastDiceSum || 0,
  });
};

// Called during game rule processing
if (dice1 === dice2) {
  // Update doubles counter
  await updateDoc(matchRef, {
    [`${playerPrefix}.matchStats.doubles`]: increment(1)
  });
}

// Update biggest turn score when banking
if (currentTurnScore > currentBiggestTurnScore) {
  await updateDoc(matchRef, {
    [`${playerPrefix}.matchStats.biggestTurnScore`]: currentTurnScore
  });
}
```

### Performance Analytics

```typescript
// Track game performance metrics
interface MatchAnalytics {
  matchDuration: number;      // Total match time in seconds
  totalRolls: number;         // Combined dice rolls by both players
  averageTurnScore: number;   // Average points per turn
  bankingFrequency: number;   // Banks per turn ratio
  riskiness: number;          // Calculated risk-taking behavior
}

// Analytics calculation
const calculateMatchAnalytics = (matchData: MatchData): MatchAnalytics => {
  const duration = (matchData.gameData.endedAt?.seconds - matchData.gameData.startedAt?.seconds) || 0;
  const totalBanks = (matchData.hostData.matchStats.banks + matchData.opponentData.matchStats.banks);
  const totalScore = (matchData.hostData.playerScore + matchData.opponentData.playerScore);
  
  return {
    matchDuration: duration,
    totalRolls: estimateRollCount(matchData),
    averageTurnScore: totalScore / Math.max(totalBanks, 1),
    bankingFrequency: totalBanks / Math.max(duration / 60, 1), // Banks per minute
    riskiness: calculateRiskiness(matchData)
  };
};
```

## Error Handling

### Client-Side Error Handling

```typescript
// Match component error boundary
class MatchErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Match component error:', error, errorInfo);
    // Could send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong with the match.</h2>
          <button onClick={() => window.location.reload()}>
            Reload Game
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Service-Level Error Handling

```typescript
// Robust error handling in MatchService
export class MatchService {
  private static async withErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`❌ ${operationName} failed:`, error);
      
      // Handle specific Firebase errors
      switch (error.code) {
        case 'permission-denied':
          throw new Error('You do not have permission to perform this action');
        case 'not-found':
          throw new Error('Match not found or has been deleted');
        case 'unavailable':
          throw new Error('Game service is temporarily unavailable');
        case 'failed-precondition':
          throw new Error('Invalid game state for this action');
        default:
          throw new Error(`${operationName} failed. Please try again.`);
      }
    }
  }

  static async rollDice(matchId: string, playerId: string): Promise<void> {
    return this.withErrorHandling(async () => {
      // Validate inputs
      if (!matchId || !playerId) {
        throw new Error('Invalid match ID or player ID');
      }

      // Check match exists and player is authorized
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }

      const matchData = matchDoc.data() as MatchData;
      
      // Verify it's player's turn
      const isHost = matchData.hostData.playerId === playerId;
      const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
      
      if (!currentPlayer.turnActive) {
        throw new Error('It is not your turn');
      }

      if (matchData.gameData.isRolling) {
        throw new Error('Dice are already rolling');
      }

      // Proceed with dice roll...
      // ... existing roll logic
      
    }, 'Dice roll');
  }
}
```

### Connection Handling

```typescript
// Handle connection issues in real-time subscriptions
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, 'matches', matchId), 
    (doc) => {
      if (doc.exists()) {
        setMatchData({ id: doc.id, ...doc.data() } as MatchData);
        setConnectionError(null);
      }
    },
    (error) => {
      console.error('Match subscription error:', error);
      setConnectionError('Connection lost. Attempting to reconnect...');
      
      // Implement retry logic
      setTimeout(() => {
        // Subscription will automatically retry
        console.log('Retrying match subscription...');
      }, 3000);
    }
  );

  return () => unsubscribe();
}, [matchId]);

// Display connection status to user
{connectionError && (
  <div className="connection-error">
    <p>{connectionError}</p>
    <button onClick={() => window.location.reload()}>
      Reload Game
    </button>
  </div>
)}
```

## Performance Optimization

### Animation Performance

```typescript
// Optimized dice animation with cleanup
useEffect(() => {
  let intervalId: NodeJS.Timeout;
  let nearMissTimeout: NodeJS.Timeout;
  let finalTimeout: NodeJS.Timeout;

  const startAnimation = () => {
    // Animation logic...
  };

  if (shouldAnimate) {
    startAnimation();
  }

  // Cleanup on unmount or state change
  return () => {
    if (intervalId) clearTimeout(intervalId);
    if (nearMissTimeout) clearTimeout(nearMissTimeout);
    if (finalTimeout) clearTimeout(finalTimeout);
  };
}, [animationTriggers]);
```

### Firebase Optimization

```typescript
// Efficient Firebase queries and updates
class MatchService {
  // Use transactions for critical operations
  static async bankScore(matchId: string, playerId: string): Promise<void> {
    return runTransaction(db, async (transaction) => {
      // Atomic operation ensures consistency
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await transaction.get(matchRef);
      
      // Perform all related updates in single transaction
      transaction.update(matchRef, updates);
    });
  }

  // Batch non-critical updates
  static async updateStatistics(matchId: string, statsUpdates: any[]): Promise<void> {
    const batch = writeBatch(db);
    const matchRef = doc(db, 'matches', matchId);
    
    statsUpdates.forEach(update => {
      batch.update(matchRef, update);
    });
    
    await batch.commit();
  }
}
```

## Security Considerations

### Input Validation

```typescript
// Validate all user inputs
const validateMatchAction = (matchData: MatchData, playerId: string, action: string) => {
  // Verify player is in the match
  if (matchData.hostData.playerId !== playerId && 
      matchData.opponentData?.playerId !== playerId) {
    throw new Error('Player not authorized for this match');
  }

  // Verify game state allows action
  if (action === 'rollDice' && matchData.gameData.isRolling) {
    throw new Error('Cannot roll while dice are already rolling');
  }

  // Verify it's player's turn
  const isHost = matchData.hostData.playerId === playerId;
  const isPlayerTurn = isHost ? matchData.hostData.turnActive : matchData.opponentData?.turnActive;
  
  if (!isPlayerTurn) {
    throw new Error('Not your turn');
  }
};
```

### Rate Limiting

```typescript
// Implement client-side rate limiting
class RateLimiter {
  private lastActions: Map<string, number> = new Map();
  private readonly cooldownMs: number = 1000; // 1 second between actions

  canPerformAction(actionType: string): boolean {
    const now = Date.now();
    const lastAction = this.lastActions.get(actionType) || 0;
    
    if (now - lastAction < this.cooldownMs) {
      return false;
    }
    
    this.lastActions.set(actionType, now);
    return true;
  }
}

const rateLimiter = new RateLimiter();

// Use in action handlers
const handleRollDice = async () => {
  if (!rateLimiter.canPerformAction('rollDice')) {
    console.warn('Action rate limited');
    return;
  }
  
  await MatchService.rollDice(matchId, playerId);
};
```

---

## Conclusion

The DashDice Match System provides a comprehensive foundation for real-time multiplayer dice gaming with sophisticated animations, complex game rules, and robust error handling. The modular architecture allows for easy expansion with new game modes while maintaining performance and user experience quality.

Key strengths of the system:
- **Real-time synchronization** with Firebase Firestore
- **Cinematic dice animations** with progressive deceleration
- **Complex game rules** with visual feedback
- **Comprehensive statistics** tracking
- **Modular architecture** for easy expansion
- **Robust error handling** and performance optimization

The system is production-ready and designed to scale with additional game modes, features, and player capacity.
