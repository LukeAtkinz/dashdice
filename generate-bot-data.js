#!/usr/bin/env node

/**
 * Simple Bot Population Script
 * Creates bot profile data that can be imported into Firebase
 */

const fs = require('fs');
const path = require('path');

// Bot Profile Generator (simplified version)
class SimpleBotProfileGenerator {
  static firstNames = [
    'Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Avery', 'Quinn', 'Sage',
    'Rowan', 'Phoenix', 'River', 'Skylar', 'Cameron', 'Eden', 'Finley',
    'Ash', 'Blake', 'Charlie', 'Dakota', 'Emery', 'Hayden', 'Jamie',
    'Kai', 'Lane', 'Micah', 'Noah', 'Oakley', 'Parker', 'Reese', 'Sam'
  ];

  static lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
  ];

  static skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
  static archetypes = ['conservative', 'aggressive', 'balanced', 'unpredictable'];
  static regions = ['us-east', 'eu-west', 'asia-pacific'];

  static generateBotProfile() {
    const firstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
    const lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
    const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const skillLevel = this.skillLevels[Math.floor(Math.random() * this.skillLevels.length)];
    const gamesPlayed = Math.floor(Math.random() * 100) + 10;
    
    // Calculate win rate based on skill level
    const skillMultiplier = {
      beginner: 0.3,
      intermediate: 0.5,
      advanced: 0.7,
      expert: 0.8
    }[skillLevel] || 0.5;
    
    const matchWins = Math.floor(gamesPlayed * skillMultiplier);
    const totalScore = gamesPlayed * (500 + Math.random() * 1000); // Random total score
    
    return {
      // Core User Data
      uid: botId,
      displayName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@dashdice.bot`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isBot: true, // Internal flag (hidden from frontend)
      isActive: true,
      
      // Player Statistics
      stats: {
        gamesPlayed: gamesPlayed,
        matchWins: matchWins,
        currentStreak: Math.floor(Math.random() * 5),
        bestStreak: Math.floor(Math.random() * 15),
        totalScore: Math.floor(totalScore),
        averageScore: Math.floor(totalScore / gamesPlayed),
        elo: 1000 + Math.floor(Math.random() * 600) // 1000-1600
      },
      
      // Inventory & Customization
      inventory: {
        displayBackgroundEquipped: null,
        matchBackgroundEquipped: null,
        items: []
      },
      
      // AI Personality Matrix
      personality: {
        // Core traits (0.1-0.9)
        aggressiveness: Math.round((0.1 + Math.random() * 0.8) * 100) / 100,
        bankingTendency: Math.round((0.2 + Math.random() * 0.6) * 100) / 100,
        riskTolerance: Math.round((0.1 + Math.random() * 0.8) * 100) / 100,
        pressureResistance: Math.round((0.3 + Math.random() * 0.6) * 100) / 100,
        
        // Advanced traits
        tiltResistance: Math.round((0.2 + Math.random() * 0.7) * 100) / 100,
        momentumAwareness: Math.round((0.1 + Math.random() * 0.8) * 100) / 100,
        adaptationSpeed: Math.round((0.2 + Math.random() * 0.6) * 100) / 100,
        confidenceLevel: Math.round((0.3 + Math.random() * 0.6) * 100) / 100,
        emotionalVolatility: Math.round((0.1 + Math.random() * 0.6) * 100) / 100,
        
        // Meta information
        region: this.regions[Math.floor(Math.random() * this.regions.length)],
        skillLevel: skillLevel,
        archetypeCategory: this.archetypes[Math.floor(Math.random() * this.archetypes.length)]
      },
      
      // Timestamps
      generationDate: new Date().toISOString(),
      lastActiveDate: new Date().toISOString(),
      
      // Achievement & Progress Tracking
      achievements: {},
      
      // Match History Integration
      recentMatches: [],
      matchStatistics: {
        averageGameLength: Math.round(180 + Math.random() * 120), // 3-5 minutes
        favoriteTimeToPlay: Math.floor(Math.random() * 24),
        commonStrategies: []
      }
    };
  }
}

function generateBotsData(count = 20) {
  console.log(`🤖 Generating ${count} bot profiles...`);
  
  const bots = [];
  const usedNames = new Set();
  
  for (let i = 0; i < count; i++) {
    let botProfile;
    let attempts = 0;
    
    // Ensure unique names
    do {
      botProfile = SimpleBotProfileGenerator.generateBotProfile();
      attempts++;
    } while (usedNames.has(botProfile.displayName) && attempts < 50);
    
    usedNames.add(botProfile.displayName);
    bots.push(botProfile);
    
    console.log(`  ✅ ${botProfile.displayName} (${botProfile.personality.skillLevel}) - ELO: ${botProfile.stats.elo}`);
  }
  
  return bots;
}

function saveBotsData(bots) {
  const outputFile = path.join(__dirname, 'bot-profiles-data.json');
  
  const data = {
    collection: 'bot_profiles',
    generated: new Date().toISOString(),
    count: bots.length,
    bots: bots
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log(`\n💾 Bot data saved to: ${outputFile}`);
  
  // Also create individual files for easier import
  const botsBySkill = {
    beginner: [],
    intermediate: [],
    advanced: [],
    expert: []
  };
  
  bots.forEach(bot => {
    botsBySkill[bot.personality.skillLevel].push(bot);
  });
  
  Object.entries(botsBySkill).forEach(([skill, skillBots]) => {
    const skillFile = path.join(__dirname, `bot-profiles-${skill}.json`);
    fs.writeFileSync(skillFile, JSON.stringify(skillBots, null, 2));
    console.log(`  📊 ${skill}: ${skillBots.length} bots saved to bot-profiles-${skill}.json`);
  });
}

function main() {
  console.log('🚀 DashDice Bot Profile Generator\n');
  
  try {
    const bots = generateBotsData(20);
    saveBotsData(bots);
    
    console.log('\n✨ Bot profile generation complete!');
    console.log('\nFiles created:');
    console.log('  • bot-profiles-data.json (all bots)');
    console.log('  • bot-profiles-beginner.json');
    console.log('  • bot-profiles-intermediate.json');
    console.log('  • bot-profiles-advanced.json');
    console.log('  • bot-profiles-expert.json');
    
    console.log('\n📋 Next steps:');
    console.log('1. Import bot-profiles-data.json into Firebase Console');
    console.log('2. Or use Firebase Admin SDK to bulk import');
    console.log('3. Deploy Go services for bot functionality');
    console.log('4. Test bot matching in the game');
    
  } catch (error) {
    console.error('❌ Generation failed:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SimpleBotProfileGenerator, generateBotsData };
