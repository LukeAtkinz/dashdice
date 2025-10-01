'use client';

import React from 'react';
import { useSplashScreen } from '@/hooks/useSplashScreen';
import SplashScreen from '@/components/layout/SplashScreen';
import { Providers } from '@/context/Providers';
import { PersistentBackground } from '@/components/layout/PersistentBackground';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  const { showSplash, completeSplash } = useSplashScreen();

  return (
    <>
      {/* Persistent Background Video Layer */}
      <PersistentBackground>
        {/* Content Layer - Always rendered but initially invisible */}
        <div 
          className={`min-h-screen transition-opacity duration-1000 ease-out ${
            showSplash ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ 
            zIndex: 10,
            pointerEvents: showSplash ? 'none' : 'auto'
          }}
        >
          <Providers>
            {children}
          </Providers>
        </div>
      </PersistentBackground>

      {/* Splash Screen Layer - Overlays content */}
      {showSplash && (
        <SplashScreen onComplete={completeSplash} />
      )}
    </>
  );
};