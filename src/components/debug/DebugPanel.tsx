// Debug Panel Component for Friend Requests and Achievements
// Temporarily add this component to help debug and fix issues

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAchievements } from '@/context/AchievementContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

export default function DebugPanel() {
  const { user } = useAuth();
  const { allAchievements, userAchievements, isLoading } = useAchievements();
  const [fixing, setFixing] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
  };

  const fixUserPrivacySettings = async () => {
    if (!user) {
      addResult('❌ No user authenticated');
      return;
    }

    try {
      setFixing(true);
      addResult('🔧 Fixing user privacy settings...');

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'privacy.allowFriendRequests': true,
        'privacy.showOnlineStatus': true,
        'privacy.allowGameInvites': true,
        'privacy.showActivity': true
      });

      addResult('✅ Privacy settings updated successfully');
      addResult('🤝 Friend requests should now work');
    } catch (error) {
      addResult(`❌ Error updating privacy: ${error}`);
    } finally {
      setFixing(false);
    }
  };

  const checkAchievementStatus = () => {
    addResult('🏆 Checking achievement status...');
    addResult(`📊 Total achievements defined: ${allAchievements.length}`);
    addResult(`🎯 User achievements earned: ${userAchievements.length}`);
    addResult(`📈 Loading state: ${isLoading ? 'Loading...' : 'Complete'}`);

    if (allAchievements.length === 0) {
      addResult('⚠️ No achievements loaded - check database connection');
    } else {
      addResult('✅ Achievements are loading properly');
      // Show first few achievement names
      const firstFew = allAchievements.slice(0, 3).map(a => a.name).join(', ');
      addResult(`📋 Sample achievements: ${firstFew}...`);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-900 text-white p-4 rounded-lg">
        <h3 className="font-bold">Debug Panel</h3>
        <p>Please log in to use debug features</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg max-w-md max-h-96 overflow-y-auto">
      <h3 className="font-bold mb-3 text-yellow-400">🔧 Debug Panel</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={fixUserPrivacySettings}
          disabled={fixing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-1 rounded text-sm"
        >
          {fixing ? 'Fixing...' : '🤝 Fix Friend Requests'}
        </button>
        
        <button
          onClick={checkAchievementStatus}
          className="w-full bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
        >
          🏆 Check Achievements
        </button>
        
        <button
          onClick={clearResults}
          className="w-full bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
        >
          🗑️ Clear Results
        </button>
      </div>

      {results.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <h4 className="font-semibold text-sm mb-2">Results:</h4>
          <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
            {results.map((result, index) => (
              <div key={index} className="font-mono">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
