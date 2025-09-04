'use client'

import React, { useState, useEffect } from 'react';
import { testEnhancedHeartbeatSystem } from '../tests/enhancedHeartbeatSystem.test';
import { PlayerHeartbeatService } from '../services/playerHeartbeatService';

export default function HeartbeatTestRunner() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [heartbeatStats, setHeartbeatStats] = useState<any>(null);

  // Update heartbeat stats every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHeartbeatStats(PlayerHeartbeatService.getHeartbeatStats());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults(['🧪 Starting Enhanced Player Heartbeat System Tests...']);
    
    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    const logs: string[] = [];
    
    console.log = (...args) => {
      const message = args.join(' ');
      logs.push(message);
      setTestResults(prev => [...prev, message]);
      originalLog(...args);
    };
    
    console.error = (...args) => {
      const message = '❌ ' + args.join(' ');
      logs.push(message);
      setTestResults(prev => [...prev, message]);
      originalError(...args);
    };

    try {
      await testEnhancedHeartbeatSystem();
    } catch (error) {
      console.error('Test runner error:', error);
    } finally {
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const startPersonalHeartbeat = async () => {
    const testUserId = `manual_test_${Date.now()}`;
    await PlayerHeartbeatService.startHeartbeat(testUserId);
    setTestResults(prev => [...prev, `💓 Started heartbeat for user: ${testUserId}`]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Enhanced Player Heartbeat System Test Runner
        </h1>

        {/* Real-time Stats */}
        {heartbeatStats && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100">
              📊 Real-time Heartbeat Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Users:</span>
                <div className="text-lg font-bold text-blue-600">{heartbeatStats.totalTrackedUsers}</div>
              </div>
              <div>
                <span className="font-medium">Active Users:</span>
                <div className="text-lg font-bold text-green-600">{heartbeatStats.activeUsers}</div>
              </div>
              <div>
                <span className="font-medium">Heartbeat Frequency:</span>
                <div className="text-lg font-bold text-purple-600">{heartbeatStats.heartbeatFrequency / 1000}s</div>
              </div>
              <div>
                <span className="font-medium">Inactivity Threshold:</span>
                <div className="text-lg font-bold text-orange-600">{heartbeatStats.inactivityThreshold / 1000}s</div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? '🔄 Running Tests...' : '🧪 Run All Tests'}
          </button>
          
          <button
            onClick={startPersonalHeartbeat}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            💓 Start Test Heartbeat
          </button>
          
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            🗑️ Clear Results
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              📋 Test Results
            </h2>
            <div className="max-h-96 overflow-y-auto space-y-1">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`text-sm font-mono p-2 rounded ${
                    result.includes('✅') 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                      : result.includes('❌')
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                      : result.includes('🧪')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                      : result.includes('📊')
                      ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Information Panel */}
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
            💡 Step 4 Enhancement Details
          </h3>
          <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
            <li>• <strong>Increased Frequency:</strong> Heartbeats now send every 15 seconds (was 30 seconds)</li>
            <li>• <strong>Enhanced Tracking:</strong> Local maps for faster online status checks</li>
            <li>• <strong>Better Cleanup:</strong> More frequent cleanup of inactive players (every 60 seconds)</li>
            <li>• <strong>Improved Recovery:</strong> Better error handling and retry mechanisms</li>
            <li>• <strong>Statistics:</strong> Real-time monitoring of heartbeat system performance</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
