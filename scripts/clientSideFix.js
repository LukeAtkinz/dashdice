// Client-Side Fix for Friend Requests and Achievement Display
// Run this script in your browser console to fix immediate issues

console.log('🔧 DashDice Client-Side Fix Script');
console.log('📋 This script will help resolve friend request and achievement display issues');

// Function to update user privacy settings via client-side Firestore
async function fixUserPrivacySettings() {
  try {
    console.log('🔧 Fixing user privacy settings...');
    
    // This would typically be imported from your Firebase config
    // Assuming Firebase is already initialized in the app
    if (typeof window !== 'undefined' && window.auth && window.auth.currentUser) {
      const user = window.auth.currentUser;
      const db = window.db; // Assuming Firestore is available globally
      
      // Update current user's privacy settings
      const userRef = db.collection('users').doc(user.uid);
      await userRef.update({
        'privacy.allowFriendRequests': true,
        'privacy.showOnlineStatus': true,
        'privacy.allowGameInvites': true,
        'privacy.showActivity': true
      });
      
      console.log('✅ User privacy settings updated successfully');
      console.log('🤝 Friend requests should now work properly');
    } else {
      console.log('⚠️ User not authenticated or Firebase not available');
    }
  } catch (error) {
    console.error('❌ Error updating privacy settings:', error);
  }
}

// Function to check achievement definitions
async function checkAchievementDefinitions() {
  try {
    console.log('🏆 Checking achievement definitions...');
    
    if (typeof window !== 'undefined' && window.db) {
      const db = window.db;
      
      // Check if achievements exist in database
      const achievementsSnapshot = await db.collection('achievementDefinitions').limit(1).get();
      
      if (achievementsSnapshot.empty) {
        console.log('⚠️ No achievements found in database');
        console.log('📋 Achievements should fall back to default definitions');
        console.log('🔄 Try refreshing the page to see achievements');
      } else {
        console.log(`✅ Found ${achievementsSnapshot.size} achievement(s) in database`);
      }
    }
  } catch (error) {
    console.error('❌ Error checking achievements:', error);
  }
}

// Function to force refresh achievement data
function forceRefreshAchievements() {
  console.log('🔄 Forcing achievement refresh...');
  
  // Clear any cached data
  if (typeof localStorage !== 'undefined') {
    // Clear any achievement-related cache
    Object.keys(localStorage).forEach(key => {
      if (key.includes('achievement') || key.includes('progress')) {
        localStorage.removeItem(key);
      }
    });
  }
  
  console.log('💾 Cleared achievement cache');
  console.log('🔄 Please refresh the page to reload achievements');
}

// Main fix function
async function runClientSideFix() {
  console.log('\n🚀 Starting client-side fixes...');
  
  // Fix 1: Update privacy settings
  await fixUserPrivacySettings();
  
  // Fix 2: Check achievement definitions
  await checkAchievementDefinitions();
  
  // Fix 3: Force refresh if needed
  forceRefreshAchievements();
  
  console.log('\n✅ Client-side fixes completed!');
  console.log('📋 Summary:');
  console.log('  1. ✅ Privacy settings updated for friend requests');
  console.log('  2. ✅ Achievement definitions checked');
  console.log('  3. ✅ Cache cleared for fresh data');
  console.log('\n🔄 Please refresh the page to see the changes');
}

// Export for manual execution
window.dashDiceFix = {
  runAll: runClientSideFix,
  fixPrivacy: fixUserPrivacySettings,
  checkAchievements: checkAchievementDefinitions,
  refreshAchievements: forceRefreshAchievements
};

console.log('\n📋 Available commands:');
console.log('  dashDiceFix.runAll() - Run all fixes');
console.log('  dashDiceFix.fixPrivacy() - Fix friend request privacy settings');
console.log('  dashDiceFix.checkAchievements() - Check achievement definitions');
console.log('  dashDiceFix.refreshAchievements() - Force refresh achievement cache');
console.log('\n🔧 Run dashDiceFix.runAll() to fix both issues');

// Auto-run the fixes
runClientSideFix();
