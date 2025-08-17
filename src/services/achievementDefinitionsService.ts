// Achievement Definitions Service
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { AchievementDefinition, AchievementCategory } from '@/types/achievements';

class AchievementDefinitionsService {
  private static instance: AchievementDefinitionsService;
  private cache: Map<string, AchievementDefinition> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private listeners: Set<Unsubscribe> = new Set();

  static getInstance(): AchievementDefinitionsService {
    if (!AchievementDefinitionsService.instance) {
      AchievementDefinitionsService.instance = new AchievementDefinitionsService();
    }
    return AchievementDefinitionsService.instance;
  }

  /**
   * Get all active achievement definitions
   */
  async getAllAchievements(forceRefresh = false): Promise<AchievementDefinition[]> {
    if (!forceRefresh && this.isCacheValid()) {
      return Array.from(this.cache.values());
    }

    try {
      const achievementsRef = collection(db, 'achievementDefinitions');
      const q = query(
        achievementsRef,
        where('isActive', '==', true),
        orderBy('category'),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(q);
      const achievements: AchievementDefinition[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as AchievementDefinition;
        data.id = doc.id;
        achievements.push(data);
        this.cache.set(doc.id, data);
      });

      this.lastCacheUpdate = Date.now();
      return achievements;
    } catch (error) {
      console.error('Error fetching achievement definitions:', error);
      throw error;
    }
  }

  /**
   * Get achievements by category
   */
  async getAchievementsByCategory(category: AchievementCategory): Promise<AchievementDefinition[]> {
    const allAchievements = await this.getAllAchievements();
    return allAchievements.filter(achievement => achievement.category === category);
  }

  /**
   * Get a specific achievement definition
   */
  async getAchievement(achievementId: string): Promise<AchievementDefinition | null> {
    // Check cache first
    if (this.cache.has(achievementId)) {
      return this.cache.get(achievementId)!;
    }

    try {
      const achievementRef = doc(db, 'achievementDefinitions', achievementId);
      const achievementDoc = await getDoc(achievementRef);

      if (achievementDoc.exists()) {
        const data = achievementDoc.data() as AchievementDefinition;
        data.id = achievementDoc.id;
        this.cache.set(achievementId, data);
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching achievement:', error);
      throw error;
    }
  }

  /**
   * Get achievements that should be visible to user (not hidden unless completed)
   */
  async getVisibleAchievements(completedAchievementIds: string[] = []): Promise<AchievementDefinition[]> {
    const allAchievements = await this.getAllAchievements();
    
    return allAchievements.filter(achievement => 
      !achievement.isHidden || completedAchievementIds.includes(achievement.id)
    );
  }

  /**
   * Get achievements by difficulty
   */
  async getAchievementsByDifficulty(difficulty: string): Promise<AchievementDefinition[]> {
    const allAchievements = await this.getAllAchievements();
    return allAchievements.filter(achievement => achievement.difficulty === difficulty);
  }

  /**
   * Get achievements in a series
   */
  async getAchievementSeries(seriesName: string): Promise<AchievementDefinition[]> {
    const allAchievements = await this.getAllAchievements();
    return allAchievements
      .filter(achievement => achievement.series === seriesName)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Search achievements by name or description
   */
  async searchAchievements(searchTerm: string): Promise<AchievementDefinition[]> {
    const allAchievements = await this.getAllAchievements();
    const term = searchTerm.toLowerCase();
    
    return allAchievements.filter(achievement => 
      achievement.name.toLowerCase().includes(term) ||
      achievement.description.toLowerCase().includes(term)
    );
  }

  /**
   * Set up real-time listener for achievement definitions
   */
  subscribeToAchievements(callback: (achievements: AchievementDefinition[]) => void): Unsubscribe {
    const achievementsRef = collection(db, 'achievementDefinitions');
    const q = query(
      achievementsRef,
      where('isActive', '==', true),
      orderBy('category'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const achievements: AchievementDefinition[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as AchievementDefinition;
        data.id = doc.id;
        achievements.push(data);
        this.cache.set(doc.id, data);
      });

      this.lastCacheUpdate = Date.now();
      callback(achievements);
    }, (error) => {
      console.error('Error in achievements subscription:', error);
    });

    this.listeners.add(unsubscribe);
    return unsubscribe;
  }

  /**
   * Admin functions (would be restricted to admin users)
   */
  async createAchievement(achievement: Omit<AchievementDefinition, 'id'>): Promise<string> {
    try {
      const achievementsRef = collection(db, 'achievementDefinitions');
      const docRef = await addDoc(achievementsRef, {
        ...achievement,
        releaseDate: achievement.releaseDate || Timestamp.now()
      });
      
      // Invalidate cache
      this.invalidateCache();
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating achievement:', error);
      throw error;
    }
  }

  async updateAchievement(achievementId: string, updates: Partial<AchievementDefinition>): Promise<void> {
    try {
      const achievementRef = doc(db, 'achievementDefinitions', achievementId);
      await updateDoc(achievementRef, updates);
      
      // Update cache
      if (this.cache.has(achievementId)) {
        const current = this.cache.get(achievementId)!;
        this.cache.set(achievementId, { ...current, ...updates });
      }
    } catch (error) {
      console.error('Error updating achievement:', error);
      throw error;
    }
  }

  async deleteAchievement(achievementId: string): Promise<void> {
    try {
      const achievementRef = doc(db, 'achievementDefinitions', achievementId);
      await deleteDoc(achievementRef);
      
      // Remove from cache
      this.cache.delete(achievementId);
    } catch (error) {
      console.error('Error deleting achievement:', error);
      throw error;
    }
  }

  /**
   * Cache management
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.CACHE_DURATION && this.cache.size > 0;
  }

  invalidateCache(): void {
    this.cache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.invalidateCache();
  }

  /**
   * Get predefined sample achievements for initial setup
   */
  static getSampleAchievements(): Omit<AchievementDefinition, 'id'>[] {
    return [
      {
        name: 'First Victory',
        description: 'Win your first game',
        category: 'gameplay',
        type: 'milestone',
        difficulty: 'common',
        requirements: {
          metric: 'games_won',
          operator: 'greater_than_equal',
          value: 1
        },
        rewards: {
          points: 100,
          title: 'Victor',
          currency: 50
        },
        icon: '/achievements/first_win.png',
        rarity_color: '#9CA3AF',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now()
      },
      {
        name: 'Snake Eyes Master',
        description: 'Roll 100 ones',
        category: 'gameplay',
        type: 'counter',
        difficulty: 'rare',
        requirements: {
          metric: 'dice_ones_rolled',
          operator: 'greater_than_equal',
          value: 100
        },
        rewards: {
          points: 500,
          badge: 'snake_eyes_badge',
          cosmetics: ['dice_skin_silver']
        },
        icon: '/achievements/hundred_ones.png',
        rarity_color: '#3B82F6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now()
      },
      {
        name: 'Unstoppable',
        description: 'Win 10 games in a row',
        category: 'gameplay',
        type: 'streak',
        difficulty: 'epic',
        requirements: {
          metric: 'win_streak',
          operator: 'streak',
          value: 10
        },
        rewards: {
          points: 1000,
          title: 'Unstoppable',
          specialPrivileges: ['streak_badge_display']
        },
        icon: '/achievements/win_streak_10.png',
        rarity_color: '#8B5CF6',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now()
      },
      {
        name: 'Social Butterfly',
        description: 'Add 10 friends',
        category: 'social',
        type: 'counter',
        difficulty: 'common',
        requirements: {
          metric: 'friends_added',
          operator: 'greater_than_equal',
          value: 10
        },
        rewards: {
          points: 300,
          currency: 100
        },
        icon: '/achievements/social_butterfly.png',
        rarity_color: '#9CA3AF',
        isActive: true,
        isHidden: false,
        releaseDate: Timestamp.now()
      },
      {
        name: 'Perfect Combination',
        description: 'Roll 50 ones AND 50 sixes',
        category: 'gameplay',
        type: 'conditional',
        difficulty: 'legendary',
        requirements: {
          metric: 'custom',
          operator: 'custom',
          value: 1,
          conditions: {
            type: 'multiple_dice_milestone',
            requirements: [
              { metric: 'dice_ones_rolled', value: 50 },
              { metric: 'dice_sixes_rolled', value: 50 }
            ]
          }
        },
        rewards: {
          points: 2000,
          title: 'Dice Master',
          cosmetics: ['dice_skin_gold', 'table_theme_royal']
        },
        icon: '/achievements/perfect_combo.png',
        rarity_color: '#F59E0B',
        isActive: true,
        isHidden: true,
        releaseDate: Timestamp.now()
      }
    ];
  }
}

export default AchievementDefinitionsService;
