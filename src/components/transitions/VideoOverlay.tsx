'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoOverlayProps {
  videoSrc: string;
  isPlaying: boolean;
  onComplete: () => void;
  duration?: number; // Fallback duration in seconds
}

export const VideoOverlay: React.FC<VideoOverlayProps> = ({
  videoSrc,
  isPlaying,
  onComplete,
  duration = 4
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isPlaying) {
      setShouldShow(true);
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setVideoLoaded(true);
    };

    const handleEnded = () => {
      setShouldShow(false);
      setTimeout(() => {
        onComplete();
      }, 300); // Small delay for smooth transition
    };

    const handleCanPlayThrough = () => {
      if (isPlaying && videoLoaded) {
        video.currentTime = 0;
        video.play().catch(console.error);
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('canplaythrough', handleCanPlayThrough);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
    };
  }, [isPlaying, videoLoaded, onComplete]);

  // Fallback timeout
  useEffect(() => {
    if (isPlaying) {
      const fallbackTimer = setTimeout(() => {
        setShouldShow(false);
        setTimeout(() => {
          onComplete();
        }, 300);
      }, duration * 1000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [isPlaying, duration, onComplete]);

  if (!shouldShow || typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(2px)'
          }}
        >
          <video
            ref={videoRef}
            className="max-w-full max-h-full object-contain"
            muted
            playsInline
            preload="auto"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};