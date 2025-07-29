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
  };
  
  // Game state data - Compatible with existing structure
  gameData: {
    type: string;
    settings: any;
    turnDecider: number; // 1 = host, 2 = opponent
    turnScore: number;
    diceOne: number;
    diceTwo: number;
    roundObjective: number;
    startingScore: number;
    status: 'active' | 'completed' | 'abandoned';
    startedAt: Timestamp;
    
    // Enhanced game state for gameplay
    gamePhase: 'turnDecider' | 'gameplay' | 'gameOver';
    isRolling: boolean;
    rollPhase?: 'dice1' | 'dice2';
    turnDeciderChoice?: 'odd' | 'even';
    turnDeciderDice?: number;
    winner?: string;
    gameOverReason?: string;
    hasDoubleMultiplier?: boolean; // 2x multiplier active when player rolls doubles
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
