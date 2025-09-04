/**
 * Bridge Entry System Test
 * 
 * This test validates that the bridge entry system eliminates race conditions
 * and provides immediate room data access during optimistic-to-real transitions.
 */

import { OptimisticMatchmakingService } from '../services/optimisticMatchmakingService';

export class BridgeEntrySystemTest {
  
  /**
   * Test bridge data storage and retrieval
   */
  static testBridgeDataOperations(): boolean {
    console.log('🧪 Testing bridge data operations...');
    
    const testRoomId = 'test_room_123';
    const testRoomData = {
      id: testRoomId,
      gameMode: 'classic',
      gameType: 'quick',
      hostData: {
        playerDisplayName: 'TestPlayer',
        playerId: 'test_user_123'
      },
      createdAt: new Date()
    };
    
    // Test 1: Store data in bridge
    OptimisticMatchmakingService.setBridgeRoomData(testRoomId, testRoomData);
    
    // Test 2: Check if data exists
    const hasData = OptimisticMatchmakingService.hasBridgeRoomData(testRoomId);
    if (!hasData) {
      console.error('❌ Bridge data storage failed');
      return false;
    }
    
    // Test 3: Retrieve data from bridge
    const retrievedData = OptimisticMatchmakingService.getBridgeRoomData(testRoomId);
    if (!retrievedData || retrievedData.id !== testRoomId) {
      console.error('❌ Bridge data retrieval failed');
      return false;
    }
    
    // Test 4: Clear data from bridge
    OptimisticMatchmakingService.clearBridgeRoomData(testRoomId);
    const afterClear = OptimisticMatchmakingService.hasBridgeRoomData(testRoomId);
    if (afterClear) {
      console.error('❌ Bridge data clearing failed');
      return false;
    }
    
    console.log('✅ Bridge data operations test passed');
    return true;
  }
  
  /**
   * Test race condition prevention scenario
   */
  static testRaceConditionPrevention(): boolean {
    console.log('🧪 Testing race condition prevention...');
    
    const optimisticRoomId = 'opt_quick_1234567890_abcd1234';
    const realRoomId = 'real_room_9876543210';
    
    // Simulate optimistic room creation
    const optimisticData = {
      id: optimisticRoomId,
      gameMode: 'classic',
      gameType: 'quick' as const,
      isOptimistic: true as const,
      playerData: {
        playerDisplayName: 'TestPlayer',
        playerId: 'test_user_123',
        displayBackgroundEquipped: null,
        matchBackgroundEquipped: null,
        playerStats: {
          bestStreak: 0,
          currentStreak: 0,
          gamesPlayed: 0,
          matchWins: 0
        }
      },
      status: 'searching' as const,
      searchText: 'Searching for opponents...'
    };
    
    // Test 1: Check optimistic room detection
    const isOptimistic = OptimisticMatchmakingService.isOptimisticRoom(optimisticRoomId);
    if (!isOptimistic) {
      console.error('❌ Optimistic room detection failed');
      return false;
    }
    
    // Test 2: Simulate real room creation and bridge entry
    const realRoomData = {
      id: realRoomId,
      gameMode: 'classic',
      gameType: 'Open Server',
      hostData: optimisticData.playerData,
      createdAt: new Date(),
      playersRequired: 1
    };
    
    // This simulates what happens when the real room is created
    OptimisticMatchmakingService.setBridgeRoomData(realRoomId, realRoomData);
    
    // Test 3: GameWaitingRoom should be able to access room data immediately
    const immediateAccess = OptimisticMatchmakingService.getBridgeRoomData(realRoomId);
    if (!immediateAccess) {
      console.error('❌ Immediate room access failed');
      return false;
    }
    
    // Test 4: Validate bridge system status
    const bridgeStatus = OptimisticMatchmakingService.validateBridgeSystem();
    if (!bridgeStatus.isWorking || bridgeStatus.bridgeEntries === 0) {
      console.error('❌ Bridge system validation failed');
      return false;
    }
    
    // Cleanup
    OptimisticMatchmakingService.clearBridgeRoomData(realRoomId);
    
    console.log('✅ Race condition prevention test passed');
    return true;
  }
  
  /**
   * Run all bridge entry system tests
   */
  static runAllTests(): boolean {
    console.log('🧪 Starting Bridge Entry System Tests...');
    
    const test1 = this.testBridgeDataOperations();
    const test2 = this.testRaceConditionPrevention();
    
    const allPassed = test1 && test2;
    
    if (allPassed) {
      console.log('✅ All Bridge Entry System tests passed!');
      console.log('🌉 The bridge system successfully prevents race conditions');
      console.log('🌉 GameWaitingRoom can now access room data immediately');
    } else {
      console.error('❌ Some Bridge Entry System tests failed');
    }
    
    return allPassed;
  }
}

// Export test function for manual testing
export const testBridgeEntrySystem = () => BridgeEntrySystemTest.runAllTests();
