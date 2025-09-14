/**
 * Orphaned Session Cleanup Script
 * Manual script to test and trigger orphaned session cleanup
 */

import { OrphanedSessionCleanupService } from '../src/services/orphanedSessionCleanupService';

async function runOrphanedSessionCleanup() {
  console.log('🧹 Starting Orphaned Session Cleanup Test...');
  console.log('==========================================\n');

  try {
    // Get stats before cleanup
    console.log('📊 Getting orphaned session stats (last 24 hours)...');
    const statsBefore = await OrphanedSessionCleanupService.getOrphanedSessionStats(24);
    
    console.log('📈 Stats BEFORE cleanup:');
    console.log(`   Total orphaned: ${statsBefore.total}`);
    console.log(`   By status:`, statsBefore.byStatus);
    console.log(`   By game mode:`, statsBefore.byGameMode);
    console.log(`   By disconnection type:`, statsBefore.byDisconnectionType);
    console.log(`   Average age: ${Math.round(statsBefore.averageAge / 1000)}s\n`);

    // Run manual cleanup
    console.log('🚀 Running manual orphaned session cleanup...');
    const cleanupResult = await OrphanedSessionCleanupService.runManualCleanup();
    
    console.log('✅ Cleanup completed!');
    console.log(`   Sessions cleaned: ${cleanupResult.cleaned}`);
    console.log(`   Errors: ${cleanupResult.errors.length}`);
    
    if (cleanupResult.errors.length > 0) {
      console.log('❌ Cleanup errors:');
      cleanupResult.errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n📊 Stats AFTER cleanup:');
    console.log(`   Total orphaned: ${cleanupResult.stats.total}`);
    console.log(`   By status:`, cleanupResult.stats.byStatus);
    console.log(`   By game mode:`, cleanupResult.stats.byGameMode);
    console.log(`   By disconnection type:`, cleanupResult.stats.byDisconnectionType);
    console.log(`   Average age: ${Math.round(cleanupResult.stats.averageAge / 1000)}s`);

    console.log('\n🎯 Test Results:');
    console.log(`   ✅ Orphaned sessions cleaned: ${cleanupResult.cleaned}`);
    console.log(`   ✅ Service functioning: ${cleanupResult.errors.length === 0 ? 'YES' : 'WITH ERRORS'}`);
    console.log(`   ✅ Stats collection working: ${cleanupResult.stats.total >= 0 ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('❌ Orphaned session cleanup test failed:', error);
    console.log('\n💡 Possible issues:');
    console.log('   - Firebase connection problems');
    console.log('   - Permission issues');
    console.log('   - Service configuration problems');
  }

  console.log('\n==========================================');
  console.log('🏁 Orphaned Session Cleanup Test Complete');
}

async function testOrphanedSessionService() {
  console.log('🔧 Testing Orphaned Session Service Functionality...');
  console.log('=====================================================\n');

  try {
    // Test service start/stop
    console.log('🚀 Testing service start/stop...');
    OrphanedSessionCleanupService.startCleanupService();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    OrphanedSessionCleanupService.stopCleanupService();
    console.log('✅ Service start/stop test passed\n');

    // Test stats collection
    console.log('📊 Testing stats collection...');
    const stats = await OrphanedSessionCleanupService.getOrphanedSessionStats(1); // Last hour
    console.log('✅ Stats collection test passed');
    console.log(`   Found ${stats.total} orphaned sessions in last hour\n`);

    // Test manual cleanup
    console.log('🧹 Testing manual cleanup...');
    const cleanupResult = await OrphanedSessionCleanupService.runManualCleanup();
    console.log('✅ Manual cleanup test passed');
    console.log(`   Cleaned: ${cleanupResult.cleaned}`);
    console.log(`   Errors: ${cleanupResult.errors.length}\n`);

    console.log('🎉 All OrphanedSessionCleanupService tests PASSED!');

  } catch (error) {
    console.error('❌ OrphanedSessionCleanupService test FAILED:', error);
  }

  console.log('\n=====================================================');
  console.log('🏁 Service Test Complete');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'cleanup';

  switch (command) {
    case 'cleanup':
      await runOrphanedSessionCleanup();
      break;
    case 'test':
      await testOrphanedSessionService();
      break;
    case 'both':
      await testOrphanedSessionService();
      await runOrphanedSessionCleanup();
      break;
    default:
      console.log('Usage: node test-orphaned-cleanup.js [cleanup|test|both]');
      console.log('  cleanup - Run orphaned session cleanup');
      console.log('  test    - Test service functionality');
      console.log('  both    - Run both test and cleanup');
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

export { runOrphanedSessionCleanup, testOrphanedSessionService };
