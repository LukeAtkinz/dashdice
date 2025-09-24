'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import UnifiedChatWindow from './UnifiedChatWindow';

// Global state for managing chat visibility
let globalChatToggle: (() => void) | null = null;

export default function GlobalChatButton() {
  const { user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Don't render chat button for guests (non-authenticated users)
  if (!user) {
    return null;
  }

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Register global toggle function
  useEffect(() => {
    globalChatToggle = () => {
      setIsChatOpen(true);
    };

    return () => {
      globalChatToggle = null;
    };
  }, []);

  return (
    <>
      {/* Floating Chat Button - Hidden when chat is open */}
      {!isChatOpen && (
        <motion.button
          onClick={handleToggleChat}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors
                     bottom-24 right-4 
                     md:bottom-4 md:left-4"
          style={{
            width: '3rem', // 48px
            height: '3rem', // 48px
            padding: '0.75rem',
            position: 'fixed', // Ensure it stays fixed to viewport
            zIndex: 9999 // High z-index to stay above navigation and everything else
          }}
          title="Open Chat"
        >
          <MessageCircle size={24} />
          {/* Unread count badge */}
          {totalUnreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
            >
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </motion.span>
          )}
        </motion.button>
      )}

      {/* Unified Chat Window */}
      <UnifiedChatWindow
        isVisible={isChatOpen}
        onToggle={handleToggleChat}
        position="bottom-left"
        onUnreadCountChange={setTotalUnreadCount}
      />
    </>
  );
}

// Export function to open chat from anywhere
export const openChatWindow = () => {
  if (globalChatToggle) {
    globalChatToggle();
  }
};
