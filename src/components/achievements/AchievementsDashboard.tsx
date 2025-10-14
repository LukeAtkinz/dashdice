'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAchievements } from '@/context/AchievementContext';
import { useAuth } from '@/context/AuthContext';
import AchievementCard from './AchievementCard';
import { AchievementCategory } from '@/types/achievements';
import { rankedAchievementService } from '@/services/rankedAchievementService';
import { RankedStats } from '@/types/ranked';

// CSS for custom button styling
const buttonStyles = `
  .custom-inventory-button {
    background: var(--ui-inventory-button-bg, linear-gradient(135deg, #2a1810 0%, #1a0f08 100%));
    border: 2px solid var(--ui-inventory-button-border, #8b7355);
    color: var(--ui-inventory-button-text, #f4f1eb);
    transition: all 0.3s ease;
    font-family: 'Audiowide', monospace;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  }
  
  .custom-inventory-button:hover {
    background: var(--ui-inventory-button-hover-bg, linear-gradient(135deg, #3a2420 0%, #2a1810 100%));
    border-color: var(--ui-inventory-button-hover-border, #a68b5b);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 115, 85, 0.3);
  }
  
  .custom-inventory-button.active {
    background: var(--ui-inventory-button-active-bg, linear-gradient(135deg, #4a3020 0%, #3a2420 100%));
    border-color: var(--ui-inventory-button-active-border, #c9a96e);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  /* Inventory-style navigation button hover effects */
  .nav-button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .nav-button:active {
    transform: scale(0.95);
  }
  .nav-button.active {
    border-color: #FFD700;
  }
  @keyframes navPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes navClick {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
`;

export default function AchievementsDashboard() {
  const { 
    allAchievements, 
    userAchievements,
    getAchievementsByCategory,
    getCompletionPercentage,
    isLoading 
  } = useAchievements();
  
  const { user } = useAuth();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [showIncomplete, setShowIncomplete] = useState<boolean>(true);
  const [rankedAchievements, setRankedAchievements] = useState<any[]>([]);
  const [rankedLoading, setRankedLoading] = useState(false);

  // Load ranked achievements
  useEffect(() => {
    if (user?.uid) {
      loadRankedAchievements();
    }
  }, [user?.uid]);

  const loadRankedAchievements = async () => {
    try {
      setRankedLoading(true);
      // Mock ranked stats - in a real implementation, you'd load these from the user's profile
      const mockRankedStats: RankedStats = {
        currentSeason: {
          dashNumber: 1,
          level: 5,
          winsInLevel: 3,
          totalWins: 25,
          totalLosses: 15,
          winStreak: 2,
          longestWinStreak: 8,
          gamesPlayed: 40
        },
        allTime: {
          totalDashes: 1,
          maxLevelReached: 7,
          totalRankedWins: 125,
          totalRankedLosses: 75,
          totalRankedGames: 200,
          longestWinStreak: 8,
          averageLevel: 5.2
        }
      };
      
      const rankedProgress = await rankedAchievementService.getAchievementProgress(
        user!.uid, 
        mockRankedStats, 
        undefined
      );
      
      // Convert ranked achievements to the same format as regular achievements
      const convertedRankedAchievements = rankedProgress.map((item, index) => ({
        id: `ranked_${item.achievement.id}`,
        name: item.achievement.name,
        description: item.achievement.description,
        icon: item.achievement.icon,
        category: 'ranked' as AchievementCategory,
        points: 50, // Default points for ranked achievements
        tier: item.achievement.tier,
        unlocked: item.unlocked,
        progress: item.progress,
        requirements: {
          type: 'count',
          value: 100, // Default target value
          description: item.achievement.description
        }
      }));
      
      setRankedAchievements(convertedRankedAchievements);
    } catch (error) {
      console.error('Error loading ranked achievements:', error);
    } finally {
      setRankedLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All', icon: '🏆' },
    { id: 'gameplay', name: 'Gameplay', icon: '🎲' },
    { id: 'social', name: 'Social', icon: '👥' },
    { id: 'progression', name: 'Progress', icon: '📈' },
    { id: 'ranked', name: 'Ranked', icon: '⚔️' },
    { id: 'special', name: 'Special', icon: '⭐' },
    { id: 'seasonal', name: 'Seasonal', icon: '🎃' }
  ];

  // Combine regular and ranked achievements
  const combinedAchievements = [
    ...allAchievements,
    ...rankedAchievements
  ];

  const filteredAchievements = selectedCategory === 'all' 
    ? combinedAchievements
    : selectedCategory === 'ranked'
      ? rankedAchievements
      : getAchievementsByCategory(selectedCategory as AchievementCategory);

  const visibleAchievements = filteredAchievements.filter(achievement => {
    // Handle ranked achievements (they have their unlocked status directly)
    if (achievement.category === 'ranked') {
      const isCompleted = achievement.unlocked || false;
      if (isCompleted && !showCompleted) return false;
      if (!isCompleted && !showIncomplete) return false;
      return true;
    }
    
    // Handle regular achievements
    const userProgress = userAchievements.find(ua => ua.achievementId === achievement.id);
    const isCompleted = userProgress?.isCompleted || false;
    
    if (isCompleted && !showCompleted) return false;
    if (!isCompleted && !showIncomplete) return false;
    
    return true;
  });

  // Calculate totals including ranked achievements
  const rankedCompletedCount = rankedAchievements.filter(ra => ra.unlocked).length;
  const regularCompletedCount = userAchievements.filter(ua => ua.isCompleted).length;
  const completedCount = regularCompletedCount + rankedCompletedCount;
  const totalCount = allAchievements.length + rankedAchievements.length;
  const completionPercentage = getCompletionPercentage();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{buttonStyles}</style>
      <div className="w-[90vw] max-w-[1600px] mx-auto px-2 md:px-6 py-2 md:py-6">
      {/* Header Section */}
      <div className="w-full px-2 md:px-4 py-2 md:py-4 pb-[0.5rem] md:pb-[1rem]">
        <h1
          className="text-4xl md:text-4xl lg:text-5xl font-normal mb-4 md:mb-6"
          style={{
            color: "#FFF",
            fontFamily: "Audiowide",
            fontStyle: "normal",
            fontWeight: 400,
            textTransform: "uppercase",
            textAlign: "center",
            margin: 0,
            textShadow: "0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2)"
          }}
        >
          ACHIEVEMENTS
        </h1>
      </div>

      {/* Progress Overview */}
      <div className="px-2 md:px-4 mb-6 mt-8">
        <div 
          className="relative overflow-hidden rounded-2xl p-4 md:p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(15, 15, 35, 0.9) 100%)',
            borderRadius: '20px'
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 max-w-md">
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-blue-400" style={{ fontFamily: "Audiowide" }}>{completionPercentage}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements by Category - Both Mobile and Desktop */}
      <div className="px-2">
        {categories.map((category) => {
          const categoryAchievements = visibleAchievements.filter(
            achievement => achievement && achievement.id && achievement.category === category.id
          );
          
          if (categoryAchievements.length === 0) return null;
          
          return (
            <div key={category.id} className="mb-8">
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{category.icon}</span>
                <h4 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Audiowide' }}>
                  {category.name}
                </h4>
              </div>
              
              {/* Category Achievements */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {categoryAchievements.map((achievement, index) => (
                  <AchievementCard
                    key={achievement.id || `achievement_${index}`}
                    achievement={achievement}
                    size="medium"
                    showProgress={true}
                    showName={true}
                  />
                ))}
              </div>
            </div>
          );
        })}
        
        {/* Empty State */}
        {visibleAchievements.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg font-audiowide">No achievements found</div>
            <p className="text-gray-500 mt-2 font-montserrat">Start playing to unlock achievements!</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
