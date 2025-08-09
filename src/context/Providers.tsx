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
  // Initialize database cleanup on app start - TEMPORARILY DISABLED
  useEffect(() => {
    // CleanupService.initializeCleanupScheduler(); // Disabled to prevent matchmaking issues
    console.log('🚫 Database cleanup temporarily disabled to prevent matchmaking issues');
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
