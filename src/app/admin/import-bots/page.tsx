/**
 * Admin Bot Import Page
 * Simple interface to import bot profiles
 */

'use client';

import { useState } from 'react';

export default function AdminBotImportPage() {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const checkBots = async () => {
    setIsLoading(true);
    setStatus('Checking bot profiles...');
    
    try {
      const response = await fetch('/api/admin/import-bots');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.message + (data.existingCount ? ` (${data.existingCount} found)` : ''));
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const importBots = async () => {
    setIsLoading(true);
    setStatus('Importing bot profiles...');
    
    try {
      const response = await fetch('/api/admin/import-bots', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setStatus(`Success! Imported ${data.imported} bot profiles. ${data.errors} errors.`);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🤖 Bot Profile Import</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Import Bot Profiles to Firebase</h2>
          <p className="text-gray-300 mb-6">
            This will import initial bot profiles for the DashDice gaming system.
            Bots will appear as regular players to create a better gaming experience.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={checkBots}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded font-medium transition-colors"
            >
              {isLoading ? '⏳ Checking...' : '🔍 Check Bot Status'}
            </button>
            
            <button
              onClick={importBots}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-2 rounded font-medium transition-colors ml-4"
            >
              {isLoading ? '⏳ Importing...' : '🚀 Import Bots'}
            </button>
          </div>
        </div>

        {status && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Status:</h3>
            <p className={`${status.includes('Error') ? 'text-red-400' : status.includes('Success') ? 'text-green-400' : 'text-yellow-400'}`}>
              {status}
            </p>
          </div>
        )}

        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📋 Bot System Features</h3>
          <ul className="space-y-2 text-gray-300">
            <li>✅ Realistic player profiles with stats and personalities</li>
            <li>✅ Dynamic difficulty adjustment based on player skill</li>
            <li>✅ Seamless integration - bots appear as real players</li>
            <li>✅ Advanced AI behavior patterns and emotional modeling</li>
            <li>✅ Full inventory and achievement system integration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}