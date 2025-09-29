'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
      
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Get the appropriate video source based on device type
  const getVideoSource = useCallback(() => {
    if (isMobile) {
      return '/Splash Screens/mobile.mp4';
    }
    return '/Splash Screens/desktop.mp4';
  }, [isMobile]);

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    setIsVideoEnded(true);
    // Start fade out animation after video ends
    setTimeout(() => {
      setIsLoading(false);
      // Complete splash screen after fade animation
      setTimeout(() => {
        onComplete();
      }, 1200); // Wait for fade out animation to complete
    }, 300); // Small delay before starting fade out
  }, [onComplete]);

  // Handle video error - fallback to default video or skip splash
  const handleVideoError = useCallback(() => {
    console.warn('Splash video failed to load, trying fallback...');
    setVideoError(true);
    
    // Try to load the fallback video (existing splashscreen.mp4)
    setTimeout(() => {
      const fallbackVideo = document.getElementById('fallback-splash-video') as HTMLVideoElement;
      if (fallbackVideo) {
        fallbackVideo.play().catch(() => {
          // If fallback also fails, skip splash screen
          console.warn('Fallback splash video also failed, skipping splash screen');
          handleVideoEnd();
        });
      } else {
        // No fallback available, skip splash screen
        handleVideoEnd();
      }
    }, 100);
  }, [handleVideoEnd]);

  // Skip splash screen after maximum time (safety fallback)
  useEffect(() => {
    const maxSplashTime = 10000; // 10 seconds maximum
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn('Splash screen timeout, forcing completion');
        onComplete();
      }
    }, maxSplashTime);

    return () => clearTimeout(timer);
  }, [isLoading, onComplete]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.1
          }}
          transition={{ 
            duration: 1,
            ease: "easeInOut"
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          style={{ pointerEvents: isVideoEnded ? 'none' : 'auto' }}
        >
          {/* Main splash video */}
          <video
            autoPlay
            muted
            playsInline
            preload="metadata"
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            onCanPlay={() => setVideoError(false)}
            className="w-full h-full object-cover"
            style={{ 
              display: videoError ? 'none' : 'block'
            }}
          >
            <source src={getVideoSource()} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Fallback video (existing splash screen) */}
          {videoError && (
            <video
              id="fallback-splash-video"
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={handleVideoEnd}
              onError={() => {
                console.warn('All splash videos failed, skipping splash screen');
                handleVideoEnd();
              }}
              className="w-full h-full object-cover"
            >
              <source src="/Splash Screens/slapshscren.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}

          {/* Loading indicator (shown if video takes time to load) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          >
            <div className="flex space-x-2">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  delay: 0
                }}
                className="w-3 h-3 bg-white rounded-full"
              />
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  delay: 0.2
                }}
                className="w-3 h-3 bg-white rounded-full"
              />
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  delay: 0.4
                }}
                className="w-3 h-3 bg-white rounded-full"
              />
            </div>
          </motion.div>

          {/* Skip button (appears after 3 seconds) */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            onClick={handleVideoEnd}
            className="absolute top-10 right-10 text-white/70 hover:text-white transition-colors text-sm font-medium px-4 py-2 border border-white/30 rounded-lg hover:border-white/50 backdrop-blur-sm"
          >
            Skip
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;