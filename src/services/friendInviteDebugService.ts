import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Debug service for friend invitation notifications
 */
export class FriendInviteDebugService {
  
  /**
   * Debug friend invitation subscription for a specific user
   */
  static debugInvitationSubscription(userId: string): () => void {
    console.log(`🔍 DEBUG: Setting up invitation subscription for user: ${userId}`);
    
    const q = query(
      collection(db, 'friendGameInvites'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`🔍 DEBUG: Invitation snapshot received for ${userId}:`, {
        size: snapshot.size,
        empty: snapshot.empty,
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites
      });
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`🔍 DEBUG: Invitation document:`, {
          id: doc.id,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          status: data.status,
          gameMode: data.gameMode,
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate()
        });
      });
      
      if (snapshot.empty) {
        console.log(`🔍 DEBUG: No pending invitations found for user ${userId}`);
        // Check if there are any invitations at all for this user
        this.checkAllInvitationsForUser(userId);
      }
    }, (error) => {
      console.error(`🔍 DEBUG: Error in invitation subscription for ${userId}:`, error);
    });
    
    // Return unsubscribe function for cleanup
    return unsubscribe;
  }
  
  /**
   * Check all invitations for a user (regardless of status)
   */
  static async checkAllInvitationsForUser(userId: string): Promise<void> {
    console.log(`🔍 DEBUG: Checking all invitations for user: ${userId}`);
    
    try {
      const q = query(
        collection(db, 'friendGameInvites'),
        where('toUserId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      
      console.log(`🔍 DEBUG: Total invitations for ${userId}:`, snapshot.size);
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`🔍 DEBUG: Invitation (any status):`, {
          id: doc.id,
          fromUserId: data.fromUserId,
          fromDisplayName: data.fromDisplayName,
          toUserId: data.toUserId,
          toDisplayName: data.toDisplayName,
          status: data.status,
          gameMode: data.gameMode,
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          expired: data.expiresAt?.toDate() < new Date()
        });
      });
      
    } catch (error) {
      console.error(`🔍 DEBUG: Error checking all invitations for ${userId}:`, error);
    }
  }
  
  /**
   * Check all invitations in the collection
   */
  static async checkAllInvitations(): Promise<void> {
    console.log(`🔍 DEBUG: Checking all invitations in friendGameInvites collection`);
    
    try {
      const snapshot = await getDocs(collection(db, 'friendGameInvites'));
      
      console.log(`🔍 DEBUG: Total invitations in collection:`, snapshot.size);
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`🔍 DEBUG: Invitation document:`, {
          id: doc.id,
          fromUserId: data.fromUserId,
          fromDisplayName: data.fromDisplayName,
          toUserId: data.toUserId,
          toDisplayName: data.toDisplayName,
          status: data.status,
          gameMode: data.gameMode,
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          expired: data.expiresAt?.toDate() < new Date()
        });
      });
      
    } catch (error) {
      console.error(`🔍 DEBUG: Error checking all invitations:`, error);
    }
  }
  
  /**
   * Test the subscription with the specific user from the example
   */
  static testSpecificUser(): void {
    const userId = '3btTalpeutXbynqJHfGISC9bD2Y2'; // User1 from the example
    console.log(`🔍 DEBUG: Testing invitation subscription for specific user: ${userId}`);
    
    this.debugInvitationSubscription(userId);
    
    // Also check all invitations for this user
    setTimeout(() => {
      this.checkAllInvitationsForUser(userId);
    }, 1000);
  }
  
  /**
   * Check FriendsContext integration
   */
  static debugFriendsContext(userId: string): () => void {
    console.log(`🔍 DEBUG: Checking FriendsContext integration for user: ${userId}`);
    
    // Check if user is authenticated
    console.log(`🔍 DEBUG: User authentication status:`, {
      userId,
      isAuthenticated: !!userId
    });
    
    // Test the same query that FriendsContext uses
    const q = query(
      collection(db, 'friendGameInvites'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );
    
    return onSnapshot(q, (snapshot) => {
      console.log(`🔍 DEBUG: FriendsContext query result:`, {
        userId,
        invitationCount: snapshot.size,
        invitations: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      });
    }, (error) => {
      console.error(`🔍 DEBUG: FriendsContext query error:`, error);
    });
  }
}
