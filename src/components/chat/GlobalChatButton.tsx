'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import ChatWindow from './ChatWindow';

export default function GlobalChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const { getGlobalChatRoom, joinRoom } = useChat();

  const handleOpenGlobalChat = async () => {
    try {
      // Get or create global chat room
      const roomId = await getGlobalChatRoom();
      await joinRoom(roomId);
      setChatRoomId(roomId);
      setIsChatOpen(true);
    } catch (error) {
      console.error('Error opening global chat:', error);
      // You might want to show a toast notification here
      alert('Unable to open chat. Please check your connection and try again.');
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        onClick={handleOpenGlobalChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-4 left-4 z-40 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
        title="Open Global Chat"
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* Global Chat Window */}
      {isChatOpen && chatRoomId && (
        <ChatWindow
          roomId={chatRoomId}
          isVisible={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          position="bottom-left"
          height={500}
          width={400}
        />
      )}
    </>
  );
}
