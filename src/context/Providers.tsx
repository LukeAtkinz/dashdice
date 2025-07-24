'use client';

import React from 'react';
import { AuthProvider } from './AuthContext';
import { InventoryProvider } from './InventoryContext';
import { GameProvider } from './GameContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <InventoryProvider>
        <GameProvider>
          {children}
        </GameProvider>
      </InventoryProvider>
    </AuthProvider>
  );
};
