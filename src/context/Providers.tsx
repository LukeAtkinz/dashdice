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
import { MatchChatProvider } from './MatchChatContext';
import { CleanupService } from '@/services/cleanupService';
import { MatchLifecycleService } from '@/services/matchLifecycleService';
import { GameInvitationService } from '@/services/gameInvitationService';
import { RematchService } from '@/services/rematchService';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  // Initialize match lifecycle management on app start
  useEffect(() => {
    // Only run on the client side to avoid SSR issues
    if (typeof window === 'undefined') return;
    
    // Initialize the new match lifecycle service (10-minute cleanup cycle)
    try {
      MatchLifecycleService.initialize();
      console.log('✅ Match Lifecycle Service initialized with 10-minute cleanup cycle');
    } catch (error) {
      console.error('❌ Error initializing Match Lifecycle Service:', error);
    }
    
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
                    <MatchChatProvider>
                      <GameModeProvider>
                        <GameProvider>
                          {children}
                        </GameProvider>
                      </GameModeProvider>
                    </MatchChatProvider>
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
