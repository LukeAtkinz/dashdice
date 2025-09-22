'use client';

import React, { useState } from 'react';
import { PlayerStateService } from '@/services/playerStateService';

export default function PlayerCleanup() {
  const [playerId, setPlayerId] = useState('4ZQeDsJKMRaDFoxqzDNuPy0YoNF3');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCleanup = async () => {
    if (!playerId.trim()) {
      setMessage('Please enter a player ID');
      return;
    }

    setIsLoading(true);
    setMessage('🧹 Starting cleanup...');

    try {
      const success = await PlayerStateService.forceCleanupPlayer(playerId.trim());
      
      if (success) {
        setMessage('✅ Cleanup completed successfully! Player should be able to matchmake again.');
      } else {
        setMessage('❌ Cleanup failed. Check console for errors.');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      setMessage('❌ Error during cleanup: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          🧹 Player Cleanup Utility
        </h1>
        
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Clear Stuck Matchmaking Sessions
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Player ID (Firebase UID)
              </label>
              <input
                type="text"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                className="w-full px-4 py-2 bg-black/30 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter player ID..."
              />
            </div>
            
            <button
              onClick={handleCleanup}
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              {isLoading ? '🔄 Cleaning...' : '🧹 Force Cleanup Player'}
            </button>
          </div>
        </div>
        
        {message && (
          <div className="bg-black/30 backdrop-blur-md rounded-lg p-4">
            <p className="text-white whitespace-pre-line">{message}</p>
          </div>
        )}
        
        <div className="bg-yellow-900/30 backdrop-blur-md rounded-lg p-4 mt-6">
          <h3 className="text-yellow-300 font-semibold mb-2">⚠️ What this does:</h3>
          <ul className="text-yellow-100 text-sm space-y-1">
            <li>• Sets player state to idle</li>
            <li>• Deletes player state record</li>
            <li>• Removes waiting rooms where player is host/opponent</li>
            <li>• Cleans up game sessions in waiting/searching status</li>
            <li>• Clears user currentGameId reference</li>
          </ul>
        </div>
        
        <div className="text-center mt-6">
          <a
            href="/admin"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            ← Back to Admin Panel
          </a>
        </div>
      </div>
    </div>
  );
}