/**
 * 🧹 Emergency Cleanup Script for Stagnant Matches
 * Run this to clean up the 20 stagnant matches currently in Firebase
 */

const { db } = require('./src/services/firebase');
const { collection, getDocs, deleteDoc, writeBatch } = require('firebase/firestore');

async function emergencyCleanup() {
  console.log('🚨 EMERGENCY CLEANUP: Starting cleanup of stagnant matches...');
  
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000));
  let totalCleaned = 0;
  
  // Collections to clean
  const collectionsToClean = ['waitingroom', 'gameSessions', 'matches', 'activeGamesSessions'];
  
  for (const collectionName of collectionsToClean) {
    try {
      console.log(`\n🔍 Checking ${collectionName} collection...`);
      
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      console.log(`📊 Found ${snapshot.docs.length} documents in ${collectionName}`);
      
      const batch = writeBatch(db);
      let batchOps = 0;
      let cleanedFromCollection = 0;
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate() || new Date(0);
        const lastActivity = data.lastActivity?.toDate() || data.updatedAt?.toDate() || createdAt;
        
        const ageMinutes = Math.round((now.getTime() - createdAt.getTime()) / 60000);
        const lastActivityMinutes = Math.round((now.getTime() - lastActivity.getTime()) / 60000);
        
        // Clean if older than 10 minutes OR last activity was more than 5 minutes ago
        const shouldClean = createdAt < tenMinutesAgo || lastActivity < new Date(now.getTime() - (5 * 60 * 1000));
        
        if (shouldClean) {
          console.log(`🗑️ Cleaning ${collectionName}/${doc.id} - Age: ${ageMinutes}min, Last activity: ${lastActivityMinutes}min ago`);
          
          if (data.players && Array.isArray(data.players)) {
            console.log(`   Players: ${data.players.map(p => p.displayName || p.playerDisplayName || 'Unknown').join(', ')}`);
          }
          
          if (batchOps < 500) {
            batch.delete(doc.ref);
            batchOps++;
          } else {
            await batch.commit();
            const newBatch = writeBatch(db);
            newBatch.delete(doc.ref);
            batchOps = 1;
          }
          
          cleanedFromCollection++;
        } else {
          console.log(`✅ Keeping ${collectionName}/${doc.id} - Age: ${ageMinutes}min (recent activity)`);
        }
      }
      
      // Commit remaining operations
      if (batchOps > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Cleaned ${cleanedFromCollection} documents from ${collectionName}`);
      totalCleaned += cleanedFromCollection;
      
    } catch (error) {
      console.error(`❌ Error cleaning ${collectionName}:`, error.message);
    }
  }
  
  console.log(`\n🎯 EMERGENCY CLEANUP COMPLETE`);
  console.log(`📊 Total documents cleaned: ${totalCleaned}`);
  console.log(`🔧 Match timeout now set to 10 minutes`);
  console.log(`🧹 Cleanup runs every 1 minute`);
  console.log(`✅ Matchmaking system should now prevent stagnant matches!`);
}

// Only run if called directly
if (require.main === module) {
  emergencyCleanup()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { emergencyCleanup };