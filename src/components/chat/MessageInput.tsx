'use client';

import React, { useState, useRef, forwardRef } from 'react';
import { useChat } from '@/context/ChatContext';
import { MessageInputProps } from '@/types/chat';

const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(({
  roomId,
  placeholder = "Type a message...",
  replyingTo,
  onSend,
  onCancelReply,
  disabled = false
}, ref) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { setTyping } = useChat();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicators
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      setTyping(roomId, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTyping(roomId, false);
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled) return;

    onSend(message);
    setMessage('');
    
    // Clear typing indicator immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    setTyping(roomId, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    
    if (e.key === 'Escape' && replyingTo && onCancelReply) {
      onCancelReply();
    }
  };

  return (
    <div className="border-t border-gray-700 bg-gray-800">
      <form onSubmit={handleSubmit} className="p-3">
        <div className="flex gap-2">
          <input
            ref={ref}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Chat disabled" : placeholder}
            disabled={disabled}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            maxLength={500}
          />
          
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            Send
          </button>
        </div>
        
        {/* Character count */}
        {message.length > 400 && (
          <div className="text-xs text-gray-400 mt-1 text-right">
            {message.length}/500
          </div>
        )}
      </form>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;
