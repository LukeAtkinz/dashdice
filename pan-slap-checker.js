// Quick Pan Slap verification script
console.log('🔍 Checking for Pan Slap in Firebase...');

window.checkPanSlap = async () => {
  try {
    // Method 1: Check through AbilitiesService if available
    if (window.AbilitiesService) {
      const abilities = await window.AbilitiesService.getAllAbilities();
      const panSlap = abilities.find(a => a.id === 'pan_slap');
      
      if (panSlap) {
        console.log('✅ Pan Slap found in Firebase!', panSlap);
        console.log('- Name:', panSlap.name);
        console.log('- Category:', panSlap.category);
        console.log('- AURA Cost:', panSlap.auraCost);
        console.log('- Timing:', panSlap.timing);
      } else {
        console.log('❌ Pan Slap NOT found in Firebase');
        console.log('📝 Available abilities:', abilities.map(a => a.name));
        
        // Try to seed it
        console.log('🔄 Attempting to seed Pan Slap...');
        await window.AbilitiesService.refreshAllAbilities();
        console.log('✅ Refresh completed. Try checking again.');
      }
    }
    
    // Method 2: Direct Firebase check
    else if (window.firebase && window.firebase.firestore) {
      const db = window.firebase.firestore();
      const doc = await db.collection('abilities').doc('pan_slap').get();
      
      if (doc.exists) {
        console.log('✅ Pan Slap found in Firebase (direct check)!', doc.data());
      } else {
        console.log('❌ Pan Slap NOT found in Firebase (direct check)');
        console.log('🔄 Use window.refreshAbilities() to seed it');
      }
    }
    
    else {
      console.log('❌ No Firebase access available');
    }
    
  } catch (error) {
    console.error('❌ Error checking Pan Slap:', error);
  }
};

// Check UI for Pan Slap
window.checkPanSlapUI = () => {
  console.log('🔍 Checking UI for Pan Slap...');
  
  // Look for defense category abilities
  const defenseElements = document.querySelectorAll('[class*="defense"], img[src*="defense"]');
  console.log(`Found ${defenseElements.length} defense-related elements`);
  
  // Look for 6 AURA cost (Pan Slap's cost)
  const auraCostElements = document.querySelectorAll('*');
  let found6AuraCost = false;
  
  auraCostElements.forEach(el => {
    if (el.textContent === '6' && el.className.includes('blue-600')) {
      console.log('✅ Found 6 AURA cost element (likely Pan Slap):', el);
      found6AuraCost = true;
    }
  });
  
  if (!found6AuraCost) {
    console.log('❌ No 6 AURA cost found in UI');
  }
  
  // Check if Pan Slap name appears anywhere
  const pageContent = document.body.innerText.toLowerCase();
  if (pageContent.includes('pan slap')) {
    console.log('✅ "Pan Slap" text found in page!');
  } else {
    console.log('❌ "Pan Slap" text not found in page');
  }
};

// Auto-run checks
console.log('🛠️ Pan Slap verification loaded!');
console.log('Commands:');
console.log('- window.checkPanSlap() - Check Firebase');
console.log('- window.checkPanSlapUI() - Check UI');
console.log('');

// Auto-run Firebase check
window.checkPanSlap();