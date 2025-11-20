'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { EnhancedFriendInviteService } from '@/services/enhancedFriendInviteService';

export const InviteAcceptedNotification: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();

  useEffect(() => {
    if (!user?.uid) return;

    // Listen for invite_accepted notifications
    const unsubscribe = EnhancedFriendInviteService.subscribeToNotifications(
      user.uid,
      (notifications) => {
        // Find the most recent unread invite_accepted notification
        const acceptedNotification = notifications.find(
          notification => 
            notification.type === 'invite_accepted' && 
            !notification.read &&
            notification.sessionId
        );

        if (acceptedNotification) {
          console.log('🎉 Friend accepted your invitation! Navigating to waiting room:', acceptedNotification.sessionId);
          
          // Mark notification as read
          EnhancedFriendInviteService.markNotificationAsRead(acceptedNotification.id);
          
          // Navigate to the waiting room, not directly to match
          setCurrentSection('waiting-room', {
            roomId: acceptedNotification.sessionId,
            gameMode: acceptedNotification.gameMode || 'classic'
          });
        }
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, setCurrentSection]);

  // This is a logic-only component, no UI
  return null;
};

export default InviteAcceptedNotification;
