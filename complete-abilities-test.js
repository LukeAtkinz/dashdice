// Combined test utility for both Luck Turner and Pan Slap
console.log('🧪 Testing Complete Ability System...');

// Browser console test for both abilities
window.testBothAbilities = () => {
  console.log('=== LUCK TURNER & PAN SLAP INTEGRATION TEST ===\n');
  
  try {
    // Test 1: Check if both abilities appear in UI
    const abilityButtons = document.querySelectorAll('[class*="aspect-square"]');
    console.log(`Found ${abilityButtons.length} ability buttons in UI`);
    
    let luckTurnerFound = false;
    let panSlapFound = false;
    
    abilityButtons.forEach((button, index) => {
      const text = button.textContent || '';
      const html = button.innerHTML || '';
      
      // Look for Luck Turner (3-6 AURA cost or tactical elements)
      if (text.includes('3-6') || html.includes('3-6') || html.includes('screwdriver')) {
        console.log(`✅ Luck Turner found at button ${index}:`, button);
        luckTurnerFound = true;
      }
      
      // Look for Pan Slap (6 AURA cost or pan elements)
      if ((text.includes('6') && !text.includes('3-6')) || html.includes('pan') || html.includes('defense')) {
        console.log(`✅ Pan Slap found at button ${index}:`, button);
        panSlapFound = true;
      }
    });
    
    // Test 2: Check AURA cost displays
    const auraCostElements = document.querySelectorAll('[class*="blue-600"], [class*="red-600"]');
    console.log(`\nFound ${auraCostElements.length} AURA cost indicators`);
    
    let costs = [];
    auraCostElements.forEach((element) => {
      const cost = element.textContent;
      costs.push(cost);
    });
    
    console.log('AURA costs found:', [...new Set(costs)]);
    
    // Test 3: Check category distribution
    const tacticalElements = document.querySelectorAll('img[src*="tactical"], img[alt*="Tactical"]');
    const defenseElements = document.querySelectorAll('img[src*="defense"], img[alt*="Defense"]');
    
    console.log(`\nCategory distribution:`);
    console.log(`- Tactical icons: ${tacticalElements.length}`);
    console.log(`- Defense icons: ${defenseElements.length}`);
    
    // Test 4: Summary
    console.log('\n=== RESULTS ===');
    console.log(`✅ Luck Turner found: ${luckTurnerFound}`);
    console.log(`✅ Pan Slap found: ${panSlapFound}`);
    console.log(`✅ AURA system active: ${auraCostElements.length > 0}`);
    console.log(`✅ Multiple categories: ${tacticalElements.length > 0 && defenseElements.length > 0}`);
    
    if (luckTurnerFound && panSlapFound) {
      console.log('\n🎉 BOTH ABILITIES SUCCESSFULLY INTEGRATED!');
      console.log('💡 System now has:');
      console.log('  - Luck Turner (3-6 AURA, Tactical, Probability control)');
      console.log('  - Pan Slap (6 AURA, Defense, Turn control)');
      console.log('  - Complete AURA cost system');
      console.log('  - Multi-category ability distribution');
    } else {
      console.log('❌ Some abilities missing from UI');
      console.log('💡 Make sure:');
      console.log('  1. Abilities are seeded to Firebase');
      console.log('  2. User has abilities in loadout');
      console.log('  3. Page is fully loaded');
    }
    
    // Test 5: AURA spending test
    console.log('\n💡 TO TEST AURA SPENDING:');
    console.log('1. Start a match');
    console.log('2. Roll dice to gain AURA');
    console.log('3. Use Luck Turner during your turn (3-6 AURA)');
    console.log('4. Use Pan Slap during opponent turn (6 AURA)');
    console.log('5. Watch AURA counter decrease!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Make functions available
window.testLuckTurner = () => {
  console.log('🔧 Testing Luck Turner specifically...');
  const elements = document.querySelectorAll('*');
  let found = false;
  
  elements.forEach(el => {
    if (el.textContent?.includes('3-6') || el.innerHTML?.includes('screwdriver')) {
      console.log('✅ Luck Turner element:', el);
      found = true;
    }
  });
  
  console.log(found ? '✅ Luck Turner found!' : '❌ Luck Turner not found');
};

window.testPanSlap = () => {
  console.log('🍳 Testing Pan Slap specifically...');
  const elements = document.querySelectorAll('*');
  let found = false;
  
  elements.forEach(el => {
    if ((el.textContent?.includes('6') && !el.textContent?.includes('3-6')) || 
        el.innerHTML?.includes('pan')) {
      console.log('✅ Pan Slap element:', el);
      found = true;
    }
  });
  
  console.log(found ? '✅ Pan Slap found!' : '❌ Pan Slap not found');
};

// Auto-run comprehensive test
if (typeof window !== 'undefined') {
  window.testBothAbilities();
}

console.log('\n🛠️ Test utilities loaded!');
console.log('Available commands:');
console.log('- window.testBothAbilities() - Test complete system');
console.log('- window.testLuckTurner() - Test Luck Turner only');
console.log('- window.testPanSlap() - Test Pan Slap only');