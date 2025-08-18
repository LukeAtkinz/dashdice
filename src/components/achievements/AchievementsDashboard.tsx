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
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "Audiowide" }}>Achievements</h1>
        
        {/* Progress Overview */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "Audiowide" }}>Overall Progress</h2>
              <p className="text-gray-400" style={{ fontFamily: "Montserrat" }}>{completedCount} of {totalCount} achievements unlocked</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-400" style={{ fontFamily: "Audiowide" }}>{completionPercentage}%</div>
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
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
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

      {/* View Filters */}
      <div className="flex items-center space-x-4 mb-6">
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

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
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
  );
}
