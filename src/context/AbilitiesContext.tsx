'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AbilitiesService } from '@/services/abilitiesService';
import { useAuth } from './AuthContext';
import { 
  Ability, 
  UserAbility, 
  UserLoadout, 
  UserProgression,
  ABILITY_CATEGORIES
} from '@/types/abilities';
import { ALL_PREDEFINED_ABILITIES } from '@/data/predefinedAbilities';

interface AbilitiesContextType {
  // Core Data
  allAbilities: Ability[];
  userAbilities: UserAbility[];
  activeLoadout: UserLoadout | null;
  loadouts: UserLoadout[];
  progression: UserProgression | null;
  progressionSummary: any;
  
  // Loading States
  isLoading: boolean;
  isInitialized: boolean;
  
  // Ability Operations
  unlockAbility: (abilityId: string) => Promise<boolean>;
  useAbility: (abilityId: string, matchId: string, gameState: any) => Promise<any>;
  
  // Loadout Operations
  createLoadout: (name: string, abilities: UserLoadout['abilities']) => Promise<string>;
  updateLoadout: (loadoutId: string, updates: Partial<UserLoadout>) => Promise<boolean>;
  deleteLoadout: (loadoutId: string) => Promise<boolean>;
  setActiveLoadout: (loadoutId: string) => Promise<boolean>;
  validateLoadout: (abilities: UserLoadout['abilities']) => Promise<{ valid: boolean; error?: string; totalStarCost?: number; }>;
  
  // Progression Operations
  awardMatchXP: (xpAmount: number, isWin: boolean) => Promise<any>;
  
  // Utility Functions
  canAffordAbility: (abilityId: string) => boolean;
  getAbilityByCategory: (category: keyof typeof ABILITY_CATEGORIES) => Ability[];
  getUnlockedAbilitiesByCategory: (category: keyof typeof ABILITY_CATEGORIES) => UserAbility[];
  isAbilityUnlocked: (abilityId: string) => boolean;
  isAbilityEquipped: (abilityId: string) => boolean;
  getEquippedAbilityInCategory: (category: keyof typeof ABILITY_CATEGORIES) => string | null;
  
  // Match-specific utilities
  getMatchAbilities: (loadoutId?: string) => UserLoadout['abilities'] | null;
  canUseAbilityInMatch: (abilityId: string, auraAvailable: number) => { canUse: boolean; reason?: string; };
  
  // Refresh functions
  refreshData: () => Promise<void>;
  refreshLoadouts: () => Promise<void>;
  refreshProgression: () => Promise<void>;
}

const AbilitiesContext = createContext<AbilitiesContextType | undefined>(undefined);

export function AbilitiesProvider({ children }: { children: ReactNode }) {
  console.log('🚨 ABILITIES PROVIDER: STARTING TO RENDER!!!');
  
  const { user } = useAuth();
  
  // Core State
  const [allAbilities, setAllAbilities] = useState<Ability[]>([]);
  const [userAbilities, setUserAbilities] = useState<UserAbility[]>([]);
  const [activeLoadout, setActiveLoadoutState] = useState<UserLoadout | null>(null);
  const [loadouts, setLoadouts] = useState<UserLoadout[]>([]);
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [progressionSummary, setProgressionSummary] = useState<any>(null);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize data when user changes
  useEffect(() => {
    console.log('🔄 AbilitiesContext: useEffect triggered, user:', user ? 'authenticated' : 'guest');
    if (user) {
      initializeAbilitiesData();
    } else {
      // For guest users, provide read-only access to predefined abilities
      console.log('🔄 AbilitiesContext: Setting up guest mode with predefined abilities');
      setAllAbilities(ALL_PREDEFINED_ABILITIES);
      setProgressionSummary({
        currentLevel: 1,
        unlockedAbilities: 0,
        totalAbilities: ALL_PREDEFINED_ABILITIES.length,
        starPoints: 5,
        maxStarPoints: 15
      });
      setIsLoading(false);
      setIsInitialized(true);
      console.log('✅ AbilitiesContext: Guest mode initialized');
    }
  }, [user]);

  const resetState = () => {
    setAllAbilities([]);
    setUserAbilities([]);
    setActiveLoadoutState(null);
    setLoadouts([]);
    setProgression(null);
    setProgressionSummary(null);
    setIsLoading(false);
    setIsInitialized(false);
  };

  const initializeAbilitiesData = async () => {
    if (!user) return;
    
    console.log('🔄 AbilitiesContext: Starting initialization for user:', user.uid);
    setIsLoading(true);
    
    try {
      console.log('🔄 AbilitiesContext: Trying Firebase services...');
      // Try to load Firebase data with a simple timeout
      const abilities = await Promise.race([
        AbilitiesService.getAllAbilities(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]) as Ability[];
      
      console.log('✅ AbilitiesContext: Got abilities from Firebase:', abilities.length);
      
      // If we get here, Firebase is working, continue with full initialization
      const [
        userAbils,
        userLoadouts,
        userProgression,
        summary
      ] = await Promise.all([
        AbilitiesService.getUserAbilities(user.uid),
        AbilitiesService.getUserLoadouts(user.uid),
        AbilitiesService.getUserProgression(user.uid),
        AbilitiesService.getProgressionSummary(user.uid)
      ]);

      // If no abilities in database, use predefined ones for development  
      const finalAbilities = abilities && abilities.length > 0 ? abilities : ALL_PREDEFINED_ABILITIES;
      setAllAbilities(finalAbilities);
      
      // If no user abilities, create some mock ones for development
      if (userAbils.length === 0 && finalAbilities.length > 0) {
        const mockUserAbilities: UserAbility[] = [
          {
            id: 'user_ability_1',
            userId: user.uid,
            abilityId: finalAbilities[0]?.id || 'siphon',
            unlockedAt: new Date() as any,
            timesUsed: 5,
            successRate: 80,
            isEquipped: true,
            equippedSlot: 'attack'
          }
        ];
        setUserAbilities(mockUserAbilities);
      } else {
        setUserAbilities(userAbils);
      }
      
      // If no loadouts, create a mock one
      if (userLoadouts.length === 0) {
        const mockLoadout: UserLoadout = {
          id: 'loadout_1',
          userId: user.uid,
          name: 'Default Loadout',
          abilities: {
            attack: finalAbilities[0]?.id || 'siphon'
          },
          totalStarCost: 3,
          maxStarPoints: 5,
          isActive: true,
          createdAt: new Date() as any,
          lastUsed: new Date() as any
        };
        setLoadouts([mockLoadout]);
        setActiveLoadoutState(mockLoadout);
      } else {
        setLoadouts(userLoadouts);
        const active = userLoadouts.find((l: UserLoadout) => l.isActive);
        setActiveLoadoutState(active || null);
      }
      
      // Set progression or mock data
      if (!userProgression) {
        const mockProgression: UserProgression = {
          userId: user.uid,
          level: 1,
          xp: 150,
          xpToNextLevel: 350,
          totalWins: 3,
          totalMatches: 8,
          winStreak: 1,
          maxStarPoints: 5,
          unlockedAbilities: [finalAbilities[0]?.id || 'lucky_reroll', finalAbilities[1]?.id || 'focus_shot'],
          stats: {
            abilitiesUsed: 8,
            mostUsedAbility: finalAbilities[0]?.id || 'siphon',
            favoriteCategory: 'attack',
            averageMatchXP: 45
          },
          milestones: []
        };
        setProgression(mockProgression);
      } else {
        setProgression(userProgression);
      }
      
      // Set progression summary or mock data
      const finalSummary = summary || {
        currentLevel: 1,
        unlockedAbilities: 1,
        totalAbilities: finalAbilities.length,
        starPoints: 5,
        maxStarPoints: 15
      };
      setProgressionSummary(finalSummary);
      
      console.log('✅ AbilitiesContext: Initialization completed successfully');
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ AbilitiesContext: Error initializing abilities data:', error);
      console.log('🔄 AbilitiesContext: Falling back to predefined abilities');
      
      // Fallback to predefined abilities - this should always work
      setAllAbilities(ALL_PREDEFINED_ABILITIES);
      
      // Create mock user abilities 
      const mockUserAbilities: UserAbility[] = [
        {
          id: 'user_ability_1',
          userId: user.uid,
          abilityId: 'siphon',
          unlockedAt: new Date() as any,
          timesUsed: 0,
          successRate: 0,
          isEquipped: false,
          equippedSlot: undefined
        }
      ];
      setUserAbilities(mockUserAbilities);
      
      // Create mock loadout
      const mockLoadout: UserLoadout = {
        id: 'loadout_1',
        userId: user.uid,
        name: 'Default Loadout',
        abilities: {
          attack: 'siphon'
        },
        totalStarCost: 3,
        maxStarPoints: 15,
        isActive: true,
        createdAt: new Date() as any,
        lastUsed: new Date() as any
      };
      setLoadouts([mockLoadout]);
      setActiveLoadoutState(mockLoadout);
      
      setProgressionSummary({
        currentLevel: 1,
        unlockedAbilities: 1,
        totalAbilities: ALL_PREDEFINED_ABILITIES.length,
        starPoints: 5,
        maxStarPoints: 15
      });
      console.log('✅ AbilitiesContext: Fallback initialization completed');
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== ABILITY OPERATIONS ====================

  const unlockAbility = async (abilityId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const success = await AbilitiesService.unlockAbility(user.uid, abilityId);
      if (success) {
        await refreshData(); // Refresh to show new unlock
      }
      return success;
    } catch (error) {
      console.error('Error unlocking ability:', error);
      return false;
    }
  };

  const useAbility = async (abilityId: string, matchId: string, gameState: any) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    try {
      // This would typically be handled by a Cloud Function
      // For now, we'll simulate the validation
      const canUse = await AbilitiesService.canUseAbility(user.uid, abilityId, matchId);
      if (!canUse.allowed) {
        return { success: false, error: canUse.reason };
      }

      // Log the usage
      const ability = allAbilities.find(a => a.id === abilityId);
      if (ability) {
        await AbilitiesService.logAbilityUsage({
          matchId,
          userId: user.uid,
          abilityId,
          auraSpent: ability.auraCost,
          gameState,
          result: { success: true }
        });
        
        // Update ability stats
        await AbilitiesService.updateAbilityStats(user.uid, abilityId, true);
      }
      
      // Return proper effect data with abilityId
      return { 
        success: true, 
        effect: { 
          abilityId,
          type: ability?.effects[0]?.type || 'unknown',
          value: ability?.effects[0]?.value || 0,
          target: ability?.effects[0]?.target || 'self',
          condition: ability?.effects[0]?.condition || 'always'
        } 
      };
    } catch (error) {
      console.error('Error using ability:', error);
      return { success: false, error: 'Failed to use ability' };
    }
  };

  // ==================== LOADOUT OPERATIONS ====================

  const createLoadout = async (name: string, abilities: UserLoadout['abilities']): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    
    const loadout: Partial<UserLoadout> = {
      userId: user.uid,
      name,
      abilities,
      isActive: false
    };
    
    return await AbilitiesService.saveLoadout(loadout);
  };

  const updateLoadout = async (loadoutId: string, updates: Partial<UserLoadout>): Promise<boolean> => {
    try {
      await AbilitiesService.saveLoadout({ id: loadoutId, ...updates });
      await refreshLoadouts();
      return true;
    } catch (error) {
      console.error('Error updating loadout:', error);
      return false;
    }
  };

  const deleteLoadout = async (loadoutId: string): Promise<boolean> => {
    // Implementation would delete from Firestore
    // For now, we'll simulate
    console.log('Delete loadout:', loadoutId);
    return true;
  };

  const setActiveLoadout = async (loadoutId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const success = await AbilitiesService.setActiveLoadout(user.uid, loadoutId);
      if (success) {
        await refreshLoadouts();
      }
      return success;
    } catch (error) {
      console.error('Error setting active loadout:', error);
      return false;
    }
  };

  const validateLoadout = async (abilities: UserLoadout['abilities']) => {
    if (!user) return { valid: false, error: 'Not authenticated' };
    
    const loadout: Partial<UserLoadout> = {
      userId: user.uid,
      abilities
    };
    
    return await AbilitiesService.validateLoadout(loadout);
  };

  // ==================== PROGRESSION OPERATIONS ====================

  const awardMatchXP = async (xpAmount: number, isWin: boolean) => {
    if (!user) return { leveledUp: false };
    
    const result = await AbilitiesService.awardXP(user.uid, xpAmount, isWin);
    if (result.leveledUp) {
      await refreshData(); // Refresh to show new unlocks
    }
    return result;
  };

  // ==================== UTILITY FUNCTIONS ====================

  const canAffordAbility = (abilityId: string): boolean => {
    if (!activeLoadout || !progression) return false;
    
    const ability = allAbilities.find(a => a.id === abilityId);
    if (!ability) return false;
    
    const currentCost = activeLoadout.totalStarCost || 0;
    const availablePoints = progression.maxStarPoints - currentCost;
    
    return ability.starCost <= availablePoints;
  };

  const getAbilityByCategory = (category: keyof typeof ABILITY_CATEGORIES): Ability[] => {
    return allAbilities.filter(ability => ability.category === category);
  };

  const getUnlockedAbilitiesByCategory = (category: keyof typeof ABILITY_CATEGORIES): UserAbility[] => {
    const userAbilityIds = userAbilities.map(ua => ua.abilityId);
    const categoryAbilities = allAbilities.filter(
      ability => ability.category === category && userAbilityIds.includes(ability.id)
    );
    
    return userAbilities.filter(ua => 
      categoryAbilities.some(ability => ability.id === ua.abilityId)
    );
  };

  const isAbilityUnlocked = (abilityId: string): boolean => {
    return userAbilities.some(ua => ua.abilityId === abilityId);
  };

  const isAbilityEquipped = (abilityId: string): boolean => {
    if (!activeLoadout) return false;
    return Object.values(activeLoadout.abilities).includes(abilityId);
  };

  const getEquippedAbilityInCategory = (category: keyof typeof ABILITY_CATEGORIES): string | null => {
    if (!activeLoadout) return null;
    return activeLoadout.abilities[category] || null;
  };

  const getMatchAbilities = (loadoutId?: string): UserLoadout['abilities'] | null => {
    const targetLoadout = loadoutId 
      ? loadouts.find(l => l.id === loadoutId)
      : activeLoadout;
    
    return targetLoadout?.abilities || null;
  };

  const canUseAbilityInMatch = (abilityId: string, auraAvailable: number): { canUse: boolean; reason?: string; } => {
    const ability = allAbilities.find(a => a.id === abilityId);
    if (!ability) return { canUse: false, reason: 'Ability not found' };
    
    if (!isAbilityUnlocked(abilityId)) {
      return { canUse: false, reason: 'Ability not unlocked' };
    }
    
    if (!isAbilityEquipped(abilityId)) {
      return { canUse: false, reason: 'Ability not equipped' };
    }
    
    if (auraAvailable < ability.auraCost) {
      return { canUse: false, reason: `Need ${ability.auraCost} aura (have ${auraAvailable})` };
    }
    
    return { canUse: true };
  };

  // ==================== REFRESH FUNCTIONS ====================

  const refreshData = async () => {
    if (user) {
      await initializeAbilitiesData();
    }
  };

  const refreshLoadouts = async () => {
    if (!user) return;
    
    try {
      const userLoadouts = await AbilitiesService.getUserLoadouts(user.uid);
      setLoadouts(userLoadouts);
      
      const active = userLoadouts.find(l => l.isActive);
      setActiveLoadoutState(active || null);
    } catch (error) {
      console.error('Error refreshing loadouts:', error);
    }
  };

  const refreshProgression = async () => {
    if (!user) return;
    
    try {
      const [userProgression, summary] = await Promise.all([
        AbilitiesService.getUserProgression(user.uid),
        AbilitiesService.getProgressionSummary(user.uid)
      ]);
      
      setProgression(userProgression);
      setProgressionSummary(summary);
    } catch (error) {
      console.error('Error refreshing progression:', error);
    }
  };

  const value: AbilitiesContextType = {
    // Core Data
    allAbilities,
    userAbilities,
    activeLoadout,
    loadouts,
    progression,
    progressionSummary,
    
    // Loading States
    isLoading,
    isInitialized,
    
    // Ability Operations
    unlockAbility,
    useAbility,
    
    // Loadout Operations
    createLoadout,
    updateLoadout,
    deleteLoadout,
    setActiveLoadout,
    validateLoadout,
    
    // Progression Operations
    awardMatchXP,
    
    // Utility Functions
    canAffordAbility,
    getAbilityByCategory,
    getUnlockedAbilitiesByCategory,
    isAbilityUnlocked,
    isAbilityEquipped,
    getEquippedAbilityInCategory,
    
    // Match-specific utilities
    getMatchAbilities,
    canUseAbilityInMatch,
    
    // Refresh functions
    refreshData,
    refreshLoadouts,
    refreshProgression
  };

  return (
    <AbilitiesContext.Provider value={value}>
      {children}
    </AbilitiesContext.Provider>
  );
}

export function useAbilities() {
  const context = useContext(AbilitiesContext);
  if (context === undefined) {
    throw new Error('useAbilities must be used within an AbilitiesProvider');
  }
  return context;
}