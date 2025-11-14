'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [appLoaded, setAppLoaded] = useState(false); // NEW: Track if app content is loaded
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [videoInitialized, setVideoInitialized] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false); // Prevent multiple retry attempts
  const videoRef = React.useRef<HTMLVideoElement>(null); // NEW: Video ref for freeze control

  // NEW: Monitor app loading state
  useEffect(() => {
    const checkAppLoaded = () => {
      // Check if critical resources are loaded
      if (document.readyState === 'complete') {
        console.log('✅ App resources loaded');
        setAppLoaded(true);
      }
    };

    if (document.readyState === 'complete') {
      setAppLoaded(true);
    } else {
      window.addEventListener('load', checkAppLoaded);
      // Also check periodically
      const interval = setInterval(checkAppLoaded, 100);
      return () => {
        window.removeEventListener('load', checkAppLoaded);
        clearInterval(interval);
      };
    }
  }, []);

  // Detect mobile device and PWA
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
      
      setIsMobile(isMobileDevice || isSmallScreen);
      
      // Detect PWA
      const isPWAMode = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const isWebApp = (window.navigator as any).standalone; // iOS Safari
      setIsPWA(isPWAMode || isWebApp || false);
    };

    checkMobile();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Get splash video sources - multiple formats for compatibility
  const getVideoSources = useCallback(() => {
    return {
      mp4: '/splash.mp4',
      webm: '/Splash Screens/Splash-Screen.webm'
    };
  }, []);

  // Handle video end - CHANGED: Freeze on last frame until app loads
  const handleVideoEnd = useCallback(() => {
    console.log('🎬 Video ended, freezing on last frame...');
    setIsVideoEnded(true);
    
    // Pause video on last frame
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  // NEW: When both video ended AND app loaded, start fade
  useEffect(() => {
    if (isVideoEnded && appLoaded) {
      console.log('✅ Video ended + App loaded, starting fade...');
      setTimeout(() => {
        setIsLoading(false);
        // Complete splash screen after animation finishes
        setTimeout(() => {
          onComplete();
        }, 1200); // Wait for the full 1.2s animation to complete
      }, 300); // Brief delay on last frame
    }
  }, [isVideoEnded, appLoaded, onComplete]);

  // Aggressive video autoplay - force play on ALL events
  const forceVideoPlay = useCallback(async (video: HTMLVideoElement) => {
    if (!video || videoInitialized) return;
    
    try {
      // Critical settings for autoplay across all browsers
      video.muted = true;
      video.volume = 0;
      video.defaultMuted = true;
      video.setAttribute('muted', 'true');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      
      // Attempt immediate play
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('✅ Splash video playing');
          setVideoInitialized(true);
        }).catch((err) => {
          console.warn('⚠️ Autoplay blocked, will retry:', err);
          // Keep trying on various events
        });
      }
    } catch (error) {
      console.warn('⚠️ Play attempt failed:', error);
    }
  }, [videoInitialized]);

  // Handle video error - simplified fallback
  const handleVideoError = useCallback(() => {
    console.warn('Splash video failed to load, skipping splash screen...');
    setVideoError(true);
    // Skip directly to avoid retry loops
    handleVideoEnd();
  }, [handleVideoEnd]);

  // Aggressive initialization - try on mount and every possible event
  useEffect(() => {
    const mainVideo = document.getElementById('main-splash-video') as HTMLVideoElement;
    if (!mainVideo) return;

    // Immediate play attempt
    forceVideoPlay(mainVideo);

    // Try again after short delays (browsers can be finicky)
    const timers = [
      setTimeout(() => forceVideoPlay(mainVideo), 100),
      setTimeout(() => forceVideoPlay(mainVideo), 300),
      setTimeout(() => forceVideoPlay(mainVideo), 500)
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [forceVideoPlay]);

  // User interaction fallback - play on ANY touch/click
  useEffect(() => {
    const handleUserInteraction = () => {
      const mainVideo = document.getElementById('main-splash-video') as HTMLVideoElement;
      if (mainVideo) {
        forceVideoPlay(mainVideo);
      }
    };

    // Listen for ANY user interaction
    document.addEventListener('touchstart', handleUserInteraction, { once: true, passive: true });
    document.addEventListener('click', handleUserInteraction, { once: true, passive: true });
    document.addEventListener('touchend', handleUserInteraction, { once: true, passive: true });

    return () => {
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchend', handleUserInteraction);
    };
  }, [forceVideoPlay]);

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
          initial={{ opacity: 1, scale: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.15
          }}
          transition={{ 
            duration: 1.2,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
          style={{ pointerEvents: isVideoEnded ? 'none' : 'auto' }}
        >
          {/* Main splash video */}
          <video
            ref={videoRef}
            id="main-splash-video"
            autoPlay
            muted
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            x5-video-player-type="h5-page"
            x5-video-player-fullscreen="false"
            x5-video-orientation="portrait"
            preload="auto"
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            loop={false}
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            onCanPlay={(e) => {
              setVideoError(false);
              const video = e.target as HTMLVideoElement;
              forceVideoPlay(video);
            }}
            onCanPlayThrough={(e) => {
              const video = e.target as HTMLVideoElement;
              forceVideoPlay(video);
            }}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              forceVideoPlay(video);
            }}
            onLoadedData={(e) => {
              const video = e.target as HTMLVideoElement;
              forceVideoPlay(video);
            }}
            onSuspend={(e) => {
              // Try to resume if suspended
              const video = e.target as HTMLVideoElement;
              if (video.paused) {
                forceVideoPlay(video);
              }
            }}
            className={`object-cover ${isMobile ? 'w-[85%] h-[75%]' : 'w-[95%] h-[90%]'} max-w-none`}
            style={{ 
              pointerEvents: 'none' // Prevent any clicks that might show controls
            }}
          >
            <source src={getVideoSources().mp4} type="video/mp4" />
            <source src={getVideoSources().webm} type="video/webm" />
            Your browser does not support the video tag.
          </video>

          {/* Loading indicator - show only after video ends while waiting for app to load */}
          {isVideoEnded && !appLoaded && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/50"></div>
                <p className="text-white/70 text-sm font-audiowide">Loading...</p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;