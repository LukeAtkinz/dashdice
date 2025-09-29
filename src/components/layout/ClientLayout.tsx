'use client';

import React from 'react';
import { useSplashScreen } from '@/hooks/useSplashScreen';
import SplashScreen from '@/components/layout/SplashScreen';
import { Providers } from '@/context/Providers';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  const { showSplash, completeSplash } = useSplashScreen();

  return (
    <>
      {/* Content Layer - Always rendered but initially invisible */}
      <div 
        className={`fixed inset-0 transition-opacity duration-1000 ease-out ${
          showSplash ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ 
          zIndex: 1,
          pointerEvents: showSplash ? 'none' : 'auto'
        }}
      >
        <Providers>
          {children}
        </Providers>
      </div>

      {/* Splash Screen Layer - Overlays content */}
      {showSplash && (
        <SplashScreen onComplete={completeSplash} />
      )}
    </>
  );
};