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
  const [isMobile, setIsMobile] = useState(false);
  const [progress, setProgress] = useState<PreloadProgress>({
    step: 'Loading...',
    progress: 0,
    total: 8,
    current: 0
  });
  const videoRef = useRef<HTMLVideoElement>(null);

  // Detect device type
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(userAgent) || 
                            window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

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
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.warn('🎬 Autoplay failed:', error);
        setVideoError(true);
      });
    }
  };

  const handleVideoPlaying = () => {
    console.log('🎬 Video started playing');
  };

  const handleVideoEnd = () => {
    console.log('🎬 Video ended');
    setVideoEnded(true);
  };

  const handleVideoError = () => {
    console.error('🎬 Video error');
    setVideoError(true);
    // If video fails, complete after 2 seconds
    setTimeout(() => setVideoEnded(true), 2000);
  };

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
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src={videoSrc}
            muted
            playsInline
            preload="auto"
            autoPlay
            onCanPlay={handleVideoCanPlay}
            onPlaying={handleVideoPlaying}
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            style={{ display: videoLoaded && !videoError ? 'block' : 'none' }}
          />

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