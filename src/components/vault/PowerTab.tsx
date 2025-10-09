'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAbilities } from '@/context/AbilitiesContext';
import PowerCard from './PowerCard';
import LoadoutByCategoryEditor from './LoadoutByCategoryEditor';
import { ABILITY_CATEGORIES, CATEGORY_COLORS } from '@/types/abilities';

export default function PowerTab() {
  const {
    allAbilities,
    userAbilities,
    activeLoadout,
    loadouts,
    progressionSummary,
    isLoading,
    isInitialized
  } = useAbilities();
  
  const [activeView, setActiveView] = useState<'collection' | 'loadouts'>('collection');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  console.log('🚨 PowerTab: Component starting to render!!!');
  console.log('PowerTab Debug:', {
    allAbilitiesCount: allAbilities?.length || 0,
    userAbilitiesCount: userAbilities?.length || 0,
    isLoading,
    isInitialized,
    progressionSummary
  });

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-white font-medium">Loading abilities...</span>
      </div>
    );
  }

  const filteredAbilities = allAbilities.filter(ability => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'unlocked') {
      return userAbilities.some(ua => ua.abilityId === ability.id);
    }
    return ability.category === selectedCategory;
  });

  const categoryOptions = [
    { key: 'all', name: 'All', icon: '🌟', color: '#6B7280' },
    { key: 'unlocked', name: 'Unlocked', icon: '🔓', color: '#10B981' },
    ...Object.entries(ABILITY_CATEGORIES).map(([key, cat]) => ({
      key,
      name: cat.name,
      icon: cat.icon,
      color: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS]?.primary || '#6B7280'
    }))
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header with Stats */}
      <div 
        className="rounded-xl p-6 backdrop-blur-sm"
        style={{
          background: 'linear-gradient(135deg, #1F2937 0%, transparent 100%)',
          border: '2px solid rgba(255, 255, 255, 0.3)'
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Audiowide' }}>
              POWER
            </h2>
            <p className="text-gray-300 text-sm" style={{ fontFamily: 'Montserrat' }}>
              Manage abilities and loadouts
            </p>
          </div>
          
          {/* View Tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'collection', name: 'Collection', icon: '📚' },
              { key: 'loadouts', name: 'Loadouts', icon: '⚔️' }
            ].map(view => (
              <button
                key={view.key}
                onClick={() => setActiveView(view.key as any)}
                className="px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
                style={{
                  fontFamily: 'Montserrat',
                  background: activeView === view.key
                    ? 'linear-gradient(135deg, #3B82F6 0%, transparent 100%)'
                    : 'linear-gradient(135deg, #6B7280 0%, transparent 100%)',
                  backdropFilter: 'blur(6px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFF',
                  boxShadow: activeView === view.key ? '0 4px 15px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                <span>{view.icon}</span>
                <span className="hidden sm:inline">{view.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center bg-gray-700/50 rounded-lg p-3">
            <p className="text-2xl font-bold text-blue-400 mb-1">
              {progressionSummary?.currentLevel || 1}
            </p>
            <p className="text-xs text-gray-400" style={{ fontFamily: 'Montserrat' }}>Level</p>
          </div>
          <div className="text-center bg-gray-700/50 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-400 mb-1">
              {progressionSummary?.unlockedAbilities || 0}/{progressionSummary?.totalAbilities || 0}
            </p>
            <p className="text-xs text-gray-400" style={{ fontFamily: 'Montserrat' }}>Abilities</p>
          </div>
          <div className="text-center bg-gray-700/50 rounded-lg p-3">
            <p className="text-2xl font-bold text-yellow-400 mb-1">
              {progressionSummary?.starPoints || 5}/{progressionSummary?.maxStarPoints || 15}
            </p>
            <p className="text-xs text-gray-400" style={{ fontFamily: 'Montserrat' }}>Star Points</p>
          </div>
          <div className="text-center bg-gray-700/50 rounded-lg p-3">
            <p className="text-2xl font-bold text-purple-400 mb-1">
              {loadouts?.length || 0}
            </p>
            <p className="text-xs text-gray-400" style={{ fontFamily: 'Montserrat' }}>Loadouts</p>
          </div>
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'collection' && (
        <div>
          {/* Category Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {categoryOptions.map(category => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className="px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2"
                style={{
                  fontFamily: 'Montserrat',
                  background: selectedCategory === category.key
                    ? `linear-gradient(135deg, ${category.color} 0%, transparent 100%)`
                    : 'linear-gradient(135deg, #6B7280 0%, transparent 100%)',
                  backdropFilter: 'blur(6px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFF',
                  boxShadow: selectedCategory === category.key ? `0 4px 15px ${category.color}40` : 'none'
                }}
              >
                <span>{category.key === 'all' ? '🌟' : category.key === 'unlocked' ? '🔓' : '⚡'}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          {/* Abilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAbilities.map(ability => {
              const userAbility = userAbilities.find(ua => ua.abilityId === ability.id);
              const isUnlocked = !!userAbility;
              
              return (
                <PowerCard
                  key={ability.id}
                  ability={ability}
                  userAbility={userAbility}
                  isUnlocked={isUnlocked}
                  activeLoadout={activeLoadout}
                />
              );
            })}
          </div>

          {filteredAbilities.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔮</div>
              <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Audiowide' }}>
                No Abilities Found
              </h3>
              <p className="text-gray-400" style={{ fontFamily: 'Montserrat' }}>
                {selectedCategory === 'unlocked' 
                  ? 'You haven\'t unlocked any abilities yet. Keep playing to level up!'
                  : 'No abilities match your current filter.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {activeView === 'loadouts' && (
        <LoadoutByCategoryEditor
          allAbilities={allAbilities}
          userAbilities={userAbilities}
          loadouts={loadouts}
          activeLoadout={activeLoadout}
          maxStarPoints={progressionSummary?.starPoints || 5}
        />
      )}
    </div>
  );
}