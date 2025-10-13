// Comprehensive abilities loading test
// This script helps you debug abilities loading issues in your browser console

// Test function to check abilities loading in a match
function debugAbilitiesInMatch() {
  console.log('🔍 DEBUG: Starting abilities debugging...');
  
  // Check if we're in a match
  const currentPath = window.location.pathname;
  if (!currentPath.includes('/match/')) {
    console.log('❌ Not in a match. Navigate to a match first.');
    return;
  }
  
  // Check if InlineAbilitiesDisplay component is rendered
  const abilitiesContainer = document.querySelector('[data-testid="abilities-container"]') || 
                           document.querySelector('.abilities-display') ||
                           document.querySelector('[class*="abilities"]');
  
  if (!abilitiesContainer) {
    console.log('❌ Abilities container not found in DOM. Component may not be rendered.');
    return;
  }
  
  console.log('✅ Abilities container found:', abilitiesContainer);
  
  // Check for ability cards
  const abilityCards = document.querySelectorAll('[class*="ability"]');
  console.log(`🔮 Found ${abilityCards.length} ability-related elements`);
  
  // Check for Siphon specifically
  const siphonElements = document.querySelectorAll('[alt*="Siphon"], [title*="Siphon"], [class*="siphon"]');
  console.log(`🩸 Found ${siphonElements.length} Siphon-related elements`);
  
  if (siphonElements.length > 0) {
    siphonElements.forEach((el, index) => {
      console.log(`🩸 Siphon element ${index + 1}:`, el);
      if (el.tagName === 'IMG') {
        console.log(`   Image src: ${el.src}`);
        console.log(`   Image alt: ${el.alt}`);
      }
    });
  }
  
  // Check browser console for our debug logs
  console.log('📝 Check the console for InlineAbilitiesDisplay debug logs that start with "🔮 DEBUG"');
  console.log('📝 Look for powerLoadout loading messages from UserService');
  
  return {
    abilitiesContainer,
    abilityCards: abilityCards.length,
    siphonElements: siphonElements.length
  };
}

// Test function to manually trigger abilities loading
function testAbilitiesLoading() {
  console.log('🧪 Testing abilities loading...');
  
  // Try to find React components in the DOM (this is a bit hacky but useful for debugging)
  const reactElements = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
  console.log(`⚛️ Found ${reactElements.length} React elements`);
  
  // Check if we can access any global state (if available)
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('⚛️ React DevTools detected - you can inspect components there');
  }
  
  // Test image loading for Siphon
  const testImage = new Image();
  testImage.onload = () => console.log('✅ Siphon.webp loads successfully');
  testImage.onerror = () => console.log('❌ Siphon.webp failed to load');
  testImage.src = '/Abilities/Catagories/Attack/Siphon.webp';
  
  return 'Test initiated - check console for results';
}

// Export functions for browser console use
window.debugAbilitiesInMatch = debugAbilitiesInMatch;
window.testAbilitiesLoading = testAbilitiesLoading;

console.log('🚀 Abilities debugging tools loaded!');
console.log('📋 Available functions:');
console.log('   - debugAbilitiesInMatch() - Debug abilities in current match');
console.log('   - testAbilitiesLoading() - Test abilities loading mechanisms');
console.log('');
console.log('💡 To use: Open browser console in a match and run debugAbilitiesInMatch()');