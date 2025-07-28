'use client';

import React, { useState } from 'react';
import { migrateAllUsers } from '@/utils/userMigration';

export default function MigrationPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ migratedCount: number; totalUsers: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setError(null);
    setResult(null);
    
    try {
      const migrationResult = await migrateAllUsers();
      setResult(migrationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">User Migration Utility</h1>
        
        <div className="space-y-4">
          <p className="text-gray-600">
            This utility will migrate all existing users to the new profile structure with proper inventory, stats, and settings objects.
          </p>
          
          <button
            onClick={runMigration}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-medium ${
              isRunning 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRunning ? 'Running Migration...' : 'Run User Migration'}
          </button>
          
          {result && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <p><strong>Migration Complete!</strong></p>
              <p>Migrated {result.migratedCount} out of {result.totalUsers} users.</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p><strong>Error:</strong> {error}</p>
            </div>
          )}
        </div>
        
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">What this migration does:</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>Converts old inventory arrays to new nested object structure</li>
            <li>Adds missing userTag field (@username format)</li>
            <li>Resets all stats to 0 (bestStreak, currentStreak, gamesPlayed, matchWins)</li>
            <li>Adds default settings if missing</li>
            <li>Removes deprecated fields (equippedBackground, etc.)</li>
            <li>Ensures all users have the same consistent structure</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
