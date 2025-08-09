'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigation } from '@/context/NavigationContext';
import { useAuth } from '@/context/AuthContext';
import { WaitingRoomService } from '@/services/waitingRoomService';

export const useBrowserRefresh = () => {
  const router = useRouter();
  const { currentSection, setCurrentSection, sectionParams } = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (!user) return;
      
      // If user is in a match, warn them before leaving
      if (currentSection === 'match') {
        event.preventDefault();
        event.returnValue = 'You are currently in a match. Leaving will exit the match. Are you sure?';
        return event.returnValue;
      }
      
      // If user is in waiting room, clean up the room
      if (currentSection === 'waiting-room' && sectionParams?.roomId) {
        try {
          await WaitingRoomService.leaveRoom(sectionParams.roomId, user.uid);
          console.log('🧹 Cleaned up waiting room on browser exit');
        } catch (error) {
          // Gracefully handle cleanup errors - don't prevent page exit
          console.log('⚠️ Cleanup error handled gracefully on browser exit:', error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      // Skip visibility-based redirects for match context to avoid interfering with legitimate navigation
      if (document.visibilityState === 'visible' && user) {
        // Only handle non-match contexts
        if (currentSection !== 'match' && !window.location.pathname.includes('/match')) {
          console.log('🔄 Browser refresh detected - staying on current page:', currentSection);
          // User stays on their current page (dashboard, inventory, etc.)
        } else {
          console.log('🔄 Visibility change in match context - ignoring to allow legitimate navigation');
        }
      }
      
      // NOTE: Waiting room cleanup is handled by useWaitingRoomCleanup hook, not here
      // This prevents duplicate cleanup attempts that can cause rooms to be deleted immediately
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // Detect back/forward navigation or refresh
      if (event.persisted && user) {
        console.log('🔄 Page restored from cache - checking navigation state');
        // Only redirect if in match context - preserve other page states
        if (currentSection === 'match' || window.location.pathname.includes('/match')) {
          console.log('🔄 Match context detected in cached page - exiting to dashboard');
          setCurrentSection('dashboard');
          router.push('/dashboard');
        } else {
          console.log('🔄 Non-match page restored from cache - preserving current state:', currentSection);
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    // Initial check on mount - temporarily disabled to fix matchmaking navigation
    // TODO: Re-implement proper browser refresh detection for matches later
    const checkInitialMatchState = () => {
      if (user && (currentSection === 'match' || window.location.pathname.includes('/match'))) {
        // For now, allow all match navigation to proceed
        console.log('🔄 Match navigation detected - allowing match to load (refresh detection disabled)');
      } else if (user) {
        console.log('🔄 Initial load detected - preserving current page:', currentSection);
      }
    };

    // Small delay to allow navigation state to settle
    const timeoutId = setTimeout(checkInitialMatchState, 100);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [currentSection, sectionParams, setCurrentSection, router, user]);

  return {
    // Utility function to safely navigate away from match
    exitMatch: () => {
      if (currentSection === 'match') {
        console.log('🚪 Exiting match and returning to dashboard');
        setCurrentSection('dashboard');
        router.push('/dashboard');
      }
    }
  };
};
