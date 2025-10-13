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

  // Get the new unified splash screen video
  const getVideoSource = useCallback(() => {
    return '/Splash Screens/upscaled splash.mp4';
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

  // Force video playback for mobile/PWA
  const forceVideoPlay = useCallback(async (video: HTMLVideoElement) => {
    try {
      // Ensure video is muted for autoplay
      video.muted = true;
      video.volume = 0;
      
      // Set additional mobile-friendly properties
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x5-video-player-type', 'h5-page');
      video.setAttribute('x5-video-player-fullscreen', 'false');
      
      await video.play();
    } catch (error) {
      console.warn('Video autoplay failed, attempting forced play:', error);
      
      // For PWA or mobile, try alternative approaches
      if (isPWA || isMobile) {
        setTimeout(async () => {
          try {
            await video.play();
          } catch (retryError) {
            console.warn('Retry video play failed:', retryError);
            // Skip to end if video won't play
            handleVideoEnd();
          }
        }, 200);
      } else {
        handleVideoEnd();
      }
    }
  }, [isPWA, isMobile, handleVideoEnd]);

  // Handle video error - fallback to default video or skip splash
  const handleVideoError = useCallback(() => {
    console.warn('Splash video failed to load, trying fallback...');
    setVideoError(true);
    
    // Try to load the fallback video (existing splashscreen.mp4)
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

  // Force video play on mount for PWA/mobile (aggressive approach)
  useEffect(() => {
    if (isPWA || isMobile) {
      const timer = setTimeout(() => {
        const mainVideo = document.getElementById('main-splash-video') as HTMLVideoElement;
        if (mainVideo) {
          forceVideoPlay(mainVideo);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isPWA, isMobile, forceVideoPlay]);

  // Handle any potential user interaction to start video (PWA fallback)
  useEffect(() => {
    if (isPWA || isMobile) {
      const handleUserInteraction = () => {
        const mainVideo = document.getElementById('main-splash-video') as HTMLVideoElement;
        const fallbackVideo = document.getElementById('fallback-splash-video') as HTMLVideoElement;
        
        if (mainVideo && !mainVideo.played.length) {
          forceVideoPlay(mainVideo);
        } else if (fallbackVideo && !fallbackVideo.played.length) {
          forceVideoPlay(fallbackVideo);
        }
        
        // Remove event listeners after first interaction
        document.removeEventListener('touchStart', handleUserInteraction);
        document.removeEventListener('click', handleUserInteraction);
      };

      document.addEventListener('touchstart', handleUserInteraction, { passive: true });
      document.addEventListener('click', handleUserInteraction, { passive: true });

      return () => {
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('click', handleUserInteraction);
      };
    }
  }, [isPWA, isMobile, forceVideoPlay]);

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
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            onCanPlay={() => setVideoError(false)}
            onLoadedData={(e) => {
              const video = e.target as HTMLVideoElement;
              forceVideoPlay(video);
            }}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              // Additional attempt for PWA/mobile
              if (isPWA || isMobile) {
                forceVideoPlay(video);
              }
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
                if (isPWA || isMobile) {
                  forceVideoPlay(video);
                }
              }}
              className={`object-cover ${isMobile ? 'w-full h-full' : 'w-[95%] h-[90%]'} max-w-none`}
              style={{ 
                pointerEvents: 'none' // Prevent any clicks that might show controls
              }}
            >
              <source src="/Splash Screens/upscaled splash.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;