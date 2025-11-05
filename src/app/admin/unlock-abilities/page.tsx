'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';

/**
 * Unlock Abilities Admin Page
 * 
 * Admin tool to unlock abilities for all players in the system
 */
export default function UnlockAbilitiesPage() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [details, setDetails] = useState<{
    totalUsers: number;
    totalAbilities: number;
    successCount: number;
    errorCount: number;
    abilities: string[];
  } | null>(null);

  const unlockAllAbilitiesForAllPlayers = async () => {
    setStatus('processing');
    setMessage('Fetching abilities and users...');
    
    try {
      // Get all abilities
      const abilitiesSnapshot = await getDocs(collection(db, 'abilities'));
      const allAbilityIds = abilitiesSnapshot.docs.map(doc => doc.id);
      setMessage(`Found ${allAbilityIds.length} abilities. Fetching users...`);
      
      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUserIds = usersSnapshot.docs.map(doc => doc.id);
      setMessage(`Found ${allUserIds.length} users. Unlocking abilities...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Unlock all abilities for each user
      for (let i = 0; i < allUserIds.length; i++) {
        const userId = allUserIds[i];
        setMessage(`Processing user ${i + 1}/${allUserIds.length}: ${userId}`);
        
        try {
          const playerAbilitiesRef = doc(db, 'playerAbilities', userId);
          const playerAbilitiesDoc = await getDoc(playerAbilitiesRef);
          
          if (playerAbilitiesDoc.exists()) {
            // Update existing document
            await updateDoc(playerAbilitiesRef, {
              unlockedAbilities: allAbilityIds,
              updatedAt: Timestamp.now()
            });
          } else {
            // Create new document
            await setDoc(playerAbilitiesRef, {
              playerId: userId,
              unlockedAbilities: allAbilityIds,
              equippedAbilities: {},
              favoriteAbilities: [],
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            });
          }
          successCount++;
        } catch (error) {
          console.error(`Error unlocking abilities for user ${userId}:`, error);
          errorCount++;
        }
      }
      
      setDetails({
        totalUsers: allUserIds.length,
        totalAbilities: allAbilityIds.length,
        successCount,
        errorCount,
        abilities: allAbilityIds
      });
      
      setStatus('success');
      setMessage('✅ All abilities unlocked for all players!');
      
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error unlocking abilities:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🔓 Unlock Abilities Admin</h1>
          <p className="text-gray-400">
            Unlock all abilities for all players in the system
          </p>
        </div>

        {/* Action Button */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Unlock All Abilities</h2>
          <p className="text-gray-300 mb-6">
            This will unlock ALL abilities currently in the abilities collection for EVERY user in the system.
            Players will be able to see and use all abilities in their vault.
          </p>
          
          <button
            onClick={unlockAllAbilitiesForAllPlayers}
            disabled={status === 'processing'}
            className={`px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${
              status === 'processing'
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {status === 'processing' ? '⏳ Processing...' : '🔓 Unlock All Abilities for All Players'}
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-6 rounded-lg mb-8 ${
            status === 'success' ? 'bg-green-900/50 text-green-200 border-2 border-green-500' :
            status === 'error' ? 'bg-red-900/50 text-red-200 border-2 border-red-500' :
            status === 'processing' ? 'bg-blue-900/50 text-blue-200 border-2 border-blue-500' :
            'bg-gray-800 text-gray-300'
          }`}>
            <div className="text-lg font-semibold mb-2">Status</div>
            <div>{message}</div>
          </div>
        )}

        {/* Details */}
        {details && status === 'success' && (
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">📊 Results</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="text-3xl font-bold text-blue-400">{details.totalUsers}</div>
                <div className="text-gray-400">Total Users</div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="text-3xl font-bold text-purple-400">{details.totalAbilities}</div>
                <div className="text-gray-400">Total Abilities</div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="text-3xl font-bold text-green-400">{details.successCount}</div>
                <div className="text-gray-400">Successful Updates</div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="text-3xl font-bold text-red-400">{details.errorCount}</div>
                <div className="text-gray-400">Errors</div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Unlocked Abilities</h3>
              <div className="flex flex-wrap gap-2">
                {details.abilities.map(abilityId => (
                  <span 
                    key={abilityId} 
                    className="px-3 py-1 bg-blue-600 rounded-full text-sm"
                  >
                    {abilityId}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-900/30 border-2 border-yellow-600 rounded-lg">
              <div className="font-semibold mb-2">⚠️ Next Steps:</div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                <li>Players should refresh their browsers or log out/in</li>
                <li>Go to Dashboard → Vault (🎒) → Power Tab</li>
                <li>All {details.totalAbilities} abilities should now be visible and unlocked</li>
                <li>Players can equip abilities in their loadouts</li>
              </ol>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-800 rounded-lg p-6 border-2 border-blue-600">
          <h3 className="text-xl font-semibold mb-4">ℹ️ Information</h3>
          <ul className="space-y-2 text-gray-300">
            <li>• This modifies the <code className="bg-gray-700 px-2 py-1 rounded">playerAbilities</code> collection in Firestore</li>
            <li>• Each user document gets all ability IDs added to their <code className="bg-gray-700 px-2 py-1 rounded">unlockedAbilities</code> array</li>
            <li>• Existing data is preserved (equipped abilities, favorites)</li>
            <li>• New users get a fresh document created with all abilities unlocked</li>
            <li>• Players must refresh to see changes in their vault</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
