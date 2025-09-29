#!/usr/bin/env node

/**
 * Initialize Bot Database for DashDice
 * Populates Firestore with generated bot profiles
 */

// Import Firebase Admin SDK
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('../backend-deploy/serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://dashdice-d1b86-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

/**
 * Bot profile generator (inline for Node.js compatibility)
 */
function generateBotProfiles() {
  const bots = [];
  
  // Predefined names for variety
  const names = [
    'Respawned', 'MicrowaveHero', 'Banana Shoes', 'AmongSus', 'Giga Chad69',
    'Gary Kent', 'Grandma Slayer', 'WiFiWarlord', 'Toilet Ninja', 'MilkWizard',
    'Login Failed', 'Dont Know', 'Big', 'Luke123', 'Agent 21',
    'Self Storage', 'NoScopeKaren', 'AngryOtter', 'TrashBin27', 'Dark Knight 01',
    'Shadow Strike', 'VenomX', 'Grem', 'Ross', 'Joshlikej'
  ];
  
  const archetypes = ['conservative', 'aggressive', 'balanced', 'chaotic', 'strategic'];
  const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const regions = ['north-america', 'europe', 'asia-pacific', 'south-america'];
  
  let nameIndex = 0;
  
  // Generate bots for each combination
  archetypes.forEach(archetype => {
    skillLevels.forEach(skillLevel => {
      const numBotsForCombo = archetype === 'balanced' ? 3 : 2;
      
      for (let i = 0; i < numBotsForCombo; i++) {
        if (nameIndex < names.length) {
          const bot = generateBotProfile(
            names[nameIndex],
            archetype,
            skillLevel,
            regions[nameIndex % regions.length]
          );
          
          bots.push(bot);
          nameIndex++;
        }
      }
    });
  });
  
  // Add special bots
  if (nameIndex < names.length) {
    bots.push(
      generateSpecialBot('The Dice Whisperer', 'strategic', 'expert', 'global'),
      generateSpecialBot('Lucky Strike', 'chaotic', 'advanced', 'north-america'),
      generateSpecialBot('Bank Robber', 'conservative', 'expert', 'europe'),
      generateSpecialBot('Risk Taker', 'aggressive', 'intermediate', 'asia-pacific'),
      generateSpecialBot('Newbie Helper', 'balanced', 'beginner', 'global')
    );
  }
  
  return bots;
}

function generateBotProfile(name, archetype, skillLevel, region) {
  const uid = `bot_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${Math.floor(Math.random() * 1000)}@dashdice.bot`;
  
  const personality = generatePersonality(archetype, skillLevel);
  const strategy = generateStrategy(personality, archetype);
  const stats = generateStats(skillLevel, personality);
  
  return {
    uid,
    displayName: name,
    email,
    region,
    isBot: true,
    isActive: true,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    
    personality,
    strategy,
    stats,
    
    preferredGameModes: generatePreferredGameModes(archetype, skillLevel),
    difficultyRating: calculateDifficultyRating(skillLevel, personality),
    
    inventory: {
      displayBackgroundEquipped: null,
      matchBackgroundEquipped: null,
      items: []
    },
    
    recentMatches: []
  };
}

function generatePersonality(archetype, skillLevel) {
  const randomVariation = () => (Math.random() - 0.5) * 0.2;
  
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
    if (typeof base[key] === 'number') {
      base[key] = Math.max(0.05, Math.min(0.95, base[key]));
    }
  });
  
  return base;
}

function generateStrategy(personality, archetype) {
  const baseBankingScore = 15 + (personality.bankingTendency * 20);
  
  return {
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
}

function generateCommonStrategies(archetype, personality) {
  const strategies = [];
  
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
  
  if (personality.aggressiveness > 0.7) strategies.push('aggressive-continuations');
  if (personality.bankingTendency > 0.7) strategies.push('early-banking');
  if (personality.adaptationSpeed > 0.7) strategies.push('counter-strategies');
  
  return strategies;
}

function generateStats(skillLevel, personality) {
  const skillModifiers = {
    'beginner': { eloBase: 1000, winRateBase: 0.35, gamesBase: 25 },
    'intermediate': { eloBase: 1300, winRateBase: 0.5, gamesBase: 75 },
    'advanced': { eloBase: 1600, winRateBase: 0.65, gamesBase: 150 },
    'expert': { eloBase: 1900, winRateBase: 0.75, gamesBase: 300 }
  };
  
  const modifiers = skillModifiers[skillLevel];
  const eloVariation = (Math.random() - 0.5) * 200;
  const elo = Math.round(modifiers.eloBase + eloVariation);
  
  const winRateVariation = (Math.random() - 0.5) * 0.2;
  const winRate = Math.max(0.2, Math.min(0.85, modifiers.winRateBase + winRateVariation));
  
  const gamesVariation = Math.random() * 0.5 + 0.75;
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
    averageGameLength: Math.round(180 + (Math.random() * 120)),
    bankingFrequency: personality.bankingTendency * 8 + 2,
    averageTurnScore: Math.round(12 + (personality.bankingTendency * 18)),
    riskyContinues: Math.round(personality.riskTolerance * gamesPlayed * 0.1),
    lastActiveDate: admin.firestore.Timestamp.now(),
    generationDate: admin.firestore.Timestamp.now()
  };
}

function generatePreferredGameModes(archetype, skillLevel) {
  const allModes = ['classic', 'quickfire', 'zero-hour', 'last-line', 'true-grit'];
  const modes = ['classic', 'quickfire'];
  
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
  
  if (skillLevel === 'advanced' || skillLevel === 'expert') {
    if (!modes.includes('zero-hour')) modes.push('zero-hour');
  }
  
  return [...new Set(modes)];
}

function calculateDifficultyRating(skillLevel, personality) {
  const skillRatings = {
    'beginner': 2,
    'intermediate': 4,
    'advanced': 7,
    'expert': 9
  };
  
  let rating = skillRatings[skillLevel];
  
  if (personality.adaptationSpeed > 0.7) rating += 0.5;
  if (personality.momentumAwareness > 0.7) rating += 0.5;
  if (personality.pressureResistance > 0.7) rating += 0.5;
  
  return Math.max(1, Math.min(10, Math.round(rating)));
}

function generateSpecialBot(name, archetype, skillLevel, region) {
  const bot = generateBotProfile(name, archetype, skillLevel, region);
  
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
 * Main initialization function
 */
async function initializeBots() {
  try {
    console.log('🤖 Initializing DashDice Bot Database...');
    
    // Generate bot profiles
    const bots = generateBotProfiles();
    console.log(`📊 Generated ${bots.length} bot profiles`);
    
    // Get the bots collection
    const botsCollection = db.collection('bots');
    
    // Check if bots already exist
    const existingBots = await botsCollection.limit(1).get();
    if (!existingBots.empty) {
      console.log('⚠️  Bots collection already contains data. Skipping initialization.');
      console.log('   To reinitialize, please clear the bots collection first.');
      return;
    }
    
    // Use batch writes for better performance
    const batch = db.batch();
    
    bots.forEach((bot, index) => {
      const botRef = botsCollection.doc(bot.uid);
      batch.set(botRef, bot);
      
      if ((index + 1) % 10 === 0) {
        console.log(`   📝 Prepared ${index + 1}/${bots.length} bots for database`);
      }
    });
    
    console.log('💾 Writing bots to database...');
    await batch.commit();
    
    console.log('✅ Successfully initialized bot database!');
    console.log(`🎯 Created ${bots.length} bots with diverse personalities and skill levels`);
    
    // Print summary
    const archetypeCounts = bots.reduce((acc, bot) => {
      acc[bot.personality.archetypeCategory] = (acc[bot.personality.archetypeCategory] || 0) + 1;
      return acc;
    }, {});
    
    const skillCounts = bots.reduce((acc, bot) => {
      acc[bot.personality.skillLevel] = (acc[bot.personality.skillLevel] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📈 Bot Distribution:');
    console.log('   Archetypes:', archetypeCounts);
    console.log('   Skill Levels:', skillCounts);
    
    console.log('\n🎮 Bots are now available for matchmaking!');
    
  } catch (error) {
    console.error('❌ Error initializing bot database:', error);
    throw error;
  }
}

/**
 * Cleanup function to remove all bots (for testing)
 */
async function clearBots() {
  try {
    console.log('🧹 Clearing existing bots...');
    
    const botsCollection = db.collection('bots');
    const snapshot = await botsCollection.get();
    
    if (snapshot.empty) {
      console.log('✅ No bots to clear');
      return;
    }
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Cleared ${snapshot.docs.length} bots`);
    
  } catch (error) {
    console.error('❌ Error clearing bots:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'clear') {
    clearBots()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  } else {
    initializeBots()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  }
}

module.exports = {
  initializeBots,
  clearBots,
  generateBotProfiles
};