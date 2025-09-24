/**
 * Simple Video Splash Screen Component
 * Displays MP4 splash videos based on device type while app loads in background
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppPreloaderService, { PreloadProgress } from '@/services/appPreloader';

interface VideoSplashScreenProps {
  onLoadingComplete: () => void;
  skipPreload?: boolean;
}

const VideoSplashScreen: React.FC<VideoSplashScreenProps> = ({
  onLoadingComplete,
  skipPreload = false
}) => {
  const [isComplete, setIsComplete] = useState(false);
  const [appLoaded, setAppLoaded] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [progress, setProgress] = useState<PreloadProgress>({
    step: 'Loading...',
    progress: 0,
    total: 8,
    current: 0
  });
  const videoRef = useRef<HTMLVideoElement>(null);

  // Detect device type and video capabilities
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(userAgent) || 
                            window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
      
      // Check if autoplay is likely to work
      if (isMobileDevice) {
        // On mobile, create a test video to check autoplay support
        const testVideo = document.createElement('video');
        testVideo.muted = true;
        testVideo.playsInline = true;
        testVideo.autoplay = true;
        testVideo.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA+1tZGF0AAACrwYF//+c3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1NSByMjkxNyAwYTg0ZDk4IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxOCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTkgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAABWWWIhAA3//728P4FNjuY0JcRzeidAP5fTH9gL+34P7u2hbhtu1+tNpzfKumDQa6sN8kn/o+FN7VXY0JcQ2YQrlnPpAQ2nrfLf7bFw==';
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // iOS specific video handling
  useEffect(() => {
    if (videoRef.current && isMobile) {
      const video = videoRef.current;
      
      // Force load on iOS
      video.load();
      
      // Add additional mobile-specific attributes
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('x5-playsinline', 'true');
      video.setAttribute('x5-video-player-type', 'h5');
      
      // Try to preload
      video.preload = 'metadata';
    }
  }, [isMobile, videoLoaded]);

  // Preload app in background while video plays
  useEffect(() => {
    const startPreloading = async () => {
      try {
        if (skipPreload || AppPreloaderService.isRecentlyPreloaded()) {
          console.log('🎬 Skipping preload - app ready, waiting for video...');
          setProgress({
            step: 'Ready!',
            progress: 100,
            total: 8,
            current: 8
          });
          setAppLoaded(true);
          return;
        }

        console.log('🎬 Starting app preload during splash video...');
        const preloader = AppPreloaderService.getInstance();
        await preloader.preloadApp((progressData) => {
          setProgress(progressData);
        });

        console.log('✅ App preload complete - waiting for video to finish...');
        setAppLoaded(true);

      } catch (error) {
        console.error('❌ Preloading failed:', error);
        setAppLoaded(true);
      }
    };

    startPreloading();
  }, [skipPreload]);

  // Handle video events
  const handleVideoCanPlay = () => {
    console.log('🎬 Video can play');
    setVideoLoaded(true);
    // Try to play immediately, but handle autoplay restrictions
    tryPlayVideo();
  };

  const tryPlayVideo = async () => {
    if (!videoRef.current) return;
    
    try {
      await videoRef.current.play();
      console.log('🎬 Video started playing automatically');
    } catch (error) {
      console.warn('🎬 Autoplay blocked, waiting for user interaction:', error);
      // On mobile, autoplay is blocked, so we'll need user interaction
      if (isMobile) {
        setUserInteracted(false);
      } else {
        setVideoError(true);
      }
    }
  };

  const handleUserInteraction = async () => {
    if (!userInteracted && videoRef.current && !videoEnded && !videoError) {
      setUserInteracted(true);
      try {
        await videoRef.current.play();
        console.log('🎬 Video started playing after user interaction');
      } catch (error) {
        console.error('🎬 Failed to play video after user interaction:', error);
        setVideoError(true);
      }
    }
  };

  const handleVideoPlaying = () => {
    console.log('🎬 Video started playing');
    setUserInteracted(true);
  };

  const handleVideoEnd = () => {
    console.log('🎬 Video ended');
    setVideoEnded(true);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const target = e.target as HTMLVideoElement;
    console.error('🎬 Video error:', e, target.error);
    setVideoError(true);
    
    // Try to recover by reloading the video once
    if (!videoRef.current?.hasAttribute('data-retry')) {
      console.log('🎬 Attempting video recovery...');
      videoRef.current?.setAttribute('data-retry', 'true');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
          tryPlayVideo();
        }
      }, 1000);
    } else {
      // If recovery fails, skip video after 2 seconds
      setTimeout(() => setVideoEnded(true), 2000);
    }
  };

  // Complete loading when both video and app are ready
  useEffect(() => {
    // On mobile, if autoplay is blocked, show tap prompt for 5 seconds, then skip
    if (isMobile && !userInteracted && !videoError && !videoEnded && videoLoaded) {
      const timeout = setTimeout(() => {
        console.log('🎬 Mobile autoplay timeout - skipping video after 5 seconds');
        setVideoEnded(true);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [isMobile, userInteracted, videoError, videoEnded, videoLoaded]);

  // Emergency timeout - never let splash screen hang for more than 10 seconds
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      console.log('🎬 Emergency timeout - forcing completion');
      setVideoEnded(true);
      setAppLoaded(true);
    }, 10000);
    
    return () => clearTimeout(emergencyTimeout);
  }, []);

  // Complete loading when both video and app are ready
  useEffect(() => {
    const shouldComplete = appLoaded && (videoEnded || videoError);
    if (shouldComplete) {
      console.log('🎬 Both video and app complete - transitioning to main app');
      setIsComplete(true);
      setTimeout(onLoadingComplete, 500);
    }
  }, [appLoaded, videoEnded, videoError, onLoadingComplete]);

  const videoSrc = isMobile ? '/SplashScreens/Mobile-Splash.mp4' : '/SplashScreens/Desktop-Splash.mp4';

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={handleUserInteraction}
          onTouchStart={handleUserInteraction}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isMobile ? 'mobile-video' : ''}`}
            muted
            playsInline
            preload="metadata"
            autoPlay
            controls={false}
            onCanPlay={handleVideoCanPlay}
            onPlaying={handleVideoPlaying}
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            onLoadStart={() => console.log('🎬 Video load started')}
            onLoadedMetadata={() => console.log('🎬 Video metadata loaded')}
            onLoadedData={() => console.log('🎬 Video data loaded')}
            style={{ 
              display: videoLoaded && !videoError ? 'block' : 'none',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          >
            {/* Multiple source formats for better compatibility */}
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Mobile-specific styling */}
          <style jsx>{`
            .mobile-video {
              width: 100vw !important;
              height: 100vh !important;
              object-fit: cover !important;
              -webkit-transform: translateZ(0);
              transform: translateZ(0);
            }
          `}</style>

          {/* Mobile Interaction Prompt */}
          {isMobile && !userInteracted && videoLoaded && !videoError && !videoEnded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/70 flex items-center justify-center z-10"
            >
              <motion.div 
                className="text-center text-white"
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="w-20 h-20 border-4 border-white rounded-full flex items-center justify-center mx-auto mb-6 bg-white/10 backdrop-blur-sm">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-xl font-montserrat mb-2">Tap to Start</div>
                <div className="text-sm text-gray-300 font-montserrat">Touch anywhere to begin</div>
              </motion.div>
            </motion.div>
          )}

          {/* Fallback/Loading Content */}
          {(!videoLoaded || videoError) && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 font-audiowide">
                  DASHDICE
                </h1>
                <div className="text-white text-lg font-montserrat">
                  {videoError ? 'Starting...' : 'Loading...'} {progress.progress}%
                </div>
              </div>
            </div>
          )}

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded text-xs font-mono">
              <div>Device: {isMobile ? 'Mobile' : 'Desktop'}</div>
              <div>Video: {videoError ? 'Error' : videoEnded ? 'Complete' : videoLoaded ? 'Playing' : 'Loading'}</div>
              <div>App: {appLoaded ? 'Loaded' : progress.step}</div>
              <div>Progress: {progress.progress}%</div>
              <div>Source: {videoSrc}</div>
              <div>Interaction: {userInteracted ? 'Yes' : 'No'}</div>
              <div>Autoplay: {isMobile ? 'Blocked' : 'Allowed'}</div>
            </div>
          )}

          {/* Post-video loading indicator */}
          {videoEnded && !appLoaded && !videoError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center"
            >
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-white text-lg font-montserrat">
                  {progress.step}
                </div>
                <div className="text-gray-400 text-sm font-montserrat mt-2">
                  {progress.progress}% Complete
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoSplashScreen;