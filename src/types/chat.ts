import { Timestamp } from 'firebase/firestore';

// Chat Types and Interfaces
export interface ChatRoom {
  id: string;
  type: 'game' | 'friend' | 'global';
  name: string;
  participants: string[]; // User IDs
  createdAt: Timestamp;
  lastActivity: Timestamp;
  settings: {
    isActive: boolean;
    maxParticipants?: number;
    isModerated: boolean;
  };
  gameId?: string; // For game-specific chats
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  originalContent?: string; // Before moderation
  messageType: 'text' | 'system' | 'reaction' | 'image';
  timestamp: Timestamp;
  editedAt?: Timestamp;
  isModerated: boolean;
  moderationFlags?: string[];
  reactions?: {
    [emoji: string]: string[]; // Array of user IDs who reacted
  };
  replyTo?: string; // Message ID being replied to
  mentions?: string[]; // User IDs mentioned in message
}

export interface ChatParticipant {
  id: string;
  roomId: string;
  userId: string;
  role: 'participant' | 'moderator' | 'admin';
  joinedAt: Timestamp;
  lastSeen: Timestamp;
  isTyping: boolean;
  typingTimestamp?: Timestamp;
  isMuted: boolean;
  muteExpiresAt?: Timestamp;
  permissions: {
    canSendMessages: boolean;
    canReact: boolean;
    canMention: boolean;
  };
}

export interface ModerationLog {
  id: string;
  messageId: string;
  roomId: string;
  userId: string; // User who sent the message
  moderatorId?: string; // Admin/moderator who took action
  action: 'flagged' | 'edited' | 'deleted' | 'user_muted' | 'user_banned';
  reason: string;
  originalContent?: string;
  moderatedContent?: string;
  timestamp: Timestamp;
  autoModerated: boolean;
}

export interface UserChatSettings {
  userId: string;
  globalChatEnabled: boolean;
  friendMessagesEnabled: boolean;
  gameMessagesEnabled: boolean;
  soundNotifications: boolean;
  showTypingIndicators: boolean;
  profanityFilter: 'strict' | 'moderate' | 'off';
  blockedUsers: string[];
  mutedRooms: string[];
  notificationSettings: {
    mentions: boolean;
    friendMessages: boolean;
    gameMessages: boolean;
  };
}

export interface TypingIndicator {
  userId: string;
  username: string;
  timestamp: Timestamp;
}

export interface ChatContextType {
  // Current state
  activeRooms: Map<string, ChatRoom>;
  messages: Map<string, ChatMessage[]>;
  participants: Map<string, ChatParticipant[]>;
  typingIndicators: Map<string, TypingIndicator[]>;
  userSettings: UserChatSettings | null;
  
  // Chat room management
  createRoom: (type: ChatRoom['type'], participants: string[], name: string, gameId?: string) => Promise<string>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  
  // Message management
  sendMessage: (roomId: string, content: string, replyTo?: string) => Promise<boolean>;
  editMessage: (messageId: string, newContent: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  removeReaction: (messageId: string, emoji: string) => Promise<boolean>;
  
  // Typing indicators
  setTyping: (roomId: string, isTyping: boolean) => Promise<void>;
  
  // User management
  muteUser: (roomId: string, userId: string, duration?: number) => Promise<boolean>;
  unmuteUser: (roomId: string, userId: string) => Promise<boolean>;
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  
  // Settings
  updateSettings: (settings: Partial<UserChatSettings>) => Promise<boolean>;
  
  // Utility functions
  getFriendChatRoom: (friendId: string) => Promise<string>;
  getGlobalChatRoom: () => Promise<string>;
  getGameChatRoom: (gameId: string) => Promise<string>;
  
  // State queries
  isUserTyping: (roomId: string, userId: string) => boolean;
  isUserMuted: (roomId: string, userId: string) => boolean;
  isUserBlocked: (userId: string) => boolean;
  canUserSendMessage: (roomId: string, userId: string) => boolean;
}

// Component props interfaces
export interface ChatWindowProps {
  roomId: string;
  isVisible: boolean;
  onClose: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'sidebar';
  height?: number;
  width?: number;
}

export interface MessageListProps {
  roomId: string;
  messages: ChatMessage[];
  currentUserId: string;
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit: (messageId: string) => void;
  onDelete: (messageId: string) => void;
}

export interface MessageInputProps {
  roomId: string;
  placeholder?: string;
  replyingTo?: ChatMessage;
  onSend: (content: string) => void;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export interface ParticipantListProps {
  roomId: string;
  participants: ChatParticipant[];
  currentUserId: string;
  showModerationActions?: boolean;
  onMute?: (userId: string) => void;
  onUnmute?: (userId: string) => void;
  onKick?: (userId: string) => void;
}

// Chat utility types
export type ChatNotification = {
  id: string;
  type: 'mention' | 'friend_message' | 'game_message' | 'system';
  title: string;
  message: string;
  roomId: string;
  messageId?: string;
  timestamp: Date;
  isRead: boolean;
};

export type ChatFilter = {
  roomType?: ChatRoom['type'];
  participantId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  messageType?: ChatMessage['messageType'];
  searchTerm?: string;
};

export type ChatModerationAction = {
  action: ModerationLog['action'];
  reason: string;
  duration?: number; // For mutes/bans
};
