import { deleteTestPlayers, checkForTestMatches } from './deleteTestPlayers';

/**
 * Global test utilities for browser console
 * Available in window.testUtils when in development
 */
export const testUtils = {
  async deleteTestPlayers() {
    try {
      const count = await deleteTestPlayers();
      console.log(`🧹 Cleanup complete! Deleted ${count} test documents.`);
      return count;
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return 0;
    }
  },

  async checkTestMatches() {
    try {
      const count = await checkForTestMatches();
      console.log(`📊 Found ${count} test matches in database.`);
      return count;
    } catch (error) {
      console.error('❌ Check failed:', error);
      return 0;
    }
  },

  async cleanupAndCheck() {
    console.log('🧪 Running full cleanup and check...');
    const beforeCount = await this.checkTestMatches();
    const deletedCount = await this.deleteTestPlayers();
    const afterCount = await this.checkTestMatches();
    
    console.log(`📊 Cleanup Summary:
    - Before: ${beforeCount} test documents
    - Deleted: ${deletedCount} documents  
    - After: ${afterCount} test documents
    - Success: ${afterCount === 0 ? '✅' : '⚠️'}`);
    
    return { beforeCount, deletedCount, afterCount };
  }
};

// Make available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).testUtils = testUtils;
  console.log('🧪 Test utilities loaded! Available commands:');
  console.log('- testUtils.deleteTestPlayers() - Delete all test matches');
  console.log('- testUtils.checkTestMatches() - Check for test matches');
  console.log('- testUtils.cleanupAndCheck() - Full cleanup with summary');
}
