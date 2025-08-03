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
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      // If user is in a waiting room, clean it up before leaving
      if (currentSection === 'waiting-room' && currentRoomId && user) {
        try {
          await WaitingRoomService.leaveRoom(currentRoomId, user.uid);
          console.log('🧹 Cleaned up waiting room on browser exit:', currentRoomId);
        } catch (error) {
          console.error('❌ Error cleaning up waiting room on browser exit:', error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      // When user navigates away and comes back, check if they left waiting room
      if (document.visibilityState === 'hidden' && user) {
        if (currentSection === 'waiting-room' && currentRoomId) {
          try {
            await WaitingRoomService.leaveRoom(currentRoomId, user.uid);
            console.log('🧹 Cleaned up waiting room on page hide:', currentRoomId);
          } catch (error) {
            console.error('❌ Error cleaning up waiting room on page hide:', error);
          }
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
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
        console.error('❌ Error manually leaving waiting room:', error);
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
