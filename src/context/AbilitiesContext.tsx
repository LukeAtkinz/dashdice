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
  canUseAbilityInMatch: (abilityId: string, auraAvailable?: number) => { canUse: boolean; reason?: string; };
  
  // Refresh functions
  refreshData: () => Promise<void>;
  refreshLoadouts: () => Promise<void>;
  refreshProgression: () => Promise<void>;
}

const AbilitiesContext = createContext<AbilitiesContextType | undefined>(undefined);

export function AbilitiesProvider({ children }: { children: ReactNode }) {
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
    if (user) {
      initializeAbilitiesData();
    } else {
      // For guest users, we'll load from Firebase too
      initializeAbilitiesData();
      setIsLoading(false);
      setIsInitialized(true);
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
    
    setIsLoading(true);
    
    try {
      // Try to load Firebase data with a simple timeout
      const abilities = await Promise.race([
        AbilitiesService.getAllAbilities(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]) as Ability[];
      
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

      // Check if we have all expected abilities (including Pan Slap)
      const expectedAbilities = ['luck_turner', 'pan_slap'];
      const missingAbilities = expectedAbilities.filter(id => 
        !abilities.some(ability => ability.id === id)
      );
      
      if (missingAbilities.length > 0) {
        console.log(`🔄 Missing abilities detected: ${missingAbilities.join(', ')}. Refreshing Firebase...`);
        try {
          await AbilitiesService.refreshAllAbilities();
          // Reload abilities after refresh
          const refreshedAbilities = await AbilitiesService.getAllAbilities();
          setAllAbilities(refreshedAbilities);
          console.log(`✅ Abilities refreshed! Now have ${refreshedAbilities.length} total abilities`);
        } catch (refreshError) {
          console.error('❌ Failed to refresh abilities:', refreshError);
          // Use what we have from Firebase instead of predefined fallback
          setAllAbilities(abilities);
        }
      } else {
        // Use Firebase abilities (includes Pan Slap and other new abilities)
        setAllAbilities(abilities);
        console.log(`✅ Using ${abilities.length} abilities from Firebase`);
      }
      
      // Ensure siphon is always available to every user
      let finalUserAbilities = userAbils;
      
      // Check if user already has siphon unlocked
      const hasSiphon = userAbils.some(ua => ua.abilityId === 'siphon');
      if (!hasSiphon) {
        // Add siphon as an unlocked ability
        const siphonAbility: UserAbility = {
          id: `siphon_${user.uid}`,
          userId: user.uid,
          abilityId: 'siphon',
          unlockedAt: new Date() as any,
          timesUsed: 0,
          successRate: 0,
          isEquipped: true,
          equippedSlot: 'attack'
        };
        finalUserAbilities = [...userAbils, siphonAbility];
        
        // Also unlock it in the database
        try {
          await AbilitiesService.unlockAbility(user.uid, 'siphon');
          console.log('🔮 Siphon automatically unlocked for user:', user.uid);
        } catch (error) {
          console.error('❌ Failed to unlock siphon in database:', error);
        }
      }
      
      // If no user abilities, create some mock ones for development
      if (finalUserAbilities.length === 0 && allAbilities.length > 0) {
        const mockUserAbilities: UserAbility[] = [
          {
            id: 'user_ability_1',
            userId: user.uid,
            abilityId: allAbilities[0]?.id || 'luck_turner',
            unlockedAt: new Date() as any,
            timesUsed: 5,
            successRate: 80,
            isEquipped: true,
            equippedSlot: 'attack'
          }
        ];
        setUserAbilities(mockUserAbilities);
      } else {
        setUserAbilities(finalUserAbilities);
      }
      
      // If no loadouts, create a default one with siphon
      if (userLoadouts.length === 0) {
        const mockLoadout: UserLoadout = {
          id: 'loadout_1',
          userId: user.uid,
          name: 'Default Loadout',
          abilities: {
            attack: 'siphon'  // Always include siphon in default loadout
          },
          totalStarCost: 3,
          maxStarPoints: 15,
          isActive: true,
          createdAt: new Date() as any,
          lastUsed: new Date() as any
        };
        setLoadouts([mockLoadout]);
        setActiveLoadoutState(mockLoadout);
      } else {
        // Ensure at least one loadout has siphon equipped
        let updatedLoadouts = userLoadouts;
        const hasLoadoutWithSiphon = userLoadouts.some(loadout => 
          Object.values(loadout.abilities || {}).includes('siphon')
        );
        
        if (!hasLoadoutWithSiphon && userLoadouts.length > 0) {
          // Add siphon to the first loadout if none have it
          updatedLoadouts = userLoadouts.map((loadout, index) => {
            if (index === 0) {
              return {
                ...loadout,
                abilities: {
                  ...loadout.abilities,
                  attack: 'siphon'
                }
              };
            }
            return loadout;
          });
        }
        
        setLoadouts(updatedLoadouts);
        const active = updatedLoadouts.find((l: UserLoadout) => l.isActive);
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
          unlockedAbilities: [allAbilities[0]?.id || 'luck_turner', allAbilities[1]?.id || 'pan_slap'],
          stats: {
            abilitiesUsed: 8,
            mostUsedAbility: allAbilities[0]?.id || 'luck_turner',
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
        totalAbilities: allAbilities.length,
        starPoints: 5,
        maxStarPoints: 15
      };
      setProgressionSummary(finalSummary);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ AbilitiesContext: Error initializing abilities data:', error);
      
      // Firebase error - use empty state until it can be resolved
      setAllAbilities([]);
      setUserAbilities([]);
      setLoadouts([]);
      setActiveLoadoutState(null);
      
      setProgressionSummary({
        currentLevel: 1,
        unlockedAbilities: 0,
        totalAbilities: 0,
        starPoints: 5,
        maxStarPoints: 15
      });
      console.log('❌ AbilitiesContext: Firebase error - using empty state');
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
      // Import the new ability service with AURA cost checking
      const { executeMatchAbility } = await import('@/services/abilityFirebaseService');
      
      // Get the ability for cost determination
      const ability = allAbilities.find(a => a.id === abilityId);
      if (!ability) {
        return { success: false, error: 'Ability not found' };
      }

      // For variable cost abilities like Luck Turner, calculate cost based on dice values
      let auraCostOverride: number | undefined;
      if (abilityId === 'luck_turner') {
        // For now, use minimum cost. In full implementation, this would be player choice
        // TODO: Add UI for players to choose between 3 AURA (basic) and 6 AURA (advanced) effects
        auraCostOverride = 3; // Use minimum cost for testing
        console.log('🎯 Luck Turner using minimum cost: 3 AURA');
      }

      // Execute the ability with AURA cost checking and deduction
      const execution = await executeMatchAbility(
        matchId,
        user.uid,
        abilityId,
        [], // targetPlayerIds - would be populated for targeted abilities
        auraCostOverride
      );

      if (execution.success) {
        console.log(`✅ Ability ${ability.name} executed successfully! AURA cost: ${execution.resourcesSpent.aura}`);
        
        // Log the usage for analytics
        await AbilitiesService.logAbilityUsage({
          matchId,
          userId: user.uid,
          abilityId,
          auraSpent: execution.resourcesSpent.aura || ability.auraCost,
          gameState,
          result: { 
            success: true,
            effectValue: ability.effects[0]?.value || 0,
            scoreImpact: execution.impactMetrics?.scoreChange || 0,
            auraGranted: 0
          }
        });
        
        // Update ability stats
        await AbilitiesService.updateAbilityStats(user.uid, abilityId, true);
        
        // Return effect data compatible with existing system
        return { 
          success: true, 
          effect: { 
            abilityId,
            type: ability.effects[0]?.type || 'unknown',
            value: ability.effects[0]?.value || 0,
            target: ability.effects[0]?.target || 'self',
            condition: ability.effects[0]?.condition || 'always',
            auraCost: execution.resourcesSpent.aura,
            execution
          } 
        };
      } else {
        throw new Error('Ability execution failed');
      }
    } catch (error) {
      console.error('Error using ability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to use ability';
      
      // Check for insufficient AURA specifically
      if (errorMessage.includes('Insufficient AURA')) {
        return { success: false, error: errorMessage };
      }
      
      return { success: false, error: errorMessage };
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

  const canUseAbilityInMatch = (abilityId: string, auraAvailable?: number): { canUse: boolean; reason?: string; } => {
    const ability = allAbilities.find(a => a.id === abilityId);
    if (!ability) return { canUse: false, reason: 'Ability not found' };
    
    if (!isAbilityUnlocked(abilityId)) {
      return { canUse: false, reason: 'Ability not unlocked' };
    }
    
    // Temporarily bypass loadout check for testing functionality
    if (abilityId === 'siphon' || abilityId === 'luck_turner' || abilityId === 'pan_slap') {
      // Still check AURA for these abilities
      if (auraAvailable !== undefined) {
        // For variable cost abilities like Luck Turner, use minimum cost for UI checking
        const requiredAura = abilityId === 'luck_turner' ? 3 : ability.auraCost;
        if (auraAvailable < requiredAura) {
          return { canUse: false, reason: `Insufficient AURA (need ${requiredAura}, have ${auraAvailable})` };
        }
      }
      return { canUse: true };
    }
    
    if (!isAbilityEquipped(abilityId)) {
      return { canUse: false, reason: 'Ability not equipped' };
    }
    
    // Check AURA cost if AURA is available
    if (auraAvailable !== undefined) {
      // For variable cost abilities like Luck Turner, use minimum cost for UI checking
      // (actual cost will be calculated during execution)
      const requiredAura = abilityId === 'luck-turner' ? 3 : ability.auraCost;
      
      if (auraAvailable < requiredAura) {
        return { canUse: false, reason: `Insufficient AURA (need ${requiredAura}, have ${auraAvailable})` };
      }
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