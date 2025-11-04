import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Manual reset function for abilities collection
 * Call this from browser console: window.resetAbilities()
 */
export async function resetAbilitiesCollection() {
  try {
    console.log('🧹 Starting abilities collection reset...');
    
    // Get all documents in abilities collection
    const abilitiesRef = collection(db, 'abilities');
    const snapshot = await getDocs(abilitiesRef);
    
    console.log(`🗑️ Found ${snapshot.size} abilities to delete`);
    
    // Delete all existing abilities
    const deletePromises = snapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'abilities', docSnapshot.id))
    );
    
    await Promise.all(deletePromises);
    
    console.log('✅ All old abilities deleted');
    console.log('🔄 Now refresh the page and visit PowerTab - it will auto-seed Luck Turner');
    
    return true;
  } catch (error) {
    console.error('❌ Error resetting abilities:', error);
    return false;
  }
}

// Make it available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).resetAbilities = resetAbilitiesCollection;
}