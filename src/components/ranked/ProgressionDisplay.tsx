'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Star, TrendingUp, Medal, Target } from 'lucide-react';
import { ParticleEffect } from './RankedVisualEffects';

interface ProgressionDisplayProps {
  currentLevel: number;
  winsInLevel: number;
  totalWins: number;
  winStreak: number;
  longestWinStreak: number;
  dashNumber: number;
  gamesPlayed: number;
  showDetailed?: boolean;
}

const WINS_NEEDED_PER_LEVEL = 5;
const MAX_LEVEL = 10;

export function ProgressionDisplay({
  currentLevel,
  winsInLevel,
  totalWins,
  winStreak,
  longestWinStreak,
  dashNumber,
  gamesPlayed,
  showDetailed = true
}: ProgressionDisplayProps) {
  const progressPercent = (winsInLevel / WINS_NEEDED_PER_LEVEL) * 100;
  const winsNeeded = WINS_NEEDED_PER_LEVEL - winsInLevel;
  const winRate = gamesPlayed > 0 ? (totalWins / gamesPlayed) * 100 : 0;
  
  const getLevelColor = (level: number) => {
    if (level <= 2) return 'from-gray-400 to-gray-600'; // Bronze
    if (level <= 4) return 'from-amber-400 to-amber-600'; // Gold
    if (level <= 6) return 'from-blue-400 to-blue-600'; // Sapphire
    if (level <= 8) return 'from-purple-400 to-purple-600'; // Amethyst
    return 'from-red-400 to-red-600'; // Diamond
  };

  const getLevelIcon = (level: number) => {
    if (level <= 2) return Medal;
    if (level <= 4) return Star;
    if (level <= 6) return Trophy;
    if (level <= 8) return Crown;
    return Target;
  };

  const getLevelName = (level: number) => {
    if (level <= 2) return 'Bronze';
    if (level <= 4) return 'Gold';
    if (level <= 6) return 'Sapphire';
    if (level <= 8) return 'Amethyst';
    return 'Diamond';
  };

  const LevelIcon = getLevelIcon(currentLevel);

  return (
    <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 rounded-lg p-6 text-white relative overflow-hidden">
      {/* Particle effects for max level */}
      {currentLevel >= MAX_LEVEL && <ParticleEffect color="#fbbf24" count={15} />}
      
      {/* Header with level and dash */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-full bg-gradient-to-r ${getLevelColor(currentLevel)}`}>
            <LevelIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Level {currentLevel}</h2>
            <p className="text-blue-300">{getLevelName(currentLevel)} Tier</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-300">Dash {dashNumber}</p>
          <p className="text-lg font-semibold text-yellow-400">{totalWins} Wins</p>
        </div>
      </div>

      {/* Progress bar */}
      {currentLevel < MAX_LEVEL && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progress to Level {currentLevel + 1}</span>
            <span className="text-sm text-gray-300">
              {winsInLevel}/{WINS_NEEDED_PER_LEVEL} wins
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <motion.div
              className={`h-3 rounded-full bg-gradient-to-r ${getLevelColor(currentLevel + 1)}`}
              style={{ width: `${progressPercent}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {winsNeeded} more win{winsNeeded !== 1 ? 's' : ''} needed
          </p>
        </div>
      )}

      {currentLevel >= MAX_LEVEL && (
        <div className="mb-6">
          <div className="flex items-center justify-center p-4 bg-gradient-to-r from-yellow-500 to-red-500 rounded-lg">
            <Crown className="w-6 h-6 mr-2" />
            <span className="font-bold text-lg">MAX LEVEL REACHED!</span>
          </div>
        </div>
      )}

      {/* Detailed stats */}
      {showDetailed && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-400" />
            <p className="text-sm text-gray-300">Win Rate</p>
            <p className="text-lg font-bold text-green-400">{winRate.toFixed(1)}%</p>
          </div>
          
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-orange-400" />
            <p className="text-sm text-gray-300">Win Streak</p>
            <p className="text-lg font-bold text-orange-400">{winStreak}</p>
          </div>
          
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <Star className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
            <p className="text-sm text-gray-300">Best Streak</p>
            <p className="text-lg font-bold text-yellow-400">{longestWinStreak}</p>
          </div>
          
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <Target className="w-5 h-5 mx-auto mb-1 text-blue-400" />
            <p className="text-sm text-gray-300">Games Played</p>
            <p className="text-lg font-bold text-blue-400">{gamesPlayed}</p>
          </div>
          
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <Medal className="w-5 h-5 mx-auto mb-1 text-purple-400" />
            <p className="text-sm text-gray-300">Total Wins</p>
            <p className="text-lg font-bold text-purple-400">{totalWins}</p>
          </div>
          
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <Crown className="w-5 h-5 mx-auto mb-1 text-red-400" />
            <p className="text-sm text-gray-300">Current Dash</p>
            <p className="text-lg font-bold text-red-400">#{dashNumber}</p>
          </div>
        </div>
      )}

      {/* Level up hints */}
      {currentLevel < MAX_LEVEL && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 <strong>Level {currentLevel + 1}:</strong> Reach {WINS_NEEDED_PER_LEVEL} wins to advance to {getLevelName(currentLevel + 1)} tier
          </p>
        </div>
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function CompactProgressionDisplay({
  currentLevel,
  winsInLevel,
  dashNumber
}: {
  currentLevel: number;
  winsInLevel: number;
  dashNumber: number;
}) {
  const progressPercent = (winsInLevel / WINS_NEEDED_PER_LEVEL) * 100;
  const winsNeeded = WINS_NEEDED_PER_LEVEL - winsInLevel;
  const winRate = 0.0; // Default values for new user
  const totalWins = 0;
  const winStreak = 0;
  const bestStreak = 0;
  const gamesPlayed = 0;
  
  const getLevelColor = (level: number) => {
    if (level <= 2) return 'from-gray-400 to-gray-600';
    if (level <= 4) return 'from-amber-400 to-amber-600';
    if (level <= 6) return 'from-blue-400 to-blue-600';
    if (level <= 8) return 'from-purple-400 to-purple-600';
    return 'from-red-400 to-red-600';
  };

  const getTierName = (level: number) => {
    if (level <= 2) return 'Bronze Tier';
    if (level <= 4) return 'Gold Tier';
    if (level <= 6) return 'Sapphire Tier';
    if (level <= 8) return 'Amethyst Tier';
    return 'Diamond Tier';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white space-y-3">
      {/* Header */}
      <div className="text-center">
        <div className="text-lg font-bold" style={{ fontFamily: 'Audiowide' }}>
          Level {currentLevel}
        </div>
        <div className="text-sm text-gray-400">
          {getTierName(currentLevel)}
        </div>
        <div className="text-sm font-semibold text-yellow-400">
          Dash {dashNumber}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="text-center">
          <div className="text-gray-400">Wins</div>
          <div className="font-bold">{totalWins}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Win Rate</div>
          <div className="font-bold">{winRate.toFixed(1)}%</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Win Streak</div>
          <div className="font-bold">{winStreak}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Best Streak</div>
          <div className="font-bold">{bestStreak}</div>
        </div>
      </div>

      {/* Progress Section */}
      {currentLevel < MAX_LEVEL && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">
            Progress to Level {currentLevel + 1}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full bg-gradient-to-r ${getLevelColor(currentLevel + 1)}`}
              style={{ width: `${progressPercent}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="text-xs text-gray-400">
            {winsInLevel}/{WINS_NEEDED_PER_LEVEL} wins
          </div>
          <div className="text-xs text-gray-400">
            {winsNeeded} more wins needed
          </div>
        </div>
      )}

      {/* Additional Stats */}
      <div className="space-y-1 text-xs text-gray-400">
        <div>Games Played: <span className="text-white">{gamesPlayed}</span></div>
        <div>Total Wins: <span className="text-white">{totalWins}</span></div>
        <div>Current Dash: <span className="text-yellow-400">#{dashNumber}</span></div>
      </div>

      {/* Level Up Hint */}
      <div className="text-xs text-blue-400 text-center">
        💡 Level {currentLevel + 1}: Reach {WINS_NEEDED_PER_LEVEL} wins to advance to {getTierName(currentLevel + 1)}
      </div>
      
      {currentLevel >= MAX_LEVEL && (
        <div className="flex items-center justify-center">
          <Crown className="w-4 h-4 mr-1 text-yellow-400" />
          <span className="text-xs font-bold text-yellow-400">MAX LEVEL</span>
        </div>
      )}
    </div>
  );
}
