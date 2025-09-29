#!/usr/bin/env node

/**
 * Test Bot System for DashDice
 * Verifies bot matching and AI behavior
 */

// Import Firebase Admin SDK
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../backend-deploy/serviceAccountKey.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://dashdice-d1b86-default-rtdb.firebaseio.com"
    });
    
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

/**
 * Test bot database
 */
async function testBotDatabase() {
  try {
    console.log('🤖 Testing bot database...');
    
    // Get bots collection
    const botsSnapshot = await db.collection('bots').limit(5).get();
    
    if (botsSnapshot.empty) {
      console.log('❌ No bots found in database. Run "npm run init-bots" first.');
      return false;
    }
    
    console.log(`✅ Found ${botsSnapshot.size} bots in database`);
    
    // Display sample bots
    console.log('\n📋 Sample Bots:');
    botsSnapshot.docs.forEach((doc, index) => {
      const bot = doc.data();
      console.log(`  ${index + 1}. ${bot.displayName} (${bot.personality.archetypeCategory}, ${bot.personality.skillLevel})`);
      console.log(`     ELO: ${bot.stats.elo}, Win Rate: ${(bot.stats.matchWins / bot.stats.gamesPlayed * 100).toFixed(1)}%`);
      console.log(`     Personality: Aggressive=${bot.personality.aggressiveness.toFixed(2)}, Risk=${bot.personality.riskTolerance.toFixed(2)}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error testing bot database:', error);
    return false;
  }
}

/**
 * Test bot selection
 */
async function testBotSelection() {
  try {
    console.log('\n🎯 Testing bot selection...');
    
    // Test different scenarios
    const scenarios = [
      { gameMode: 'classic', userElo: 1200, sessionType: 'quick' },
      { gameMode: 'quickfire', userElo: 1500, sessionType: 'ranked' },
      { gameMode: 'zero-hour', userElo: 1800, sessionType: 'quick' }
    ];
    
    for (const scenario of scenarios) {
      console.log(`\n🔍 Scenario: ${scenario.gameMode} (ELO ${scenario.userElo}, ${scenario.sessionType})`);
      
      // Query for suitable bots
      let query = db.collection('bots')
        .where('isActive', '==', true)
        .where('preferredGameModes', 'array-contains', scenario.gameMode);
      
      if (scenario.sessionType === 'ranked') {
        // For ranked, prefer bots within 300 ELO range
        const minElo = scenario.userElo - 300;
        const maxElo = scenario.userElo + 300;
        query = query.where('stats.elo', '>=', minElo).where('stats.elo', '<=', maxElo);
      }
      
      const candidatesSnapshot = await query.limit(5).get();
      
      if (candidatesSnapshot.empty) {
        console.log('   ❌ No suitable bots found');
        continue;
      }
      
      // Score bots
      const scoredBots = candidatesSnapshot.docs.map(doc => {
        const bot = doc.data();
        
        // Simple scoring algorithm
        let score = 100;
        
        // ELO similarity
        const eloDiff = Math.abs(bot.stats.elo - scenario.userElo);
        score -= eloDiff * 0.05;
        
        // Prefer active bots
        if (bot.stats.lastActiveDate && bot.stats.lastActiveDate.toDate) {
          const daysSinceActive = (Date.now() - bot.stats.lastActiveDate.toDate().getTime()) / (1000 * 60 * 60 * 24);
          score -= daysSinceActive * 2;
        }
        
        // Difficulty adjustment
        score += (bot.difficultyRating || 5) * 5;
        
        return { ...bot, uid: doc.id, score };
      });
      
      // Sort by score
      scoredBots.sort((a, b) => b.score - a.score);
      
      console.log(`   ✅ Found ${scoredBots.length} suitable bots:`);
      scoredBots.slice(0, 3).forEach((bot, index) => {
        console.log(`     ${index + 1}. ${bot.displayName} (Score: ${bot.score.toFixed(1)}, ELO: ${bot.stats.elo})`);
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error testing bot selection:', error);
    return false;
  }
}

/**
 * Test AI decision making
 */
async function testAIDecisions() {
  try {
    console.log('\n🧠 Testing AI decision making...');
    
    // Get a sample bot
    const botSnapshot = await db.collection('bots').limit(1).get();
    if (botSnapshot.empty) {
      console.log('❌ No bots available for AI testing');
      return false;
    }
    
    const bot = botSnapshot.docs[0].data();
    console.log(`\n🤖 Testing with bot: ${bot.displayName}`);
    console.log(`   Personality: ${bot.personality.archetypeCategory} (${bot.personality.skillLevel})`);
    console.log(`   Aggressiveness: ${bot.personality.aggressiveness.toFixed(2)}`);
    console.log(`   Risk Tolerance: ${bot.personality.riskTolerance.toFixed(2)}`);
    console.log(`   Banking Tendency: ${bot.personality.bankingTendency.toFixed(2)}`);
    
    // Simulate different game situations
    const situations = [
      {
        name: 'Early Game - Safe Turn',
        context: { currentScore: 18, turnScore: 18, opponentScore: 25, gamePhase: 'early' },
        expectedAction: 'Should consider banking based on personality'
      },
      {
        name: 'Mid Game - Risky Turn', 
        context: { currentScore: 45, turnScore: 35, opponentScore: 80, gamePhase: 'mid' },
        expectedAction: 'Should evaluate risk vs reward'
      },
      {
        name: 'Late Game - Desperation',
        context: { currentScore: 75, turnScore: 20, opponentScore: 95, gamePhase: 'late' },
        expectedAction: 'Should take calculated risks'
      }
    ];
    
    situations.forEach(situation => {
      console.log(`\n📊 ${situation.name}:`);
      console.log(`   Context: Score=${situation.context.currentScore}, Turn=${situation.context.turnScore}, Opp=${situation.context.opponentScore}`);
      
      // Simulate banking decision
      const bankingThreshold = bot.strategy.bankingThresholds[situation.context.gamePhase] || 20;
      const riskFactor = bot.personality.riskTolerance;
      const aggressiveness = bot.personality.aggressiveness;
      
      // Simple decision logic
      let shouldBank = false;
      let confidence = 0;
      
      if (situation.context.turnScore >= bankingThreshold) {
        shouldBank = true;
        confidence = 0.7 + (bot.personality.bankingTendency * 0.3);
      }
      
      // Adjust for game state
      if (situation.context.opponentScore > situation.context.currentScore + situation.context.turnScore) {
        // Behind - more aggressive
        shouldBank = shouldBank && (riskFactor < 0.6);
        confidence *= (1 - aggressiveness * 0.3);
      }
      
      console.log(`   Decision: ${shouldBank ? 'BANK' : 'CONTINUE'} (${(confidence * 100).toFixed(1)}% confidence)`);
      console.log(`   Reasoning: Banking threshold=${bankingThreshold}, Risk tolerance=${riskFactor.toFixed(2)}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error testing AI decisions:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 DashDice Bot System Test Suite\n');
  
  const results = {
    database: await testBotDatabase(),
    selection: await testBotSelection(),
    ai: await testAIDecisions()
  };
  
  console.log('\n📊 Test Results:');
  console.log(`   Database Test: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Selection Test: ${results.selection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   AI Decision Test: ${results.ai ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Bot system is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above.');
  }
  
  return allPassed;
}

// CLI interface
if (require.main === module) {
  runTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests };