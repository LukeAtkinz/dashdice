'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Minus, Users, GamepadIcon } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ChatTab {
  id: string;
  roomId: string;
  type: 'global' | 'friend' | 'game';
  title: string;
  friendId?: string;
  gameId?: string;
  unreadCount: number;
}

interface UnifiedChatWindowProps {
  isVisible: boolean;
  onToggle: () => void;
  position?: 'bottom-left' | 'bottom-right';
  initialTab?: {
    roomId: string;
    type: 'global' | 'friend' | 'game';
    title: string;
    friendId?: string;
    gameId?: string;
  };
}

// Global state for managing chat requests
let globalChatWindow: UnifiedChatWindowRef | null = null;

export interface UnifiedChatWindowRef {
  openFriendChat: (friendId: string, friendName: string) => Promise<void>;
  openGameChat: (gameId: string) => Promise<void>;
}

export default function UnifiedChatWindow({ 
  isVisible, 
  onToggle, 
  position = 'bottom-left',
  initialTab 
}: UnifiedChatWindowProps) {
  const { user } = useAuth();
  const { 
    messages, 
    activeRooms, 
    sendMessage, 
    joinRoom, 
    getGlobalChatRoom,
    getFriendChatRoom,
    getGameChatRoom,
    typingIndicators
  } = useChat();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [tabs, setTabs] = useState<ChatTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Load persisted tabs from localStorage
  useEffect(() => {
    const loadPersistedTabs = async () => {
      try {
        const persistedTabsStr = localStorage.getItem('chatTabs');
        const persistedTabs = persistedTabsStr ? JSON.parse(persistedTabsStr) : [];
        
        // Always ensure global chat is present
        const globalRoomId = await getGlobalChatRoom();
        await joinRoom(globalRoomId);
        
        const globalTab: ChatTab = {
          id: 'global',
          roomId: globalRoomId,
          type: 'global',
          title: 'Everyone',
          unreadCount: 0
        };

        const validTabs = [globalTab];
        let hasActiveTab = false;

        // Re-create friend chats from persisted data
        for (const persistedTab of persistedTabs) {
          if (persistedTab.type === 'friend' && persistedTab.friendId) {
            try {
              const roomId = await getFriendChatRoom(persistedTab.friendId);
              await joinRoom(roomId);
              
              const friendTab: ChatTab = {
                id: `friend-${persistedTab.friendId}`,
                roomId,
                type: 'friend',
                title: persistedTab.title,
                friendId: persistedTab.friendId,
                unreadCount: 0
              };
              
              validTabs.push(friendTab);
              
              if (persistedTab.id === persistedTab.activeTabId) {
                hasActiveTab = true;
                setActiveTabId(friendTab.id);
              }
            } catch (error) {
              console.error('Error restoring friend chat tab:', error);
            }
          }
        }

        setTabs(validTabs);
        
        // If no active tab was restored, default to global
        if (!hasActiveTab) {
          setActiveTabId('global');
        }
      } catch (error) {
        console.error('Error loading persisted tabs:', error);
        // Fallback to just global chat
        const globalRoomId = await getGlobalChatRoom();
        await joinRoom(globalRoomId);
        
        const globalTab: ChatTab = {
          id: 'global',
          roomId: globalRoomId,
          type: 'global',
          title: 'Everyone',
          unreadCount: 0
        };

        setTabs([globalTab]);
        setActiveTabId('global');
      }
    };

    if (isVisible && tabs.length === 0) {
      loadPersistedTabs();
    }
  }, [isVisible, getGlobalChatRoom, getFriendChatRoom, joinRoom, tabs.length]);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (tabs.length > 0) {
      const persistData = {
        tabs: tabs.filter(tab => tab.type === 'friend').map(tab => ({
          id: tab.id,
          type: tab.type,
          title: tab.title,
          friendId: tab.friendId
        })),
        activeTabId
      };
      localStorage.setItem('chatTabs', JSON.stringify(persistData));
    }
  }, [tabs, activeTabId]);

  // Register this instance globally
  useEffect(() => {
    const chatRef: UnifiedChatWindowRef = {
      openFriendChat: async (friendId: string, friendName: string) => {
        try {
          const existingTab = tabs.find(tab => tab.friendId === friendId);
          if (existingTab) {
            setActiveTabId(existingTab.id);
            return;
          }

          const roomId = await getFriendChatRoom(friendId);
          await joinRoom(roomId);

          const newTab: ChatTab = {
            id: `friend-${friendId}`,
            roomId,
            type: 'friend',
            title: friendName,
            friendId,
            unreadCount: 0
          };

          setTabs(prevTabs => [...prevTabs, newTab]);
          setActiveTabId(newTab.id);
        } catch (error) {
          console.error('Error opening friend chat:', error);
        }
      },
      openGameChat: async (gameId: string) => {
        try {
          const existingTab = tabs.find(tab => tab.gameId === gameId);
          if (existingTab) {
            setActiveTabId(existingTab.id);
            return;
          }

          const roomId = await getGameChatRoom(gameId);
          await joinRoom(roomId);

          const newTab: ChatTab = {
            id: `game-${gameId}`,
            roomId,
            type: 'game',
            title: 'Game Chat',
            gameId,
            unreadCount: 0
          };

          setTabs(prevTabs => [...prevTabs, newTab]);
          setActiveTabId(newTab.id);
        } catch (error) {
          console.error('Error opening game chat:', error);
        }
      }
    };

    globalChatWindow = chatRef;
    return () => {
      globalChatWindow = null;
    };
  }, [tabs, getFriendChatRoom, getGameChatRoom, joinRoom]);

  // Add initial tab if provided
  useEffect(() => {
    if (initialTab && !tabs.find(tab => 
      (tab.friendId === initialTab.friendId && initialTab.type === 'friend') ||
      (tab.gameId === initialTab.gameId && initialTab.type === 'game')
    )) {
      const newTab: ChatTab = {
        id: initialTab.type === 'friend' ? `friend-${initialTab.friendId}` : 
            initialTab.type === 'game' ? `game-${initialTab.gameId}` : 'global',
        roomId: initialTab.roomId,
        type: initialTab.type,
        title: initialTab.title,
        friendId: initialTab.friendId,
        gameId: initialTab.gameId,
        unreadCount: 0
      };

      setTabs(prevTabs => {
        const updatedTabs = [...prevTabs, newTab];
        return updatedTabs;
      });
      setActiveTabId(newTab.id);
    }
  }, [initialTab, tabs]);

  const closeTab = (tabId: string) => {
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // If closing active tab, switch to first available tab
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[0].id);
      }
      
      return newTabs;
    });
  };

  const handleSendMessage = async (content: string) => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab || !user) return;

    try {
      await sendMessage(activeTab.roomId, content);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getTabIcon = (type: string) => {
    switch (type) {
      case 'global': return <Users size={14} />;
      case 'friend': return <MessageCircle size={14} />;
      case 'game': return <GamepadIcon size={14} />;
      default: return <MessageCircle size={14} />;
    }
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const currentMessages = activeTab ? messages.get(activeTab.roomId) || [] : [];
  const roomTyping = activeTab ? typingIndicators.get(activeTab.roomId) || [] : [];

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className={`fixed ${position === 'bottom-left' ? 'bottom-4 left-4' : 'bottom-4 right-4'} z-50 bg-gray-900/95 backdrop-blur-lg shadow-xl border border-gray-700`}
      style={{
        width: isMinimized ? '300px' : '400px',
        height: isMinimized ? 'auto' : '500px',
        maxHeight: '80vh',
        borderRadius: '20px' // Added 20px border radius
      }}
    >
      {/* Header with tabs - FIXED AT TOP */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0 rounded-t-[20px]">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-3 py-1 rounded text-sm whitespace-nowrap transition-colors ${
                activeTabId === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${tab.type === 'global' ? 'min-w-[80px]' : ''}`}
            >
              {tab.type !== 'global' && getTabIcon(tab.type)}
              <span className={`truncate ${tab.type === 'global' ? 'max-w-none' : 'max-w-16'}`}>
                {tab.type === 'global' ? 'Everyone' : tab.title}
              </span>
              {tab.unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1 min-w-4 h-4 flex items-center justify-center">
                  {tab.unreadCount}
                </span>
              )}
              {tab.type !== 'global' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="ml-1 hover:bg-red-500 rounded p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Chat content - ABSOLUTE POSITIONED FOR PROPER LAYOUT */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col"
          >
            {/* Messages area - SCROLLABLE MIDDLE SECTION */}
            <div className="flex-1 overflow-hidden min-h-0">
              {activeTab && (
                <MessageList
                  roomId={activeTab.roomId}
                  messages={currentMessages}
                  currentUserId={user?.uid || ''}
                  onReply={() => {}}
                  onReact={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              )}
            </div>

            {/* Message input - ABSOLUTELY FIXED AT BOTTOM */}
            <div className="flex-shrink-0 border-t border-gray-700 bg-gray-800 rounded-b-[20px]">
              {/* Typing indicators */}
              {roomTyping.length > 0 && (
                <div className="px-3 py-1 text-xs text-gray-400 italic border-b border-gray-700">
                  {roomTyping.map(indicator => indicator.username).join(', ')} 
                  {roomTyping.length === 1 ? ' is' : ' are'} typing...
                </div>
              )}
              
              <MessageInput
                roomId={activeTab?.roomId || ''}
                onSend={handleSendMessage}
                disabled={!activeTab}
                placeholder={`Message ${activeTab?.type === 'global' ? 'Everyone' : activeTab?.title || 'chat'}...`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Export function to open friend chat from outside
export const openFriendChatInUnified = (friendId: string, friendName: string) => {
  if (globalChatWindow) {
    globalChatWindow.openFriendChat(friendId, friendName);
  }
};

export const openGameChatInUnified = (gameId: string) => {
  if (globalChatWindow) {
    globalChatWindow.openGameChat(gameId);
  }
};
