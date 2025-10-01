import { BotProfile, BotDecision, BotDecisionContext } from '@/types/bot';

/**
 * Bot AI Service
 * Provides intelligent gameplay decisions based on bot personality and context
 */
export class BotAIService {
  
  /**
   * 🧠 Make a gameplay decision for a bot
   */
  static makeDecision(bot: BotProfile, context: BotDecisionContext): BotDecision {
    try {
      console.log(`🤖 ${bot.displayName} making decision:`, {
        turnScore: context.turnScore,
        currentScore: context.currentScore,
        opponentScore: context.opponentScore,
        diceRolls: context.diceRolls
      });
      
      // Calculate base probabilities
      const bankProbability = this.calculateBankProbability(bot, context);
      const rollProbability = 1 - bankProbability;
      
      // Apply personality modifications
      const modifiedBankProb = this.applyPersonalityModifications(bot, context, bankProbability);
      
      // Apply emotional state adjustments
      const finalBankProb = this.applyEmotionalAdjustments(bot, context, modifiedBankProb);
      
      // 🛡️ CRITICAL: Can't bank if there's no score to bank
      if (context.turnScore === 0) {
        return {
          action: 'roll',
          confidence: 0.9,
          reasoning: 'Must roll first - no score to bank',
          emotionalState: 'focused',
          delayMs: 600 + Math.random() * 800
        };
      }
      
      // Make final decision
      const shouldBank = Math.random() < finalBankProb;
      
      // Calculate confidence based on how decisive the probability is
      const confidence = Math.abs(finalBankProb - 0.5) * 2; // 0.5 = uncertain, 0 or 1 = certain
      
      // Generate reasoning for debugging
      const reasoning = this.generateReasoning(bot, context, finalBankProb, shouldBank);
      
      // Determine emotional state for personality simulation
      const emotionalState = this.determineEmotionalState(bot, context);
      
      // Add realistic thinking delay
      const delayMs = this.calculateThinkingDelay(bot, context, confidence);
      
      return {
        action: shouldBank ? 'bank' : 'roll',
        confidence: Math.max(0.1, Math.min(0.95, confidence)), // Clamp to reasonable range
        reasoning,
        emotionalState,
        delayMs
      };
      
    } catch (error) {
      console.error(`❌ Error making bot decision for ${bot.displayName}:`, error);
      
      // Fallback to safe decision
      return {
        action: context.turnScore > 15 ? 'bank' : 'roll',
        confidence: 0.3,
        reasoning: 'Fallback decision due to error',
        emotionalState: 'confused'
      };
    }
  }
  
  /**
   * 📊 Calculate base banking probability based on context
   */
  private static calculateBankProbability(bot: BotProfile, context: BotDecisionContext): number {
    let bankProb = 0.5; // Start neutral
    
    // Game phase considerations
    const gameProgress = context.currentScore / context.targetScore;
    const opponentProgress = context.opponentScore / context.targetScore;
    
    // Turn score factor (higher turn score = more likely to bank)
    const turnScoreFactor = Math.min(1, context.turnScore / 30); // Normalize to 30 points
    bankProb += turnScoreFactor * 0.3;
    
    // Risk assessment based on turn length
    const riskFactor = Math.min(1, context.diceRolls / 8); // More rolls = more risk
    bankProb += riskFactor * 0.2;
    
    // Game phase adjustments
    if (gameProgress > 0.8) {
      // Late game - more conservative
      bankProb += 0.15;
    } else if (gameProgress < 0.3) {
      // Early game - can afford more risk
      bankProb -= 0.1;
    }
    
    // Opponent pressure
    if (opponentProgress > gameProgress + 0.2) {
      // Far behind - need to take more risks
      bankProb -= 0.2;
    } else if (opponentProgress < gameProgress - 0.2) {
      // Far ahead - can be more conservative
      bankProb += 0.15;
    }
    
    // Strategic thresholds based on bot's strategy
    const thresholds = this.getStrategicThresholds(bot, context);
    if (context.turnScore >= thresholds.currentThreshold) {
      bankProb += 0.3; // Strong tendency to bank at threshold
    }
    
    return Math.max(0.05, Math.min(0.95, bankProb));
  }
  
  /**
   * 🎭 Apply personality modifications to banking probability
   */
  private static applyPersonalityModifications(
    bot: BotProfile, 
    context: BotDecisionContext, 
    baseProbability: number
  ): number {
    let modifiedProb = baseProbability;
    
    // Aggressiveness (less aggressive = more likely to bank early)
    const aggressivenessFactor = (1 - bot.personality.aggressiveness) * 0.2;
    modifiedProb += aggressivenessFactor;
    
    // Banking tendency (direct influence on banking behavior)
    const bankingFactor = (bot.personality.bankingTendency - 0.5) * 0.3;
    modifiedProb += bankingFactor;
    
    // Risk tolerance (lower risk tolerance = bank sooner)
    const riskFactor = (1 - bot.personality.riskTolerance) * 0.25;
    modifiedProb += riskFactor;
    
    // Pressure resistance (under pressure situations)
    if (this.isUnderPressure(context)) {
      const pressureFactor = (bot.personality.pressureResistance - 0.5) * 0.2;
      modifiedProb -= pressureFactor; // High pressure resistance = less likely to panic-bank
    }
    
    // Momentum awareness
    if (this.hasPositiveMomentum(context)) {
      const momentumFactor = bot.personality.momentumAwareness * 0.1;
      modifiedProb -= momentumFactor; // Aware of momentum = more likely to continue
    }
    
    return Math.max(0.05, Math.min(0.95, modifiedProb));
  }
  
  /**
   * 😊 Apply emotional state adjustments
   */
  private static applyEmotionalAdjustments(
    bot: BotProfile,
    context: BotDecisionContext,
    baseProbability: number
  ): number {
    let adjustedProb = baseProbability;
    
    // Emotional volatility can cause deviations from normal behavior
    const volatility = bot.personality.emotionalVolatility;
    
    if (volatility > 0.5) {
      // High volatility bots are more unpredictable
      const emotionalSwing = (Math.random() - 0.5) * volatility * 0.3;
      adjustedProb += emotionalSwing;
      
      // Tilt resistance affects recovery from bad situations
      if (this.isTiltingCondition(context)) {
        const tiltEffect = (1 - bot.personality.tiltResistance) * 0.2;
        adjustedProb += Math.random() < 0.5 ? tiltEffect : -tiltEffect; // Random tilt behavior
      }
    }
    
    return Math.max(0.05, Math.min(0.95, adjustedProb));
  }
  
  /**
   * 🎯 Get strategic thresholds based on bot strategy and game context
   */
  private static getStrategicThresholds(bot: BotProfile, context: BotDecisionContext) {
    const strategy = bot.strategy;
    const gameProgress = context.currentScore / context.targetScore;
    const opponentProgress = context.opponentScore / context.targetScore;
    
    let currentThreshold: number;
    
    // Determine game phase
    if (gameProgress < 0.3) {
      currentThreshold = strategy.bankingThresholds.early;
    } else if (gameProgress > 0.7) {
      currentThreshold = strategy.bankingThresholds.late;
    } else {
      currentThreshold = strategy.bankingThresholds.mid;
    }
    
    // Adjust for desperation
    if (opponentProgress > gameProgress + 0.3) {
      currentThreshold = strategy.bankingThresholds.desperation;
    }
    
    // Apply risk factors
    const opponentScoreFactor = strategy.riskFactors.opponentScore;
    const turnLengthFactor = strategy.riskFactors.turnLength;
    const gamePhaseFactor = strategy.riskFactors.gamePhase;
    
    // Adjust threshold based on factors
    if (context.opponentScore > context.currentScore) {
      currentThreshold *= (1 + opponentScoreFactor);
    }
    
    if (context.diceRolls > 5) {
      currentThreshold *= (1 - turnLengthFactor);
    }
    
    return {
      currentThreshold,
      early: strategy.bankingThresholds.early,
      mid: strategy.bankingThresholds.mid,
      late: strategy.bankingThresholds.late,
      desperation: strategy.bankingThresholds.desperation
    };
  }
  
  /**
   * 🔥 Check if bot is under pressure
   */
  private static isUnderPressure(context: BotDecisionContext): boolean {
    const scorePressure = context.opponentScore > context.currentScore + 30;
    const timePressure = context.timeRemaining ? context.timeRemaining < 10000 : false; // Less than 10s
    const highRiskTurn = context.diceRolls > 6 && context.turnScore > 20;
    
    return scorePressure || timePressure || highRiskTurn;
  }
  
  /**
   * 📈 Check if bot has positive momentum
   */
  private static hasPositiveMomentum(context: BotDecisionContext): boolean {
    const goodTurn = context.turnScore > 15;
    const leadingScore = context.currentScore > context.opponentScore;
    const consecutiveSuccess = context.consecutiveTurns > 1;
    
    return goodTurn && (leadingScore || consecutiveSuccess);
  }
  
  /**
   * 😤 Check if this is a tilting condition
   */
  private static isTiltingCondition(context: BotDecisionContext): boolean {
    return (
      context.isLosingBadly ||
      (context.turnsPlayed > 3 && context.currentScore < context.targetScore * 0.2) ||
      (context.opponentScore > context.currentScore + 50)
    );
  }
  
  /**
   * 💭 Generate human-readable reasoning for the decision
   */
  private static generateReasoning(
    bot: BotProfile,
    context: BotDecisionContext,
    probability: number,
    decision: boolean
  ): string {
    const reasons: string[] = [];
    
    if (decision) {
      // Banking decision reasoning
      if (context.turnScore > 20) {
        reasons.push(`good turn score (${context.turnScore})`);
      }
      if (context.diceRolls > 5) {
        reasons.push(`long turn (${context.diceRolls} rolls)`);
      }
      if (bot.personality.bankingTendency > 0.7) {
        reasons.push('conservative personality');
      }
      if (context.currentScore + context.turnScore >= context.targetScore) {
        reasons.push('can win');
      }
    } else {
      // Rolling decision reasoning
      if (context.turnScore < 10) {
        reasons.push(`low turn score (${context.turnScore})`);
      }
      if (bot.personality.aggressiveness > 0.7) {
        reasons.push('aggressive personality');
      }
      if (context.opponentScore > context.currentScore + 20) {
        reasons.push('behind opponent');
      }
      if (context.diceRolls < 3) {
        reasons.push('early in turn');
      }
    }
    
    const action = decision ? 'Banking' : 'Rolling';
    const confidence = Math.round(probability * 100);
    
    if (reasons.length === 0) {
      return `${action} (${confidence}% confidence)`;
    }
    
    return `${action}: ${reasons.join(', ')} (${confidence}% confidence)`;
  }
  
  /**
   * 😊 Determine bot's emotional state for personality simulation
   */
  private static determineEmotionalState(bot: BotProfile, context: BotDecisionContext): string {
    if (context.isWinningBig) {
      return bot.personality.emotionalVolatility > 0.6 ? 'excited' : 'confident';
    }
    
    if (context.isLosingBadly) {
      return bot.personality.tiltResistance > 0.7 ? 'determined' : 'frustrated';
    }
    
    if (context.turnScore > 25) {
      return 'pleased';
    }
    
    if (context.diceRolls > 6) {
      return bot.personality.riskTolerance > 0.6 ? 'focused' : 'nervous';
    }
    
    return 'neutral';
  }
  
  /**
   * ⏱️ Calculate realistic thinking delay
   */
  private static calculateThinkingDelay(
    bot: BotProfile,
    context: BotDecisionContext,
    confidence: number
  ): number {
    // Base delay based on skill level
    const skillDelays = {
      'beginner': [800, 1500],    // 0.8-1.5 seconds
      'intermediate': [600, 1200], // 0.6-1.2 seconds
      'advanced': [500, 1000],    // 0.5-1 seconds
      'expert': [400, 800]        // 0.4-0.8 seconds
    };
    
    const [minDelay, maxDelay] = skillDelays[bot.personality.skillLevel] || [600, 1200];
    
    // Uncertainty increases thinking time
    const uncertaintyMultiplier = 1 + (1 - confidence) * 0.5;
    
    // Pressure can either speed up or slow down thinking
    const pressureMultiplier = this.isUnderPressure(context) 
      ? (bot.personality.pressureResistance > 0.5 ? 0.8 : 1.3)
      : 1.0;
    
    // Complex situations take longer
    const complexityMultiplier = context.diceRolls > 5 ? 1.2 : 1.0;
    
    const baseDelay = minDelay + Math.random() * (maxDelay - minDelay);
    const finalDelay = baseDelay * uncertaintyMultiplier * pressureMultiplier * complexityMultiplier;
    
    return Math.max(800, Math.min(6000, finalDelay)); // Clamp between 0.8s and 6s
  }
  
  /**
   * 🎲 Simulate opponent analysis for adaptive bots
   */
  static analyzeOpponent(
    bot: BotProfile,
    opponentHistory: Array<{ action: string; turnScore: number; context: any }>
  ): {
    estimatedAggressiveness: number;
    estimatedBankingPattern: number[];
    suggestedCounterStrategy: string;
  } {
    if (opponentHistory.length === 0) {
      return {
        estimatedAggressiveness: 0.5,
        estimatedBankingPattern: [],
        suggestedCounterStrategy: 'observe'
      };
    }
    
    // Analyze banking patterns
    const bankingScores = opponentHistory
      .filter(h => h.action === 'bank')
      .map(h => h.turnScore);
    
    const averageBankingScore = bankingScores.length > 0 
      ? bankingScores.reduce((sum, score) => sum + score, 0) / bankingScores.length
      : 15;
    
    // Estimate aggressiveness based on banking behavior
    const estimatedAggressiveness = Math.max(0.1, Math.min(0.9, 1 - (averageBankingScore / 30)));
    
    // Suggest counter-strategy
    let counterStrategy = 'balanced';
    if (estimatedAggressiveness > 0.7) {
      counterStrategy = 'conservative'; // Counter aggressive players with safe play
    } else if (estimatedAggressiveness < 0.3) {
      counterStrategy = 'aggressive'; // Be more aggressive against conservative players
    }
    
    return {
      estimatedAggressiveness,
      estimatedBankingPattern: bankingScores,
      suggestedCounterStrategy: counterStrategy
    };
  }
  
  /**
   * 🎯 Update bot strategy based on game outcome (learning system)
   */
  static updateBotStrategy(
    bot: BotProfile,
    gameResult: 'win' | 'loss',
    gameContext: {
      gameMode: string;
      opponentType: 'human' | 'bot';
      finalScore: number;
      turnsPlayed: number;
      strategiesUsed: string[];
    }
  ): Partial<BotProfile> {
    // Only update if bot has adaptation capability
    if (bot.personality.adaptationSpeed < 0.3) {
      return {}; // Low adaptation bots don't learn much
    }
    
    const adaptationRate = bot.personality.adaptationSpeed * 0.1; // Small adjustments
    const updates: any = {};
    
    // Adjust strategy based on outcome
    if (gameResult === 'win') {
      // Reinforce successful strategies slightly
      if (gameContext.strategiesUsed.includes('aggressive')) {
        updates['personality.aggressiveness'] = Math.min(1, bot.personality.aggressiveness + adaptationRate);
      }
      if (gameContext.strategiesUsed.includes('conservative')) {
        updates['personality.bankingTendency'] = Math.min(1, bot.personality.bankingTendency + adaptationRate);
      }
    } else {
      // Adjust unsuccessful strategies slightly
      if (gameContext.strategiesUsed.includes('aggressive')) {
        updates['personality.aggressiveness'] = Math.max(0, bot.personality.aggressiveness - adaptationRate);
      }
    }
    
    // Update stats
    updates['stats.gamesPlayed'] = (bot.stats.gamesPlayed || 0) + 1;
    if (gameResult === 'win') {
      updates['stats.matchWins'] = (bot.stats.matchWins || 0) + 1;
      updates['stats.currentStreak'] = (bot.stats.currentStreak || 0) + 1;
      updates['stats.bestStreak'] = Math.max(bot.stats.bestStreak || 0, updates['stats.currentStreak']);
    } else {
      updates['stats.currentStreak'] = 0;
    }
    
    return updates;
  }
}