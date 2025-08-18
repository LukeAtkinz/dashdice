// Achievements Dashboard Component
'use client';

import React, { useState } from 'react';
import { useAchievements } from '@/context/AchievementContext';
import AchievementCard from './AchievementCard';
import { AchievementCategory } from '@/types/achievements';

export default function AchievementsDashboard() {
  const { 
    allAchievements, 
    userAchievements,
    getAchievementsByCategory,
    getCompletionPercentage,
    isLoading 
  } = useAchievements();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [showIncomplete, setShowIncomplete] = useState<boolean>(true);

  const categories = [
    { id: 'all', name: 'All', icon: '🏆' },
    { id: 'gameplay', name: 'Gameplay', icon: '🎲' },
    { id: 'social', name: 'Social', icon: '👥' },
    { id: 'progression', name: 'Progress', icon: '📈' },
    { id: 'special', name: 'Special', icon: '⭐' },
    { id: 'seasonal', name: 'Seasonal', icon: '🎃' }
  ];

  const filteredAchievements = selectedCategory === 'all' 
    ? allAchievements 
    : getAchievementsByCategory(selectedCategory as AchievementCategory);

  const visibleAchievements = filteredAchievements.filter(achievement => {
    const userProgress = userAchievements.find(ua => ua.achievementId === achievement.id);
    const isCompleted = userProgress?.isCompleted || false;
    
    if (isCompleted && !showCompleted) return false;
    if (!isCompleted && !showIncomplete) return false;
    
    return true;
  });

  const completedCount = userAchievements.filter(ua => ua.isCompleted).length;
  const totalCount = allAchievements.length;
  const completionPercentage = getCompletionPercentage();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 md:px-6 py-2 md:py-6">
      {/* Header Section */}
      <div className="w-full px-2 md:px-4 py-2 md:py-4 pb-[0.5rem] md:pb-[1rem]">
        <h1
          className="text-2xl md:text-4xl lg:text-5xl font-normal mb-4 md:mb-6"
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
      <div className="px-2 md:px-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="text-center sm:text-left">
              <h2 className="text-lg md:text-xl font-semibold text-white" style={{ fontFamily: "Audiowide" }}>Overall Progress</h2>
              <p className="text-gray-400" style={{ fontFamily: "Montserrat" }}>{completedCount} of {totalCount} achievements unlocked</p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-2xl md:text-3xl font-bold text-blue-400" style={{ fontFamily: "Audiowide" }}>{completionPercentage}%</div>
              <div className="text-sm text-gray-400" style={{ fontFamily: "Montserrat" }}>Complete</div>
            </div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-2 md:px-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg transition-colors text-sm md:text-base
                ${selectedCategory === category.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
            >
              <span>{category.icon}</span>
              <span className="font-audiowide">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* View Filters */}
      <div className="px-2 md:px-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <label className="flex items-center space-x-2 text-gray-300">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded"
          />
          <span className="font-montserrat">Show Completed</span>
        </label>
        
        <label className="flex items-center space-x-2 text-gray-300">
          <input
            type="checkbox"
            checked={showIncomplete}
            onChange={(e) => setShowIncomplete(e.target.checked)}
            className="rounded"
          />
          <span className="font-montserrat">Show In Progress</span>
        </label>
        </div>
      </div>

      {/* Achievements Grid - 2 per row on desktop, 1 on mobile */}
      <div className="px-2 md:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {visibleAchievements.map(achievement => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              size="medium"
              showProgress={true}
              showName={true}
            />
          ))}
        </div>

        {/* Empty State */}
        {visibleAchievements.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg font-audiowide">No achievements found</div>
            <p className="text-gray-500 mt-2 font-montserrat">Try adjusting your filters or start playing to unlock achievements!</p>
          </div>
        )}
      </div>
    </div>
  );
}
