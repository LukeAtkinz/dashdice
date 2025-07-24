'use client';

import React from 'react';
import { AuthProvider } from './AuthContext';
import { InventoryProvider } from './InventoryContext';
import { GameProvider } from './GameContext';
import { BackgroundProvider } from './BackgroundContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <BackgroundProvider>
        <InventoryProvider>
          <GameProvider>
            {children}
          </GameProvider>
        </InventoryProvider>
      </BackgroundProvider>
    </AuthProvider>
  );
};
