'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Clock, Target, Star } from 'lucide-react';
import { RankedStats } from '../../types/ranked';
import { RankBadge, LevelTierBadge, WinStreakIndicator } from './RankedVisualEffects';

interface MobileRankedCardProps {
  rankedStats: RankedStats;
  userRank?: number;
  timeRemaining?: string;
  userId: string;
}

export function MobileRankedCard({ rankedStats, userRank, timeRemaining, userId }: MobileRankedCardProps) {
  const winRate = rankedStats.currentSeason.gamesPlayed > 0 
    ? (rankedStats.currentSeason.totalWins / rankedStats.currentSeason.gamesPlayed) * 100 
    : 0;

  const progressPercent = (rankedStats.currentSeason.winsInLevel / 5) * 100;

  return (
    <motion.div
      className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 rounded-lg p-4 text-white shadow-lg"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <div>
            <h3 className="font-bold text-lg">Ranked</h3>
            <p className="text-xs text-gray-300">Dash {rankedStats.currentSeason.dashNumber}</p>
          </div>
        </div>
        
        {userRank && userRank <= 10 && (
          <RankBadge rank={userRank} size="sm" />
        )}
      </div>

      {/* Level and Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <LevelTierBadge level={rankedStats.currentSeason.level} />
          <span className="text-sm text-gray-300">
            {rankedStats.currentSeason.winsInLevel}/5 wins
          </span>
        </div>
        
        {rankedStats.currentSeason.level < 10 && (
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="bg-black/20 rounded p-2">
          <TrendingUp className="w-3 h-3 mx-auto mb-1 text-green-400" />
          <p className="text-xs text-gray-400">Win Rate</p>
          <p className="text-sm font-bold text-green-400">{winRate.toFixed(0)}%</p>
        </div>
        
        <div className="bg-black/20 rounded p-2">
          <Target className="w-3 h-3 mx-auto mb-1 text-blue-400" />
          <p className="text-xs text-gray-400">Rank</p>
          <p className="text-sm font-bold text-yellow-400">#{userRank || '---'}</p>
        </div>
        
        <div className="bg-black/20 rounded p-2">
          <Star className="w-3 h-3 mx-auto mb-1 text-orange-400" />
          <p className="text-xs text-gray-400">Streak</p>
          <p className="text-sm font-bold text-orange-400">{rankedStats.currentSeason.winStreak}</p>
        </div>
      </div>

      {/* Win Streak Indicator */}
      {rankedStats.currentSeason.winStreak >= 3 && (
        <div className="mb-3 flex justify-center">
          <WinStreakIndicator streak={rankedStats.currentSeason.winStreak} animated={false} />
        </div>
      )}

      {/* Season Timer */}
      {timeRemaining && (
        <div className="flex items-center justify-center text-xs text-gray-400 bg-black/20 rounded p-2">
          <Clock className="w-3 h-3 mr-1" />
          <span>Season ends in {timeRemaining}</span>
        </div>
      )}
    </motion.div>
  );
}

interface QuickRankedStatsProps {
  rankedStats: RankedStats;
  userRank?: number;
  compact?: boolean;
}

export function QuickRankedStats({ rankedStats, userRank, compact = false }: QuickRankedStatsProps) {
  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <LevelTierBadge level={rankedStats.currentSeason.level} animated={false} />
        {userRank && userRank <= 100 && (
          <span className="text-yellow-400 font-medium">#{userRank}</span>
        )}
        {rankedStats.currentSeason.winStreak >= 3 && (
          <WinStreakIndicator streak={rankedStats.currentSeason.winStreak} animated={false} />
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 text-white">
      <div className="flex items-center justify-between mb-2">
        <LevelTierBadge level={rankedStats.currentSeason.level} />
        {userRank && <RankBadge rank={userRank} size="sm" />}
      </div>
      
      <div className="text-xs text-gray-400 space-y-1">
        <div className="flex justify-between">
          <span>Wins:</span>
          <span className="text-green-400">{rankedStats.currentSeason.totalWins}</span>
        </div>
        <div className="flex justify-between">
          <span>Games:</span>
          <span className="text-blue-400">{rankedStats.currentSeason.gamesPlayed}</span>
        </div>
        {rankedStats.currentSeason.winStreak >= 3 && (
          <div className="flex justify-between">
            <span>Streak:</span>
            <WinStreakIndicator streak={rankedStats.currentSeason.winStreak} animated={false} />
          </div>
        )}
      </div>
    </div>
  );
}
