'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigation } from '@/context/NavigationContext';
import { useAuth } from '@/context/AuthContext';
import { WaitingRoomService } from '@/services/waitingRoomService';
import { NewMatchmakingService } from '@/services/newMatchmakingService';

export const useWaitingRoomCleanup = (currentRoomId?: string) => {
  const router = useRouter();
  const { currentSection, setCurrentSection } = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    // Add a delay before enabling cleanup to prevent immediate deletion during page load
    let cleanupEnabled = false;
    
    const enableCleanupTimeout = setTimeout(() => {
      cleanupEnabled = true;
      console.log('🕒 Waiting room cleanup enabled after 3 second delay');
    }, 3000); // Wait 3 seconds after component mount

    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      // Always clean up on browser close/refresh
      if (currentSection === 'waiting-room' && currentRoomId && user?.uid) {
        try {
          console.log('🧹 Cleaning up session on browser exit:', currentRoomId);
          // Use enhanced cleanup that removes both game session and waiting room documents
          await NewMatchmakingService.leaveSession(user.uid, currentRoomId);
          console.log('✅ Enhanced cleanup completed on browser exit');
        } catch (error) {
          // Gracefully handle cleanup errors - don't prevent page exit
          console.log('⚠️ Cleanup error handled gracefully on browser exit:', error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      // Only cleanup if enough time has passed and user is actually leaving
      if (!cleanupEnabled) {
        console.log('⏸️ Cleanup not yet enabled, skipping visibility cleanup');
        return;
      }

      // When user navigates away and comes back, check if they left waiting room
      if (document.visibilityState === 'hidden' && user?.uid) {
        if (currentSection === 'waiting-room' && currentRoomId) {
          try {
            console.log('🧹 Enhanced cleanup on page hide:', currentRoomId);
            await NewMatchmakingService.leaveSession(user.uid, currentRoomId);
            console.log('✅ Enhanced cleanup completed on page hide');
          } catch (error) {
            // Gracefully handle cleanup errors
            console.log('⚠️ Cleanup error handled gracefully on page hide:', error);
          }
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(enableCleanupTimeout);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSection, currentRoomId, user]);

  // Function to manually leave waiting room (for navigation buttons)
  const leaveWaitingRoom = async () => {
    if (currentSection === 'waiting-room' && currentRoomId && user) {
      try {
        console.log('🚪 Manual leave waiting room with enhanced cleanup:', currentRoomId);
        await NewMatchmakingService.leaveSession(user.uid, currentRoomId);
        console.log('✅ Manual enhanced cleanup completed');
        
        // Navigate back to dashboard
        setCurrentSection('dashboard');
        router.push('/dashboard');
      } catch (error) {
        console.error('❌ Error during manual waiting room leave:', error);
        // Still navigate away even if cleanup fails
        setCurrentSection('dashboard');
        router.push('/dashboard');
      }
    }
  };

  return {
    leaveWaitingRoom
  };
};
