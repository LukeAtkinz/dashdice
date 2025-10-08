'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Ability, UserAbility, ABILITY_CATEGORIES } from '@/types/abilities';
import { ABILITY_UNLOCK_SCHEDULE } from '@/types/abilities';
import { RARITY_COLORS } from '@/data/predefinedAbilities';

interface PowerRoadmapProps {
  progression: any;
  allAbilities: Ability[];
  userAbilities: UserAbility[];
}

export default function PowerRoadmap({
  progression,
  allAbilities,
  userAbilities
}: PowerRoadmapProps) {
  const unlockedAbilityIds = userAbilities.map(ua => ua.abilityId);
  const currentLevel = progression?.currentLevel || 1;

  // Group abilities by unlock level
  const abilityByLevel = allAbilities.reduce((acc, ability) => {
    const level = ability.unlockLevel;
    if (!acc[level]) acc[level] = [];
    acc[level].push(ability);
    return acc;
  }, {} as Record<number, Ability[]>);

  // Create roadmap levels (up to level 25)
  const roadmapLevels = Array.from({ length: 25 }, (_, i) => i + 1);

  const getLevelStatus = (level: number) => {
    if (level < currentLevel) return 'completed';
    if (level === currentLevel) return 'current';
    return 'locked';
  };

  const getProgressPercentage = () => {
    const totalXP = progression?.nextLevelXP || 500;
    const currentXP = progression?.xpProgress || 0;
    return Math.min(100, (currentXP / totalXP) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Audiowide' }}>
          ABILITY ROADMAP
        </h3>
        <p className="text-gray-300 mb-6" style={{ fontFamily: 'Montserrat' }}>
          Track your progression and see what abilities await you at each level
        </p>

        {/* Current Progress */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white font-semibold">Level {currentLevel}</span>
            <span className="text-gray-400 text-sm">
              {progression?.xpProgress || 0} / {progression?.nextLevelXP || 500} XP
            </span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm mt-2">
            {Math.max(0, (progression?.nextLevelXP || 500) - (progression?.xpProgress || 0))} XP to next level
          </p>
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="space-y-4">
        {roadmapLevels.map(level => {
          const levelAbilities = abilityByLevel[level] || [];
          const status = getLevelStatus(level);
          
          if (levelAbilities.length === 0 && level > currentLevel + 10) {
            return null; // Skip empty levels beyond current + 10
          }

          return (
            <motion.div
              key={level}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(level * 0.1, 2) }}
              className={`relative bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm ${
                status === 'completed' ? 'border-l-4 border-green-500' :
                status === 'current' ? 'border-l-4 border-blue-500' :
                'border-l-4 border-gray-600'
              }`}
            >
              {/* Level Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    status === 'completed' ? 'bg-green-500 text-white' :
                    status === 'current' ? 'bg-blue-500 text-white' :
                    'bg-gray-600 text-gray-300'
                  }`}>
                    {level}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white" style={{ fontFamily: 'Audiowide' }}>
                      LEVEL {level}
                    </h4>
                    <p className="text-gray-400 text-sm">
                      {status === 'completed' ? 'Completed' :
                       status === 'current' ? 'Current Level' :
                       'Locked'}
                    </p>
                  </div>
                </div>

                {status === 'completed' && (
                  <div className="text-green-400 text-2xl">✓</div>
                )}
                {status === 'current' && (
                  <div className="text-blue-400 text-2xl">🎯</div>
                )}
                {status === 'locked' && (
                  <div className="text-gray-500 text-2xl">🔒</div>
                )}
              </div>

              {/* Abilities at this level */}
              {levelAbilities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {levelAbilities.map(ability => {
                    const isUnlocked = unlockedAbilityIds.includes(ability.id);
                    const categoryInfo = ABILITY_CATEGORIES[ability.category];
                    const rarityColors = RARITY_COLORS[ability.rarity];

                    return (
                      <div
                        key={ability.id}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          isUnlocked 
                            ? `border-green-500 bg-green-900/20`
                            : status === 'locked'
                            ? 'border-gray-600 bg-gray-700/20 opacity-50'
                            : 'border-blue-500 bg-blue-900/20'
                        }`}
                      >
                        {/* Unlock Status */}
                        <div className="absolute top-2 right-2">
                          {isUnlocked ? (
                            <div className="text-green-400 text-lg">✓</div>
                          ) : status === 'current' ? (
                            <div className="text-blue-400 text-lg">🎯</div>
                          ) : (
                            <div className="text-gray-500 text-lg">🔒</div>
                          )}
                        </div>

                        {/* Category Icon */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-lg">{categoryInfo?.icon || '❓'}</div>
                          <span 
                            className="px-2 py-1 rounded text-xs font-bold uppercase text-white"
                            style={{ backgroundColor: rarityColors.border }}
                          >
                            {ability.rarity}
                          </span>
                        </div>

                        {/* Ability Info */}
                        <h5 className="font-bold text-white mb-1" style={{ fontFamily: 'Audiowide' }}>
                          {ability.name}
                        </h5>
                        <p className="text-gray-300 text-sm mb-2" style={{ fontFamily: 'Montserrat' }}>
                          {ability.description}
                        </p>
                        
                        {/* Costs */}
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400">{'★'.repeat(ability.starCost)}</span>
                            <span className="text-gray-400">({ability.starCost})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-purple-400">🔮</span>
                            <span className="text-purple-400">{ability.auraCost}</span>
                          </div>
                        </div>

                        {/* Category */}
                        <div className="mt-2">
                          <span className="text-xs text-gray-400 capitalize">
                            {ability.category}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">💤</div>
                  <p className="text-gray-400">No new abilities at this level</p>
                  <p className="text-gray-500 text-sm">Keep progressing for future unlocks!</p>
                </div>
              )}

              {/* XP Requirements */}
              {level > currentLevel && (
                <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-400 text-sm">
                    <span className="font-semibold">Required:</span> {(level - 1) * 500} total XP 
                    {level <= currentLevel + 5 && (
                      <span className="ml-2 text-blue-400">
                        ({Math.max(0, (level - 1) * 500 - (progression?.xpProgress || 0))} more needed)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm">
        <h4 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Audiowide' }}>
          PROGRESSION SUMMARY
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">
              {unlockedAbilityIds.length}
            </p>
            <p className="text-gray-400 text-sm">Abilities Unlocked</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">
              {allAbilities.length - unlockedAbilityIds.length}
            </p>
            <p className="text-gray-400 text-sm">Still Locked</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">
              {Object.keys(ABILITY_CATEGORIES).length}
            </p>
            <p className="text-gray-400 text-sm">Categories</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {Math.max(...allAbilities.map(a => a.unlockLevel))}
            </p>
            <p className="text-gray-400 text-sm">Max Level</p>
          </div>
        </div>
      </div>
    </div>
  );
}