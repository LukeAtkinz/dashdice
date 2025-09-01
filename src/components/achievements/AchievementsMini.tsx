// Mini achievements component for profile section
'use client';

import React from 'react';
import { useAchievements } from '@/context/AchievementContext';
import AchievementCard from './AchievementCard';

interface AchievementsMiniProps {
  maxDisplay?: number;
}

export default function AchievementsMini({ maxDisplay = 12 }: AchievementsMiniProps) {
  const { 
    allAchievements, 
    userAchievements,
    getCompletionPercentage,
    isLoading 
  } = useAchievements();

  if (isLoading) {
    return (
      <div 
        className="w-[80vw] max-w-[1600px] mx-auto rounded-lg p-6 relative overflow-hidden"
        style={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <h3 className="text-xl font-audiowide text-white mb-4 uppercase">Achievements</h3>
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
    <div 
      className="w-[80vw] max-w-[1600px] mx-auto rounded-lg p-6 relative overflow-hidden"
      style={{
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <div className="flex items-center justify-between pb-[0.5rem] md:pb-[1rem]">
        <h3 className="text-xl font-audiowide text-white uppercase">Achievements</h3>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-400" style={{ textShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>{completionPercentage}%</div>
          <div className="text-sm text-gray-400 font-montserrat">Complete</div>
        </div>
      </div>

      {/* Achievements Display */}
      <div className="relative overflow-hidden">
        <div className="achievements-carousel overflow-hidden">
          <div className="flex gap-4 animate-carousel">
            {/* Show all achievements (duplicate for seamless loop) */}
            {[...allAchievements.slice(0, Math.min(15, allAchievements.length)),
              ...allAchievements.slice(0, Math.min(15, allAchievements.length))].filter(achievement => achievement && achievement.id).map((achievement, index) => (
              <div key={`${achievement.id}-${index}`} className="flex-shrink-0">
                <AchievementCard
                  achievement={achievement}
                  size="small"
                  showProgress={false}
                  showName={false}
                  isMiniCard={true}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-gray-300 font-montserrat text-base">Unlocked:</span>
            <span className="text-white font-audiowide text-xl font-bold">{completedAchievements.length} / {allAchievements.length}</span>
          </div>
          <button
            onClick={() => {
              // Navigate to achievements section
              if (typeof window !== 'undefined') {
                const navigationEvent = new CustomEvent('navigate-to-achievements');
                window.dispatchEvent(navigationEvent);
              }
            }}
            className="text-blue-400 hover:text-blue-300 text-base font-medium transition-colors font-audiowide uppercase px-4 py-2 rounded-lg border border-blue-400 hover:border-blue-300"
          >
            SEE ALL
          </button>
        </div>
      </div>
    </div>
  );
}
