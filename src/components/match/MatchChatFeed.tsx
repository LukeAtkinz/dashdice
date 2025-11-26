import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMatchChat } from '../../context/MatchChatContext';
import { VoiceRecorder } from './VoiceRecorder';
import { useAuth } from '../../context/AuthContext';

interface MatchChatFeedProps {
  matchId: string;
  className?: string;
}

export const MatchChatFeed: React.FC<MatchChatFeedProps> = ({ matchId, className = '' }) => {
  const { user } = useAuth();
  const { 
    messages, 
    session, 
    muteState, 
    isOverlayOpen, 
    sendMessage,
    toggleChatMute,
    toggleMicMute,
    setOverlayOpen
  } = useMatchChat();

  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const overlayMessagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!muteState.chatMuted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, muteState.chatMuted]);

  // Auto-scroll overlay
  useEffect(() => {
    if (isOverlayOpen) {
      overlayMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOverlayOpen]);

  const handleSendText = async () => {
    if (!textInput.trim()) return;
    
    try {
      await sendMessage(textInput, false);
      setTextInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleVoiceTranscription = async (text: string, duration: number) => {
    try {
      await sendMessage(text, true, duration);
    } catch (error) {
      console.error('Failed to send voice message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // Get last 3 messages for compact view
  const recentMessages = messages.slice(-3);

  if (!session || !user) {
    return null;
  }

  return (
    <>
      {/* Compact Chat Feed - Single line display */}
      <div className={`relative ${className}`} style={{ zIndex: 20 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setOverlayOpen(true)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setOverlayOpen(true);
          }}
          className="cursor-pointer select-none active:scale-95 transition-transform"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          {/* Messages Preview - Up to 2 lines with animation */}
          <div className="min-h-[32px] max-h-[52px] overflow-hidden">
            {recentMessages.length === 0 ? (
              <div className="flex items-center justify-center h-[32px] bg-black rounded-lg px-3">
                <span className="text-white/40 text-xs"></span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {(() => {
                  // Get the last message and split into lines if needed
                  const lastMessage = recentMessages[recentMessages.length - 1];
                  const messageText = lastMessage.translatedText || lastMessage.originalText;
                  
                  // Split by newlines and show up to 2 lines
                  const lines = messageText.split('\n');
                  const displayLines = lines.slice(0, 2);
                  const isTwoLines = displayLines.length === 2;

                  return (
                    <motion.div
                      key={lastMessage.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className={`flex items-center ${isTwoLines ? 'h-auto py-1' : 'h-[32px]'}`}
                    >
                      <div className="bg-black rounded-lg px-3 py-1.5 flex items-start gap-1.5 max-w-full">
                        {lastMessage.isVoice && (
                          <svg className="w-3 h-3 text-white/60 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                          </svg>
                        )}
                        <div className="text-white text-xs leading-tight">
                          {displayLines.map((line, i) => (
                            <div key={i} className="truncate">
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </motion.div>
      </div>

      {/* Overlay Chat Window */}
      <AnimatePresence>
        {isOverlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 99999 }}
            onClick={() => setOverlayOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/20 w-full max-w-2xl flex flex-col shadow-2xl"
              style={{ maxHeight: 'min(600px, 90vh)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                {/* Username vs Username */}
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center justify-center gap-2 overflow-hidden">
                    <span className="text-white font-bold truncate" style={{ fontSize: 'clamp(14px, 4vw, 20px)' }}>
                      {session.player1DisplayName}
                    </span>
                    <span className="text-yellow-500 font-bold flex-shrink-0" style={{ fontSize: 'clamp(14px, 4vw, 20px)', fontFamily: 'Audiowide' }}>
                      VS
                    </span>
                    <span className="text-white font-bold truncate" style={{ fontSize: 'clamp(14px, 4vw, 20px)' }}>
                      {session.player2DisplayName}
                    </span>
                  </div>
                </div>
                {/* Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Mute Chat Button */}
                  <button
                    onClick={toggleChatMute}
                    className={`p-2 rounded-lg transition-colors ${
                      muteState.chatMuted 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                    title={muteState.chatMuted ? 'Unmute Chat' : 'Mute Chat'}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      {muteState.chatMuted ? (
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      ) : (
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                      )}
                    </svg>
                  </button>

                  {/* Mute Mic Button */}
                  <button
                    onClick={toggleMicMute}
                    className={`p-2 rounded-lg transition-colors ${
                      muteState.micMuted 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                    title={muteState.micMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      {muteState.micMuted ? (
                        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                      ) : (
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      )}
                    </svg>
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={() => setOverlayOpen(false)}
                    className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-white/30 text-sm">No messages yet. Start chatting!</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((message) => {
                      const isCurrentUser = message.fromUserId === user.uid;
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`
                            max-w-[75%] px-4 py-2 rounded-2xl
                            ${isCurrentUser 
                              ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
                              : 'bg-white/10 text-white'
                            }
                          `}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">
                                {message.fromDisplayName}
                              </span>
                              {message.isVoice && (
                                <div className="flex items-center gap-1 text-xs opacity-70">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                  </svg>
                                  {message.audioTranscriptionDuration && (
                                    <span>{message.audioTranscriptionDuration.toFixed(1)}s</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="break-words text-sm leading-relaxed">
                              {message.translatedText || message.originalText}
                            </p>
                            {message.translatedText && (
                              <p className="text-xs opacity-50 mt-1 italic">
                                Original: {message.originalText}
                              </p>
                            )}
                            <span className="text-xs opacity-50 mt-1 block">
                              {new Date((message.timestamp as any).seconds * 1000).toLocaleTimeString()}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                <div ref={overlayMessagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-white/10">
                <div className="flex items-end gap-2">
                  {/* Text Input */}
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendText();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 border rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                    style={{
                      backgroundColor: textInput.trim() ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                      borderColor: 'rgba(0, 0, 0, 1)',
                      borderWidth: '1px'
                    }}
                    disabled={muteState.chatMuted}
                    enterKeyHint="send"
                  />

                  {/* Voice Button - Mobile only */}
                  <div className="md:hidden">
                    <VoiceRecorder
                      matchId={matchId}
                      playerId={user.uid}
                      language={session.player1Id === user.uid ? session.player1Language : session.player2Language}
                      onTranscription={handleVoiceTranscription}
                      isMuted={muteState.micMuted}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
