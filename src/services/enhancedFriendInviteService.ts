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
  type: 'friend_invite' | 'invite_accepted' | 'invite_declined' | 'session_ready' | 'rematch_request';
  title: string;
  message: string;
  fromUser: {
    id: string;
    displayName: string;
  };
  gameMode?: string;
  sessionId?: string;
  inviteId?: string;
  rematchRoomId?: string;
  createdAt: Timestamp;
  read: boolean;
}

export class EnhancedFriendInviteService {
  private static readonly INVITES_COLLECTION = 'friendGameInvites';
  private static readonly NOTIFICATIONS_COLLECTION = 'gameNotifications';
  private static readonly INVITE_EXPIRY_MINUTES = 0.5; // Changed to 30 seconds

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

      // Check if there's already a pending invitation between these users (in either direction)
      await this.clearPendingInvitesBetweenUsers(fromUserId, toUserId);

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
   * Helper method to clear user's current session
   */
  private static async clearUserCurrentSession(userId: string): Promise<void> {
    try {
      const { doc, updateDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Clear current game and room if they exist
        if (userData.currentGame || userData.currentRoom) {
          console.log(`🧹 Clearing session for user ${userId}:`, {
            currentGame: userData.currentGame,
            currentRoom: userData.currentRoom
          });
          
          await updateDoc(userRef, {
            currentGame: null,
            currentRoom: null
          });
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not clear session for user ${userId}:`, error);
      // Don't throw error - this is a cleanup operation that shouldn't block invitation acceptance
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
      console.log('🤝 EnhancedFriendInviteService: Accepting invitation', inviteId, 'by user', acceptingUserId);

      // Add a small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 100));

      return await runTransaction(db, async (transaction) => {
        console.log('🔄 Running acceptance transaction for invitation:', inviteId);
        
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
          console.log('⚠️ Invitation is not pending, current status:', invite.status);
          throw new Error(`Invitation is ${invite.status} and cannot be accepted`);
        }

        if (invite.expiresAt.toDate() < new Date()) {
          throw new Error('Invitation has expired');
        }

        // Check if session already exists for this invitation
        if (invite.sessionId) {
          console.log('✅ Session already exists for this invitation:', invite.sessionId);
          return { 
            success: true, 
            sessionId: invite.sessionId
          };
        }

        // Clear any existing sessions for both players before creating new session
        console.log('🧹 Clearing existing sessions for both players...');
        await Promise.all([
          this.clearUserCurrentSession(invite.fromUserId),
          this.clearUserCurrentSession(invite.toUserId)
        ]);

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

        // Start heartbeats for both players and update their currentGame status
        await Promise.all([
          PlayerHeartbeatService.startHeartbeat(invite.fromUserId, sessionResult.sessionId, sessionResult.sessionId),
          PlayerHeartbeatService.startHeartbeat(invite.toUserId, sessionResult.sessionId, sessionResult.sessionId),
          PlayerHeartbeatService.updateCurrentGame(invite.fromUserId, sessionResult.sessionId),
          PlayerHeartbeatService.updateCurrentGame(invite.toUserId, sessionResult.sessionId)
        ]);

        console.log('✅ Invitation accepted, session created:', sessionResult.sessionId);
        
        // Since we're navigating directly to match, we need to get the match ID
        // The sessionResult contains the sessionId, but we need the match document ID
        // Wait a brief moment for match document creation to complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Query for the match document that was created from this session
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        
        const matchQuery = query(
          collection(db, 'matches'),
          where('sessionId', '==', sessionResult.sessionId)
        );
        const matchSnapshot = await getDocs(matchQuery);
        
        let matchId = sessionResult.sessionId; // Fallback to session ID
        if (!matchSnapshot.empty) {
          matchId = matchSnapshot.docs[0].id;
          console.log('✅ Found match document:', matchId, 'for session:', sessionResult.sessionId);
        } else {
          console.warn('⚠️ No match document found for session, using session ID as fallback');
        }

        // Send notifications to both users with the correct match ID
        await Promise.all([
          this.sendNotification(invite.fromUserId, {
            type: 'invite_accepted',
            title: 'Invitation Accepted!',
            message: `${invite.toDisplayName} accepted your game invitation`,
            fromUser: {
              id: invite.toUserId,
              displayName: invite.toDisplayName
            },
            sessionId: matchId, // Use the actual match document ID
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
            sessionId: matchId, // Use the actual match document ID
            inviteId,
            createdAt: serverTimestamp() as Timestamp,
            read: false
          })
        ]);
        
        return { 
          success: true, 
          sessionId: matchId // Return the actual match ID for navigation
        };
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

      // Send ONLY ONE notification to the sender (preventing duplicate notifications)
      console.log('📤 Sending single decline notification to prevent duplicates');
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
    console.log(`🔍 EnhancedFriendInviteService: Setting up subscription for user ${userId}`);
    
    const q = query(
      collection(db, this.INVITES_COLLECTION),
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );

    return onSnapshot(q, (snapshot) => {
      console.log(`🔍 EnhancedFriendInviteService: Snapshot received for ${userId}:`, {
        size: snapshot.size,
        empty: snapshot.empty,
        fromCache: snapshot.metadata.fromCache
      });
      
      const invitations: FriendGameInvitation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`🔍 EnhancedFriendInviteService: Processing invitation:`, {
          id: doc.id,
          toUserId: data.toUserId,
          fromUserId: data.fromUserId,
          status: data.status,
          gameMode: data.gameMode
        });
        invitations.push({ id: doc.id, ...data } as FriendGameInvitation);
      });
      
      console.log(`🔍 EnhancedFriendInviteService: Calling callback with ${invitations.length} invitations`);
      callback(invitations);
    }, (error) => {
      console.error(`🔍 EnhancedFriendInviteService: Subscription error for ${userId}:`, error);
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

  private static async clearPendingInvitesBetweenUsers(fromUserId: string, toUserId: string): Promise<void> {
    try {
      // Check for invitations from fromUserId to toUserId
      const q1 = query(
        collection(db, this.INVITES_COLLECTION),
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', toUserId),
        where('status', '==', 'pending')
      );

      // Check for invitations from toUserId to fromUserId (reverse direction)
      const q2 = query(
        collection(db, this.INVITES_COLLECTION),
        where('fromUserId', '==', toUserId),
        where('toUserId', '==', fromUserId),
        where('status', '==', 'pending')
      );

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const deletePromises: Promise<void>[] = [];
      
      // Delete invitations in both directions
      snapshot1.docs.forEach(doc => {
        console.log('🔄 Removing existing invitation (same direction):', doc.id);
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      snapshot2.docs.forEach(doc => {
        console.log('🔄 Removing existing invitation (reverse direction):', doc.id);
        deletePromises.push(deleteDoc(doc.ref));
      });

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`✅ Cleared ${deletePromises.length} pending invitation(s) between users`);
      }
    } catch (error) {
      console.error('Error clearing pending invitations:', error);
      // Don't throw - allow new invitation to proceed even if cleanup fails
    }
  }

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
