import { Timestamp } from 'firebase/firestore';
import { 
  EnhancedMatchState, 
  ActiveEffect, 
  PlayerResourcePool,
  GameRuleOverride,
  EffectHistoryEntry,
  DelayedEffect,
  EnvironmentalCondition,
  AbilityUsageTracker
} from '@/types/enhancedAbilities';

/**
 * Enhanced Match State Manager
 * 
 * This service manages the complex state required for advanced abilities:
 * - Active effects on players
 * - Resource pools and management
 * - Temporary game rule modifications
 * - Effect history and interactions
 * - Delayed and conditional effects
 * - Environmental conditions
 */
export class EnhancedMatchStateManager {
  
  // ==================== STATE INITIALIZATION ====================
  
  /**
   * Initialize enhanced state for a new match
   */
  static initializeEnhancedState(playerIds: string[]): EnhancedMatchState {
    const enhancedState: EnhancedMatchState = {
      activeEffects: {},
      gameStateModifiers: [],
      abilityUsage: {},
      resourcePools: {},
      ruleOverrides: [],
      effectHistory: [],
      delayedEffects: [],
      environmentalConditions: []
    };
    
    // Initialize for each player
    for (const playerId of playerIds) {
      enhancedState.activeEffects[playerId] = [];
      enhancedState.abilityUsage[playerId] = {};
      enhancedState.resourcePools[playerId] = this.createDefaultResourcePool();
    }
    
    console.log(`🎮 Enhanced match state initialized for ${playerIds.length} players`);
    return enhancedState;
  }
  
  /**
   * Create default resource pool for a player
   */
  private static createDefaultResourcePool(): PlayerResourcePool {
    return {
      aura: 0, // Starts at 0, builds up during match
      health: 100, // Full health to start
      momentum: 0, // Builds up over turns
      focus: 50, // Moderate starting focus
      chaos: 0, // Starts neutral
      temporaryResources: {},
      generationModifiers: {
        aura: 1.0, // Normal generation rate
        momentum: 1.0,
        focus: 1.0,
        chaos: 1.0
      }
    };
  }
  
  // ==================== EFFECT MANAGEMENT ====================
  
  /**
   * Add an active effect to a player
   */
  static addActiveEffect(
    state: EnhancedMatchState, 
    playerId: string, 
    effect: ActiveEffect
  ): boolean {
    try {
      if (!state.activeEffects[playerId]) {
        state.activeEffects[playerId] = [];
      }
      
      // Check if effect is stackable
      if (!effect.effect.persistence.stackable) {
        // Remove existing instances of this effect
        state.activeEffects[playerId] = state.activeEffects[playerId].filter(
          e => e.sourceAbilityId !== effect.sourceAbilityId
        );
      }
      
      // Add the new effect
      state.activeEffects[playerId].push(effect);
      
      // Log to effect history
      this.logEffectHistory(state, {
        timestamp: Timestamp.now(),
        effectId: effect.id,
        abilityId: effect.sourceAbilityId,
        playerId: effect.sourcePlayerId,
        action: 'activated',
        details: {
          targetPlayerId: effect.targetPlayerId,
          duration: effect.remainingDuration
        }
      });
      
      console.log(`✨ Added active effect: ${effect.effect.name} to ${playerId}`);
      return true;
      
    } catch (error) {
      console.error('Failed to add active effect:', error);
      return false;
    }
  }
  
  /**
   * Remove an active effect from a player
   */
  static removeActiveEffect(
    state: EnhancedMatchState, 
    playerId: string, 
    effectId: string
  ): boolean {
    try {
      if (!state.activeEffects[playerId]) return false;
      
      const effectIndex = state.activeEffects[playerId].findIndex(e => e.id === effectId);
      if (effectIndex === -1) return false;
      
      const effect = state.activeEffects[playerId][effectIndex];
      
      // Execute onExpire actions if the effect has them
      if (effect.effect.onExpire) {
        // Would need to integrate with execution engine
        console.log(`🕒 Effect ${effect.effect.name} expired, executing onExpire actions`);
      }
      
      // Remove the effect
      state.activeEffects[playerId].splice(effectIndex, 1);
      
      // Log to effect history
      this.logEffectHistory(state, {
        timestamp: Timestamp.now(),
        effectId: effect.id,
        abilityId: effect.sourceAbilityId,
        playerId: effect.sourcePlayerId,
        action: 'expired',
        details: {}
      });
      
      console.log(`🗑️ Removed active effect: ${effect.effect.name} from ${playerId}`);
      return true;
      
    } catch (error) {
      console.error('Failed to remove active effect:', error);
      return false;
    }
  }
  
  /**
   * Update durations and remove expired effects
   */
  static updateEffectDurations(state: EnhancedMatchState, deltaTime: number): void {
    const currentTime = Timestamp.now();
    
    for (const playerId in state.activeEffects) {
      const effects = state.activeEffects[playerId];
      const expiredEffects: string[] = [];
      
      for (const effect of effects) {
        // Update duration-based effects
        if (effect.remainingDuration !== undefined) {
          effect.remainingDuration -= deltaTime;
          if (effect.remainingDuration <= 0) {
            expiredEffects.push(effect.id);
          }
        }
        
        // Update trigger-based effects
        if (effect.remainingTriggers !== undefined && effect.remainingTriggers <= 0) {
          expiredEffects.push(effect.id);
        }
      }
      
      // Remove expired effects
      for (const effectId of expiredEffects) {
        this.removeActiveEffect(state, playerId, effectId);
      }
    }
  }
  
  /**
   * Get all active effects for a player with optional filtering
   */
  static getActiveEffects(
    state: EnhancedMatchState, 
    playerId: string, 
    filter?: {
      category?: string;
      sourceAbility?: string;
      isHidden?: boolean;
    }
  ): ActiveEffect[] {
    const effects = state.activeEffects[playerId] || [];
    
    if (!filter) return effects;
    
    return effects.filter(effect => {
      if (filter.category && effect.effect.category !== filter.category) return false;
      if (filter.sourceAbility && effect.sourceAbilityId !== filter.sourceAbility) return false;
      if (filter.isHidden !== undefined && effect.isHidden !== filter.isHidden) return false;
      return true;
    });
  }
  
  // ==================== RESOURCE MANAGEMENT ====================
  
  /**
   * Modify player resources with validation and logging
   */
  static modifyPlayerResource(
    state: EnhancedMatchState,
    playerId: string,
    resource: keyof PlayerResourcePool,
    amount: number,
    source: string
  ): boolean {
    try {
      const resourcePool = state.resourcePools[playerId];
      if (!resourcePool) return false;
      
      // Skip complex resources for now
      if (typeof resourcePool[resource] !== 'number') return false;
      
      const oldValue = resourcePool[resource] as number;
      let newValue = oldValue + amount;
      
      // Apply resource constraints
      switch (resource) {
        case 'aura':
          newValue = Math.max(0, Math.min(newValue, 999)); // Cap at 999 aura
          break;
        case 'health':
          newValue = Math.max(0, Math.min(newValue, 100)); // 0-100 health
          break;
        case 'momentum':
          newValue = Math.max(0, Math.min(newValue, 100)); // 0-100 momentum
          break;
        case 'focus':
          newValue = Math.max(0, Math.min(newValue, 100)); // 0-100 focus
          break;
        case 'chaos':
          newValue = Math.max(-50, Math.min(newValue, 50)); // -50 to +50 chaos
          break;
      }
      
      // Update the resource
      (resourcePool[resource] as number) = newValue;
      
      console.log(`💎 ${playerId} ${resource}: ${oldValue} → ${newValue} (${amount >= 0 ? '+' : ''}${amount}) [${source}]`);
      return true;
      
    } catch (error) {
      console.error('Failed to modify player resource:', error);
      return false;
    }
  }
  
  /**
   * Add temporary resource that expires after a time
   */
  static addTemporaryResource(
    state: EnhancedMatchState,
    playerId: string,
    resourceName: string,
    amount: number,
    duration: number
  ): boolean {
    try {
      const resourcePool = state.resourcePools[playerId];
      if (!resourcePool) return false;
      
      const expiresAt = Timestamp.fromMillis(Timestamp.now().toMillis() + duration * 1000);
      resourcePool.temporaryResources[resourceName] = { amount, expiresAt };
      
      console.log(`⏰ Added temporary resource: ${resourceName} (${amount}) to ${playerId} for ${duration}s`);
      return true;
      
    } catch (error) {
      console.error('Failed to add temporary resource:', error);
      return false;
    }
  }
  
  /**
   * Clean up expired temporary resources
   */
  static cleanupTemporaryResources(state: EnhancedMatchState): void {
    const currentTime = Timestamp.now();
    
    for (const playerId in state.resourcePools) {
      const resourcePool = state.resourcePools[playerId];
      const expiredResources: string[] = [];
      
      for (const [resourceName, resource] of Object.entries(resourcePool.temporaryResources)) {
        if (resource.expiresAt <= currentTime) {
          expiredResources.push(resourceName);
        }
      }
      
      // Remove expired resources
      for (const resourceName of expiredResources) {
        delete resourcePool.temporaryResources[resourceName];
        console.log(`🗑️ Expired temporary resource: ${resourceName} for ${playerId}`);
      }
    }
  }
  
  // ==================== GAME RULE OVERRIDES ====================
  
  /**
   * Add a temporary game rule override
   */
  static addRuleOverride(state: EnhancedMatchState, override: GameRuleOverride): boolean {
    try {
      // Check if a higher priority override of the same type already exists
      const existingOverride = state.ruleOverrides.find(
        r => r.ruleType === override.ruleType && r.priority >= override.priority
      );
      
      if (existingOverride) {
        console.log(`⚠️ Rule override blocked by higher priority override: ${override.ruleType}`);
        return false;
      }
      
      // Remove lower priority overrides of the same type
      state.ruleOverrides = state.ruleOverrides.filter(
        r => !(r.ruleType === override.ruleType && r.priority < override.priority)
      );
      
      // Add the new override
      state.ruleOverrides.push(override);
      state.ruleOverrides.sort((a, b) => b.priority - a.priority); // Sort by priority descending
      
      console.log(`🔧 Added rule override: ${override.ruleType} (priority ${override.priority})`);
      return true;
      
    } catch (error) {
      console.error('Failed to add rule override:', error);
      return false;
    }
  }
  
  /**
   * Remove expired rule overrides
   */
  static cleanupRuleOverrides(state: EnhancedMatchState): void {
    const currentTime = Timestamp.now();
    const expiredOverrides: string[] = [];
    
    for (const override of state.ruleOverrides) {
      if (override.endsAt && override.endsAt <= currentTime) {
        expiredOverrides.push(override.id);
      }
    }
    
    // Remove expired overrides
    state.ruleOverrides = state.ruleOverrides.filter(
      override => !expiredOverrides.includes(override.id)
    );
    
    if (expiredOverrides.length > 0) {
      console.log(`🗑️ Removed ${expiredOverrides.length} expired rule overrides`);
    }
  }
  
  /**
   * Get the current effective rule for a given rule type
   */
  static getEffectiveRule(state: EnhancedMatchState, ruleType: string): any {
    const override = state.ruleOverrides.find(r => r.ruleType === ruleType);
    return override ? override.modification : null;
  }
  
  // ==================== DELAYED EFFECTS ====================
  
  /**
   * Add a delayed effect to be triggered later
   */
  static addDelayedEffect(state: EnhancedMatchState, delayedEffect: DelayedEffect): boolean {
    try {
      state.delayedEffects.push(delayedEffect);
      
      console.log(`⏰ Added delayed effect: ${delayedEffect.sourceAbilityId} (triggers at ${delayedEffect.triggerAt.toDate()})`);
      return true;
      
    } catch (error) {
      console.error('Failed to add delayed effect:', error);
      return false;
    }
  }
  
  /**
   * Check and trigger any delayed effects that are ready
   */
  static procesDelayedEffects(state: EnhancedMatchState): DelayedEffect[] {
    const currentTime = Timestamp.now();
    const triggeredEffects: DelayedEffect[] = [];
    const remainingEffects: DelayedEffect[] = [];
    
    for (const delayedEffect of state.delayedEffects) {
      let shouldTrigger = false;
      
      // Check time-based trigger
      if (delayedEffect.triggerAt <= currentTime) {
        shouldTrigger = true;
      }
      
      // Check condition-based trigger
      if (delayedEffect.triggerCondition) {
        // Would need to implement condition checking
        // For now, assume condition is met if time has passed
        shouldTrigger = shouldTrigger || (delayedEffect.triggerAt <= currentTime);
      }
      
      if (shouldTrigger) {
        triggeredEffects.push(delayedEffect);
        console.log(`⚡ Triggering delayed effect: ${delayedEffect.sourceAbilityId}`);
      } else {
        remainingEffects.push(delayedEffect);
      }
    }
    
    // Update the delayed effects list
    state.delayedEffects = remainingEffects;
    
    return triggeredEffects;
  }
  
  // ==================== ENVIRONMENTAL CONDITIONS ====================
  
  /**
   * Add an environmental condition to the match
   */
  static addEnvironmentalCondition(state: EnhancedMatchState, condition: EnvironmentalCondition): boolean {
    try {
      state.environmentalConditions.push(condition);
      
      console.log(`🌍 Added environmental condition: ${condition.name}`);
      return true;
      
    } catch (error) {
      console.error('Failed to add environmental condition:', error);
      return false;
    }
  }
  
  /**
   * Get environmental conditions that affect a specific player
   */
  static getEnvironmentalConditionsForPlayer(state: EnhancedMatchState, playerId: string): EnvironmentalCondition[] {
    return state.environmentalConditions.filter(condition => 
      condition.affectedPlayers === 'all' || condition.affectedPlayers.includes(playerId)
    );
  }
  
  // ==================== ABILITY USAGE TRACKING ====================
  
  /**
   * Track ability usage for a player
   */
  static trackAbilityUsage(
    state: EnhancedMatchState,
    playerId: string,
    abilityId: string,
    success: boolean,
    resourcesSpent: { [resource: string]: number },
    targetsAffected: string[]
  ): void {
    try {
      if (!state.abilityUsage[playerId]) {
        state.abilityUsage[playerId] = {};
      }
      
      if (!state.abilityUsage[playerId][abilityId]) {
        state.abilityUsage[playerId][abilityId] = {
          timesUsed: 0,
          successfulActivations: 0,
          resourcesSpent: {},
          targetsAffected: []
        };
      }
      
      const tracker = state.abilityUsage[playerId][abilityId];
      tracker.timesUsed++;
      tracker.lastUsedAt = Timestamp.now();
      
      if (success) {
        tracker.successfulActivations++;
      }
      
      // Aggregate resources spent
      for (const [resource, amount] of Object.entries(resourcesSpent)) {
        tracker.resourcesSpent[resource] = (tracker.resourcesSpent[resource] || 0) + amount;
      }
      
      // Track unique targets
      for (const target of targetsAffected) {
        if (!tracker.targetsAffected.includes(target)) {
          tracker.targetsAffected.push(target);
        }
      }
      
    } catch (error) {
      console.error('Failed to track ability usage:', error);
    }
  }
  
  // ==================== UTILITY METHODS ====================
  
  /**
   * Log an entry to the effect history
   */
  private static logEffectHistory(state: EnhancedMatchState, entry: EffectHistoryEntry): void {
    state.effectHistory.push(entry);
    
    // Keep history size manageable (last 100 entries)
    if (state.effectHistory.length > 100) {
      state.effectHistory = state.effectHistory.slice(-100);
    }
  }
  
  /**
   * Get effect interaction history for analysis
   */
  static getEffectHistory(state: EnhancedMatchState, filter?: {
    playerId?: string;
    abilityId?: string;
    action?: string;
    since?: Timestamp;
  }): EffectHistoryEntry[] {
    let history = state.effectHistory;
    
    if (!filter) return history;
    
    return history.filter(entry => {
      if (filter.playerId && entry.playerId !== filter.playerId) return false;
      if (filter.abilityId && entry.abilityId !== filter.abilityId) return false;
      if (filter.action && entry.action !== filter.action) return false;
      if (filter.since && entry.timestamp < filter.since) return false;
      return true;
    });
  }
  
  /**
   * Perform periodic cleanup of all timed elements
   */
  static performPeriodicCleanup(state: EnhancedMatchState): void {
    this.updateEffectDurations(state, 1); // Assume 1 second delta
    this.cleanupTemporaryResources(state);
    this.cleanupRuleOverrides(state);
    
    // Process any ready delayed effects
    const triggeredEffects = this.procesDelayedEffects(state);
    if (triggeredEffects.length > 0) {
      // These would need to be executed by the ability execution engine
      console.log(`🎯 ${triggeredEffects.length} delayed effects ready for execution`);
    }
  }
  
  /**
   * Get a summary of the current enhanced state for debugging
   */
  static getStateSummary(state: EnhancedMatchState): any {
    return {
      activeEffectsCount: Object.values(state.activeEffects).reduce((sum, effects) => sum + effects.length, 0),
      totalResourcePools: Object.keys(state.resourcePools).length,
      activeRuleOverrides: state.ruleOverrides.length,
      delayedEffectsCount: state.delayedEffects.length,
      environmentalConditionsCount: state.environmentalConditions.length,
      effectHistorySize: state.effectHistory.length
    };
  }
}