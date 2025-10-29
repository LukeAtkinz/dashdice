import { 
  EnhancedMatchState, 
  AbilityExecutionContext, 
  EnhancedAbilityEffect,
  ActiveEffect
} from '@/types/enhancedAbilities';
import { EnhancedMatchStateManager } from './enhancedMatchStateManager';
import { AbilityExecutionEngine } from './abilityExecutionEngine';
import { MatchData } from '@/types/match';
import { doc, updateDoc, getDoc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Enhanced Abilities Integration Service
 * 
 * This service bridges the gap between the existing match system and the new enhanced abilities system.
 * It provides a clean interface for:
 * - Integrating enhanced state with existing matches
 * - Executing abilities within the context of real matches
 * - Managing the lifecycle of enhanced features
 * - Maintaining backwards compatibility
 */
export class EnhancedAbilitiesIntegration {
  
  // ==================== MATCH INTEGRATION ====================
  
  /**
   * Initialize enhanced abilities for an existing match
   */
  static async initializeForMatch(matchId: string): Promise<boolean> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        console.error(`Match ${matchId} not found`);
        return false;
      }
      
      const matchData = matchDoc.data() as MatchData;
      
      // Extract player IDs
      const playerIds = [matchData.hostData.playerId, matchData.opponentData.playerId];
      
      // Initialize enhanced state
      const enhancedState = EnhancedMatchStateManager.initializeEnhancedState(playerIds);
      
      // Update match document with enhanced state
      await updateDoc(matchRef, {
        'gameData.enhancedState': enhancedState,
        'gameData.enhancedAbilitiesEnabled': true
      });
      
      console.log(`✅ Enhanced abilities initialized for match ${matchId}`);
      return true;
      
    } catch (error) {
      console.error('Failed to initialize enhanced abilities for match:', error);
      return false;
    }
  }
  
  /**
   * Execute an ability within a match context
   */
  static async executeAbilityInMatch(
    matchId: string,
    playerId: string,
    abilityId: string,
    targets: string[] = [],
    inputParameters: { [key: string]: any } = {}
  ): Promise<{
    success: boolean;
    error?: string;
    feedback?: any;
  }> {
    try {
      console.log(`🎯 Executing ability ${abilityId} for player ${playerId} in match ${matchId}`);
      
      // Get the current match state
      const matchData = await this.getMatchData(matchId);
      if (!matchData) {
        return { success: false, error: 'Match not found' };
      }
      
      // Ensure enhanced state exists
      if (!matchData.gameData.enhancedState) {
        const initSuccess = await this.initializeForMatch(matchId);
        if (!initSuccess) {
          return { success: false, error: 'Failed to initialize enhanced abilities' };
        }
        
        // Refresh match data
        const refreshedData = await this.getMatchData(matchId);
        if (!refreshedData) {
          return { success: false, error: 'Failed to refresh match data' };
        }
        matchData.gameData.enhancedState = refreshedData.gameData.enhancedState;
      }
      
      // Get the ability definition
      const ability = await this.getAbilityDefinition(abilityId);
      if (!ability) {
        return { success: false, error: 'Ability not found' };
      }
      
      // Create execution context
      const context: AbilityExecutionContext = {
        matchId,
        executingPlayerId: playerId,
        targetPlayerIds: targets.length > 0 ? targets : [playerId],
        matchState: matchData.gameData.enhancedState,
        gameData: matchData.gameData,
        executionId: `${matchId}_${playerId}_${abilityId}_${Date.now()}`,
        timestamp: Timestamp.now(),
        ability,
        inputParameters,
        options: {
          dryRun: false,
          validateOnly: false,
          ignoreValidation: false,
          logExecution: true
        }
      };
      
      // Execute the ability
      const result = await AbilityExecutionEngine.executeAbility(context);
      
      if (result.success) {
        // Update match state in Firestore
        await this.updateMatchWithResults(matchId, context.matchState, result);
        
        // Track usage statistics
        EnhancedMatchStateManager.trackAbilityUsage(
          context.matchState,
          playerId,
          abilityId,
          true,
          result.resourceCosts,
          targets
        );
        
        console.log(`✅ Ability ${abilityId} executed successfully`);
        return { 
          success: true, 
          feedback: result.feedback 
        };
      } else {
        console.log(`❌ Ability execution failed: ${result.errorMessage}`);
        return { 
          success: false, 
          error: result.errorMessage 
        };
      }
      
    } catch (error) {
      console.error('Error executing ability in match:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Get enhanced match state for a match
   */
  static async getEnhancedState(matchId: string): Promise<EnhancedMatchState | null> {
    try {
      const matchData = await this.getMatchData(matchId);
      return matchData?.gameData.enhancedState || null;
    } catch (error) {
      console.error('Failed to get enhanced state:', error);
      return null;
    }
  }
  
  /**
   * Update enhanced state for a match
   */
  static async updateEnhancedState(matchId: string, enhancedState: EnhancedMatchState): Promise<boolean> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        'gameData.enhancedState': enhancedState
      });
      return true;
    } catch (error) {
      console.error('Failed to update enhanced state:', error);
      return false;
    }
  }
  
  // ==================== PERIODIC MAINTENANCE ====================
  
  /**
   * Perform periodic cleanup and maintenance for a match
   */
  static async performPeriodicMaintenance(matchId: string): Promise<boolean> {
    try {
      const enhancedState = await this.getEnhancedState(matchId);
      if (!enhancedState) return false;
      
      // Perform cleanup
      EnhancedMatchStateManager.performPeriodicCleanup(enhancedState);
      
      // Update the state
      await this.updateEnhancedState(matchId, enhancedState);
      
      return true;
    } catch (error) {
      console.error('Failed to perform periodic maintenance:', error);
      return false;
    }
  }
  
  /**
   * Schedule periodic maintenance for all active matches
   */
  static startPeriodicMaintenanceScheduler(): void {
    // Run maintenance every 30 seconds
    setInterval(async () => {
      try {
        // Get all active matches (this would need to be implemented)
        const activeMatches = await this.getActiveMatches();
        
        for (const matchId of activeMatches) {
          await this.performPeriodicMaintenance(matchId);
        }
      } catch (error) {
        console.error('Periodic maintenance error:', error);
      }
    }, 30000);
    
    console.log('🔄 Periodic maintenance scheduler started');
  }
  
  // ==================== COMPATIBILITY LAYER ====================
  
  /**
   * Check if a match has enhanced abilities enabled
   */
  static async isEnhancedAbilitiesEnabled(matchId: string): Promise<boolean> {
    try {
      const matchData = await this.getMatchData(matchId);
      return matchData?.gameData.enhancedAbilitiesEnabled || false;
    } catch (error) {
      console.error('Failed to check enhanced abilities status:', error);
      return false;
    }
  }
  
  /**
   * Migrate existing match to use enhanced abilities
   */
  static async migrateMatchToEnhanced(matchId: string): Promise<boolean> {
    try {
      const isEnabled = await this.isEnhancedAbilitiesEnabled(matchId);
      if (isEnabled) {
        console.log(`Match ${matchId} already has enhanced abilities enabled`);
        return true;
      }
      
      return await this.initializeForMatch(matchId);
    } catch (error) {
      console.error('Failed to migrate match to enhanced abilities:', error);
      return false;
    }
  }
  
  /**
   * Get player's available abilities for UI display
   */
  static async getPlayerAbilitiesForMatch(matchId: string, playerId: string): Promise<{
    abilities: EnhancedAbilityEffect[];
    canUse: { [abilityId: string]: { canUse: boolean; reason?: string } };
    resourceStatus: any;
  }> {
    try {
      const enhancedState = await this.getEnhancedState(matchId);
      if (!enhancedState) {
        return { abilities: [], canUse: {}, resourceStatus: {} };
      }
      
      // Get player's loadout abilities (this would integrate with existing system)
      const abilities = await this.getPlayerLoadoutAbilities(playerId);
      
      // Check which abilities can be used
      const canUse: { [abilityId: string]: { canUse: boolean; reason?: string } } = {};
      
      for (const ability of abilities) {
        const usageTracker = enhancedState.abilityUsage[playerId]?.[ability.id];
        const resourcePool = enhancedState.resourcePools[playerId];
        
        // Check cooldown
        if (usageTracker?.cooldownEndsAt && usageTracker.cooldownEndsAt > Timestamp.now()) {
          canUse[ability.id] = { canUse: false, reason: 'On cooldown' };
          continue;
        }
        
        // Check usage limit
        if (ability.persistence.triggerLimit && usageTracker && usageTracker.timesUsed >= ability.persistence.triggerLimit) {
          canUse[ability.id] = { canUse: false, reason: 'Usage limit reached' };
          continue;
        }
        
        // Check resource costs
        if (ability.costs.aura && resourcePool && resourcePool.aura < ability.costs.aura) {
          canUse[ability.id] = { canUse: false, reason: `Need ${ability.costs.aura} aura` };
          continue;
        }
        
        canUse[ability.id] = { canUse: true };
      }
      
      return {
        abilities,
        canUse,
        resourceStatus: enhancedState.resourcePools[playerId] || {}
      };
      
    } catch (error) {
      console.error('Failed to get player abilities for match:', error);
      return { abilities: [], canUse: {}, resourceStatus: {} };
    }
  }
  
  // ==================== HELPER METHODS ====================
  
  /**
   * Get match data from Firestore
   */
  private static async getMatchData(matchId: string): Promise<any | null> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) return null;
      
      return matchDoc.data();
    } catch (error) {
      console.error('Failed to get match data:', error);
      return null;
    }
  }
  
  /**
   * Get ability definition (placeholder - would integrate with existing ability system)
   */
  private static async getAbilityDefinition(abilityId: string): Promise<EnhancedAbilityEffect | null> {
    try {
      // This would integrate with the existing AbilitiesService
      // For now, return a placeholder
      return null;
    } catch (error) {
      console.error('Failed to get ability definition:', error);
      return null;
    }
  }
  
  /**
   * Get player's loadout abilities (placeholder)
   */
  private static async getPlayerLoadoutAbilities(playerId: string): Promise<EnhancedAbilityEffect[]> {
    try {
      // This would integrate with the existing loadout system
      return [];
    } catch (error) {
      console.error('Failed to get player loadout abilities:', error);
      return [];
    }
  }
  
  /**
   * Get all active matches (placeholder)
   */
  private static async getActiveMatches(): Promise<string[]> {
    try {
      // This would query for matches with status 'in_progress' or similar
      return [];
    } catch (error) {
      console.error('Failed to get active matches:', error);
      return [];
    }
  }
  
  /**
   * Update match with execution results
   */
  private static async updateMatchWithResults(
    matchId: string, 
    enhancedState: EnhancedMatchState, 
    result: any
  ): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'matches', matchId);
        const matchDoc = await transaction.get(matchRef);
        
        if (!matchDoc.exists()) {
          throw new Error('Match not found during update');
        }
        
        const updates: any = {
          'gameData.enhancedState': enhancedState
        };
        
        // Apply any direct game state changes from the ability
        for (const change of result.stateChanges) {
          if (change.type === 'player_aura') {
            if (!updates['gameData.playerAura']) updates['gameData.playerAura'] = {};
            updates[`gameData.playerAura.${change.target}`] = change.newValue;
          }
          // Add more state change mappings as needed
        }
        
        transaction.update(matchRef, updates);
      });
      
    } catch (error) {
      console.error('Failed to update match with results:', error);
      throw error;
    }
  }
  
  // ==================== DEBUGGING AND MONITORING ====================
  
  /**
   * Get comprehensive state summary for debugging
   */
  static async getMatchAbilitiesDebugInfo(matchId: string): Promise<any> {
    try {
      const enhancedState = await this.getEnhancedState(matchId);
      if (!enhancedState) {
        return { error: 'No enhanced state found' };
      }
      
      return {
        matchId,
        isEnhanced: true,
        summary: EnhancedMatchStateManager.getStateSummary(enhancedState),
        activeEffects: enhancedState.activeEffects,
        resourcePools: enhancedState.resourcePools,
        ruleOverrides: enhancedState.ruleOverrides,
        delayedEffects: enhancedState.delayedEffects.length,
        environmentalConditions: enhancedState.environmentalConditions.length,
        recentHistory: EnhancedMatchStateManager.getEffectHistory(enhancedState, {
          since: Timestamp.fromMillis(Date.now() - 60000) // Last minute
        })
      };
      
    } catch (error) {
      console.error('Failed to get debug info:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}