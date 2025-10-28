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
  const [isPWA, setIsPWA] = useState(false);
  const [videoInitialized, setVideoInitialized] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false); // Prevent multiple retry attempts

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

  // Get splash video source
  const getVideoSource = useCallback(() => {
    return '/splash.mp4';
  }, []);

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    setIsVideoEnded(true);
    // Start fade and grow animation immediately after video ends
    setTimeout(() => {
      setIsLoading(false);
      // Complete splash screen after animation finishes
      setTimeout(() => {
        onComplete();
      }, 1200); // Wait for the full 1.2s animation to complete
    }, 100); // Very small delay to ensure smooth transition
  }, [onComplete]);

  // Force video playback for mobile/PWA with enhanced retry logic
  const forceVideoPlay = useCallback(async (video: HTMLVideoElement) => {
    if (videoInitialized || isRetrying) {
      console.log('⏭️ Video already initialized or retry in progress, skipping...');
      return;
    }
    
    setIsRetrying(true);
    
    try {
      // Ensure video is muted for autoplay (critical for mobile)
      video.muted = true;
      video.volume = 0;
      video.defaultMuted = true;
      
      // Set comprehensive mobile-friendly properties
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x5-video-player-type', 'h5-page');
      video.setAttribute('x5-video-player-fullscreen', 'false');
      video.setAttribute('x5-video-orientation', 'portrait');
      video.setAttribute('preload', 'auto');
      video.setAttribute('autoplay', 'true');
      
      // Force load the video
      video.load();
      
      // Wait for metadata and then play
      const playPromise = video.play();
      if (playPromise !== undefined) {
        await playPromise;
        console.log('✅ Splash video autoplay successful');
        setVideoInitialized(true);
      }
    } catch (error) {
      console.warn('📱 Video autoplay failed, attempting limited retry:', error);
      
      // Single retry strategy to prevent loops
      try {
        video.load();
        video.muted = true;
        await new Promise(resolve => setTimeout(resolve, 300)); // Single delay
        await video.play();
        console.log('✅ Splash video retry successful');
        setVideoInitialized(true);
      } catch (retryError) {
        console.warn('❌ Splash video retry failed, skipping splash screen:', retryError);
        handleVideoEnd();
      }
    } finally {
      setIsRetrying(false);
    }
  }, [handleVideoEnd, videoInitialized, isRetrying]);

  // Handle video error - simplified fallback
  const handleVideoError = useCallback(() => {
    console.warn('Splash video failed to load, skipping splash screen...');
    setVideoError(true);
    // Skip directly to avoid retry loops
    handleVideoEnd();
  }, [handleVideoEnd]);

  // Single video initialization attempt
  useEffect(() => {
    if (videoInitialized || isRetrying) return; // Skip if already initialized or retrying

    const initVideoPlayback = async () => {
      const mainVideo = document.getElementById('main-splash-video') as HTMLVideoElement;
      if (mainVideo) {
        console.log('🎬 Initializing splash video playback...');
        await forceVideoPlay(mainVideo);
      }
    };

    // Single initialization attempt with a reasonable delay
    const timer = setTimeout(initVideoPlayback, 100);

    return () => clearTimeout(timer);
  }, [forceVideoPlay, videoInitialized, isRetrying]);

  // Handle user interaction to start video (PWA/mobile fallback)
  useEffect(() => {
    const handleUserInteraction = () => {
      if (videoInitialized || isRetrying) return; // Skip if already initialized or retrying
      
      const mainVideo = document.getElementById('main-splash-video') as HTMLVideoElement;
      if (mainVideo && !mainVideo.played.length) {
        forceVideoPlay(mainVideo);
      }
      
      // Remove event listeners after first interaction
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };

    // Add interaction listeners for mobile devices
    document.addEventListener('touchstart', handleUserInteraction, { passive: true });
    document.addEventListener('click', handleUserInteraction, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [forceVideoPlay, videoInitialized, isRetrying]);

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
            id="main-splash-video"
            autoPlay
            muted
            playsInline
            preload="metadata"
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            webkit-playsinline="true"
            x5-video-player-type="h5-page"
            x5-video-player-fullscreen="false"
            x5-video-orientation="portrait"
            loop={false}
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            onCanPlay={() => setVideoError(false)}
            onLoadedData={(e) => {
              if (!videoInitialized && !isRetrying) {
                const video = e.target as HTMLVideoElement;
                forceVideoPlay(video);
              }
            }}
            className={`object-cover ${isMobile ? 'w-[85%] h-[75%]' : 'w-[95%] h-[90%]'} max-w-none`}
            style={{ 
              pointerEvents: 'none' // Prevent any clicks that might show controls
            }}
          >
            <source src={getVideoSource()} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;