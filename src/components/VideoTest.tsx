/**
 * Simple Video Test Component
 * Basic test to see if video loads and plays correctly
 */

'use client';

import React, { useRef, useEffect } from 'react';

const VideoTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      console.log('📹 Video Test - Setting up video');
      
      const handleLoadStart = () => console.log('📹 Load start');
      const handleLoadedMetadata = () => console.log('📹 Metadata loaded');
      const handleLoadedData = () => console.log('📹 Data loaded');
      const handleCanPlay = () => {
        console.log('📹 Can play - attempting to play');
        video.play().then(() => {
          console.log('📹 Playing successfully');
        }).catch(error => {
          console.error('📹 Play failed:', error);
        });
      };
      const handlePlaying = () => console.log('📹 Video is playing');
      const handleError = (e: Event) => console.error('📹 Video error:', e);

      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('error', handleError);
      };
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-white text-2xl mb-4">Video Test</h1>
        <video
          ref={videoRef}
          className="w-96 h-64 border border-white"
          muted
          playsInline
          preload="auto"
          controls
        >
          <source src="/SplashScreens/Desktop-Splash.mp4" type="video/mp4" />
          Video not supported
        </video>
        <div className="text-white mt-4">
          Check browser console for loading details
        </div>
      </div>
    </div>
  );
};

export default VideoTest;