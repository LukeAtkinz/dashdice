'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ability, UserAbility, UserLoadout, ABILITY_CATEGORIES } from '@/types/abilities';
import { CATEGORY_COLORS } from '@/data/predefinedAbilities';
import { useAbilities } from '@/context/AbilitiesContext';

interface LoadoutByCategoryEditorProps {
  allAbilities: Ability[];
  userAbilities: UserAbility[];
  loadouts: UserLoadout[];
  activeLoadout: UserLoadout | null;
  maxStarPoints: number;
}

export default function LoadoutByCategoryEditor({
  allAbilities,
  userAbilities,
  loadouts,
  activeLoadout,
  maxStarPoints
}: LoadoutByCategoryEditorProps) {
  const [selectedLoadout, setSelectedLoadout] = useState<UserLoadout | null>(activeLoadout);
  const [editingLoadout, setEditingLoadout] = useState<Partial<UserLoadout> | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newLoadoutName, setNewLoadoutName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof ABILITY_CATEGORIES | null>(null);
  
  const { 
    createLoadout, 
    updateLoadout, 
    setActiveLoadout, 
    validateLoadout 
  } = useAbilities();

  const unlockedAbilityIds = userAbilities.map(ua => ua.abilityId);

  const calculateStarCost = (abilities: UserLoadout['abilities']) => {
    return Object.values(abilities)
      .filter(Boolean)
      .reduce((total, abilityId) => {
        const ability = allAbilities.find(a => a.id === abilityId);
        return total + (ability?.starCost || 0);
      }, 0);
  };

  const getAvailableAbilitiesForCategory = (category: keyof typeof ABILITY_CATEGORIES) => {
    return allAbilities.filter(ability => 
      ability.category === category && 
      unlockedAbilityIds.includes(ability.id)
    );
  };

  const handleCreateLoadout = async () => {
    if (!newLoadoutName.trim()) return;
    
    try {
      const loadoutId = await createLoadout(newLoadoutName, {});
      setNewLoadoutName('');
      setShowCreateNew(false);
      // Refresh loadouts would happen via context
    } catch (error) {
      console.error('Error creating loadout:', error);
    }
  };

  const handleEquipAbility = (category: keyof typeof ABILITY_CATEGORIES, abilityId: string) => {
    if (!selectedLoadout) return;
    
    const newAbilities = {
      ...selectedLoadout.abilities,
      [category]: abilityId
    };
    
    setEditingLoadout({
      ...selectedLoadout,
      abilities: newAbilities
    });
  };

  const handleRemoveAbility = (category: keyof typeof ABILITY_CATEGORIES) => {
    if (!selectedLoadout) return;
    
    const newAbilities = { ...selectedLoadout.abilities };
    delete newAbilities[category];
    
    setEditingLoadout({
      ...selectedLoadout,
      abilities: newAbilities
    });
  };

  const handleSaveLoadout = async () => {
    if (!editingLoadout) return;
    
    try {
      // Validate first
      const validation = await validateLoadout(editingLoadout.abilities || {});
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
      
      if (editingLoadout.id) {
        await updateLoadout(editingLoadout.id, editingLoadout);
      }
      
      setEditingLoadout(null);
    } catch (error) {
      console.error('Error saving loadout:', error);
    }
  };

  const handleSetActive = async (loadoutId: string) => {
    try {
      await setActiveLoadout(loadoutId);
    } catch (error) {
      console.error('Error setting active loadout:', error);
    }
  };

  const currentAbilities = editingLoadout?.abilities || selectedLoadout?.abilities || {};
  const currentStarCost = calculateStarCost(currentAbilities);
  const isOverBudget = currentStarCost > maxStarPoints;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Audiowide' }}>
            LOADOUTS
          </h3>
          <p className="text-gray-300 text-sm" style={{ fontFamily: 'Montserrat' }}>
            Create and manage your ability loadouts
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateNew(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          style={{ fontFamily: 'Montserrat' }}
        >
          + New Loadout
        </button>
      </div>

      {/* Create New Loadout Modal */}
      <AnimatePresence>
        {showCreateNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setShowCreateNew(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h4 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Audiowide' }}>
                CREATE NEW LOADOUT
              </h4>
              <input
                type="text"
                value={newLoadoutName}
                onChange={(e) => setNewLoadoutName(e.target.value)}
                placeholder="Enter loadout name..."
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontFamily: 'Montserrat' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateLoadout}
                  disabled={!newLoadoutName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ fontFamily: 'Montserrat' }}
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateNew(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ fontFamily: 'Montserrat' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loadout Selection */}
      <div className="bg-gray-800/50 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Audiowide' }}>
          SELECT LOADOUT
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadouts.map(loadout => (
            <div
              key={loadout.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedLoadout?.id === loadout.id
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
              }`}
              onClick={() => setSelectedLoadout(loadout)}
            >
              <div className="flex justify-between items-start mb-2">
                <h5 className="font-semibold text-white">{loadout.name}</h5>
                {loadout.isActive && (
                  <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-400 mb-2">
                {Object.values(loadout.abilities).filter(Boolean).length}/5 slots filled
              </div>
              <div className="text-sm">
                <span className={`font-medium ${
                  loadout.totalStarCost > loadout.maxStarPoints ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {loadout.totalStarCost}/{loadout.maxStarPoints} ★
                </span>
              </div>
              {selectedLoadout?.id === loadout.id && !loadout.isActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetActive(loadout.id);
                  }}
                  className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Set Active
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Loadout Editor */}
      {selectedLoadout && (
        <div className="bg-gray-800/50 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold text-white" style={{ fontFamily: 'Audiowide' }}>
              EDIT LOADOUT: {selectedLoadout.name}
            </h4>
            <div className={`text-lg font-bold ${isOverBudget ? 'text-red-400' : 'text-yellow-400'}`}>
              {currentStarCost}/{maxStarPoints} ★
            </div>
          </div>

          {isOverBudget && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-6">
              <p className="text-red-300 text-sm">
                ⚠️ This loadout exceeds your star point limit. Remove some abilities to save.
              </p>
            </div>
          )}

          {/* Category Slots */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {Object.entries(ABILITY_CATEGORIES).map(([categoryKey, categoryInfo]) => {
              const category = categoryKey as keyof typeof ABILITY_CATEGORIES;
              const equippedAbilityId = currentAbilities[category];
              const equippedAbility = equippedAbilityId ? allAbilities.find(a => a.id === equippedAbilityId) : null;
              const categoryColors = CATEGORY_COLORS[category];

              return (
                <div key={category} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: categoryColors.primary }}
                    >
                      {categoryInfo.icon}
                    </div>
                    <h5 className="font-semibold text-white">{categoryInfo.name}</h5>
                  </div>

                  {equippedAbility ? (
                    <div className="bg-gray-600/50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-white text-sm">{equippedAbility.name}</p>
                          <p className="text-xs text-gray-400">{equippedAbility.starCost}★ • {equippedAbility.auraCost}🔮</p>
                        </div>
                        <button
                          onClick={() => handleRemoveAbility(category)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedCategory(category)}
                      className="w-full border-2 border-dashed border-gray-500 rounded-lg p-6 text-gray-400 hover:border-gray-400 hover:text-gray-300 transition-colors"
                    >
                      + Choose Ability
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save Button */}
          {editingLoadout && (
            <div className="flex gap-2">
              <button
                onClick={handleSaveLoadout}
                disabled={isOverBudget}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isOverBudget 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                style={{ fontFamily: 'Montserrat' }}
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingLoadout(null)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                style={{ fontFamily: 'Montserrat' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ability Selection Modal */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCategory(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h4 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Audiowide' }}>
                SELECT {ABILITY_CATEGORIES[selectedCategory].name.toUpperCase()} ABILITY
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getAvailableAbilitiesForCategory(selectedCategory).map(ability => (
                  <div
                    key={ability.id}
                    className="bg-gray-700/50 rounded-lg p-4 cursor-pointer hover:bg-gray-600/50 transition-colors"
                    onClick={() => {
                      handleEquipAbility(selectedCategory, ability.id);
                      setSelectedCategory(null);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-semibold text-white">{ability.name}</h5>
                      <span className="text-yellow-400 font-bold">{ability.starCost}★</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{ability.description}</p>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Aura: {ability.auraCost}</span>
                      <span className="capitalize">{ability.rarity}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {getAvailableAbilitiesForCategory(selectedCategory).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">No unlocked abilities in this category</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}