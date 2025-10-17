'use client';

import { useState, useEffect, useRef } from 'react';

export type TransitionType = 'into-waiting-room' | 'into-match' | null;

interface UseVideoTransitionsReturn {
  currentTransition: TransitionType;
  isPlaying: boolean;
  videoSrc: string | null;
  triggerTransition: (type: TransitionType) => void;
  completeTransition: () => void;
}

export const useVideoTransitions = (): UseVideoTransitionsReturn => {
  const [currentTransition, setCurrentTransition] = useState<TransitionType>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  
  const triggerTransition = (type: TransitionType) => {
    if (!type) return;
    
    console.log('🎬 Triggering video transition:', type);
    
    const videoMap = {
      'into-waiting-room': '/transitions/Into Waiting Room.mp4',
      'into-match': '/transitions/Into Match.mp4'
    };
    
    setCurrentTransition(type);
    setVideoSrc(videoMap[type]);
    setIsPlaying(true);
  };
  
  const completeTransition = () => {
    console.log('🎬 Video transition completed:', currentTransition);
    setCurrentTransition(null);
    setIsPlaying(false);
    setVideoSrc(null);
  };

  return {
    currentTransition,
    isPlaying,
    videoSrc,
    triggerTransition,
    completeTransition
  };
};