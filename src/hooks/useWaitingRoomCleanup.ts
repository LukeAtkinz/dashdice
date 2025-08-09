'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigation } from '@/context/NavigationContext';
import { useAuth } from '@/context/AuthContext';
import { WaitingRoomService } from '@/services/waitingRoomService';

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
      // TEMPORARILY DISABLED: All cleanup to prevent rooms being deleted
      console.log('🚫 Browser exit cleanup temporarily disabled');
      return;
      
      // Always clean up on browser close/refresh
      if (currentSection === 'waiting-room' && currentRoomId && user?.uid) {
        try {
          // Use non-null assertion since we've already checked these values above
          await WaitingRoomService.leaveRoom(currentRoomId!, user!.uid);
          console.log('🧹 Cleaned up waiting room on browser exit:', currentRoomId);
        } catch (error) {
          // Gracefully handle cleanup errors - don't prevent page exit
          console.log('⚠️ Cleanup error handled gracefully on browser exit:', error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      // TEMPORARILY DISABLED: Visibility-based cleanup to prevent immediate room deletion
      console.log('🚫 Visibility-based cleanup temporarily disabled');
      return;
      
      // Only cleanup if enough time has passed and user is actually leaving
      if (!cleanupEnabled) {
        console.log('⏸️ Cleanup not yet enabled, skipping visibility cleanup');
        return;
      }

      // When user navigates away and comes back, check if they left waiting room
      if (document.visibilityState === 'hidden' && user?.uid) {
        if (currentSection === 'waiting-room' && currentRoomId) {
          try {
            // Use non-null assertion since we've already checked these values above
            await WaitingRoomService.leaveRoom(currentRoomId!, user!.uid);
            console.log('🧹 Cleaned up waiting room on page hide:', currentRoomId);
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
        await WaitingRoomService.leaveRoom(currentRoomId, user.uid);
        console.log('🧹 Manually left waiting room:', currentRoomId);
        
        // Navigate back to dashboard
        setCurrentSection('dashboard');
        router.push('/dashboard');
      } catch (error) {
        // Gracefully handle cleanup errors - still navigate away
        console.log('⚠️ Cleanup error handled gracefully during manual leave:', error);
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
