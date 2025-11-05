'use client';

import { useState } from 'react';
import { ALL_ABILITIES, ABILITIES_BY_CATEGORY, ABILITIES_BY_RARITY } from '../../../constants/abilities';
import { AbilityCategory, AbilityRarity, DashDiceAbility } from '../../../types/abilityBlueprint';
import { getAbility, createAbility } from '../../../services/abilityFirebaseService';

/**
 * Ability Management Dashboard
 * 
 * Admin interface for managing abilities following the Ability Management Blueprint
 * 
 * Features:
 * - View all abilities from constants
 * - Sync abilities to Firebase
 * - Verify Firebase sync status
 * - Search and filter abilities
 * - View detailed ability information
 */
export default function AbilityManagementPage() {
  const [selectedAbility, setSelectedAbility] = useState<DashDiceAbility | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<AbilityCategory | 'all'>('all');
  const [filterRarity, setFilterRarity] = useState<AbilityRarity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<{ [abilityId: string]: boolean }>({});

  // Filter abilities based on search and filters
  const filteredAbilities = ALL_ABILITIES.filter(ability => {
    const matchesCategory = filterCategory === 'all' || ability.category === filterCategory;
    const matchesRarity = filterRarity === 'all' || ability.rarity === filterRarity;
    const matchesSearch = searchQuery === '' || 
      ability.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ability.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ability.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesRarity && matchesSearch;
  });

  // Sync all abilities to Firebase
  const handleSyncAll = async () => {
    setSyncStatus('syncing');
    setSyncMessage('Syncing all abilities to Firebase...');
    
    try {
      let successCount = 0;
      for (const ability of ALL_ABILITIES) {
        await createAbility(ability);
        successCount++;
      }
      setSyncStatus('success');
      setSyncMessage(`Successfully synced ${successCount} abilities!`);
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage(`Error syncing abilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Sync single ability to Firebase
  const handleSyncSingle = async (abilityId: string) => {
    setSyncStatus('syncing');
    setSyncMessage(`Syncing ${abilityId}...`);
    
    try {
      const ability = ALL_ABILITIES.find(a => a.id === abilityId);
      if (!ability) throw new Error('Ability not found');
      
      await createAbility(ability);
      setSyncStatus('success');
      setSyncMessage(`Successfully synced ${abilityId}!`);
      
      // Verify after sync
      await verifyAbilityInFirebase(abilityId);
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage(`Error syncing ${abilityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Verify if ability exists in Firebase
  const verifyAbilityInFirebase = async (abilityId: string) => {
    try {
      const firebaseAbility = await getAbility(abilityId);
      setVerificationStatus(prev => ({
        ...prev,
        [abilityId]: firebaseAbility !== null
      }));
    } catch (error) {
      console.error(`Error verifying ${abilityId}:`, error);
      setVerificationStatus(prev => ({
        ...prev,
        [abilityId]: false
      }));
    }
  };

  // Verify all abilities
  const handleVerifyAll = async () => {
    setSyncMessage('Verifying all abilities in Firebase...');
    
    for (const ability of ALL_ABILITIES) {
      await verifyAbilityInFirebase(ability.id);
    }
    
    setSyncMessage('Verification complete!');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">⚡ Ability Management Dashboard</h1>
          <p className="text-gray-400">
            Manage abilities following the Ability Management Blueprint
          </p>
        </div>

        {/* Sync Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">🔄 Firebase Sync</h2>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleSyncAll}
              disabled={syncStatus === 'syncing'}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {syncStatus === 'syncing' ? '⏳ Syncing...' : '📤 Sync All Abilities'}
            </button>
            
            <button
              onClick={handleVerifyAll}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
            >
              ✅ Verify All in Firebase
            </button>
          </div>

          {syncMessage && (
            <div className={`p-4 rounded-lg ${
              syncStatus === 'success' ? 'bg-green-900/50 text-green-200' :
              syncStatus === 'error' ? 'bg-red-900/50 text-red-200' :
              'bg-blue-900/50 text-blue-200'
            }`}>
              {syncMessage}
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-3xl font-bold text-blue-400">{ALL_ABILITIES.length}</div>
            <div className="text-gray-400">Total Abilities</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-3xl font-bold text-green-400">
              {Object.values(verificationStatus).filter(v => v).length}
            </div>
            <div className="text-gray-400">Synced to Firebase</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-3xl font-bold text-purple-400">
              {Object.keys(ABILITIES_BY_CATEGORY).length}
            </div>
            <div className="text-gray-400">Categories</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-3xl font-bold text-yellow-400">
              {Object.keys(ABILITIES_BY_RARITY).length}
            </div>
            <div className="text-gray-400">Rarity Levels</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">🔍 Search & Filter</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search abilities..."
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as AbilityCategory | 'all')}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {Object.values(AbilityCategory).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Rarity</label>
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value as AbilityRarity | 'all')}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Rarities</option>
                {Object.values(AbilityRarity).map(rarity => (
                  <option key={rarity} value={rarity}>{rarity}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-400">
            Showing {filteredAbilities.length} of {ALL_ABILITIES.length} abilities
          </div>
        </div>

        {/* Abilities List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">📋 Abilities</h2>
          
          <div className="grid grid-cols-1 gap-4">
            {filteredAbilities.map(ability => (
              <div
                key={ability.id}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
                onClick={() => setSelectedAbility(ability)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{ability.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        ability.rarity === 'mythic' ? 'bg-purple-600' :
                        ability.rarity === 'legendary' ? 'bg-yellow-600' :
                        ability.rarity === 'epic' ? 'bg-blue-600' :
                        ability.rarity === 'rare' ? 'bg-green-600' :
                        'bg-gray-600'
                      }`}>
                        {ability.rarity}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-600">
                        {ability.category}
                      </span>
                      {verificationStatus[ability.id] && (
                        <span className="text-green-400 text-sm">✅ In Firebase</span>
                      )}
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-2">{ability.description}</p>
                    
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>⚡ {ability.auraCost} AURA</span>
                      <span>⭐ {ability.starCost} Stars</span>
                      <span>⏱️ {ability.cooldown}s Cooldown</span>
                      <span>💪 Power: {ability.balancing.powerLevel}</span>
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      {ability.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-800 rounded text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSyncSingle(ability.id);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold transition-colors"
                    >
                      Sync
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        verifyAbilityInFirebase(ability.id);
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ability Details Modal */}
        {selectedAbility && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-8 z-50"
            onClick={() => setSelectedAbility(null)}
          >
            <div 
              className="bg-gray-800 rounded-lg p-8 max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-4">{selectedAbility.name}</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Description</h3>
                  <p className="text-gray-300">{selectedAbility.longDescription}</p>
                </div>
                
                {selectedAbility.flavorText && (
                  <div className="italic text-gray-400 border-l-4 border-yellow-600 pl-4">
                    {selectedAbility.flavorText}
                  </div>
                )}
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">Effects</h3>
                  {selectedAbility.effects.map((effect, idx) => (
                    <div key={idx} className="bg-gray-700 p-4 rounded mb-2">
                      <div className="font-semibold">{effect.name}</div>
                      <div className="text-sm text-gray-300">{effect.description}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Type: {effect.type} | Magnitude: {effect.magnitude}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">Conditions</h3>
                  {selectedAbility.conditions?.map((condition, idx) => (
                    <div key={idx} className="bg-gray-700 p-3 rounded mb-2 text-sm">
                      <div className="font-semibold">{condition.type}</div>
                      <div className="text-gray-300">{condition.description}</div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => setSelectedAbility(null)}
                  className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
