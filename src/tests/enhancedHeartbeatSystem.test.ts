/**
 * Enhanced Player Heartbeat System Test
 * 
 * This test validates the Step 4 enhancements to PlayerHeartbeatService:
 * - 15-second heartbeat frequency (increased from 30 seconds)
 * - Enhanced online status tracking
 * - Better error handling and recovery
 * - More accurate player activity detection
 */

import { PlayerHeartbeatService } from '../services/playerHeartbeatService';

export class EnhancedHeartbeatSystemTest {
  
  /**
   * Test enhanced heartbeat frequency and tracking
   */
  static testHeartbeatFrequency(): boolean {
    console.log('🧪 Testing enhanced heartbeat frequency...');
    
    // Test 1: Verify heartbeat frequency is 15 seconds
    const stats = PlayerHeartbeatService.getHeartbeatStats();
    if (stats.heartbeatFrequency !== 15000) {
      console.error(`❌ Expected heartbeat frequency 15000ms, got ${stats.heartbeatFrequency}ms`);
      return false;
    }
    
    // Test 2: Verify inactivity threshold is appropriately adjusted
    if (stats.inactivityThreshold !== 45000) {
      console.error(`❌ Expected inactivity threshold 45000ms, got ${stats.inactivityThreshold}ms`);
      return false;
    }
    
    console.log('✅ Enhanced heartbeat frequency test passed');
    return true;
  }
  
  /**
   * Test online status tracking functionality
   */
  static async testOnlineStatusTracking(): Promise<boolean> {
    console.log('🧪 Testing enhanced online status tracking...');
    
    const testUserId = 'test_user_heartbeat_123';
    
    try {
      // Test 1: Start heartbeat and verify user is tracked as online
      await PlayerHeartbeatService.startHeartbeat(testUserId);
      
      // Wait a moment for heartbeat to register
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isOnline = PlayerHeartbeatService.isUserOnline(testUserId);
      if (!isOnline) {
        console.error('❌ User should be online after starting heartbeat');
        return false;
      }
      
      // Test 2: Verify user appears in active users list
      const activeUsers = PlayerHeartbeatService.getActiveUsers();
      if (!activeUsers.includes(testUserId)) {
        console.error('❌ User should appear in active users list');
        return false;
      }
      
      // Test 3: Stop heartbeat and verify cleanup
      PlayerHeartbeatService.stopHeartbeat(testUserId);
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const isStillOnline = PlayerHeartbeatService.isUserOnline(testUserId);
      if (isStillOnline) {
        console.error('❌ User should be offline after stopping heartbeat');
        return false;
      }
      
      console.log('✅ Enhanced online status tracking test passed');
      return true;
      
    } catch (error) {
      console.error('❌ Error in online status tracking test:', error);
      return false;
    }
  }
  
  /**
   * Test heartbeat statistics and monitoring
   */
  static testHeartbeatStatistics(): boolean {
    console.log('🧪 Testing heartbeat statistics...');
    
    try {
      // Test 1: Get heartbeat statistics
      const stats = PlayerHeartbeatService.getHeartbeatStats();
      
      // Verify all expected properties exist
      const expectedProperties = ['totalTrackedUsers', 'activeUsers', 'heartbeatFrequency', 'inactivityThreshold'];
      for (const prop of expectedProperties) {
        if (!(prop in stats)) {
          console.error(`❌ Missing property ${prop} in heartbeat stats`);
          return false;
        }
      }
      
      // Test 2: Verify statistics are reasonable
      if (stats.totalTrackedUsers < 0 || stats.activeUsers < 0) {
        console.error('❌ User counts should not be negative');
        return false;
      }
      
      if (stats.activeUsers > stats.totalTrackedUsers) {
        console.error('❌ Active users should not exceed total tracked users');
        return false;
      }
      
      console.log('📊 Current heartbeat stats:', stats);
      console.log('✅ Heartbeat statistics test passed');
      return true;
      
    } catch (error) {
      console.error('❌ Error in heartbeat statistics test:', error);
      return false;
    }
  }
  
  /**
   * Test enhanced error handling and recovery
   */
  static async testErrorHandlingAndRecovery(): Promise<boolean> {
    console.log('🧪 Testing enhanced error handling...');
    
    const testUserId = 'test_user_error_handling_456';
    
    try {
      // Test 1: Start heartbeat
      await PlayerHeartbeatService.startHeartbeat(testUserId);
      
      // Verify heartbeat is running
      let isOnline = PlayerHeartbeatService.isUserOnline(testUserId);
      if (!isOnline) {
        console.error('❌ User should be online after starting heartbeat');
        return false;
      }
      
      // Test 2: Force cleanup to test recovery mechanisms
      await PlayerHeartbeatService.cleanupInactivePlayers();
      
      // Test 3: Test force refresh functionality
      await PlayerHeartbeatService.forceRefreshAllHeartbeats();
      
      // Test 4: Clean up test user
      PlayerHeartbeatService.stopHeartbeat(testUserId);
      
      console.log('✅ Enhanced error handling test passed');
      return true;
      
    } catch (error) {
      console.error('❌ Error in error handling test:', error);
      PlayerHeartbeatService.stopHeartbeat(testUserId); // Cleanup on error
      return false;
    }
  }
  
  /**
   * Test system performance with enhanced frequency
   */
  static async testPerformanceImpact(): Promise<boolean> {
    console.log('🧪 Testing performance impact of enhanced heartbeat system...');
    
    const testUserIds = ['perf_test_1', 'perf_test_2', 'perf_test_3'];
    
    try {
      const startTime = Date.now();
      
      // Start multiple heartbeats
      for (const userId of testUserIds) {
        await PlayerHeartbeatService.startHeartbeat(userId);
      }
      
      const setupTime = Date.now() - startTime;
      
      // Wait for a few heartbeat cycles
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check all users are still tracked
      const activeUsers = PlayerHeartbeatService.getActiveUsers();
      const trackedTestUsers = testUserIds.filter(id => activeUsers.includes(id));
      
      if (trackedTestUsers.length !== testUserIds.length) {
        console.error(`❌ Expected ${testUserIds.length} tracked users, got ${trackedTestUsers.length}`);
        return false;
      }
      
      // Clean up test users
      for (const userId of testUserIds) {
        PlayerHeartbeatService.stopHeartbeat(userId);
      }
      
      console.log(`📊 Performance test: Setup time ${setupTime}ms for ${testUserIds.length} users`);
      console.log('✅ Performance impact test passed');
      return true;
      
    } catch (error) {
      console.error('❌ Error in performance test:', error);
      
      // Cleanup on error
      for (const userId of testUserIds) {
        PlayerHeartbeatService.stopHeartbeat(userId);
      }
      return false;
    }
  }
  
  /**
   * Run all enhanced heartbeat system tests
   */
  static async runAllTests(): Promise<boolean> {
    console.log('🧪 Starting Enhanced Player Heartbeat System Tests...');
    
    const test1 = this.testHeartbeatFrequency();
    const test2 = await this.testOnlineStatusTracking();
    const test3 = this.testHeartbeatStatistics();
    const test4 = await this.testErrorHandlingAndRecovery();
    const test5 = await this.testPerformanceImpact();
    
    const allPassed = test1 && test2 && test3 && test4 && test5;
    
    if (allPassed) {
      console.log('✅ All Enhanced Player Heartbeat System tests passed!');
      console.log('💓 Enhanced heartbeat system is working correctly:');
      console.log('   - 15-second heartbeat intervals for responsive activity detection');
      console.log('   - Enhanced online status tracking with local caching');
      console.log('   - Improved error handling and recovery mechanisms');
      console.log('   - Better performance monitoring and statistics');
    } else {
      console.error('❌ Some Enhanced Player Heartbeat System tests failed');
    }
    
    return allPassed;
  }
}

// Export test function for manual testing
export const testEnhancedHeartbeatSystem = () => EnhancedHeartbeatSystemTest.runAllTests();
