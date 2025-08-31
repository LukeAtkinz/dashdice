'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { FriendsService } from '@/services/friendsService';
import { GameInvitationService } from '@/services/gameInvitationService';
import { EnhancedFriendInviteService } from '@/services/enhancedFriendInviteService';
import { PresenceService } from '@/services/presenceService';
import { 
  FriendWithStatus, 
  FriendRequest, 
  GameInvitation, 
  FriendsContextValue,
  PresenceState
} from '@/types/friends';

const FriendsContext = createContext<FriendsContextValue | undefined>(undefined);

interface FriendsProviderProps {
  children: ReactNode;
}

export function FriendsProvider({ children }: FriendsProviderProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [friends, setFriends] = useState<FriendWithStatus[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [gameInvitations, setGameInvitations] = useState<GameInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [friendPresences, setFriendPresences] = useState<Record<string, PresenceState>>({});

  // Initialize friends data when user is available
  useEffect(() => {
    if (!user?.uid) {
      setFriends([]);
      setPendingRequests([]);
      setGameInvitations([]);
      setFriendPresences({});
      return;
    }

    setIsLoading(true);
    
    // Start presence tracking for current user
    PresenceService.startPresenceTracking(user.uid);

    let unsubscribeFriends: (() => void) | undefined;
    let unsubscribeRequests: (() => void) | undefined;
    let unsubscribeInvitations: (() => void) | undefined;
    let unsubscribePresences: (() => void) | undefined;

    // Subscribe to friends
    unsubscribeFriends = FriendsService.subscribeToUserFriends(user.uid, (friendsData) => {
      setFriends(friendsData);
      setIsLoading(false);

      // Subscribe to friends' presence
      const friendIds = friendsData.map(f => f.friendId);
      if (friendIds.length > 0 && unsubscribePresences) {
        unsubscribePresences();
      }
      
      if (friendIds.length > 0) {
        unsubscribePresences = PresenceService.subscribeToMultiplePresence(
          friendIds,
          setFriendPresences
        );
      }
    });

    // Subscribe to pending requests
    unsubscribeRequests = FriendsService.subscribeToPendingRequests(user.uid, (requests) => {
      setPendingRequests(requests);
    });

    // Subscribe to game invitations
    unsubscribeInvitations = GameInvitationService.subscribeToGameInvitations(user.uid, (invitations) => {
      setGameInvitations(invitations);
    });

    // Cleanup function
    return () => {
      unsubscribeFriends?.();
      unsubscribeRequests?.();
      unsubscribeInvitations?.();
      unsubscribePresences?.();
      PresenceService.stopPresenceTracking();
    };
  }, [user?.uid]);

  // Listen for game invitation decline notifications
  useEffect(() => {
    if (!user?.uid) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('type', '==', 'game_invitation_declined'),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          // Get game mode icon function
          const getGameModeIcon = (gameType: string): string => {
            const iconMap: { [key: string]: string } = {
              'quickfire': '/Design Elements/Shield.webp',
              'classic': '/Design Elements/Crown Mode.webp',
              'zero-hour': '/Design Elements/time out.webp',
              'last-line': '/Design Elements/skull.webp',
              'true-grit': '/Design Elements/Castle.webp'
            };
            return iconMap[gameType.toLowerCase()] || iconMap['classic'];
          };

          // Show toast notification with red background for decline
          showToast(
            notification.message,
            'error',
            5000,
            getGameModeIcon(notification.gameType)
          );

          // Mark notification as read
          const notificationRef = doc(db, 'notifications', change.doc.id);
          updateDoc(notificationRef, { read: true }).catch(console.error);
        }
      });
    });

    return () => unsubscribe();
  }, [user?.uid, showToast]);

  // Friend management functions
  const sendFriendRequest = async (friendCode: string, message?: string) => {
    if (!user?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    return await FriendsService.sendFriendRequest(user.uid, friendCode, message);
  };

  const acceptFriendRequest = async (requestId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    const success = await FriendsService.acceptFriendRequest(requestId);
    return success;
  };

  const declineFriendRequest = async (requestId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    return await FriendsService.declineFriendRequest(requestId);
  };

  const removeFriend = async (friendId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    return await FriendsService.removeFriend(user.uid, friendId);
  };

  // Game invitation functions
  const sendGameInvitation = async (friendId: string, gameType: string, gameSettings?: Record<string, any>) => {
    if (!user?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    // Use the enhanced friend invite service for better functionality
    try {
      // Default to quick game type, could be made configurable based on gameSettings
      const matchType: 'quick' | 'ranked' = (gameSettings?.type === 'ranked') ? 'ranked' : 'quick';
      
      const result = await EnhancedFriendInviteService.sendGameInvitation(
        user.uid, 
        friendId, 
        gameType, 
        matchType,
        gameSettings?.message
      );
      
      if (result.success) {
        showToast?.('Game invitation sent successfully!', 'success');
      } else {
        showToast?.(`Failed to send invitation: ${result.error}`, 'error');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast?.(`Error sending invitation: ${errorMessage}`, 'error');
      return { success: false, error: errorMessage };
    }
  };

  const acceptGameInvitation = async (invitationId: string) => {
    if (!user?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await EnhancedFriendInviteService.acceptInvitation(invitationId, user.uid);
      
      if (result.success) {
        showToast?.('Game invitation accepted! Joining match...', 'success');
        return { success: true, gameId: result.sessionId };
      } else {
        showToast?.(`Failed to accept invitation: ${result.error}`, 'error');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast?.(`Error accepting invitation: ${errorMessage}`, 'error');
      return { success: false, error: errorMessage };
    }
  };

  const declineGameInvitation = async (invitationId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      const result = await EnhancedFriendInviteService.declineInvitation(invitationId, user.uid);
      
      if (result.success) {
        showToast?.('Game invitation declined', 'info');
        return true;
      } else {
        showToast?.(`Failed to decline invitation: ${result.error}`, 'error');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast?.(`Error declining invitation: ${errorMessage}`, 'error');
      return false;
    }
  };

  // User status functions
  const updateUserStatus = async (status: 'online' | 'away' | 'busy'): Promise<void> => {
    if (!user?.uid) return;
    
    await PresenceService.updateStatus(user.uid, status);
  };

  const updateCurrentGame = async (gameId?: string): Promise<void> => {
    if (!user?.uid) return;
    
    await PresenceService.updateCurrentGame(user.uid, gameId);
  };

  // Get friend presence
  const getFriendPresence = (friendId: string): PresenceState | null => {
    return friendPresences[friendId] || null;
  };

  // Get online friends count
  const getOnlineFriendsCount = (): number => {
    return Object.values(friendPresences).filter(presence => 
      presence.isOnline && presence.status !== 'offline'
    ).length;
  };

  // Get friends by status
  const getFriendsByStatus = (status: 'online' | 'away' | 'busy' | 'offline'): FriendWithStatus[] => {
    return friends.filter(friend => {
      const presence = friendPresences[friend.friendId];
      if (!presence) return status === 'offline';
      
      if (status === 'offline') {
        return !presence.isOnline || presence.status === 'offline';
      }
      
      return presence.isOnline && presence.status === status;
    });
  };

  // Enhanced friends with presence data
  const getFriendsWithPresence = (): (FriendWithStatus & { presence?: PresenceState })[] => {
    return friends.map(friend => ({
      ...friend,
      presence: friendPresences[friend.friendId]
    }));
  };

  const contextValue: FriendsContextValue = {
    friends,
    pendingRequests,
    gameInvitations,
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    sendGameInvitation,
    acceptGameInvitation,
    declineGameInvitation,
    updateUserStatus,
    updateCurrentGame,
  };

  // Add additional helper functions to context
  const enhancedContextValue = {
    ...contextValue,
    getFriendPresence,
    getOnlineFriendsCount,
    getFriendsByStatus,
    getFriendsWithPresence,
    friendPresences,
  };

  return (
    <FriendsContext.Provider value={enhancedContextValue}>
      {children}
    </FriendsContext.Provider>
  );
}

// Custom hook to use friends context
export function useFriends() {
  const context = useContext(FriendsContext);
  if (context === undefined) {
    throw new Error('useFriends must be used within a FriendsProvider');
  }
  return context;
}

// Custom hook for friend presence
export function useFriendPresence(friendId: string) {
  const context = useFriends();
  const [presence, setPresence] = useState<PresenceState | null>(null);

  useEffect(() => {
    const unsubscribe = PresenceService.subscribeToPresence(friendId, setPresence);
    return unsubscribe;
  }, [friendId]);

  return presence || context.getFriendPresence?.(friendId) || null;
}

// Custom hook for online friends
export function useOnlineFriends() {
  const context = useFriends();
  return context.getFriendsByStatus?.('online') || [];
}

// Custom hook for game invitation notifications
export function useGameInvitationNotifications() {
  const { gameInvitations } = useFriends();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    setNotificationCount(gameInvitations.length);
  }, [gameInvitations]);

  return {
    invitations: gameInvitations,
    count: notificationCount,
    hasInvitations: notificationCount > 0
  };
}
