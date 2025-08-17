// Achievement Notification Component
'use client';

import React, { useEffect, useState } from 'react';
import { useAchievements } from '@/context/AchievementContext';
import { AchievementNotification } from '@/types/achievements';

export default function AchievementNotificationDisplay() {
  const { notifications, markNotificationRead } = useAchievements();
  const [currentNotification, setCurrentNotification] = useState<AchievementNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show the latest unread notification
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length > 0 && !currentNotification) {
      const latest = unreadNotifications[0];
      setCurrentNotification(latest);
      setIsVisible(true);
      
      // Auto-hide after 5 seconds
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          markNotificationRead(latest.id);
          setCurrentNotification(null);
        }, 300);
      }, 5000);

      return () => clearTimeout(hideTimer);
    }
  }, [notifications, currentNotification, markNotificationRead]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (currentNotification) {
      setTimeout(() => {
        markNotificationRead(currentNotification.id);
        setCurrentNotification(null);
      }, 300);
    }
  };

  if (!currentNotification || !isVisible) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-50 transform transition-all duration-300 ease-out
      ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
    `}>
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-4 shadow-lg max-w-sm border-2 border-yellow-400">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-2xl">🏆</span>
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">Achievement Unlocked!</h3>
            <p className="text-yellow-100 text-sm">{currentNotification.message}</p>
            
            {/* Show rewards if available */}
            {currentNotification.metadata?.rewardsEarned && (
              <div className="mt-2 space-y-1">
                {currentNotification.metadata.rewardsEarned.points && (
                  <div className="text-yellow-200 text-xs">
                    +{currentNotification.metadata.rewardsEarned.points} XP
                  </div>
                )}
                {currentNotification.metadata.rewardsEarned.currency && (
                  <div className="text-green-200 text-xs">
                    +{currentNotification.metadata.rewardsEarned.currency} coins
                  </div>
                )}
                {currentNotification.metadata.rewardsEarned.title && (
                  <div className="text-purple-200 text-xs">
                    Title: {currentNotification.metadata.rewardsEarned.title}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
