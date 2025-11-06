'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MultiplierAnimationProps {
  hasDoubleMultiplier: boolean;
  hasTripleMultiplier: boolean;
  hasQuadMultiplier: boolean;
}

export const MultiplierAnimation: React.FC<MultiplierAnimationProps> = ({
  hasDoubleMultiplier,
  hasTripleMultiplier,
  hasQuadMultiplier,
}) => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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
    }
    // Detect x3 activation
    else if (hasTripleMultiplier && !prev.triple) {
      console.log('🎬 x3 Multiplier activated - playing animation');
      setActiveVideo('/Animations/x3multi.webm');
      setIsPlaying(true);
    }
    // Detect x2 activation
    else if (hasDoubleMultiplier && !prev.double) {
      console.log('🎬 x2 Multiplier activated - playing animation');
      setActiveVideo('/Animations/x2multi.webm');
      setIsPlaying(true);
    }
    
    // Update previous states
    prevMultipliersRef.current = {
      double: hasDoubleMultiplier,
      triple: hasTripleMultiplier,
      quad: hasQuadMultiplier,
    };
  }, [hasDoubleMultiplier, hasTripleMultiplier, hasQuadMultiplier]);

  useEffect(() => {
    if (activeVideo && videoRef.current && isPlaying) {
      const video = videoRef.current;
      
      // Reset and play video
      video.currentTime = 0;
      video.play().catch(err => {
        console.error('Error playing multiplier animation:', err);
      });
      
      // Handle video end
      const handleVideoEnd = () => {
        console.log('🎬 Multiplier animation finished');
        setIsPlaying(false);
        setActiveVideo(null);
      };
      
      video.addEventListener('ended', handleVideoEnd);
      
      return () => {
        video.removeEventListener('ended', handleVideoEnd);
      };
    }
  }, [activeVideo, isPlaying]);

  if (!isPlaying || !activeVideo) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
        style={{
          width: '100vw',
          height: '100vh',
        }}
      >
        <video
          ref={videoRef}
          src={activeVideo}
          className="absolute"
          style={{
            width: '100vw',
            height: 'auto',
            maxHeight: '100vh',
            objectFit: 'contain',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          playsInline
          muted={false}
          preload="auto"
        />
      </motion.div>
    </AnimatePresence>
  );
};
