#!/usr/bin/env node

/**
 * 🔍 Debug script to check user data structure in Firebase
 * This will help us understand why the soft ranked leaderboard shows no players
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugUserData() {
  console.log('🔍 Debugging Firebase user data structure...');
  console.log('=============================================');
  
  try {
    // Get a sample of user documents
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, limit(10)); // Get first 10 users
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found in Firebase!');
      return;
    }
    
    console.log(`📊 Found ${usersSnapshot.size} users. Analyzing structure...\n`);
    
    let realUserCount = 0;
    let botUserCount = 0;
    let usersWithGames = 0;
    let usersWithEnoughGames = 0;
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const displayName = userData.displayName || 'Unknown';
      const isBot = userData.isBot || false;
      
      // Count user types
      if (isBot) {
        botUserCount++;
      } else {
        realUserCount++;
      }
      
      // Check game stats from multiple possible locations
      const matchWins = userData.stats?.matchWins || 
                      userData.matchWins || 
                      userData.stats?.wins || 
                      userData.wins || 
                      userData.stats?.gamesWon || 0;
      
      const matchLosses = userData.stats?.matchLosses || 
                        userData.matchLosses || 
                        userData.stats?.losses || 
                        userData.losses || 
                        userData.stats?.gamesLost || 0;
      
      const totalGames = matchWins + matchLosses;
      
      if (totalGames > 0) usersWithGames++;
      if (totalGames >= 5) usersWithEnoughGames++;
      
      // Show detailed info for real users with games
      if (!isBot && totalGames > 0) {
        console.log(`👤 ${displayName} (${doc.id}):`);
        console.log(`   - Wins: ${matchWins}`);
        console.log(`   - Losses: ${matchLosses}`);
        console.log(`   - Total Games: ${totalGames}`);
        console.log(`   - Qualifies for leaderboard: ${totalGames >= 5 ? '✅' : '❌'}`);
        
        if (totalGames >= 5) {
          const winPercentage = (matchWins / totalGames) * 100;
          const rating = Math.round(matchWins * winPercentage);
          console.log(`   - Win Percentage: ${winPercentage.toFixed(1)}%`);
          console.log(`   - Rating: ${rating}`);
        }
        
        console.log(`   - Data structure:`, {
          topLevel: {
            matchWins: userData.matchWins,
            matchLosses: userData.matchLosses,
            wins: userData.wins,
            losses: userData.losses
          },
          stats: userData.stats
        });
        console.log('');
      }
    });
    
    console.log('📈 SUMMARY:');
    console.log(`   - Total users: ${usersSnapshot.size}`);
    console.log(`   - Real users: ${realUserCount}`);
    console.log(`   - Bot users: ${botUserCount}`);
    console.log(`   - Users with games: ${usersWithGames}`);
    console.log(`   - Users with 5+ games (qualify for leaderboard): ${usersWithEnoughGames}`);
    
    if (usersWithEnoughGames === 0) {
      console.log('\n⚠️  ISSUE FOUND: No users have 5+ games!');
      console.log('   This explains why the leaderboard shows "No Ranked Players Yet"');
      
      if (usersWithGames > 0) {
        console.log(`   Suggestion: Lower the minimum game requirement from 5 to 1 or 3 games`);
        console.log(`   There are ${usersWithGames} users who have played some games`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the debug script
debugUserData()
  .then(() => {
    console.log('\n✅ Debug analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  });