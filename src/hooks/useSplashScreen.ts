'use client';

import { useState, useEffect } from 'react';

export const useSplashScreen = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    // Check if this is the first load in this session
    const hasShownSplash = sessionStorage.getItem('splash-shown');
    
    if (hasShownSplash === 'true') {
      setShowSplash(false);
      setIsFirstLoad(false);
    } else {
      // Mark that we've shown the splash for this session
      sessionStorage.setItem('splash-shown', 'true');
    }
  }, []);

  const completeSplash = () => {
    setShowSplash(false);
    setIsFirstLoad(false);
  };

  const resetSplash = () => {
    sessionStorage.removeItem('splash-shown');
    setShowSplash(true);
    setIsFirstLoad(true);
  };

  return {
    showSplash,
    isFirstLoad,
    completeSplash,
    resetSplash
  };
};