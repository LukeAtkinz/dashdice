'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Calendar, Users, Target, Medal, Clock, Star, Award } from 'lucide-react';
import { ProgressionDisplay, CompactProgressionDisplay } from './ProgressionDisplay';
import { Leaderboard, CompactLeaderboard } from './Leaderboard';
import { AchievementsDisplay, CompactAchievements } from './AchievementsDisplay';
import { LevelUpAnimation, WinStreakAnimation, SeasonEndAnimation } from './RankedAnimations';
import { RankBadge, LevelTierBadge, WinStreakIndicator, SeasonProgressIndicator, ParticleEffect } from './RankedVisualEffects';
import { RankedStats, Season } from '../../types/ranked';
import { RankedMatchmakingService } from '../../services/rankedMatchmakingService';
import { SeasonService } from '../../services/seasonService';
import { leaderboardService } from '../../services/leaderboardService';
import { rankedAchievementService } from '../../services/rankedAchievementService';

interface RankedDashboardProps {
  userId: string;
  userDisplayName: string;
  compactMode?: boolean;
}

export function RankedDashboard({ userId, userDisplayName, compactMode = false }: RankedDashboardProps) {
  const [rankedStats, setRankedStats] = useState<RankedStats | null>(null);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'achievements' | 'history'>('overview');
  
  // Animation states
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showWinStreak, setShowWinStreak] = useState(false);
  const [showSeasonEnd, setShowSeasonEnd] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [celebrateRank, setCelebrateRank] = useState(false);

  useEffect(() => {
    loadRankedData();
  }, [userId]);

  useEffect(() => {
    // Update time remaining every minute
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [currentSeason]);

  const loadRankedData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [stats, season, rank] = await Promise.all([
        RankedMatchmakingService.getUserRankedStats(userId),
        SeasonService.getCurrentSeason(),
        leaderboardService.getUserCurrentSeasonRank(userId)
      ]);

      setRankedStats(stats);
      setCurrentSeason(season);
      
      // Check for rank improvements and trigger celebrations
      if (rank && userRank && rank < userRank && rank <= 10) {
        setCelebrateRank(true);
        setTimeout(() => setCelebrateRank(false), 3000);
      }
      setUserRank(rank);
      
      if (season) {
        updateTimeRemaining();
      }

      // Check for new achievements
      if (stats) {
        rankedAchievementService.checkAndAwardAchievements(userId, stats, rank || undefined);
      }
    } catch (err) {
      setError('Failed to load ranked data');
      console.error('Ranked dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeRemaining = async () => {
    if (currentSeason) {
      try {
        const remaining = await SeasonService.getTimeRemainingInSeason();
        const formatted = SeasonService.formatTimeRemaining(remaining);
        setTimeRemaining(formatted);
      } catch (err) {
        console.error('Error updating time remaining:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse bg-gray-800 rounded-lg p-6 h-64"></div>
        <div className="animate-pulse bg-gray-800 rounded-lg p-6 h-96"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadRankedData}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!rankedStats) {
    // User hasn't played ranked yet
    return (
      <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 rounded-lg p-8 text-center text-white">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-2xl font-bold mb-2">Welcome to Ranked Mode!</h2>
        <p className="text-gray-300 mb-6">
          Compete in ranked matches to climb the leaderboard and earn rewards.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="bg-black/20 rounded-lg p-4">
            <Medal className="w-6 h-6 mb-2 text-yellow-400" />
            <h3 className="font-semibold mb-1">Level Progression</h3>
            <p className="text-sm text-gray-300">Win 5 games to advance each level</p>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <Calendar className="w-6 h-6 mb-2 text-blue-400" />
            <h3 className="font-semibold mb-1">Seasonal Play</h3>
            <p className="text-sm text-gray-300">2-week seasons with fresh starts</p>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <Users className="w-6 h-6 mb-2 text-green-400" />
            <h3 className="font-semibold mb-1">Competitive</h3>
            <p className="text-sm text-gray-300">No friends allowed - pure skill</p>
          </div>
        </div>
      </div>
    );
  }

  // Compact mode for smaller spaces
  if (compactMode) {
    return (
      <div className="space-y-4">
        <CompactProgressionDisplay
          currentLevel={rankedStats.currentSeason.level}
          winsInLevel={rankedStats.currentSeason.winsInLevel}
          dashNumber={rankedStats.currentSeason.dashNumber}
        />
        
        <div className="bg-gray-800 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Current Rank</span>
              {userRank && userRank <= 3 && <RankBadge rank={userRank} size="sm" />}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-yellow-400">#{userRank || '---'}</span>
              {rankedStats.currentSeason.winStreak >= 3 && (
                <WinStreakIndicator streak={rankedStats.currentSeason.winStreak} animated={false} />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center text-xs mb-3">
            <div>
              <p className="text-gray-400">Win Rate</p>
              <p className="font-bold text-green-400">
                {rankedStats.currentSeason.gamesPlayed > 0
                  ? Math.round((rankedStats.currentSeason.totalWins / rankedStats.currentSeason.gamesPlayed) * 100)
                  : 0}%
              </p>
            </div>
            <div>
              <p className="text-gray-400">Streak</p>
              <p className="font-bold text-orange-400">{rankedStats.currentSeason.winStreak}</p>
            </div>
            <div>
              <p className="text-gray-400">Games</p>
              <p className="font-bold text-blue-400">{rankedStats.currentSeason.gamesPlayed}</p>
            </div>
          </div>
          
          {timeRemaining && (
            <SeasonProgressIndicator timeRemaining={timeRemaining} animated={false} />
          )}
        </div>

        <CompactAchievements
          userId={userId}
          rankedStats={rankedStats}
          currentRank={userRank || undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with season info */}
      <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 rounded-lg p-6 text-white relative overflow-hidden">
        {/* Particle effects for celebration */}
        {celebrateRank && <ParticleEffect color="#fbbf24" count={20} />}
        
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              Ranked Dashboard
              {userRank && userRank <= 3 && (
                <motion.div
                  className="ml-3"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <RankBadge rank={userRank} size="lg" />
                </motion.div>
              )}
            </h1>
            <div className="flex items-center space-x-4">
              <p className="text-gray-300">
                {currentSeason ? `Dash ${currentSeason.dashNumber}` : 'No active season'}
              </p>
              {rankedStats && (
                <LevelTierBadge 
                  level={rankedStats.currentSeason.level} 
                  showProgress={true}
                  winsInLevel={rankedStats.currentSeason.winsInLevel}
                />
              )}
              {rankedStats && rankedStats.currentSeason.winStreak >= 3 && (
                <WinStreakIndicator streak={rankedStats.currentSeason.winStreak} />
              )}
            </div>
          </div>
          
          {currentSeason && (
            <div className="text-right">
              <SeasonProgressIndicator timeRemaining={timeRemaining} />
            </div>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'leaderboard'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Trophy className="w-4 h-4 inline mr-2" />
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'achievements'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Award className="w-4 h-4 inline mr-2" />
          Achievements
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          History
        </button>
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current progression */}
            <ProgressionDisplay
              currentLevel={rankedStats.currentSeason.level}
              winsInLevel={rankedStats.currentSeason.winsInLevel}
              totalWins={rankedStats.currentSeason.totalWins}
              winStreak={rankedStats.currentSeason.winStreak}
              longestWinStreak={rankedStats.currentSeason.longestWinStreak}
              dashNumber={rankedStats.currentSeason.dashNumber}
              gamesPlayed={rankedStats.currentSeason.gamesPlayed}
            />

            {/* Stats overview */}
            <div className="bg-gray-900 rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-400" />
                Your Stats
              </h3>
              
              <div className="space-y-4">
                {/* Current rank */}
                <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <span className="font-medium">Current Rank</span>
                  <span className="text-2xl font-bold text-yellow-400">#{userRank || '---'}</span>
                </div>

                {/* Quick stats grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-400 mb-1">All-Time Best</p>
                    <p className="text-lg font-bold text-purple-400">
                      Level {rankedStats.allTime.maxLevelReached}
                    </p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-400 mb-1">Total Dashes</p>
                    <p className="text-lg font-bold text-blue-400">
                      {rankedStats.allTime.totalDashes}
                    </p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-400 mb-1">Career Wins</p>
                    <p className="text-lg font-bold text-green-400">
                      {rankedStats.allTime.totalRankedWins}
                    </p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-400 mb-1">Best Streak</p>
                    <p className="text-lg font-bold text-orange-400">
                      {rankedStats.allTime.longestWinStreak}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard userId={userId} />
        )}

        {activeTab === 'achievements' && rankedStats && (
          <AchievementsDisplay 
            userId={userId} 
            rankedStats={rankedStats}
            currentRank={userRank || undefined}
          />
        )}

        {activeTab === 'history' && (
          <div className="bg-gray-900 rounded-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-400" />
              Match History
            </h3>
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-4" />
              <p>Match history coming soon!</p>
              <p className="text-sm">Track your ranked game performance over time</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Animations */}
      <AnimatePresence>
        <LevelUpAnimation
          newLevel={newLevel}
          show={showLevelUp}
          onComplete={() => setShowLevelUp(false)}
        />
        
        <WinStreakAnimation
          streakCount={rankedStats?.currentSeason.winStreak || 0}
          show={showWinStreak}
          onComplete={() => setShowWinStreak(false)}
        />
        
        <SeasonEndAnimation
          finalLevel={rankedStats?.currentSeason.level || 1}
          finalRank={userRank || 999}
          newSeasonNumber={currentSeason?.dashNumber || 1}
          show={showSeasonEnd}
          onComplete={() => setShowSeasonEnd(false)}
        />
      </AnimatePresence>
    </div>
  );
}

// Export compact version for dashboard widgets
export function CompactRankedDashboard({ userId, userDisplayName }: RankedDashboardProps) {
  return (
    <RankedDashboard 
      userId={userId} 
      userDisplayName={userDisplayName} 
      compactMode={true} 
    />
  );
}
