// Quick test to verify onGameStart event registration works
import { guestMatchManager } from '../src/components/shared/waitingroom/GuestMatchManager';

console.log('🧪 Testing onGameStart event registration...');

// Test event registration
let callbackCalled = false;
const testCallback = () => {
  callbackCalled = true;
  console.log('✅ Test callback was called!');
};

// Register callback
guestMatchManager.on('onGameStart', testCallback);
console.log('🔧 Callback registered');

// Simulate triggering the event
if (guestMatchManager.events.onGameStart) {
  guestMatchManager.events.onGameStart();
  console.log(callbackCalled ? '✅ Event system working!' : '❌ Event system failed');
} else {
  console.log('❌ No onGameStart event found');
}

// Cleanup
guestMatchManager.off('onGameStart');
console.log('🧹 Cleanup complete');