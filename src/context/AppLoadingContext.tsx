/**
 * App Loading Provider
 * Manages application startup loading with preloader integration
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import EnhancedLoadingScreen from '@/components/EnhancedLoadingScreen';

interface AppLoadingContextType {
  isLoading: boolean;
  loadingProgress: number;
  isPreloadComplete: boolean;
}

const AppLoadingContext = createContext<AppLoadingContextType>({
  isLoading: true,
  loadingProgress: 0,
  isPreloadComplete: false,
});

export const useAppLoading = () => useContext(AppLoadingContext);

interface AppLoadingProviderProps {
  children: React.ReactNode;
  skipSplash?: boolean;
}

export const AppLoadingProvider: React.FC<AppLoadingProviderProps> = ({ 
  children, 
  skipSplash = false 
}) => {
  const [isLoading, setIsLoading] = useState(!skipSplash);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isPreloadComplete, setIsPreloadComplete] = useState(skipSplash);

  const handleLoadingComplete = () => {
    setIsPreloadComplete(true);
    setLoadingProgress(100);
    
    // Small delay for smooth transition
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  const contextValue: AppLoadingContextType = {
    isLoading,
    loadingProgress,
    isPreloadComplete,
  };

  // Skip loading screen in development if requested
  if (skipSplash || process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SKIP_SPLASH === 'true') {
    return (
      <AppLoadingContext.Provider value={{ ...contextValue, isLoading: false, isPreloadComplete: true }}>
        {children}
      </AppLoadingContext.Provider>
    );
  }

  return (
    <AppLoadingContext.Provider value={contextValue}>
      {isLoading ? (
        <EnhancedLoadingScreen 
          onLoadingComplete={handleLoadingComplete}
          skipPreload={skipSplash}
        />
      ) : (
        children
      )}
    </AppLoadingContext.Provider>
  );
};

export default AppLoadingProvider;
