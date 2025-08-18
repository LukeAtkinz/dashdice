// Achievement Card Component
'use client';

import React from 'react';
import { AchievementDefinition } from '@/types/achievements';
import { useAchievements } from '@/context/AchievementContext';

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
  const target = achievement.requirements.value;
  const progressPercentage = Math.min((progress / target) * 100, 100);

  // Render icon - check if it's an image path or emoji
  const renderIcon = () => {
    if (achievement.icon.startsWith('/')) {
      // It's an image path
      return (
        <img
          src={achievement.icon}
          alt={achievement.name}
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback to emoji if image fails to load
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) {
              fallback.style.display = 'block';
            }
          }}
        />
      );
    } else {
      // It's an emoji or text
      return (
        <span className="text-6xl">
          {achievement.icon}
        </span>
      );
    }
  };

  // Get rarity-based styling with gradient backgrounds
  const getRarityClasses = () => {
    const baseClasses = "rounded-[20px] transition-all duration-300 hover:scale-[1.02] cursor-pointer";
    
    if (isCompleted) {
      return `${baseClasses} bg-gradient-to-br from-transparent to-yellow-500/70 md:to-yellow-500/40 shadow-lg shadow-yellow-500/20`;
    }
    
    switch (achievement.difficulty) {
      case 'common':
        return `${baseClasses} bg-gradient-to-br from-transparent to-gray-600/70 md:to-gray-600/30 hover:to-gray-500/80 md:hover:to-gray-500/40`;
      case 'rare':
        return `${baseClasses} bg-gradient-to-br from-transparent to-blue-600/70 md:to-blue-600/30 hover:to-blue-500/80 md:hover:to-blue-500/40`;
      case 'epic':
        return `${baseClasses} bg-gradient-to-br from-transparent to-purple-600/70 md:to-purple-600/30 hover:to-purple-500/80 md:hover:to-purple-500/40`;
      case 'legendary':
        return `${baseClasses} bg-gradient-to-br from-transparent to-orange-600/70 md:to-orange-600/30 hover:to-orange-500/80 md:hover:to-orange-500/40`;
      case 'mythic':
        return `${baseClasses} bg-gradient-to-br from-transparent to-red-600/70 md:to-red-600/30 hover:to-red-500/80 md:hover:to-red-500/40`;
      default:
        return `${baseClasses} bg-gradient-to-br from-transparent to-gray-600/70 md:to-gray-600/30`;
    }
  };

  return (
    <div className={`${getRarityClasses()} bg-gray-800/80 backdrop-blur-sm p-6 flex flex-col relative overflow-hidden`}>
      {/* Main Content Area */}
      <div className="flex gap-4 mb-4 flex-1 relative z-10">
        {/* Icon Section - 80% height */}
        <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center relative">
          {renderIcon()}
          {/* Fallback emoji (hidden by default, shown if image fails) */}
          {achievement.icon.startsWith('/') && (
            <span 
              className="text-6xl hidden"
              style={{ display: 'none' }}
            >
              🏆
            </span>
          )}
          
          {/* Completion checkmark */}
          {isCompleted && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          {/* Achievement Name */}
          <h3 className="text-white font-bold text-lg md:text-xl lg:text-2xl font-audiowide mb-2 leading-tight">
            {achievement.name}
          </h3>
          
          {/* Achievement Description */}
          <p className="text-gray-400 text-sm font-montserrat leading-relaxed">
            {achievement.description}
          </p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="mt-auto relative z-10">
        {/* Progress Numbers - styled like overall progress */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-blue-400 font-audiowide">
              {isCompleted ? target : progress}
            </span>
            <span className="text-gray-400 font-audiowide text-lg">/{target}</span>
          </div>
          
          {/* Points reward */}
          <div className="text-yellow-400 text-sm font-montserrat">
            +{achievement.rewards.points} pts
          </div>
        </div>

        {/* Horizontal Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              isCompleted 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Progress percentage */}
        <div className="text-right mt-1">
          <span className="text-xs text-gray-500 font-montserrat">
            {Math.round(progressPercentage)}%
          </span>
        </div>
      </div>

      {/* Lock overlay for hidden achievements */}
      {achievement.isHidden && !isCompleted && (
        <div className="absolute inset-0 bg-black/70 rounded-[20px] flex items-center justify-center z-20">
          <div className="text-center">
            <span className="text-4xl mb-2 block">🔒</span>
            <span className="text-gray-400 text-sm font-montserrat">Hidden Achievement</span>
          </div>
        </div>
      )}
    </div>
  );
}
