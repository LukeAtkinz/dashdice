'use client';

import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import abilityService from '@/services/abilityFirebaseService';

/**
 * Admin Tool: Grant Starter Abilities to All Users
 * 
 * This page allows admins to grant all 5 starter abilities to every user in the database.
 * Useful for retroactively granting abilities to existing users who registered before
 * the auto-initialization feature was added.
 */
export default function GrantStarterAbilitiesPage() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [details, setDetails] = useState<{
    totalUsers: number;
    successCount: number;
    errorCount: number;
    skippedCount: number;
  } | null>(null);

  const grantStarterAbilitiesToAll = async () => {
    setStatus('processing');
    setMessage('Fetching all users...');
    
    try {
      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs;
      setMessage(`Found ${allUsers.length} users. Processing...`);
      
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      
      // Grant starter abilities to each user
      for (let i = 0; i < allUsers.length; i++) {
        const userId = allUsers[i].id;
        const userData = allUsers[i].data();
        const displayName = userData.displayName || userData.email || userId;
        
        setMessage(`Processing ${i + 1}/${allUsers.length}: ${displayName}...`);
        
        try {
          // Use the initializeStarterAbilities function
          await abilityService.initializeStarterAbilities(userId);
          successCount++;
          console.log(`✅ Granted abilities to: ${displayName}`);
        } catch (error: any) {
          // Check if error is because user already has abilities
          if (error.message?.includes('already has all starter abilities')) {
            skippedCount++;
            console.log(`⚪ Skipped (already has abilities): ${displayName}`);
          } else {
            errorCount++;
            console.error(`❌ Error for ${displayName}:`, error);
          }
        }
      }
      
      setDetails({
        totalUsers: allUsers.length,
        successCount,
        errorCount,
        skippedCount
      });
      
      setStatus('success');
      setMessage('✅ Completed granting starter abilities!');
      
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error granting starter abilities:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-purple-500">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
              🎁 Grant Starter Abilities
            </h1>
            <p className="text-gray-300">
              Admin tool to grant all 5 starter abilities to every user in the database
            </p>
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4 mb-6">
            <h3 className="text-yellow-400 font-semibold mb-2">⚠️ Important Information:</h3>
            <ul className="text-yellow-200 text-sm space-y-1">
              <li>• This will process ALL users in the database</li>
              <li>• Users who already have abilities will be skipped</li>
              <li>• Safe to run multiple times (idempotent)</li>
              <li>• The 5 starter abilities: Luck Turner, Pan Slap, Score Saw, Score Siphon, Hard Hat</li>
            </ul>
          </div>

          {/* Action Button */}
          <button
            onClick={grantStarterAbilitiesToAll}
            disabled={status === 'processing'}
            className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${
              status === 'processing'
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {status === 'processing' ? '⏳ Processing...' : '🚀 Grant Starter Abilities to All Users'}
          </button>

          {/* Status Message */}
          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              status === 'error' 
                ? 'bg-red-900/30 border border-red-500 text-red-200'
                : status === 'success'
                ? 'bg-green-900/30 border border-green-500 text-green-200'
                : 'bg-blue-900/30 border border-blue-500 text-blue-200'
            }`}>
              <p className="font-mono text-sm whitespace-pre-wrap">{message}</p>
            </div>
          )}

          {/* Results Details */}
          {details && status === 'success' && (
            <div className="mt-6 bg-gray-700 rounded-lg p-6 space-y-3">
              <h3 className="text-xl font-semibold text-purple-300 mb-4">📊 Results Summary</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-white">{details.totalUsers}</p>
                </div>
                
                <div className="bg-green-900/30 p-4 rounded-lg border border-green-500">
                  <p className="text-green-400 text-sm">✅ Granted</p>
                  <p className="text-2xl font-bold text-green-300">{details.successCount}</p>
                </div>
                
                <div className="bg-yellow-900/30 p-4 rounded-lg border border-yellow-500">
                  <p className="text-yellow-400 text-sm">⚪ Skipped</p>
                  <p className="text-2xl font-bold text-yellow-300">{details.skippedCount}</p>
                </div>
                
                <div className="bg-red-900/30 p-4 rounded-lg border border-red-500">
                  <p className="text-red-400 text-sm">❌ Errors</p>
                  <p className="text-2xl font-bold text-red-300">{details.errorCount}</p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-purple-900/30 border border-purple-500 rounded-lg">
                <p className="text-purple-200 text-sm">
                  🎮 Users can now see all 5 starter abilities in their vault!
                </p>
                <p className="text-purple-300 text-xs mt-2">
                  Tell users to refresh their page to see the new abilities.
                </p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-gray-300 mb-3">📝 How it works:</h3>
            <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
              <li>Fetches all users from the database</li>
              <li>For each user, calls <code className="bg-gray-700 px-2 py-1 rounded">initializeStarterAbilities()</code></li>
              <li>Creates or updates <code className="bg-gray-700 px-2 py-1 rounded">playerAbilities</code> document</li>
              <li>Grants: luck_turner, pan_slap, score_saw, score_siphon, hard_hat</li>
              <li>Skips users who already have abilities</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
