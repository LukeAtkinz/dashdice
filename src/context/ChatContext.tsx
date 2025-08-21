'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { ChatService } from '@/services/chatService';
import { 
  ChatRoom, 
  ChatMessage, 
  ChatParticipant, 
  UserChatSettings,
  TypingIndicator,
  ChatContextType 
} from '@/types/chat';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // State management
  const [activeRooms, setActiveRooms] = useState<Map<string, ChatRoom>>(new Map());
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map());
  const [participants, setParticipants] = useState<Map<string, ChatParticipant[]>>(new Map());
  const [typingIndicators, setTypingIndicators] = useState<Map<string, TypingIndicator[]>>(new Map());
  const [userSettings, setUserSettings] = useState<UserChatSettings | null>(null);
  
  // Subscription cleanup functions
  const [messageUnsubscribers, setMessageUnsubscribers] = useState<Map<string, () => void>>(new Map());
  const [typingUnsubscribers, setTypingUnsubscribers] = useState<Map<string, () => void>>(new Map());

  // Load user settings on auth
  useEffect(() => {
    if (user?.uid) {
      loadUserSettings();
    } else {
      setUserSettings(null);
    }
  }, [user]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      messageUnsubscribers.forEach(unsubscribe => unsubscribe());
      typingUnsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Load user chat settings
  const loadUserSettings = async () => {
    if (!user?.uid) return;
    
    try {
      const settings = await ChatService.getUserChatSettings(user.uid);
      setUserSettings(settings);
    } catch (error) {
      console.error('Error loading user chat settings:', error);
      // Set default settings if we can't load from server
      setUserSettings({
        userId: user.uid,
        globalChatEnabled: true,
        friendMessagesEnabled: true,
        gameMessagesEnabled: true,
        soundNotifications: true,
        showTypingIndicators: true,
        profanityFilter: 'moderate',
        blockedUsers: [],
        mutedRooms: [],
        notificationSettings: {
          mentions: true,
          friendMessages: true,
          gameMessages: true
        }
      });
    }
  };

  // Create chat room
  const createRoom = useCallback(async (
    type: ChatRoom['type'],
    participants: string[],
    name: string,
    gameId?: string
  ): Promise<string> => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      const roomId = await ChatService.createChatRoom(type, participants, name, gameId);
      await joinRoom(roomId);
      return roomId;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }, [user]);

  // Join chat room
  const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      const success = await ChatService.joinChatRoom(roomId, user.uid);
      if (success) {
        // Subscribe to messages
        const messageUnsubscribe = ChatService.subscribeToMessages(
          roomId,
          (newMessages) => {
            setMessages(prev => new Map(prev.set(roomId, newMessages)));
          }
        );
        
        // Subscribe to typing indicators
        const typingUnsubscribe = ChatService.subscribeToTypingIndicators(
          roomId,
          (indicators) => {
            setTypingIndicators(prev => new Map(prev.set(roomId, indicators)));
          }
        );
        
        // Store unsubscribers
        setMessageUnsubscribers(prev => new Map(prev.set(roomId, messageUnsubscribe)));
        setTypingUnsubscribers(prev => new Map(prev.set(roomId, typingUnsubscribe)));
      }
      return success;
    } catch (error) {
      console.error('Error joining room:', error);
      // Return false but don't throw - allow UI to handle gracefully
      return false;
    }
  }, [user]);

  // Leave chat room
  const leaveRoom = useCallback(async (roomId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      const success = await ChatService.leaveChatRoom(roomId, user.uid);
      if (success) {
        // Clean up subscriptions
        const messageUnsub = messageUnsubscribers.get(roomId);
        if (messageUnsub) {
          messageUnsub();
          setMessageUnsubscribers(prev => {
            const newMap = new Map(prev);
            newMap.delete(roomId);
            return newMap;
          });
        }
        
        const typingUnsub = typingUnsubscribers.get(roomId);
        if (typingUnsub) {
          typingUnsub();
          setTypingUnsubscribers(prev => {
            const newMap = new Map(prev);
            newMap.delete(roomId);
            return newMap;
          });
        }
        
        // Clear local state
        setMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(roomId);
          return newMap;
        });
        
        setTypingIndicators(prev => {
          const newMap = new Map(prev);
          newMap.delete(roomId);
          return newMap;
        });
      }
      return success;
    } catch (error) {
      console.error('Error leaving room:', error);
      return false;
    }
  }, [user, messageUnsubscribers, typingUnsubscribers]);

  // Send message
  const sendMessage = useCallback(async (
    roomId: string,
    content: string,
    replyTo?: string
  ): Promise<boolean> => {
    if (!user?.uid || !user?.displayName) return false;
    
    try {
      return await ChatService.sendMessage(
        roomId,
        user.uid,
        user.displayName,
        content,
        replyTo
      );
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [user]);

  // Edit message (placeholder - would need message ownership check)
  const editMessage = useCallback(async (messageId: string, newContent: string): Promise<boolean> => {
    // Implementation would require updating the message document
    console.log('Edit message not yet implemented');
    return false;
  }, []);

  // Delete message (placeholder - would need message ownership check)
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    // Implementation would require soft-deleting the message document
    console.log('Delete message not yet implemented');
    return false;
  }, []);

  // Add reaction
  const addReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      return await ChatService.addReaction(messageId, user.uid, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
      return false;
    }
  }, [user]);

  // Remove reaction
  const removeReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      return await ChatService.removeReaction(messageId, user.uid, emoji);
    } catch (error) {
      console.error('Error removing reaction:', error);
      return false;
    }
  }, [user]);

  // Set typing indicator
  const setTyping = useCallback(async (roomId: string, isTyping: boolean): Promise<void> => {
    if (!user?.uid) return;
    
    try {
      await ChatService.setTypingIndicator(roomId, user.uid, isTyping);
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  }, [user]);

  // Mute user
  const muteUser = useCallback(async (roomId: string, userId: string, duration?: number): Promise<boolean> => {
    try {
      return await ChatService.muteUser(roomId, userId, duration);
    } catch (error) {
      console.error('Error muting user:', error);
      return false;
    }
  }, []);

  // Unmute user (placeholder)
  const unmuteUser = useCallback(async (roomId: string, userId: string): Promise<boolean> => {
    // Implementation would require updating participant document
    console.log('Unmute user not yet implemented');
    return false;
  }, []);

  // Block user
  const blockUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.uid || !userSettings) return false;
    
    try {
      const updatedBlockedUsers = [...userSettings.blockedUsers, userId];
      const success = await ChatService.updateUserChatSettings(user.uid, {
        blockedUsers: updatedBlockedUsers
      });
      
      if (success) {
        setUserSettings(prev => prev ? {
          ...prev,
          blockedUsers: updatedBlockedUsers
        } : null);
      }
      
      return success;
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  }, [user, userSettings]);

  // Unblock user
  const unblockUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.uid || !userSettings) return false;
    
    try {
      const updatedBlockedUsers = userSettings.blockedUsers.filter(id => id !== userId);
      const success = await ChatService.updateUserChatSettings(user.uid, {
        blockedUsers: updatedBlockedUsers
      });
      
      if (success) {
        setUserSettings(prev => prev ? {
          ...prev,
          blockedUsers: updatedBlockedUsers
        } : null);
      }
      
      return success;
    } catch (error) {
      console.error('Error unblocking user:', error);
      return false;
    }
  }, [user, userSettings]);

  // Update settings
  const updateSettings = useCallback(async (settings: Partial<UserChatSettings>): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      const success = await ChatService.updateUserChatSettings(user.uid, settings);
      if (success) {
        setUserSettings(prev => prev ? { ...prev, ...settings } : null);
      }
      return success;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  }, [user]);

  // Get friend chat room
  const getFriendChatRoom = useCallback(async (friendId: string): Promise<string> => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    try {
      return await ChatService.getFriendChatRoom(user.uid, friendId);
    } catch (error) {
      console.error('Error getting friend chat room:', error);
      throw error;
    }
  }, [user]);

  // Get global chat room
  const getGlobalChatRoom = useCallback(async (): Promise<string> => {
    try {
      return await ChatService.getGlobalChatRoom();
    } catch (error) {
      console.error('Error getting global chat room:', error);
      throw error;
    }
  }, []);

  // Get game chat room
  const getGameChatRoom = useCallback(async (gameId: string): Promise<string> => {
    try {
      return await ChatService.getGameChatRoom(gameId);
    } catch (error) {
      console.error('Error getting game chat room:', error);
      throw error;
    }
  }, []);

  // Utility functions
  const isUserTyping = useCallback((roomId: string, userId: string): boolean => {
    const indicators = typingIndicators.get(roomId) || [];
    return indicators.some(indicator => indicator.userId === userId);
  }, [typingIndicators]);

  const isUserMuted = useCallback((roomId: string, userId: string): boolean => {
    const roomParticipants = participants.get(roomId) || [];
    const participant = roomParticipants.find(p => p.userId === userId);
    return participant?.isMuted || false;
  }, [participants]);

  const isUserBlocked = useCallback((userId: string): boolean => {
    return userSettings?.blockedUsers.includes(userId) || false;
  }, [userSettings]);

  const canUserSendMessage = useCallback((roomId: string, userId: string): boolean => {
    const roomParticipants = participants.get(roomId) || [];
    const participant = roomParticipants.find(p => p.userId === userId);
    return participant?.permissions.canSendMessages && !participant.isMuted || false;
  }, [participants]);

  const contextValue: ChatContextType = {
    // State
    activeRooms,
    messages,
    participants,
    typingIndicators,
    userSettings,
    
    // Room management
    createRoom,
    joinRoom,
    leaveRoom,
    
    // Message management
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    
    // Typing indicators
    setTyping,
    
    // User management
    muteUser,
    unmuteUser,
    blockUser,
    unblockUser,
    
    // Settings
    updateSettings,
    
    // Utility functions
    getFriendChatRoom,
    getGlobalChatRoom,
    getGameChatRoom,
    
    // State queries
    isUserTyping,
    isUserMuted,
    isUserBlocked,
    canUserSendMessage
  };

  return (
    <ChatContext.Provider value={contextValue}>
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
