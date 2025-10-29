import { useState, useEffect, useCallback } from 'react';
import { 
  DashDiceAbility, 
  AbilitySearchCriteria, 
  AbilityDisplayInfo,
  MatchPlayerAbilities,
  AbilityCategory,
  AbilityRarity
} from '../types/abilityBlueprint';
import abilityService from '../services/abilityFirebaseService';
import { ALL_ABILITIES, getAbilityById, STARTER_ABILITIES } from '../constants/abilities';

/**
 * Comprehensive Ability Management Hook
 * 
 * Provides complete ability management functionality for React components
 * including player loadouts, match abilities, search, and unlocking.
 */

export interface UseAbilitiesOptions {
  includeInactive?: boolean;
  autoLoadPlayerAbilities?: boolean;
  enableRealTimeUpdates?: boolean;
}

export interface UseAbilitiesReturn {
  // Ability Data
  allAbilities: DashDiceAbility[];
  playerAbilities: {
    unlocked: string[];
    equipped: { [category in AbilityCategory]?: string };
    favorites: string[];
  };
  matchAbilities?: MatchPlayerAbilities;
  
  // Search & Filter
  searchResults: DashDiceAbility[];
  searchCriteria: AbilitySearchCriteria;
  setSearchCriteria: (criteria: AbilitySearchCriteria) => void;
  searchAbilities: (criteria: AbilitySearchCriteria) => Promise<void>;
  
  // Player Management
  updateLoadout: (loadout: { [category in AbilityCategory]?: string }) => Promise<void>;
  unlockAbility: (abilityId: string) => Promise<void>;
  toggleFavorite: (abilityId: string) => Promise<void>;
  
  // Match Management
  initializeMatchAbilities: (matchId: string, equippedAbilities?: { [category in AbilityCategory]?: string }) => Promise<void>;
  executeAbility: (abilityId: string, targetPlayerIds?: string[]) => Promise<boolean>;
  updateAura: (auraChange: number) => Promise<void>;
  
  // Utility Functions
  getDisplayInfo: (abilityId: string) => AbilityDisplayInfo | null;
  canUseAbility: (abilityId: string) => { canUse: boolean; reason?: string };
  getRecommendedAbilities: (playerLevel: number) => DashDiceAbility[];
  
  // State
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

export function useAbilities(
  matchId?: string,
  options: UseAbilitiesOptions = {}
): UseAbilitiesReturn {
  // Mock user for now - replace with actual auth context later
  const currentUser = { uid: 'mock-user-id' };
  
  // Mock toast function - replace with actual toast hook later
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    console.log(`Toast (${type}): ${message}`);
  };
  
  // State
  const [allAbilities, setAllAbilities] = useState<DashDiceAbility[]>(ALL_ABILITIES);
  const [playerAbilities, setPlayerAbilities] = useState<{
    unlocked: string[];
    equipped: { [category in AbilityCategory]?: string };
    favorites: string[];
  }>({
    unlocked: [],
    equipped: {},
    favorites: []
  });
  const [matchAbilities, setMatchAbilities] = useState<MatchPlayerAbilities | undefined>();
  const [searchResults, setSearchResults] = useState<DashDiceAbility[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<AbilitySearchCriteria>({
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ==================== DATA LOADING ====================

  const loadPlayerAbilities = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(true);
      const abilities = await abilityService.getPlayerAbilities(currentUser.uid);
      
      // Map Firebase response to local state structure
      setPlayerAbilities({
        unlocked: abilities.unlockedAbilities,
        equipped: abilities.equippedAbilities,
        favorites: abilities.favoriteAbilities
      });
    } catch (err) {
      setError('Failed to load player abilities');
      console.error('Error loading player abilities:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  const loadAllAbilities = useCallback(async () => {
    try {
      setLoading(true);
      const criteria: AbilitySearchCriteria = {
        sortBy: 'name',
        sortOrder: 'asc',
        limit: 100
      };
      
      const result = await abilityService.searchAbilities(criteria);
      
      // Merge with code constants for immediate access
      const mergedAbilities = [...ALL_ABILITIES];
      result.abilities.forEach(firebaseAbility => {
        const existingIndex = mergedAbilities.findIndex(a => a.id === firebaseAbility.id);
        if (existingIndex >= 0) {
          mergedAbilities[existingIndex] = firebaseAbility;
        } else {
          mergedAbilities.push(firebaseAbility);
        }
      });
      
      setAllAbilities(mergedAbilities);
    } catch (err) {
      console.error('Error loading abilities from Firebase:', err);
      // Fallback to constants if Firebase fails
      setAllAbilities(ALL_ABILITIES);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMatchAbilities = useCallback(async () => {
    if (!matchId || !currentUser?.uid) return;
    
    try {
      // TODO: Implement getting match abilities from Firebase
      // For now, create a mock structure
      const mockMatchAbilities: MatchPlayerAbilities = {
        playerId: currentUser.uid,
        matchId,
        equippedAbilities: playerAbilities.equipped,
        abilityStates: {},
        currentAura: 20,
        maxAura: 50,
        updatedAt: new Date() as any
      };
      
      setMatchAbilities(mockMatchAbilities);
    } catch (err) {
      setError('Failed to load match abilities');
      console.error('Error loading match abilities:', err);
    }
  }, [matchId, currentUser?.uid, playerAbilities.equipped]);

  // ==================== SEARCH & FILTER ====================

  const searchAbilities = useCallback(async (criteria: AbilitySearchCriteria) => {
    try {
      setRefreshing(true);
      
      // Search in Firebase first
      const result = await abilityService.searchAbilities(criteria);
      
      // If no results from Firebase, search in constants
      if (result.abilities.length === 0) {
        let filteredAbilities = [...allAbilities];
        
        // Apply client-side filters
        if (criteria.categories?.length) {
          filteredAbilities = filteredAbilities.filter(a => 
            criteria.categories!.includes(a.category)
          );
        }
        
        if (criteria.rarities?.length) {
          filteredAbilities = filteredAbilities.filter(a => 
            criteria.rarities!.includes(a.rarity)
          );
        }
        
        if (criteria.auraCostRange) {
          const [min, max] = criteria.auraCostRange;
          filteredAbilities = filteredAbilities.filter(a => 
            a.auraCost >= min && a.auraCost <= max
          );
        }
        
        if (criteria.query) {
          const query = criteria.query.toLowerCase();
          filteredAbilities = filteredAbilities.filter(a =>
            a.name.toLowerCase().includes(query) ||
            a.description.toLowerCase().includes(query)
          );
        }
        
        // Sort results
        filteredAbilities.sort((a, b) => {
          const field = criteria.sortBy || 'name';
          const order = criteria.sortOrder || 'asc';
          
          let aVal = (a as any)[field];
          let bVal = (b as any)[field];
          
          if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
          }
          
          if (order === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
          }
        });
        
        setSearchResults(filteredAbilities);
      } else {
        setSearchResults(result.abilities);
      }
      
      setSearchCriteria(criteria);
    } catch (err) {
      setError('Failed to search abilities');
      console.error('Error searching abilities:', err);
    } finally {
      setRefreshing(false);
    }
  }, [allAbilities]);

  // ==================== PLAYER MANAGEMENT ====================

  const updateLoadout = useCallback(async (loadout: { [category in AbilityCategory]?: string }) => {
    if (!currentUser?.uid) {
      setError('Must be logged in to update loadout');
      return;
    }
    
    try {
      await abilityService.updatePlayerLoadout(currentUser.uid, loadout);
      setPlayerAbilities(prev => ({
        ...prev,
        equipped: loadout
      }));
      showToast('Loadout updated successfully!', 'success');
    } catch (err) {
      setError('Failed to update loadout');
      showToast('Failed to update loadout', 'error');
      console.error('Error updating loadout:', err);
    }
  }, [currentUser?.uid, showToast]);

  const unlockAbility = useCallback(async (abilityId: string) => {
    if (!currentUser?.uid) {
      setError('Must be logged in to unlock abilities');
      return;
    }
    
    try {
      await abilityService.unlockAbilityForPlayer(currentUser.uid, abilityId);
      setPlayerAbilities(prev => ({
        ...prev,
        unlocked: [...prev.unlocked, abilityId]
      }));
      
      const ability = getAbilityById(abilityId);
      showToast(`Unlocked: ${ability?.name || abilityId}!`, 'success');
    } catch (err) {
      setError('Failed to unlock ability');
      showToast('Failed to unlock ability', 'error');
      console.error('Error unlocking ability:', err);
    }
  }, [currentUser?.uid, showToast]);

  const toggleFavorite = useCallback(async (abilityId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const isFavorite = playerAbilities.favorites.includes(abilityId);
      const newFavorites = isFavorite
        ? playerAbilities.favorites.filter(id => id !== abilityId)
        : [...playerAbilities.favorites, abilityId];
      
      // TODO: Implement favorite persistence in Firebase
      setPlayerAbilities(prev => ({
        ...prev,
        favorites: newFavorites
      }));
      
      const ability = getAbilityById(abilityId);
      showToast(
        `${ability?.name || abilityId} ${isFavorite ? 'removed from' : 'added to'} favorites`,
        'info'
      );
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  }, [currentUser?.uid, playerAbilities.favorites, showToast]);

  // ==================== MATCH MANAGEMENT ====================

  const initializeMatchAbilities = useCallback(async (
    matchId: string,
    equippedAbilities?: { [category in AbilityCategory]?: string }
  ) => {
    if (!currentUser?.uid) return;
    
    try {
      const abilities = equippedAbilities || playerAbilities.equipped;
      await abilityService.initializeMatchAbilities(
        matchId,
        currentUser.uid,
        abilities,
        20 // Initial aura
      );
      
      await loadMatchAbilities();
      showToast('Match abilities initialized!', 'success');
    } catch (err) {
      setError('Failed to initialize match abilities');
      console.error('Error initializing match abilities:', err);
    }
  }, [currentUser?.uid, playerAbilities.equipped, loadMatchAbilities, showToast]);

  const executeAbility = useCallback(async (
    abilityId: string,
    targetPlayerIds: string[] = []
  ): Promise<boolean> => {
    if (!matchId || !currentUser?.uid) {
      setError('Must be in a match to use abilities');
      return false;
    }
    
    const canUseResult = canUseAbility(abilityId);
    if (!canUseResult.canUse) {
      showToast(canUseResult.reason || 'Cannot use ability', 'error');
      return false;
    }
    
    try {
      const execution = await abilityService.executeMatchAbility(
        matchId,
        currentUser.uid,
        abilityId,
        targetPlayerIds
      );
      
      if (execution.success) {
        const ability = getAbilityById(abilityId);
        showToast(`Used ${ability?.name || abilityId}!`, 'success');
        
        // Update match abilities state
        await loadMatchAbilities();
        return true;
      } else {
        showToast(execution.errorMessage || 'Ability failed', 'error');
        return false;
      }
    } catch (err) {
      setError('Failed to execute ability');
      showToast('Failed to use ability', 'error');
      console.error('Error executing ability:', err);
      return false;
    }
  }, [matchId, currentUser?.uid, loadMatchAbilities, showToast]);

  const updateAura = useCallback(async (auraChange: number) => {
    if (!matchId || !currentUser?.uid) return;
    
    try {
      await abilityService.updateMatchPlayerAura(matchId, currentUser.uid, auraChange);
      
      // Update local state
      setMatchAbilities(prev => prev ? {
        ...prev,
        currentAura: Math.max(0, Math.min(prev.maxAura, prev.currentAura + auraChange))
      } : prev);
    } catch (err) {
      console.error('Error updating aura:', err);
    }
  }, [matchId, currentUser?.uid]);

  // ==================== UTILITY FUNCTIONS ====================

  const getDisplayInfo = useCallback((abilityId: string): AbilityDisplayInfo | null => {
    const ability = getAbilityById(abilityId);
    if (!ability) return null;
    
    const isUnlocked = playerAbilities.unlocked.includes(abilityId);
    const isEquipped = Object.values(playerAbilities.equipped).includes(abilityId);
    const canUseResult = canUseAbility(abilityId);
    
    return {
      ability,
      isUnlocked,
      isEquipped,
      isUsable: canUseResult.canUse,
      usabilityReason: canUseResult.reason,
      cooldownRemaining: 0, // TODO: Calculate from match state
      usesRemaining: matchAbilities?.abilityStates[abilityId]?.usesRemaining,
      displayPriority: ability.starCost * 10 + ability.auraCost,
      newlyUnlocked: false, // TODO: Track newly unlocked abilities
      isRecommended: false // TODO: Implement recommendation logic
    };
  }, [playerAbilities, matchAbilities]);

  const canUseAbility = useCallback((abilityId: string): { canUse: boolean; reason?: string } => {
    const ability = getAbilityById(abilityId);
    if (!ability) {
      return { canUse: false, reason: 'Ability not found' };
    }
    
    if (!playerAbilities.unlocked.includes(abilityId)) {
      return { canUse: false, reason: 'Ability not unlocked' };
    }
    
    if (!matchAbilities) {
      return { canUse: false, reason: 'Not in a match' };
    }
    
    if (matchAbilities.currentAura < ability.auraCost) {
      return { canUse: false, reason: `Need ${ability.auraCost} AURA` };
    }
    
    const abilityState = matchAbilities.abilityStates[abilityId];
    if (abilityState?.isBlocked) {
      return { canUse: false, reason: abilityState.blockReason || 'Ability blocked' };
    }
    
    if (abilityState?.usesRemaining === 0) {
      return { canUse: false, reason: 'No uses remaining' };
    }
    
    // TODO: Check cooldown
    // TODO: Check timing constraints
    // TODO: Check activation conditions
    
    return { canUse: true };
  }, [playerAbilities.unlocked, matchAbilities]);

  const getRecommendedAbilities = useCallback((playerLevel: number): DashDiceAbility[] => {
    // Get abilities player can unlock at their level
    const availableAbilities = allAbilities.filter(ability => 
      ability.unlockRequirements.level <= playerLevel &&
      !playerAbilities.unlocked.includes(ability.id)
    );
    
    // Prioritize by category balance and star cost
    const recommendations = availableAbilities
      .filter(ability => ability.starCost <= 3) // Affordable abilities
      .sort((a, b) => {
        // Prefer diverse categories
        const categoryWeight = playerAbilities.unlocked.filter(id => {
          const unlockedAbility = getAbilityById(id);
          return unlockedAbility?.category === a.category;
        }).length;
        
        return a.starCost - b.starCost + categoryWeight * 2;
      })
      .slice(0, 5);
    
    return recommendations;
  }, [allAbilities, playerAbilities.unlocked]);

  // ==================== EFFECTS ====================

  useEffect(() => {
    loadAllAbilities();
  }, [loadAllAbilities]);

  useEffect(() => {
    if (options.autoLoadPlayerAbilities !== false && currentUser?.uid) {
      loadPlayerAbilities();
    }
  }, [currentUser?.uid, options.autoLoadPlayerAbilities, loadPlayerAbilities]);

  useEffect(() => {
    if (matchId) {
      loadMatchAbilities();
    }
  }, [matchId, loadMatchAbilities]);

  // Initialize new players with starter abilities (when we have them)
  useEffect(() => {
    if (currentUser?.uid && playerAbilities.unlocked.length === 0 && STARTER_ABILITIES.length > 0) {
      STARTER_ABILITIES.forEach(ability => {
        unlockAbility(ability.id);
      });
    }
  }, [currentUser?.uid, playerAbilities.unlocked.length, unlockAbility]);

  return {
    // Data
    allAbilities,
    playerAbilities,
    matchAbilities,
    
    // Search & Filter
    searchResults,
    searchCriteria,
    setSearchCriteria,
    searchAbilities,
    
    // Player Management
    updateLoadout,
    unlockAbility,
    toggleFavorite,
    
    // Match Management
    initializeMatchAbilities,
    executeAbility,
    updateAura,
    
    // Utility
    getDisplayInfo,
    canUseAbility,
    getRecommendedAbilities,
    
    // State
    loading,
    error,
    refreshing
  };
}

export default useAbilities;