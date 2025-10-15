// Debug script to test achievement tracking
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://dashdice-default-rtdb.firebaseio.com/"
  });
}

const db = admin.firestore();

async function checkUserAchievementProgress(userId) {
  try {
    console.log(`🔍 Checking achievement progress for user: ${userId}`);
    
    // Check achievement progress
    const progressDoc = await db.collection('achievementProgress').doc(userId).get();
    if (progressDoc.exists()) {
      const progress = progressDoc.data();
      console.log('📊 Current metrics:', progress.metrics);
      console.log('🔥 Current streaks:', progress.streaks);
    } else {
      console.log('❌ No achievement progress found for user');
    }
    
    // Check completed achievements
    const userAchievements = await db.collection('userAchievements')
      .where('userId', '==', userId)
      .where('isCompleted', '==', true)
      .get();
      
    console.log(`🏆 Completed achievements: ${userAchievements.size}`);
    userAchievements.forEach(doc => {
      const achievement = doc.data();
      console.log(`  - ${achievement.achievementId} completed at ${achievement.completedAt.toDate()}`);
    });
    
    // Check pending notifications
    const notifications = await db.collection('achievementNotifications')
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .get();
      
    console.log(`🔔 Unread notifications: ${notifications.size}`);
    notifications.forEach(doc => {
      const notification = doc.data();
      console.log(`  - ${notification.type}: ${notification.message}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking achievements:', error);
  }
}

async function simulateDiceRolls(userId, numRolls = 5) {
  try {
    console.log(`🎲 Simulating ${numRolls} dice rolls for user: ${userId}`);
    
    // Import the achievement tracking service (Note: This won't work directly with ES modules)
    // Instead, we'll directly update the metrics via Firestore
    
    const progressRef = db.collection('achievementProgress').doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const progressDoc = await transaction.get(progressRef);
      
      let currentProgress;
      if (progressDoc.exists()) {
        currentProgress = progressDoc.data();
      } else {
        currentProgress = {
          userId,
          metrics: {},
          streaks: {},
          lastUpdated: admin.firestore.Timestamp.now()
        };
      }
      
      // Update dice roll metrics
      const updatedMetrics = { ...currentProgress.metrics };
      updatedMetrics.total_dice_rolled = (updatedMetrics.total_dice_rolled || 0) + numRolls;
      
      // Simulate some random dice values
      for (let i = 0; i < numRolls; i++) {
        const diceValue = Math.floor(Math.random() * 6) + 1;
        const diceKey = `dice_${['one', 'two', 'three', 'four', 'five', 'six'][diceValue-1]}s_rolled`;
        updatedMetrics[diceKey] = (updatedMetrics[diceKey] || 0) + 1;
      }
      
      const updatedProgress = {
        ...currentProgress,
        metrics: updatedMetrics,
        lastUpdated: admin.firestore.Timestamp.now()
      };
      
      transaction.set(progressRef, updatedProgress);
    });
    
    console.log(`✅ Successfully updated metrics for ${numRolls} dice rolls`);
    
    // Check progress after update
    await checkUserAchievementProgress(userId);
    
  } catch (error) {
    console.error('❌ Error simulating dice rolls:', error);
  }
}

async function simulateMatchWin(userId) {
  try {
    console.log(`🏆 Simulating match win for user: ${userId}`);
    
    const progressRef = db.collection('achievementProgress').doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const progressDoc = await transaction.get(progressRef);
      
      let currentProgress;
      if (progressDoc.exists()) {
        currentProgress = progressDoc.data();
      } else {
        currentProgress = {
          userId,
          metrics: {},
          streaks: {},
          lastUpdated: admin.firestore.Timestamp.now()
        };
      }
      
      // Update match win metrics
      const updatedMetrics = { ...currentProgress.metrics };
      updatedMetrics.match_wins = (updatedMetrics.match_wins || 0) + 1;
      updatedMetrics.games_won = (updatedMetrics.games_won || 0) + 1;
      updatedMetrics.games_played = (updatedMetrics.games_played || 0) + 1;
      
      const updatedProgress = {
        ...currentProgress,
        metrics: updatedMetrics,
        lastUpdated: admin.firestore.Timestamp.now()
      };
      
      transaction.set(progressRef, updatedProgress);
    });
    
    console.log(`✅ Successfully recorded match win`);
    
    // Check progress after update
    await checkUserAchievementProgress(userId);
    
  } catch (error) {
    console.error('❌ Error simulating match win:', error);
  }
}

async function testAchievementThresholds(userId) {
  try {
    console.log(`🧪 Testing achievement thresholds for user: ${userId}`);
    
    const progressRef = db.collection('achievementProgress').doc(userId);
    
    // Test dice roll achievement (Dice Gremlin: 1,000 dice rolls)
    console.log('🎲 Testing Dice Gremlin achievement (1,000 dice rolls)...');
    await db.runTransaction(async (transaction) => {
      const progressDoc = await transaction.get(progressRef);
      let currentProgress = progressDoc.exists() ? progressDoc.data() : {
        userId,
        metrics: {},
        streaks: {},
        lastUpdated: admin.firestore.Timestamp.now()
      };
      
      const updatedMetrics = { ...currentProgress.metrics };
      updatedMetrics.total_dice_rolled = 1000; // Should unlock Dice Gremlin
      
      transaction.set(progressRef, {
        ...currentProgress,
        metrics: updatedMetrics,
        lastUpdated: admin.firestore.Timestamp.now()
      });
    });
    
    // Test match win achievement (Rolling Strong: 10 wins)
    console.log('🏆 Testing Rolling Strong achievement (10 match wins)...');
    await db.runTransaction(async (transaction) => {
      const progressDoc = await transaction.get(progressRef);
      let currentProgress = progressDoc.data();
      
      const updatedMetrics = { ...currentProgress.metrics };
      updatedMetrics.match_wins = 10; // Should unlock Rolling Strong
      updatedMetrics.games_won = 10;
      
      transaction.set(progressRef, {
        ...currentProgress,
        metrics: updatedMetrics,
        lastUpdated: admin.firestore.Timestamp.now()
      });
    });
    
    // Test daily login streak
    console.log('📅 Testing daily login streak...');
    await db.runTransaction(async (transaction) => {
      const progressDoc = await transaction.get(progressRef);
      let currentProgress = progressDoc.data();
      
      const updatedMetrics = { ...currentProgress.metrics };
      updatedMetrics.daily_logins = 5;
      updatedMetrics.consecutive_days_played = 5;
      
      transaction.set(progressRef, {
        ...currentProgress,
        metrics: updatedMetrics,
        lastUpdated: admin.firestore.Timestamp.now()
      });
    });
    
    console.log('✅ Achievement thresholds set! Check if achievements unlocked...');
    
    // Wait a moment and check for unlocked achievements
    setTimeout(async () => {
      await checkUserAchievementProgress(userId);
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error testing achievement thresholds:', error);
  }
}

async function checkAchievementDefinitions() {
  try {
    console.log('🔍 Checking achievement definitions...');
    
    // Check if achievement definitions exist
    const achievementsSnapshot = await db.collection('achievements').get();
    console.log(`📋 Total achievements defined: ${achievementsSnapshot.size}`);
    
    if (achievementsSnapshot.size > 0) {
      console.log('🎯 Sample achievements:');
      achievementsSnapshot.docs.slice(0, 5).forEach(doc => {
        const achievement = doc.data();
        console.log(`  - ${achievement.name}: ${achievement.description}`);
        if (achievement.requirements) {
          console.log(`    Requires: ${achievement.requirements.metric} ${achievement.requirements.operator} ${achievement.requirements.value}`);
        }
      });
    } else {
      console.log('⚠️ No achievement definitions found in database');
    }
    
    // Check specific achievements we care about
    const diceGremllin = await db.collection('achievements').where('name', '==', 'Dice Gremlin').get();
    const rollingStrong = await db.collection('achievements').where('name', '==', 'Rolling Strong').get();
    
    console.log(`🎲 Dice Gremlin achievement found: ${!diceGremllin.empty}`);
    console.log(`🏆 Rolling Strong achievement found: ${!rollingStrong.empty}`);
    
  } catch (error) {
    console.error('❌ Error checking achievement definitions:', error);
  }
}
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node debug-achievements.js check <userId>');
    console.log('  node debug-achievements.js dice <userId> [numRolls]');
    console.log('  node debug-achievements.js win <userId>');
    console.log('  node debug-achievements.js test <userId>  # Test achievement thresholds');
    console.log('  node debug-achievements.js definitions   # Check achievement definitions');
    return;
  }
  
  const command = args[0];
  const userId = args[1];
  
  switch (command) {
    case 'check':
      if (!userId) {
        console.error('❌ User ID is required');
        return;
      }
      await checkUserAchievementProgress(userId);
      break;
    case 'dice':
      if (!userId) {
        console.error('❌ User ID is required');
        return;
      }
      const numRolls = parseInt(args[2]) || 5;
      await simulateDiceRolls(userId, numRolls);
      break;
    case 'win':
      if (!userId) {
        console.error('❌ User ID is required');
        return;
      }
      await simulateMatchWin(userId);
      break;
    case 'test':
      if (!userId) {
        console.error('❌ User ID is required');
        return;
      }
      await testAchievementThresholds(userId);
      break;
    case 'definitions':
      await checkAchievementDefinitions();
      break;
    default:
      console.error('❌ Unknown command:', command);
  }
  
  process.exit(0);
}

main().catch(console.error);