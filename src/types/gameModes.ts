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
  scoreDirection: 'up' | 'down';
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
    autoBank?: boolean;
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
}

export interface GameModeStats {
  modeId: string;
  totalGames: number;
  averageDuration: number;
  winRates: { [playerId: string]: number };
  popularityRank: number;
  completionRate: number; // Percentage of games finished vs abandoned
}
