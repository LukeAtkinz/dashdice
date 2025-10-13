'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserService } from '../../services/userService';

interface DebugAbilitiesProps {
  gameMode?: string;
}

const DebugAbilities: React.FC<DebugAbilitiesProps> = ({ gameMode = 'standard' }) => {
  const { user } = useAuth();
  const [powerLoadout, setPowerLoadout] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPowerLoadout = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 DEBUG: Loading power loadout for user:', user.uid, 'gameMode:', gameMode);
      
      let gameModeKey: any = gameMode;
      if (gameMode === 'quickfire') {
        gameModeKey = 'quick-fire';
      }
      
      const loadout = await UserService.getPowerLoadoutForGameMode(user.uid, gameModeKey);
      console.log('🔮 DEBUG: Loaded power loadout:', loadout);
      setPowerLoadout(loadout);
    } catch (err) {
      console.error('❌ DEBUG: Error loading power loadout:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPowerLoadout();
  }, [user?.uid, gameMode]);

  if (!user) {
    return <div className="p-4 bg-red-100 text-red-800">Not authenticated</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">🔍 Debug Abilities - {gameMode}</h3>
      
      <button 
        onClick={loadPowerLoadout}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
      >
        {loading ? 'Loading...' : 'Reload Power Loadout'}
      </button>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          Error: {error}
        </div>
      )}

      <div className="space-y-2">
        <div><strong>User ID:</strong> {user.uid}</div>
        <div><strong>Game Mode:</strong> {gameMode}</div>
        <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
        
        <div className="mt-4">
          <strong>Power Loadout:</strong>
          <pre className="bg-black text-green-400 p-3 rounded mt-2 text-sm overflow-auto">
            {powerLoadout ? JSON.stringify(powerLoadout, null, 2) : 'null'}
          </pre>
        </div>

        {powerLoadout && (
          <div className="mt-4">
            <strong>Abilities Found:</strong>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(powerLoadout).map(([slot, abilityId]) => (
                <div key={slot} className="p-2 bg-white rounded border">
                  <div className="font-medium text-sm">{slot}</div>
                  <div className="text-xs text-gray-600">{String(abilityId) || 'Empty'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded text-sm">
          <strong>Debug Info:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Check browser console for detailed logs</li>
            <li>PowerLoadout should contain ability IDs (like 'siphon')</li>
            <li>Empty slots should show null or undefined</li>
            <li>If loadout is null, user may not have equipped abilities for this game mode</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DebugAbilities;