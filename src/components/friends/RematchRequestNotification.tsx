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
          
          // Mark notification as read immediately
          EnhancedFriendInviteService.markNotificationAsRead(rematchNotification.id);
          
          const rematchRoomId = rematchNotification.rematchRoomId;
          const gameMode = rematchNotification.gameMode || 'classic';
          
          if (rematchRoomId) {
            console.log('🎮 Accepting rematch directly:', { rematchRoomId, gameMode });
            
            // Accept the rematch directly - this will create the match
            (async () => {
              try {
                const { RematchService } = await import('@/services/rematchService');
                console.log('🎮 Calling RematchService.acceptRematch...');
                const matchId = await RematchService.acceptRematch(rematchRoomId, user.uid);
                console.log('✅ Rematch accepted! Match ID:', matchId);
                
                // Navigate directly to the match
                setCurrentSection('match', {
                  matchId: matchId,
                  roomId: matchId,
                  gameMode: gameMode
                });
              } catch (error) {
                console.error('❌ Failed to accept rematch:', error);
              }
            })();
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
