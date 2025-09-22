/**
 * Matchmaking Debug Test
 * Test current matchmaking system to identify connection issues
 */

import { EnhancedMatchmakingService } from './enhancedMatchmakingService';
import { auth } from './firebase';

interface MatchmakingDebugResult {
  firebaseConnection: boolean;
  goServicesConnection: boolean;
  websocketConnection: boolean;
  queueSystemWorking: boolean;
  issues: string[];
}

export class MatchmakingDebugger {
  
  /**
   * Run comprehensive matchmaking debug test
   */
  static async debugMatchmakingSystem(): Promise<MatchmakingDebugResult> {
    const result: MatchmakingDebugResult = {
      firebaseConnection: false,
      goServicesConnection: false,
      websocketConnection: false,
      queueSystemWorking: false,
      issues: []
    };

    console.log('🔍 Starting matchmaking debug test...');

    try {
      // Test 1: Firebase Connection
      console.log('📡 Testing Firebase connection...');
      try {
        const user = auth.currentUser;
        if (user) {
          result.firebaseConnection = true;
          console.log('✅ Firebase connection: OK');
        } else {
          result.issues.push('No authenticated user for Firebase test');
          console.log('❌ Firebase connection: No authenticated user');
        }
      } catch (error) {
        result.issues.push(`Firebase connection error: ${error}`);
        console.log('❌ Firebase connection failed:', error);
      }

      // Test 2: Go Services Connection
      console.log('🚀 Testing Go services connection...');
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
        if (apiUrl) {
          const response = await fetch(`${apiUrl}/health`, {
            method: 'GET',
            timeout: 5000,
          } as any);
          
          if (response.ok) {
            result.goServicesConnection = true;
            console.log('✅ Go services connection: OK');
          } else {
            result.issues.push(`Go services returned status: ${response.status}`);
            console.log('❌ Go services connection: Bad status', response.status);
          }
        } else {
          result.issues.push('No API Gateway URL configured');
          console.log('❌ Go services: No API URL configured');
        }
      } catch (error) {
        result.issues.push(`Go services connection error: ${error}`);
        console.log('❌ Go services connection failed:', error);
      }

      // Test 3: WebSocket Connection
      console.log('🔌 Testing WebSocket connection...');
      try {
        const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://dashdice-production.up.railway.app/api/v1/realtime/ws';
        const ws = new WebSocket(wsUrl);
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }, 10000);

          ws.onopen = () => {
            clearTimeout(timeout);
            result.websocketConnection = true;
            console.log('✅ WebSocket connection: OK');
            ws.close();
            resolve(true);
          };

          ws.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });
      } catch (error) {
        result.issues.push(`WebSocket connection error: ${error}`);
        console.log('❌ WebSocket connection failed:', error);
      }

      // Test 4: Queue System
      console.log('⏳ Testing queue system...');
      try {
        if (result.firebaseConnection) {
          // Initialize enhanced matchmaking service
          await EnhancedMatchmakingService.initialize();
          
          // Try to get queue status
          const status = await EnhancedMatchmakingService.getQueueStatus('classic');
          if (status) {
            result.queueSystemWorking = true;
            console.log('✅ Queue system: OK', status);
          } else {
            result.issues.push('Queue status returned null');
            console.log('❌ Queue system: No status returned');
          }
        } else {
          result.issues.push('Cannot test queue system without Firebase connection');
          console.log('❌ Queue system: Cannot test without Firebase');
        }
      } catch (error) {
        result.issues.push(`Queue system error: ${error}`);
        console.log('❌ Queue system failed:', error);
      }

      // Summary
      console.log('\n📊 Debug Summary:');
      console.log(`Firebase: ${result.firebaseConnection ? '✅' : '❌'}`);
      console.log(`Go Services: ${result.goServicesConnection ? '✅' : '❌'}`);
      console.log(`WebSocket: ${result.websocketConnection ? '✅' : '❌'}`);
      console.log(`Queue System: ${result.queueSystemWorking ? '✅' : '❌'}`);
      
      if (result.issues.length > 0) {
        console.log('\n🐛 Issues found:');
        result.issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`));
      }

    } catch (error) {
      result.issues.push(`Debug test failed: ${error}`);
      console.error('❌ Debug test failed:', error);
    }

    return result;
  }

  /**
   * Test player connection flow
   */
  static async testPlayerConnection(gameMode: string = 'classic'): Promise<void> {
    console.log(`🎮 Testing player connection flow for ${gameMode}...`);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No authenticated user for connection test');
        return;
      }

      // Initialize matchmaking
      await EnhancedMatchmakingService.initialize();

      // Set up status listener
      const statusCallback = (status: any) => {
        console.log('📊 Queue status update:', status);
      };

      // Join queue
      console.log('🚀 Joining matchmaking queue...');
      const result = await EnhancedMatchmakingService.joinQueue({
        gameMode,
        preferredMode: 'hybrid',
        maxWaitTime: 60
      }, statusCallback);

      console.log('✅ Queue join result:', result);

      // Wait a bit for potential matches
      setTimeout(() => {
        console.log('⏰ Test timeout - leaving queue');
        EnhancedMatchmakingService.leaveQueue('classic');
      }, 15000); // 15 second test

    } catch (error) {
      console.error('❌ Player connection test failed:', error);
    }
  }

  /**
   * Run live matchmaking test between two simulated players
   */
  static async simulateMatchmaking(): Promise<void> {
    console.log('🎭 Simulating matchmaking between players...');
    
    // This would require multiple auth contexts, so for now just log the process
    console.log('📝 To test real matchmaking:');
    console.log('1. Open two browser windows');
    console.log('2. Login with different accounts');
    console.log('3. Both join the same game mode queue');
    console.log('4. Watch for match found events');
    
    // We can test the queue system in this session
    await this.testPlayerConnection('classic');
  }
}

// Export for easy console access
(window as any).MatchmakingDebugger = MatchmakingDebugger;
