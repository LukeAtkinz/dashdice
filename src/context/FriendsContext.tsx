'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { FriendsService } from '@/services/friendsService';
import { GameInvitationService } from '@/services/gameInvitationService';
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

    return await GameInvitationService.sendGameInvitation(user.uid, friendId, gameType, gameSettings);
  };

  const acceptGameInvitation = async (invitationId: string) => {
    if (!user?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    return await GameInvitationService.acceptGameInvitation(invitationId);
  };

  const declineGameInvitation = async (invitationId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    return await GameInvitationService.declineGameInvitation(invitationId);
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
