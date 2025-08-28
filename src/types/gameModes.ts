// Game Modes Type Definitions
export interface GameMode {
  id: string;
  name: string;
  description: string;
  rules: GameModeRules;
  settings: GameModeSettings;
  isActive: boolean;
  platforms: ('desktop' | 'mobile')[];
  minPlayers: number;
  maxPlayers: number;
  estimatedDuration: number; // in minutes
}

export interface GameModeRules {
  startingScore: number;
  targetScore: number;
  maxRounds?: number;
  bestOf?: number;
  allowBanking: boolean;
  allowDoubleRolls: boolean;
  scoreDirection: 'up' | 'down' | 'tug-of-war';
  eliminationRules: {
    singleOne: boolean;
    doubleOne: boolean;
    doubleSix: 'reset' | 'score' | 'ignore';
  };
  specialRules?: {
    rollLimit?: number;
    doubleGrantsExtraRoll?: boolean;
    exactScoreRequired?: boolean;
    teamBased?: boolean;
    // New rules for advanced game modes
    doublesEffects?: {
      [key: string]: {
        scoreBonus: number;
        multiplier?: number;
        opponentPenalty?: number | 'turn_score';
        affectsOpponentOnBank?: boolean;
      };
    };
    multiplierSystem?: boolean;
    probabilityAdjustments?: {
      singleOne?: number; // Multiplier for single 1 probability (0.5 = 50% less likely)
    };
    // Last Line tug-of-war mechanics
    tugOfWar?: boolean;
    combinedScoreCap?: number;
    doubleMultiplier?: boolean;
  };
}

export interface GameModeSettings {
  timePerTurn: number;
  maxConsecutiveRolls?: number;
  showRunningTotal: boolean;
  showOpponentScore: boolean;
  enableChat: boolean;
  enableAbilities: boolean;
}

export interface GameModeSpecificData {
  // Classic Mode
  roundsWon?: { [playerId: string]: number };
  currentRound?: number;
  
  // Last Line
  completedPlayers?: string[];
  finalScores?: { [playerId: string]: number };
  
  // True Grit
  eliminatedPlayers?: string[];
  
  // Zero Hour & True Grit - Multiplier system
  activeMultipliers?: { [playerId: string]: number };
  
  // Tag Team (for future implementation)
  teams?: { team1: string[]; team2: string[] };
  teamScores?: { team1: number; team2: number };
  teamRoundsWon?: { team1: number; team2: number };
}

export interface GameActionResult {
  success: boolean;
  error?: string;
  roll?: {
    dice1: number;
    dice2: number;
    total: number;
    isDouble: boolean;
  };
  newScore?: number;
  grantExtraRoll?: boolean;
  isEliminated?: boolean;
  appliedMultiplier?: number;
  opponentPenalty?: number;
}

export interface GameModeStats {
  modeId: string;
  totalGames: number;
  averageDuration: number;
  winRates: { [playerId: string]: number };
  popularityRank: number;
  completionRate: number; // Percentage of games finished vs abandoned
}
