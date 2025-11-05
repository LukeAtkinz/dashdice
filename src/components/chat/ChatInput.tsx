/**
 * Enhanced Chat Input with Voice-to-Text Integration
 * Combines traditional text input with push-to-talk voice functionality
 */

import React, { useState, useRef, useEffect } from 'react';
import VoiceChat from './VoiceChat';

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showVoiceChat?: boolean;
  voiceLanguage?: string;
  className?: string;
  autoFocus?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  placeholder = "Type a message...",
  disabled = false,
  maxLength = 500,
  showVoiceChat = true,
  voiceLanguage = 'en-US',
  className = '',
  autoFocus = false
}) => {
  const [message, setMessage] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState(''); // Real-time voice transcript
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSentVoiceRef = useRef('');

  // Auto-focus input when component mounts
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle text input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send message function
  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && trimmedMessage.length > 0) {
      onSendMessage(trimmedMessage);
      setMessage('');
      
      // Refocus input after sending
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Handle voice message - REAL-TIME CONTINUOUS
  const handleVoiceMessage = (voiceText: string) => {
    const trimmedVoiceText = voiceText.trim();
    console.log('🎤 handleVoiceMessage:', trimmedVoiceText);
    
    if (trimmedVoiceText && trimmedVoiceText.length > 0) {
      // Update the transcript display in real-time
      setVoiceTranscript(trimmedVoiceText);
      
      // Auto-send EVERY update immediately - continuous flow
      // Only send if it's different from last sent to avoid duplicates
      if (trimmedVoiceText !== lastSentVoiceRef.current) {
        console.log('📤 Auto-sending voice message:', trimmedVoiceText);
        onSendMessage(trimmedVoiceText);
        lastSentVoiceRef.current = trimmedVoiceText;
      }
    }
  };

  // Toggle between text and voice mode
  const toggleInputMode = () => {
    setIsVoiceMode(!isVoiceMode);
    
    // Focus input when switching to text mode
    if (isVoiceMode && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars <= 50;
  const isOverLimit = remainingChars < 0;

  return (
    <div className={`chat-input ${className}`}>
      {/* Mode Toggle */}
      {showVoiceChat && (
        <div className="flex justify-center mb-3">
          <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            <button
              onClick={toggleInputMode}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                !isVoiceMode
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              ⌨️ Type
            </button>
            <button
              onClick={toggleInputMode}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isVoiceMode
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              🎤 Voice
            </button>
          </div>
        </div>
      )}

      {/* Text Input Mode */}
      {!isVoiceMode && (
        <div className="text-input-container">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                disabled={disabled}
                maxLength={maxLength}
                className={`
                  w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  placeholder-gray-500 dark:placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  ${isOverLimit ? 'border-red-500 focus:ring-red-500' : ''}
                  pr-16 // Make room for character counter
                `}
              />
              
              {/* Character Counter */}
              <div className={`
                absolute right-3 top-1/2 transform -translate-y-1/2
                text-xs font-medium transition-colors duration-200
                ${isOverLimit 
                  ? 'text-red-500' 
                  : isNearLimit 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-gray-400 dark:text-gray-500'
                }
              `}>
                {remainingChars}
              </div>
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={disabled || !message.trim() || isOverLimit}
              className={`
                px-6 py-3 rounded-lg font-medium transition-all duration-200
                ${disabled || !message.trim() || isOverLimit
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg active:scale-95'
                }
              `}
              title={isOverLimit ? 'Message too long' : 'Send message (Enter)'}
            >
              Send
            </button>
          </div>

          {/* Message Length Warning */}
          {isNearLimit && (
            <div className={`mt-2 text-xs ${
              isOverLimit 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {isOverLimit 
                ? `⚠️ Message is ${Math.abs(remainingChars)} characters too long`
                : `⚠️ ${remainingChars} characters remaining`
              }
            </div>
          )}
        </div>
      )}

      {/* Voice Input Mode */}
      {isVoiceMode && showVoiceChat && (
        <div 
          className="voice-input-container"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          style={{ touchAction: 'none' }}
        >
          <VoiceChat
            onMessage={handleVoiceMessage}
            disabled={disabled}
            language={voiceLanguage}
            placeholder="Hold to speak or press Space..."
            showTranscript={true}
            autoSend={true}
            minWordCount={1}
            className="w-full"
          />
        </div>
      )}

      {/* Input Mode Instructions */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        {isVoiceMode ? (
          <>🎤 Voice mode active • Hold button or Space to speak</>
        ) : (
          <>⌨️ Type mode active • Press Enter to send{showVoiceChat ? ' • Switch to voice above' : ''}</>
        )}
      </div>
    </div>
  );
};

export default ChatInput;