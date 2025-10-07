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
import { ToastProvider } from './ToastContext';
import { AbilitiesProvider } from './AbilitiesContext';
import { CleanupService } from '@/services/cleanupService';
import { GameInvitationService } from '@/services/gameInvitationService';
import { RematchService } from '@/services/rematchService';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  // Initialize database cleanup on app start - TEMPORARILY DISABLED
  useEffect(() => {
    // Only run on the client side to avoid SSR issues
    if (typeof window === 'undefined') return;
    
    // CleanupService.initializeCleanupScheduler(); // Disabled to prevent matchmaking issues
    console.log('🚫 Database cleanup temporarily disabled to prevent matchmaking issues');
    
    // Start invitation and rematch cleanup timers to keep database clean
    try {
      if (GameInvitationService && typeof GameInvitationService.startInvitationCleanupTimer === 'function') {
        GameInvitationService.startInvitationCleanupTimer();
      } else {
        console.warn('⚠️ GameInvitationService cleanup timer not available');
      }
      
      if (RematchService && typeof RematchService.startRematchCleanupTimer === 'function') {
        RematchService.startRematchCleanupTimer();
      } else {
        console.warn('⚠️ RematchService cleanup timer not available');
      }
    } catch (error) {
      console.error('❌ Error starting cleanup timers:', error);
    }
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <BackgroundProvider>
          <InventoryProvider>
            <AchievementProvider>
              <AbilitiesProvider>
                <FriendsProvider>
                  <ChatProvider>
                    <GameModeProvider>
                      <GameProvider>
                        {children}
                      </GameProvider>
                    </GameModeProvider>
                  </ChatProvider>
                </FriendsProvider>
              </AbilitiesProvider>
            </AchievementProvider>
          </InventoryProvider>
        </BackgroundProvider>
      </ToastProvider>
    </AuthProvider>
  );
};
