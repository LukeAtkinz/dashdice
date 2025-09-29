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
      {showSplash && (
        <SplashScreen onComplete={completeSplash} />
      )}
      <div 
        className={`transition-opacity duration-1000 ${showSplash ? 'opacity-0' : 'opacity-100'}`}
        style={{ 
          visibility: showSplash ? 'hidden' : 'visible',
          position: showSplash ? 'absolute' : 'static',
          width: '100%',
          height: '100%'
        }}
      >
        <Providers>
          {children}
        </Providers>
      </div>
    </>
  );
};