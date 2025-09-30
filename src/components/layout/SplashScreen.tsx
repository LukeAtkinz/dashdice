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
            autoPlay
            muted
            playsInline
            preload="auto"
            controls={false}
            webkit-playsinline="true"
            x5-video-player-type="h5-page"
            x5-video-player-fullscreen="false"
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            onCanPlay={() => setVideoError(false)}
            onLoadedData={(e) => {
              const video = e.target as HTMLVideoElement;
              video.play().catch(error => {
                console.warn('Autoplay failed:', error);
                // Try to play after a short delay for mobile
                setTimeout(() => {
                  video.play().catch(() => console.warn('Delayed autoplay also failed'));
                }, 100);
              });
            }}
            className={`object-cover ${isMobile ? 'w-full h-full' : 'w-[95%] h-[90%]'} max-w-none`}
            style={{ 
              display: videoError ? 'none' : 'block'
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
              webkit-playsinline="true"
              x5-video-player-type="h5-page"
              x5-video-player-fullscreen="false"
              onEnded={handleVideoEnd}
              onError={() => {
                console.warn('All splash videos failed, skipping splash screen');
                handleVideoEnd();
              }}
              onLoadedData={(e) => {
                const video = e.target as HTMLVideoElement;
                video.play().catch(error => {
                  console.warn('Fallback autoplay failed:', error);
                  setTimeout(() => {
                    video.play().catch(() => console.warn('Delayed fallback autoplay also failed'));
                  }, 100);
                });
              }}
              className={`object-cover ${isMobile ? 'w-full h-full' : 'w-[95%] h-[90%]'} max-w-none`}
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