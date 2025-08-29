'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, X, Users, GamepadIcon } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { useFriends } from '@/context/FriendsContext';
import { useNavigation } from '@/context/NavigationContext';
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
  onUnreadCountChange?: (count: number) => void;
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
  initialTab,
  onUnreadCountChange 
}: UnifiedChatWindowProps) {
  const { user } = useAuth();
  const { friends } = useFriends();
  const { currentSection, sectionParams } = useNavigation();
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
  
  const [tabs, setTabs] = useState<ChatTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInMatch, setIsInMatch] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);

  // Mobile detection and keyboard height tracking
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    const handleViewportChange = () => {
      if (window.visualViewport && isMobile) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(Math.max(0, keyboardHeight));
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
    };
  }, [isMobile]);

  // Match detection and match chat management
  useEffect(() => {
    const wasInMatch = isInMatch;
    const previousMatchId = currentMatchId;
    
    // Check if user is currently in a match
    const inMatch = currentSection === 'match' && !!sectionParams.matchId;
    const matchId = sectionParams.matchId || null;
    
    setIsInMatch(inMatch);
    setCurrentMatchId(matchId);
    
    // Handle entering a match
    if (inMatch && matchId && (!wasInMatch || previousMatchId !== matchId)) {
      console.log('🎮 Entering match, creating match chat tab:', matchId);
      
      // Create match chat tab and hide Everyone tab
      const createMatchChat = async () => {
        try {
          const roomId = await getGameChatRoom(matchId);
          await joinRoom(roomId);
          
          const matchTab: ChatTab = {
            id: 'match-chat',
            roomId,
            type: 'game',
            title: 'Match',
            gameId: matchId,
            unreadCount: 0
          };
          
          setTabs(prevTabs => {
            // Remove any existing match chat tab
            const filteredTabs = prevTabs.filter(tab => tab.id !== 'match-chat');
            // Add match chat tab
            return [...filteredTabs, matchTab];
          });
          
          // Switch to match chat tab
          setActiveTabId('match-chat');
        } catch (error) {
          console.error('Error creating match chat:', error);
        }
      };
      
      createMatchChat();
    }
    
    // Handle leaving a match - add delay to prevent immediate deletion but reduce to avoid flicker
    if (wasInMatch && !inMatch && previousMatchId) {
      console.log('🚪 Leaving match, will remove match chat tab after delay:', previousMatchId);
      
      // Reduced delay from 1000ms to 500ms to prevent noticeable flicker
      setTimeout(() => {
        console.log('🗑️ Actually removing match chat tab now');
        setTabs(prevTabs => {
          const filteredTabs = prevTabs.filter(tab => tab.id !== 'match-chat');
          
          // If we were on match chat tab, switch to Everyone tab
          if (activeTabId === 'match-chat') {
            setActiveTabId('global');
          }
          
          return filteredTabs;
        });
      }, 500); // Reduced from 1000ms to 500ms to minimize flicker
    }
  }, [currentSection, sectionParams.matchId, isInMatch, currentMatchId, getGameChatRoom, joinRoom, activeTabId]);

  // Load persisted tabs from localStorage
  useEffect(() => {
    const loadPersistedTabs = async () => {
      try {
        const persistedTabsStr = localStorage.getItem('chatTabs');
        console.log('🗃️ Loading persisted chat tabs:', persistedTabsStr);
        const persistedData = persistedTabsStr ? JSON.parse(persistedTabsStr) : { tabs: [], activeTabId: null };
        
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
        for (const persistedTab of persistedData.tabs || []) {
          if (persistedTab.type === 'friend' && persistedTab.friendId) {
            try {
              console.log('🔄 Restoring friend chat tab:', persistedTab.title, persistedTab.friendId);
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
              
              if (persistedTab.id === persistedData.activeTabId) {
                hasActiveTab = true;
                setActiveTabId(friendTab.id);
              }
            } catch (error) {
              console.error('Error restoring friend chat tab:', error);
            }
          }
        }

        setTabs(validTabs);
        console.log('✅ Chat tabs restored:', validTabs.length, 'tabs loaded');
        
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

    if (isVisible && user?.uid) {
      loadPersistedTabs();
    }
  }, [isVisible, user?.uid, getGlobalChatRoom, getFriendChatRoom, joinRoom]);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (tabs.length > 0 && user?.uid) {
      const persistData = {
        tabs: tabs.filter(tab => tab.type === 'friend').map(tab => ({
          id: tab.id,
          type: tab.type,
          title: tab.title,
          friendId: tab.friendId
        })),
        activeTabId
      };
      console.log('💾 Saving chat tabs to localStorage:', persistData);
      localStorage.setItem('chatTabs', JSON.stringify(persistData));
    }
  }, [tabs, activeTabId, user?.uid]);

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

  // Get friend background style for chat styling
  const getFriendBackgroundStyle = (friendId: string) => {
    const friend = friends.find(f => f.friendId === friendId);
    if (!friend) return {};

    const friendData = friend.friendData as any;
    
    // Check if friend has display background equipped
    if (friendData?.inventory?.displayBackgroundEquipped) {
      const background = friendData.inventory.displayBackgroundEquipped;
      
      // Handle complete background objects with name, file, and type
      if (typeof background === 'object' && background.file && background.type) {
        // For video backgrounds, return empty style (videos handled separately)
        if (background.type === 'video') {
          return {}; 
        }
        
        // For image backgrounds
        if (background.type === 'image' && background.file) {
          let backgroundPath = background.file;
          
          // Fix common background paths
          if (backgroundPath === 'All For Glory.jpg' || backgroundPath === '/backgrounds/All For Glory.jpg') {
            backgroundPath = '/backgrounds/All For Glory.jpg';
          } else if (!backgroundPath.startsWith('/') && !backgroundPath.startsWith('http')) {
            backgroundPath = `/backgrounds/${backgroundPath}`;
          }
          
          return {
            backgroundImage: `url('${backgroundPath}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          };
        }
      }
    }
    
    return {};
  };

  // Get friend video background if applicable
  const getFriendVideoBackground = (friendId: string) => {
    const friend = friends.find(f => f.friendId === friendId);
    if (!friend) return null;

    const friendData = friend.friendData as any;
    
    if (friendData?.inventory?.displayBackgroundEquipped) {
      const background = friendData.inventory.displayBackgroundEquipped;
      
      if (typeof background === 'object' && background.type === 'video' && background.file) {
        let videoPath = background.file;
        
        // Fix common video background paths
        if (videoPath === 'New Day.mp4' || videoPath === '/backgrounds/New Day.mp4') {
          videoPath = '/backgrounds/New Day.mp4';
        } else if (videoPath === 'On A Mission.mp4' || videoPath === '/backgrounds/On A Mission.mp4') {
          videoPath = '/backgrounds/On A Mission.mp4';
        } else if (videoPath === 'Underwater.mp4' || videoPath === '/backgrounds/Underwater.mp4') {
          videoPath = '/backgrounds/Underwater.mp4';
        } else if (!videoPath.startsWith('/') && !videoPath.startsWith('http')) {
          videoPath = `/backgrounds/${videoPath}`;
        }
        
        return videoPath;
      }
    }
    
    return null;
  };

  // Calculate unread count for friend chats only
  const calculateUnreadCount = (tab: ChatTab) => {
    if (tab.type !== 'friend') return 0;
    
    // Get messages for this room
    const roomMessages = messages.get(tab.roomId) || [];
    
    // For now, simulate unread count based on messages from other users
    // In a real implementation, you'd track last read timestamp
    const unreadMessages = roomMessages.filter(msg => 
      msg.userId !== user?.uid && 
      // Simulate: messages from last 10 minutes are "unread"
      msg.timestamp && msg.timestamp.toDate() > new Date(Date.now() - 10 * 60 * 1000)
    );
    
    return unreadMessages.length;
  };

  // Update unread counts when messages change
  useEffect(() => {
    setTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab => ({
        ...tab,
        unreadCount: tab.type === 'friend' ? calculateUnreadCount(tab) : 0
      }));
      
      // Calculate total unread count for friend chats only and notify parent
      const totalUnread = updatedTabs
        .filter(tab => tab.type === 'friend')
        .reduce((sum, tab) => sum + tab.unreadCount, 0);
      
      if (onUnreadCountChange) {
        onUnreadCountChange(totalUnread);
      }
      
      return updatedTabs;
    });
  }, [messages, user?.uid, onUnreadCountChange]);

  // Clear unread count when tab becomes active
  useEffect(() => {
    if (activeTabId) {
      setTabs(prevTabs => prevTabs.map(tab => 
        tab.id === activeTabId ? { ...tab, unreadCount: 0 } : tab
      ));
    }
  }, [activeTabId]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const currentMessages = activeTab ? messages.get(activeTab.roomId) || [] : [];
  const roomTyping = activeTab ? typingIndicators.get(activeTab.roomId) || [] : [];

  // Get friend background styles for active tab
  const friendBackgroundStyle = activeTab?.type === 'friend' && activeTab.friendId 
    ? getFriendBackgroundStyle(activeTab.friendId) 
    : {};
  
  const friendVideoBackground = activeTab?.type === 'friend' && activeTab.friendId 
    ? getFriendVideoBackground(activeTab.friendId) 
    : null;

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className={`fixed z-50 shadow-xl border border-gray-700 overflow-hidden ${
        isMobile 
          ? 'bottom-0 left-0 right-0' 
          : `${position === 'bottom-left' ? 'bottom-4 left-4' : 'bottom-4 right-4'}`
      }`}
      style={{
        width: isMobile ? '100vw' : '400px',
        height: isMobile 
          ? `min(500px, calc(100vh - ${keyboardHeight}px))` 
          : 'min(500px, 80vh)',
        maxHeight: isMobile ? `calc(100vh - ${keyboardHeight}px)` : '80vh',
        borderRadius: isMobile ? '20px 20px 0 0' : '20px',
        // Apply friend background or default
        ...friendBackgroundStyle,
        // Ensure proper z-indexing
        zIndex: 50
      }}
    >
      {/* Friend video background if applicable */}
      {friendVideoBackground && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: -2 }}
        >
          <source src={friendVideoBackground} type="video/mp4" />
        </video>
      )}
      
      {/* Default background for non-friend chats - LIGHT OVERLAY */}
      {!friendBackgroundStyle.backgroundImage && !friendVideoBackground && (
        <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" style={{ zIndex: -1 }} />
      )}

      {/* Header with tabs - FIXED AT TOP */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0 rounded-t-[20px] relative z-10"
           style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {tabs
            .filter(tab => {
              // Hide "Everyone" tab when in a match
              if (isInMatch && tab.type === 'global') {
                return false;
              }
              return true;
            })
            .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeTabId === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${tab.type === 'global' ? 'min-w-[80px]' : ''}`}
              style={{ borderRadius: '8px', fontFamily: 'Audiowide, monospace' }}
            >
              {/* Only show icon for global and game tabs, not friend tabs */}
              {tab.type === 'global' && <Users size={14} />}
              {tab.type === 'game' && <GamepadIcon size={14} />}
              <span className={`truncate ${tab.type === 'global' ? 'max-w-none' : 'max-w-16'}`}>
                {tab.type === 'global' ? 'Everyone' : tab.title}
              </span>
              {/* Only show unread count for friend chats */}
              {tab.type === 'friend' && tab.unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1 min-w-4 h-4 flex items-center justify-center">
                  {tab.unreadCount}
                </span>
              )}
              {tab.type !== 'global' && tab.id !== 'match-chat' && (
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
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Chat content - ABSOLUTE POSITIONED FOR PROPER LAYOUT */}
      <div className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col">
        {/* Messages area - SCROLLABLE MIDDLE SECTION */}
            <div className="flex-1 overflow-hidden min-h-0 relative">
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
            <div className={`flex-shrink-0 border-t border-gray-700 relative ${isMobile ? 'rounded-b-0' : 'rounded-b-[20px]'}`}
                 style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
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
          </div>
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
