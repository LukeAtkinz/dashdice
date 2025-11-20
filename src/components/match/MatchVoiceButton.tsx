import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { VoiceTranscriptionResponse } from '../../types/chat';

interface MatchVoiceButtonProps {
  matchId: string;
  playerId: string;
  language?: string;
  onTranscription: (text: string, duration: number) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  isMuted?: boolean;
}

export const MatchVoiceButton: React.FC<MatchVoiceButtonProps> = ({
  matchId,
  playerId,
  language = 'en',
  onTranscription,
  onError,
  disabled = false,
  isMuted = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    if (disabled || isMuted || isRecording || isProcessing) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Clean up stream immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        await processRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);

      console.log('🎙️ Recording started');
    } catch (error: any) {
      console.error('❌ Error starting recording:', error);
      onError?.(error?.message || 'Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Immediately stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    console.log('⏹️ Recording stopped');
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('❌ No audio data recorded');
      return;
    }

    setIsProcessing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('📦 Audio blob created:', audioBlob.size, 'bytes');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', language);
      formData.append('matchId', matchId);
      formData.append('playerId', playerId);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${errorText}`);
      }

      const result: VoiceTranscriptionResponse = await response.json();

      if (result.text && result.text.trim()) {
        // Remove any branding text that might appear
        let cleanText = result.text.trim();
        cleanText = cleanText.replace(/transcribed by otter\.ai/gi, '');
        cleanText = cleanText.replace(/powered by otter\.ai/gi, '');
        cleanText = cleanText.trim();
        
        if (cleanText) {
          onTranscription(cleanText, result.duration);
        } else {
          onError?.('No speech detected');
        }
      } else {
        onError?.('No speech detected');
      }
    } catch (error: any) {
      console.error('❌ Error processing recording:', error);
      onError?.(error.message || 'Failed to transcribe audio');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  const handleMouseDown = async () => {
    if (!isRecording && !isProcessing) {
      await startRecording();
    }
  };

  const handleMouseUp = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  const handleTouchStart = async (e: React.TouchEvent) => {
    if (!isRecording && !isProcessing) {
      await startRecording();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isRecording) {
      stopRecording();
    }
  };

  return (
    <motion.button
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative"
      style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: '2px solid white',
        cursor: disabled || isMuted ? 'not-allowed' : 'pointer',
        opacity: disabled || isMuted ? 0.3 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
      disabled={disabled || isMuted || isProcessing}
      animate={{
        backgroundColor: isRecording ? 'rgba(239, 68, 68, 1)' : 'transparent',
        borderColor: isRecording ? '#ef4444' : '#ffffff'
      }}
      transition={{
        duration: 0.3,
        ease: 'easeInOut'
      }}
      whileTap={{ scale: 0.95 }}
    >
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </motion.button>
  );
};
