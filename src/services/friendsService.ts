// Friends Service for managing friend relationships
import { 
  collection, 
  doc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  or,
  and,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { 
  FriendRelationship, 
  FriendRequest, 
  FriendWithStatus, 
  User 
} from '@/types/friends';

export class FriendsService {
  // Generate unique 8-character friend code
  static generateFriendCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Check if friend code is unique
  static async isFriendCodeUnique(friendCode: string): Promise<boolean> {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('friendCode', '==', friendCode)
      );
      const snapshot = await getDocs(usersQuery);
      return snapshot.empty;
    } catch (error) {
      console.error('Error checking friend code uniqueness:', error);
      return false;
    }
  }

  // Generate unique friend code for user
  static async generateUniqueFriendCode(): Promise<string> {
    let friendCode: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      friendCode = this.generateFriendCode();
      isUnique = await this.isFriendCodeUnique(friendCode);
      attempts++;
    } while (!isUnique && attempts < maxAttempts);

    if (!isUnique) {
      throw new Error('Unable to generate unique friend code');
    }

    return friendCode;
  }

  // Find user by friend code
  static async findUserByFriendCode(friendCode: string): Promise<User | null> {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('friendCode', '==', friendCode.toUpperCase())
      );
      const snapshot = await getDocs(usersQuery);
      
      if (snapshot.empty) {
        return null;
      }

      const userDoc = snapshot.docs[0];
      return { uid: userDoc.id, ...userDoc.data() } as User;
    } catch (error) {
      console.error('Error finding user by friend code:', error);
      return null;
    }
  }

  // Send friend request
  static async sendFriendRequest(
    fromUserId: string, 
    friendCode: string, 
    message?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find user by friend code
      const targetUser = await this.findUserByFriendCode(friendCode);
      if (!targetUser) {
        return { success: false, error: 'User not found with that friend code' };
      }

      // Check if trying to add self
      if (targetUser.uid === fromUserId) {
        return { success: false, error: 'Cannot add yourself as a friend' };
      }

      // Check if already friends
      const existingFriendship = await this.getFriendship(fromUserId, targetUser.uid);
      if (existingFriendship) {
        if (existingFriendship.status === 'accepted') {
          return { success: false, error: 'Already friends with this user' };
        } else if (existingFriendship.status === 'pending') {
          return { success: false, error: 'Friend request already pending' };
        }
      }

      // Check if there's already a pending request from target user
      const reverseRequest = await this.getPendingRequestBetweenUsers(targetUser.uid, fromUserId);
      if (reverseRequest) {
        return { success: false, error: 'This user has already sent you a friend request' };
      }

      // Check user's privacy settings
      if (!targetUser.privacy?.allowFriendRequests) {
        return { success: false, error: 'This user is not accepting friend requests' };
      }

      // Create friend request
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Expire in 30 days

      await addDoc(collection(db, 'friendRequests'), {
        fromUserId,
        toUserId: targetUser.uid,
        status: 'pending',
        message: message || '',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: 'Failed to send friend request' };
    }
  }

  // Accept friend request
  static async acceptFriendRequest(requestId: string): Promise<boolean> {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        return false;
      }

      const request = requestDoc.data() as FriendRequest;
      
      // Update request status
      await updateDoc(requestRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // Create bidirectional friendship
      const friendshipData = {
        status: 'accepted',
        createdAt: serverTimestamp(),
        acceptedAt: serverTimestamp()
      };

      // User 1 -> User 2 friendship
      await addDoc(collection(db, 'friends'), {
        userId: request.fromUserId,
        friendId: request.toUserId,
        ...friendshipData
      });

      // User 2 -> User 1 friendship
      await addDoc(collection(db, 'friends'), {
        userId: request.toUserId,
        friendId: request.fromUserId,
        ...friendshipData
      });

      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  }

  // Decline friend request
  static async declineFriendRequest(requestId: string): Promise<boolean> {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(requestRef, {
        status: 'declined'
      });
      return true;
    } catch (error) {
      console.error('Error declining friend request:', error);
      return false;
    }
  }

  // Remove friend
  static async removeFriend(userId: string, friendId: string): Promise<boolean> {
    try {
      // Remove both directions of friendship
      const friendship1Query = query(
        collection(db, 'friends'),
        where('userId', '==', userId),
        where('friendId', '==', friendId)
      );
      
      const friendship2Query = query(
        collection(db, 'friends'),
        where('userId', '==', friendId),
        where('friendId', '==', userId)
      );

      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(friendship1Query),
        getDocs(friendship2Query)
      ]);

      const deletePromises: Promise<void>[] = [];
      
      snapshot1.docs.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      snapshot2.docs.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      return false;
    }
  }

  // Get user's friends with status
  static async getUserFriends(userId: string): Promise<FriendWithStatus[]> {
    try {
      const friendsQuery = query(
        collection(db, 'friends'),
        where('userId', '==', userId),
        where('status', '==', 'accepted')
      );
      
      const snapshot = await getDocs(friendsQuery);
      const friends: FriendWithStatus[] = [];

      for (const friendDoc of snapshot.docs) {
        const friendship = { id: friendDoc.id, ...friendDoc.data() } as FriendRelationship;
        
        // Get friend's user data
        const userDoc = await getDoc(doc(db, 'users', friendship.friendId));
        if (userDoc.exists()) {
          const friendData = { uid: userDoc.id, ...userDoc.data() } as User;
          friends.push({
            ...friendship,
            friendData
          });
        }
      }

      return friends;
    } catch (error) {
      console.error('Error getting user friends:', error);
      return [];
    }
  }

  // Get pending friend requests
  static async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    try {
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('toUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(requestsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FriendRequest[];
    } catch (error) {
      console.error('Error getting pending requests:', error);
      return [];
    }
  }

  // Subscribe to user's friends
  static subscribeToUserFriends(userId: string, callback: (friends: FriendWithStatus[]) => void): () => void {
    const friendsQuery = query(
      collection(db, 'friends'),
      where('userId', '==', userId),
      where('status', '==', 'accepted')
    );

    return onSnapshot(friendsQuery, async (snapshot) => {
      try {
        const friends: FriendWithStatus[] = [];

        for (const friendDoc of snapshot.docs) {
          const friendship = { id: friendDoc.id, ...friendDoc.data() } as FriendRelationship;
          
          // Get friend's user data
          const userDoc = await getDoc(doc(db, 'users', friendship.friendId));
          if (userDoc.exists()) {
            const friendData = { uid: userDoc.id, ...userDoc.data() } as User;
            friends.push({
              ...friendship,
              friendData
            });
          }
        }

        callback(friends);
      } catch (error) {
        console.error('Error in friends subscription:', error);
        callback([]);
      }
    });
  }

  // Subscribe to pending friend requests
  static subscribeToPendingRequests(userId: string, callback: (requests: FriendRequest[]) => void): () => void {
    const requestsQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(requestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FriendRequest[];
      callback(requests);
    });
  }

  // Helper: Get existing friendship
  private static async getFriendship(userId: string, friendId: string): Promise<FriendRelationship | null> {
    try {
      const friendshipQuery = query(
        collection(db, 'friends'),
        where('userId', '==', userId),
        where('friendId', '==', friendId)
      );
      
      const snapshot = await getDocs(friendshipQuery);
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as FriendRelationship;
    } catch (error) {
      console.error('Error getting friendship:', error);
      return null;
    }
  }

  // Helper: Get pending request between users
  private static async getPendingRequestBetweenUsers(fromUserId: string, toUserId: string): Promise<FriendRequest | null> {
    try {
      const requestQuery = query(
        collection(db, 'friendRequests'),
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', toUserId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(requestQuery);
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as FriendRequest;
    } catch (error) {
      console.error('Error getting pending request:', error);
      return null;
    }
  }

  // Clean up expired requests (utility function)
  static async cleanupExpiredRequests(): Promise<void> {
    try {
      const expiredQuery = query(
        collection(db, 'friendRequests'),
        where('status', '==', 'pending'),
        where('expiresAt', '<=', new Date())
      );

      const snapshot = await getDocs(expiredQuery);
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { status: 'expired' })
      );

      await Promise.all(updatePromises);
      console.log(`Cleaned up ${snapshot.docs.length} expired friend requests`);
    } catch (error) {
      console.error('Error cleaning up expired requests:', error);
    }
  }
}
