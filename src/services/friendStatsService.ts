import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/services/firebase';

export interface FriendStats {
  totalFriends: number;
  friendMatches: number;
  friendWins: number;
  friendLosses: number;
  friendWinRate: number;
}

export class FriendStatsService {
  /**
   * Get friend statistics for a user
   */
  static async getFriendStats(userId: string): Promise<FriendStats> {
    try {
      // Get total friends count
      const friendsQuery = query(
        collection(db, 'friends'),
        where('userId', '==', userId),
        where('status', '==', 'accepted')
      );
      const friendsSnapshot = await getDocs(friendsQuery);
      const totalFriends = friendsSnapshot.size;

      // Get friend match statistics from user document
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      const friendStats = userData?.friendStats || {};
      const friendMatches = friendStats.friendMatches || 0;
      const friendWins = friendStats.friendWins || 0;
      const friendLosses = friendStats.friendLosses || 0;
      
      const friendWinRate = friendMatches > 0 ? Math.round((friendWins / friendMatches) * 100) : 0;

      return {
        totalFriends,
        friendMatches,
        friendWins,
        friendLosses,
        friendWinRate
      };

    } catch (error) {
      console.error('Error getting friend stats:', error);
      return {
        totalFriends: 0,
        friendMatches: 0,
        friendWins: 0,
        friendLosses: 0,
        friendWinRate: 0
      };
    }
  }

  /**
   * Update friend match statistics when a friend match ends
   */
  static async updateFriendMatchStats(winnerId: string, loserId: string): Promise<void> {
    try {
      console.log('🤝 Updating friend match stats:', { winnerId, loserId });

      // Update winner stats
      const winnerRef = doc(db, 'users', winnerId);
      await updateDoc(winnerRef, {
        'friendStats.friendMatches': increment(1),
        'friendStats.friendWins': increment(1),
        'friendStats.lastFriendMatch': serverTimestamp()
      });

      // Update loser stats
      const loserRef = doc(db, 'users', loserId);
      await updateDoc(loserRef, {
        'friendStats.friendMatches': increment(1),
        'friendStats.friendLosses': increment(1),
        'friendStats.lastFriendMatch': serverTimestamp()
      });

      console.log('✅ Friend match stats updated successfully');

    } catch (error) {
      console.error('❌ Error updating friend match stats:', error);
    }
  }

  /**
   * Initialize friend stats for a new user
   */
  static async initializeFriendStats(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'friendStats.friendMatches': 0,
        'friendStats.friendWins': 0,
        'friendStats.friendLosses': 0,
        'friendStats.createdAt': serverTimestamp()
      });
    } catch (error) {
      console.error('Error initializing friend stats:', error);
    }
  }

  /**
   * Get friend leaderboard for a user's friends
   */
  static async getFriendLeaderboard(userId: string): Promise<Array<{
    uid: string;
    displayName: string;
    friendWins: number;
    friendMatches: number;
    friendWinRate: number;
  }>> {
    try {
      // Get user's friends
      const friendsQuery = query(
        collection(db, 'friends'),
        where('userId', '==', userId),
        where('status', '==', 'accepted')
      );
      const friendsSnapshot = await getDocs(friendsQuery);
      
      const leaderboard = [];
      
      for (const friendDoc of friendsSnapshot.docs) {
        const friendData = friendDoc.data();
        const friendId = friendData.friendId;
        
        // Get friend's stats
        const friendUserRef = doc(db, 'users', friendId);
        const friendUserDoc = await getDoc(friendUserRef);
        const friendUserData = friendUserDoc.data();
        
        if (friendUserData) {
          const friendStats = friendUserData.friendStats || {};
          const friendMatches = friendStats.friendMatches || 0;
          const friendWins = friendStats.friendWins || 0;
          const friendWinRate = friendMatches > 0 ? Math.round((friendWins / friendMatches) * 100) : 0;
          
          leaderboard.push({
            uid: friendId,
            displayName: friendUserData.displayName || 'Unknown',
            friendWins,
            friendMatches,
            friendWinRate
          });
        }
      }

      // Sort by win rate, then by total wins
      return leaderboard.sort((a, b) => {
        if (a.friendWinRate !== b.friendWinRate) {
          return b.friendWinRate - a.friendWinRate;
        }
        return b.friendWins - a.friendWins;
      });

    } catch (error) {
      console.error('Error getting friend leaderboard:', error);
      return [];
    }
  }
}
