/**
 * Improved Video Splash Screen Component
 * - No loading bar animation
 * - Content preloads during video playback
 * - Smooth transition with video growing and fading
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoSplashScreenProps {
  onComplete: () => void;
  children: React.ReactNode; // The main app content to show after splash
}

// Global flag to prevent duplicate video initializations
let videoInitialized = false;

const VideoSplashScreenImproved: React.FC<VideoSplashScreenProps> = ({
  onComplete,
  children
}) => {
  const [showSplash, setShowSplash] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [contentPreloaded, setContentPreloaded] = useState(false);
  const [startTransition, setStartTransition] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Prevent duplicate initialization
  useEffect(() => {
    if (videoInitialized) {
      console.log('🎬 Video splash already initialized, skipping...');
      setVideoEnded(true);
      setContentPreloaded(true);
      return;
    }
    
    videoInitialized = true;
    setIsInitialized(true);
    console.log('🎬 Video splash initialized');
    
    return () => {
      // Reset flag when component unmounts
      videoInitialized = false;
    };
  }, []);

  // Detect device type
  useEffect(() => {
    if (!isInitialized) return;
    
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(userAgent) || 
                            window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [isInitialized]);

  // Start preloading content only after initialization
  useEffect(() => {
    if (!isInitialized) return;
    
    const preloadContent = async () => {
      try {
        console.log('🎬 Starting content preload during splash video...');
        
        // Preload critical images
        const imagePromises = [
          '/Design Elements/Player Profiles/QuickMatch.webp',
          '/Design Elements/Player Profiles/Tourdement.webp',
          '/Design Elements/Player Profiles/Vault.webp',
          '/images/CrownLogo.png',
          '/icons/DashDice-iOS-Icon.png',
          '/backgrounds/Relax.png',
          '/backgrounds/All For Glory.jpg',
        ].map(src => 
          new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve; // Don't block on failed images
            img.src = src;
          })
        );

        // Preload critical components and services
        const componentPromises = [
          import('@/components/layout/SinglePageDashboard'),
          import('@/components/dashboard/DashboardSectionNew'),
          import('@/components/ui/GameModeSelector'),
          import('@/components/dashboard/GameWaitingRoom'),
          import('@/components/dashboard/InventoryReference'),
          import('@/services/userService'),
          import('@/services/goBackendAdapter'),
          import('@/services/botMatchingService'),
        ];

        // Wait for fonts
        const fontPromise = document.fonts.ready;

        // Wait for all resources with a reasonable timeout
        await Promise.race([
          Promise.all([...imagePromises, ...componentPromises, fontPromise]),
          new Promise(resolve => setTimeout(resolve, 5000)) // Max 5 seconds
        ]);

        console.log('✅ Content preload complete');
        setContentPreloaded(true);

      } catch (error) {
        console.warn('⚠️ Some content failed to preload, continuing anyway:', error);
        setContentPreloaded(true);
      }
    };

    preloadContent();
  }, [isInitialized]);

  // Handle video events
  const handleVideoLoaded = () => {
    console.log('🎬 Video loaded and ready');
    setVideoLoaded(true);
  };

  const handleVideoEnd = () => {
    console.log('🎬 Video ended');
    setVideoEnded(true);
  };

  const handleVideoError = (error: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.warn('🎬 Video error, skipping to content:', error);
    setVideoEnded(true);
  };

  // Start transition when both video ends and content is preloaded
  useEffect(() => {
    if (videoEnded && contentPreloaded && !startTransition) {
      console.log('🎬 Starting transition from video to content');
      setStartTransition(true);
      
      // Complete the splash after transition animation
      setTimeout(() => {
        setShowSplash(false);
        onComplete();
      }, 800); // Match the transition duration
    }
  }, [videoEnded, contentPreloaded, startTransition, onComplete]);

  // Emergency timeout - never hang for more than 8 seconds
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      console.log('🎬 Emergency timeout - forcing completion');
      setVideoEnded(true);
      setContentPreloaded(true);
    }, 8000);
    
    return () => clearTimeout(emergencyTimeout);
  }, []);

  // Mobile autoplay fallback - try to start video on user interaction
  const handleUserInteraction = async () => {
    if (videoRef.current && !videoEnded && isMobile) {
      try {
        await videoRef.current.play();
        console.log('🎬 Video started after user interaction on mobile');
      } catch (error) {
        console.warn('🎬 Video play failed on mobile, skipping:', error);
        setVideoEnded(true);
      }
    }
  };

  // Auto-skip video on mobile if it doesn't start within 3 seconds
  useEffect(() => {
    if (isMobile && videoLoaded && !videoEnded && !startTransition) {
      const timeout = setTimeout(() => {
        console.log('🎬 Mobile video timeout - skipping to content');
        setVideoEnded(true);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [isMobile, videoLoaded, videoEnded, startTransition]);

  const videoSrc = isMobile ? '/SplashScreens/Mobile-Splash.mp4' : '/SplashScreens/Desktop-Splash.mp4';

  return (
    <div className="relative w-full h-screen overflow-hidden no-loading-bars">
      {/* Main App Content - Hidden behind splash initially, but starts loading immediately */}
      <div 
        className={`absolute inset-0 ${
          showSplash ? 'app-content-preloading' : 'app-content-ready'
        }`}
      >
        {children}
      </div>

      {/* Video Splash Overlay */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="splash-container bg-black flex items-center justify-center cursor-pointer"
            initial={{ opacity: 1, scale: 1 }}
            animate={{ 
              opacity: startTransition ? 0 : 1,
              scale: startTransition ? 1.2 : 1
            }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ 
              duration: 0.8, 
              ease: [0.4, 0.0, 0.2, 1] // Custom easing for smooth transition
            }}
            onClick={handleUserInteraction}
            onTouchStart={handleUserInteraction}
          >
            {/* Video Element */}
            <video
              ref={videoRef}
              className={`splash-video ${isMobile ? 'mobile-video' : ''}`}
              muted
              playsInline
              autoPlay
              preload="auto"
              onLoadedData={handleVideoLoaded}
              onEnded={handleVideoEnd}
              onError={handleVideoError}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>

            {/* Fallback for video loading or mobile autoplay issues */}
            {!videoLoaded && (
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-16 h-16 mx-auto mb-4">
                    <img 
                      src="/images/CrownLogo.png" 
                      alt="DashDice" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-2xl font-bold font-audiowide">DASHDICE</div>
                  {isMobile && (
                    <div className="text-sm text-gray-400 mt-2">Tap to continue</div>
                  )}
                </div>
              </div>
            )}

            {/* No loading bars or progress indicators */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoSplashScreenImproved;