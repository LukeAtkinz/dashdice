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
  isMiniCard?: boolean; // New prop to detect mini mode
}

export default function AchievementCard({ 
  achievement, 
  size = 'medium', 
  showProgress = true,
  showName = true,
  isMiniCard = false
}: AchievementCardProps) {
  const { getAchievementProgress } = useAchievements();
  
  const userProgress = getAchievementProgress(achievement.id);
  const isCompleted = userProgress?.isCompleted || false;
  const progress = userProgress?.progress || 0;
  const target = achievement.requirements?.value || 1;
  const progressPercentage = Math.min((progress / target) * 100, 100);

  // Render icon - check if it's an image path or emoji
  const renderIcon = () => {
    const iconSize = size === 'small' ? 'w-full h-full' : 'w-full h-full';
    const textSize = size === 'small' ? 'text-2xl' : 'text-6xl';
    
    if (achievement.icon.startsWith('/')) {
      // It's an image path
      return (
        <img
          src={achievement.icon}
          alt={achievement.name}
          className={`${iconSize} object-contain`}
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
        <span className={textSize}>
          {achievement.icon}
        </span>
      );
    }
  };

  // Get size-specific classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return isMiniCard 
          ? 'w-64 min-w-64 p-3' // Mini card style with more space
          : 'w-64 min-w-64 p-3'; // Regular small size
      case 'large':
        return 'w-full max-w-md p-8';
      default: // medium
        return 'w-full p-6';
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
      case 'masterpiece':
        return `${baseClasses} bg-gradient-to-br from-transparent to-orange-600/70 md:to-orange-600/30 hover:to-orange-500/80 md:hover:to-orange-500/40`;
      case 'mythic':
        return `${baseClasses} bg-gradient-to-br from-transparent to-red-600/70 md:to-red-600/30 hover:to-red-500/80 md:hover:to-red-500/40`;
      default:
        return `${baseClasses} bg-gradient-to-br from-transparent to-gray-600/70 md:to-gray-600/30`;
    }
  };

  return (
    <div className={`${getRarityClasses()} ${getSizeClasses()} bg-gray-800/80 backdrop-blur-sm flex flex-col relative overflow-hidden`}>
      {/* Main Content Area */}
      <div className={`flex gap-${size === 'small' ? (isMiniCard ? '4' : '2') : '4'} mb-${size === 'small' ? '2' : '4'} flex-1 relative z-10`}>
        {/* Icon Section */}
        <div className={`flex-shrink-0 ${
          size === 'small' 
            ? (isMiniCard ? 'w-16 h-16' : 'w-12 h-12') // Bigger icon for mini cards
            : 'w-20 h-20'
        } flex items-center justify-center relative`}>
          {renderIcon()}
          {/* Fallback emoji (hidden by default, shown if image fails) */}
          {achievement.icon.startsWith('/') && (
            <span 
              className={`${size === 'small' ? 'text-2xl' : 'text-6xl'} hidden`}
              style={{ display: 'none' }}
            >
              🏆
            </span>
          )}
          
          {/* Completion checkmark */}
          {isCompleted && (
            <div className={`absolute ${size === 'small' ? '-top-1 -right-1 w-3 h-3' : '-top-2 -right-2 w-6 h-6'} bg-green-500 rounded-full flex items-center justify-center`}>
              <span className={`text-white ${size === 'small' ? 'text-xs' : 'text-xs'}`}>✓</span>
            </div>
          )}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          {/* Achievement Name - Only show if not explicitly hidden */}
          {showName && (
            <h3 className={`text-white font-bold ${size === 'small' ? 'text-sm' : 'text-lg md:text-xl lg:text-2xl'} font-audiowide mb-1 leading-tight`}>
              {achievement.name}
            </h3>
          )}
          
          {/* Achievement Description - Only show if name is shown */}
          {showName && (
            <p className={`text-gray-400 ${size === 'small' ? 'text-xs' : 'text-sm'} font-montserrat leading-relaxed`}>
              {achievement.description}
            </p>
          )}
          
          {/* For small cards without name, show a compact version */}
          {!showName && (
            <div className={isMiniCard ? "text-left" : "text-center"}>
              <h3 className={`text-white font-bold ${isMiniCard ? 'text-sm' : 'text-xs'} font-audiowide mb-1 leading-tight`}>
                {achievement.name}
              </h3>
              <p className="text-gray-400 text-xs font-montserrat leading-relaxed line-clamp-2">
                {achievement.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Section - Only show if showProgress is true */}
      {showProgress && (
        <div className="mt-auto relative z-10">
          {/* Progress Numbers - styled like overall progress */}
          <div className={`flex items-center justify-between mb-${size === 'small' ? '2' : '3'}`}>
            <div className="flex items-baseline gap-1">
              <span className={`${size === 'small' ? 'text-lg' : 'text-2xl'} font-bold text-blue-400 font-audiowide`}>
                {isCompleted ? target : progress}
              </span>
              <span className={`text-gray-400 font-audiowide ${size === 'small' ? 'text-sm' : 'text-lg'}`}>/{target}</span>
            </div>
            
            {/* Points reward - only show if not a mini card */}
            {!isMiniCard && achievement.rewards?.points && (
              <div className={`text-yellow-400 ${size === 'small' ? 'text-xs' : 'text-sm'} font-montserrat`}>
                +{achievement.rewards.points} pts
              </div>
            )}
          </div>

          {/* Horizontal Progress Bar */}
          <div className={`w-full bg-gray-700 rounded-full ${size === 'small' ? 'h-1' : 'h-2'}`}>
            <div 
              className={`${size === 'small' ? 'h-1' : 'h-2'} rounded-full transition-all duration-500 ${
                isCompleted 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          {/* Progress percentage */}
          <div className="text-right mt-1">
            <span className={`${size === 'small' ? 'text-xs' : 'text-xs'} text-gray-500 font-montserrat`}>
              {Math.round(progressPercentage)}%
            </span>
          </div>
        </div>
      )}

      {/* Points-only display for small cards without progress - but not for mini cards */}
      {!showProgress && !isMiniCard && achievement.rewards?.points && (
        <div className="mt-auto relative z-10">
          <div className="text-center">
            <div className={`text-yellow-400 ${size === 'small' ? 'text-xs' : 'text-sm'} font-montserrat font-bold`}>
              +{achievement.rewards.points} pts
            </div>
          </div>
        </div>
      )}

      {/* Lock overlay for hidden achievements */}
      {achievement.isHidden && !isCompleted && (
        <div className="absolute inset-0 bg-black/70 rounded-[20px] flex items-center justify-center z-20">
          <div className="text-center">
            <span className={`${size === 'small' ? 'text-2xl' : 'text-4xl'} mb-2 block`}>🔒</span>
            <span className={`text-gray-400 ${size === 'small' ? 'text-xs' : 'text-sm'} font-montserrat`}>Hidden Achievement</span>
          </div>
        </div>
      )}
    </div>
  );
}
