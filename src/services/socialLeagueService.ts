import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  increment,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Service for managing Social League statistics and gameplay
 */
export class SocialLeagueService {
  /**
   * Check if Social League is currently active (6:00 PM - 6:15 PM)
   */
  static isLeagueActive(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Active from 18:00 to 18:15 (6:00 PM to 6:15 PM)
    return hour === 18 && minute < 15;
  }

  /**
   * Get time until next Social League window
   */
  static getTimeUntilNextLeague(): { hours: number; minutes: number; seconds: number } {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    const nextLeague = new Date();
    if (hour >= 18) {
      // Set to tomorrow at 6 PM
      nextLeague.setDate(nextLeague.getDate() + 1);
    }
    nextLeague.setHours(18, 0, 0, 0);
    
    const diffMs = nextLeague.getTime() - now.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    return { hours, minutes, seconds };
  }

  /**
   * Get today's date string for Firestore queries (YYYY-MM-DD)
   */
  static getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Record a Social League win for a player
   */
  static async recordWin(
    userId: string, 
    displayName: string, 
    equippedBackground?: string
  ): Promise<void> {
    if (!this.isLeagueActive()) {
      console.warn('Attempted to record Social League win outside active window');
      return;
    }

    const today = this.getTodayDateString();
    const statsRef = doc(db, 'socialLeagueStats', `${userId}_${today}`);

    try {
      // Check if document exists
      const statsDoc = await getDoc(statsRef);
      
      if (statsDoc.exists()) {
        // Update existing document
        await updateDoc(statsRef, {
          wins: increment(1),
          lastUpdated: serverTimestamp()
        });
      } else {
        // Create new document for today
        await setDoc(statsRef, {
          uid: userId,
          displayName,
          wins: 1,
          date: today,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          equippedBackground: equippedBackground || null
        });
      }

      console.log(`✅ Recorded Social League win for ${displayName} on ${today}`);
    } catch (error) {
      console.error('❌ Error recording Social League win:', error);
      throw error;
    }
  }

  /**
   * Get a player's Social League stats for today
   */
  static async getPlayerTodayStats(userId: string): Promise<{
    wins: number;
    date: string;
  } | null> {
    const today = this.getTodayDateString();
    const statsRef = doc(db, 'socialLeagueStats', `${userId}_${today}`);

    try {
      const statsDoc = await getDoc(statsRef);
      
      if (statsDoc.exists()) {
        const data = statsDoc.data();
        return {
          wins: data.wins || 0,
          date: today
        };
      }
      
      return { wins: 0, date: today };
    } catch (error) {
      console.error('❌ Error fetching Social League stats:', error);
      return null;
    }
  }

  /**
   * Check if two players are friends (for Social League eligibility)
   */
  static async areFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      const user1Doc = await getDoc(doc(db, 'users', userId1));
      const user1Data = user1Doc.data();
      
      if (!user1Data?.friends) return false;
      
      // Check if userId2 is in userId1's friends list
      return user1Data.friends.includes(userId2);
    } catch (error) {
      console.error('❌ Error checking friendship:', error);
      return false;
    }
  }

  /**
   * Validate Social League match eligibility
   */
  static async canPlaySocialLeague(
    userId1: string, 
    userId2: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    // Check if league is active
    if (!this.isLeagueActive()) {
      return { 
        eligible: false, 
        reason: 'Social League is only active from 6:00 PM - 6:15 PM daily' 
      };
    }

    // Check if players are friends
    const areFriends = await this.areFriends(userId1, userId2);
    if (!areFriends) {
      return { 
        eligible: false, 
        reason: 'Social League matches can only be played between friends' 
      };
    }

    return { eligible: true };
  }

  /**
   * Format time remaining for display
   */
  static formatTimeRemaining(time: { hours: number; minutes: number; seconds: number }): string {
    if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m`;
    }
    if (time.minutes > 0) {
      return `${time.minutes}:${time.seconds.toString().padStart(2, '0')}`;
    }
    return `${time.seconds}s`;
  }
}
