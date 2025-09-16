/**
 * Advanced Queue Management Test Script
 * Tests the high-performance queue system with simulated concurrent load
 */

import { AdvancedQueueManagementService } from '../src/services/advancedQueueManagementService';
import { SessionPlayerData } from '../src/services/gameSessionService';

// Test configuration
const TEST_CONFIG = {
  // Concurrent load tests
  SMALL_LOAD: 10,       // 10 concurrent players
  MEDIUM_LOAD: 100,     // 100 concurrent players  
  LARGE_LOAD: 1000,     // 1000 concurrent players
  MASSIVE_LOAD: 5000,   // 5000 concurrent players
  
  // Game modes to test
  GAME_MODES: ['classic', 'blitz', 'tournament', 'custom'],
  SESSION_TYPES: ['quick', 'ranked', 'tournament'] as const,
  REGIONS: ['na-east', 'na-west', 'eu-west', 'asia-pacific', 'global'],
  
  // Test duration
  TEST_DURATION: 300000, // 5 minutes
  STATS_INTERVAL: 30000  // 30 seconds
};

interface TestPlayer {
  id: string;
  displayName: string;
  skillRating: number;
  region: string;
  preferredGameMode: string;
  sessionType: 'quick' | 'ranked' | 'tournament';
}

interface TestResults {
  playersAdded: number;
  playersMatched: number;
  averageWaitTime: number;
  matchQuality: number;
  segmentsCreated: number;
  systemLoad: number;
  processingRate: number;
  errors: string[];
}

class AdvancedQueueTester {
  private testResults: TestResults = {
    playersAdded: 0,
    playersMatched: 0,
    averageWaitTime: 0,
    matchQuality: 0,
    segmentsCreated: 0,
    systemLoad: 0,
    processingRate: 0,
    errors: []
  };

  private activePlayers: Map<string, TestPlayer> = new Map();
  private testStartTime: number = 0;

  /**
   * Generate test players with realistic data
   */
  private generateTestPlayers(count: number): TestPlayer[] {
    const players: TestPlayer[] = [];
    
    for (let i = 0; i < count; i++) {
      const skillRating = this.generateSkillRating();
      const region = this.randomFromArray(TEST_CONFIG.REGIONS);
      const gameMode = this.randomFromArray(TEST_CONFIG.GAME_MODES);
      const sessionType = this.randomFromArray(TEST_CONFIG.SESSION_TYPES);
      
      players.push({
        id: `test_player_${i}`,
        displayName: `TestPlayer${i}`,
        skillRating,
        region,
        preferredGameMode: gameMode,
        sessionType
      });
    }
    
    return players;
  }

  /**
   * Generate realistic skill ratings with normal distribution
   */
  private generateSkillRating(): number {
    // Generate skill ratings with normal distribution around 1000
    const mean = 1000;
    const stdDev = 300;
    
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    const rating = mean + (stdDev * z);
    return Math.max(100, Math.min(3000, Math.round(rating)));
  }

  /**
   * Convert test player to SessionPlayerData
   */
  private createSessionPlayerData(testPlayer: TestPlayer): SessionPlayerData {
    return {
      playerId: testPlayer.id,
      displayName: testPlayer.displayName,
      playerStats: {
        gamesPlayed: Math.floor(Math.random() * 100) + 10,
        matchWins: Math.floor(Math.random() * 50) + 5,
        currentStreak: Math.floor(Math.random() * 10),
        bestStreak: Math.floor(Math.random() * 15) + 5,
        totalScore: Math.floor(Math.random() * 10000) + 1000,
        averageScore: Math.floor(Math.random() * 500) + 100
      }
    };
  }

  /**
   * Random selection helper
   */
  private randomFromArray<T>(array: readonly T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Test small concurrent load (10 players)
   */
  async testSmallLoad(): Promise<void> {
    console.log('🧪 Testing Small Load (10 players)...');
    await this.runLoadTest(TEST_CONFIG.SMALL_LOAD, 'Small Load');
  }

  /**
   * Test medium concurrent load (100 players)
   */
  async testMediumLoad(): Promise<void> {
    console.log('🧪 Testing Medium Load (100 players)...');
    await this.runLoadTest(TEST_CONFIG.MEDIUM_LOAD, 'Medium Load');
  }

  /**
   * Test large concurrent load (1000 players)
   */
  async testLargeLoad(): Promise<void> {
    console.log('🧪 Testing Large Load (1000 players)...');
    await this.runLoadTest(TEST_CONFIG.LARGE_LOAD, 'Large Load');
  }

  /**
   * Test massive concurrent load (5000 players)
   */
  async testMassiveLoad(): Promise<void> {
    console.log('🧪 Testing Massive Load (5000 players)...');
    await this.runLoadTest(TEST_CONFIG.MASSIVE_LOAD, 'Massive Load');
  }

  /**
   * Run load test with specified number of players
   */
  private async runLoadTest(playerCount: number, testName: string): Promise<void> {
    try {
      this.testStartTime = Date.now();
      this.resetTestResults();
      
      console.log(`🚀 Starting ${testName} with ${playerCount} players...`);
      
      // Generate test players
      const testPlayers = this.generateTestPlayers(playerCount);
      console.log(`📋 Generated ${testPlayers.length} test players`);
      
      // Start queue system
      AdvancedQueueManagementService.startAdvancedQueueSystem();
      
      // Add players to queue in batches to simulate realistic arrival
      const batchSize = Math.min(50, Math.ceil(playerCount / 10));
      const batches = this.chunkArray(testPlayers, batchSize);
      
      console.log(`📦 Adding players in ${batches.length} batches of ${batchSize}`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📥 Adding batch ${i + 1}/${batches.length} (${batch.length} players)`);
        
        // Add batch of players
        const batchPromises = batch.map(async (testPlayer) => {
          try {
            const playerData = this.createSessionPlayerData(testPlayer);
            const preferences = {
              maxWaitTime: 300000,
              skillTolerance: 'balanced' as const,
              regionPreference: testPlayer.region,
              allowCrossPlatform: true,
              preferredGameSpeed: 'normal' as const,
              avoidRecentOpponents: true,
              premiumPriority: Math.random() > 0.9 // 10% premium players
            };
            
            const result = await AdvancedQueueManagementService.joinQueue(
              playerData,
              testPlayer.preferredGameMode,
              testPlayer.sessionType,
              preferences,
              testPlayer.region
            );
            
            if (result.success) {
              this.activePlayers.set(testPlayer.id, testPlayer);
              this.testResults.playersAdded++;
            } else {
              this.testResults.errors.push(`Failed to add player ${testPlayer.id}`);
            }
            
          } catch (error) {
            this.testResults.errors.push(`Error adding player ${testPlayer.id}: ${error}`);
          }
        });
        
        await Promise.allSettled(batchPromises);
        
        // Small delay between batches to simulate realistic arrival patterns
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`✅ Added ${this.testResults.playersAdded} players to queue`);
      
      // Monitor the system for test duration
      await this.monitorSystemPerformance();
      
      // Get final statistics
      const finalStats = await AdvancedQueueManagementService.getQueueStatistics();
      
      // Stop queue system
      AdvancedQueueManagementService.stopAdvancedQueueSystem();
      
      // Display results
      this.displayTestResults(testName, finalStats);
      
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      this.testResults.errors.push(`Test failed: ${error}`);
    }
  }

  /**
   * Monitor system performance during test
   */
  private async monitorSystemPerformance(): Promise<void> {
    console.log(`📊 Monitoring system performance for ${TEST_CONFIG.TEST_DURATION / 1000} seconds...`);
    
    const startTime = Date.now();
    const monitoringInterval = setInterval(async () => {
      try {
        const stats = await AdvancedQueueManagementService.getQueueStatistics();
        const elapsed = Date.now() - startTime;
        
        console.log(`⏱️  ${Math.round(elapsed / 1000)}s - Players: ${stats.totalPlayers}, Avg Wait: ${Math.round(stats.averageWaitTime / 1000)}s, Matches: ${stats.successfulMatches}`);
        
        // Update test results
        this.testResults.systemLoad = stats.concurrentLoad;
        this.testResults.processingRate = stats.processingRate;
        this.testResults.averageWaitTime = stats.averageWaitTime;
        this.testResults.playersMatched = stats.successfulMatches;
        
      } catch (error) {
        console.error('❌ Error monitoring system:', error);
        this.testResults.errors.push(`Monitoring error: ${error}`);
      }
    }, TEST_CONFIG.STATS_INTERVAL);
    
    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.TEST_DURATION));
    
    clearInterval(monitoringInterval);
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Reset test results
   */
  private resetTestResults(): void {
    this.testResults = {
      playersAdded: 0,
      playersMatched: 0,
      averageWaitTime: 0,
      matchQuality: 0,
      segmentsCreated: 0,
      systemLoad: 0,
      processingRate: 0,
      errors: []
    };
    this.activePlayers.clear();
  }

  /**
   * Display test results
   */
  private displayTestResults(testName: string, finalStats: any): void {
    const testDuration = Date.now() - this.testStartTime;
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 ${testName} Test Results`);
    console.log('='.repeat(60));
    
    console.log(`⏱️  Test Duration: ${Math.round(testDuration / 1000)}s`);
    console.log(`👥 Players Added: ${this.testResults.playersAdded}`);
    console.log(`🎮 Matches Created: ${this.testResults.playersMatched}`);
    console.log(`⏳ Average Wait Time: ${Math.round(this.testResults.averageWaitTime / 1000)}s`);
    console.log(`🔄 Processing Rate: ${this.testResults.processingRate.toFixed(2)} matches/sec`);
    console.log(`💾 System Load: ${this.testResults.systemLoad} concurrent players`);
    
    if (finalStats) {
      console.log('\n📈 Final Queue Statistics:');
      console.log(`   Total Players: ${finalStats.totalPlayers}`);
      console.log(`   Successful Matches: ${finalStats.successfulMatches}`);
      console.log(`   Failed Matches: ${finalStats.failedMatches}`);
      console.log(`   Queues by Mode:`, finalStats.queuesByMode);
      console.log(`   Queues by Region:`, finalStats.queuesByRegion);
      console.log(`   Queues by Skill:`, finalStats.queuesBySkill);
    }
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors Encountered:');
      this.testResults.errors.slice(0, 10).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      if (this.testResults.errors.length > 10) {
        console.log(`   ... and ${this.testResults.errors.length - 10} more errors`);
      }
    }
    
    // Calculate success metrics
    const matchSuccess = this.testResults.playersAdded > 0 ? 
      (this.testResults.playersMatched / this.testResults.playersAdded) * 100 : 0;
    const errorRate = this.testResults.playersAdded > 0 ? 
      (this.testResults.errors.length / this.testResults.playersAdded) * 100 : 0;
    
    console.log('\n🎯 Performance Metrics:');
    console.log(`   Match Success Rate: ${matchSuccess.toFixed(1)}%`);
    console.log(`   Error Rate: ${errorRate.toFixed(1)}%`);
    console.log(`   Throughput: ${(this.testResults.playersAdded / (testDuration / 1000)).toFixed(2)} players/sec`);
    
    // Performance assessment
    console.log('\n📋 Performance Assessment:');
    if (this.testResults.averageWaitTime < 30000) {
      console.log('   ✅ Wait Times: EXCELLENT (<30s)');
    } else if (this.testResults.averageWaitTime < 60000) {
      console.log('   ✅ Wait Times: GOOD (<60s)');
    } else if (this.testResults.averageWaitTime < 120000) {
      console.log('   ⚠️  Wait Times: ACCEPTABLE (<2m)');
    } else {
      console.log('   ❌ Wait Times: POOR (>2m)');
    }
    
    if (errorRate < 1) {
      console.log('   ✅ Error Rate: EXCELLENT (<1%)');
    } else if (errorRate < 5) {
      console.log('   ✅ Error Rate: GOOD (<5%)');
    } else if (errorRate < 10) {
      console.log('   ⚠️  Error Rate: ACCEPTABLE (<10%)');
    } else {
      console.log('   ❌ Error Rate: POOR (>10%)');
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Run comprehensive test suite
   */
  async runFullTestSuite(): Promise<void> {
    console.log('🧪 Starting Advanced Queue Management Test Suite...');
    console.log('====================================================\n');

    try {
      // Test progression from small to massive load
      await this.testSmallLoad();
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second break
      
      await this.testMediumLoad();
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second break
      
      await this.testLargeLoad();
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second break
      
      await this.testMassiveLoad();
      
      console.log('🎉 Advanced Queue Management Test Suite Completed!');
      console.log('All load tests have been executed successfully.');
      
    } catch (error) {
      console.error('❌ Test Suite Failed:', error);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'full';
  
  const tester = new AdvancedQueueTester();
  
  switch (testType) {
    case 'small':
      await tester.testSmallLoad();
      break;
    case 'medium':
      await tester.testMediumLoad();
      break;
    case 'large':
      await tester.testLargeLoad();
      break;
    case 'massive':
      await tester.testMassiveLoad();
      break;
    case 'full':
    default:
      await tester.runFullTestSuite();
      break;
  }
  
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { AdvancedQueueTester };
