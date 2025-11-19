import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { MatchChatMessage, MatchChatSession, MatchChatMuteState } from '../types/chat';
import { 
  startMatchChatSession, 
  sendMatchChatMessage, 
  subscribeToMatchChat,
  endMatchChatSession 
} from '../services/matchChatService';
import { useAuth } from './AuthContext';

interface MatchChatContextType {
  messages: MatchChatMessage[];
  session: MatchChatSession | null;
  muteState: MatchChatMuteState;
  isOverlayOpen: boolean;
  
  // Actions
  initializeChat: (
    matchId: string,
    player1Id: string,
    player2Id: string,
    player1DisplayName: string,
    player2DisplayName: string,
    player1Language?: string,
    player2Language?: string
  ) => Promise<void>;
  sendMessage: (text: string, isVoice?: boolean, duration?: number) => Promise<void>;
  toggleChatMute: () => void;
  toggleMicMute: () => void;
  setOverlayOpen: (open: boolean) => void;
  endChat: () => Promise<void>;
  clearChat: () => void;
}

const MatchChatContext = createContext<MatchChatContextType | undefined>(undefined);

export const MatchChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MatchChatMessage[]>([]);
  const [session, setSession] = useState<MatchChatSession | null>(null);
  const [muteState, setMuteState] = useState<MatchChatMuteState>({
    chatMuted: false,
    micMuted: false
  });
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize chat session
  const initializeChat = useCallback(async (
    matchId: string,
    player1Id: string,
    player2Id: string,
    player1DisplayName: string,
    player2DisplayName: string,
    player1Language: string = 'en',
    player2Language: string = 'en'
  ) => {
    try {
      console.log('🚀 Initializing match chat...', matchId);

      // Start session
      const newSession = await startMatchChatSession(
        matchId,
        player1Id,
        player2Id,
        player1DisplayName,
        player2DisplayName,
        player1Language,
        player2Language
      );

      setSession(newSession);
      setMessages([]);

      // Subscribe to messages
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      unsubscribeRef.current = subscribeToMatchChat(
        matchId,
        (message) => {
          setMessages(prev => {
            // Prevent duplicates
            if (prev.some(m => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
        },
        (error) => {
          console.error('❌ Chat subscription error:', error);
        }
      );

      console.log('✅ Match chat initialized');
    } catch (error) {
      console.error('❌ Error initializing match chat:', error);
      throw error;
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (
    text: string,
    isVoice: boolean = false,
    duration?: number
  ) => {
    if (!session || !user) {
      console.error('❌ Cannot send message: session or user not available');
      return;
    }

    if (!text.trim()) {
      console.warn('⚠️ Empty message not sent');
      return;
    }

    try {
      await sendMatchChatMessage(
        session.matchId,
        user.uid,
        user.displayName || 'Unknown',
        text.trim(),
        session.player1Id === user.uid ? session.player1Language : session.player2Language,
        isVoice,
        duration
      );
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }, [session, user]);

  // Toggle chat mute
  const toggleChatMute = useCallback(() => {
    setMuteState(prev => ({
      ...prev,
      chatMuted: !prev.chatMuted
    }));
  }, []);

  // Toggle mic mute
  const toggleMicMute = useCallback(() => {
    setMuteState(prev => ({
      ...prev,
      micMuted: !prev.micMuted
    }));
  }, []);

  // End chat
  const endChat = useCallback(async () => {
    if (!session) return;

    try {
      console.log('🛑 Ending match chat...', session.matchId);
      await endMatchChatSession(session.matchId);

      // Unsubscribe from messages
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      console.log('✅ Match chat ended');
    } catch (error) {
      console.error('❌ Error ending match chat:', error);
    }
  }, [session]);

  // Clear chat (client-side only)
  const clearChat = useCallback(() => {
    setMessages([]);
    setSession(null);
    setIsOverlayOpen(false);
    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const setOverlayOpen = useCallback((open: boolean) => {
    setIsOverlayOpen(open);
  }, []);

  const value: MatchChatContextType = {
    messages,
    session,
    muteState,
    isOverlayOpen,
    initializeChat,
    sendMessage,
    toggleChatMute,
    toggleMicMute,
    setOverlayOpen,
    endChat,
    clearChat
  };

  return (
    <MatchChatContext.Provider value={value}>
      {children}
    </MatchChatContext.Provider>
  );
};

export const useMatchChat = () => {
  const context = useContext(MatchChatContext);
  if (!context) {
    throw new Error('useMatchChat must be used within MatchChatProvider');
  }
  return context;
};
