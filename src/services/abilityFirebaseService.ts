import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  QueryDocumentSnapshot,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  DashDiceAbility, 
  AbilitySearchCriteria, 
  AbilityUsageAnalytics,
  MatchAbilityExecution,
  MatchPlayerAbilities,
  BotAbilityProfile,
  AbilityCategory,
  AbilityRarity,
  AbilityType
} from '../types/abilityBlueprint';

/**
 * Firebase Ability Management Service
 * 
 * Complete service for managing abilities in Firebase according to the
 * Ability Management Blueprint storage strategy.
 */

// ==================== COLLECTION REFERENCES ====================

const COLLECTIONS = {
  abilities: 'abilities',
  playerAbilities: 'playerAbilities', 
  abilityUsage: 'abilityUsage',
  abilityAnalytics: 'abilityAnalytics',
  botProfiles: 'botProfiles',
  matchAbilities: 'matchAbilities'
} as const;

// ==================== ABILITY CRUD OPERATIONS ====================

/**
 * Create or update an ability definition
 */
export async function createAbility(ability: DashDiceAbility): Promise<void> {
  try {
    const abilityRef = doc(db, COLLECTIONS.abilities, ability.id);
    
    const abilityData = {
      ...ability,
      createdAt: ability.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    await setDoc(abilityRef, abilityData);
    
    console.log(`Created/updated ability: ${ability.id}`);
  } catch (error) {
    console.error('Error creating ability:', error);
    throw new Error(`Failed to create ability ${ability.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a specific ability by ID
 */
export async function getAbility(abilityId: string): Promise<DashDiceAbility | null> {
  try {
    const abilityRef = doc(db, COLLECTIONS.abilities, abilityId);
    const abilitySnap = await getDoc(abilityRef);
    
    if (!abilitySnap.exists()) {
      return null;
    }
    
    return abilitySnap.data() as DashDiceAbility;
  } catch (error) {
    console.error('Error getting ability:', error);
    throw new Error(`Failed to get ability ${abilityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search and filter abilities with advanced criteria
 */
export async function searchAbilities(criteria: AbilitySearchCriteria): Promise<{
  abilities: DashDiceAbility[];
  hasMore: boolean;
  lastDoc?: QueryDocumentSnapshot;
}> {
  try {
    let q = collection(db, COLLECTIONS.abilities);
    let constraints: any[] = [];
    
    // Filter by active abilities only (unless specifically searching inactive)
    constraints.push(where('isActive', '==', true));
    
    // Category filter
    if (criteria.categories && criteria.categories.length > 0) {
      constraints.push(where('category', 'in', criteria.categories));
    }
    
    // Rarity filter
    if (criteria.rarities && criteria.rarities.length > 0) {
      constraints.push(where('rarity', 'in', criteria.rarities));
    }
    
    // Type filter
    if (criteria.types && criteria.types.length > 0) {
      constraints.push(where('type', 'in', criteria.types));
    }
    
    // Aura cost range
    if (criteria.auraCostRange) {
      constraints.push(where('auraCost', '>=', criteria.auraCostRange[0]));
      constraints.push(where('auraCost', '<=', criteria.auraCostRange[1]));
    }
    
    // Star cost range
    if (criteria.starCostRange) {
      constraints.push(where('starCost', '>=', criteria.starCostRange[0]));
      constraints.push(where('starCost', '<=', criteria.starCostRange[1]));
    }
    
    // Tags filter (array-contains-any for multiple tags)
    if (criteria.tags && criteria.tags.length > 0) {
      constraints.push(where('tags', 'array-contains-any', criteria.tags));
    }
    
    // Sorting
    const sortField = criteria.sortBy || 'name';
    const sortDirection = criteria.sortOrder || 'asc';
    constraints.push(orderBy(sortField, sortDirection));
    
    // Pagination
    const pageLimit = criteria.limit || 20;
    constraints.push(limit(pageLimit + 1)); // +1 to check for more results
    
    // Build query
    const queryRef = query(q, ...constraints);
    const querySnapshot = await getDocs(queryRef);
    
    const abilities: DashDiceAbility[] = [];
    let lastDoc: QueryDocumentSnapshot | undefined;
    
    querySnapshot.docs.forEach((doc, index) => {
      if (index < pageLimit) {
        abilities.push(doc.data() as DashDiceAbility);
        lastDoc = doc;
      }
    });
    
    // Text search filter (client-side for complex text matching)
    let filteredAbilities = abilities;
    if (criteria.query) {
      const searchTerm = criteria.query.toLowerCase();
      filteredAbilities = abilities.filter(ability => 
        ability.name.toLowerCase().includes(searchTerm) ||
        ability.description.toLowerCase().includes(searchTerm) ||
        ability.longDescription.toLowerCase().includes(searchTerm) ||
        ability.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    return {
      abilities: filteredAbilities,
      hasMore: querySnapshot.docs.length > pageLimit,
      lastDoc
    };
  } catch (error) {
    console.error('Error searching abilities:', error);
    throw new Error(`Failed to search abilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all abilities by category
 */
export async function getAbilitiesByCategory(category: AbilityCategory): Promise<DashDiceAbility[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.abilities),
      where('category', '==', category),
      where('isActive', '==', true),
      orderBy('starCost', 'asc'),
      orderBy('name', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as DashDiceAbility);
  } catch (error) {
    console.error('Error getting abilities by category:', error);
    throw new Error(`Failed to get abilities for category ${category}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update ability balancing data
 */
export async function updateAbilityBalancing(
  abilityId: string, 
  balancingUpdate: Partial<DashDiceAbility['balancing']>
): Promise<void> {
  try {
    const abilityRef = doc(db, COLLECTIONS.abilities, abilityId);
    
    await updateDoc(abilityRef, {
      balancing: balancingUpdate,
      updatedAt: Timestamp.now()
    });
    
    console.log(`Updated balancing for ability: ${abilityId}`);
  } catch (error) {
    console.error('Error updating ability balancing:', error);
    throw new Error(`Failed to update balancing for ${abilityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ==================== PLAYER ABILITY MANAGEMENT ====================

/**
 * Get player's ability loadout and states
 */
export async function getPlayerAbilities(playerId: string): Promise<{
  unlockedAbilities: string[];
  equippedAbilities: { [category in AbilityCategory]?: string };
  favoriteAbilities: string[];
}> {
  try {
    // Check the userAbilities collection first (new system)
    console.log('🔍 getPlayerAbilities: Checking userAbilities collection for:', playerId);
    
    const userAbilitiesQuery = query(
      collection(db, 'userAbilities'),
      where('userId', '==', playerId)
    );
    const userAbilitiesSnap = await getDocs(userAbilitiesQuery);
    
    if (!userAbilitiesSnap.empty) {
      console.log('🔍 getPlayerAbilities: Found userAbilities, converting to playerAbilities format');
      
      // Convert userAbilities format to playerAbilities format
      const unlockedAbilities: string[] = [];
      
      userAbilitiesSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.abilityId) {
          unlockedAbilities.push(data.abilityId);
        }
      });
      
      console.log('🔍 getPlayerAbilities: Converted abilities:', unlockedAbilities);
      
      return {
        unlockedAbilities,
        equippedAbilities: {}, // Will be populated from loadouts
        favoriteAbilities: []
      };
    }
    
    // Fallback to playerAbilities collection (old system)
    console.log('🔍 getPlayerAbilities: No userAbilities found, checking playerAbilities collection');
    
    const playerAbilitiesRef = doc(db, COLLECTIONS.playerAbilities, playerId);
    const playerAbilitiesSnap = await getDoc(playerAbilitiesRef);
    
    if (!playerAbilitiesSnap.exists()) {
      console.log('🔍 getPlayerAbilities: No playerAbilities found, returning empty');
      // Return default structure for new players
      return {
        unlockedAbilities: [],
        equippedAbilities: {},
        favoriteAbilities: []
      };
    }
    
    console.log('🔍 getPlayerAbilities: Found playerAbilities, using directly');
    return playerAbilitiesSnap.data() as {
      unlockedAbilities: string[];
      equippedAbilities: { [category in AbilityCategory]?: string };
      favoriteAbilities: string[];
    };
  } catch (error) {
    console.error('Error getting player abilities:', error);
    throw new Error(`Failed to get abilities for player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update player's equipped abilities
 */
export async function updatePlayerLoadout(
  playerId: string,
  equippedAbilities: { [category in AbilityCategory]?: string }
): Promise<void> {
  try {
    const playerAbilitiesRef = doc(db, COLLECTIONS.playerAbilities, playerId);
    
    await runTransaction(db, async (transaction) => {
      const playerDoc = await transaction.get(playerAbilitiesRef);
      
      if (!playerDoc.exists()) {
        // Create new player abilities document
        transaction.set(playerAbilitiesRef, {
          playerId,
          unlockedAbilities: [],
          equippedAbilities,
          favoriteAbilities: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      } else {
        // Update existing document
        transaction.update(playerAbilitiesRef, {
          equippedAbilities,
          updatedAt: Timestamp.now()
        });
      }
    });
    
    console.log(`Updated loadout for player: ${playerId}`);
  } catch (error) {
    console.error('Error updating player loadout:', error);
    throw new Error(`Failed to update loadout for player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Unlock new ability for player
 */
export async function unlockAbilityForPlayer(playerId: string, abilityId: string): Promise<void> {
  try {
    const playerAbilitiesRef = doc(db, COLLECTIONS.playerAbilities, playerId);
    
    await runTransaction(db, async (transaction) => {
      const playerDoc = await transaction.get(playerAbilitiesRef);
      
      if (!playerDoc.exists()) {
        // Create new player abilities document
        transaction.set(playerAbilitiesRef, {
          playerId,
          unlockedAbilities: [abilityId],
          equippedAbilities: {},
          favoriteAbilities: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      } else {
        const data = playerDoc.data();
        const currentUnlocked = data.unlockedAbilities || [];
        
        if (!currentUnlocked.includes(abilityId)) {
          transaction.update(playerAbilitiesRef, {
            unlockedAbilities: [...currentUnlocked, abilityId],
            updatedAt: Timestamp.now()
          });
        }
      }
    });
    
    console.log(`Unlocked ability ${abilityId} for player: ${playerId}`);
  } catch (error) {
    console.error('Error unlocking ability for player:', error);
    throw new Error(`Failed to unlock ability ${abilityId} for player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ==================== MATCH ABILITY EXECUTION ====================

/**
 * Initialize player abilities for a match
 */
export async function initializeMatchAbilities(
  matchId: string,
  playerId: string,
  equippedAbilities: { [category in AbilityCategory]?: string },
  initialAura: number = 20
): Promise<void> {
  try {
    const matchAbilitiesRef = doc(db, COLLECTIONS.matchAbilities, `${matchId}_${playerId}`);
    
    // Get ability data to set initial states
    const abilityIds = Object.values(equippedAbilities).filter(Boolean) as string[];
    const abilityStates: { [abilityId: string]: any } = {};
    
    for (const abilityId of abilityIds) {
      const ability = await getAbility(abilityId);
      if (ability) {
        abilityStates[abilityId] = {
          usesRemaining: ability.maxUsesPerMatch || -1, // -1 = unlimited
          cooldownEndsAt: null,
          isBlocked: false,
          blockReason: null
        };
      }
    }
    
    const matchPlayerAbilities: MatchPlayerAbilities = {
      playerId,
      matchId,
      equippedAbilities,
      abilityStates,
      currentAura: initialAura,
      maxAura: 50, // Default max aura
      updatedAt: Timestamp.now()
    };
    
    await setDoc(matchAbilitiesRef, matchPlayerAbilities);
    
    console.log(`Initialized match abilities for player ${playerId} in match ${matchId}`);
  } catch (error) {
    console.error('Error initializing match abilities:', error);
    throw new Error(`Failed to initialize match abilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Execute an ability in a match with AURA cost checking and deduction
 */
export async function executeMatchAbility(
  matchId: string,
  playerId: string,
  abilityId: string,
  targetPlayerIds: string[] = [],
  auraCostOverride?: number // For variable cost abilities like Luck Turner
): Promise<MatchAbilityExecution> {
  try {
    // 1. Get the ability definition
    const abilityDoc = await getDoc(doc(db, 'abilities', abilityId));
    if (!abilityDoc.exists()) {
      throw new Error(`Ability ${abilityId} not found`);
    }
    const ability = abilityDoc.data() as DashDiceAbility;
    
    // 2. Get current match data to check player's AURA
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    if (!matchDoc.exists()) {
      throw new Error(`Match ${matchId} not found`);
    }
    const matchData = matchDoc.data();
    const currentPlayerAura = matchData.gameData?.playerAura?.[playerId] || 0;
    
    // 3. Determine AURA cost (use override for variable costs, otherwise use ability's base cost)
    const auraCost = auraCostOverride || ability.auraCost;
    
    // 4. Check if player has enough AURA
    if (currentPlayerAura < auraCost) {
      throw new Error(`Insufficient AURA: need ${auraCost}, have ${currentPlayerAura}`);
    }
    
    // 5. Create execution record
    const execution: MatchAbilityExecution = {
      matchId,
      playerId,
      abilityId,
      targetPlayerIds,
      status: 'executing',
      startedAt: Timestamp.now(),
      success: false,
      effectsApplied: [],
      resourcesSpent: {
        aura: auraCost
      },
      gameStateBeforeExecution: {
        playerAura: matchData.gameData?.playerAura || {},
        currentPlayer: matchData.gameData?.currentPlayer || playerId, // Use executing player as fallback
        turnPhase: matchData.gameData?.turnPhase || 'unknown'
      },
      gameStateAfterExecution: null,
      impactMetrics: {
        scoreChange: 0,
        auraChange: -auraCost
      }
    };
    
    // 6. Deduct AURA cost from player
    const newAura = currentPlayerAura - auraCost;
    await updateDoc(doc(db, 'matches', matchId), {
      [`gameData.playerAura.${playerId}`]: newAura
    });
    
    console.log(`💫 Ability executed: ${ability.name} | Cost: ${auraCost} AURA | Remaining: ${newAura} AURA`);
    
    // 7. Apply ability effects (placeholder for now - would integrate with ability engine)
    const effectsApplied = await applyAbilityEffects(ability, matchId, playerId, targetPlayerIds);
    
    // 8. Update execution with results
    execution.status = 'completed';
    execution.success = true;
    execution.effectsApplied = effectsApplied;
    execution.completedAt = Timestamp.now();
    execution.gameStateAfterExecution = {
      playerAura: { ...matchData.gameData?.playerAura, [playerId]: newAura },
      currentPlayer: matchData.gameData?.currentPlayer,
      turnPhase: matchData.gameData?.turnPhase
    };
    
    // 9. Store execution record
    const executionRef = doc(db, 'abilityExecutions', 
      `${matchId}_${playerId}_${abilityId}_${Date.now()}`);
    await setDoc(executionRef, execution);
    
    return execution;
  } catch (error) {
    console.error('Error executing match ability:', error);
    throw new Error(`Failed to execute ability ${abilityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Apply ability effects (placeholder for ability engine integration)
 */
async function applyAbilityEffects(
  ability: DashDiceAbility,
  matchId: string,
  playerId: string,
  targetPlayerIds: string[]
): Promise<any[]> {
  // This is where the actual ability effects would be applied
  // For now, just return a basic effect applied record
  return [{
    effectId: ability.effects[0]?.id || 'unknown',
    appliedTo: playerId,
    magnitude: ability.effects[0]?.magnitude || 'default',
    duration: ability.effects[0]?.duration || 1,
    appliedAt: Timestamp.now()
  }];
}

/**
 * Update player's aura in a match
 */
export async function updateMatchPlayerAura(
  matchId: string,
  playerId: string,
  auraChange: number
): Promise<void> {
  try {
    const matchAbilitiesRef = doc(db, COLLECTIONS.matchAbilities, `${matchId}_${playerId}`);
    
    await runTransaction(db, async (transaction) => {
      const matchAbilitiesDoc = await transaction.get(matchAbilitiesRef);
      
      if (matchAbilitiesDoc.exists()) {
        const data = matchAbilitiesDoc.data() as MatchPlayerAbilities;
        const newAura = Math.max(0, Math.min(data.maxAura, data.currentAura + auraChange));
        
        transaction.update(matchAbilitiesRef, {
          currentAura: newAura,
          updatedAt: Timestamp.now()
        });
      }
    });
  } catch (error) {
    console.error('Error updating match player aura:', error);
    throw new Error(`Failed to update aura for player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a player can afford an ability
 */
export async function canPlayerAffordAbility(
  matchId: string,
  playerId: string,
  abilityId: string,
  auraCostOverride?: number
): Promise<{ canAfford: boolean; currentAura: number; requiredAura: number }> {
  try {
    // Get the ability definition
    const abilityDoc = await getDoc(doc(db, 'abilities', abilityId));
    if (!abilityDoc.exists()) {
      throw new Error(`Ability ${abilityId} not found`);
    }
    const ability = abilityDoc.data() as DashDiceAbility;
    
    // Get current match data to check player's AURA
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    if (!matchDoc.exists()) {
      throw new Error(`Match ${matchId} not found`);
    }
    const matchData = matchDoc.data();
    const currentPlayerAura = matchData.gameData?.playerAura?.[playerId] || 0;
    
    // Determine AURA cost
    const requiredAura = auraCostOverride || ability.auraCost;
    
    return {
      canAfford: currentPlayerAura >= requiredAura,
      currentAura: currentPlayerAura,
      requiredAura
    };
  } catch (error) {
    console.error('Error checking ability affordability:', error);
    throw new Error(`Failed to check affordability for ability ${abilityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ==================== BOT PROFILES ====================

/**
 * Get bot ability profile
 */
export async function getBotProfile(botId: string): Promise<BotAbilityProfile | null> {
  try {
    const botProfileRef = doc(db, COLLECTIONS.botProfiles, botId);
    const botProfileSnap = await getDoc(botProfileRef);
    
    if (!botProfileSnap.exists()) {
      return null;
    }
    
    return botProfileSnap.data() as BotAbilityProfile;
  } catch (error) {
    console.error('Error getting bot profile:', error);
    throw new Error(`Failed to get bot profile ${botId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create or update bot ability profile
 */
export async function createBotProfile(botId: string, profile: BotAbilityProfile): Promise<void> {
  try {
    const botProfileRef = doc(db, COLLECTIONS.botProfiles, botId);
    await setDoc(botProfileRef, profile);
    
    console.log(`Created/updated bot profile: ${botId}`);
  } catch (error) {
    console.error('Error creating bot profile:', error);
    throw new Error(`Failed to create bot profile ${botId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ==================== ANALYTICS ====================

/**
 * Record ability usage for analytics
 */
export async function recordAbilityUsage(
  abilityId: string,
  playerId: string,
  matchId: string,
  success: boolean,
  gameImpact: number
): Promise<void> {
  try {
    const usageRef = doc(db, COLLECTIONS.abilityUsage, 
      `${abilityId}_${playerId}_${matchId}_${Date.now()}`);
    
    const usageData = {
      abilityId,
      playerId,
      matchId,
      success,
      gameImpact,
      timestamp: Timestamp.now()
    };
    
    await setDoc(usageRef, usageData);
  } catch (error) {
    console.error('Error recording ability usage:', error);
    // Don't throw here - analytics failures shouldn't break gameplay
  }
}

/**
 * Get ability usage analytics
 */
export async function getAbilityAnalytics(abilityId: string): Promise<AbilityUsageAnalytics | null> {
  try {
    const analyticsRef = doc(db, COLLECTIONS.abilityAnalytics, abilityId);
    const analyticsSnap = await getDoc(analyticsRef);
    
    if (!analyticsSnap.exists()) {
      return null;
    }
    
    return analyticsSnap.data() as AbilityUsageAnalytics;
  } catch (error) {
    console.error('Error getting ability analytics:', error);
    throw new Error(`Failed to get analytics for ability ${abilityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Validate ability data before saving
 */
export function validateAbility(ability: DashDiceAbility): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic validation
  if (!ability.id) errors.push('Ability ID is required');
  if (!ability.name) errors.push('Ability name is required');
  if (!ability.description) errors.push('Ability description is required');
  if (!ability.iconUrl) errors.push('Ability icon URL is required');
  
  // Numeric validation
  if (ability.auraCost < 0 || ability.auraCost > 50) {
    errors.push('Aura cost must be between 0 and 50');
  }
  if (ability.starCost < 1 || ability.starCost > 5) {
    errors.push('Star cost must be between 1 and 5');
  }
  if (ability.cooldown < 0) {
    errors.push('Cooldown cannot be negative');
  }
  
  // Effects validation
  if (!ability.effects || ability.effects.length === 0) {
    errors.push('Ability must have at least one effect');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate ability ID from name
 */
export function generateAbilityId(name: string, version: number = 1): string {
  const baseId = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
  
  return version === 1 ? baseId : `${baseId}_v${version}`;
}

/**
 * Calculate ability power level based on effects and costs
 */
export function calculatePowerLevel(ability: DashDiceAbility): number {
  let powerLevel = 0;
  
  // Base power from effects
  powerLevel += ability.effects.length * 10;
  
  // Adjust for aura cost (higher cost = more powerful)
  powerLevel += ability.auraCost * 2;
  
  // Adjust for star cost
  powerLevel += ability.starCost * 5;
  
  // Adjust for cooldown (longer cooldown = more powerful)
  powerLevel += (ability.cooldown / 10);
  
  // Adjust for usage limits
  if (ability.maxUsesPerMatch) {
    powerLevel += (5 - ability.maxUsesPerMatch) * 3;
  }
  
  // Normalize to 1-100 scale
  return Math.min(100, Math.max(1, Math.round(powerLevel)));
}

export default {
  createAbility,
  getAbility,
  searchAbilities,
  getAbilitiesByCategory,
  updateAbilityBalancing,
  getPlayerAbilities,
  updatePlayerLoadout,
  unlockAbilityForPlayer,
  initializeMatchAbilities,
  executeMatchAbility,
  updateMatchPlayerAura,
  getBotProfile,
  createBotProfile,
  recordAbilityUsage,
  getAbilityAnalytics,
  validateAbility,
  generateAbilityId,
  calculatePowerLevel
};