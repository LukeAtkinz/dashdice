// Achievement Card Component
'use client';

import React from 'react';
import { useAchievements } from '@/context/AchievementContext';
import { AchievementDefinition } from '@/types/achievements';

interface AchievementCardProps {
  achievement: AchievementDefinition;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  showName?: boolean;
}

export default function AchievementCard({ 
  achievement, 
  size = 'medium', 
  showProgress = true,
  showName = true
}: AchievementCardProps) {
  const { getAchievementProgress } = useAchievements();
  
  const userProgress = getAchievementProgress(achievement.id);
  const isCompleted = userProgress?.isCompleted || false;
  const progress = userProgress?.progress || 0;
  const maxProgress = achievement.requirements.value;
  const progressPercentage = Math.min((progress / maxProgress) * 100, 100);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'common': return 'from-gray-400 to-gray-600';
      case 'rare': return 'from-blue-400 to-blue-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-yellow-600';
      case 'mythic': return 'from-red-400 to-red-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const sizeClasses = {
    small: 'w-16 h-16 text-xs',
    medium: 'w-24 h-24 text-sm',
    large: 'w-32 h-32 text-base'
  };

  const nameClasses = {
    small: 'text-xs mt-1',
    medium: 'text-sm mt-2',
    large: 'text-base mt-2'
  };

  return (
    <div className={`relative group ${isCompleted ? 'cursor-pointer' : ''} flex flex-col items-center`}>
      {/* Achievement Icon */}
      <div className={`
        ${sizeClasses[size]} 
        rounded-lg 
        bg-gradient-to-br ${getDifficultyColor(achievement.difficulty)}
        flex items-center justify-center
        transition-all duration-300 hover:scale-105
        ${isCompleted ? 'opacity-100' : 'opacity-50 grayscale'}
        ${achievement.isHidden && !isCompleted ? 'opacity-30' : ''}
      `}>
        <div className="w-3/4 h-3/4 flex items-center justify-center text-white text-2xl font-bold">
          {isCompleted ? achievement.icon : (
            <div className="relative">
              <span className="text-xl opacity-60">{achievement.icon}</span>
              {!isCompleted && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 bg-gray-800 bg-opacity-80 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Completion Badge */}
        {isCompleted && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && !isCompleted && progress > 0 && (
        <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Achievement Name */}
      {showName && (
        <div className={`${nameClasses[size]} text-center text-white font-medium px-1`}>
          <div className={`
            ${isCompleted ? 'opacity-100' : 'opacity-70'} 
            ${size === 'small' ? 'max-w-16' : size === 'medium' ? 'max-w-24' : 'max-w-32'}
            leading-tight
          `}>
            {achievement.name}
          </div>
        </div>
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 max-w-xs">
          <h4 className="text-white font-semibold text-sm">{achievement.name}</h4>
          <p className="text-gray-300 text-xs mt-1">{achievement.description}</p>
          
          {!isCompleted && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Progress</span>
                <span>{progress}/{maxProgress}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {isCompleted && userProgress?.completedAt && (
            <p className="text-green-400 text-xs mt-1">
              Completed: {userProgress.completedAt.toDate().toLocaleDateString()}
            </p>
          )}
          
          {/* Rewards Preview */}
          {achievement.rewards.points && achievement.rewards.points > 0 && (
            <div className="mt-2 text-xs text-yellow-400">
              +{achievement.rewards.points} XP
            </div>
          )}
          
          {achievement.rewards.currency && achievement.rewards.currency > 0 && (
            <div className="text-xs text-green-400">
              +{achievement.rewards.currency} coins
            </div>
          )}
          
          {achievement.rewards.title && (
            <div className="text-xs text-purple-400">
              Title: {achievement.rewards.title}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
