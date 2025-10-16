'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface VideoTransitionProps {
  videoSrc: string;
  isPlaying: boolean;
  onComplete: () => void;
  children?: React.ReactNode;
  duration?: number; // Optional override for video duration
}

export const VideoTransition: React.FC<VideoTransitionProps> = ({
  videoSrc,
  isPlaying,
  onComplete,
  children,
  duration
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setVideoLoaded(true);
    };

    const handleEnded = () => {
      setVideoEnded(true);
      onComplete();
    };

    const handleCanPlayThrough = () => {
      if (isPlaying && videoLoaded) {
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && videoLoaded) {
      video.currentTime = 0;
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [isPlaying, videoLoaded]);

  // Fallback timeout in case video doesn't load properly
  useEffect(() => {
    if (isPlaying && duration) {
      const fallbackTimer = setTimeout(() => {
        if (!videoEnded) {
          onComplete();
        }
      }, duration * 1000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [isPlaying, duration, videoEnded, onComplete]);

  return (
    <div className="relative w-full h-full">
      {/* Background content - always rendered but may be behind video */}
      <div className={`w-full h-full ${isPlaying ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}>
        {children}
      </div>

      {/* Video Overlay */}
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/20"
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="auto"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        </motion.div>
      )}
    </div>
  );
};