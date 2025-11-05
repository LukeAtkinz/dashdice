/**
 * Set User as Admin
 * 
 * Run this in the browser console to set yourself as admin
 * You need to be logged in first
 */

const setCurrentUserAsAdmin = async () => {
  console.log('👑 Setting current user as admin...');
  
  try {
    // Import Firebase modules
    const { getAuth } = await import('firebase/auth');
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../src/services/firebase');
    
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ No user logged in. Please log in first.');
      return;
    }
    
    console.log(`👤 Current user: ${user.email || user.uid}`);
    
    // Update user document with admin role
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      role: 'admin'
    });
    
    console.log('✅ Successfully set user as admin!');
    console.log('💡 You now have admin permissions to:');
    console.log('   - Unlock abilities for all players');
    console.log('   - Modify any playerAbilities document');
    console.log('   - Access admin tools');
    console.log('\n🔄 Refresh the page and try the unlock tool again.');
    
  } catch (error) {
    console.error('❌ Error setting admin role:', error);
  }
};

// Run the function
setCurrentUserAsAdmin();
