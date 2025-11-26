'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { EnhancedFriendInviteService } from '@/services/enhancedFriendInviteService';

export const RematchRequestNotification: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();

  useEffect(() => {
    if (!user?.uid) return;

    console.log('🔄 RematchRequestNotification: Setting up listener for user:', user.uid);

    // Listen for rematch_request notifications
    const unsubscribe = EnhancedFriendInviteService.subscribeToNotifications(
      user.uid,
      (notifications) => {
        console.log('🔄 RematchRequestNotification: Received notifications:', notifications.length, 'total');
        console.log('🔄 RematchRequestNotification: Notification types:', notifications.map(n => n.type));
        
        // Find the most recent unread rematch_request notification
        const rematchNotification = notifications.find(
          notification => 
            notification.type === 'rematch_request' && 
            !notification.read
        );

        if (rematchNotification) {
          console.log('🎮 Rematch request received! Notification:', rematchNotification);
          
          // Mark notification as read
          EnhancedFriendInviteService.markNotificationAsRead(rematchNotification.id);
          
          // Navigate to waiting room with rematch room ID
          const rematchRoomId = rematchNotification.rematchRoomId;
          const gameMode = rematchNotification.gameMode || 'classic';
          
          if (rematchRoomId) {
            console.log('🎮 Navigating to rematch waiting room:', { rematchRoomId, gameMode });
            setCurrentSection('waiting-room', {
              gameMode: gameMode,
              roomId: rematchRoomId,
              actionType: 'live'
            });
          } else {
            console.error('❌ No rematchRoomId in notification!');
          }
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

export default RematchRequestNotification;
