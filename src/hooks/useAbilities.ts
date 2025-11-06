import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  DashDiceAbility, 
  AbilitySearchCriteria, 
  AbilityDisplayInfo,
  MatchPlayerAbilities,
  AbilityCategory,
  AbilityRarity
} from '../types/abilityBlueprint';
import abilityService from '../services/abilityFirebaseService';
import { ALL_ABILITIES, STARTER_ABILITIES } from '../constants/abilities';

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
  const { user: currentUser } = useAuth();
  
  // Mock toast function - replace with actual toast hook later
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    console.log(`Toast (${type}): ${message}`);
  };
  
  // State
  const [allAbilities, setAllAbilities] = useState<DashDiceAbility[]>([]);
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
      console.log('🔍 useAbilities: Loading player abilities for user:', currentUser!.uid);
      
      const abilities = await abilityService.getPlayerAbilities(currentUser!.uid);
      console.log('🔍 useAbilities: Player abilities response:', abilities);
      
      // Map Firebase response to local state structure
      setPlayerAbilities({
        unlocked: abilities.unlockedAbilities,
        equipped: abilities.equippedAbilities,
        favorites: abilities.favoriteAbilities
      });
      
      console.log('🔍 useAbilities: Mapped player abilities:', {
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
      console.log('🔍 useAbilities: Starting to load abilities from Firebase...');
      
      const criteria: AbilitySearchCriteria = {
        sortBy: 'name',
        sortOrder: 'asc',
        limit: 100
      };
      
      const result = await abilityService.searchAbilities(criteria);
      console.log('🔍 useAbilities: Firebase search result:', result);
      
      // If Firebase has no abilities, seed with constants
      if (result.abilities.length === 0) {
        console.log('🌱 No abilities found in Firebase, seeding with constants...');
        console.log('🌱 Available constants to seed:', ALL_ABILITIES);
        
        // Seed Firebase with our constants
        for (const ability of ALL_ABILITIES) {
          try {
            console.log(`🌱 Attempting to seed: ${ability.name}`);
            await abilityService.createAbility(ability);
            console.log(`✅ Seeded ability: ${ability.name}`);
          } catch (error) {
            console.error(`❌ Failed to seed ability ${ability.name}:`, error);
          }
        }
        
        // Reload after seeding
        console.log('🔄 Reloading abilities after seeding...');
        const reloadResult = await abilityService.searchAbilities(criteria);
        console.log('🔍 useAbilities: After seeding, result:', reloadResult);
        setAllAbilities(reloadResult.abilities);
      } else {
        console.log('✅ Found abilities in Firebase:', result.abilities);
        setAllAbilities(result.abilities);
      }
    } catch (err) {
      console.error('Error loading abilities from Firebase:', err);
      setError('Failed to load abilities from Firebase');
      // No fallback to constants - Firebase should be the source of truth
      setAllAbilities([]);
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
        playerId: currentUser!.uid,
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
      
      // Search only in Firebase - single source of truth
      const result = await abilityService.searchAbilities(criteria);
      setSearchResults(result.abilities);
      setSearchCriteria(criteria);
    } catch (err) {
      setError('Failed to search abilities');
      console.error('Error searching abilities:', err);
      setSearchResults([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ==================== PLAYER MANAGEMENT ====================

  const updateLoadout = useCallback(async (loadout: { [category in AbilityCategory]?: string }) => {
    if (!currentUser?.uid) {
      setError('Must be logged in to update loadout');
      return;
    }
    
    try {
      await abilityService.updatePlayerLoadout(currentUser!.uid, loadout);
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
      await abilityService.unlockAbilityForPlayer(currentUser!.uid, abilityId);
      setPlayerAbilities(prev => ({
        ...prev,
        unlocked: [...prev.unlocked, abilityId]
      }));
      
      const ability = allAbilities.find(a => a.id === abilityId);
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
      
      const ability = allAbilities.find(a => a.id === abilityId);
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
        currentUser!.uid,
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
        currentUser!.uid,
        abilityId,
        targetPlayerIds
      );
      
      if (execution.success) {
        const ability = allAbilities.find(a => a.id === abilityId);
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
      await abilityService.updateMatchPlayerAura(matchId, currentUser!.uid, auraChange);
      
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
    const ability = allAbilities.find(a => a.id === abilityId);
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
  }, [allAbilities, playerAbilities, matchAbilities]);

  const canUseAbility = useCallback((abilityId: string): { canUse: boolean; reason?: string } => {
    const ability = allAbilities.find(a => a.id === abilityId);
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
  }, [allAbilities, playerAbilities.unlocked, matchAbilities]);

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
          const unlockedAbility = allAbilities.find(a => a.id === id);
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

  // Initialize new players with starter abilities from Firebase
  useEffect(() => {
    const initializeNewPlayer = async () => {
      if (currentUser?.uid && playerAbilities.unlocked.length === 0 && allAbilities.length > 0) {
        console.log('🌟 New player detected, initializing starter abilities...');
        try {
          // Call the Firebase service to initialize starter abilities
          await abilityService.initializeStarterAbilities(currentUser.uid);
          // Reload player abilities to reflect the changes
          await loadPlayerAbilities();
          console.log('✅ Starter abilities initialized successfully!');
        } catch (error) {
          console.error('❌ Failed to initialize starter abilities:', error);
        }
      }
    };
    
    initializeNewPlayer();
  }, [currentUser?.uid, playerAbilities.unlocked.length, allAbilities.length, loadPlayerAbilities]);

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