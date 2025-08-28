'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Medal, Crown, Lock, CheckCircle, TrendingUp, Calendar, Zap, Target } from 'lucide-react';
import { RankedAchievement, rankedAchievementService } from '../../services/rankedAchievementService';
import { RankedStats } from '../../types/ranked';

interface AchievementsDisplayProps {
  userId: string;
  rankedStats: RankedStats;
  currentRank?: number;
  compactMode?: boolean;
}

interface AchievementProgress {
  achievement: RankedAchievement;
  progress: number;
  unlocked: boolean;
}

export function AchievementsDisplay({ userId, rankedStats, currentRank, compactMode = false }: AchievementsDisplayProps) {
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, [userId, rankedStats, currentRank]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const progress = await rankedAchievementService.getAchievementProgress(userId, rankedStats, currentRank);
      setAchievements(progress);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'from-amber-600 to-amber-800';
      case 'silver': return 'from-gray-400 to-gray-600';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'platinum': return 'from-blue-400 to-blue-600';
      case 'diamond': return 'from-purple-400 to-red-500';
      default: return 'from-gray-500 to-gray-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'progression': return TrendingUp;
      case 'streak': return Zap;
      case 'seasonal': return Calendar;
      case 'competitive': return Trophy;
      case 'special': return Star;
      default: return Medal;
    }
  };

  const filteredAchievements = achievements.filter(item => {
    if (selectedCategory !== 'all' && item.achievement.category !== selectedCategory) return false;
    if (showUnlockedOnly && !item.unlocked) return false;
    return true;
  });

  const categories = [
    { id: 'all', name: 'All', icon: Target },
    { id: 'progression', name: 'Progression', icon: TrendingUp },
    { id: 'streak', name: 'Streaks', icon: Zap },
    { id: 'competitive', name: 'Competitive', icon: Trophy },
    { id: 'seasonal', name: 'Seasonal', icon: Calendar },
    { id: 'special', name: 'Special', icon: Star }
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (compactMode) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center">
            <Trophy className="w-4 h-4 mr-2 text-yellow-400" />
            Achievements
          </h3>
          <span className="text-sm text-gray-400">{unlockedCount}/{totalCount}</span>
        </div>
        
        <div className="space-y-2">
          {achievements
            .filter(a => a.unlocked)
            .slice(0, 3)
            .map((item) => (
              <div key={item.achievement.id} className="flex items-center space-x-2 text-sm">
                <span className="text-lg">{item.achievement.icon}</span>
                <span className="truncate">{item.achievement.name}</span>
              </div>
            ))}
          
          {unlockedCount > 3 && (
            <p className="text-xs text-gray-400">+{unlockedCount - 3} more achievements</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg text-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center">
            <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
            Achievements
          </h2>
          <div className="text-right">
            <p className="text-sm text-gray-400">Progress</p>
            <p className="text-lg font-semibold text-yellow-400">{unlockedCount}/{totalCount}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600"
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <CategoryIcon className="w-3 h-3" />
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>

        {/* Show unlocked only toggle */}
        <div className="mt-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnlockedOnly}
              onChange={(e) => setShowUnlockedOnly(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show unlocked only</span>
          </label>
        </div>
      </div>

      {/* Achievements grid */}
      <div className="p-6">
        {filteredAchievements.length === 0 ? (
          <div className="text-center py-8">
            <Lock className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No achievements to display</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredAchievements.map((item, index) => (
                <motion.div
                  key={item.achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative p-4 rounded-lg border transition-all duration-200 hover:scale-105 ${
                    item.unlocked
                      ? `bg-gradient-to-br ${getTierColor(item.achievement.tier)}/20 border-${item.achievement.tier === 'diamond' ? 'purple' : item.achievement.tier === 'platinum' ? 'blue' : item.achievement.tier === 'gold' ? 'yellow' : item.achievement.tier === 'silver' ? 'gray' : 'amber'}-500/30`
                      : 'bg-gray-800/50 border-gray-700/50'
                  }`}
                >
                  {/* Achievement icon and status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`text-2xl ${item.unlocked ? '' : 'grayscale opacity-50'}`}>
                        {item.achievement.icon}
                      </span>
                      {item.unlocked && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </motion.div>
                      )}
                    </div>
                    
                    {!item.unlocked && <Lock className="w-4 h-4 text-gray-500" />}
                  </div>

                  {/* Achievement info */}
                  <div className="mb-3">
                    <h3 className={`font-semibold mb-1 ${item.unlocked ? 'text-white' : 'text-gray-400'}`}>
                      {item.achievement.name}
                    </h3>
                    <p className={`text-sm ${item.unlocked ? 'text-gray-300' : 'text-gray-500'}`}>
                      {item.achievement.description}
                    </p>
                  </div>

                  {/* Progress bar (for unlocked achievements) */}
                  {!item.unlocked && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(item.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1">
                        <motion.div
                          className={`h-1 rounded-full bg-gradient-to-r ${getTierColor(item.achievement.tier)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tier badge */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.achievement.tier === 'diamond' ? 'bg-purple-500 text-purple-100' :
                      item.achievement.tier === 'platinum' ? 'bg-blue-500 text-blue-100' :
                      item.achievement.tier === 'gold' ? 'bg-yellow-500 text-yellow-900' :
                      item.achievement.tier === 'silver' ? 'bg-gray-400 text-gray-900' :
                      'bg-amber-600 text-amber-100'
                    }`}>
                      {item.achievement.tier.toUpperCase()}
                    </span>
                    
                    {item.achievement.reward?.gold && (
                      <span className="text-xs text-yellow-400 flex items-center">
                        <span className="mr-1">💰</span>
                        {item.achievement.reward.gold}
                      </span>
                    )}
                  </div>

                  {/* Glow effect for unlocked achievements */}
                  {item.unlocked && (
                    <motion.div
                      className={`absolute inset-0 rounded-lg bg-gradient-to-r ${getTierColor(item.achievement.tier)} opacity-10 blur-sm`}
                      animate={{
                        opacity: [0.1, 0.2, 0.1]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact achievements widget for dashboard
export function CompactAchievements({ userId, rankedStats, currentRank }: AchievementsDisplayProps) {
  return (
    <AchievementsDisplay
      userId={userId}
      rankedStats={rankedStats}
      currentRank={currentRank}
      compactMode={true}
    />
  );
}
