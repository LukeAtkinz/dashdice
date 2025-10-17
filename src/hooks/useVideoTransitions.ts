'use client';

import { useState, useEffect, useRef } from 'react';

export type TransitionType = 'into-turn-decider' | 'into-match' | null;

interface UseVideoTransitionsReturn {
  currentTransition: TransitionType;
  isPlaying: boolean;
  videoSrc: string | null;
  overlayText: string | null;
  triggerTransition: (type: TransitionType, overlayText?: string) => void;
  completeTransition: () => void;
}

export const useVideoTransitions = (): UseVideoTransitionsReturn => {
  const [currentTransition, setCurrentTransition] = useState<TransitionType>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [overlayText, setOverlayText] = useState<string | null>(null);
  
  const triggerTransition = (type: TransitionType, text?: string) => {
    if (!type) return;
    
    console.log('🎬 Triggering video transition:', type, 'with text:', text);
    
    const videoMap = {
      'into-turn-decider': '/Transitions/Into Match.mp4', // Renamed from "Into Match" to "Into Turn Decider"
      'into-match': '/Transitions/Into Waiting Room.mp4' // This will be the new "Into Match" video
    };
    
    setCurrentTransition(type);
    setVideoSrc(videoMap[type]);
    setOverlayText(text || null);
    setIsPlaying(true);
  };
  
  const completeTransition = () => {
    console.log('🎬 Video transition completed:', currentTransition);
    setCurrentTransition(null);
    setIsPlaying(false);
    setVideoSrc(null);
    setOverlayText(null);
  };

  return {
    currentTransition,
    isPlaying,
    videoSrc,
    overlayText,
    triggerTransition,
    completeTransition
  };
};