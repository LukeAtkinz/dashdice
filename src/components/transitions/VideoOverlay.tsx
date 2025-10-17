'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoOverlayProps {
  videoSrc: string;
  isPlaying: boolean;
  onComplete: () => void;
  duration?: number; // Fallback duration in seconds
  overlayText?: string; // Text to display at 1.15 seconds
  overlayDelay?: number; // When to show the text (default 1.15 seconds)
}

export const VideoOverlay: React.FC<VideoOverlayProps> = ({
  videoSrc,
  isPlaying,
  onComplete,
  duration = 4,
  overlayText,
  overlayDelay = 1.15
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showOverlayText, setShowOverlayText] = useState(false);

  console.log('🎬 VideoOverlay render:', { videoSrc, isPlaying, shouldShow, videoLoaded, videoError });

  useEffect(() => {
    if (isPlaying) {
      console.log('🎬 Setting shouldShow to true');
      setShouldShow(true);
      setVideoError(null);
      setShowOverlayText(false);
      
      // Set up overlay text timing if we have text to show
      if (overlayText) {
        const overlayTimer = setTimeout(() => {
          setShowOverlayText(true);
        }, overlayDelay * 1000);
        
        return () => clearTimeout(overlayTimer);
      }
    }
  }, [isPlaying, overlayText, overlayDelay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc || !isPlaying) return;

    console.log('🎬 Setting up video:', videoSrc);
    
    const handleLoadedData = () => {
      console.log('🎬 Video loaded:', videoSrc);
      setVideoLoaded(true);
      // Video will autoplay due to autoPlay attribute, no manual play needed
      if (isPlaying) {
        video.currentTime = 0;
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

    // Set video source directly and load
    if (video.src !== videoSrc) {
      console.log('🎬 Setting video src directly:', videoSrc);
      video.src = videoSrc;
      video.load();
    }

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
            <>
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="auto"
                controls={false}
                autoPlay
                webkit-playsinline="true"
                x5-playsinline="true"
                disablePictureInPicture
                controlsList="nodownload noplaybackrate nofullscreen"
                style={{
                  width: '100vw',
                  height: '100vh',
                  pointerEvents: 'none'
                }}
              />
              
              {/* Text Overlay */}
              <AnimatePresence>
                {showOverlayText && overlayText && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ 
                      duration: 0.6, 
                      ease: [0.25, 0.46, 0.45, 0.94] // easeOutQuart
                    }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                  >
                    <div className="text-center px-8">
                      {(() => {
                        // Parse the overlay text to separate name from action
                        const text = overlayText;
                        let nameText = '';
                        let actionText = '';
                        
                        if (text.includes(' GOES FIRST')) {
                          nameText = text.replace(' GOES FIRST', '');
                          actionText = 'GOES FIRST';
                        } else if (text.includes(' GO FIRST')) {
                          nameText = text.replace(' GO FIRST', '');
                          actionText = 'GO FIRST';
                        } else if (text.includes(' TO CHOOSE')) {
                          nameText = text.replace(' TO CHOOSE', '');
                          actionText = 'TO CHOOSE';
                        } else {
                          // Fallback for other text patterns
                          nameText = text;
                        }
                        
                        return (
                          <div className="flex flex-col items-center">
                            {/* Name/YOU - Larger and Gold */}
                            <motion.h1 
                              className="text-[14vw] md:text-9xl lg:text-[10rem] font-bold leading-tight tracking-wide mb-2"
                              style={{ 
                                fontFamily: 'Audiowide',
                                color: '#FFD700',
                                textShadow: '0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4), 4px 4px 16px rgba(0,0,0,0.9)',
                                WebkitFontSmoothing: 'antialiased'
                              }}
                              initial={{ letterSpacing: '0.2em', opacity: 0, y: 20 }}
                              animate={{ letterSpacing: '0.1em', opacity: 1, y: 0 }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                            >
                              {nameText}
                            </motion.h1>
                            
                            {/* Action Text - White */}
                            {actionText && (
                              <motion.h2 
                                className="text-[10vw] md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-wide"
                                style={{ 
                                  fontFamily: 'Audiowide',
                                  textShadow: '0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(255,255,255,0.4), 4px 4px 16px rgba(0,0,0,0.9)',
                                  WebkitFontSmoothing: 'antialiased'
                                }}
                                initial={{ letterSpacing: '0.2em', opacity: 0, y: 20 }}
                                animate={{ letterSpacing: '0.1em', opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.5 }}
                              >
                                {actionText}
                              </motion.h2>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};