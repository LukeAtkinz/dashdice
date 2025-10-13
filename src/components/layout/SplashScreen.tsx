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
    if (videoInitialized) {
      console.log('⏭️ Video already initialized, skipping...');
      return;
    }
    
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
      console.warn('📱 Video autoplay failed, attempting mobile-specific retry:', error);
      
      // Multiple retry strategies for mobile
      const retryStrategies = [
        // Strategy 1: Immediate retry with fresh load
        async () => {
          video.load();
          video.muted = true;
          await new Promise(resolve => setTimeout(resolve, 100));
          return video.play();
        },
        
        // Strategy 2: Force properties and retry
        async () => {
          video.muted = true;
          video.volume = 0;
          video.autoplay = true;
          return video.play();
        },
        
        // Strategy 3: Create new video element (last resort)
        async () => {
          const newVideo = video.cloneNode(true) as HTMLVideoElement;
          newVideo.muted = true;
          newVideo.autoplay = true;
          newVideo.setAttribute('playsinline', 'true');
          video.parentNode?.replaceChild(newVideo, video);
          return newVideo.play();
        }
      ];
      
      // Try each strategy with delays
      for (let i = 0; i < retryStrategies.length; i++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 200 * (i + 1))); // Increasing delay
          await retryStrategies[i]();
          console.log(`✅ Splash video retry strategy ${i + 1} successful`);
          setVideoInitialized(true);
          return;
        } catch (retryError) {
          console.warn(`❌ Splash video retry strategy ${i + 1} failed:`, retryError);
        }
      }
      
      // All strategies failed - skip splash screen
      console.warn('❌ All splash video strategies failed, skipping splash screen');
      handleVideoEnd();
    }
  }, [handleVideoEnd, videoInitialized]);

  // Handle video error - fallback to secondary video or skip splash
  const handleVideoError = useCallback(() => {
    console.warn('Splash video failed to load, trying fallback...');
    setVideoError(true);
    
    // Try to load the fallback video
    setTimeout(() => {
      const fallbackVideo = document.getElementById('fallback-splash-video') as HTMLVideoElement;
      if (fallbackVideo) {
        fallbackVideo.load();
        forceVideoPlay(fallbackVideo).catch(() => {
          // If fallback also fails, skip splash screen
          console.warn('Fallback splash video also failed, skipping splash screen');
          handleVideoEnd();
        });
      } else {
        // No fallback available, skip splash screen
        handleVideoEnd();
      }
    }, 100);
  }, [handleVideoEnd, forceVideoPlay]);

  // Aggressive video initialization for all devices
  useEffect(() => {
    if (videoInitialized) return; // Skip if already initialized

    const initVideoPlayback = async () => {
      // Always try to start video, especially critical for mobile
      const mainVideo = document.getElementById('main-splash-video') as HTMLVideoElement;
      if (mainVideo && !videoInitialized) {
        console.log('🎬 Initializing splash video playback...');
        await forceVideoPlay(mainVideo);
      }
    };

    // Multiple attempts with different timing for maximum mobile compatibility
    const timers = [
      setTimeout(initVideoPlayback, 50),   // Immediate attempt
      setTimeout(initVideoPlayback, 200),  // Quick retry
      setTimeout(initVideoPlayback, 500),  // Fallback attempt
    ];

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [forceVideoPlay, videoInitialized]);

  // Handle user interaction to start video (PWA/mobile fallback)
  useEffect(() => {
    const handleUserInteraction = () => {
      if (videoInitialized) return; // Skip if already initialized
      
      const mainVideo = document.getElementById('main-splash-video') as HTMLVideoElement;
      const fallbackVideo = document.getElementById('fallback-splash-video') as HTMLVideoElement;
      
      if (mainVideo && !mainVideo.played.length) {
        forceVideoPlay(mainVideo);
      } else if (fallbackVideo && !fallbackVideo.played.length) {
        forceVideoPlay(fallbackVideo);
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
  }, [forceVideoPlay, videoInitialized]);

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
            preload="auto"
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
              const video = e.target as HTMLVideoElement;
              forceVideoPlay(video);
            }}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              // Additional attempt for mobile devices
              forceVideoPlay(video);
            }}
            className={`object-cover ${isMobile ? 'w-[85%] h-[75%]' : 'w-[95%] h-[90%]'} max-w-none`}
            style={{ 
              display: videoError ? 'none' : 'block',
              pointerEvents: 'none' // Prevent any clicks that might show controls
            }}
          >
            <source src={getVideoSource()} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Fallback video */}
          {videoError && (
            <video
              id="fallback-splash-video"
              autoPlay
              muted
              playsInline
              preload="auto"
              controls={false}
              disablePictureInPicture
              disableRemotePlayback
              webkit-playsinline="true"
              x5-video-player-type="h5-page"
              x5-video-player-fullscreen="false"
              x5-video-orientation="portrait"
              loop={false}
              onEnded={handleVideoEnd}
              onError={() => {
                console.warn('All splash videos failed, skipping splash screen');
                handleVideoEnd();
              }}
              onLoadedData={(e) => {
                const video = e.target as HTMLVideoElement;
                forceVideoPlay(video);
              }}
              onLoadedMetadata={(e) => {
                const video = e.target as HTMLVideoElement;
                forceVideoPlay(video);
              }}
              className={`object-cover ${isMobile ? 'w-full h-full' : 'w-[95%] h-[90%]'} max-w-none`}
              style={{ 
                pointerEvents: 'none' // Prevent any clicks that might show controls
              }}
            >
              <source src="/Splash Screens/splashscreen.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;