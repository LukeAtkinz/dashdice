'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import UnifiedChatWindow from './UnifiedChatWindow';

export default function GlobalChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

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
