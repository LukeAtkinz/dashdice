/**
 * AURA System Test Utility
 * 
 * Use this in browser console to test the AURA cost system
 * Run: window.testAuraSystem()
 */

window.testAuraSystem = () => {
  console.log('🧪 Testing AURA System Implementation...');
  
  // Test 1: Check if AURA counter is visible in GameplayPhase
  const auraCounter = document.querySelector('[data-testid="aura-counter"]') || 
                     document.querySelector('*[text*="AURA"]') ||
                     document.querySelector('*:contains("⚡")');
  
  if (auraCounter) {
    console.log('✅ AURA counter found in UI:', auraCounter);
  } else {
    console.log('❌ AURA counter not found in UI');
  }
  
  // Test 2: Check if abilities show AURA costs
  const abilityElements = document.querySelectorAll('[data-testid="ability-button"]') ||
                         document.querySelectorAll('button[class*="aspect-square"]');
  
  console.log(`🎯 Found ${abilityElements.length} ability buttons`);
  
  abilityElements.forEach((button, index) => {
    const auraCostElement = button.querySelector('*:contains("3")') || 
                           button.querySelector('*:contains("6")') ||
                           button.querySelector('[class*="blue-600"]') ||
                           button.querySelector('[class*="red-600"]');
    
    if (auraCostElement) {
      console.log(`✅ Ability ${index + 1} shows AURA cost:`, auraCostElement.textContent);
    } else {
      console.log(`❌ Ability ${index + 1} missing AURA cost display`);
    }
  });
  
  // Test 3: Check Firebase match data structure
  if (window.firebase && window.firebase.firestore) {
    console.log('🔥 Firebase available - can test match AURA data');
    
    // This would require match ID and user ID to test properly
    console.log('💡 To test Firebase AURA data:');
    console.log('1. Open a match');
    console.log('2. Check gameData.playerAura in Firestore');
    console.log('3. Roll dice to gain AURA');
    console.log('4. Use ability to spend AURA');
  } else {
    console.log('❌ Firebase not accessible from console');
  }
  
  // Test 4: Check for AURA-related functions
  const hasExecuteMatchAbility = typeof window.executeMatchAbility === 'function';
  const hasCanPlayerAffordAbility = typeof window.canPlayerAffordAbility === 'function';
  
  console.log('🔧 Function availability:');
  console.log(`- executeMatchAbility: ${hasExecuteMatchAbility ? '✅' : '❌'}`);
  console.log(`- canPlayerAffordAbility: ${hasCanPlayerAffordAbility ? '✅' : '❌'}`);
  
  console.log('\n🎮 AURA System Test Complete!');
  console.log('💡 To manually test:');
  console.log('1. Start a match');
  console.log('2. Roll dice to gain AURA (+1 per roll, +1 for doubles)');
  console.log('3. Observe AURA counter increase');
  console.log('4. Try using Luck Turner (costs 3 or 6 AURA)');
  console.log('5. Verify AURA is deducted and UI updates');
};

// Also make reset function available
window.testAuraReset = async () => {
  console.log('🔄 Resetting abilities collection...');
  
  if (typeof window.resetAbilities === 'function') {
    try {
      await window.resetAbilities();
      console.log('✅ Abilities reset complete! Refresh page to see changes.');
    } catch (error) {
      console.error('❌ Reset failed:', error);
    }
  } else {
    console.log('❌ Reset function not available');
  }
};

console.log('🧪 AURA Test Utility loaded!');
console.log('💡 Usage:');
console.log('- window.testAuraSystem() - Test AURA implementation');
console.log('- window.testAuraReset() - Reset abilities collection');