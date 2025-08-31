'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageListProps, ChatMessage } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';

export default function MessageList({ 
  roomId, 
  messages, 
  currentUserId, 
  onReply, 
  onReact, 
  onEdit, 
  onDelete 
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimestamp = (timestamp: any) => {
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'now';
    }
  };

  const isOwnMessage = (message: ChatMessage) => {
    return message.userId === currentUserId;
  };

  const getMessageBubbleClasses = (message: ChatMessage) => {
    const baseClasses = "max-w-[80%] rounded-lg p-3 break-words";
    
    if (message.messageType === 'system') {
      return `${baseClasses} bg-gray-700 text-gray-300 text-center mx-auto text-sm`;
    }
    
    if (isOwnMessage(message)) {
      return `${baseClasses} bg-blue-600 text-white ml-auto`;
    }
    
    return `${baseClasses} bg-gray-700 text-white`;
  };

  const renderReactions = (message: ChatMessage) => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(message.reactions).map(([emoji, users]) => (
          users.length > 0 && (
            <button
              key={emoji}
              onClick={() => onReact(message.id, emoji)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                users.includes(currentUserId) 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {emoji} {users.length}
            </button>
          )
        ))}
      </div>
    );
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
        className={`flex flex-col ${isOwnMessage(message) ? 'items-end' : 'items-start'} mb-4`}
      >
        {/* Username only */}
        {message.messageType !== 'system' && !isOwnMessage(message) && (
          <div className="text-xs text-gray-400 mb-1 font-medium">
            {message.username}
          </div>
        )}

        {/* Reply reference */}
        {message.replyTo && (
          <div className="text-xs text-gray-400 mb-1 italic">
            Replying to previous message
          </div>
        )}

        {/* Message bubble */}
        <div className={getMessageBubbleClasses(message)}>
          {/* Moderation notice */}
          {message.isModerated && (
            <div className="text-xs text-yellow-400 mb-2 italic">
              This message was automatically moderated
            </div>
          )}
          
          {/* Message content */}
          <div className="whitespace-pre-wrap">{message.content}</div>
          
          {/* Mentions highlighting */}
          {message.mentions && message.mentions.length > 0 && (
            <div className="text-xs text-blue-400 mt-1">
              Mentioned: {message.mentions.join(', ')}
            </div>
          )}

          {/* Time ago separator and timestamp */}
          <div className="mt-3 pt-2 border-t border-gray-600 border-opacity-30">
            <div className="text-xs text-gray-400 opacity-75">
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        </div>

        {/* Reactions */}
        {renderReactions(message)}

        {/* Message actions */}
        {message.messageType === 'text' && (
          <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onReply(message)}
              className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded"
            >
              Reply
            </button>
            
            {/* Quick reactions */}
            <div className="flex gap-1">
              {['👍', '❤️', '😂', '😮'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className="text-xs hover:bg-gray-600 rounded px-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            {/* Edit/Delete for own messages */}
            {isOwnMessage(message) && (
              <>
                <button
                  onClick={() => onEdit(message.id)}
                  className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(message.id)}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-3 space-y-2 group">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <>
          {messages.map((message, index) => renderMessage(message, index))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
