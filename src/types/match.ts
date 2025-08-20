import { Timestamp } from 'firebase/firestore';

/**
 * Match data structure - Compatible with existing matchmaking system
 */
export interface MatchData {
  id?: string;
  createdAt: Timestamp;
  gameMode: string;
  gameType: string;
  
  // Host player data
  hostData: {
    displayBackgroundEquipped: any;
    matchBackgroundEquipped: any;
    playerDisplayName: string;
    playerId: string;
    playerStats: {
      bestStreak: number;
      currentStreak: number;
      gamesPlayed: number;
      matchWins: number;
    };
    // Game-specific data
    turnActive: boolean;
    playerScore: number;
    roundScore: number;
    // Connection tracking
    isConnected?: boolean;
    lastHeartbeat?: Timestamp;
    disconnectedAt?: Timestamp;
    // New match statistics
    matchStats: {
      banks: number;           // How many times player banked
      doubles: number;         // How many doubles player rolled
      biggestTurnScore: number; // Largest points in a single turn
      lastDiceSum: number;     // Score of the last dice rolled
    };
  };
  
  // Opponent player data
  opponentData: {
    displayBackgroundEquipped: any;
    matchBackgroundEquipped: any;
    playerDisplayName: string;
    playerId: string;
    playerStats: {
      bestStreak: number;
      currentStreak: number;
      gamesPlayed: number;
      matchWins: number;
    };
    // Game-specific data
    turnActive: boolean;
    playerScore: number;
    roundScore: number;
    // Connection tracking
    isConnected?: boolean;
    lastHeartbeat?: Timestamp;
    disconnectedAt?: Timestamp;
    // New match statistics
    matchStats: {
      banks: number;           // How many times player banked
      doubles: number;         // How many doubles player rolled
      biggestTurnScore: number; // Largest points in a single turn
      lastDiceSum: number;     // Score of the last dice rolled
    };
  };
  
  // Game state data - Compatible with existing structure
  gameData: {
    type: string;
    settings: any;
    turnDecider: number; // 1 = host, 2 = opponent
    chooserPlayerIndex?: number; // 1 = host, 2 = opponent (for pregame odd/even choice)
    turnScore: number;
    diceOne: number;
    diceTwo: number;
    roundObjective: number;
    startingScore: number;
    status: 'active' | 'completed' | 'abandoned' | 'pregame';
    startedAt: Timestamp;
    
    // Pregame fields for odd/even choice phase
    isPregame?: boolean;
    oddEvenDieValue?: number;
    oddEvenChoice?: 'odd' | 'even';
    
    // Enhanced game state for gameplay
    gamePhase: 'turnDecider' | 'gameplay' | 'gameOver';
    isRolling: boolean;
    rollPhase?: 'dice1' | 'dice2';
    turnDeciderChoice?: 'odd' | 'even';
    turnDeciderDice?: number;
    winner?: string;
    gameOverReason?: string;
    hasDoubleMultiplier?: boolean; // 2x multiplier active when player rolls doubles
    hasTripleMultiplier?: boolean; // 3x multiplier active for Double 3 in Zero Hour
    currentMultiplier?: number; // Stacking multiplier for True Grit mode (starts at 1x)
  };
  
  // Match metadata
  status?: 'active' | 'completed' | 'abandoned';
  startedAt?: Timestamp;
}

/**
 * Game phases for match progression
 */
export type GamePhase = 'turnDecider' | 'gameplay' | 'gameOver';

/**
 * Roll phases for dice animation
 */
export type RollPhase = 'dice1' | 'dice2';

/**
 * Turn decider choices
 */
export type TurnDeciderChoice = 'odd' | 'even';

// Game rules documentation for reference
export const GAME_RULES = {
  SINGLE_ONE: 'Single 1: Turn over, no score added to player total',
  DOUBLE_SIX: 'Double 6: Turn over, player score reset to 0',
  SNAKE_EYES: 'Double 1 (Snake Eyes): +20 to turn score, continue playing',
  DOUBLE_MULTIPLIER: 'Any Other Double: 2x multiplier for rest of turn (22, 33, 44, 55)',
  NORMAL_SCORING: 'Normal: Add dice sum to turn score (2x if multiplier active)',
  BANKING: 'Bank score: Add turn score to player total, switch turns',
  WIN_CONDITION: 'First to reach round objective wins',
} as const;
