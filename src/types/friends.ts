// Friends system type definitions
import { Timestamp } from 'firebase/firestore';
import { User } from './index';

// Re-export User type for friends services
export type { User } from './index';

// Friend relationship interface
export interface FriendRelationship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  nickname?: string; // Custom nickname for friend
}

// Friend request interface
export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp; // Auto-expire after 30 days
}

// Game invitation interface
export interface GameInvitation {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  toDisplayName: string;
  gameMode: string;
  gameType: 'quick' | 'ranked';
  gameSettings?: Record<string, any>; // Additional game settings (e.g., isRematch, previousMatchId)
  sessionId?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  acceptedAt?: Timestamp;
  declinedAt?: Timestamp;
  cancelledAt?: Timestamp;
  message?: string;
}

// Friend with status information
export interface FriendWithStatus extends FriendRelationship {
  friendData: User;
}

// Friends context interface
export interface FriendsContextValue {
  friends: FriendWithStatus[];
  pendingRequests: FriendRequest[];
  gameInvitations: GameInvitation[];
  isLoading: boolean;
  
  // Friend management
  sendFriendRequest: (friendCode: string, message?: string) => Promise<{ success: boolean; error?: string }>;
  acceptFriendRequest: (requestId: string) => Promise<boolean>;
  declineFriendRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  
  // Game invitations
  sendGameInvitation: (friendId: string, gameType: string, gameSettings?: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  acceptGameInvitation: (invitationId: string) => Promise<{ success: boolean; gameId?: string; error?: string }>;
  declineGameInvitation: (invitationId: string) => Promise<boolean>;
  
  // User status
  updateUserStatus: (status: 'online' | 'away' | 'busy') => Promise<void>;
  updateCurrentGame: (gameId?: string) => Promise<void>;
  
  // Helper functions
  getFriendPresence?: (friendId: string) => PresenceState | null;
  getOnlineFriendsCount?: () => number;
  getFriendsByStatus?: (status: 'online' | 'away' | 'busy' | 'offline') => FriendWithStatus[];
  getFriendsWithPresence?: () => (FriendWithStatus & { presence?: PresenceState })[];
  friendPresences?: Record<string, PresenceState>;
}

// Friend activity types
export interface FriendActivity {
  id: string;
  userId: string;
  type: 'game_started' | 'game_won' | 'achievement_unlocked' | 'status_changed';
  data: Record<string, any>;
  timestamp: Timestamp;
}

// Online presence state
export interface PresenceState {
  isOnline: boolean;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Timestamp;
  currentGame?: string;
}
