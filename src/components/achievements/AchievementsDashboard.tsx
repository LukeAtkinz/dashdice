'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // Load ranked achievements - DISABLED FOR NOW
  // useEffect(() => {
  //   if (user?.uid) {
  //     loadRankedAchievements();
  //   }
  // }, [user?.uid]);

  const loadRankedAchievements = async () => {
    // DISABLED: No ranked achievements for now
    return;
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
    { id: 'gameplay', name: 'Gameplay', icon: '/Design Elements/Achivements/Catagories/Game.png' },
    { id: 'social', name: 'Social', icon: '👥' }, // Will add social icon later
    { id: 'progression', name: 'Progress', icon: '/Design Elements/Achivements/Catagories/Progress.png' },
    // { id: 'ranked', name: 'Ranked', icon: '⚔️' }, // DISABLED FOR NOW
    { id: 'special', name: 'Special', icon: '/Design Elements/Achivements/Catagories/Special.png' },
    { id: 'seasonal', name: 'Seasonal', icon: '🎃' }
  ];

  // Combine regular achievements only (ranked disabled)
  const combinedAchievements = [
    ...allAchievements
    // ...rankedAchievements // DISABLED FOR NOW
  ];

  const filteredAchievements = selectedCategory === 'all' 
    ? combinedAchievements
    : getAchievementsByCategory(selectedCategory as AchievementCategory);

  const visibleAchievements = filteredAchievements.filter(achievement => {
    // Handle regular achievements (ranked achievements disabled)
    const userProgress = userAchievements.find(ua => ua.achievementId === achievement.id);
    const isCompleted = userProgress?.isCompleted || false;
    
    if (isCompleted && !showCompleted) return false;
    if (!isCompleted && !showIncomplete) return false;
    
    return true;
  });

  // Calculate totals (ranked achievements disabled for now)
  const regularCompletedCount = userAchievements.filter(ua => ua.isCompleted).length;
  const completedCount = regularCompletedCount; // + rankedCompletedCount (disabled)
  const totalCount = allAchievements.length; // + rankedAchievements.length (disabled)
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
      <div className="w-[90vw] max-w-[1600px] mx-auto px-2 md:px-6 py-2 md:py-6 mt-[7vh] md:mt-0">
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
        <motion.div 
          className="relative overflow-hidden rounded-2xl p-4 md:p-5 mb-6 cursor-pointer transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(15, 15, 35, 0.9) 100%)',
            borderRadius: '20px',
            border: isFilterExpanded ? '2px solid rgba(59, 130, 246, 0.5)' : '2px solid transparent'
          }}
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
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
            <div className="mt-3 text-center">
              <div className="text-white text-sm md:text-base opacity-80" style={{ fontFamily: "Audiowide" }}>
                {completedCount} of {totalCount} achievements completed
              </div>
              <div className="text-blue-300 text-xs md:text-sm mt-1 opacity-60">
                {isFilterExpanded ? 'Click to hide filters' : 'Click to show filters'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Expandable Filter Section */}
        <AnimatePresence>
          {isFilterExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="bg-transparent backdrop-blur-[0.5px] border border-gray-700/50 rounded-xl p-4 mb-6">
                <div className="space-y-4">
                  {/* Category Filters */}
                  <div>
                    <h3 className="text-white text-lg font-bold mb-3" style={{ fontFamily: "Audiowide" }}>
                      CATEGORY FILTER
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => setSelectedCategory('all')}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-3 rounded-lg transition-all duration-200 ${
                          selectedCategory === 'all'
                            ? 'bg-blue-600/40 border-blue-400/70 text-blue-300'
                            : 'bg-gray-800/30 border-gray-600/50 text-white hover:bg-gray-700/40 hover:border-blue-400/70'
                        } border`}
                        style={{ fontFamily: "Audiowide" }}
                      >
                        ALL
                      </motion.button>
                      {categories
                        .filter(category => category.id !== 'all' && category.id !== 'seasonal')
                        .map((category, index) => (
                        <motion.button
                          key={category.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (index + 1) * 0.05 }}
                          onClick={() => setSelectedCategory(category.id)}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className={`p-3 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                            selectedCategory === category.id
                              ? 'bg-blue-600/40 border-blue-400/70 text-blue-300'
                              : 'bg-gray-800/30 border-gray-600/50 text-white hover:bg-gray-700/40 hover:border-blue-400/70'
                          } border`}
                          style={{ fontFamily: "Audiowide" }}
                        >
                          {category.icon.startsWith('/') ? (
                            <img 
                              src={category.icon} 
                              alt={`${category.name} icon`} 
                              className="w-5 h-5 object-contain"
                            />
                          ) : (
                            <span className="text-lg">{category.icon}</span>
                          )}
                          {category.name.toUpperCase()}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Progress Filters */}
                  <div>
                    <h3 className="text-white text-lg font-bold mb-3" style={{ fontFamily: "Audiowide" }}>
                      PROGRESS FILTER
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        onClick={() => setShowCompleted(!showCompleted)}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-3 rounded-lg transition-all duration-200 ${
                          showCompleted
                            ? 'bg-green-600/40 border-green-400/70 text-green-300'
                            : 'bg-gray-800/30 border-gray-600/50 text-white hover:bg-gray-700/40 hover:border-green-400/70'
                        } border`}
                        style={{ fontFamily: "Audiowide" }}
                      >
                        COMPLETED
                      </motion.button>
                      <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        onClick={() => setShowIncomplete(!showIncomplete)}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-3 rounded-lg transition-all duration-200 ${
                          showIncomplete
                            ? 'bg-orange-600/40 border-orange-400/70 text-orange-300'
                            : 'bg-gray-800/30 border-gray-600/50 text-white hover:bg-gray-700/40 hover:border-orange-400/70'
                        } border`}
                        style={{ fontFamily: "Audiowide" }}
                      >
                        PROGRESS
                      </motion.button>
                    </div>
                  </div>
                </div>
                
                {/* Close Filter Button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => setIsFilterExpanded(false)}
                  className="w-full mt-4 py-2 px-4 bg-gray-700 hover:bg-gray-600 
                             text-white rounded-lg font-medium transition-colors"
                  style={{ fontFamily: 'Audiowide' }}
                >
                  HIDE FILTERS
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                {category.icon.startsWith('/') ? (
                  <img 
                    src={category.icon} 
                    alt={`${category.name} icon`} 
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <span className="text-3xl">{category.icon}</span>
                )}
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
