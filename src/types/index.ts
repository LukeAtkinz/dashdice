export interface Background {
  name: string;
  file: string;
  type: 'image' | 'video' | 'gradient';
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  profilePicture?: string;
  userTag?: string;
  createdAt: Date;
  lastLoginAt: Date;
  inventory: InventoryItem[] | {
    displayBackgroundEquipped?: Background | string;
    matchBackgroundEquipped?: Background | string;
    ownedBackgrounds?: string[];
  };
  ownedBackgrounds: string[]; // Array of background IDs (legacy)
  equippedBackground?: string; // Currently equipped background ID (legacy)
  friendCode?: string; // Unique 8-character friend code
  isOnline?: boolean;
  lastSeen?: Date;
  currentGame?: string; // Game session ID if in game
  status?: 'online' | 'away' | 'busy' | 'offline';
  privacy?: {
    allowFriendRequests: boolean;
    showOnlineStatus: boolean;
    allowGameInvites: boolean;
    showActivity: boolean;
  };
}

export interface InventoryItem {
  id: string;
  type: 'background' | 'dice' | 'avatar' | 'effect';
  name: string;
  description?: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'masterpiece';
  acquiredAt: Date;
  equipped?: boolean;
}

export interface GameState {
  gameId: string;
  players: GamePlayer[];
  currentPlayer: string;
  status: 'waiting' | 'active' | 'finished';
  createdAt: Date;
  updatedAt: Date;
  winner?: string;
  gameMode?: string; // Added game mode support
  modeSpecificData?: any; // Mode-specific data storage
  currentTurn?: {
    playerId: string;
    rolls: { dice1: number; dice2: number; total: number }[];
    turnScore: number;
    startTime: number;
    extraRollsGranted?: number; // Track extra rolls granted by doubles
  };
  scores?: { [playerId: string]: number }; // Player scores
  currentPlayerIndex?: number; // Current player index
}

export interface GamePlayer {
  uid: string;
  displayName: string;
  avatar?: string;
  score: number;
  ready: boolean;
}

export interface Match {
  id: string;
  players: string[];
  status: 'waiting' | 'active' | 'finished';
  createdAt: Date;
  updatedAt: Date;
  winner?: string;
  gameType: 'ranked' | 'casual' | 'tournament';
  gameMode?: string; // Added game mode support
  modeSpecificData?: any; // Mode-specific data storage
  scores?: { [playerId: string]: number }; // Player scores
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  signInWithApple: () => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: { displayName?: string }) => Promise<{ success: boolean }>;
}

export interface InventoryContextType {
  inventory: InventoryItem[];
  loading: boolean;
  error: string | null;
  addItem: (item: Omit<InventoryItem, 'id' | 'acquiredAt'>) => Promise<void>;
  equipItem: (itemId: string) => Promise<void>;
  unequipItem: (itemId: string) => Promise<void>;
  refreshInventory: () => Promise<void>;
}

export interface GameContextType {
  currentGame: GameState | null;
  loading: boolean;
  error: string | null;
  createGame: () => Promise<string>;
  joinGame: (gameId: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  updatePlayerReady: (ready: boolean) => Promise<void>;
}

export interface WaitingRoomPlayer {
  uid?: string; // Added uid property
  playerDisplayName?: string; // Made optional
  playerId?: string; // Made optional
  displayName?: string; // Added displayName property
  avatar?: string; // Added avatar property
  backgroundEquipped?: any; // Added backgroundEquipped property
  joinedAt?: Date; // Added joinedAt property
  ready?: boolean; // Added ready property
  displayBackgroundEquipped?: any; // Made optional
  matchBackgroundEquipped?: any; // Made optional
  playerStats?: {
    bestStreak: number;
    currentStreak: number;
    gamesPlayed: number;
    matchWins: number;
  };
}

export interface WaitingRoom {
  id?: string;
  createdAt: any;
  updatedAt?: any; // Added updatedAt property
  gameMode: string;
  gameType?: string; // Made optional
  playersRequired?: number; // Made optional
  maxPlayers?: number; // Added maxPlayers property
  currentPlayers?: number; // Added currentPlayers property
  players?: any[]; // Added players property
  hostData?: WaitingRoomPlayer; // Made optional
  opponentData?: WaitingRoomPlayer;
  gameData?: {
    type: string;
    status: string;
    currentPlayer?: string;
    winner?: string;
    turnDecider?: any;
  };
  status: string;
  matchBackground?: any;
}
