'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, Star, TrendingUp, Users, Clock, Filter } from 'lucide-react';
import { LeaderboardEntry } from '../../types/ranked';
import { leaderboardService } from '../../services/leaderboardService';
import { SeasonService } from '../../services/seasonService';
import { RankBadge, LevelTierBadge, WinStreakIndicator, SeasonProgressIndicator } from './RankedVisualEffects';

interface LeaderboardProps {
  userId?: string;
  showUserRank?: boolean;
  compactMode?: boolean;
  limitCount?: number;
}

type LeaderboardType = 'current' | 'allTime';

export function Leaderboard({ 
  userId, 
  showUserRank = true, 
  compactMode = false,
  limitCount = 50 
}: LeaderboardProps) {
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('current');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [seasonInfo, setSeasonInfo] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    loadLeaderboard();
    loadSeasonInfo();
  }, [leaderboardType, limitCount]);

  useEffect(() => {
    if (userId && showUserRank) {
      loadUserRank();
    }
  }, [userId, leaderboardType, showUserRank]);

  useEffect(() => {
    // Update time remaining every minute
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [seasonInfo]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = leaderboardType === 'current'
        ? await leaderboardService.getCurrentSeasonLeaderboard(limitCount)
        : await leaderboardService.getAllTimeLeaderboard(limitCount);
      
      setEntries(data);
    } catch (err) {
      setError(`Failed to load ${leaderboardType} leaderboard`);
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRank = async () => {
    if (!userId) return;
    
    try {
      const rank = leaderboardType === 'current'
        ? await leaderboardService.getUserCurrentSeasonRank(userId)
        : await leaderboardService.getUserAllTimeRank(userId);
      
      setUserRank(rank);
    } catch (err) {
      console.error('Error loading user rank:', err);
    }
  };

  const loadSeasonInfo = async () => {
    if (leaderboardType === 'current') {
      try {
        const season = await SeasonService.getCurrentSeason();
        setSeasonInfo(season);
        updateTimeRemaining();
      } catch (err) {
        console.error('Error loading season info:', err);
      }
    } else {
      setSeasonInfo(null);
    }
  };

  const updateTimeRemaining = async () => {
    if (leaderboardType === 'current') {
      try {
        const remaining = await SeasonService.getTimeRemainingInSeason();
        const formatted = SeasonService.formatTimeRemaining(remaining);
        setTimeRemaining(formatted);
      } catch (err) {
        console.error('Error updating time remaining:', err);
      }
    }
  };

  const getRankIcon = (rank: number) => {
    return <RankBadge rank={rank} size="md" />;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/30';
    return 'bg-gray-800/50 border-gray-700/50';
  };

  const getLevelBadgeColor = (level: number) => {
    if (level <= 2) return 'bg-gray-500 text-gray-100';
    if (level <= 4) return 'bg-yellow-500 text-yellow-100';
    if (level <= 6) return 'bg-blue-500 text-blue-100';
    if (level <= 8) return 'bg-purple-500 text-purple-100';
    return 'bg-red-500 text-red-100';
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadLeaderboard}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg text-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center">
            <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
            Leaderboard
          </h2>
          
          {seasonInfo && (
            <div className="text-right">
              <SeasonProgressIndicator timeRemaining={timeRemaining} />
            </div>
          )}
        </div>

        {/* Type selector */}
        <div className="flex space-x-2">
          <button
            onClick={() => setLeaderboardType('current')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              leaderboardType === 'current'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Current Season
          </button>
          <button
            onClick={() => setLeaderboardType('allTime')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              leaderboardType === 'allTime'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Star className="w-4 h-4 inline mr-2" />
            All Time
          </button>
        </div>

        {/* User rank display */}
        {showUserRank && userRank && (
          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-300">
              Your Rank: <span className="font-bold text-blue-400">#{userRank}</span>
            </p>
          </div>
        )}
      </div>

      {/* Leaderboard entries */}
      <div className="p-6">
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No leaderboard data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.playerId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between p-4 rounded-lg border ${getRankBg(entry.rank)} ${
                    entry.playerId === userId ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Rank */}
                    <div className="w-8 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Player info */}
                    <div>
                      <p className="font-semibold">{entry.displayName}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <LevelTierBadge level={entry.level} animated={false} />
                        {!compactMode && (
                          <>
                            <span>•</span>
                            <span>{entry.gamesPlayed} games</span>
                            {entry.winStreak >= 3 && (
                              <>
                                <span>•</span>
                                <WinStreakIndicator streak={entry.winStreak} animated={false} />
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-400">Wins</p>
                        <p className="font-bold text-green-400">{entry.totalWins}</p>
                      </div>
                      
                      {!compactMode && (
                        <>
                          <div className="text-center">
                            <p className="text-sm text-gray-400">Win Rate</p>
                            <p className="font-bold text-blue-400">{entry.winRate}%</p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm text-gray-400">Streak</p>
                            <p className="font-bold text-orange-400">{entry.winStreak}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact leaderboard component for dashboard
export function CompactLeaderboard({ userId }: { userId?: string }) {
  return (
    <Leaderboard 
      userId={userId}
      showUserRank={true}
      compactMode={true}
      limitCount={10}
    />
  );
}
