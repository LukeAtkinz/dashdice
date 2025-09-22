/**
 * Advanced Bot AI Decision Engine
 * Implements contextual decision making, psychological modeling, and anti-pattern recognition
 */

export interface GameContext {
  // Current game state
  myScore: number;
  opponentScore: number;
  turnScore: number;
  targetScore: number;
  turnNumber: number;
  
  // Calculated context
  myNeedsToWin: number;
  opponentNeedsToWin: number;
  scoreDifference: number;
  gamePhase: 'early' | 'mid' | 'late' | 'endgame';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  advantageState: 'winning' | 'losing' | 'tied' | 'dominant';
  
  // Risk analysis
  riskLevel: number;              // 0.0-1.0
  opportunityScore: number;       // 0.0-1.0
  threatLevel: number;            // 0.0-1.0
  
  // Recent events
  recentRolls: number[];
  consecutiveBusts: number;
  onHotStreak: boolean;
  onColdStreak: boolean;
  
  // Opponent analysis
  opponentLastActions: string[];
  opponentAggression: number;
  opponentPressureResponse: 'aggressive' | 'conservative' | 'unpredictable';
}

export interface DecisionResult {
  action: 'bank' | 'roll';
  confidence: number;             // 0.0-1.0
  reasoning: string;
  emotionalInfluence: number;     // How much emotion affected decision
  thinkingTime: number;           // Realistic delay in ms
  alternativeConsidered: boolean;
  suboptimal: boolean;           // Occasionally make human-like errors
}

export interface BotPersonality {
  // Core traits
  aggressiveness: number;
  bankingTendency: number;
  riskTolerance: number;
  pressureResistance: number;
  
  // Advanced traits
  tiltResistance: number;
  momentumAwareness: number;
  adaptationSpeed: number;
  confidenceLevel: number;
  emotionalVolatility: number;
  
  // Strategic thinking
  bluffDetection: number;
  strategicThinking: number;
  situationalAwareness: number;
}

export interface EmotionalState {
  frustration: number;    // 0.0-1.0
  confidence: number;     // 0.0-1.0
  pressure: number;       // 0.0-1.0
  momentum: number;       // -1.0 to 1.0
  currentMood: 'calm' | 'aggressive' | 'defensive' | 'confident' | 'frustrated';
}

export class BotAIDecisionEngine {
  private botId: string;
  private personality: BotPersonality;
  private emotionalState: EmotionalState;
  private opponentProfile: Map<string, any> = new Map();
  private recentDecisions: DecisionResult[] = [];
  
  constructor(botId: string, personality: BotPersonality, emotionalState: EmotionalState) {
    this.botId = botId;
    this.personality = personality;
    this.emotionalState = emotionalState;
  }
  
  /**
   * Main decision making method
   */
  async makeDecision(gameState: any, opponentId: string): Promise<DecisionResult> {
    // Analyze current game context
    const context = this.analyzeGameContext(gameState, opponentId);
    
    // Update emotional state based on recent events
    this.updateEmotionalState(context, gameState);
    
    // Update opponent profile
    this.updateOpponentProfile(opponentId, gameState);
    
    // Calculate contextual decision
    const decision = this.calculateContextualDecision(context, opponentId);
    
    // Apply anti-pattern measures
    const finalDecision = this.applyAntiPatternMeasures(decision, context);
    
    // Store decision for learning
    this.recentDecisions.push(finalDecision);
    if (this.recentDecisions.length > 10) {
      this.recentDecisions.shift();
    }
    
    return finalDecision;
  }
  
  /**
   * Analyze complete game context
   */
  private analyzeGameContext(gameState: any, opponentId: string): GameContext {
    const myScore = gameState.botScore || 0;
    const opponentScore = gameState.humanScore || 0;
    const turnScore = gameState.currentTurnScore || 0;
    const targetScore = gameState.roundObjective || 100;
    const turnNumber = gameState.turnNumber || 1;
    
    const myNeedsToWin = targetScore - myScore;
    const opponentNeedsToWin = targetScore - opponentScore;
    const scoreDifference = myScore - opponentScore;
    
    // Determine game phase
    const maxScore = Math.max(myScore, opponentScore);
    let gamePhase: 'early' | 'mid' | 'late' | 'endgame';
    if (maxScore < targetScore * 0.3) gamePhase = 'early';
    else if (maxScore < targetScore * 0.6) gamePhase = 'mid';
    else if (maxScore < targetScore * 0.8) gamePhase = 'late';
    else gamePhase = 'endgame';
    
    // Calculate urgency level
    let urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    if (opponentNeedsToWin <= 10) urgencyLevel = 'critical';
    else if (opponentNeedsToWin <= 25) urgencyLevel = 'high';
    else if (opponentNeedsToWin <= 50) urgencyLevel = 'medium';
    else urgencyLevel = 'low';
    
    // Determine advantage state
    let advantageState: 'winning' | 'losing' | 'tied' | 'dominant';
    if (scoreDifference > 30) advantageState = 'dominant';
    else if (scoreDifference > 10) advantageState = 'winning';
    else if (scoreDifference < -10) advantageState = 'losing';
    else advantageState = 'tied';
    
    // Calculate risk and opportunity
    const riskLevel = this.calculateRiskLevel(turnScore, myScore, opponentScore, targetScore);
    const opportunityScore = this.calculateOpportunityScore(turnScore, myScore, opponentScore, targetScore);
    const threatLevel = this.calculateThreatLevel(opponentScore, targetScore, scoreDifference);
    
    return {
      myScore,
      opponentScore,
      turnScore,
      targetScore,
      turnNumber,
      myNeedsToWin,
      opponentNeedsToWin,
      scoreDifference,
      gamePhase,
      urgencyLevel,
      advantageState,
      riskLevel,
      opportunityScore,
      threatLevel,
      recentRolls: gameState.recentRolls || [],
      consecutiveBusts: gameState.consecutiveBusts || 0,
      onHotStreak: gameState.onHotStreak || false,
      onColdStreak: gameState.onColdStreak || false,
      opponentLastActions: gameState.opponentLastActions || [],
      opponentAggression: this.calculateOpponentAggression(opponentId),
      opponentPressureResponse: this.getOpponentPressureResponse(opponentId)
    };
  }
  
  /**
   * Calculate contextual decision based on all factors
   */
  private calculateContextualDecision(context: GameContext, opponentId: string): DecisionResult {
    const { myScore, opponentScore, turnScore, targetScore, urgencyLevel, advantageState } = context;
    
    // CRITICAL DECISION RULES (override personality)
    
    // 1. WINNING OPPORTUNITY: Can I win this turn?
    if (myScore + turnScore >= targetScore) {
      return {
        action: 'bank',
        confidence: 1.0,
        reasoning: 'winning_move',
        emotionalInfluence: 0.0,
        thinkingTime: this.calculateThinkingTime(500, 1500),
        alternativeConsidered: false,
        suboptimal: false
      };
    }
    
    // 2. DESPERATE SITUATION: Opponent very close to winning
    if (context.opponentNeedsToWin <= 15 && context.myNeedsToWin > 30) {
      const aggressiveThreshold = Math.max(20, context.opponentNeedsToWin - 5);
      if (turnScore < aggressiveThreshold) {
        return {
          action: 'roll',
          confidence: 0.8,
          reasoning: 'desperate_catch_up',
          emotionalInfluence: 0.3,
          thinkingTime: this.calculateThinkingTime(800, 2000),
          alternativeConsidered: true,
          suboptimal: false
        };
      }
    }
    
    // 3. SECURE VICTORY: Large lead, play safe
    if (context.scoreDifference > 30 && context.myNeedsToWin > context.opponentNeedsToWin) {
      const safeThreshold = 8 + (this.personality.aggressiveness * 5);
      if (turnScore >= safeThreshold) {
        return {
          action: 'bank',
          confidence: 0.9,
          reasoning: 'protecting_lead',
          emotionalInfluence: 0.1,
          thinkingTime: this.calculateThinkingTime(1000, 2500),
          alternativeConsidered: false,
          suboptimal: false
        };
      }
    }
    
    // 4. ENDGAME PRESSURE: Both players close
    if (context.gamePhase === 'endgame' && Math.min(context.myNeedsToWin, context.opponentNeedsToWin) <= 25) {
      return this.calculateEndgameDecision(context);
    }
    
    // 5. NORMAL GAMEPLAY: Personality-based decisions
    return this.calculatePersonalityBasedDecision(context);
  }
  
  /**
   * Calculate endgame-specific decisions
   */
  private calculateEndgameDecision(context: GameContext): DecisionResult {
    const { myNeedsToWin, opponentNeedsToWin, turnScore } = context;
    const pressure = Math.min(myNeedsToWin, opponentNeedsToWin) / 25;
    
    // Adjust personality for endgame pressure
    const adjustedAggression = this.personality.aggressiveness * (1 + pressure * this.personality.pressureResistance);
    const adjustedRiskTolerance = this.personality.riskTolerance * (1 + pressure * 0.5);
    
    // If opponent is closer to winning, be more aggressive
    if (opponentNeedsToWin < myNeedsToWin) {
      const riskThreshold = Math.min(25, myNeedsToWin * 0.8);
      if (turnScore < riskThreshold) {
        return {
          action: 'roll',
          confidence: 0.7,
          reasoning: 'endgame_pressure_aggressive',
          emotionalInfluence: pressure,
          thinkingTime: this.calculateThinkingTime(1500, 3500),
          alternativeConsidered: true,
          suboptimal: false
        };
      }
    }
    
    // Calculate optimal banking threshold for endgame
    const bankingThreshold = this.calculateDynamicBankingThreshold(context, adjustedAggression);
    
    if (turnScore >= bankingThreshold) {
      return {
        action: 'bank',
        confidence: 0.8,
        reasoning: 'endgame_calculated_bank',
        emotionalInfluence: pressure * 0.5,
        thinkingTime: this.calculateThinkingTime(2000, 4000),
        alternativeConsidered: true,
        suboptimal: false
      };
    } else {
      return {
        action: 'roll',
        confidence: 0.6,
        reasoning: 'endgame_calculated_risk',
        emotionalInfluence: pressure * 0.3,
        thinkingTime: this.calculateThinkingTime(1800, 3200),
        alternativeConsidered: true,
        suboptimal: false
      };
    }
  }
  
  /**
   * Calculate personality-based decisions for normal gameplay
   */
  private calculatePersonalityBasedDecision(context: GameContext): DecisionResult {
    const { turnScore, advantageState } = context;
    
    // Apply emotional modifiers to personality
    const emotionallyAdjustedPersonality = this.applyEmotionalModifiers();
    
    // Calculate dynamic banking threshold
    const bankingThreshold = this.calculateDynamicBankingThreshold(context, emotionallyAdjustedPersonality.aggressiveness);
    
    // Consider momentum and streaks
    const momentumModifier = this.calculateMomentumModifier(context);
    const adjustedThreshold = bankingThreshold + momentumModifier;
    
    let action: 'bank' | 'roll';
    let confidence: number;
    let reasoning: string;
    
    if (turnScore >= adjustedThreshold) {
      action = 'bank';
      confidence = Math.min(0.9, 0.6 + (turnScore - adjustedThreshold) / 20);
      reasoning = this.getPersonalityBankingReason(advantageState, context);
    } else {
      action = 'roll';
      confidence = Math.min(0.8, 0.5 + emotionallyAdjustedPersonality.riskTolerance * 0.4);
      reasoning = this.getPersonalityRollingReason(advantageState, context);
    }
    
    return {
      action,
      confidence,
      reasoning,
      emotionalInfluence: this.calculateEmotionalInfluence(),
      thinkingTime: this.calculatePersonalityThinkingTime(context),
      alternativeConsidered: this.shouldConsiderAlternative(context),
      suboptimal: this.shouldMakeSuboptimalDecision()
    };
  }
  
  /**
   * Calculate dynamic banking threshold based on context
   */
  private calculateDynamicBankingThreshold(context: GameContext, aggressiveness: number): number {
    const baseBankingThreshold = 8 + (this.personality.bankingTendency * 15);
    
    // Situational modifiers
    let modifier = 0;
    
    // Score differential modifier
    if (context.scoreDifference > 20) {
      modifier -= 3; // Bank earlier when ahead
    } else if (context.scoreDifference < -20) {
      modifier += 5; // Take more risks when behind
    }
    
    // Urgency modifier
    switch (context.urgencyLevel) {
      case 'critical':
        modifier += 8;
        break;
      case 'high':
        modifier += 5;
        break;
      case 'medium':
        modifier += 2;
        break;
    }
    
    // Game phase modifier
    if (context.gamePhase === 'early') {
      modifier += 3; // More conservative early
    } else if (context.gamePhase === 'endgame') {
      modifier -= 2; // More aggressive in endgame
    }
    
    // Aggressiveness modifier
    modifier += (0.5 - aggressiveness) * 10;
    
    return Math.max(5, Math.min(25, baseBankingThreshold + modifier));
  }
  
  /**
   * Apply anti-pattern recognition measures
   */
  private applyAntiPatternMeasures(decision: DecisionResult, context: GameContext): DecisionResult {
    // Add response time variation
    const timeVariation = this.calculateTimeVariation(decision, context);
    decision.thinkingTime += timeVariation;
    
    // Occasionally make suboptimal but logical decisions (human-like errors)
    if (this.shouldMakeHumanLikeError()) {
      decision = this.applyHumanLikeError(decision, context);
    }
    
    // Add personality-based hesitation in complex situations
    if (context.riskLevel > 0.7 && this.personality.pressureResistance < 0.6) {
      decision.thinkingTime *= 1.5;
      decision.alternativeConsidered = true;
    }
    
    return decision;
  }
  
  /**
   * Update emotional state based on game events
   */
  private updateEmotionalState(context: GameContext, gameState: any): void {
    const volatility = this.personality.emotionalVolatility;
    
    // Frustration from consecutive busts
    if (context.consecutiveBusts > 0) {
      this.emotionalState.frustration = Math.min(1.0, 
        this.emotionalState.frustration + (context.consecutiveBusts * 0.15 * volatility)
      );
    } else {
      this.emotionalState.frustration = Math.max(0.0, this.emotionalState.frustration - 0.05);
    }
    
    // Confidence from success
    if (context.onHotStreak) {
      this.emotionalState.confidence = Math.min(1.0, 
        this.emotionalState.confidence + (0.1 * this.personality.momentumAwareness)
      );
    }
    
    // Pressure from close games
    if (context.urgencyLevel === 'critical') {
      this.emotionalState.pressure = Math.min(1.0, this.emotionalState.pressure + 0.3);
    } else {
      this.emotionalState.pressure = Math.max(0.0, this.emotionalState.pressure - 0.1);
    }
    
    // Update momentum
    this.emotionalState.momentum = context.onHotStreak ? 
      Math.min(1.0, this.emotionalState.momentum + 0.2) :
      context.onColdStreak ? 
        Math.max(-1.0, this.emotionalState.momentum - 0.2) :
        this.emotionalState.momentum * 0.9;
    
    // Update current mood
    this.updateCurrentMood();
  }
  
  /**
   * Calculate realistic thinking times
   */
  private calculateThinkingTime(min: number, max: number): number {
    const base = min + Math.random() * (max - min);
    
    // Skill level affects thinking speed
    const skillMultiplier = this.getSkillSpeedMultiplier();
    
    // Emotional state affects thinking speed
    const emotionalMultiplier = 1 + (this.emotionalState.pressure * 0.5) - (this.emotionalState.confidence * 0.2);
    
    return Math.floor(base * skillMultiplier * emotionalMultiplier);
  }
  
  /**
   * Helper methods for decision factors
   */
  private calculateRiskLevel(turnScore: number, myScore: number, opponentScore: number, targetScore: number): number {
    const bustProbability = 1/6 + (turnScore > 0 ? 1/36 : 0); // Single 1 + double 6
    const opportunityCost = (targetScore - myScore - turnScore) / targetScore;
    return bustProbability * (1 + opportunityCost);
  }
  
  private calculateOpportunityScore(turnScore: number, myScore: number, opponentScore: number, targetScore: number): number {
    const winPotential = turnScore / (targetScore - myScore);
    const competitivePressure = Math.max(0, (opponentScore - myScore)) / targetScore;
    return Math.min(1.0, winPotential + competitivePressure);
  }
  
  private calculateThreatLevel(opponentScore: number, targetScore: number, scoreDifference: number): number {
    const opponentProgress = opponentScore / targetScore;
    const relativePosition = Math.max(0, -scoreDifference) / targetScore;
    return Math.min(1.0, opponentProgress + relativePosition);
  }
  
  private applyEmotionalModifiers(): BotPersonality {
    const frustrated = this.emotionalState.frustration;
    const confident = this.emotionalState.confidence;
    const pressure = this.emotionalState.pressure;
    
    return {
      ...this.personality,
      aggressiveness: this.personality.aggressiveness * (1 + frustrated * 0.3 + confident * 0.2 - pressure * 0.1),
      riskTolerance: this.personality.riskTolerance * (1 + frustrated * 0.4 + confident * 0.3 - pressure * 0.2),
      bankingTendency: this.personality.bankingTendency * (1 - frustrated * 0.2 + pressure * 0.3)
    };
  }
  
  private calculateMomentumModifier(context: GameContext): number {
    if (!this.personality.momentumAwareness) return 0;
    
    if (context.onHotStreak) {
      return -2 * this.personality.momentumAwareness; // Bank later when hot
    } else if (context.onColdStreak) {
      return 3 * this.personality.momentumAwareness; // Bank earlier when cold
    }
    
    return 0;
  }
  
  private shouldMakeHumanLikeError(): boolean {
    const baseErrorRate = 0.05; // 5% base error rate
    const skillErrorAdjustment = 0.03; // Varies by skill
    const emotionalErrorBoost = this.emotionalState.frustration * 0.02;
    
    const totalErrorRate = baseErrorRate + skillErrorAdjustment + emotionalErrorBoost;
    return Math.random() < totalErrorRate;
  }
  
  private updateCurrentMood(): void {
    const { frustration, confidence, pressure } = this.emotionalState;
    
    if (frustration > 0.7) {
      this.emotionalState.currentMood = 'frustrated';
    } else if (confidence > 0.8) {
      this.emotionalState.currentMood = 'confident';
    } else if (pressure > 0.6) {
      this.emotionalState.currentMood = 'defensive';
    } else if (this.emotionalState.momentum > 0.5) {
      this.emotionalState.currentMood = 'aggressive';
    } else {
      this.emotionalState.currentMood = 'calm';
    }
  }
  
  // Additional helper methods would be implemented here...
  private calculateOpponentAggression(opponentId: string): number { return 0.5; }
  private getOpponentPressureResponse(opponentId: string): 'aggressive' | 'conservative' | 'unpredictable' { return 'unpredictable'; }
  private calculateEmotionalInfluence(): number { return this.emotionalState.frustration + this.emotionalState.pressure; }
  private calculatePersonalityThinkingTime(context: GameContext): number { return this.calculateThinkingTime(1000, 3000); }
  private shouldConsiderAlternative(context: GameContext): boolean { return context.riskLevel > 0.6; }
  private shouldMakeSuboptimalDecision(): boolean { return Math.random() < 0.03; }
  private getPersonalityBankingReason(advantageState: string, context: GameContext): string { return 'personality_based_banking'; }
  private getPersonalityRollingReason(advantageState: string, context: GameContext): string { return 'personality_based_rolling'; }
  private calculateTimeVariation(decision: DecisionResult, context: GameContext): number { return Math.random() * 500 - 250; }
  private applyHumanLikeError(decision: DecisionResult, context: GameContext): DecisionResult { decision.suboptimal = true; return decision; }
  private getSkillSpeedMultiplier(): number { return 1.0; }
  private updateOpponentProfile(opponentId: string, gameState: any): void { /* Implementation */ }
}

export default BotAIDecisionEngine;
