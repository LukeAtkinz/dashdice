// Quick test for bot fallback system
console.log('🧪 Testing Bot Fallback System...');

async function testBotFallback() {
  try {
    // Test bot availability
    const { BotMatchingService } = await import('./src/services/botMatchingService.js');
    
    const status = await BotMatchingService.getBotAvailabilityStatus();
    console.log('🤖 Bot availability:', status);
    
    // Test timer functionality
    console.log('⏰ Testing fallback timer...');
    BotMatchingService.startBotFallbackTimer(
      'test-session-123',
      'test-player-456',
      'quickfire',
      'quick'
    );
    
    console.log('🎯 Active timers:', BotMatchingService.getActiveTimerCount());
    
    // Clear timer after 2 seconds
    setTimeout(() => {
      BotMatchingService.clearBotFallbackTimer('test-session-123');
      console.log('🛑 Timer cleared, active timers:', BotMatchingService.getActiveTimerCount());
    }, 2000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (typeof window === 'undefined') {
  // Running in Node.js
  testBotFallback();
} else {
  console.log('🌐 Run in browser console or Node.js environment');
}