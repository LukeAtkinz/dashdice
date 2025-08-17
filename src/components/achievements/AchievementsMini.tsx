// Mini achievements component for profile section
'use client';

import React from 'react';
import { useAchievements } from '@/context/AchievementContext';
import AchievementCard from './AchievementCard';

interface AchievementsMiniProps {
  maxDisplay?: number;
}

export default function AchievementsMini({ maxDisplay = 5 }: AchievementsMiniProps) {
  const { 
    allAchievements, 
    userAchievements,
    getCompletionPercentage,
    isLoading 
  } = useAchievements();

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">Achievements</h3>
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const completedAchievements = userAchievements.filter(ua => ua.isCompleted);
  const recentAchievements = completedAchievements
    .sort((a, b) => {
      const aTime = a.completedAt?.toMillis() || 0;
      const bTime = b.completedAt?.toMillis() || 0;
      return bTime - aTime;
    })
    .slice(0, maxDisplay);

  const completionPercentage = getCompletionPercentage();

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Achievements</h3>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-400">{completionPercentage}%</div>
          <div className="text-sm text-gray-400">Complete</div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Unlocks</h4>
          <div className="flex gap-3 overflow-x-auto">
            {recentAchievements.map(userAchievement => {
              const achievement = allAchievements.find(a => a.id === userAchievement.achievementId);
              return achievement ? (
                <AchievementCard
                  key={userAchievement.id}
                  achievement={achievement}
                  size="small"
                  showProgress={false}
                />
              ) : null;
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="text-gray-400 text-lg mb-2">🎯</div>
          <p className="text-gray-400 text-sm">No achievements unlocked yet</p>
          <p className="text-gray-500 text-xs mt-1">Start playing to earn your first achievement!</p>
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Unlocked:</span>
          <span className="text-white">{completedAchievements.length} / {allAchievements.length}</span>
        </div>
      </div>
    </div>
  );
}
