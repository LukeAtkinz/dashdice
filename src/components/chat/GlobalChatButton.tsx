'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import UnifiedChatWindow from './UnifiedChatWindow';

// Global state for managing chat visibility
let globalChatToggle: (() => void) | null = null;

export default function GlobalChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);

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
      {/* Floating Chat Button */}
      <motion.button
        onClick={handleToggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-4 left-4 sm:bottom-4 sm:left-4 mb-16 sm:mb-0 z-40 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
        title="Open Chat"
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* Unified Chat Window */}
      <UnifiedChatWindow
        isVisible={isChatOpen}
        onToggle={handleToggleChat}
        position="bottom-left"
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
