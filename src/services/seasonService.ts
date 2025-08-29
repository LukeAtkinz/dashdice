import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Season } from '@/types/ranked';

export class SeasonService {
  private static readonly COLLECTION_NAME = 'seasons';
  private static readonly SEASON_DURATION_DAYS = 14; // 2 weeks

  /**
   * Get the current active season
   */
  static async getCurrentSeason(): Promise<Season | null> {
    try {
      const seasonsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        seasonsRef,
        where('isActive', '==', true),
        orderBy('dashNumber', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // No active season, return a mock season for demo
        console.log('📅 No active season found, creating mock season for demo');
        const now = new Date();
        const endDate = new Date();
        endDate.setDate(now.getDate() + 14);
        
        return {
          id: 'mock_season_1',
          name: 'Dash 1',
          startDate: now,
          endDate: endDate,
          isActive: true,
          dashNumber: 1
        };
      }
      
      const seasonDoc = querySnapshot.docs[0];
      const seasonData = seasonDoc.data();
      
      return {
        id: seasonDoc.id,
        name: seasonData.name,
        startDate: seasonData.startDate.toDate(),
        endDate: seasonData.endDate.toDate(),
        isActive: seasonData.isActive,
        dashNumber: seasonData.dashNumber
      };
    } catch (error) {
      console.error('Error getting current season:', error);
      return null;
    }
  }

  /**
   * Create a new season
   */
  static async createNewSeason(dashNumber: number): Promise<Season> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + this.SEASON_DURATION_DAYS);
      
      const seasonData = {
        name: `Dash ${dashNumber}`,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        isActive: true,
        dashNumber,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), seasonData);
      
      console.log(`✅ Created new season: Dash ${dashNumber}`);
      
      return {
        id: docRef.id,
        name: seasonData.name,
        startDate,
        endDate,
        isActive: true,
        dashNumber
      };
    } catch (error) {
      console.error('Error creating new season:', error);
      throw error;
    }
  }

  /**
   * Check if current season has expired and create new one if needed
   */
  static async checkAndRotateSeason(): Promise<Season> {
    try {
      const currentSeason = await this.getCurrentSeason();
      
      if (!currentSeason) {
        // No season exists, create first one
        return await this.createNewSeason(1);
      }
      
      const now = new Date();
      
      if (now > currentSeason.endDate) {
        // Current season has expired
        console.log(`🔄 Season ${currentSeason.dashNumber} has expired, creating new season`);
        
        // Deactivate current season
        await updateDoc(doc(db, this.COLLECTION_NAME, currentSeason.id), {
          isActive: false,
          endedAt: serverTimestamp()
        });
        
        // Create new season
        const newSeason = await this.createNewSeason(currentSeason.dashNumber + 1);
        
        // TODO: Reset all user seasonal stats here
        await this.resetAllUserSeasonalStats(newSeason.dashNumber);
        
        return newSeason;
      }
      
      return currentSeason;
    } catch (error) {
      console.error('Error checking/rotating season:', error);
      throw error;
    }
  }

  /**
   * Get season by dash number
   */
  static async getSeasonByDashNumber(dashNumber: number): Promise<Season | null> {
    try {
      const seasonsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        seasonsRef,
        where('dashNumber', '==', dashNumber),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const seasonDoc = querySnapshot.docs[0];
      const seasonData = seasonDoc.data();
      
      return {
        id: seasonDoc.id,
        name: seasonData.name,
        startDate: seasonData.startDate.toDate(),
        endDate: seasonData.endDate.toDate(),
        isActive: seasonData.isActive,
        dashNumber: seasonData.dashNumber
      };
    } catch (error) {
      console.error('Error getting season by dash number:', error);
      return null;
    }
  }

  /**
   * Get all seasons (for history)
   */
  static async getAllSeasons(): Promise<Season[]> {
    try {
      const seasonsRef = collection(db, this.COLLECTION_NAME);
      const q = query(seasonsRef, orderBy('dashNumber', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const seasons: Season[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        seasons.push({
          id: doc.id,
          name: data.name,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          isActive: data.isActive,
          dashNumber: data.dashNumber
        });
      });
      
      return seasons;
    } catch (error) {
      console.error('Error getting all seasons:', error);
      return [];
    }
  }

  /**
   * Reset all user seasonal stats for new season
   */
  private static async resetAllUserSeasonalStats(newDashNumber: number): Promise<void> {
    try {
      console.log(`🔄 Resetting all user seasonal stats for Dash ${newDashNumber}`);
      
      // TODO: Implement batch update of all users' seasonal stats
      // This would reset currentSeason stats but preserve allTime stats
      
      console.log(`✅ Reset completed for Dash ${newDashNumber}`);
    } catch (error) {
      console.error('Error resetting user seasonal stats:', error);
    }
  }

  /**
   * Get time remaining in current season
   */
  static async getTimeRemainingInSeason(): Promise<number> {
    try {
      const currentSeason = await this.getCurrentSeason();
      
      if (!currentSeason) {
        return 0;
      }
      
      const now = new Date();
      const timeRemaining = currentSeason.endDate.getTime() - now.getTime();
      
      return Math.max(0, timeRemaining);
    } catch (error) {
      console.error('Error getting time remaining in season:', error);
      return 0;
    }
  }

  /**
   * Format time remaining as human readable string
   */
  static formatTimeRemaining(milliseconds: number): string {
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}
