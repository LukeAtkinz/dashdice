'use client';

import React, { Suspense, lazy } from 'react';
import { AuthProvider } from './AuthContext';
import { BackgroundProvider } from './BackgroundContext';
import { ToastProvider } from './ToastContext';

// Lazy load heavy context providers
const LazyInventoryProvider = lazy(() => import('./InventoryContext').then(m => ({ default: m.InventoryProvider })));
const LazyGameProvider = lazy(() => import('./GameContext').then(m => ({ default: m.GameProvider })));
const LazyAchievementProvider = lazy(() => import('./AchievementContext').then(m => ({ default: m.AchievementProvider })));
const LazyFriendsProvider = lazy(() => import('./FriendsContext').then(m => ({ default: m.FriendsProvider })));
const LazyGameModeProvider = lazy(() => import('./GameModeContext').then(m => ({ default: m.GameModeProvider })));
const LazyChatProvider = lazy(() => import('./ChatContext').then(m => ({ default: m.ChatProvider })));
const LazyAbilitiesProvider = lazy(() => import('./AbilitiesContext').then(m => ({ default: m.AbilitiesProvider })));

interface OptimizedProvidersProps {
  children: React.ReactNode;
  /**
   * Only load providers that are actually needed.
   * This prevents unnecessary context providers from loading on landing page.
   */
  loadOnlyEssential?: boolean;
}

// Loading fallback for context providers
const ContextLoading = ({ children }: { children: React.ReactNode }) => (
  <>
    {children}
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading features...</span>
      </div>
    </div>
  </>
);

export const OptimizedProviders: React.FC<OptimizedProvidersProps> = ({ 
  children, 
  loadOnlyEssential = false 
}) => {
  // For landing page and guest users - load minimal providers without auth
  if (loadOnlyEssential) {
    return (
      <ToastProvider>
        <BackgroundProvider>
          {children}
        </BackgroundProvider>
      </ToastProvider>
    );
  }

  // For authenticated dashboard - load all providers with lazy loading
  return (
    <ToastProvider>
      <BackgroundProvider>
        <AuthProvider>
          <Suspense fallback={<ContextLoading>{children}</ContextLoading>}>
            <LazyInventoryProvider>
              <LazyGameProvider>
                <LazyAchievementProvider>
                  <LazyFriendsProvider>
                    <LazyGameModeProvider>
                      <LazyChatProvider>
                        <LazyAbilitiesProvider>
                          {children}
                        </LazyAbilitiesProvider>
                      </LazyChatProvider>
                    </LazyGameModeProvider>
                  </LazyFriendsProvider>
                </LazyAchievementProvider>
              </LazyGameProvider>
            </LazyInventoryProvider>
          </Suspense>
        </AuthProvider>
      </BackgroundProvider>
    </ToastProvider>
  );
};