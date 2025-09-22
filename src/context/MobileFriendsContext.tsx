import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/mobileFirebase';
import { useMobileAuth } from './MobileAuthContext';
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

const MobileFriendsContext = createContext<FriendsContextValue | undefined>(undefined);

interface MobileFriendsProviderProps {
  children: ReactNode;
}

export function MobileFriendsProvider({ children }: MobileFriendsProviderProps) {
  const { user } = useMobileAuth();
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

    // Subscribe to game invitations from friendGameInvites collection  
    unsubscribeInvitations = EnhancedFriendInviteService.subscribeToInvitations(user.uid, (invitations) => {
      console.log(`🔍 FriendsContext: Received ${invitations.length} invitations for user ${user.uid}:`, invitations);
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

  // Send friend request by friend code
  const sendFriendRequest = async (friendCode: string, message?: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await FriendsService.sendFriendRequest(user.uid, friendCode, message);
      return result;
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: 'Failed to send friend request' };
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (requestId: string): Promise<boolean> => {
    if (!user?.uid) {
      return false;
    }

    try {
      const result = await FriendsService.acceptFriendRequest(requestId);
      return result;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  };

  // Decline friend request
  const declineFriendRequest = async (requestId: string): Promise<boolean> => {
    if (!user?.uid) {
      return false;
    }

    try {
      const result = await FriendsService.declineFriendRequest(requestId);
      return result;
    } catch (error) {
      console.error('Error declining friend request:', error);
      return false;
    }
  };

  // Remove friend
  const removeFriend = async (friendId: string): Promise<boolean> => {
    if (!user?.uid) {
      return false;
    }

    try {
      const result = await FriendsService.removeFriend(user.uid, friendId);
      return result;
    } catch (error) {
      console.error('Error removing friend:', error);
      return false;
    }
  };

  // Send game invitation
  const sendGameInvitation = async (friendId: string, gameType: string, gameSettings?: Record<string, any>): Promise<{ success: boolean; error?: string }> => {
    if (!user?.uid) return { success: false, error: 'User not authenticated' };

    try {
      const result = await EnhancedFriendInviteService.sendGameInvitation(
        user.uid, 
        friendId, 
        gameType, 
        gameSettings?.gameType as 'quick' | 'ranked' || 'quick'
      );
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('Error sending game invitation:', error);
      return { success: false, error: 'Failed to send game invitation' };
    }
  };

  // Accept game invitation
  const acceptGameInvitation = async (invitationId: string): Promise<{ success: boolean; gameId?: string; error?: string }> => {
    console.log('🎯 FriendsContext: acceptGameInvitation called with ID:', invitationId);
    if (!user?.uid) {
      console.log('🎯 FriendsContext: User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      console.log('🎯 FriendsContext: Calling EnhancedFriendInviteService.acceptInvitation...');
      const result = await EnhancedFriendInviteService.acceptInvitation(invitationId, user.uid);
      console.log('🎯 FriendsContext: EnhancedFriendInviteService accept result:', result);
      
      if (result.success) {
        return { success: true, gameId: result.sessionId };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('🎯 FriendsContext: Error in acceptGameInvitation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  };

  const declineGameInvitation = async (invitationId: string): Promise<boolean> => {
    console.log('🎯 FriendsContext: declineGameInvitation called with ID:', invitationId);
    if (!user?.uid) {
      console.log('🎯 FriendsContext: User not authenticated');
      return false;
    }
    
    try {
      console.log('🎯 FriendsContext: Calling EnhancedFriendInviteService.declineInvitation...');
      const result = await EnhancedFriendInviteService.declineInvitation(invitationId, user.uid);
      console.log('🎯 FriendsContext: EnhancedFriendInviteService decline result:', result);
      
      return result.success;
    } catch (error) {
      console.error('🎯 FriendsContext: Error in declineGameInvitation:', error);
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
    <MobileFriendsContext.Provider value={enhancedContextValue}>
      {children}
    </MobileFriendsContext.Provider>
  );
}

// Custom hook to use friends context
export function useMobileFriends() {
  const context = useContext(MobileFriendsContext);
  if (context === undefined) {
    throw new Error('useMobileFriends must be used within a MobileFriendsProvider');
  }
  return context;
}

// Custom hook for friend presence
export function useMobileFriendPresence(friendId: string) {
  const context = useMobileFriends();
  const [presence, setPresence] = useState<PresenceState | null>(null);

  useEffect(() => {
    const unsubscribe = PresenceService.subscribeToPresence(friendId, setPresence);
    return unsubscribe;
  }, [friendId]);

  return presence || context.getFriendPresence?.(friendId) || null;
}

// Custom hook for online friends
export function useMobileOnlineFriends() {
  const context = useMobileFriends();
  return context.getFriendsByStatus?.('online') || [];
}

// Custom hook for game invitation notifications
export function useMobileGameInvitationNotifications() {
  const { gameInvitations } = useMobileFriends();
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

// Export for compatibility with web app patterns
export const useFriends = useMobileFriends;
export const FriendsProvider = MobileFriendsProvider;