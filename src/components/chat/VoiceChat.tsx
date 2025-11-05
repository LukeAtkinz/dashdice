/**
 * Voice Chat Component
 * Push-to-talk button with visual feedback and real-time transcription
 */

import React, { useState, useEffect } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

export interface VoiceChatProps {
  onMessage: (message: string) => void; // Callback when a final message is ready
  disabled?: boolean;
  placeholder?: string;
  language?: string;
  className?: string;
  showTranscript?: boolean; // Show live transcript
  autoSend?: boolean; // Automatically send completed messages
  minWordCount?: number; // Minimum words before auto-send
}

export const VoiceChat: React.FC<VoiceChatProps> = ({
  onMessage,
  disabled = false,
  placeholder = "Hold to speak...",
  language = 'en-US',
  className = '',
  showTranscript = true,
  autoSend = true, // Changed default to true for real-time
  minWordCount = 1  // Changed default to 1 for real-time
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [lastSentTranscript, setLastSentTranscript] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState('');

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    confidence,
    startListening,
    stopListening,
    clearTranscript,
    setLanguage
  } = useSpeechRecognition({
    config: {
      language,
      continuous: true,
      interimResults: true
    },
    onTranscript: (newTranscript: string, isFinal: boolean) => {
      console.log('🎤 onTranscript:', { newTranscript, isFinal, autoSend });
      
      // For real-time: send interim results as they come
      if (!isFinal && newTranscript.trim()) {
        setCurrentTranscript(newTranscript);
      }
      
      // For final results: send and clear
      if (isFinal && autoSend) {
        const wordCount = newTranscript.trim().split(/\s+/).length;
        console.log('🎤 Final transcript:', { newTranscript, wordCount, minWordCount });
        
        if (wordCount >= minWordCount && newTranscript.trim() !== lastSentTranscript.trim()) {
          console.log('🎤 Sending final message:', newTranscript.trim());
          onMessage(newTranscript.trim());
          setLastSentTranscript(newTranscript.trim());
          setCurrentTranscript('');
        }
      }
    },
    minConfidence: 0.5 // Lower confidence for real-time
  });

  // Update language when prop changes
  useEffect(() => {
    setLanguage(language);
  }, [language, setLanguage]);

  // Handle push-to-talk button press
  const handleMouseDown = async (event?: React.MouseEvent) => {
    // Prevent default to stop any propagation
    event?.preventDefault();
    event?.stopPropagation();
    
    console.log('🎤 handleMouseDown called:', { disabled, isSupported, isPressed });
    
    if (disabled || !isSupported) {
      console.log('🎤 Cannot start - disabled:', disabled, 'supported:', isSupported);
      return;
    }
    
    if (isPressed || isListening) {
      console.log('🎤 Already recording');
      return;
    }
    
    console.log('🎤 Setting isPressed to true and starting listening...');
    setIsPressed(true);
    
    try {
      const success = await startListening();
      console.log('🎤 startListening result:', success);
      if (!success) {
        console.log('🎤 Failed to start listening, resetting isPressed');
        setIsPressed(false);
      }
    } catch (error) {
      console.error('🎤 Error in handleMouseDown:', error);
      setIsPressed(false);
    }
  };

  const handleMouseUp = (event?: React.MouseEvent) => {
    // Prevent default to stop any propagation
    event?.preventDefault();
    event?.stopPropagation();
    
    console.log('🎤 handleMouseUp called:', { isPressed });
    
    if (!isPressed) return;
    
    console.log('🎤 Setting isPressed to false and stopping listening...');
    setIsPressed(false);
    stopListening();
    
    // Send message if we have a transcript and not using auto-send
    if (!autoSend && transcript.trim()) {
      const wordCount = transcript.trim().split(/\s+/).length;
      console.log('🎤 Transcript available:', transcript, 'wordCount:', wordCount, 'minWordCount:', minWordCount);
      if (wordCount >= minWordCount) {
        console.log('🎤 Sending message:', transcript.trim());
        onMessage(transcript.trim());
        clearTranscript();
        setLastSentTranscript('');
      }
    }
  };

  // Handle keyboard events for space bar push-to-talk
  useEffect(() => {
    // Don't add keyboard listeners if disabled or not supported
    if (disabled || !isSupported) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle space bar
      if (event.code !== 'Space' && event.key !== ' ') return;
      
      const activeElement = document.activeElement;
      console.log('🎤 Space key down:', {
        disabled,
        repeat: event.repeat,
        isPressed,
        activeElement: activeElement?.tagName,
        activeElementType: (activeElement as HTMLInputElement)?.type,
        activeElementId: activeElement?.id,
        activeElementClass: activeElement?.className
      });
      
      // Skip if user is typing in an input field, textarea, or contenteditable
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true' ||
        activeElement.getAttribute('role') === 'textbox'
      )) {
        console.log('🎤 Skipping - user is typing in input field');
        return;
      }
      
      // IMPORTANT: Prevent default space bar behavior
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      if (!event.repeat && !disabled && !isPressed && !isListening) {
        console.log('🎤 Space bar pressed - starting voice chat');
        handleMouseDown();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Only handle space bar
      if (event.code !== 'Space' && event.key !== ' ') return;
      
      const activeElement = document.activeElement;
      console.log('🎤 Space key up:', {
        disabled,
        activeElement: activeElement?.tagName,
        isPressed
      });
      
      // Skip if user is typing in an input field, textarea, or contenteditable
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true' ||
        activeElement.getAttribute('role') === 'textbox'
      )) {
        console.log('🎤 Skipping - user is typing in input field');
        return;
      }
      
      // IMPORTANT: Prevent default space bar behavior
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      if (!disabled && isPressed) {
        console.log('🎤 Space bar released - stopping voice chat');
        handleMouseUp();
      }
    };

    console.log('🎤 Adding keyboard event listeners for voice chat');
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      console.log('🎤 Removing keyboard event listeners for voice chat');
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [isPressed, disabled, isListening, transcript, autoSend, minWordCount]);

  // Manual send function for non-auto-send mode
  const handleSendMessage = () => {
    if (transcript.trim()) {
      onMessage(transcript.trim());
      clearTranscript();
      setLastSentTranscript('');
    }
  };

  // Clear transcript
  const handleClearTranscript = () => {
    clearTranscript();
    setLastSentTranscript('');
  };

  if (!isSupported) {
    return (
      <div className={`voice-chat-unsupported ${className}`}>
        <div className="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            🎤 Voice chat not supported in this browser
          </span>
        </div>
      </div>
    );
  }

  const buttonClasses = `
    relative overflow-hidden transition-all duration-200 ease-in-out
    ${isPressed || isListening 
      ? 'bg-red-500 hover:bg-red-600 shadow-lg scale-105' 
      : 'bg-blue-500 hover:bg-blue-600'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
    text-white rounded-full p-4 shadow-md select-none
  `;

  const displayTranscript = interimTranscript || transcript;
  const hasTranscript = displayTranscript.trim().length > 0;

  return (
    <div className={`voice-chat ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Voice Chat Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClasses}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMouseDown(e);
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMouseUp(e);
          }}
          onMouseLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMouseUp(e);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMouseDown();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMouseUp();
          }}
          disabled={disabled}
          title={isPressed ? "Release to stop recording" : "Hold to speak (or hold Space)"}
        >
          {/* Pulsing animation when listening */}
          {(isPressed || isListening) && (
            <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-25"></div>
          )}
          
          {/* Microphone Icon */}
          <svg 
            className={`w-6 h-6 z-10 relative transition-transform duration-200 ${
              isPressed || isListening ? 'scale-110' : ''
            }`}
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            {isPressed || isListening ? (
              // Recording icon (red dot)
              <circle cx="12" cy="12" r="8" />
            ) : (
              // Microphone icon
              <path d="M12 2C13.1 2 14 2.9 14 4V10C14 11.1 13.1 12 12 12S10 11.1 10 10V4C10 2.9 10.9 2 12 2ZM19 10V12C19 15.9 15.9 19 12 19S5 15.9 5 12V10H7V12C7 14.8 9.2 17 12 17S17 14.8 17 12V10H19ZM12 22H14V20H10V22H12Z" />
            )}
          </svg>
        </button>

        {/* Status Indicator */}
        <div className="flex flex-col">
          <span className={`text-xs font-medium transition-colors duration-200 ${
            isPressed || isListening 
              ? 'text-red-500' 
              : error 
              ? 'text-red-400' 
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {isPressed || isListening 
              ? '🔴 Recording...' 
              : error 
              ? '❌ Error' 
              : placeholder
            }
          </span>
          
          {confidence > 0 && (
            <span className="text-xs text-gray-400">
              Confidence: {Math.round(confidence * 100)}%
            </span>
          )}
        </div>

        {/* Manual Controls (when not auto-send) */}
        {!autoSend && hasTranscript && (
          <div className="flex gap-2">
            <button
              onClick={handleSendMessage}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-full transition-colors duration-200"
              title="Send message"
            >
              Send
            </button>
            <button
              onClick={handleClearTranscript}
              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded-full transition-colors duration-200"
              title="Clear transcript"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Live Transcript Display */}
      {showTranscript && (
        <div className="mt-3">
          {hasTranscript && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border-l-4 border-blue-500">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 text-xs font-medium mt-0.5">
                  {interimTranscript ? '✏️ Speaking...' : '📝 Transcript:'}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {transcript && (
                      <span className="font-medium">{transcript}</span>
                    )}
                    {interimTranscript && (
                      <span className="italic text-gray-500 dark:text-gray-400">
                        {transcript ? ' ' : ''}{interimTranscript}
                      </span>
                    )}
                  </p>
                  {autoSend && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Auto-send enabled • Min {minWordCount} words
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border-l-4 border-red-500 mt-2">
              <div className="flex items-start gap-2">
                <span className="text-red-500 text-xs font-medium mt-0.5">❌ Error:</span>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        💡 Hold button or press <kbd className="px-1 bg-gray-200 dark:bg-gray-700 rounded">Space</kbd> to speak
      </div>
    </div>
  );
};

export default VoiceChat;