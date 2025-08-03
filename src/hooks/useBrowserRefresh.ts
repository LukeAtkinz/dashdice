'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigation } from '@/context/NavigationContext';
import { useAuth } from '@/context/AuthContext';

export const useBrowserRefresh = () => {
  const router = useRouter();
  const { currentSection, setCurrentSection } = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // If user is in a match, warn them before leaving
      if (currentSection === 'match') {
        event.preventDefault();
        event.returnValue = 'You are currently in a match. Leaving will exit the match. Are you sure?';
        return event.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      // When user refreshes or navigates away and comes back
      if (document.visibilityState === 'visible' && user) {
        // Only exit matches on refresh - other pages should stay as they are
        if (currentSection === 'match' || window.location.pathname.includes('/match')) {
          console.log('🔄 Browser refresh detected in match - exiting match and redirecting to dashboard');
          setCurrentSection('dashboard');
          router.push('/dashboard');
        } else {
          console.log('🔄 Browser refresh detected - staying on current page:', currentSection);
          // User stays on their current page (dashboard, inventory, etc.)
        }
      }
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

    // Initial check on mount - only redirect if in match
    if (user && (currentSection === 'match' || window.location.pathname.includes('/match'))) {
      console.log('🔄 Initial load detected in match context - exiting match and redirecting to dashboard');
      setCurrentSection('dashboard');
      router.push('/dashboard');
    } else if (user) {
      console.log('🔄 Initial load detected - preserving current page:', currentSection);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [currentSection, setCurrentSection, router, user]);

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
