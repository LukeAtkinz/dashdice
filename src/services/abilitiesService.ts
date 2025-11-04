import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Ability, 
  UserAbility, 
  UserLoadout, 
  UserProgression, 
  MatchAbilityUsage,
  AURA_RATES,
  STAR_POINT_PROGRESSION,
  XP_PROGRESSION
} from '@/types/abilities';
import { ALL_PREDEFINED_ABILITIES } from '@/data/predefinedAbilities';
import { ALL_ABILITIES } from '@/constants/abilities'; // Import our new comprehensive abilities
import { STARTER_ABILITIES } from '@/constants/abilities';

/**
 * Core Abilities Service
 * Handles all ability-related operations including loadouts, progression, and in-match usage
 */
export class AbilitiesService {
  // ==================== ABILITY MANAGEMENT ====================
  
  /**
   * Get all available abilities from Firestore
   */
  static async getAllAbilities(): Promise<Ability[]> {
    try {
      const q = query(
        collection(db, 'abilities'),
        where('isActive', '==', true),
        orderBy('unlockLevel', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ability[];
    } catch (error) {
      console.error('Error getting abilities:', error);
      return [];
    }
  }

  /**
   * Get a specific ability by ID
   */
  static async getAbility(abilityId: string): Promise<Ability | null> {
    try {
      const docRef = doc(db, 'abilities', abilityId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Ability;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting ability:', error);
      return null;
    }
  }

  /**
   * Convert DashDiceAbility to simpler Ability format for Firebase
   */
  static convertDashDiceToSimpleAbility(dashDiceAbility: any): Ability {
    return {
      id: dashDiceAbility.id,
      name: dashDiceAbility.name,
      description: dashDiceAbility.description,
      longDescription: dashDiceAbility.longDescription,
      rarity: dashDiceAbility.rarity,
      starCost: dashDiceAbility.starCost,
      category: dashDiceAbility.category,
      cooldown: dashDiceAbility.cooldown,
      maxUses: -1, // Unlimited uses with cooldown
      auraCost: dashDiceAbility.auraCost,
      hidden: false,
      unlockLevel: dashDiceAbility.unlockRequirements?.level || 1,
      timing: dashDiceAbility.timing?.usableWhen?.[0]?.includes('opponent') ? 'opponent_turn' : 'own_turn',
      iconUrl: dashDiceAbility.iconUrl,
      effects: dashDiceAbility.effects?.map((effect: any) => ({
        type: effect.type,
        value: effect.magnitude === 'instant_with_banking' ? 100 : 50,
        target: effect.target?.type || 'self',
        condition: effect.description || 'always'
      })) || [],
      isActive: dashDiceAbility.isActive
    };
  }

  /**
   * Initialize predefined abilities in Firestore (run once)
   */
  static async initializePredefinedAbilities(): Promise<void> {
    try {
      // Seed old predefined abilities (Luck Turner compatible format)
      for (const ability of ALL_PREDEFINED_ABILITIES) {
        await setDoc(doc(db, 'abilities', ability.id), ability);
      }
      
      // Seed new comprehensive abilities (Pan Slap, etc.)
      for (const dashDiceAbility of ALL_ABILITIES) {
        // Skip if already added from predefined (avoid duplicate Luck Turner)
        if (!ALL_PREDEFINED_ABILITIES.some(existing => existing.id === dashDiceAbility.id)) {
          const convertedAbility = this.convertDashDiceToSimpleAbility(dashDiceAbility);
          await setDoc(doc(db, 'abilities', convertedAbility.id), convertedAbility);
          console.log(`✅ Seeded new ability: ${convertedAbility.name}`);
        }
      }
      
      console.log('All abilities initialized successfully');
    } catch (error) {
      console.error('Error initializing predefined abilities:', error);
    }
  }

  /**
   * Force refresh all abilities in Firebase (includes new abilities like Pan Slap)
   */
  static async refreshAllAbilities(): Promise<void> {
    try {
      console.log('🔄 Refreshing all abilities in Firebase...');
      
      // Get existing abilities to avoid duplicating
      const existingAbilities = await this.getAllAbilities();
      const existingIds = existingAbilities.map(a => a.id);
      
      let addedCount = 0;
      let updatedCount = 0;
      
      // Add/update old predefined abilities
      for (const ability of ALL_PREDEFINED_ABILITIES) {
        await setDoc(doc(db, 'abilities', ability.id), ability);
        if (existingIds.includes(ability.id)) {
          updatedCount++;
        } else {
          addedCount++;
        }
      }
      
      // Add/update new comprehensive abilities (Pan Slap, etc.)
      for (const dashDiceAbility of ALL_ABILITIES) {
        const convertedAbility = this.convertDashDiceToSimpleAbility(dashDiceAbility);
        await setDoc(doc(db, 'abilities', convertedAbility.id), convertedAbility);
        
        if (existingIds.includes(convertedAbility.id)) {
          updatedCount++;
          console.log(`🔄 Updated ability: ${convertedAbility.name}`);
        } else {
          addedCount++;
          console.log(`✅ Added new ability: ${convertedAbility.name}`);
        }
      }
      
      console.log(`🎉 Abilities refresh complete! Added: ${addedCount}, Updated: ${updatedCount}`);
    } catch (error) {
      console.error('❌ Error refreshing abilities:', error);
      throw error;
    }
  }

  // ==================== USER ABILITIES ====================

  /**
   * Get user's unlocked abilities
   */
  static async getUserAbilities(userId: string): Promise<UserAbility[]> {
    try {
      const q = query(
        collection(db, 'userAbilities'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserAbility[];
    } catch (error) {
      console.error('Error getting user abilities:', error);
      return [];
    }
  }

  /**
   * Get a specific user ability
   */
  static async getUserAbility(userId: string, abilityId: string): Promise<UserAbility | null> {
    try {
      const q = query(
        collection(db, 'userAbilities'),
        where('userId', '==', userId),
        where('abilityId', '==', abilityId)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as UserAbility;
    } catch (error) {
      console.error('Error getting user ability:', error);
      return null;
    }
  }

  /**
   * Unlock ability for user
   */
  static async unlockAbility(userId: string, abilityId: string): Promise<boolean> {
    try {
      // Check if already unlocked
      const existing = await this.getUserAbility(userId, abilityId);
      if (existing) return true;

      await addDoc(collection(db, 'userAbilities'), {
        userId,
        abilityId,
        unlockedAt: serverTimestamp(),
        timesUsed: 0,
        successRate: 0,
        isEquipped: false
      });

      // Update progression
      await this.addUnlockedAbility(userId, abilityId);

      return true;
    } catch (error) {
      console.error('Error unlocking ability:', error);
      return false;
    }
  }

  /**
   * Update ability usage statistics
   */
  static async updateAbilityStats(
    userId: string, 
    abilityId: string, 
    success: boolean
  ): Promise<void> {
    try {
      const userAbility = await this.getUserAbility(userId, abilityId);
      if (!userAbility) return;

      const newTimesUsed = userAbility.timesUsed + 1;
      const successCount = Math.floor(userAbility.successRate * userAbility.timesUsed / 100) + (success ? 1 : 0);
      const newSuccessRate = Math.round((successCount / newTimesUsed) * 100);

      await updateDoc(doc(db, 'userAbilities', userAbility.id), {
        timesUsed: newTimesUsed,
        successRate: newSuccessRate
      });
    } catch (error) {
      console.error('Error updating ability stats:', error);
    }
  }

  // ==================== LOADOUT MANAGEMENT ====================

  /**
   * Get user's loadouts
   */
  static async getUserLoadouts(userId: string): Promise<UserLoadout[]> {
    try {
      const q = query(
        collection(db, 'userLoadouts'),
        where('userId', '==', userId),
        orderBy('lastUsed', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserLoadout[];
    } catch (error) {
      console.error('Error getting user loadouts:', error);
      return [];
    }
  }

  /**
   * Get user's active loadout
   */
  static async getActiveLoadout(userId: string): Promise<UserLoadout | null> {
    try {
      const q = query(
        collection(db, 'userLoadouts'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as UserLoadout;
    } catch (error) {
      console.error('Error getting active loadout:', error);
      return null;
    }
  }

  /**
   * Save/update loadout with validation
   */
  static async saveLoadout(loadout: Partial<UserLoadout>): Promise<string> {
    try {
      // Validate loadout constraints
      const validation = await this.validateLoadout(loadout);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const loadoutData: any = {
        ...loadout,
        totalStarCost: validation.totalStarCost!,
        maxStarPoints: validation.maxStarPoints!,
        lastUsed: serverTimestamp()
      };

      if (loadout.id) {
        // Update existing loadout
        await updateDoc(doc(db, 'userLoadouts', loadout.id), loadoutData);
        return loadout.id;
      } else {
        // Create new loadout
        const docRef = await addDoc(collection(db, 'userLoadouts'), {
          ...loadoutData,
          createdAt: serverTimestamp()
        });
        return docRef.id;
      }
    } catch (error) {
      console.error('Error saving loadout:', error);
      throw error;
    }
  }

  /**
   * Set active loadout (deactivate others first)
   */
  static async setActiveLoadout(userId: string, loadoutId: string): Promise<boolean> {
    try {
      return await runTransaction(db, async (transaction) => {
        // Get all user loadouts
        const q = query(
          collection(db, 'userLoadouts'),
          where('userId', '==', userId)
        );
        
        const snapshot = await getDocs(q);
        
        // Deactivate all loadouts
        snapshot.docs.forEach(doc => {
          transaction.update(doc.ref, { isActive: false });
        });
        
        // Activate the selected loadout
        const targetLoadout = snapshot.docs.find(doc => doc.id === loadoutId);
        if (targetLoadout) {
          transaction.update(targetLoadout.ref, { isActive: true });
          return true;
        }
        
        return false;
      });
    } catch (error) {
      console.error('Error setting active loadout:', error);
      return false;
    }
  }

  /**
   * Validate loadout constraints
   */
  static async validateLoadout(loadout: Partial<UserLoadout>): Promise<{
    valid: boolean;
    error?: string;
    totalStarCost?: number;
    maxStarPoints?: number;
  }> {
    try {
      if (!loadout.userId || !loadout.abilities) {
        return { valid: false, error: 'Missing required fields' };
      }

      // Get user progression to check star points
      const progression = await this.getUserProgression(loadout.userId);
      const maxStarPoints = STAR_POINT_PROGRESSION.calculateStarPoints(progression.level);

      // Calculate total star cost
      const abilityIds = Object.values(loadout.abilities).filter(Boolean) as string[];
      let totalStarCost = 0;

      for (const abilityId of abilityIds) {
        const ability = await this.getAbility(abilityId);
        if (!ability) {
          return { valid: false, error: `Invalid ability: ${abilityId}` };
        }
        
        // Check if user has unlocked this ability
        const userAbility = await this.getUserAbility(loadout.userId, abilityId);
        if (!userAbility) {
          return { valid: false, error: `Ability not unlocked: ${ability.name}` };
        }

        totalStarCost += ability.starCost;
      }

      // Check star cost limit
      if (totalStarCost > maxStarPoints) {
        return { 
          valid: false, 
          error: `Loadout exceeds star point limit (${totalStarCost}/${maxStarPoints})` 
        };
      }

      // Check category constraints (one per category)
      const categories = Object.keys(loadout.abilities);
      const abilityCategories = await Promise.all(
        abilityIds.map(async id => {
          const ability = await this.getAbility(id);
          return ability?.category;
        })
      );

      const uniqueCategories = new Set(abilityCategories.filter(Boolean));
      if (uniqueCategories.size !== abilityIds.length) {
        return { valid: false, error: 'Multiple abilities in same category not allowed' };
      }

      return { 
        valid: true, 
        totalStarCost, 
        maxStarPoints 
      };
    } catch (error) {
      console.error('Error validating loadout:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  // ==================== PROGRESSION MANAGEMENT ====================

  /**
   * Get user progression
   */
  static async getUserProgression(userId: string): Promise<UserProgression> {
    try {
      const docRef = doc(db, 'userProgression', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as UserProgression;
      }
      
      // Initialize progression if it doesn't exist
      const initialProgression: UserProgression = {
        userId,
        level: 1,
        xp: 0,
        xpToNextLevel: XP_PROGRESSION.calculateXPForLevel(2),
        totalWins: 0,
        totalMatches: 0,
        winStreak: 0,
        maxStarPoints: STAR_POINT_PROGRESSION.BASE_POINTS,
        unlockedAbilities: [],
        stats: {
          abilitiesUsed: 0,
          mostUsedAbility: '',
          favoriteCategory: '',
          averageMatchXP: 0
        },
        milestones: []
      };

      await setDoc(docRef, initialProgression);
      
      // Unlock starter abilities
      for (const ability of STARTER_ABILITIES) {
        await this.unlockAbility(userId, ability.id);
      }

      return initialProgression;
    } catch (error) {
      console.error('Error getting user progression:', error);
      throw error;
    }
  }

  /**
   * Award XP and check for level up
   */
  static async awardXP(
    userId: string, 
    xpAmount: number, 
    isWin: boolean = false
  ): Promise<{
    leveledUp: boolean;
    newLevel?: number;
    unlockedAbilities?: string[];
  }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const progressionRef = doc(db, 'userProgression', userId);
        const progressionDoc = await transaction.get(progressionRef);
        
        if (!progressionDoc.exists()) {
          throw new Error('User progression not found');
        }

        const progression = progressionDoc.data() as UserProgression;
        const newXP = progression.xp + xpAmount;
        const newWins = isWin ? progression.totalWins + 1 : progression.totalWins;
        const newMatches = progression.totalMatches + 1;
        
        // Calculate new level (every 5 wins or based on XP thresholds)
        const newLevel = Math.max(
          Math.floor(newWins / 5) + 1,
          Math.floor(newXP / 500) + 1
        );
        const leveledUp = newLevel > progression.level;
        
        const updates: Partial<UserProgression> = {
          xp: newXP,
          level: newLevel,
          totalWins: newWins,
          totalMatches: newMatches,
          maxStarPoints: STAR_POINT_PROGRESSION.calculateStarPoints(newLevel),
          xpToNextLevel: XP_PROGRESSION.calculateXPForLevel(newLevel + 1) - newXP
        };

        if (isWin) {
          updates.winStreak = progression.winStreak + 1;
        }

        // Update stats
        const newAverageXP = (progression.stats.averageMatchXP * progression.totalMatches + xpAmount) / newMatches;
        updates.stats = {
          ...progression.stats,
          averageMatchXP: Math.round(newAverageXP)
        };

        transaction.update(progressionRef, updates);

        let unlockedAbilities: string[] = [];
        if (leveledUp) {
          unlockedAbilities = await this.unlockAbilitiesForLevel(userId, newLevel);
        }

        return { leveledUp, newLevel: leveledUp ? newLevel : undefined, unlockedAbilities };
      });
    } catch (error) {
      console.error('Error awarding XP:', error);
      return { leveledUp: false };
    }
  }

  /**
   * Add unlocked ability to progression
   */
  static async addUnlockedAbility(userId: string, abilityId: string): Promise<void> {
    try {
      const progressionRef = doc(db, 'userProgression', userId);
      const progressionDoc = await getDoc(progressionRef);
      
      if (progressionDoc.exists()) {
        const progression = progressionDoc.data() as UserProgression;
        if (!progression.unlockedAbilities.includes(abilityId)) {
          await updateDoc(progressionRef, {
            unlockedAbilities: [...progression.unlockedAbilities, abilityId]
          });
        }
      }
    } catch (error) {
      console.error('Error adding unlocked ability:', error);
    }
  }

  /**
   * Unlock abilities for a specific level
   */
  static async unlockAbilitiesForLevel(userId: string, level: number): Promise<string[]> {
    try {
      const allAbilities = await this.getAllAbilities();
      const levelAbilities = allAbilities
        .filter(ability => ability.unlockLevel === level)
        .slice(0, 2); // Max 2 abilities per level

      const unlockedIds: string[] = [];
      for (const ability of levelAbilities) {
        const success = await this.unlockAbility(userId, ability.id);
        if (success) {
          unlockedIds.push(ability.id);
        }
      }

      return unlockedIds;
    } catch (error) {
      console.error('Error unlocking abilities for level:', error);
      return [];
    }
  }

  // ==================== MATCH INTEGRATION ====================

  /**
   * Check if user can use an ability in a match
   */
  static async canUseAbility(
    userId: string,
    abilityId: string,
    matchId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get ability details
      const ability = await this.getAbility(abilityId);
      if (!ability) {
        return { allowed: false, reason: 'Ability not found' };
      }

      // Check if user has ability unlocked
      const userAbility = await this.getUserAbility(userId, abilityId);
      if (!userAbility) {
        return { allowed: false, reason: 'Ability not unlocked' };
      }

      // Check if ability is equipped in active loadout
      // Temporarily bypass loadout check for siphon to test functionality
      if (abilityId === 'siphon') {
        return { allowed: true };
      }
      
      const activeLoadout = await this.getActiveLoadout(userId);
      if (!activeLoadout) {
        return { allowed: false, reason: 'No active loadout' };
      }

      const equippedAbilities = Object.values(activeLoadout.abilities);
      if (!equippedAbilities.includes(abilityId)) {
        return { allowed: false, reason: 'Ability not equipped' };
      }

      // Additional checks would be done in match context:
      // - Aura availability
      // - Cooldown status
      // - Max uses per match
      // These are handled in the match service/cloud function

      return { allowed: true };
    } catch (error) {
      console.error('Error checking ability usage:', error);
      return { allowed: false, reason: 'Validation failed' };
    }
  }

  /**
   * Log ability usage for analytics
   */
  static async logAbilityUsage(usage: Omit<MatchAbilityUsage, 'id' | 'usedAt'>): Promise<void> {
    try {
      await addDoc(collection(db, 'matchAbilityUsage'), {
        ...usage,
        usedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging ability usage:', error);
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Calculate aura gain for match events
   */
  static calculateAuraGain(eventType: 'ROLL' | 'BANK' | 'DOUBLE' | 'SNAKE_EYES' | 'OPPONENT_BUST' | 'BUST', value?: number): number {
    switch (eventType) {
      case 'ROLL':
        return AURA_RATES.ROLL;
      case 'BANK':
        return AURA_RATES.BANK;
      case 'DOUBLE':
        return AURA_RATES.DOUBLE;
      case 'SNAKE_EYES':
        return AURA_RATES.SNAKE_EYES;
      case 'OPPONENT_BUST':
        return AURA_RATES.OPPONENT_BUST;
      case 'BUST':
        return AURA_RATES.BUST;
      default:
        return value || 0;
    }
  }

  /**
   * Get progression summary for UI
   */
  static async getProgressionSummary(userId: string): Promise<{
    currentLevel: number;
    xpProgress: number;
    nextLevelXP: number;
    unlockedAbilities: number;
    totalAbilities: number;
    starPoints: number;
    maxStarPoints: number;
  }> {
    try {
      const progression = await this.getUserProgression(userId);
      const allAbilities = await this.getAllAbilities();
      const userAbilities = await this.getUserAbilities(userId);

      return {
        currentLevel: progression.level,
        xpProgress: progression.xp,
        nextLevelXP: progression.xpToNextLevel,
        unlockedAbilities: userAbilities.length,
        totalAbilities: allAbilities.length,
        starPoints: progression.maxStarPoints,
        maxStarPoints: STAR_POINT_PROGRESSION.MAX_POINTS
      };
    } catch (error) {
      console.error('Error getting progression summary:', error);
      return {
        currentLevel: 1,
        xpProgress: 0,
        nextLevelXP: 500,
        unlockedAbilities: 0,
        totalAbilities: 0,
        starPoints: 5,
        maxStarPoints: 15
      };
    }
  }
}