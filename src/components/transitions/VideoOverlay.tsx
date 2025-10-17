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
  const [videoError, setVideoError] = useState<string | null>(null);

  console.log('🎬 VideoOverlay render:', { videoSrc, isPlaying, shouldShow, videoLoaded, videoError });

  useEffect(() => {
    if (isPlaying) {
      console.log('🎬 Setting shouldShow to true');
      setShouldShow(true);
      setVideoError(null);
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc || !isPlaying) return;

    console.log('🎬 Setting up video:', videoSrc);
    
    const handleLoadedData = () => {
      console.log('🎬 Video loaded:', videoSrc);
      setVideoLoaded(true);
      // Try to play immediately when loaded
      if (isPlaying) {
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('🎬 Video playing successfully');
            })
            .catch(error => {
              console.error('🎬 Error playing video:', error);
              setVideoError(`Playback failed: ${error.message}`);
            });
        }
      }
    };

    const handleEnded = () => {
      console.log('🎬 Video ended');
      setShouldShow(false);
      setTimeout(() => {
        onComplete();
      }, 300);
    };

    const handleError = (event: Event) => {
      console.error('🎬 Video error:', event);
      const videoElement = event.target as HTMLVideoElement;
      const errorMsg = videoElement?.error?.message || 'Unknown error';
      console.error('🎬 Video error details:', {
        error: videoElement?.error,
        src: videoSrc,
        readyState: videoElement?.readyState,
        networkState: videoElement?.networkState
      });
      setVideoError(`Failed to load video: ${errorMsg}`);
      // Auto-complete on error after a short delay
      setTimeout(() => {
        setShouldShow(false);
        setTimeout(() => {
          onComplete();
        }, 300);
      }, 1000);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Set video source and load
    console.log('🎬 Loading video:', videoSrc);
    video.load(); // This will load the video with the source element

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [isPlaying, videoSrc, onComplete]);

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
          {videoError ? (
            <div className="text-white text-center p-8">
              <p className="text-lg mb-2">Video Error</p>
              <p className="text-sm text-gray-300">{videoError}</p>
              <p className="text-sm text-gray-300 mt-2">Video: {videoSrc}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              className="max-w-full max-h-full object-contain border-2 border-red-500"
              muted
              playsInline
              preload="auto"
              controls={true}
              autoPlay={false}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                backgroundColor: 'rgba(255, 0, 0, 0.1)' // Temporary red tint to see if video element is there
              }}
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};