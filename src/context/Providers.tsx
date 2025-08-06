'use client';

import React, { useEffect } from 'react';
import { AuthProvider } from './AuthContext';
import { InventoryProvider } from './InventoryContext';
import { GameProvider } from './GameContext';
import { BackgroundProvider } from './BackgroundContext';
import { CleanupService } from '@/services/cleanupService';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  // Initialize database cleanup on app start
  useEffect(() => {
    CleanupService.initializeCleanupScheduler();
  }, []);

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
