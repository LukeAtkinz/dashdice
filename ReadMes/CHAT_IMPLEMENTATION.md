# Chat System Implementation Guide

## Overview
This README outlines the implementation of a comprehensive chat system for DashDice, enabling real-time communication through multiple channels including in-game chat, private friend messaging, and global community chat with content moderation.

## Core Features
- **In-Game Chat**: Real-time communication during matches
- **Friend Messaging**: Private conversations with friends
- **Global Chat**: Community-wide public chat room
- **Content Moderation**: Automatic profanity filtering and admin controls
- **Chat Management**: Expandable/collapsible chat interface
- **Message History**: Persistent chat logs and search functionality
- **Typing Indicators**: Real-time typing status
- **Message Reactions**: Emoji reactions and quick responses

## Database Schema

### Firestore Collections

#### Chat Rooms Collection
```typescript
// src/types/index.ts
interface ChatRoom {
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
```

#### Messages Collection
```typescript
interface ChatMessage {
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
```

#### Chat Participants Collection
```typescript
interface ChatParticipant {
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
```

#### Moderation Logs Collection
```typescript
interface ModerationLog {
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
```

#### User Chat Settings Collection
```typescript
interface UserChatSettings {
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
```

## Implementation Architecture

### 1. Content Moderation Service

#### Profanity Filter and Content Moderation
```typescript
// src/services/moderationService.ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export class ModerationService {
  private static profanityList = [
    // Basic profanity list - in production, use external service
    'badword1', 'badword2', 'inappropriate'
  ];

  private static moderateWords = [
    'mild1', 'mild2'
  ];

  static moderateContent(content: string, filterLevel: 'strict' | 'moderate' | 'off' = 'moderate'): {
    moderatedContent: string;
    isModerated: boolean;
    flags: string[];
  } {
    if (filterLevel === 'off') {
      return { moderatedContent: content, isModerated: false, flags: [] };
    }

    let moderatedContent = content;
    const flags: string[] = [];
    let isModerated = false;

    // Check for profanity
    const wordsToCheck = filterLevel === 'strict' 
      ? [...this.profanityList, ...this.moderateWords]
      : this.profanityList;

    wordsToCheck.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(moderatedContent)) {
        moderatedContent = moderatedContent.replace(regex, '*'.repeat(word.length));
        flags.push('profanity');
        isModerated = true;
      }
    });

    // Check for spam (repeated characters)
    if (/(.)\1{4,}/.test(content)) {
      flags.push('spam');
      isModerated = true;
    }

    // Check for excessive caps
    if (content.length > 10 && content.toUpperCase() === content) {
      flags.push('excessive_caps');
      moderatedContent = content.toLowerCase();
      isModerated = true;
    }

    // Check for links (basic URL detection)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if (urlRegex.test(content)) {
      flags.push('contains_link');
      // Don't auto-moderate links, just flag for review
    }

    return { moderatedContent, isModerated, flags };
  }

  static async logModerationAction(
    messageId: string,
    roomId: string,
    userId: string,
    action: string,
    reason: string,
    originalContent?: string,
    moderatedContent?: string,
    moderatorId?: string
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'moderationLogs'), {
        messageId,
        roomId,
        userId,
        moderatorId,
        action,
        reason,
        originalContent,
        moderatedContent,
        timestamp: serverTimestamp(),
        autoModerated: !moderatorId
      });
    } catch (error) {
      console.error('Error logging moderation action:', error);
    }
  }

  // Advanced moderation using external service (placeholder)
  static async moderateWithAI(content: string): Promise<{
    isApproved: boolean;
    confidence: number;
    categories: string[];
    moderatedContent?: string;
  }> {
    // Integrate with services like OpenAI Moderation API, Google Cloud AI, etc.
    // This is a placeholder implementation
    const result = this.moderateContent(content);
    
    return {
      isApproved: !result.isModerated,
      confidence: result.isModerated ? 0.8 : 0.9,
      categories: result.flags,
      moderatedContent: result.moderatedContent
    };
  }
}
```

### 2. Chat Service

#### Core Chat Management
```typescript
// src/services/chatService.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { ModerationService } from './moderationService';

export class ChatService {
  // Create chat room
  static async createChatRoom(
    type: 'game' | 'friend' | 'global',
    participants: string[],
    name: string,
    gameId?: string
  ): Promise<string> {
    try {
      const roomRef = await addDoc(collection(db, 'chatRooms'), {
        type,
        name,
        participants,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        settings: {
          isActive: true,
          maxParticipants: type === 'global' ? 1000 : (type === 'game' ? 2 : 50),
          isModerated: type === 'global'
        },
        gameId: gameId || null
      });

      // Add participants to the room
      for (const userId of participants) {
        await this.addParticipant(roomRef.id, userId, 'participant');
      }

      return roomRef.id;
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  // Send message
  static async sendMessage(
    roomId: string,
    userId: string,
    username: string,
    content: string,
    messageType: 'text' | 'system' | 'reaction' = 'text',
    replyTo?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get user's moderation preferences
      const userSettings = await this.getUserChatSettings(userId);
      
      // Moderate content
      const moderation = ModerationService.moderateContent(
        content, 
        userSettings?.profanityFilter || 'moderate'
      );

      // Check if user is muted in this room
      const participant = await this.getParticipant(roomId, userId);
      if (participant?.isMuted) {
        return { success: false, error: 'You are muted in this chat' };
      }

      const messageData: Partial<ChatMessage> = {
        roomId,
        userId,
        username,
        content: moderation.moderatedContent,
        originalContent: moderation.isModerated ? content : undefined,
        messageType,
        timestamp: serverTimestamp(),
        isModerated: moderation.isModerated,
        moderationFlags: moderation.flags,
        replyTo: replyTo || undefined
      };

      const messageRef = await addDoc(collection(db, 'messages'), messageData);

      // Update room last activity
      await updateDoc(doc(db, 'chatRooms', roomId), {
        lastActivity: serverTimestamp()
      });

      // Log moderation if content was moderated
      if (moderation.isModerated) {
        await ModerationService.logModerationAction(
          messageRef.id,
          roomId,
          userId,
          'flagged',
          `Auto-moderated: ${moderation.flags.join(', ')}`,
          content,
          moderation.moderatedContent
        );
      }

      return { success: true, messageId: messageRef.id };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  // Get chat history
  static async getChatHistory(
    roomId: string, 
    limitCount: number = 50,
    beforeTimestamp?: Timestamp
  ): Promise<ChatMessage[]> {
    try {
      let q = query(
        collection(db, 'messages'),
        where('roomId', '==', roomId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (beforeTimestamp) {
        q = query(
          collection(db, 'messages'),
          where('roomId', '==', roomId),
          where('timestamp', '<', beforeTimestamp),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  // Real-time message listener
  static subscribeToMessages(
    roomId: string,
    callback: (messages: ChatMessage[]) => void,
    limitCount: number = 50
  ): () => void {
    const q = query(
      collection(db, 'messages'),
      where('roomId', '==', roomId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      
      // Reverse to show oldest first
      callback(messages.reverse());
    });
  }

  // Update typing status
  static async updateTypingStatus(
    roomId: string,
    userId: string,
    isTyping: boolean
  ): Promise<void> {
    try {
      const participantQuery = query(
        collection(db, 'chatParticipants'),
        where('roomId', '==', roomId),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(participantQuery);
      if (!snapshot.empty) {
        const participantRef = snapshot.docs[0].ref;
        await updateDoc(participantRef, {
          isTyping,
          typingTimestamp: isTyping ? serverTimestamp() : null
        });
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }

  // Add reaction to message
  static async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<boolean> {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDocs(query(
        collection(db, 'messages'),
        where('__name__', '==', messageId)
      ));

      if (!messageDoc.empty) {
        const messageData = messageDoc.docs[0].data() as ChatMessage;
        const reactions = messageData.reactions || {};
        
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }
        
        if (!reactions[emoji].includes(userId)) {
          reactions[emoji].push(userId);
          
          await updateDoc(messageRef, { reactions });
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error adding reaction:', error);
      return false;
    }
  }

  // Get or create friend chat room
  static async getOrCreateFriendChat(userId1: string, userId2: string): Promise<string> {
    try {
      // Check if chat room already exists
      const q = query(
        collection(db, 'chatRooms'),
        where('type', '==', 'friend'),
        where('participants', 'array-contains', userId1)
      );
      
      const snapshot = await getDocs(q);
      for (const doc of snapshot.docs) {
        const room = doc.data() as ChatRoom;
        if (room.participants.includes(userId2)) {
          return doc.id;
        }
      }

      // Create new friend chat room
      const participants = [userId1, userId2].sort(); // Consistent ordering
      return await this.createChatRoom('friend', participants, 'Friend Chat');
    } catch (error) {
      console.error('Error getting/creating friend chat:', error);
      throw error;
    }
  }

  // Get global chat room (singleton)
  static async getGlobalChatRoom(): Promise<string> {
    try {
      const q = query(
        collection(db, 'chatRooms'),
        where('type', '==', 'global')
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      // Create global chat room if it doesn't exist
      return await this.createChatRoom('global', [], 'Global Chat');
    } catch (error) {
      console.error('Error getting global chat room:', error);
      throw error;
    }
  }

  // Join chat room
  static async joinChatRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      // Check if user is already a participant
      const existingParticipant = await this.getParticipant(roomId, userId);
      if (existingParticipant) {
        return true;
      }

      await this.addParticipant(roomId, userId, 'participant');
      
      // Add user to room participants list
      const roomRef = doc(db, 'chatRooms', roomId);
      const roomDoc = await getDocs(query(
        collection(db, 'chatRooms'),
        where('__name__', '==', roomId)
      ));

      if (!roomDoc.empty) {
        const roomData = roomDoc.docs[0].data() as ChatRoom;
        const updatedParticipants = [...roomData.participants, userId];
        await updateDoc(roomRef, { participants: updatedParticipants });
      }

      return true;
    } catch (error) {
      console.error('Error joining chat room:', error);
      return false;
    }
  }

  private static async addParticipant(
    roomId: string, 
    userId: string, 
    role: 'participant' | 'moderator' | 'admin'
  ): Promise<void> {
    await addDoc(collection(db, 'chatParticipants'), {
      roomId,
      userId,
      role,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      isTyping: false,
      isMuted: false,
      permissions: {
        canSendMessages: true,
        canReact: true,
        canMention: true
      }
    });
  }

  private static async getParticipant(roomId: string, userId: string): Promise<ChatParticipant | null> {
    try {
      const q = query(
        collection(db, 'chatParticipants'),
        where('roomId', '==', roomId),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ChatParticipant;
      }
      return null;
    } catch (error) {
      console.error('Error getting participant:', error);
      return null;
    }
  }

  private static async getUserChatSettings(userId: string): Promise<UserChatSettings | null> {
    try {
      const q = query(
        collection(db, 'userChatSettings'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as UserChatSettings;
      }
      return null;
    } catch (error) {
      console.error('Error getting user chat settings:', error);
      return null;
    }
  }
}
```

### 3. Chat Context

#### React Context for Chat State Management
```typescript
// src/context/ChatContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatService } from '@/services/chatService';
import { useAuth } from './AuthContext';

interface ChatContextType {
  // Active chats
  activeRooms: ChatRoom[];
  currentRoom: string | null;
  messages: { [roomId: string]: ChatMessage[] };
  typingUsers: { [roomId: string]: string[] };
  
  // Chat state
  isChatOpen: boolean;
  isLoading: boolean;
  
  // Actions
  sendMessage: (roomId: string, content: string, replyTo?: string) => Promise<boolean>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  setCurrentRoom: (roomId: string | null) => void;
  toggleChat: () => void;
  updateTypingStatus: (roomId: string, isTyping: boolean) => void;
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  
  // Room management
  createFriendChat: (friendId: string) => Promise<string>;
  getGameChat: (gameId: string) => Promise<string>;
  getGlobalChat: () => Promise<string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeRooms, setActiveRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ [roomId: string]: ChatMessage[] }>({});
  const [typingUsers, setTypingUsers] = useState<{ [roomId: string]: string[] }>({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messageListeners, setMessageListeners] = useState<{ [roomId: string]: () => void }>({});

  // Subscribe to messages for active rooms
  useEffect(() => {
    if (!user) return;

    activeRooms.forEach(room => {
      if (!messageListeners[room.id]) {
        const unsubscribe = ChatService.subscribeToMessages(room.id, (newMessages) => {
          setMessages(prev => ({
            ...prev,
            [room.id]: newMessages
          }));
        });

        setMessageListeners(prev => ({
          ...prev,
          [room.id]: unsubscribe
        }));
      }
    });

    // Cleanup listeners for removed rooms
    Object.keys(messageListeners).forEach(roomId => {
      if (!activeRooms.find(room => room.id === roomId)) {
        messageListeners[roomId]();
        setMessageListeners(prev => {
          const { [roomId]: removed, ...rest } = prev;
          return rest;
        });
      }
    });

    return () => {
      Object.values(messageListeners).forEach(unsubscribe => unsubscribe());
    };
  }, [activeRooms, user]);

  const sendMessage = async (roomId: string, content: string, replyTo?: string): Promise<boolean> => {
    if (!user) return false;
    
    const result = await ChatService.sendMessage(
      roomId, 
      user.uid, 
      user.username || user.email || 'Anonymous',
      content,
      'text',
      replyTo
    );
    
    return result.success;
  };

  const joinRoom = async (roomId: string): Promise<boolean> => {
    if (!user) return false;
    
    const success = await ChatService.joinChatRoom(roomId, user.uid);
    if (success) {
      // Add room to active rooms if not already present
      // This would typically fetch room details from Firestore
    }
    return success;
  };

  const leaveRoom = async (roomId: string): Promise<boolean> => {
    // Implementation for leaving a room
    setActiveRooms(prev => prev.filter(room => room.id !== roomId));
    if (currentRoom === roomId) {
      setCurrentRoom(null);
    }
    return true;
  };

  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
  };

  const updateTypingStatus = async (roomId: string, isTyping: boolean) => {
    if (!user) return;
    await ChatService.updateTypingStatus(roomId, user.uid, isTyping);
  };

  const addReaction = async (messageId: string, emoji: string): Promise<boolean> => {
    if (!user) return false;
    return await ChatService.addReaction(messageId, user.uid, emoji);
  };

  const createFriendChat = async (friendId: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    return await ChatService.getOrCreateFriendChat(user.uid, friendId);
  };

  const getGameChat = async (gameId: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    // Implementation would create or get existing game chat
    return '';
  };

  const getGlobalChat = async (): Promise<string> => {
    return await ChatService.getGlobalChatRoom();
  };

  const value: ChatContextType = {
    activeRooms,
    currentRoom,
    messages,
    typingUsers,
    isChatOpen,
    isLoading,
    sendMessage,
    joinRoom,
    leaveRoom,
    setCurrentRoom,
    toggleChat,
    updateTypingStatus,
    addReaction,
    createFriendChat,
    getGameChat,
    getGlobalChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
```

## Frontend Components

### 1. Chat Container Component

```typescript
// src/components/chat/ChatContainer.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatTabs from './ChatTabs';

export default function ChatContainer() {
  const {
    isChatOpen,
    toggleChat,
    currentRoom,
    messages,
    typingUsers,
    isLoading
  } = useChat();
  
  const [chatHeight, setChatHeight] = useState(400);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentRoom]);

  // Handle chat resize
  const handleResize = (e: React.MouseEvent) => {
    const startY = e.clientY;
    const startHeight = chatHeight;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = Math.max(200, Math.min(800, startHeight + (startY - e.clientY)));
      setChatHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isChatOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleChat}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.27-.298l-3.637 1.153c-.331.105-.69-.142-.69-.496v-2.28A8.962 8.962 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
          </svg>
        </button>
      </div>
    );
  }

  const currentMessages = currentRoom ? messages[currentRoom] || [] : [];
  const currentTypingUsers = currentRoom ? typingUsers[currentRoom] || [] : [];

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-4 right-4 z-50 bg-gray-800 rounded-lg shadow-xl border border-gray-700"
      style={{ height: chatHeight, width: 400 }}
    >
      {/* Resize Handle */}
      <div
        className="absolute top-0 left-0 right-0 h-2 cursor-n-resize bg-gray-700 hover:bg-gray-600 rounded-t-lg"
        onMouseDown={handleResize}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 mt-2">
        <h3 className="text-white font-medium">Chat</h3>
        <button
          onClick={toggleChat}
          className="text-gray-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Chat Tabs */}
      <ChatTabs />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: chatHeight - 140 }}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : currentMessages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          currentMessages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}

        {/* Typing Indicators */}
        {currentTypingUsers.length > 0 && (
          <div className="text-sm text-gray-400 italic">
            {currentTypingUsers.join(', ')} {currentTypingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {currentRoom && <ChatInput roomId={currentRoom} />}
    </div>
  );
}
```

### 2. Chat Message Component

```typescript
// src/components/chat/ChatMessage.tsx
'use client';

import React, { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';

interface ChatMessageProps {
  message: ChatMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { addReaction } = useChat();
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);

  const formatTimestamp = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleReaction = async (emoji: string) => {
    await addReaction(message.id, emoji);
    setShowReactions(false);
  };

  const isOwnMessage = user?.uid === message.userId;

  if (message.messageType === 'system') {
    return (
      <div className="text-center text-sm text-gray-400 py-1">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        {/* Username and timestamp */}
        {!isOwnMessage && (
          <div className="text-xs text-gray-400 mb-1">
            {message.username} • {formatTimestamp(message.timestamp)}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`relative rounded-lg px-3 py-2 ${
            isOwnMessage
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-100'
          }`}
        >
          {/* Moderation warning */}
          {message.isModerated && (
            <div className="text-xs text-yellow-400 mb-1">
              ⚠️ Message was moderated
            </div>
          )}

          {/* Reply indicator */}
          {message.replyTo && (
            <div className="text-xs opacity-75 mb-1 border-l-2 border-gray-500 pl-2">
              Replying to a message
            </div>
          )}

          {/* Message content */}
          <div className="break-words">{message.content}</div>

          {/* Timestamp for own messages */}
          {isOwnMessage && (
            <div className="text-xs opacity-75 mt-1">
              {formatTimestamp(message.timestamp)}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(message.reactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`text-xs px-2 py-1 rounded-full bg-gray-600 hover:bg-gray-500 ${
                    users.includes(user?.uid || '') ? 'bg-blue-600' : ''
                  }`}
                >
                  {emoji} {users.length}
                </button>
              ))}
            </div>
          )}

          {/* Reaction button */}
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="absolute -right-8 top-0 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            😊
          </button>
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <div className="absolute z-10 bg-gray-700 rounded-lg p-2 shadow-lg flex gap-1 mt-1">
            {['👍', '❤️', '😄', '😮', '😢', '😠'].map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="hover:bg-gray-600 p-1 rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3. Chat Input Component

```typescript
// src/components/chat/ChatInput.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';

interface ChatInputProps {
  roomId: string;
}

export default function ChatInput({ roomId }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { sendMessage, updateTypingStatus } = useChat();
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle typing indicators
  useEffect(() => {
    if (message.trim() && !isTyping) {
      setIsTyping(true);
      updateTypingStatus(roomId, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        updateTypingStatus(roomId, false);
      }
    }, 2000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, roomId, updateTypingStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    // Clear typing indicator
    if (isTyping) {
      setIsTyping(false);
      updateTypingStatus(roomId, false);
    }

    const success = await sendMessage(roomId, trimmedMessage);
    if (success) {
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-700 p-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}
```

### 4. Chat Tabs Component

```typescript
// src/components/chat/ChatTabs.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';

export default function ChatTabs() {
  const { 
    currentRoom, 
    setCurrentRoom, 
    getGlobalChat, 
    createFriendChat,
    getGameChat 
  } = useChat();
  
  const [activeTab, setActiveTab] = useState<'global' | 'friends' | 'game'>('global');
  const [roomIds, setRoomIds] = useState<{
    global?: string;
    friends?: string;
    game?: string;
  }>({});

  // Initialize global chat on component mount
  useEffect(() => {
    const initializeGlobalChat = async () => {
      try {
        const globalRoomId = await getGlobalChat();
        setRoomIds(prev => ({ ...prev, global: globalRoomId }));
        if (!currentRoom) {
          setCurrentRoom(globalRoomId);
        }
      } catch (error) {
        console.error('Error initializing global chat:', error);
      }
    };

    initializeGlobalChat();
  }, []);

  const handleTabClick = async (tab: 'global' | 'friends' | 'game') => {
    setActiveTab(tab);
    
    let roomId: string | undefined;
    
    switch (tab) {
      case 'global':
        roomId = roomIds.global;
        if (!roomId) {
          roomId = await getGlobalChat();
          setRoomIds(prev => ({ ...prev, global: roomId }));
        }
        break;
      case 'friends':
        // This would show a list of friend chats or create one
        // For now, we'll just switch to friends mode
        roomId = roomIds.friends;
        break;
      case 'game':
        // This would be set when in a game
        roomId = roomIds.game;
        break;
    }
    
    if (roomId) {
      setCurrentRoom(roomId);
    }
  };

  return (
    <div className="flex border-b border-gray-700">
      <button
        onClick={() => handleTabClick('global')}
        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
          activeTab === 'global'
            ? 'text-blue-400 border-b-2 border-blue-400'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Global
      </button>
      <button
        onClick={() => handleTabClick('friends')}
        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
          activeTab === 'friends'
            ? 'text-blue-400 border-b-2 border-blue-400'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Friends
      </button>
      <button
        onClick={() => handleTabClick('game')}
        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
          activeTab === 'game'
            ? 'text-blue-400 border-b-2 border-blue-400'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Game
      </button>
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. **Database Setup**
   - Create Firestore collections and security rules
   - Implement content moderation service
   - Set up basic chat service

2. **Basic Chat Functionality**
   - Message sending and receiving
   - Real-time message updates
   - Simple content filtering

### Phase 2: Chat UI (Week 2)
1. **Chat Interface**
   - Expandable/collapsible chat container
   - Message display with timestamps
   - Chat input with typing indicators

2. **Chat Tabs**
   - Global, friends, and game chat tabs
   - Room switching functionality
   - Basic room management

### Phase 3: Advanced Features (Week 3)
1. **Social Features**
   - Message reactions and replies
   - User mentions and notifications
   - Friend chat rooms

2. **Moderation Enhancement**
   - Advanced content filtering
   - User reporting and blocking
   - Admin moderation tools

### Phase 4: Polish & Integration (Week 4)
1. **Game Integration**
   - In-game chat functionality
   - Game-specific chat rooms
   - Match result notifications

2. **Performance & UX**
   - Message pagination and search
   - Offline message sync
   - Mobile responsiveness

## Security Considerations

### Firestore Security Rules
```javascript
// Firestore security rules for chat system
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Chat rooms - users can only read rooms they participate in
    match /chatRooms/{roomId} {
      allow read: if request.auth != null && 
        (resource.data.type == 'global' || 
         request.auth.uid in resource.data.participants);
      allow write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
    }
    
    // Messages - users can only read messages from rooms they're in
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         hasModeratorRole(request.auth.uid, resource.data.roomId));
    }
    
    // Chat participants
    match /chatParticipants/{participantId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // User chat settings
    match /userChatSettings/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
  }
}
```

### Content Moderation
- **Profanity filtering** with configurable strictness levels
- **Spam detection** for repeated characters and messages
- **Link filtering** with whitelist for trusted domains
- **Rate limiting** to prevent message flooding
- **User reporting** system for manual moderation

## Performance Optimization

### Message Pagination
```typescript
// Implement efficient message loading
const loadMoreMessages = async (roomId: string, beforeTimestamp: Timestamp) => {
  const messages = await ChatService.getChatHistory(roomId, 50, beforeTimestamp);
  // Prepend to existing messages
};
```

### Connection Management
- **WebSocket connection pooling** for real-time updates
- **Offline message queuing** for when users are disconnected
- **Message deduplication** to prevent duplicate messages
- **Typing indicator debouncing** to reduce server load

## Testing Strategy

### Unit Tests
- Content moderation accuracy
- Message formatting and validation
- Typing indicator logic

### Integration Tests
- Real-time message delivery
- Room joining/leaving workflow
- Cross-platform compatibility

### End-to-End Tests
- Complete chat conversation flow
- Game chat integration
- Moderation system effectiveness

This implementation provides a comprehensive chat system that enhances the social experience in DashDice while maintaining security, performance, and user safety standards.
