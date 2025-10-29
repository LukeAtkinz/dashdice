import {
  EnhancedAbilityEffect,
  AbilityExecutionContext,
  AbilityExecutionResult,
  ActiveEffect,
  StateChange,
  EffectAction,
  SideEffect,
  ActivationRequirement,
  PlayerStateRequirement,
  GameStateRequirement,
  EnhancedMatchState,
  DelayedEffect,
  EnvironmentalCondition,
  GameRuleOverride
} from '@/types/enhancedAbilities';
import { Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';

/**
 * Advanced Ability Execution Engine
 * 
 * This engine handles the execution of complex abilities with:
 * - Multi-step validation
 * - Complex condition checking
 * - State management and persistence
 * - Effect stacking and interaction
 * - Resource management
 * - Error handling and rollback
 */
export class AbilityExecutionEngine {
  
  // ==================== MAIN EXECUTION PIPELINE ====================
  
  /**
   * Execute an ability with full validation and state management
   */
  static async executeAbility(context: AbilityExecutionContext): Promise<AbilityExecutionResult> {
    const startTime = Date.now();
    const result: AbilityExecutionResult = {
      success: false,
      stateChanges: [],
      appliedEffects: [],
      resourceCosts: {},
      sideEffects: [],
      feedback: {
        animations: [],
        sounds: [],
        messages: [],
        visualEffects: []
      },
      executionTime: 0,
      stepsExecuted: 0,
      validationsPassed: 0
    };

    try {
      console.log(`🔮 Starting ability execution: ${context.ability.name} by ${context.executingPlayerId}`);
      
      // Phase 1: Pre-execution validation
      const validationResult = await this.validateExecution(context);
      if (!validationResult.valid) {
        result.errorMessage = validationResult.reason;
        return result;
      }
      result.validationsPassed = validationResult.checksPass;
      
      // Phase 2: Resource cost calculation and deduction
      const resourceResult = await this.processResourceCosts(context);
      if (!resourceResult.success) {
        result.errorMessage = resourceResult.error;
        return result;
      }
      result.resourceCosts = resourceResult.costs;
      result.stateChanges.push(...resourceResult.stateChanges);
      
      // Phase 3: Execute ability effects
      const effectsResult = await this.executeEffects(context);
      if (!effectsResult.success) {
        // Rollback resource costs
        await this.rollbackChanges(context, result.stateChanges);
        result.errorMessage = effectsResult.error;
        return result;
      }
      result.appliedEffects = effectsResult.appliedEffects;
      result.stateChanges.push(...effectsResult.stateChanges);
      result.stepsExecuted = effectsResult.stepsExecuted;
      
      // Phase 4: Process side effects
      const sideEffectsResult = await this.processSideEffects(context, result);
      result.sideEffects = sideEffectsResult.sideEffects;
      result.stateChanges.push(...sideEffectsResult.stateChanges);
      
      // Phase 5: Update persistent state
      await this.updateMatchState(context, result);
      
      // Phase 6: Generate feedback
      result.feedback = this.generateFeedback(context, result);
      
      result.success = true;
      console.log(`✅ Ability execution completed successfully: ${context.ability.name}`);
      
    } catch (error) {
      console.error(`❌ Ability execution failed: ${context.ability.name}`, error);
      result.errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      
      // Attempt rollback
      try {
        await this.rollbackChanges(context, result.stateChanges);
      } catch (rollbackError) {
        console.error('❌ Failed to rollback changes:', rollbackError);
      }
    }
    
    result.executionTime = Date.now() - startTime;
    return result;
  }
  
  // ==================== VALIDATION SYSTEM ====================
  
  /**
   * Comprehensive validation system for ability execution
   */
  private static async validateExecution(context: AbilityExecutionContext): Promise<{
    valid: boolean;
    reason?: string;
    checksPass: number;
  }> {
    let checksPass = 0;
    
    try {
      // Basic ability validation
      if (!context.ability || !context.ability.id) {
        return { valid: false, reason: 'Invalid ability data', checksPass };
      }
      checksPass++;
      
      // Player validation
      if (!context.executingPlayerId) {
        return { valid: false, reason: 'No executing player specified', checksPass };
      }
      checksPass++;
      
      // Timing validation
      const timingValid = await this.validateTiming(context);
      if (!timingValid.valid) {
        return { valid: false, reason: timingValid.reason, checksPass };
      }
      checksPass++;
      
      // Resource availability validation
      const resourceValid = await this.validateResources(context);
      if (!resourceValid.valid) {
        return { valid: false, reason: resourceValid.reason, checksPass };
      }
      checksPass++;
      
      // Activation conditions validation
      const conditionsValid = await this.validateActivationConditions(context);
      if (!conditionsValid.valid) {
        return { valid: false, reason: conditionsValid.reason, checksPass };
      }
      checksPass++;
      
      // Target validation
      const targetsValid = await this.validateTargets(context);
      if (!targetsValid.valid) {
        return { valid: false, reason: targetsValid.reason, checksPass };
      }
      checksPass++;
      
      // Effect conflict validation
      const conflictValid = await this.validateEffectConflicts(context);
      if (!conflictValid.valid) {
        return { valid: false, reason: conflictValid.reason, checksPass };
      }
      checksPass++;
      
      return { valid: true, checksPass };
      
    } catch (error) {
      console.error('Validation error:', error);
      return { valid: false, reason: 'Validation system error', checksPass };
    }
  }
  
  /**
   * Validate ability timing constraints
   */
  private static async validateTiming(context: AbilityExecutionContext): Promise<{ valid: boolean; reason?: string }> {
    const { ability, matchState } = context;
    
    // Check phase timing
    for (const timing of ability.activationConditions.timing) {
      // Implementation depends on current game phase
      // This is a simplified version - full implementation would check actual game state
      if (timing.phase === 'opponent_turn') {
        // Check if it's actually opponent's turn
        // This would integrate with the actual turn system
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Validate resource availability
   */
  private static async validateResources(context: AbilityExecutionContext): Promise<{ valid: boolean; reason?: string }> {
    const { ability, executingPlayerId, matchState } = context;
    const playerResources = matchState.resourcePools[executingPlayerId];
    
    if (!playerResources) {
      return { valid: false, reason: 'Player resource pool not found' };
    }
    
    // Check aura cost
    if (ability.costs.aura && playerResources.aura < ability.costs.aura) {
      return { valid: false, reason: `Insufficient aura: need ${ability.costs.aura}, have ${playerResources.aura}` };
    }
    
    // Check health cost
    if (ability.costs.health && playerResources.health < ability.costs.health) {
      return { valid: false, reason: `Insufficient health: need ${ability.costs.health}, have ${playerResources.health}` };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate activation conditions
   */
  private static async validateActivationConditions(context: AbilityExecutionContext): Promise<{ valid: boolean; reason?: string }> {
    const { ability } = context;
    
    // Check general requirements
    for (const requirement of ability.activationConditions.requirements) {
      const conditionMet = await this.checkActivationRequirement(context, requirement);
      if (!conditionMet) {
        return { valid: false, reason: `Activation requirement not met: ${requirement.description}` };
      }
    }
    
    // Check player state requirements
    if (ability.activationConditions.playerState) {
      for (const requirement of ability.activationConditions.playerState) {
        const conditionMet = await this.checkPlayerStateRequirement(context, requirement);
        if (!conditionMet) {
          return { valid: false, reason: `Player state requirement not met` };
        }
      }
    }
    
    // Check game state requirements
    if (ability.activationConditions.gameState) {
      for (const requirement of ability.activationConditions.gameState) {
        const conditionMet = await this.checkGameStateRequirement(context, requirement);
        if (!conditionMet) {
          return { valid: false, reason: `Game state requirement not met` };
        }
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Validate targets for the ability
   */
  private static async validateTargets(context: AbilityExecutionContext): Promise<{ valid: boolean; reason?: string }> {
    const { ability, targetPlayerIds } = context;
    
    if (ability.targeting.type === 'self' && targetPlayerIds.length !== 1) {
      return { valid: false, reason: 'Self-targeting ability requires exactly one target (self)' };
    }
    
    if (ability.targeting.maxTargets && targetPlayerIds.length > ability.targeting.maxTargets) {
      return { valid: false, reason: `Too many targets: max ${ability.targeting.maxTargets}, got ${targetPlayerIds.length}` };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate that ability doesn't conflict with active effects
   */
  private static async validateEffectConflicts(context: AbilityExecutionContext): Promise<{ valid: boolean; reason?: string }> {
    const { ability, executingPlayerId, matchState } = context;
    const activeEffects = matchState.activeEffects[executingPlayerId] || [];
    
    // Check if ability is blocked by active effects
    for (const effect of activeEffects) {
      if (effect.suppressesOtherEffects.includes(ability.id)) {
        return { valid: false, reason: `Ability blocked by active effect: ${effect.effect.name}` };
      }
    }
    
    // Check cooldowns
    const usageTracker = matchState.abilityUsage[executingPlayerId]?.[ability.id];
    if (usageTracker?.cooldownEndsAt && usageTracker.cooldownEndsAt > Timestamp.now()) {
      return { valid: false, reason: 'Ability is on cooldown' };
    }
    
    return { valid: true };
  }
  
  // ==================== RESOURCE MANAGEMENT ====================
  
  /**
   * Process resource costs for ability execution
   */
  private static async processResourceCosts(context: AbilityExecutionContext): Promise<{
    success: boolean;
    error?: string;
    costs: { [resource: string]: number };
    stateChanges: StateChange[];
  }> {
    const { ability, executingPlayerId, matchState } = context;
    const stateChanges: StateChange[] = [];
    const costs: { [resource: string]: number } = {};
    
    try {
      const playerResources = matchState.resourcePools[executingPlayerId];
      
      // Deduct aura cost
      if (ability.costs.aura) {
        const oldAura = playerResources.aura;
        playerResources.aura -= ability.costs.aura;
        costs.aura = ability.costs.aura;
        
        stateChanges.push({
          type: 'resource_pool',
          target: executingPlayerId,
          property: 'aura',
          oldValue: oldAura,
          newValue: playerResources.aura,
          source: ability.id
        });
      }
      
      // Deduct health cost
      if (ability.costs.health) {
        const oldHealth = playerResources.health;
        playerResources.health -= ability.costs.health;
        costs.health = ability.costs.health;
        
        stateChanges.push({
          type: 'resource_pool',
          target: executingPlayerId,
          property: 'health',
          oldValue: oldHealth,
          newValue: playerResources.health,
          source: ability.id
        });
      }
      
      return { success: true, costs, stateChanges };
      
    } catch (error) {
      return { success: false, error: 'Failed to process resource costs', costs, stateChanges };
    }
  }
  
  // ==================== EFFECT EXECUTION ====================
  
  /**
   * Execute all effects of an ability
   */
  private static async executeEffects(context: AbilityExecutionContext): Promise<{
    success: boolean;
    error?: string;
    appliedEffects: ActiveEffect[];
    stateChanges: StateChange[];
    stepsExecuted: number;
  }> {
    const { ability } = context;
    const appliedEffects: ActiveEffect[] = [];
    const stateChanges: StateChange[] = [];
    let stepsExecuted = 0;
    
    try {
      // Execute immediate effects
      for (const effect of ability.effects) {
        const effectResult = await this.executeEffectAction(context, effect);
        if (!effectResult.success) {
          return { success: false, error: effectResult.error, appliedEffects, stateChanges, stepsExecuted };
        }
        
        stateChanges.push(...effectResult.stateChanges);
        stepsExecuted++;
      }
      
      // Create persistent effects
      if (ability.persistence.duration !== 0) {
        const activeEffect = this.createActiveEffect(context);
        appliedEffects.push(activeEffect);
        context.matchState.activeEffects[context.executingPlayerId] = 
          context.matchState.activeEffects[context.executingPlayerId] || [];
        context.matchState.activeEffects[context.executingPlayerId].push(activeEffect);
      }
      
      return { success: true, appliedEffects, stateChanges, stepsExecuted };
      
    } catch (error) {
      return { success: false, error: 'Effect execution failed', appliedEffects, stateChanges, stepsExecuted };
    }
  }
  
  /**
   * Execute a single effect action
   */
  private static async executeEffectAction(context: AbilityExecutionContext, action: EffectAction): Promise<{
    success: boolean;
    error?: string;
    stateChanges: StateChange[];
  }> {
    const stateChanges: StateChange[] = [];
    
    try {
      // Check action conditions
      if (action.conditions) {
        for (const condition of action.conditions) {
          const conditionMet = await this.checkActionCondition(context, condition);
          if (!conditionMet) {
            return { success: true, stateChanges }; // Condition not met, skip action but don't fail
          }
        }
      }
      
      // Check probability
      if (action.probability && Math.random() > action.probability) {
        return { success: true, stateChanges }; // Failed probability check, skip action
      }
      
      // Execute the action based on its type
      const actionResult = await this.performActionByType(context, action);
      if (!actionResult.success) {
        return { success: false, error: actionResult.error, stateChanges };
      }
      
      stateChanges.push(...actionResult.stateChanges);
      return { success: true, stateChanges };
      
    } catch (error) {
      return { success: false, error: 'Action execution failed', stateChanges };
    }
  }
  
  // ==================== HELPER METHODS ====================
  
  /**
   * Check an activation requirement
   */
  private static async checkActivationRequirement(context: AbilityExecutionContext, requirement: ActivationRequirement): Promise<boolean> {
    // Implementation would check specific requirement types
    // This is a simplified version
    return true;
  }
  
  /**
   * Check a player state requirement
   */
  private static async checkPlayerStateRequirement(context: AbilityExecutionContext, requirement: PlayerStateRequirement): Promise<boolean> {
    // Implementation would check player state
    return true;
  }
  
  /**
   * Check a game state requirement
   */
  private static async checkGameStateRequirement(context: AbilityExecutionContext, requirement: GameStateRequirement): Promise<boolean> {
    // Implementation would check game state
    return true;
  }
  
  /**
   * Check an action condition
   */
  private static async checkActionCondition(context: AbilityExecutionContext, condition: any): Promise<boolean> {
    // Implementation would check action conditions
    return true;
  }
  
  /**
   * Perform an action based on its type
   */
  private static async performActionByType(context: AbilityExecutionContext, action: EffectAction): Promise<{
    success: boolean;
    error?: string;
    stateChanges: StateChange[];
  }> {
    const stateChanges: StateChange[] = [];
    
    switch (action.actionType) {
      case 'modify_score':
        return await this.handleScoreModification(context, action, stateChanges);
      case 'modify_aura':
        return await this.handleAuraModification(context, action, stateChanges);
      case 'steal_ability':
        return await this.handleAbilityTheft(context, action, stateChanges);
      // Add more action type handlers as needed
      default:
        return { success: false, error: `Unknown action type: ${action.actionType}`, stateChanges };
    }
  }
  
  /**
   * Handle score modification actions
   */
  private static async handleScoreModification(context: AbilityExecutionContext, action: EffectAction, stateChanges: StateChange[]): Promise<{
    success: boolean;
    error?: string;
    stateChanges: StateChange[];
  }> {
    // Implementation for score modification
    return { success: true, stateChanges };
  }
  
  /**
   * Handle aura modification actions
   */
  private static async handleAuraModification(context: AbilityExecutionContext, action: EffectAction, stateChanges: StateChange[]): Promise<{
    success: boolean;
    error?: string;
    stateChanges: StateChange[];
  }> {
    // Implementation for aura modification
    return { success: true, stateChanges };
  }
  
  /**
   * Handle ability theft actions
   */
  private static async handleAbilityTheft(context: AbilityExecutionContext, action: EffectAction, stateChanges: StateChange[]): Promise<{
    success: boolean;
    error?: string;
    stateChanges: StateChange[];
  }> {
    // Implementation for ability theft
    return { success: true, stateChanges };
  }
  
  /**
   * Create an active effect from the ability
   */
  private static createActiveEffect(context: AbilityExecutionContext): ActiveEffect {
    return {
      id: `${context.ability.id}_${Date.now()}`,
      sourceAbilityId: context.ability.id,
      sourcePlayerId: context.executingPlayerId,
      targetPlayerId: context.targetPlayerIds[0],
      effect: context.ability,
      startTime: Timestamp.now(),
      remainingDuration: context.ability.persistence.duration,
      remainingTriggers: context.ability.persistence.triggerLimit,
      stackCount: 1,
      persistentData: {},
      isHidden: context.ability.metadata?.isHidden || false,
      canBeDispelled: true,
      suppressesOtherEffects: context.ability.persistence.overrides || []
    };
  }
  
  /**
   * Process side effects of ability execution
   */
  private static async processSideEffects(context: AbilityExecutionContext, result: AbilityExecutionResult): Promise<{
    sideEffects: SideEffect[];
    stateChanges: StateChange[];
  }> {
    const sideEffects: SideEffect[] = [];
    const stateChanges: StateChange[] = [];
    
    // Check for side effects from the ability
    if (context.ability.sideEffects) {
      for (const sideEffect of context.ability.sideEffects) {
        if (Math.random() <= sideEffect.probability) {
          sideEffects.push(sideEffect);
          // Execute side effect
          for (const action of sideEffect.effects) {
            const actionResult = await this.executeEffectAction(context, action);
            if (actionResult.success) {
              stateChanges.push(...actionResult.stateChanges);
            }
          }
        }
      }
    }
    
    return { sideEffects, stateChanges };
  }
  
  /**
   * Update match state in Firestore
   */
  private static async updateMatchState(context: AbilityExecutionContext, result: AbilityExecutionResult): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'matches', context.matchId);
        const matchDoc = await transaction.get(matchRef);
        
        if (!matchDoc.exists()) {
          throw new Error('Match not found');
        }
        
        const matchData = matchDoc.data();
        
        // Update match data with new state
        matchData.gameData.enhancedState = context.matchState;
        
        // Apply state changes
        for (const change of result.stateChanges) {
          // Apply changes to match data structure
          this.applyStateChangeToMatchData(matchData, change);
        }
        
        transaction.update(matchRef, matchData);
      });
      
    } catch (error) {
      console.error('Failed to update match state:', error);
      throw error;
    }
  }
  
  /**
   * Apply a state change to match data
   */
  private static applyStateChangeToMatchData(matchData: any, change: StateChange): void {
    // Implementation depends on the specific change type and match data structure
    switch (change.type) {
      case 'player_aura':
        if (!matchData.gameData.playerAura) matchData.gameData.playerAura = {};
        matchData.gameData.playerAura[change.target] = change.newValue;
        break;
      // Add more state change handlers as needed
    }
  }
  
  /**
   * Generate feedback for the UI
   */
  private static generateFeedback(context: AbilityExecutionContext, result: AbilityExecutionResult): {
    animations: string[];
    sounds: string[];
    messages: string[];
    visualEffects: any[];
  } {
    const feedback: {
      animations: string[];
      sounds: string[];
      messages: string[];
      visualEffects: any[];
    } = {
      animations: [],
      sounds: [],
      messages: [],
      visualEffects: []
    };
    
    // Add ability activation animation
    if (context.ability.animations?.activation) {
      feedback.animations.push(context.ability.animations.activation);
    }
    
    // Add success message
    feedback.messages.push(`${context.ability.name} activated successfully!`);
    
    // Add resource cost feedback
    if (result.resourceCosts.aura) {
      feedback.messages.push(`Spent ${result.resourceCosts.aura} aura`);
    }
    
    return feedback;
  }
  
  /**
   * Rollback changes in case of failure
   */
  private static async rollbackChanges(context: AbilityExecutionContext, stateChanges: StateChange[]): Promise<void> {
    try {
      // Reverse all state changes
      for (const change of stateChanges.reverse()) {
        // Restore old values
        this.applyStateChangeToMatchData(context.matchState as any, {
          ...change,
          newValue: change.oldValue,
          oldValue: change.newValue
        });
      }
      
      console.log(`🔄 Rolled back ${stateChanges.length} state changes`);
      
    } catch (error) {
      console.error('Failed to rollback changes:', error);
      throw error;
    }
  }
}