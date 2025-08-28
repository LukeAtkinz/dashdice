// Types for ranked system
export type GameType = 'quick' | 'ranked';

export interface Season {
  id: string;
  name: string; // e.g., "Dash 1", "Dash 2"
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  dashNumber: number; // 1, 2, 3, etc.
}

export interface RankedStats {
  // Current season stats
  currentSeason: {
    dashNumber: number;
    level: number; // 1-10
    winsInLevel: number; // 0-4 (5 wins = next level)
    totalWins: number;
    totalLosses: number;
    winStreak: number;
    longestWinStreak: number;
    gamesPlayed: number;
  };
  
  // All-time ranked stats
  allTime: {
    totalDashes: number;
    maxLevelReached: number;
    totalRankedWins: number;
    totalRankedLosses: number;
    totalRankedGames: number;
    longestWinStreak: number;
    averageLevel: number;
  };
}

export interface RankedMatch {
  id: string;
  gameType: GameType; // Will be 'ranked'
  gameMode: string; // 'classic', 'quickfire', etc.
  dashNumber: number;
  hostData: {
    playerId: string;
    levelBefore: number;
    levelAfter: number;
    winsBefore: number;
    winsAfter: number;
  };
  opponentData: {
    playerId: string;
    levelBefore: number;
    levelAfter: number;
    winsBefore: number;
    winsAfter: number;
  };
  winnerId: string;
  createdAt: Date;
  completedAt: Date;
  originalRoomId: string;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  level: number;
  winsInLevel: number;
  totalWins: number;
  winRate: number;
  winStreak: number;
  gamesPlayed: number;
  rank: number; // 1-based ranking
}

export interface DashLeaderboard {
  dashNumber: number;
  entries: LeaderboardEntry[];
  lastUpdated: Date;
}

export interface AllTimeLeaderboard {
  entries: LeaderboardEntry[];
  lastUpdated: Date;
}

// Extended user interface to include ranked stats
export interface UserProfileWithRanked {
  uid: string;
  displayName: string;
  email: string;
  
  // Existing stats
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
    matchWins: number;
    matchLosses: number;
  };
  
  // New ranked stats
  rankedStats?: RankedStats;
  
  // Other existing fields...
  gold: number;
  inventoryItems: string[];
  equippedPlayerBackground: any;
  equippedMatchBackground: any;
  friendCode: string;
  createdAt: Date;
  updatedAt: Date;
}
