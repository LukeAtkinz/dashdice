'use client';

import React, { useEffect } from 'react';
import { AuthProvider } from './AuthContext';
import { InventoryProvider } from './InventoryContext';
import { GameProvider } from './GameContext';
import { BackgroundProvider } from './BackgroundContext';
import { AchievementProvider } from './AchievementContext';
import { FriendsProvider } from './FriendsContext';
import { GameModeProvider } from './GameModeContext';
import { ChatProvider } from './ChatContext';
import { CleanupService } from '@/services/cleanupService';
import { GameInvitationService } from '@/services/gameInvitationService';
import { RematchService } from '@/services/rematchService';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  // Initialize database cleanup on app start - TEMPORARILY DISABLED
  useEffect(() => {
    // CleanupService.initializeCleanupScheduler(); // Disabled to prevent matchmaking issues
    console.log('🚫 Database cleanup temporarily disabled to prevent matchmaking issues');
    
    // Start invitation and rematch cleanup timers to keep database clean
    GameInvitationService.startInvitationCleanupTimer();
    RematchService.startRematchCleanupTimer();
  }, []);

  return (
    <AuthProvider>
      <BackgroundProvider>
        <InventoryProvider>
          <AchievementProvider>
            <FriendsProvider>
              <ChatProvider>
                <GameModeProvider>
                  <GameProvider>
                    {children}
                  </GameProvider>
                </GameModeProvider>
              </ChatProvider>
            </FriendsProvider>
          </AchievementProvider>
        </InventoryProvider>
      </BackgroundProvider>
    </AuthProvider>
  );
};
