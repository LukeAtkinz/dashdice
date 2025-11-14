'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';

interface MultiplierAnimationProps {
  hasDoubleMultiplier: boolean;
  hasTripleMultiplier: boolean;
  hasQuadMultiplier: boolean;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
}

export const MultiplierAnimation: React.FC<MultiplierAnimationProps> = ({
  hasDoubleMultiplier,
  hasTripleMultiplier,
  hasQuadMultiplier,
  onAnimationStart,
  onAnimationEnd,
}) => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [multiplierPosition, setMultiplierPosition] = useState<{ x: number; y: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Track previous multiplier states to detect activation
  const prevMultipliersRef = useRef({
    double: false,
    triple: false,
    quad: false,
  });

  useEffect(() => {
    const prev = prevMultipliersRef.current;
    
    // Detect x4 activation (highest priority)
    if (hasQuadMultiplier && !prev.quad) {
      console.log('🎬 x4 Multiplier activated - playing animation');
      setActiveVideo('/Animations/x4multi.webm');
      setIsPlaying(true);
      onAnimationStart?.();
    }
    // Detect x3 activation
    else if (hasTripleMultiplier && !prev.triple) {
      console.log('🎬 x3 Multiplier activated - playing animation');
      setActiveVideo('/Animations/x3multi.webm');
      setIsPlaying(true);
      onAnimationStart?.();
    }
    // Detect x2 activation
    else if (hasDoubleMultiplier && !prev.double) {
      console.log('🎬 x2 Multiplier activated - playing animation');
      setActiveVideo('/Animations/x2multi.webm');
      setIsPlaying(true);
      onAnimationStart?.();
    }
    
    // Update previous states
    prevMultipliersRef.current = {
      double: hasDoubleMultiplier,
      triple: hasTripleMultiplier,
      quad: hasQuadMultiplier,
    };
  }, [hasDoubleMultiplier, hasTripleMultiplier, hasQuadMultiplier, onAnimationStart]);

  // Find multiplier container position
  useEffect(() => {
    if (isPlaying) {
      const findMultiplierContainer = () => {
        // Look for the multiplier indicator by ID
        const multiplierElement = document.getElementById('multiplier-indicator');
        
        if (multiplierElement) {
          const rect = multiplierElement.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          setMultiplierPosition({ x: centerX, y: centerY });
          console.log('📍 Multiplier container position:', { x: centerX, y: centerY });
        } else {
          // Fallback: use viewport center if container not found
          setMultiplierPosition({ 
            x: window.innerWidth / 2, 
            y: window.innerHeight / 2 
          });
        }
      };

      // Wait a tiny moment for DOM to update
      setTimeout(findMultiplierContainer, 50);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (activeVideo && videoRef.current && isPlaying) {
      const video = videoRef.current;
      
      // Reset and play video
      video.currentTime = 0;
      
      // Attempt to play with better error handling
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Multiplier animation video playing successfully');
          })
          .catch(err => {
            console.error('❌ Error playing multiplier animation:', err);
            // If autoplay fails, try again with muted
            video.muted = true;
            video.play().catch(e => {
              console.error('❌ Failed to play even when muted:', e);
            });
          });
      }
      
      // Handle video end
      const handleVideoEnd = () => {
        console.log('🎬 Multiplier animation finished');
        setIsPlaying(false);
        setActiveVideo(null);
        setMultiplierPosition(null);
        onAnimationEnd?.();
      };
      
      video.addEventListener('ended', handleVideoEnd);
      
      return () => {
        video.removeEventListener('ended', handleVideoEnd);
      };
    }
  }, [activeVideo, isPlaying, onAnimationEnd]);

  if (!isPlaying || !activeVideo || !multiplierPosition) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed pointer-events-none"
        style={{
          left: `${multiplierPosition.x}px`,
          top: `${multiplierPosition.y}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: '600px',
          height: '600px',
        }}
      >
        <video
          ref={videoRef}
          src={activeVideo}
          className="w-full h-full object-contain"
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          muted
          preload="auto"
          autoPlay
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          style={{ pointerEvents: 'none' }}
        />
      </motion.div>
    </AnimatePresence>
  );
};
