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
    if (disabled || isMuted || isRecording || isProcessing) {
      return;
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

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
    if (!isRecording) return;
    
    setIsRecording(false);

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Stop media stream immediately
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    console.log('⏹️ Recording stopped');
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0 || isProcessing) {
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
    <button
      className={`
        px-6 py-3 rounded-lg font-bold transition-all min-w-[100px]
        ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : isMuted
            ? 'bg-gray-600 text-white cursor-not-allowed opacity-50'
            : isProcessing
            ? 'bg-purple-400 text-white cursor-wait'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
        }
      `}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      disabled={disabled || isMuted}
    >
      {isMuted ? 'Muted' : isRecording ? 'Voice' : 'Voice'}
    </button>
  );
};
