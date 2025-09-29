/**
 * Bot Profile Generator for DashDice
 * Creates diverse, realistic bot profiles for the game database
 */

import { BotProfile, SkillLevel, ArchetypeCategory, BotRegion } from '@/types/bot';

/**
 * Generate a comprehensive set of bot profiles
 */
export function generateBotProfiles(): BotProfile[] {
  const bots: BotProfile[] = [];
  
  // Predefined names for variety
  const names = [
    'Respawned', 'MicrowaveHero', 'Banana Shoes', 'AmongSus', 'Giga Chad69',
    'Gary Kent', 'Grandma Slayer', 'WiFiWarlord', 'Toilet Ninja', 'MilkWizard',
    'Login Failed', 'Dont Know', 'Big', 'Luke123', 'Agent 21',
    'Self Storage', 'NoScopeKaren', 'AngryOtter', 'TrashBin27', 'Dark Knight 01'
  ];
  
  // Create bots across different archetypes and skill levels
  const archetypes: ArchetypeCategory[] = ['conservative', 'aggressive', 'balanced', 'chaotic', 'strategic'];
  const skillLevels: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
  const regions: BotRegion[] = ['north-america', 'europe', 'asia-pacific', 'south-america'];
  
  let nameIndex = 0;
  
  // Generate bots for each combination
  archetypes.forEach(archetype => {
    skillLevels.forEach(skillLevel => {
      const numBotsForCombo = archetype === 'balanced' ? 3 : 2; // More balanced bots
      
      for (let i = 0; i < numBotsForCombo; i++) {
        const bot = generateBotProfile(
          names[nameIndex % names.length],
          archetype,
          skillLevel,
          regions[nameIndex % regions.length]
        );
        
        bots.push(bot);
        nameIndex++;
      }
    });
  });
  
  // Add some special/unique bots
  bots.push(
    generateSpecialBot('The Dice Whisperer', 'strategic', 'expert', 'global'),
    generateSpecialBot('Lucky Strike', 'chaotic', 'advanced', 'north-america'),
    generateSpecialBot('Bank Robber', 'conservative', 'expert', 'europe'),
    generateSpecialBot('Risk Taker', 'aggressive', 'intermediate', 'asia-pacific'),
    generateSpecialBot('Newbie Helper', 'balanced', 'beginner', 'global')
  );
  
  return bots;
}

/**
 * Generate a single bot profile with specific characteristics
 */
function generateBotProfile(
  name: string,
  archetype: ArchetypeCategory,
  skillLevel: SkillLevel,
  region: BotRegion
): BotProfile {
  const uid = `bot_${name.toLowerCase().replace(' ', '_')}_${Date.now() + Math.random()}`;
  const email = `${name.toLowerCase().replace(' ', '.')}.${uid}@dashdice.bot`;
  
  // Generate personality based on archetype
  const personality = generatePersonality(archetype, skillLevel);
  
  // Generate strategy based on personality
  const strategy = generateStrategy(personality, archetype);
  
  // Generate stats based on skill level
  const stats = generateStats(skillLevel, personality);
  
  // Generate preferred game modes
  const preferredGameModes = generatePreferredGameModes(archetype, skillLevel);
  
  return {
    uid,
    displayName: name,
    email,
    region,
    isBot: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    personality,
    strategy,
    stats,
    
    preferredGameModes,
    difficultyRating: calculateDifficultyRating(skillLevel, personality),
    
    inventory: {
      displayBackgroundEquipped: null,
      matchBackgroundEquipped: null,
      items: []
    },
    
    recentMatches: []
  };
}

/**
 * Generate personality metrics based on archetype and skill
 */
function generatePersonality(archetype: ArchetypeCategory, skillLevel: SkillLevel) {
  // Base values with some randomization
  const randomVariation = () => (Math.random() - 0.5) * 0.2; // ±0.1 variation
  
  let base = {
    aggressiveness: 0.5,
    bankingTendency: 0.5,
    riskTolerance: 0.5,
    adaptationSpeed: 0.5,
    emotionalVolatility: 0.5,
    pressureResistance: 0.5,
    momentumAwareness: 0.5,
    tiltResistance: 0.5,
    skillLevel,
    archetypeCategory: archetype,
    favoriteTimeToPlay: Math.floor(Math.random() * 24)
  };
  
  // Adjust based on archetype
  switch (archetype) {
    case 'aggressive':
      base.aggressiveness = 0.75 + randomVariation();
      base.bankingTendency = 0.25 + randomVariation();
      base.riskTolerance = 0.8 + randomVariation();
      base.emotionalVolatility = 0.7 + randomVariation();
      break;
      
    case 'conservative':
      base.aggressiveness = 0.25 + randomVariation();
      base.bankingTendency = 0.8 + randomVariation();
      base.riskTolerance = 0.2 + randomVariation();
      base.pressureResistance = 0.7 + randomVariation();
      break;
      
    case 'balanced':
      base.aggressiveness = 0.5 + randomVariation();
      base.bankingTendency = 0.5 + randomVariation();
      base.riskTolerance = 0.5 + randomVariation();
      base.adaptationSpeed = 0.7 + randomVariation();
      break;
      
    case 'chaotic':
      base.aggressiveness = 0.6 + randomVariation();
      base.emotionalVolatility = 0.9 + randomVariation();
      base.riskTolerance = 0.7 + randomVariation();
      base.tiltResistance = 0.3 + randomVariation();
      break;
      
    case 'strategic':
      base.adaptationSpeed = 0.8 + randomVariation();
      base.momentumAwareness = 0.8 + randomVariation();
      base.pressureResistance = 0.7 + randomVariation();
      base.emotionalVolatility = 0.3 + randomVariation();
      break;
  }
  
  // Adjust based on skill level
  const skillMultipliers = {
    'beginner': { adaptationSpeed: 0.3, pressureResistance: 0.4, momentumAwareness: 0.4 },
    'intermediate': { adaptationSpeed: 0.6, pressureResistance: 0.6, momentumAwareness: 0.6 },
    'advanced': { adaptationSpeed: 0.8, pressureResistance: 0.8, momentumAwareness: 0.8 },
    'expert': { adaptationSpeed: 0.9, pressureResistance: 0.9, momentumAwareness: 0.9 }
  };
  
  const multipliers = skillMultipliers[skillLevel];
  base.adaptationSpeed *= multipliers.adaptationSpeed;
  base.pressureResistance *= multipliers.pressureResistance;
  base.momentumAwareness *= multipliers.momentumAwareness;
  
  // Clamp all values to 0-1 range
  Object.keys(base).forEach(key => {
    if (typeof base[key as keyof typeof base] === 'number') {
      (base as any)[key] = Math.max(0.05, Math.min(0.95, (base as any)[key]));
    }
  });
  
  return base;
}

/**
 * Generate strategy based on personality and archetype
 */
function generateStrategy(personality: any, archetype: ArchetypeCategory) {
  // Banking thresholds based on personality
  const baseBankingScore = 15 + (personality.bankingTendency * 20); // 15-35 range
  
  const strategy = {
    bankingThresholds: {
      early: Math.round(baseBankingScore * 0.8),
      mid: Math.round(baseBankingScore),
      late: Math.round(baseBankingScore * 1.2),
      desperation: Math.round(baseBankingScore * 1.5)
    },
    
    riskFactors: {
      opponentScore: personality.aggressiveness * 0.3,
      turnLength: (1 - personality.riskTolerance) * 0.4,
      gamePhase: personality.momentumAwareness * 0.2
    },
    
    adaptationRules: {
      counterAggressive: personality.adaptationSpeed > 0.6,
      mimicSuccessful: personality.adaptationSpeed > 0.7,
      punishMistakes: personality.momentumAwareness > 0.6 && archetype === 'strategic'
    },
    
    commonStrategies: generateCommonStrategies(archetype, personality)
  };
  
  return strategy;
}

/**
 * Generate common strategies based on archetype
 */
function generateCommonStrategies(archetype: ArchetypeCategory, personality: any): string[] {
  const strategies: string[] = [];
  
  switch (archetype) {
    case 'aggressive':
      strategies.push('high-risk-high-reward', 'pressure-opponent', 'late-game-push');
      break;
    case 'conservative':
      strategies.push('steady-banking', 'risk-minimization', 'defensive-play');
      break;
    case 'balanced':
      strategies.push('adaptive-banking', 'situation-awareness', 'flexible-tactics');
      break;
    case 'chaotic':
      strategies.push('unpredictable-banking', 'momentum-swings', 'psychological-pressure');
      break;
    case 'strategic':
      strategies.push('opponent-analysis', 'calculated-risks', 'pattern-recognition');
      break;
  }
  
  // Add personality-specific strategies
  if (personality.aggressiveness > 0.7) strategies.push('aggressive-continuations');
  if (personality.bankingTendency > 0.7) strategies.push('early-banking');
  if (personality.adaptationSpeed > 0.7) strategies.push('counter-strategies');
  
  return strategies;
}

/**
 * Generate stats based on skill level and personality
 */
function generateStats(skillLevel: SkillLevel, personality: any) {
  const skillModifiers = {
    'beginner': { eloBase: 1000, winRateBase: 0.35, gamesBase: 25 },
    'intermediate': { eloBase: 1300, winRateBase: 0.5, gamesBase: 75 },
    'advanced': { eloBase: 1600, winRateBase: 0.65, gamesBase: 150 },
    'expert': { eloBase: 1900, winRateBase: 0.75, gamesBase: 300 }
  };
  
  const modifiers = skillModifiers[skillLevel];
  
  // Add some randomness
  const eloVariation = (Math.random() - 0.5) * 200;
  const elo = Math.round(modifiers.eloBase + eloVariation);
  
  const winRateVariation = (Math.random() - 0.5) * 0.2;
  const winRate = Math.max(0.2, Math.min(0.85, modifiers.winRateBase + winRateVariation));
  
  const gamesVariation = Math.random() * 0.5 + 0.75; // 0.75 to 1.25 multiplier
  const gamesPlayed = Math.round(modifiers.gamesBase * gamesVariation);
  
  const matchWins = Math.round(gamesPlayed * winRate);
  const currentStreak = Math.random() < 0.3 ? Math.floor(Math.random() * 5) : 0;
  const bestStreak = Math.max(currentStreak, Math.floor(Math.random() * 12) + 1);
  
  const averageScore = 800 + (personality.aggressiveness * 400) + (Math.random() * 200);
  const totalScore = Math.round(averageScore * gamesPlayed);
  
  return {
    elo,
    gamesPlayed,
    matchWins,
    currentStreak,
    bestStreak,
    totalScore,
    averageScore: Math.round(averageScore),
    averageGameLength: Math.round(180 + (Math.random() * 120)), // 3-5 minutes
    bankingFrequency: personality.bankingTendency * 8 + 2, // 2-10 banks per game
    averageTurnScore: Math.round(12 + (personality.bankingTendency * 18)), // 12-30 average
    riskyContinues: Math.round(personality.riskTolerance * gamesPlayed * 0.1),
    lastActiveDate: new Date().toISOString(),
    generationDate: new Date().toISOString()
  };
}

/**
 * Generate preferred game modes based on archetype and skill
 */
function generatePreferredGameModes(archetype: ArchetypeCategory, skillLevel: SkillLevel): string[] {
  const allModes = ['classic', 'quickfire', 'zero-hour', 'last-line', 'true-grit'];
  const modes: string[] = [];
  
  // All bots can play basic modes
  modes.push('classic', 'quickfire');
  
  // Add modes based on archetype
  switch (archetype) {
    case 'aggressive':
      modes.push('true-grit', 'last-line');
      break;
    case 'conservative':
      modes.push('zero-hour');
      break;
    case 'balanced':
      modes.push(...allModes);
      break;
    case 'chaotic':
      modes.push('true-grit', 'quickfire');
      break;
    case 'strategic':
      modes.push('zero-hour', 'classic');
      break;
  }
  
  // Advanced/expert bots can play more complex modes
  if (skillLevel === 'advanced' || skillLevel === 'expert') {
    if (!modes.includes('zero-hour')) modes.push('zero-hour');
  }
  
  return [...new Set(modes)]; // Remove duplicates
}

/**
 * Calculate difficulty rating (1-10)
 */
function calculateDifficultyRating(skillLevel: SkillLevel, personality: any): number {
  const skillRatings = {
    'beginner': 2,
    'intermediate': 4,
    'advanced': 7,
    'expert': 9
  };
  
  let rating = skillRatings[skillLevel];
  
  // Adjust based on personality traits that make bots harder
  if (personality.adaptationSpeed > 0.7) rating += 0.5;
  if (personality.momentumAwareness > 0.7) rating += 0.5;
  if (personality.pressureResistance > 0.7) rating += 0.5;
  
  return Math.max(1, Math.min(10, Math.round(rating)));
}

/**
 * Generate special/unique bots with specific characteristics
 */
function generateSpecialBot(name: string, archetype: ArchetypeCategory, skillLevel: SkillLevel, region: BotRegion): BotProfile {
  const bot = generateBotProfile(name, archetype, skillLevel, region);
  
  // Enhance special bots
  switch (name) {
    case 'The Dice Whisperer':
      bot.personality.adaptationSpeed = 0.95;
      bot.personality.momentumAwareness = 0.95;
      bot.difficultyRating = 10;
      break;
      
    case 'Lucky Strike':
      bot.personality.riskTolerance = 0.95;
      bot.personality.emotionalVolatility = 0.95;
      bot.stats.bestStreak = 15;
      break;
      
    case 'Bank Robber':
      bot.personality.bankingTendency = 0.95;
      bot.personality.pressureResistance = 0.9;
      bot.strategy.bankingThresholds.early = 8;
      break;
      
    case 'Risk Taker':
      bot.personality.aggressiveness = 0.95;
      bot.personality.riskTolerance = 0.9;
      bot.strategy.bankingThresholds.desperation = 45;
      break;
      
    case 'Newbie Helper':
      bot.personality.aggressiveness = 0.3;
      bot.personality.bankingTendency = 0.4;
      bot.difficultyRating = 1;
      bot.stats.elo = 900;
      break;
  }
  
  return bot;
}

/**
 * Export the generator function
 */
export default generateBotProfiles;