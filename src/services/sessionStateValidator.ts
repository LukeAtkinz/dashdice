import { SessionStatus } from './gameSessionService';

/**
 * 🔄 GameSession State Machine Service
 * Validates session state transitions and prevents invalid state changes
 */

export interface StateTransition {
  from: SessionStatus;
  to: SessionStatus;
  allowed: boolean;
  reason?: string;
  conditions?: string[];
}

export interface StateTransitionContext {
  sessionId: string;
  playerId: string;
  reason?: string;
  participantCount?: number;
  sessionType?: string;
  gameMode?: string;
}

export class SessionStateValidator {
  
  /**
   * 🗺️ Valid state transition map
   */
  private static readonly STATE_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
    // From 'waiting' state
    waiting: ['waiting', 'matched', 'cancelled', 'expired'], // waiting → waiting allowed for friend sessions when guest joins
    
    // From 'matched' state  
    matched: ['active', 'waiting', 'cancelled', 'abandoned'],
    
    // From 'active' state
    active: ['completed', 'abandoned', 'cancelled'],
    
    // From 'completed' state (terminal)
    completed: [], // No further transitions allowed
    
    // From 'cancelled' state (terminal)
    cancelled: [], // No further transitions allowed
    
    // From 'expired' state (terminal)
    expired: [], // No further transitions allowed
    
    // From 'abandoned' state (terminal)
    abandoned: [], // No further transitions allowed
  };

  /**
   * 🔍 Validate if a state transition is allowed
   */
  static validateTransition(
    currentState: SessionStatus,
    newState: SessionStatus,
    context?: StateTransitionContext
  ): {
    valid: boolean;
    reason?: string;
    warnings?: string[];
  } {
    const warnings: string[] = [];
    
    // 🚫 Check basic transition validity
    const allowedStates = this.STATE_TRANSITIONS[currentState];
    if (!allowedStates.includes(newState)) {
      return {
        valid: false,
        reason: `Invalid transition: ${currentState} → ${newState}. Allowed transitions: ${allowedStates.join(', ')}`
      };
    }
    
    // ✅ Additional validation based on transition type
    const validationResult = this.validateSpecificTransition(currentState, newState, context);
    if (!validationResult.valid) {
      return validationResult;
    }
    
    // ⚠️ Add warnings for edge cases
    if (currentState === 'matched' && newState === 'waiting') {
      warnings.push('Player left matched session - opponent returned to waiting');
    }
    
    if (currentState === 'active' && newState === 'abandoned') {
      warnings.push('Active game abandoned - may affect player rankings');
    }
    
    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * 🎯 Validate specific transition rules
   */
  private static validateSpecificTransition(
    from: SessionStatus,
    to: SessionStatus,
    context?: StateTransitionContext
  ): {
    valid: boolean;
    reason?: string;
  } {
    // waiting → matched
    if (from === 'waiting' && to === 'matched') {
      if (context?.participantCount !== 2) {
        return {
          valid: false,
          reason: 'Cannot transition to matched state without exactly 2 participants'
        };
      }
    }
    
    // matched → active
    if (from === 'matched' && to === 'active') {
      // Could add additional checks like both players ready, game started, etc.
      // For now, allow the transition
    }
    
    // matched → waiting (player left)
    if (from === 'matched' && to === 'waiting') {
      if (context?.participantCount === 0) {
        return {
          valid: false,
          reason: 'Cannot return to waiting state with 0 participants - should be cancelled/expired instead'
        };
      }
    }
    
    // active → completed
    if (from === 'active' && to === 'completed') {
      // Could validate that a winner is specified, game actually ended, etc.
      // For now, allow the transition
    }
    
    // Any → abandoned (special case, usually allowed from active/matched)
    if (to === 'abandoned') {
      if (!['matched', 'active'].includes(from)) {
        return {
          valid: false,
          reason: 'Sessions can only be abandoned from matched or active states'
        };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * 📋 Get all possible transitions from current state
   */
  static getPossibleTransitions(currentState: SessionStatus): SessionStatus[] {
    return this.STATE_TRANSITIONS[currentState] || [];
  }
  
  /**
   * 🔍 Check if a state is terminal (no further transitions allowed)
   */
  static isTerminalState(state: SessionStatus): boolean {
    return this.STATE_TRANSITIONS[state].length === 0;
  }
  
  /**
   * 📊 Get state machine statistics
   */
  static getStateMachineInfo(): {
    totalStates: number;
    terminalStates: SessionStatus[];
    transitionCount: number;
    stateMap: Record<SessionStatus, SessionStatus[]>;
  } {
    const terminalStates = Object.entries(this.STATE_TRANSITIONS)
      .filter(([_, transitions]) => transitions.length === 0)
      .map(([state, _]) => state as SessionStatus);
      
    const transitionCount = Object.values(this.STATE_TRANSITIONS)
      .reduce((total, transitions) => total + transitions.length, 0);
    
    return {
      totalStates: Object.keys(this.STATE_TRANSITIONS).length,
      terminalStates,
      transitionCount,
      stateMap: this.STATE_TRANSITIONS
    };
  }
  
  /**
   * 🔄 Suggest automatic state transitions based on conditions
   */
  static suggestTransition(
    currentState: SessionStatus,
    context: StateTransitionContext
  ): {
    suggestedState?: SessionStatus;
    reason?: string;
    automatic?: boolean;
  } {
    // Auto-expire waiting sessions
    if (currentState === 'waiting' && context.reason === 'timeout') {
      return {
        suggestedState: 'expired',
        reason: 'Session expired due to inactivity',
        automatic: true
      };
    }
    
    // Auto-abandon active sessions on disconnection
    if (currentState === 'active' && context.reason === 'player_disconnect') {
      return {
        suggestedState: 'abandoned',
        reason: 'Session abandoned due to player disconnection',
        automatic: true
      };
    }
    
    // Auto-match when second player joins
    if (currentState === 'waiting' && context.participantCount === 2) {
      return {
        suggestedState: 'matched',
        reason: 'Second player joined session',
        automatic: false // Require explicit confirmation
      };
    }
    
    // Auto-return to waiting when player leaves matched session
    if (currentState === 'matched' && context.participantCount === 1 && context.reason === 'player_left') {
      return {
        suggestedState: 'waiting',
        reason: 'Player left matched session, returning to waiting',
        automatic: true
      };
    }
    
    return {};
  }
  
  /**
   * 🛡️ Validate state change with full context checking
   */
  static validateStateChange(
    sessionId: string,
    currentState: SessionStatus,
    newState: SessionStatus,
    context: StateTransitionContext
  ): {
    valid: boolean;
    canProceed: boolean;
    reason?: string;
    warnings?: string[];
    suggestions?: string[];
  } {
    const transitionValidation = this.validateTransition(currentState, newState, context);
    const suggestions: string[] = [];
    
    if (!transitionValidation.valid) {
      // Check if there's a suggested intermediate state
      const suggestion = this.suggestTransition(currentState, context);
      if (suggestion.suggestedState) {
        suggestions.push(`Consider transitioning to '${suggestion.suggestedState}' first: ${suggestion.reason}`);
      }
      
      return {
        valid: false,
        canProceed: false,
        reason: transitionValidation.reason,
        suggestions
      };
    }
    
    // Check for warnings or suggestions
    if (transitionValidation.warnings) {
      suggestions.push(...transitionValidation.warnings);
    }
    
    console.log(`✅ State transition validated: ${currentState} → ${newState} for session ${sessionId}`);
    
    return {
      valid: true,
      canProceed: true,
      warnings: transitionValidation.warnings,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }
}
