/**
 * Go Services Integration Test Component
 * Test connectivity with Go microservices backend
 */

"use client";

import { useState, useEffect } from 'react';
import DashDiceAPI from '@/services/apiClient';

interface ConnectionStatus {
  healthy: boolean;
  status: string;
  error?: string;
}

export default function GoServicesTest() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    healthy: false,
    status: 'checking...',
  });
  const [publicStatus, setPublicStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testConnection = async () => {
    addTestResult('🔄 Testing Go services connection...');
    
    try {
      // Test health check
      const healthy = await DashDiceAPI.healthCheck();
      
      if (healthy) {
        setConnectionStatus({ healthy: true, status: 'connected' });
        addTestResult('✅ Health check passed');
        
        // Test public status endpoint
        try {
          const status = await DashDiceAPI.getPublicStatus();
          setPublicStatus(status);
          addTestResult('✅ Public status retrieved');
        } catch (error) {
          addTestResult(`⚠️ Public status error: ${error}`);
        }
        
      } else {
        setConnectionStatus({ 
          healthy: false, 
          status: 'disconnected',
          error: 'Health check failed'
        });
        addTestResult('❌ Health check failed - Go services not running');
      }
    } catch (error) {
      setConnectionStatus({ 
        healthy: false, 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      addTestResult(`❌ Connection error: ${error}`);
    }
  };

  const testAuthentication = async () => {
    addTestResult('🔄 Testing authentication...');
    
    try {
      const result = await DashDiceAPI.verifyAuth();
      if (result.valid) {
        addTestResult('✅ Auth verification passed');
      } else {
        addTestResult('⚠️ Auth verification failed (expected for demo token)');
      }
    } catch (error) {
      addTestResult(`❌ Auth test error: ${error}`);
    }
  };

  const testUserEndpoints = async () => {
    addTestResult('🔄 Testing user endpoints...');
    
    try {
      const user = await DashDiceAPI.getCurrentUser();
      if (user.username) {
        addTestResult(`✅ Got user data: ${user.username}`);
      }
      
      const stats = await DashDiceAPI.getUserStats();
      if (stats.stats) {
        addTestResult(`✅ Got user stats: ${stats.stats.total_games} games played`);
      }
    } catch (error) {
      addTestResult(`❌ User endpoints error: ${error}`);
    }
  };

  const testMatchmaking = async () => {
    addTestResult('🔄 Testing matchmaking endpoints...');
    
    try {
      // Test listing matches
      const matches = await DashDiceAPI.listMatches();
      if (matches.matches) {
        addTestResult(`✅ Listed ${matches.matches.length} matches`);
      }
      
      // Test creating a match
      const newMatch = await DashDiceAPI.createMatch({
        game_mode: 'classic',
        max_players: 2,
        is_private: false,
      });
      
      if (newMatch.match) {
        addTestResult(`✅ Created match: ${newMatch.match.id}`);
      }
    } catch (error) {
      addTestResult(`❌ Matchmaking error: ${error}`);
    }
  };

  const testQueue = async () => {
    addTestResult('🔄 Testing queue endpoints...');
    
    try {
      // Join queue
      await DashDiceAPI.joinQueue({
        game_mode: 'classic',
        preferences: 'casual',
      });
      addTestResult('✅ Joined matchmaking queue');
      
      // Check queue status
      const status = await DashDiceAPI.getQueueStatus();
      if (status.in_queue) {
        addTestResult(`✅ Queue status: Position ${status.queue_info?.position}`);
      }
      
      // Leave queue
      await DashDiceAPI.leaveQueue();
      addTestResult('✅ Left matchmaking queue');
      
    } catch (error) {
      addTestResult(`❌ Queue error: ${error}`);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    addTestResult('🚀 Starting comprehensive Go services test...');
    
    await testConnection();
    
    if (connectionStatus.healthy) {
      await testAuthentication();
      await testUserEndpoints();
      await testMatchmaking();
      await testQueue();
      addTestResult('🎉 All tests completed!');
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">🔧 Go Microservices Integration Test</h2>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 rounded-lg bg-gray-800">
        <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          connectionStatus.healthy ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {connectionStatus.healthy ? '✅ Connected' : '❌ Disconnected'}
        </div>
        
        {connectionStatus.error && (
          <p className="mt-2 text-red-400">Error: {connectionStatus.error}</p>
        )}
      </div>

      {/* Public Status */}
      {publicStatus && (
        <div className="mb-6 p-4 rounded-lg bg-gray-800">
          <h3 className="text-lg font-semibold mb-2">Go Service Status</h3>
          <pre className="text-sm text-green-400 overflow-x-auto">
            {JSON.stringify(publicStatus, null, 2)}
          </pre>
        </div>
      )}

      {/* Test Controls */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <button 
          onClick={testConnection}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          Test Connection
        </button>
        
        <button 
          onClick={testAuthentication}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
          disabled={!connectionStatus.healthy}
        >
          Test Auth
        </button>
        
        <button 
          onClick={testUserEndpoints}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
          disabled={!connectionStatus.healthy}
        >
          Test User APIs
        </button>
        
        <button 
          onClick={testMatchmaking}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded transition-colors"
          disabled={!connectionStatus.healthy}
        >
          Test Matches
        </button>
        
        <button 
          onClick={testQueue}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded transition-colors"
          disabled={!connectionStatus.healthy}
        >
          Test Queue
        </button>
        
        <button 
          onClick={runAllTests}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors font-bold"
        >
          🚀 Run All Tests
        </button>
      </div>

      {/* Test Results */}
      <div className="p-4 rounded-lg bg-gray-800">
        <h3 className="text-lg font-semibold mb-2">Test Results</h3>
        <div className="max-h-96 overflow-y-auto space-y-1 font-mono text-sm">
          {testResults.length === 0 ? (
            <p className="text-gray-400">No test results yet...</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-green-400">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 rounded-lg bg-blue-900/50 border-l-4 border-blue-500">
        <h3 className="text-lg font-semibold mb-2">📝 Next Steps</h3>
        <div className="space-y-2 text-sm">
          <p>1. <strong>Install Docker Desktop</strong> from docker.com</p>
          <p>2. <strong>Start Go services:</strong> <code className="bg-gray-800 px-2 py-1 rounded">cd go-services && docker-compose up -d</code></p>
          <p>3. <strong>Verify services:</strong> Check that all services show as healthy</p>
          <p>4. <strong>Run tests:</strong> Use the buttons above to test API connectivity</p>
        </div>
      </div>
    </div>
  );
}
