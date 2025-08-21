'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { ChatWindowProps } from '@/types/chat';
import { MessageList, MessageInput, ParticipantList } from './';
import { X, Users, Settings, Minimize2, Maximize2 } from 'lucide-react';

export default function ChatWindow({ 
  roomId, 
  isVisible, 
  onClose, 
  position = 'bottom-right',
  height = 400,
  width = 350 
}: ChatWindowProps) {
  const { user } = useAuth();
  const { 
    messages, 
    participants, 
    typingIndicators, 
    sendMessage, 
    addReaction, 
    setTyping 
  } = useChat();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const roomMessages = messages.get(roomId) || [];
  const roomParticipants = participants.get(roomId) || [];
  const roomTyping = typingIndicators.get(roomId) || [];

  // Auto-focus input when window opens
  useEffect(() => {
    if (isVisible && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible, isMinimized]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    const success = await sendMessage(roomId, content, replyingTo?.id);
    if (success) {
      setReplyingTo(null);
    }
  };

  const handleReply = (message: any) => {
    setReplyingTo(message);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    await addReaction(messageId, emoji);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'sidebar':
        return 'top-0 right-0 h-full';
      default:
        return 'bottom-4 right-4';
    }
  };

  const getWindowSize = () => {
    if (position === 'sidebar') {
      return { width: 400, height: '100vh' };
    }
    return { width, height: isMinimized ? 50 : height };
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.2 }}
        className={`fixed ${getPositionClasses()} z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden`}
        style={getWindowSize()}
      >
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-white font-medium text-sm">Chat</span>
            {roomParticipants.length > 0 && (
              <span className="text-gray-400 text-xs">
                {roomParticipants.length} online
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Show participants"
            >
              <Users size={16} />
            </button>
            
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              title="Close chat"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex h-full"
            >
              {/* Main chat area */}
              <div className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-hidden">
                  <MessageList
                    roomId={roomId}
                    messages={roomMessages}
                    currentUserId={user?.uid || ''}
                    onReply={handleReply}
                    onReact={handleReact}
                    onEdit={() => {}} // TODO: Implement
                    onDelete={() => {}} // TODO: Implement
                  />
                </div>

                {/* Typing indicators */}
                {roomTyping.length > 0 && (
                  <div className="px-3 py-1 text-xs text-gray-400 border-t border-gray-700">
                    {roomTyping.map(indicator => indicator.username).join(', ')} 
                    {roomTyping.length === 1 ? ' is' : ' are'} typing...
                  </div>
                )}

                {/* Reply preview */}
                {replyingTo && (
                  <div className="px-3 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-gray-400">Replying to </span>
                      <span className="text-blue-400">{replyingTo.username}</span>
                      <div className="text-gray-300 truncate mt-1">
                        {replyingTo.content}
                      </div>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Message input */}
                <MessageInput
                  roomId={roomId}
                  placeholder="Type a message..."
                  replyingTo={replyingTo}
                  onSend={handleSendMessage}
                  onCancelReply={() => setReplyingTo(null)}
                  ref={inputRef}
                />
              </div>

              {/* Participants sidebar */}
              <AnimatePresence>
                {showParticipants && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 150, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-l border-gray-700 bg-gray-850 overflow-hidden"
                  >
                    <ParticipantList
                      roomId={roomId}
                      participants={roomParticipants}
                      currentUserId={user?.uid || ''}
                      showModerationActions={false} // TODO: Check permissions
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
