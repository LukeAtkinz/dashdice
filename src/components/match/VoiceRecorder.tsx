import React, { useState, useRef, useEffect } from 'react';
import { VoiceTranscriptionResponse } from '../../types/chat';

interface VoiceRecorderProps {
  matchId: string;
  playerId: string;
  language?: string;
  onTranscription: (text: string, duration: number) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  isMuted?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
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
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
    if (disabled || isMuted) {
      console.warn('🎙️ Recording disabled:', { disabled, isMuted });
      onError?.('Microphone is muted');
      return;
    }

    try {
      console.log('🎙️ Requesting microphone access...');
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('✅ Microphone access granted');

      streamRef.current = stream;

      // Create MediaRecorder with appropriate MIME type
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
        await processRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((Date.now() - startTime) / 1000);
      }, 100);

      console.log('🎙️ Recording started');
    } catch (error: any) {
      console.error('❌ Error starting recording:', error);
      onError?.(error?.message || 'Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      console.log('⏹️ Recording stopped');
    }
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      onError?.('No audio recorded');
      return;
    }

    setIsProcessing(true);

    try {
      // Create audio blob
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      console.log(`📦 Audio blob created: ${audioBlob.size} bytes`);

      // Convert to appropriate format for Whisper API (mp3, mp4, mpeg, mpga, m4a, wav, or webm)
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', language);
      formData.append('matchId', matchId);
      formData.append('playerId', playerId);

      // Send to transcription API
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transcription failed');
      }

      const result: VoiceTranscriptionResponse = await response.json();

      console.log(`✅ Transcription received: "${result.text}"`);

      // Call onTranscription callback
      onTranscription(result.text, result.duration);

    } catch (error: any) {
      console.error('❌ Error processing recording:', error);
      onError?.(error?.message || 'Failed to process audio');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  // Push-to-talk functionality
  const handleMouseDown = () => {
    startRecording();
  };

  const handleMouseUp = () => {
    stopRecording();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startRecording();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    stopRecording();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-200 select-none
          ${disabled || isMuted 
            ? 'bg-gray-600 cursor-not-allowed opacity-50' 
            : isRecording 
              ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' 
              : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-105 active:scale-95'
          }
          ${isProcessing ? 'animate-pulse' : ''}
        `}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={disabled || isMuted || isProcessing}
        title={isMuted ? 'Microphone is muted' : 'Hold to speak'}
      >
        {isProcessing ? (
          <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isRecording ? (
          <svg className="w-8 h-8 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}

        {isRecording && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full animate-ping" />
        )}
      </button>

      <div className="text-center">
        {isProcessing ? (
          <span className="text-xs text-gray-400">Processing...</span>
        ) : isRecording ? (
          <span className="text-xs text-red-400 font-bold">
            {recordingDuration.toFixed(1)}s
          </span>
        ) : (
          <span className="text-xs text-gray-400">
            {isMuted ? 'Muted' : 'Hold to speak'}
          </span>
        )}
      </div>
    </div>
  );
};
