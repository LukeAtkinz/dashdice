/**
 * React Hook for Speech Recognition
 * Provides easy integration with the SpeechRecognitionService
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import SpeechRecognitionService, { 
  SpeechRecognitionConfig, 
  SpeechRecognitionResult,
  SpeechRecognitionCallbacks 
} from '../services/speechRecognitionService';

export interface UseSpeechRecognitionOptions {
  config?: SpeechRecognitionConfig;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  autoSend?: boolean; // Automatically send final transcripts
  minConfidence?: number; // Minimum confidence threshold
}

export interface UseSpeechRecognitionReturn {
  // State
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  confidence: number;
  
  // Actions
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  abort: () => void;
  clearTranscript: () => void;
  
  // Configuration
  setLanguage: (language: string) => void;
  getSupportedLanguages: () => string[];
}

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn => {
  const {
    config = {},
    onTranscript,
    onError,
    autoSend = false,
    minConfidence = 0.7
  } = options;

  // State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);

  // Service instance
  const serviceRef = useRef<SpeechRecognitionService>();
  const [isSupported, setIsSupported] = useState(false);

  // Initialize service
  useEffect(() => {
    serviceRef.current = SpeechRecognitionService.getInstance();
    setIsSupported(serviceRef.current.getIsSupported());
    
    // Configure the service
    serviceRef.current.configure({
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      ...config
    });
  }, []);

  // Setup callbacks
  useEffect(() => {
    if (!serviceRef.current) return;

    const callbacks: SpeechRecognitionCallbacks = {
      onResult: (result: SpeechRecognitionResult) => {
        const { transcript: newTranscript, confidence: newConfidence, isFinal } = result;
        
        setConfidence(newConfidence || 0);
        setError(null);

        if (isFinal) {
          // Final result
          if (newConfidence >= minConfidence) {
            setTranscript(prev => {
              const updatedTranscript = prev + (prev ? ' ' : '') + newTranscript;
              
              // Call onTranscript callback
              onTranscript?.(newTranscript, true);
              
              return updatedTranscript;
            });
            setInterimTranscript('');
          } else {
            console.warn(`🔇 Low confidence transcript ignored: "${newTranscript}" (${newConfidence})`);
          }
        } else {
          // Interim result
          setInterimTranscript(newTranscript);
          onTranscript?.(newTranscript, false);
        }
      },

      onError: (errorMessage: string) => {
        setError(errorMessage);
        setIsListening(false);
        onError?.(errorMessage);
      },

      onStart: () => {
        setIsListening(true);
        setError(null);
        console.log('🎤 Voice chat started');
      },

      onEnd: () => {
        setIsListening(false);
        setInterimTranscript('');
        console.log('🎤 Voice chat ended');
      },

      onSoundStart: () => {
        console.log('🔊 Voice detected');
      },

      onSoundEnd: () => {
        console.log('🔇 Voice ended');
      }
    };

    serviceRef.current.setCallbacks(callbacks);
  }, [onTranscript, onError, minConfidence]);

  // Actions
  const startListening = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current) return false;
    
    setError(null);
    setInterimTranscript('');
    
    const success = await serviceRef.current.startListening();
    if (!success) {
      setIsListening(false);
    }
    return success;
  }, []);

  const stopListening = useCallback(() => {
    if (!serviceRef.current) return;
    serviceRef.current.stopListening();
  }, []);

  const abort = useCallback(() => {
    if (!serviceRef.current) return;
    serviceRef.current.abort();
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setConfidence(0);
  }, []);

  const setLanguage = useCallback((language: string) => {
    if (!serviceRef.current) return;
    serviceRef.current.configure({ ...config, language });
  }, [config]);

  const getSupportedLanguages = useCallback((): string[] => {
    if (!serviceRef.current) return [];
    return serviceRef.current.getSupportedLanguages();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current && isListening) {
        serviceRef.current.abort();
      }
    };
  }, [isListening]);

  return {
    // State
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    confidence,
    
    // Actions
    startListening,
    stopListening,
    abort,
    clearTranscript,
    
    // Configuration
    setLanguage,
    getSupportedLanguages
  };
};