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

      // Default background
      const defaultBackground = { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' };

      // Create waiting room data with both players
      const waitingRoomData = {
        gameMode: invitation.gameType,
        gameType: 'Friend Invitation',
        playersRequired: 0, // Both players already confirmed
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + (20 * 60 * 1000)), // 20 minute expiry
        hostData: {
          playerDisplayName: fromUser.displayName || 'Unknown Player',
          playerId: invitation.fromUserId,
          displayBackgroundEquipped: defaultBackground,
          matchBackgroundEquipped: defaultBackground,
          playerStats: {
            bestStreak: 0,
            currentStreak: 0,
            gamesPlayed: 0,
            matchWins: 0
          }
        },
        opponentData: {
          playerDisplayName: toUser.displayName || 'Unknown Player',
          playerId: invitation.toUserId,
          displayBackgroundEquipped: defaultBackground,
          matchBackgroundEquipped: defaultBackground,
          playerStats: {
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
      
      // Import MatchmakingService for moving to matches
      const { MatchmakingService } = await import('./matchmakingService');
      
      // Start countdown to move to matches after 3 seconds (gives users time to see the room)
      setTimeout(async () => {
        try {
          await MatchmakingService.moveToMatches(waitingRoomRef.id);
          console.log('✅ GameInvitationService: Friend game moved to matches automatically');
        } catch (error) {
          console.error('❌ GameInvitationService: Error moving friend game to matches:', error);
        }
      }, 3000);

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
