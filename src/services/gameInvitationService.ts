// Game Invitation Service for managing game invites between friends
import { 
  collection, 
  doc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GameInvitation, User } from '@/types/friends';
import { UserService } from '@/services/userService';

export class GameInvitationService {
  // Send game invitation
  static async sendGameInvitation(
    fromUserId: string,
    toUserId: string,
    gameType: string,
    gameSettings?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📤 GameInvitationService: Sending invitation', { fromUserId, toUserId, gameType });
      
      // Check if users are friends
      const areFriends = await this.areUsersFriends(fromUserId, toUserId);
      if (!areFriends) {
        return { success: false, error: 'Can only invite friends to games' };
      }

      // Get target user's basic info
      const targetUser = await this.getUser(toUserId);
      if (!targetUser) {
        return { success: false, error: 'User not found' };
      }

      console.log('👤 GameInvitationService: Target user data', { 
        userId: toUserId, 
        isOnline: targetUser.isOnline, 
        currentGame: targetUser.currentGame 
      });

      // Skip privacy check for friends - always allow game invitations between friends
      // Friends can always invite each other regardless of privacy settings

      // Check if target user is online
      if (!targetUser.isOnline) {
        return { success: false, error: 'User is currently offline' };
      }

      // Skip currentGame check for friends - allow them to override current game status
      // Friends can always invite each other, and we'll handle game transitions properly
      
      // Clear any stale currentGame references for both users before creating new invitation
      await this.clearStaleCurrentGame(fromUserId);
      await this.clearStaleCurrentGame(toUserId);

      // Check for existing pending invitation
      const existingInvitation = await this.getPendingInvitationBetweenUsers(fromUserId, toUserId);
      if (existingInvitation) {
        return { success: false, error: 'Game invitation already pending' };
      }

      // Get sender's display name
      const fromUser = await this.getUser(fromUserId);
      const fromUserName = fromUser?.displayName || 'Unknown Player';

      // Create invitation with 5-minute expiration
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      await addDoc(collection(db, 'gameInvitations'), {
        fromUserId,
        toUserId,
        fromUserName,
        gameType,
        gameSettings: gameSettings || {},
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending game invitation:', error);
      return { success: false, error: 'Failed to send game invitation' };
    }
  }

  // Accept game invitation
  static async acceptGameInvitation(invitationId: string): Promise<{ success: boolean; gameId?: string; error?: string }> {
    try {
      const invitationRef = doc(db, 'gameInvitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);
      
      if (!invitationDoc.exists()) {
        return { success: false, error: 'Invitation not found' };
      }

      const invitation = invitationDoc.data() as GameInvitation;
      invitation.id = invitationId; // Add the document ID to the invitation object
      
      // Check if invitation is still valid
      if (invitation.status !== 'pending') {
        return { success: false, error: 'Invitation is no longer valid' };
      }

      // Check if invitation has expired
      const now = new Date();
      if (invitation.expiresAt.toDate() < now) {
        await updateDoc(invitationRef, { status: 'expired' });
        return { success: false, error: 'Invitation has expired' };
      }

      // Update invitation status
      await updateDoc(invitationRef, {
        status: 'accepted'
      });

      // Create game session
      const gameId = await this.createGameSession(invitation);
      
      // Update currentGame field for both users to indicate they're joining a game
      await this.updateUserCurrentGame(invitation.fromUserId, gameId);
      await this.updateUserCurrentGame(invitation.toUserId, gameId);
      
      // Delete the invitation from the database after successful acceptance
      await deleteDoc(invitationRef);
      console.log('✅ GameInvitationService: Deleted accepted invitation:', invitationId);
      
      return { success: true, gameId };
    } catch (error) {
      console.error('Error accepting game invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  // Decline game invitation
  static async declineGameInvitation(invitationId: string, currentUserId: string): Promise<boolean> {
    try {
      const invitationRef = doc(db, 'gameInvitations', invitationId);
      
      // Get the invitation data before deleting to send notification to inviter
      const invitationDoc = await getDoc(invitationRef);
      if (!invitationDoc.exists()) {
        console.warn('GameInvitationService: Invitation not found for decline:', invitationId);
        return false;
      }
      
      const invitationData = invitationDoc.data() as GameInvitation;
      
      await updateDoc(invitationRef, {
        status: 'declined'
      });
      
      // Send decline notification to the inviter
      if (invitationData.fromUserId && invitationData.gameType) {
        try {
          // Get current user's data to include their name in the notification
          const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
          const currentUserData = currentUserDoc.data();
          const currentUserName = currentUserData?.displayName || currentUserData?.username || 'Someone';
          
          // Create a notification for the inviter
          await addDoc(collection(db, 'notifications'), {
            userId: invitationData.fromUserId,
            type: 'game_invitation_declined',
            message: `${currentUserName} declined your invite`,
            gameType: invitationData.gameType,
            fromUserName: currentUserName,
            createdAt: serverTimestamp(),
            read: false
          });
          console.log('✅ GameInvitationService: Sent decline notification to inviter');
        } catch (notificationError) {
          console.error('❌ GameInvitationService: Failed to send decline notification:', notificationError);
        }
      }
      
      // Delete the invitation from the database after decline
      await deleteDoc(invitationRef);
      console.log('✅ GameInvitationService: Deleted declined invitation:', invitationId);
      
      return true;
    } catch (error) {
      console.error('Error declining game invitation:', error);
      return false;
    }
  }

  // Clear currentGame field for users (when game ends or is cancelled)
  static async clearUserCurrentGame(userId: string): Promise<void> {
    try {
      await this.updateUserCurrentGame(userId, null);
    } catch (error) {
      console.error('Error clearing user currentGame:', error);
    }
  }

  // Clear stale currentGame references (checks if the waiting room/match still exists)
  private static async clearStaleCurrentGame(userId: string): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user?.currentGame) return;

      // Check if the waiting room still exists
      const waitingRoomDoc = await getDoc(doc(db, 'waitingroom', user.currentGame));
      if (!waitingRoomDoc.exists()) {
        // Also check if it's a match
        const matchDoc = await getDoc(doc(db, 'matches', user.currentGame));
        if (!matchDoc.exists()) {
          // Clear the stale reference
          console.log('🧹 GameInvitationService: Clearing stale currentGame reference for user:', userId);
          await this.clearUserCurrentGame(userId);
        }
      }
    } catch (error) {
      console.error('Error clearing stale currentGame:', error);
    }
  }

  // Force clear user's currentGame (for manual cleanup)
  static async forceClearUserCurrentGame(userId: string): Promise<void> {
    try {
      console.log('🧹 GameInvitationService: Force clearing currentGame for user:', userId);
      await this.clearUserCurrentGame(userId);
    } catch (error) {
      console.error('Error force clearing user currentGame:', error);
    }
  }

  // Emergency cleanup for specific user (for debugging)
  static async emergencyCleanupUser(userId: string): Promise<void> {
    try {
      console.log('🚨 GameInvitationService: Emergency cleanup for user:', userId);
      await this.updateUserCurrentGame(userId, null);
      console.log('✅ GameInvitationService: Emergency cleanup completed');
    } catch (error) {
      console.error('❌ GameInvitationService: Emergency cleanup failed:', error);
    }
  }

  // Mark player as ready in friend invitation room
  static async markPlayerReady(roomId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const roomRef = doc(db, 'waitingroom', roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (!roomDoc.exists()) {
        return { success: false, error: 'Room not found' };
      }
      
      const roomData = roomDoc.data();
      
      // Check if this is a friend invitation room
      if (!roomData.friendInvitation) {
        return { success: false, error: 'Not a friend invitation room' };
      }
      
      // Check if player is part of this room
      const isHost = roomData.hostData?.playerId === playerId;
      const isOpponent = roomData.opponentData?.playerId === playerId;
      
      if (!isHost && !isOpponent) {
        return { success: false, error: 'Player not part of this room' };
      }
      
      // Add player to ready list if not already ready
      const readyPlayers = roomData.readyPlayers || [];
      if (!readyPlayers.includes(playerId)) {
        readyPlayers.push(playerId);
        
        await updateDoc(roomRef, {
          readyPlayers: readyPlayers
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error marking player ready:', error);
      return { success: false, error: 'Failed to mark player ready' };
    }
  }

  // Get user's game invitations
  static async getUserGameInvitations(userId: string): Promise<GameInvitation[]> {
    try {
      const invitationsQuery = query(
        collection(db, 'gameInvitations'),
        where('toUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(invitationsQuery);
      const invitations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameInvitation[];

      // Filter out expired invitations
      const now = new Date();
      const validInvitations = invitations.filter(invitation => {
        if (invitation.expiresAt.toDate() < now) {
          // Mark as expired
          this.markInvitationExpired(invitation.id);
          return false;
        }
        return true;
      });

      return validInvitations;
    } catch (error) {
      console.error('Error getting user game invitations:', error);
      return [];
    }
  }

  // Subscribe to user's game invitations
  static subscribeToGameInvitations(userId: string, callback: (invitations: GameInvitation[]) => void): () => void {
    const invitationsQuery = query(
      collection(db, 'gameInvitations'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(invitationsQuery, (snapshot) => {
      const invitations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameInvitation[];

      // Filter out expired invitations
      const now = new Date();
      const validInvitations = invitations.filter(invitation => {
        if (invitation.expiresAt.toDate() < now) {
          // Mark as expired
          this.markInvitationExpired(invitation.id);
          return false;
        }
        return true;
      });

      callback(validInvitations);
    }, (error) => {
      console.error('Error in game invitations subscription:', error);
      callback([]);
    });
  }

  // Create game session from invitation
  private static async createGameSession(invitation: GameInvitation): Promise<string> {
    try {
      // Get user data for both players
      const [fromUser, toUser] = await Promise.all([
        this.getUser(invitation.fromUserId),
        this.getUser(invitation.toUserId)
      ]);

      if (!fromUser || !toUser) {
        throw new Error('User data not found');
      }

      // Get complete user profiles with stats and backgrounds
      const [fromProfile, toProfile] = await Promise.all([
        UserService.getUserProfile(invitation.fromUserId),
        UserService.getUserProfile(invitation.toUserId)
      ]);

      // Default background
      const defaultBackground = { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' };

      console.log('🎮 GameInvitationService: Creating waiting room with gameType:', invitation.gameType);

      // Create waiting room data with both players
      const waitingRoomData = {
        gameMode: invitation.gameType,
        gameType: 'Friend Invitation',
        playersRequired: 0, // Both players already confirmed
        friendInvitation: true, // Add flag to indicate this is a friend invitation
        readyPlayers: [invitation.fromUserId, invitation.toUserId], // ✅ Auto-ready both players
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + (20 * 60 * 1000)), // 20 minute expiry
        hostData: {
          playerDisplayName: fromUser.displayName || 'Unknown Player',
          playerId: invitation.fromUserId,
          displayBackgroundEquipped: fromProfile?.inventory?.displayBackgroundEquipped || defaultBackground,
          matchBackgroundEquipped: fromProfile?.inventory?.matchBackgroundEquipped || defaultBackground,
          playerStats: fromProfile?.stats || {
            bestStreak: 0,
            currentStreak: 0,
            gamesPlayed: 0,
            matchWins: 0
          }
        },
        opponentData: {
          playerDisplayName: toUser.displayName || 'Unknown Player',
          playerId: invitation.toUserId,
          displayBackgroundEquipped: toProfile?.inventory?.displayBackgroundEquipped || defaultBackground,
          matchBackgroundEquipped: toProfile?.inventory?.matchBackgroundEquipped || defaultBackground,
          playerStats: toProfile?.stats || {
            bestStreak: 0,
            currentStreak: 0,
            gamesPlayed: 0,
            matchWins: 0
          }
        },
        gameData: {
          type: 'dice',
          settings: invitation.gameSettings || {}
        },
        invitationId: invitation.id
      };

      // Create waiting room
      const waitingRoomRef = await addDoc(collection(db, 'waitingroom'), waitingRoomData);
      
      // ✅ FIXED: Remove automatic timeout for friend invitations
      // The GameWaitingRoom component will handle the transition to matches
      // This prevents race conditions between automatic timeout and manual triggers
      console.log('✅ GameInvitationService: Friend game waiting room created:', waitingRoomRef.id);

      return waitingRoomRef.id;
    } catch (error) {
      console.error('Error creating game session:', error);
      throw error;
    }
  }

  // Helper: Check if users are friends
  private static async areUsersFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      const friendshipQuery = query(
        collection(db, 'friends'),
        where('userId', '==', userId1),
        where('friendId', '==', userId2),
        where('status', '==', 'accepted')
      );
      
      const snapshot = await getDocs(friendshipQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking friendship:', error);
      return false;
    }
  }

  // Helper: Get user data
  private static async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { uid: userDoc.id, ...userDoc.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Helper: Update user's currentGame field
  private static async updateUserCurrentGame(userId: string, gameId: string | null): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        currentGame: gameId,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user currentGame:', error);
    }
  }

  // Helper: Get pending invitation between users
  private static async getPendingInvitationBetweenUsers(fromUserId: string, toUserId: string): Promise<GameInvitation | null> {
    try {
      const invitationQuery = query(
        collection(db, 'gameInvitations'),
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', toUserId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(invitationQuery);
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const invitation = { id: doc.id, ...doc.data() } as GameInvitation;
      
      // Check if expired
      const now = new Date();
      if (invitation.expiresAt.toDate() < now) {
        await this.markInvitationExpired(invitation.id);
        return null;
      }

      return invitation;
    } catch (error) {
      console.error('Error getting pending invitation:', error);
      return null;
    }
  }

  // Helper: Mark invitation as expired
  private static async markInvitationExpired(invitationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'gameInvitations', invitationId), {
        status: 'expired'
      });
    } catch (error) {
      console.error('Error marking invitation as expired:', error);
    }
  }

  // Clean up expired invitations (utility function)
  static async cleanupExpiredInvitations(): Promise<void> {
    try {
      console.log('🧹 GameInvitationService: Starting cleanup of expired invitations...');
      
      const now = new Date();
      const expiredQuery = query(
        collection(db, 'gameInvitations'),
        where('expiresAt', '<', Timestamp.fromDate(now))
      );

      const snapshot = await getDocs(expiredQuery);
      
      if (snapshot.empty) {
        console.log('✅ GameInvitationService: No expired invitations found');
        return;
      }

      // Delete all expired invitations instead of just marking as expired
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`✅ GameInvitationService: Deleted ${snapshot.docs.length} expired invitations`);
    } catch (error) {
      console.error('❌ GameInvitationService: Error cleaning up expired invitations:', error);
    }
  }

  // Cancel sent invitation
  static async cancelGameInvitation(invitationId: string, userId: string): Promise<boolean> {
    try {
      const invitationRef = doc(db, 'gameInvitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);
      
      if (!invitationDoc.exists()) {
        return false;
      }

      const invitation = invitationDoc.data() as GameInvitation;
      
      // Only allow the sender to cancel
      if (invitation.fromUserId !== userId) {
        return false;
      }

      await updateDoc(invitationRef, {
        status: 'cancelled'
      });

      return true;
    } catch (error) {
      console.error('Error cancelling game invitation:', error);
      return false;
    }
  }

  // Get sent invitations for a user
  static async getSentInvitations(userId: string): Promise<GameInvitation[]> {
    try {
      const invitationsQuery = query(
        collection(db, 'gameInvitations'),
        where('fromUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(invitationsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameInvitation[];
    } catch (error) {
      console.error('Error getting sent invitations:', error);
      return [];
    }
  }

  // Start automatic cleanup timer (call this when the app starts)
  static startInvitationCleanupTimer(): void {
    // Clean up expired invitations every 2 minutes
    setInterval(() => {
      this.cleanupExpiredInvitations();
    }, 2 * 60 * 1000);
    
    console.log('✅ GameInvitationService: Started automatic invitation cleanup timer');
  }
}
