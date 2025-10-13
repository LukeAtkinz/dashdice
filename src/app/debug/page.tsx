'use client';

import React from 'react';
import DebugAbilities from '../../components/debug/DebugAbilities';

const DebugPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">🔍 Abilities Debug Center</h1>
        
        <div className="grid gap-6">
          <DebugAbilities gameMode="standard" />
          <DebugAbilities gameMode="quickfire" />
          <DebugAbilities gameMode="ranked" />
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h2 className="text-xl font-bold mb-4">🧪 How to Debug</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Make sure you have abilities equipped in your inventory</li>
            <li>Check the power loadouts above for each game mode</li>
            <li>Join a match and check if abilities appear</li>
            <li>Open browser console to see detailed debug logs</li>
            <li>Look for logs starting with "🔮 DEBUG" in InlineAbilitiesDisplay</li>
          </ol>
        </div>

        <div className="mt-6 p-6 bg-yellow-50 rounded-lg">
          <h2 className="text-xl font-bold mb-4">🩸 Siphon Specific Debug</h2>
          <div className="space-y-2">
            <div>
              <strong>Expected Icon Path:</strong> 
              <code className="ml-2 px-2 py-1 bg-gray-200 rounded">/Abilities/Catagories/Attack/Siphon.webp</code>
            </div>
            <div className="mt-4">
              <strong>Test Icon Loading:</strong>
              <img 
                src="/Abilities/Catagories/Attack/Siphon.webp" 
                alt="Siphon Test" 
                className="w-16 h-16 border-2 border-dashed border-gray-400"
                onLoad={() => console.log('✅ Siphon icon loaded successfully')}
                onError={() => console.log('❌ Siphon icon failed to load')}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 p-6 bg-green-50 rounded-lg">
          <h2 className="text-xl font-bold mb-4">📋 Debug Checklist</h2>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              Power loadout shows abilities for the game mode
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              Siphon icon loads without errors
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              InlineAbilitiesDisplay logs show power loadout data
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              Abilities appear in match interface
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              No console errors related to abilities
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPage;