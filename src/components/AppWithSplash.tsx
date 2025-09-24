/**
 * Improved App Loading Wrapper
 * Uses the new splash screen with content preloading and smooth transitions
 */

'use client';

import React, { useState } from 'react';
import VideoSplashScreenImproved from '@/components/VideoSplashScreenImproved';

interface AppWithSplashProps {
  children: React.ReactNode;
  skipSplash?: boolean;
}

const AppWithSplash: React.FC<AppWithSplashProps> = ({ 
  children, 
  skipSplash = false 
}) => {
  const [splashComplete, setSplashComplete] = useState(skipSplash);

  const handleSplashComplete = () => {
    console.log('🎬 Splash screen complete, showing main app');
    setSplashComplete(true);
  };

  // If splash is complete or skipped, show main app directly
  if (splashComplete) {
    return <>{children}</>;
  }

  // Show splash screen with main app content preloading behind it
  return (
    <VideoSplashScreenImproved onComplete={handleSplashComplete}>
      {children}
    </VideoSplashScreenImproved>
  );
};

export default AppWithSplash;