// Quick test for browser console
console.log('🧪 Testing Pan Slap Integration...');

// This should be run in browser console after page loads
window.testPanSlap = () => {
  try {
    // Check if Pan Slap is available in the abilities system
    const panSlapFound = document.body.innerHTML.includes('Pan Slap') || 
                        document.body.innerHTML.includes('pan_slap') ||
                        document.body.innerHTML.includes('pan-slap');
    
    console.log('Pan Slap found in DOM:', panSlapFound);
    
    // Check if it shows up in PowerTab inventory
    const abilityButtons = document.querySelectorAll('[class*="aspect-square"]');
    console.log(`Found ${abilityButtons.length} ability buttons in UI`);
    
    // Look for Pan Slap icon or name
    let panSlapButton = null;
    abilityButtons.forEach((button, index) => {
      const text = button.textContent || '';
      const html = button.innerHTML || '';
      if (text.includes('Pan') || html.includes('pan') || html.includes('6')) { // 6 AURA cost
        console.log(`Potential Pan Slap button found at index ${index}:`, button);
        panSlapButton = button;
      }
    });
    
    if (panSlapButton) {
      console.log('✅ Pan Slap UI element found!', panSlapButton);
    } else {
      console.log('❌ Pan Slap not found in UI');
    }
    
    // Test AURA cost display
    const auraCostElements = document.querySelectorAll('[class*="blue-600"], [class*="red-600"]');
    console.log(`Found ${auraCostElements.length} AURA cost indicators`);
    
    auraCostElements.forEach((element, index) => {
      if (element.textContent === '6') {
        console.log(`✅ Found 6 AURA cost display (Pan Slap?):`, element);
      }
    });
    
    // Check defensive category
    const defenseIcons = document.querySelectorAll('img[src*="defense"], img[alt*="Defense"]');
    console.log(`Found ${defenseIcons.length} defense category icons`);
    
    console.log('🎮 Pan Slap Test Complete!');
    console.log('💡 If Pan Slap is not visible:');
    console.log('1. Make sure abilities are seeded to Firebase');
    console.log('2. Check if Pan Slap is in your loadout');
    console.log('3. Refresh the page');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Make it available immediately
if (typeof window !== 'undefined') {
  window.testPanSlap();
}

console.log('💡 Pan Slap test utility loaded! Call window.testPanSlap() to test again.');