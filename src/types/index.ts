export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  lastLoginAt: Date;
  inventory: InventoryItem[];
  ownedBackgrounds: string[]; // Array of background IDs
  equippedBackground?: string; // Currently equipped background ID
}

export interface InventoryItem {
  id: string;
  type: 'background' | 'dice' | 'avatar' | 'effect';
  name: string;
  description?: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
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
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
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
