/**
 * Video Splash Screen Component
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
  const [videoPlaying, setVideoPlaying] = useState(false);
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
        // Still mark as loaded even if preloading fails
        setAppLoaded(true);
      }
    };

    // Start preloading immediately
    startPreloading();
  }, [skipPreload]);

  // Handle video end
  const handleVideoEnd = () => {
    console.log('🎬 Video ended');
    setVideoEnded(true);
  };

  // Complete loading when both video and app are ready
  useEffect(() => {
    if (appLoaded && videoEnded) {
      console.log('🎬 Both video and app complete - transitioning to main app');
      setIsComplete(true);
      setTimeout(onLoadingComplete, 500);
    }
  }, [appLoaded, videoEnded, onLoadingComplete]);

  const videoSrc = isMobile ? '/SplashScreens/Mobile-Splash.mp4' : '/SplashScreens/Desktop-Splash.mp4';

  // Handle video load and play
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      console.log('🎬 Setting up video with src:', videoSrc);
      
      // Set video source
      video.src = videoSrc;
      video.load(); // Force reload
      
      // Multiple attempts to play video
      const playVideo = async () => {
        try {
          console.log('🎬 Attempting to play video...');
          await video.play();
          console.log('🎬 Video playing successfully');
          setVideoPlaying(true);
        } catch (error) {
          console.warn('⚠️ Video autoplay failed, trying again:', error);
          // Try again in 100ms
          setTimeout(async () => {
            try {
              await video.play();
              console.log('🎬 Video playing on retry');
              setVideoPlaying(true);
            } catch (retryError) {
              console.warn('⚠️ Video retry failed, using fallback:', retryError);
              // If video fails to play, just wait a few seconds then complete
              setTimeout(() => {
                setVideoEnded(true);
              }, 3000);
            }
          }, 100);
        }
      };

      const handleLoadStart = () => console.log('🎬 Video load start');
      const handleLoadedMetadata = () => console.log('🎬 Video metadata loaded');
      const handleLoadedData = () => {
        console.log('🎬 Video data loaded, attempting play...');
        playVideo();
      };
      const handleCanPlay = () => {
        console.log('🎬 Video can play');
        playVideo();
      };
      const handlePlaying = () => {
        console.log('🎬 Video is playing');
        setVideoPlaying(true);
      };
      const handleError = (e: Event) => {
        console.error('🎬 Video error:', e);
        setTimeout(() => setVideoEnded(true), 1000);
      };

      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('ended', handleVideoEnd);
      video.addEventListener('error', handleError);
      
      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('ended', handleVideoEnd);
        video.removeEventListener('error', handleError);
      };
    }
  }, [videoSrc]);

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        >
          {/* Video Splash Screen */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="auto"
            autoPlay
            onEnded={handleVideoEnd}
            style={{ backgroundColor: 'black' }}
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Fallback content shown while video loads or if it fails */}
          {!videoPlaying && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 font-audiowide">
                  DASHDICE
                </h1>
                <div className="text-white text-lg font-montserrat">
                  Loading... {progress.progress}%
                </div>
              </div>
            </div>
          )}

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded text-xs font-mono">
              <div>Device: {isMobile ? 'Mobile' : 'Desktop'}</div>
              <div>Video: {videoEnded ? 'Complete' : videoPlaying ? 'Playing' : 'Loading'}</div>
              <div>App: {appLoaded ? 'Loaded' : progress.step}</div>
              <div>Progress: {progress.progress}%</div>
              <div>Source: {videoSrc}</div>
            </div>
          )}

          {/* Loading indicator overlay (only if app is still loading after video ends) */}
          {videoEnded && !appLoaded && (
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