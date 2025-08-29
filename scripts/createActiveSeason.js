import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'dashdice-d1b86'
});

const db = admin.firestore();

async function createActiveSeason() {
  try {
    console.log('🏆 Creating active season...');
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 14); // 2 weeks duration
    
    const seasonData = {
      name: 'Dash 1',
      startDate: admin.firestore.Timestamp.fromDate(startDate),
      endDate: admin.firestore.Timestamp.fromDate(endDate),
      isActive: true,
      dashNumber: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('seasons').add(seasonData);
    
    console.log('✅ Active season created successfully!');
    console.log(`📅 Season: ${seasonData.name}`);
    console.log(`🚀 Start Date: ${startDate.toLocaleDateString()}`);
    console.log(`🏁 End Date: ${endDate.toLocaleDateString()}`);
    console.log(`🆔 Document ID: ${docRef.id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating active season:', error);
    process.exit(1);
  }
}

createActiveSeason();
