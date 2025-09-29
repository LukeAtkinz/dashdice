/**
 * Bot Profile and AI Types for DashDice
 * Comprehensive bot personality and behavior system
 */

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ArchetypeCategory = 'conservative' | 'aggressive' | 'balanced' | 'chaotic' | 'strategic';
export type BotRegion = 'north-america' | 'europe' | 'asia-pacific' | 'south-america' | 'global';

/**
 * Bot personality metrics that influence gameplay decisions
 */
export interface BotPersonality {
  // Core behavioral metrics (0.0 to 1.0)
  aggressiveness: number;        // How likely to take risks
  bankingTendency: number;       // How often they bank vs continue rolling  
  riskTolerance: number;         // Willingness to accept dangerous rolls
  adaptationSpeed: number;       // How quickly they adapt to opponent's strategy
  emotionalVolatility: number;   // How much their behavior changes based on game state
  pressureResistance: number;    // Performance under pressure (losing/time pressure)
  momentumAwareness: number;     // Recognition of winning/losing streaks
  tiltResistance: number;        // Recovery from bad luck or losses
  
  // Categorical traits
  skillLevel: SkillLevel;
  archetypeCategory: ArchetypeCategory;
  favoriteTimeToPlay: number;    // Hour of day (0-23) for activity simulation
}

/**
 * Bot game statistics and performance metrics
 */
export interface BotStats {
  // Game performance
  elo: number;
  gamesPlayed: number;
  matchWins: number;
  currentStreak: number;
  bestStreak: number;
  totalScore: number;
  averageScore: number;
  averageGameLength: number;
  
  // Banking behavior stats
  bankingFrequency: number;      // Average banks per game
  averageTurnScore: number;      // Average score before banking
  riskyContinues: number;        // Times continued rolling at high scores
  
  // Activity patterns
  lastActiveDate: string;
  generationDate: string;
}

/**
 * Strategic patterns that guide bot decision-making
 */
export interface BotStrategy {
  bankingThresholds: {
    early: number;               // Bank threshold in first few turns
    mid: number;                 // Bank threshold in middle game
    late: number;                // Bank threshold when close to winning
    desperation: number;         // Bank threshold when far behind
  };
  
  riskFactors: {
    opponentScore: number;       // Risk adjustment based on opponent lead
    turnLength: number;          // Risk adjustment for long turns
    gamePhase: number;           // Risk adjustment for game phase
  };
  
  adaptationRules: {
    counterAggressive: boolean;  // Adapt to counter aggressive players
    mimicSuccessful: boolean;    // Copy successful opponent strategies
    punishMistakes: boolean;     // Capitalize on opponent errors
  };
  
  commonStrategies: string[];   // Named strategy patterns this bot uses
}

/**
 * Complete bot profile structure
 */
export interface BotProfile {
  // Identity
  uid: string;
  displayName: string;
  email: string;                 // Bot email for identification
  profilePicture?: string;
  region: BotRegion;
  
  // Bot metadata
  isBot: boolean;               // Always true for bot profiles
  isActive: boolean;            // Whether this bot is available for matching
  createdAt: string;
  updatedAt: string;
  
  // AI characteristics
  personality: BotPersonality;
  strategy: BotStrategy;
  stats: BotStats;
  
  // Game preferences
  preferredGameModes: string[]; // Game modes this bot is tuned for
  difficultyRating: number;     // Overall difficulty (1-10)
  
  // Inventory/cosmetics (for visual consistency)
  inventory?: {
    displayBackgroundEquipped?: any;
    matchBackgroundEquipped?: any;
    items?: string[];
  };
  
  // Match history simulation
  recentMatches: string[];
}

/**
 * Bot decision context for AI behavior
 */
export interface BotDecisionContext {
  // Current game state
  currentScore: number;
  opponentScore: number;
  turnScore: number;
  diceRolls: number;           // Number of rolls this turn
  gameMode: string;
  targetScore: number;
  
  // Game history
  turnsPlayed: number;
  banksThisTurn: number;
  consecutiveTurns: number;
  
  // Opponent analysis
  opponentBankingPattern: number[];
  opponentAggressiveness: number;
  opponentLastActions: string[];
  
  // Pressure factors
  timeRemaining?: number;
  isLosingBadly: boolean;
  isWinningBig: boolean;
  
  // Environmental
  currentDateTime: Date;
}

/**
 * Bot decision output
 */
export interface BotDecision {
  action: 'roll' | 'bank';
  confidence: number;          // 0.0 to 1.0 - how confident the bot is
  reasoning?: string;          // Debug information
  emotionalState?: string;     // For personality simulation
  
  // Additional context for implementation
  delayMs?: number;           // Simulate thinking time
  chatMessage?: string;       // Optional chat message
}

/**
 * Bot matching criteria
 */
export interface BotMatchingCriteria {
  gameMode: string;
  sessionType: 'quick' | 'ranked';
  userSkillLevel?: number;     // ELO or similar
  preferredDifficulty?: 'easy' | 'medium' | 'hard' | 'adaptive';
  excludeBotIds?: string[];    // Bots to exclude from matching
  personalityPreference?: ArchetypeCategory;
}

/**
 * Bot matching result
 */
export interface BotMatchingResult {
  success: boolean;
  bot?: BotProfile;
  error?: string;
  matchingReason?: string;     // Why this bot was selected
}