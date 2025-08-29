// Simple season creator that can be run in browser console
// This will create a basic season for testing

window.createTestSeason = async function() {
  console.log('🏆 Creating test season...');
  
  try {
    // Import Firebase functions from the app
    const { collection, addDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');
    const { db } = await import('/src/services/firebase.js');
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 14); // 2 weeks
    
    const seasonData = {
      name: 'Dash 1',
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      isActive: true,
      dashNumber: 1,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'seasons'), seasonData);
    console.log('✅ Test season created:', docRef.id);
    console.log('📅 Season details:', seasonData);
    
    return { id: docRef.id, ...seasonData };
  } catch (error) {
    console.error('❌ Error creating test season:', error);
    console.log('💡 This is expected if Firebase security rules prevent client writes');
    console.log('💡 The leaderboard will still work with mock data');
  }
};

console.log('🚀 Run createTestSeason() in the browser console to create a test season');
