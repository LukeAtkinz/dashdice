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

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node debug-achievements.js check <userId>');
    console.log('  node debug-achievements.js dice <userId> [numRolls]');
    console.log('  node debug-achievements.js win <userId>');
    return;
  }
  
  const command = args[0];
  const userId = args[1];
  
  if (!userId) {
    console.error('❌ User ID is required');
    return;
  }
  
  switch (command) {
    case 'check':
      await checkUserAchievementProgress(userId);
      break;
    case 'dice':
      const numRolls = parseInt(args[2]) || 5;
      await simulateDiceRolls(userId, numRolls);
      break;
    case 'win':
      await simulateMatchWin(userId);
      break;
    default:
      console.error('❌ Unknown command:', command);
  }
  
  process.exit(0);
}

main().catch(console.error);