'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { UnifiedChatContextType } from '@/types/chat';

const UnifiedChatContext = createContext<UnifiedChatContextType | undefined>(undefined);

interface ChatTab {
  id: string;
  roomId: string;
  type: 'global' | 'friend' | 'game';
  title: string;
  friendId?: string;
  gameId?: string;
}

interface UnifiedChatProviderProps {
  children: React.ReactNode;
  onOpenFriendChat?: (friendId: string, friendName: string) => void;
  onOpenGameChat?: (gameId: string) => void;
}

export function UnifiedChatProvider({ 
  children, 
  onOpenFriendChat,
  onOpenGameChat 
}: UnifiedChatProviderProps) {
  const [activeChats, setActiveChats] = useState<ChatTab[]>([]);

  const openFriendChat = useCallback(async (friendId: string, friendName: string) => {
    if (onOpenFriendChat) {
      onOpenFriendChat(friendId, friendName);
    }
    
    // Add to active chats if not already present
    setActiveChats(prev => {
      const exists = prev.find(chat => chat.friendId === friendId);
      if (exists) return prev;
      
      const newChat: ChatTab = {
        id: `friend-${friendId}`,
        roomId: '', // Will be set when room is created
        type: 'friend',
        title: friendName,
        friendId
      };
      
      return [...prev, newChat];
    });
  }, [onOpenFriendChat]);

  const openGameChat = useCallback(async (gameId: string) => {
    if (onOpenGameChat) {
      onOpenGameChat(gameId);
    }
    
    // Add to active chats if not already present
    setActiveChats(prev => {
      const exists = prev.find(chat => chat.gameId === gameId);
      if (exists) return prev;
      
      const newChat: ChatTab = {
        id: `game-${gameId}`,
        roomId: '', // Will be set when room is created
        type: 'game',
        title: 'Game Chat',
        gameId
      };
      
      return [...prev, newChat];
    });
  }, [onOpenGameChat]);

  const closeChatTab = useCallback((tabId: string) => {
    setActiveChats(prev => prev.filter(chat => chat.id !== tabId));
  }, []);

  const value: UnifiedChatContextType = {
    openFriendChat,
    openGameChat,
    closeChatTab,
    activeChats
  };

  return (
    <UnifiedChatContext.Provider value={value}>
      {children}
    </UnifiedChatContext.Provider>
  );
}

export function useUnifiedChat() {
  const context = useContext(UnifiedChatContext);
  if (context === undefined) {
    throw new Error('useUnifiedChat must be used within a UnifiedChatProvider');
  }
  return context;
}
