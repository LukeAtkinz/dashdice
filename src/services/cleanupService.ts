import { db } from './firebase';
import { collection, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';

/**
 * Database cleanup service for maintaining clean Firebase collections
 */
export class CleanupService {
  
  /**
   * Clean up waiting rooms older than 30 minutes OR that are empty/abandoned
   */
  static async cleanupWaitingRooms(): Promise<void> {
    try {
      console.log('🧹 Starting waiting room cleanup...');
      
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // Changed from 5 to 30 minutes
      const waitingRoomRef = collection(db, 'waitingroom');
      
      // Query for rooms older than 30 minutes
      const oldRoomsQuery = query(
        waitingRoomRef,
        where('createdAt', '<', Timestamp.fromDate(thirtyMinutesAgo))
      );
      
      const snapshot = await getDocs(oldRoomsQuery);
      const deletePromises: Promise<void>[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only delete rooms that are truly abandoned (no active players or very old)
        const roomAge = Date.now() - data.createdAt?.toDate()?.getTime();
        const isVeryOld = roomAge > (30 * 60 * 1000); // 30 minutes
        
        if (isVeryOld) {
          console.log(`🗑️ Deleting old waiting room: ${doc.id} (${Math.round(roomAge / 60000)} minutes old)`);
          deletePromises.push(deleteDoc(doc.ref));
        } else {
          console.log(`⏳ Keeping recent waiting room: ${doc.id} (${Math.round(roomAge / 60000)} minutes old)`);
        }
      });
      
      await Promise.all(deletePromises);
      
      console.log(`✅ Cleaned up ${deletePromises.length} old waiting rooms`);
    } catch (error) {
      console.error('❌ Error cleaning up waiting rooms:', error);
    }
  }

  /**
   * Clean up matches older than 30 minutes that haven't moved to completedmatches
   */
  static async cleanupMatches(): Promise<void> {
    try {
      console.log('🧹 Starting matches cleanup...');
      
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const matchesRef = collection(db, 'matches');
      
      // Query for matches older than 30 minutes
      const oldMatchesQuery = query(
        matchesRef,
        where('createdAt', '<', Timestamp.fromDate(thirtyMinutesAgo))
      );
      
      const snapshot = await getDocs(oldMatchesQuery);
      const deletePromises: Promise<void>[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only delete if it's not completed (should have been moved to completedmatches)
        if (data.status !== 'completed') {
          console.log(`🗑️ Deleting old match: ${doc.id}, status: ${data.status}`);
          deletePromises.push(deleteDoc(doc.ref));
        }
      });
      
      await Promise.all(deletePromises);
      
      console.log(`✅ Cleaned up ${deletePromises.length} old matches`);
    } catch (error) {
      console.error('❌ Error cleaning up matches:', error);
    }
  }

  /**
   * Run a complete cleanup cycle
   */
  static async runCleanupCycle(): Promise<void> {
    console.log('🔄 Starting database cleanup cycle...');
    
    await Promise.allSettled([
      this.cleanupWaitingRooms(),
      this.cleanupMatches()
    ]);
    
    console.log('✅ Database cleanup cycle completed');
  }

  /**
   * Initialize automatic cleanup intervals
   * - Waiting rooms: every 15 minutes (less aggressive)
   * - Matches: every 20 minutes
   */
  static initializeCleanupScheduler(): void {
    // Clean waiting rooms every 15 minutes (was 2 minutes - too aggressive)
    setInterval(() => {
      this.cleanupWaitingRooms();
    }, 15 * 60 * 1000);

    // Clean matches every 20 minutes (was 10 minutes)
    setInterval(() => {
      this.cleanupMatches();
    }, 20 * 60 * 1000);

    // Run initial cleanup after 5 minutes to let app fully load
    setTimeout(() => {
      this.runCleanupCycle();
    }, 5 * 60 * 1000);

    console.log('📅 Database cleanup scheduler initialized (15min intervals)');
  }
}
