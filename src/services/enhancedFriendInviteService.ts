import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  getDoc,
  getDocs,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { NewMatchmakingService } from './newMatchmakingService';
import { PlayerHeartbeatService } from './playerHeartbeatService';
import { UserService } from './userService';

export interface FriendGameInvitation {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  toDisplayName: string;
  gameMode: string;
  gameType: 'quick' | 'ranked';
  sessionId?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  acceptedAt?: Timestamp;
  declinedAt?: Timestamp;
  cancelledAt?: Timestamp;
  message?: string;
}

export interface InviteNotification {
  id: string;
  type: 'friend_invite' | 'invite_accepted' | 'invite_declined' | 'session_ready';
  title: string;
  message: string;
  fromUser: {
    id: string;
    displayName: string;
  };
  gameMode?: string;
  sessionId?: string;
  inviteId?: string;
  createdAt: Timestamp;
  read: boolean;
}

export class EnhancedFriendInviteService {
  private static readonly INVITES_COLLECTION = 'friendGameInvites';
  private static readonly NOTIFICATIONS_COLLECTION = 'gameNotifications';
  private static readonly INVITE_EXPIRY_MINUTES = 10;

  /**
   * Send a game invitation to a friend with enhanced features
   */
  static async sendGameInvitation(
    fromUserId: string,
    toUserId: string,
    gameMode: string,
    gameType: 'quick' | 'ranked' = 'quick',
    message?: string
  ): Promise<{ success: boolean; inviteId?: string; error?: string }> {
    try {
      console.log('🎮 EnhancedFriendInviteService: Sending game invitation', {
        from: fromUserId,
        to: toUserId,
        gameMode,
        gameType
      });

      // Get user profiles for display names
      const [fromProfile, toProfile] = await Promise.all([
        UserService.getUserProfile(fromUserId),
        UserService.getUserProfile(toUserId)
      ]);

      if (!fromProfile || !toProfile) {
        throw new Error('User profiles not found');
      }

      // Check if there's already a pending invitation between these users
      const existingInvite = await this.findPendingInvite(fromUserId, toUserId);
      if (existingInvite) {
        return { 
          success: false, 
          error: 'There is already a pending invitation with this friend' 
        };
      }

      // Create the invitation
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (this.INVITE_EXPIRY_MINUTES * 60 * 1000));

      const inviteData: Omit<FriendGameInvitation, 'id'> = {
        fromUserId,
        fromDisplayName: fromProfile.displayName || fromProfile.email?.split('@')[0] || 'Unknown',
        toUserId,
        toDisplayName: toProfile.displayName || toProfile.email?.split('@')[0] || 'Unknown',
        gameMode,
        gameType,
        status: 'pending',
        createdAt: serverTimestamp() as Timestamp,
        expiresAt: Timestamp.fromDate(expiresAt),
        ...(message && { message }) // Only include message if it exists
      };

      const inviteRef = await addDoc(collection(db, this.INVITES_COLLECTION), inviteData);

      // Send notification to recipient
      await this.sendNotification(toUserId, {
        type: 'friend_invite',
        title: 'Game Invitation Received!',
        message: `${inviteData.fromDisplayName} wants to play ${gameMode}${message ? `: "${message}"` : ''}`,
        fromUser: {
          id: fromUserId,
          displayName: inviteData.fromDisplayName
        },
        gameMode,
        inviteId: inviteRef.id,
        createdAt: serverTimestamp() as Timestamp,
        read: false
      });

      // Schedule auto-expiry
      this.scheduleInviteExpiry(inviteRef.id);

      console.log('✅ Game invitation sent successfully:', inviteRef.id);
      return { success: true, inviteId: inviteRef.id };

    } catch (error) {
      console.error('❌ Error sending game invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Accept a game invitation and create the match session
   */
  static async acceptInvitation(
    inviteId: string,
    acceptingUserId: string
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      console.log('🤝 EnhancedFriendInviteService: Accepting invitation', inviteId);

      return await runTransaction(db, async (transaction) => {
        // Get the invitation
        const inviteRef = doc(db, this.INVITES_COLLECTION, inviteId);
        const inviteDoc = await transaction.get(inviteRef);
        
        if (!inviteDoc.exists()) {
          throw new Error('Invitation not found');
        }

        const invite = { id: inviteDoc.id, ...inviteDoc.data() } as FriendGameInvitation;

        // Validate the invitation
        if (invite.toUserId !== acceptingUserId) {
          throw new Error('You are not the recipient of this invitation');
        }

        if (invite.status !== 'pending') {
          throw new Error(`Invitation is ${invite.status} and cannot be accepted`);
        }

        if (invite.expiresAt.toDate() < new Date()) {
          throw new Error('Invitation has expired');
        }

        // Create the game session using our unified matchmaking service
        const sessionResult = await NewMatchmakingService.createFriendMatch(
          invite.fromUserId,
          invite.toUserId,
          invite.gameMode,
          invite.gameType
        );

        if (!sessionResult.success || !sessionResult.sessionId) {
          throw new Error(sessionResult.error || 'Failed to create game session');
        }

        // Update invitation status
        transaction.update(inviteRef, {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          sessionId: sessionResult.sessionId
        });

        // Start heartbeats for both players
        await Promise.all([
          PlayerHeartbeatService.startHeartbeat(invite.fromUserId, sessionResult.sessionId),
          PlayerHeartbeatService.startHeartbeat(invite.toUserId, sessionResult.sessionId)
        ]);

        // Send notifications to both users
        await Promise.all([
          this.sendNotification(invite.fromUserId, {
            type: 'invite_accepted',
            title: 'Invitation Accepted!',
            message: `${invite.toDisplayName} accepted your game invitation`,
            fromUser: {
              id: invite.toUserId,
              displayName: invite.toDisplayName
            },
            sessionId: sessionResult.sessionId,
            inviteId,
            createdAt: serverTimestamp() as Timestamp,
            read: false
          }),
          this.sendNotification(invite.toUserId, {
            type: 'session_ready',
            title: 'Game Session Ready!',
            message: `Your match with ${invite.fromDisplayName} is starting`,
            fromUser: {
              id: invite.fromUserId,
              displayName: invite.fromDisplayName
            },
            sessionId: sessionResult.sessionId,
            inviteId,
            createdAt: serverTimestamp() as Timestamp,
            read: false
          })
        ]);

        console.log('✅ Invitation accepted, session created:', sessionResult.sessionId);
        return { success: true, sessionId: sessionResult.sessionId };
      });

    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Decline a game invitation
   */
  static async declineInvitation(
    inviteId: string,
    decliningUserId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('❌ EnhancedFriendInviteService: Declining invitation', inviteId);

      const inviteRef = doc(db, this.INVITES_COLLECTION, inviteId);
      const inviteDoc = await getDoc(inviteRef);
      
      if (!inviteDoc.exists()) {
        throw new Error('Invitation not found');
      }

      const invite = { id: inviteDoc.id, ...inviteDoc.data() } as FriendGameInvitation;

      if (invite.toUserId !== decliningUserId) {
        throw new Error('You are not the recipient of this invitation');
      }

      if (invite.status !== 'pending') {
        throw new Error(`Invitation is ${invite.status} and cannot be declined`);
      }

      // Update invitation status
      await updateDoc(inviteRef, {
        status: 'declined',
        declinedAt: serverTimestamp()
      });

      // Notify the sender
      await this.sendNotification(invite.fromUserId, {
        type: 'invite_declined',
        title: 'Invitation Declined',
        message: `${invite.toDisplayName} declined your game invitation${reason ? `: "${reason}"` : ''}`,
        fromUser: {
          id: invite.toUserId,
          displayName: invite.toDisplayName
        },
        inviteId,
        createdAt: serverTimestamp() as Timestamp,
        read: false
      });

      console.log('✅ Invitation declined successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error declining invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Cancel a sent invitation
   */
  static async cancelInvitation(
    inviteId: string,
    senderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚫 EnhancedFriendInviteService: Cancelling invitation', inviteId);

      const inviteRef = doc(db, this.INVITES_COLLECTION, inviteId);
      const inviteDoc = await getDoc(inviteRef);
      
      if (!inviteDoc.exists()) {
        throw new Error('Invitation not found');
      }

      const invite = { id: inviteDoc.id, ...inviteDoc.data() } as FriendGameInvitation;

      if (invite.fromUserId !== senderId) {
        throw new Error('You are not the sender of this invitation');
      }

      if (invite.status !== 'pending') {
        throw new Error(`Invitation is ${invite.status} and cannot be cancelled`);
      }

      // Update invitation status
      await updateDoc(inviteRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      });

      console.log('✅ Invitation cancelled successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error cancelling invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Subscribe to incoming invitations for a user
   */
  static subscribeToInvitations(
    userId: string,
    callback: (invitations: FriendGameInvitation[]) => void
  ) {
    const q = query(
      collection(db, this.INVITES_COLLECTION),
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );

    return onSnapshot(q, (snapshot) => {
      const invitations: FriendGameInvitation[] = [];
      snapshot.forEach((doc) => {
        invitations.push({ id: doc.id, ...doc.data() } as FriendGameInvitation);
      });
      callback(invitations);
    });
  }

  /**
   * Subscribe to notifications for a user
   */
  static subscribeToNotifications(
    userId: string,
    callback: (notifications: InviteNotification[]) => void
  ) {
    const q = query(
      collection(db, this.NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications: InviteNotification[] = [];
      snapshot.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() } as InviteNotification);
      });
      callback(notifications.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
    });
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(db, this.NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, { read: true });
  }

  /**
   * Get unread notification count
   */
  static async getUnreadNotificationCount(userId: string): Promise<number> {
    const q = query(
      collection(db, this.NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Private helper methods
   */

  private static async findPendingInvite(fromUserId: string, toUserId: string): Promise<FriendGameInvitation | null> {
    const q = query(
      collection(db, this.INVITES_COLLECTION),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as FriendGameInvitation;
    }
    return null;
  }

  private static async sendNotification(userId: string, notification: Omit<InviteNotification, 'id'>): Promise<void> {
    await addDoc(collection(db, this.NOTIFICATIONS_COLLECTION), {
      ...notification,
      userId
    });
  }

  private static scheduleInviteExpiry(inviteId: string): void {
    setTimeout(async () => {
      try {
        const inviteRef = doc(db, this.INVITES_COLLECTION, inviteId);
        const inviteDoc = await getDoc(inviteRef);
        
        if (inviteDoc.exists()) {
          const invite = inviteDoc.data() as FriendGameInvitation;
          if (invite.status === 'pending') {
            await updateDoc(inviteRef, {
              status: 'expired'
            });
            console.log('⏰ Invitation expired:', inviteId);
          }
        }
      } catch (error) {
        console.error('❌ Error expiring invitation:', error);
      }
    }, this.INVITE_EXPIRY_MINUTES * 60 * 1000);
  }

  /**
   * Clean up expired invitations (call periodically)
   */
  static async cleanupExpiredInvitations(): Promise<void> {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.INVITES_COLLECTION),
        where('status', '==', 'pending'),
        where('expiresAt', '<', Timestamp.fromDate(now))
      );

      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { status: 'expired' })
      );

      await Promise.all(updates);
      console.log(`🧹 Cleaned up ${updates.length} expired invitations`);
    } catch (error) {
      console.error('❌ Error cleaning up expired invitations:', error);
    }
  }
}
