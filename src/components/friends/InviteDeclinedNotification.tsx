'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { EnhancedFriendInviteService } from '@/services/enhancedFriendInviteService';

export const InviteDeclinedNotification: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user?.uid) return;

    // Listen for invite_declined notifications
    const unsubscribe = EnhancedFriendInviteService.subscribeToNotifications(
      user.uid,
      (notifications) => {
        // Find the most recent unread invite_declined notification
        const declinedNotification = notifications.find(
          notification => 
            notification.type === 'invite_declined' && 
            !notification.read
        );

        if (declinedNotification) {
          console.log('😔 Friend declined your invitation');
          
          // Mark notification as read
          EnhancedFriendInviteService.markNotificationAsRead(declinedNotification.id);
          
          // Show toast notification
          showToast?.(
            `${declinedNotification.fromUser?.displayName || 'Friend'} declined your game invitation`,
            'info'
          );
        }
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, showToast]);

  // This is a logic-only component, no UI
  return null;
};

export default InviteDeclinedNotification;