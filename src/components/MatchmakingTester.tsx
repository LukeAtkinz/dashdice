/**
 * Matchmaking Test Component
 * For testing and debugging the fixed matchmaking system
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MatchmakingConnectionFixer } from '@/services/matchmakingConnectionFixer';
import { useAuth } from '@/context/AuthContext';

const MatchmakingTester: React.FC = () => {
  const { user } = useAuth();
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<{ waiting: number; estimatedWait: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedGameMode, setSelectedGameMode] = useState('classic');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    // Listen for match found events
    const handleMatchFound = (event: CustomEvent) => {
      addLog(`🎉 MATCH FOUND! ${JSON.stringify(event.detail)}`);
      setIsInQueue(false);
    };

    window.addEventListener('matchFound', handleMatchFound as EventListener);
    return () => window.removeEventListener('matchFound', handleMatchFound as EventListener);
  }, []);

  const joinQueue = async () => {
    if (!user) {
      addLog('❌ Please login first');
      return;
    }

    try {
      addLog(`🎯 Joining ${selectedGameMode} queue...`);
      const result = await MatchmakingConnectionFixer.joinQueue(selectedGameMode, 5);
      
      if (result.success) {
        addLog(`✅ Joined queue successfully! Queue ID: ${result.queueId}`);
        setIsInQueue(true);
        updateQueueStatus();
      } else {
        addLog(`❌ Failed to join queue: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  const leaveQueue = async () => {
    try {
      addLog('🚪 Leaving queue...');
      await MatchmakingConnectionFixer.leaveQueue();
      addLog('✅ Left queue successfully');
      setIsInQueue(false);
      setQueueStatus(null);
    } catch (error) {
      addLog(`❌ Error leaving queue: ${error}`);
    }
  };

  const updateQueueStatus = async () => {
    try {
      const status = await MatchmakingConnectionFixer.getQueueStatus(selectedGameMode);
      setQueueStatus(status);
      addLog(`📊 Queue status: ${status.waiting} waiting, ${status.estimatedWait}`);
    } catch (error) {
      addLog(`❌ Error getting queue status: ${error}`);
    }
  };

  const debugQueue = async () => {
    try {
      addLog('🔍 Running queue debug...');
      await MatchmakingConnectionFixer.debugQueue();
      addLog('✅ Debug complete - check console for details');
    } catch (error) {
      addLog(`❌ Debug error: ${error}`);
    }
  };

  const runConnectionTest = async () => {
    try {
      addLog('🧪 Running connection test...');
      
      // Test Firebase connection
      addLog('📡 Testing Firebase...');
      if (user) {
        addLog('✅ Firebase authenticated');
      } else {
        addLog('❌ No Firebase authentication');
      }

      // Test matchmaking initialization
      addLog('🔧 Testing matchmaking initialization...');
      await MatchmakingConnectionFixer.initialize();
      addLog('✅ Matchmaking system initialized');

      await updateQueueStatus();
      
    } catch (error) {
      addLog(`❌ Connection test failed: ${error}`);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">🔧 Matchmaking Debug Center</h2>
      
      {/* User Status */}
      <div className="mb-4 p-3 bg-gray-800 rounded">
        <p><strong>User:</strong> {user ? user.email : 'Not logged in'}</p>
        <p><strong>Status:</strong> {isInQueue ? '🎯 In Queue' : '⭕ Not in queue'}</p>
      </div>

      {/* Game Mode Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Game Mode:</label>
        <select 
          value={selectedGameMode} 
          onChange={(e) => setSelectedGameMode(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded px-3 py-2"
        >
          <option value="classic">Classic</option>
          <option value="quickfire">Quickfire</option>
          <option value="tournament">Tournament</option>
        </select>
      </div>

      {/* Queue Status */}
      {queueStatus && (
        <div className="mb-4 p-3 bg-blue-900/50 rounded">
          <p><strong>Queue Status:</strong></p>
          <p>Players waiting: {queueStatus.waiting}</p>
          <p>Estimated wait: {queueStatus.estimatedWait}</p>
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <button
          onClick={runConnectionTest}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
        >
          🧪 Test Connection
        </button>
        
        <button
          onClick={isInQueue ? leaveQueue : joinQueue}
          disabled={!user}
          className={`px-4 py-2 rounded transition-colors ${
            isInQueue 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          } disabled:bg-gray-600 disabled:cursor-not-allowed`}
        >
          {isInQueue ? '🚪 Leave Queue' : '🎯 Join Queue'}
        </button>
        
        <button
          onClick={updateQueueStatus}
          className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded transition-colors"
        >
          📊 Update Status
        </button>
        
        <button
          onClick={debugQueue}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors"
        >
          🔍 Debug Queue
        </button>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-3 bg-gray-800 rounded text-sm">
        <h3 className="font-bold mb-2">Testing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>First run "Test Connection" to verify system is working</li>
          <li>Join queue and watch for other players</li>
          <li>Open this page in another browser/tab (different user) to test matching</li>
          <li>Both users join the same game mode queue</li>
          <li>Watch for automatic match creation</li>
        </ol>
      </div>

      {/* Activity Log */}
      <div className="bg-black rounded p-3 h-64 overflow-y-auto">
        <h3 className="font-bold mb-2">Activity Log:</h3>
        {logs.length === 0 ? (
          <p className="text-gray-400">No activity yet...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="text-sm font-mono text-green-400 mb-1">
              {log}
            </div>
          ))
        )}
      </div>

      {/* Clear Log Button */}
      <button
        onClick={() => setLogs([])}
        className="mt-2 bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
      >
        Clear Log
      </button>
    </div>
  );
};

export default MatchmakingTester;
