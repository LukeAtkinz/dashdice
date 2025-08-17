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
  orderBy
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GameInvitation, User } from '@/types/friends';

export class GameInvitationService {
  // Send game invitation
  static async sendGameInvitation(
    fromUserId: string,
    toUserId: string,
    gameType: string,
    gameSettings?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if users are friends
      const areFriends = await this.areUsersFriends(fromUserId, toUserId);
      if (!areFriends) {
        return { success: false, error: 'Can only invite friends to games' };
      }

      // Get target user's privacy settings
      const targetUser = await this.getUser(toUserId);
      if (!targetUser?.privacy?.allowGameInvites) {
        return { success: false, error: 'This user is not accepting game invitations' };
      }

      // Check if target user is online
      if (!targetUser.isOnline) {
        return { success: false, error: 'User is currently offline' };
      }

      // Check if target user is already in a game
      if (targetUser.currentGame) {
        return { success: false, error: 'User is currently in another game' };
      }

      // Check for existing pending invitation
      const existingInvitation = await this.getPendingInvitationBetweenUsers(fromUserId, toUserId);
      if (existingInvitation) {
        return { success: false, error: 'Game invitation already pending' };
      }

      // Create invitation with 5-minute expiration
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      await addDoc(collection(db, 'gameInvitations'), {
        fromUserId,
        toUserId,
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
      
      return { success: true, gameId };
    } catch (error) {
      console.error('Error accepting game invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  // Decline game invitation
  static async declineGameInvitation(invitationId: string): Promise<boolean> {
    try {
      const invitationRef = doc(db, 'gameInvitations', invitationId);
      await updateDoc(invitationRef, {
        status: 'declined'
      });
      return true;
    } catch (error) {
      console.error('Error declining game invitation:', error);
      return false;
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
    });
  }

  // Create game session from invitation
  private static async createGameSession(invitation: GameInvitation): Promise<string> {
    try {
      // Create a new match/game session
      const gameData = {
        players: [invitation.fromUserId, invitation.toUserId],
        gameType: invitation.gameType,
        settings: invitation.gameSettings,
        status: 'waiting',
        createdAt: serverTimestamp(),
        invitationId: invitation.id
      };

      const gameRef = await addDoc(collection(db, 'matches'), gameData);
      
      // Update both users' currentGame field
      await Promise.all([
        updateDoc(doc(db, 'users', invitation.fromUserId), { currentGame: gameRef.id }),
        updateDoc(doc(db, 'users', invitation.toUserId), { currentGame: gameRef.id })
      ]);

      return gameRef.id;
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
      const expiredQuery = query(
        collection(db, 'gameInvitations'),
        where('status', '==', 'pending'),
        where('expiresAt', '<=', new Date())
      );

      const snapshot = await getDocs(expiredQuery);
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { status: 'expired' })
      );

      await Promise.all(updatePromises);
      console.log(`Cleaned up ${snapshot.docs.length} expired game invitations`);
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
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
}
