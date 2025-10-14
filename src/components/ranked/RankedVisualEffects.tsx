'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Star, Trophy, TrendingUp, Zap } from 'lucide-react';

interface RankBadgeProps {
  rank: number;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RankBadge({ rank, animated = true, size = 'md' }: RankBadgeProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  if (rank === 1) {
    return (
      <motion.div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-yellow-900 font-bold shadow-lg border-2 border-yellow-300`}
        animate={animated ? {
          boxShadow: [
            '0 0 10px rgba(250, 204, 21, 0.5)',
            '0 0 20px rgba(250, 204, 21, 0.8)',
            '0 0 10px rgba(250, 204, 21, 0.5)'
          ],
          scale: [1, 1.1, 1]
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <img 
          src="/Design Elements/Crown.webp" 
          alt="1st Place" 
          className={iconSizes[size] + ' object-contain'}
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.8))'
          }}
        />
      </motion.div>
    );
  }

  if (rank === 2) {
    return (
      <motion.div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-gray-300 to-gray-500 flex items-center justify-center text-gray-800 font-bold shadow-lg border-2 border-gray-200`}
        animate={animated ? {
          boxShadow: [
            '0 0 8px rgba(156, 163, 175, 0.4)',
            '0 0 15px rgba(156, 163, 175, 0.6)',
            '0 0 8px rgba(156, 163, 175, 0.4)'
          ]
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        <Medal className={iconSizes[size]} />
      </motion.div>
    );
  }

  if (rank === 3) {
    return (
      <motion.div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-amber-600 to-amber-800 flex items-center justify-center text-amber-100 font-bold shadow-lg border-2 border-amber-400`}
        animate={animated ? {
          boxShadow: [
            '0 0 8px rgba(217, 119, 6, 0.4)',
            '0 0 15px rgba(217, 119, 6, 0.6)',
            '0 0 8px rgba(217, 119, 6, 0.4)'
          ]
        } : {}}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Medal className={iconSizes[size]} />
      </motion.div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold border border-gray-600`}>
      #{rank}
    </div>
  );
}

interface LevelTierBadgeProps {
  level: number;
  animated?: boolean;
  showProgress?: boolean;
  winsInLevel?: number;
}

export function LevelTierBadge({ level, animated = true, showProgress = false, winsInLevel = 0 }: LevelTierBadgeProps) {
  const getTierInfo = (level: number) => {
    if (level <= 2) return {
      name: 'Bronze',
      color: 'from-gray-400 to-gray-600',
      bgColor: 'bg-gray-500',
      textColor: 'text-gray-100',
      icon: Trophy
    };
    if (level <= 4) return {
      name: 'Gold',
      color: 'from-yellow-400 to-yellow-600',
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-900',
      icon: Star
    };
    if (level <= 6) return {
      name: 'Sapphire',
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-100',
      icon: Crown
    };
    if (level <= 8) return {
      name: 'Amethyst',
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-500',
      textColor: 'text-purple-100',
      icon: Medal
    };
    return {
      name: 'Diamond',
      color: 'from-red-400 to-red-600',
      bgColor: 'bg-red-500',
      textColor: 'text-red-100',
      icon: Zap
    };
  };

  const tier = getTierInfo(level);
  const TierIcon = tier.icon;
  const progressPercent = (winsInLevel / 5) * 100;

  return (
    <motion.div
      className="relative"
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <motion.div
        className={`px-3 py-1 rounded-full bg-gradient-to-r ${tier.color} ${tier.textColor} font-medium text-sm flex items-center space-x-1 shadow-lg border border-white/20`}
        animate={animated ? {
          boxShadow: [
            '0 4px 15px rgba(0,0,0,0.3)',
            '0 6px 20px rgba(0,0,0,0.4)',
            '0 4px 15px rgba(0,0,0,0.3)'
          ]
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <TierIcon className="w-3 h-3" />
        <span>Level {level}</span>
      </motion.div>

      {showProgress && level < 10 && (
        <motion.div
          className="absolute -bottom-1 left-0 right-0 h-1 bg-gray-700 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className={`h-full bg-gradient-to-r ${tier.color} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

interface WinStreakIndicatorProps {
  streak: number;
  animated?: boolean;
}

export function WinStreakIndicator({ streak, animated = true }: WinStreakIndicatorProps) {
  if (streak < 3) return null;

  const getStreakColor = (streak: number) => {
    if (streak >= 10) return 'from-red-500 to-yellow-500';
    if (streak >= 7) return 'from-purple-500 to-pink-500';
    if (streak >= 5) return 'from-orange-500 to-red-500';
    return 'from-blue-500 to-cyan-500';
  };

  const getStreakText = (streak: number) => {
    if (streak >= 10) return 'LEGENDARY';
    if (streak >= 7) return 'DOMINATING';
    if (streak >= 5) return 'ON FIRE';
    return 'HOT';
  };

  return (
    <motion.div
      className={`px-2 py-1 rounded-full bg-gradient-to-r ${getStreakColor(streak)} text-white text-xs font-bold flex items-center space-x-1 shadow-lg`}
      animate={animated ? {
        scale: [1, 1.1, 1],
        boxShadow: [
          '0 0 10px rgba(255,255,255,0.3)',
          '0 0 15px rgba(255,255,255,0.5)',
          '0 0 10px rgba(255,255,255,0.3)'
        ]
      } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <Zap className="w-3 h-3" />
      <span>{getStreakText(streak)}</span>
      <span>{streak}</span>
    </motion.div>
  );
}

interface RankChangeIndicatorProps {
  change: number;
  animated?: boolean;
}

export function RankChangeIndicator({ change, animated = true }: RankChangeIndicatorProps) {
  if (change === 0) return null;

  const isUp = change > 0;
  const color = isUp ? 'text-green-400' : 'text-red-400';
  const bgColor = isUp ? 'bg-green-500/20' : 'bg-red-500/20';
  const borderColor = isUp ? 'border-green-500/30' : 'border-red-500/30';

  return (
    <motion.div
      className={`px-2 py-1 rounded ${bgColor} ${color} text-xs font-medium border ${borderColor} flex items-center space-x-1`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <motion.div
        animate={animated ? {
          y: isUp ? [-1, 1, -1] : [1, -1, 1]
        } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <TrendingUp className={`w-3 h-3 ${isUp ? '' : 'rotate-180'}`} />
      </motion.div>
      <span>{Math.abs(change)}</span>
    </motion.div>
  );
}

interface SeasonProgressIndicatorProps {
  timeRemaining: string;
  animated?: boolean;
}

export function SeasonProgressIndicator({ timeRemaining, animated = true }: SeasonProgressIndicatorProps) {
  const isUrgent = timeRemaining.includes('h') && !timeRemaining.includes('d');

  return (
    <motion.div
      className={`px-3 py-2 rounded-lg ${isUrgent ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-blue-500/20 border-blue-500/30 text-blue-300'} border text-sm font-medium`}
      animate={animated && isUrgent ? {
        borderColor: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.6)', 'rgba(239, 68, 68, 0.3)'],
        backgroundColor: ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.2)']
      } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className="flex items-center space-x-2">
        <motion.div
          className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-red-400' : 'bg-blue-400'}`}
          animate={animated ? {
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span>Season ends in {timeRemaining}</span>
      </div>
    </motion.div>
  );
}

interface ParticleEffectProps {
  color?: string;
  count?: number;
  duration?: number;
}

export function ParticleEffect({ color = '#fbbf24', count = 15, duration = 3 }: ParticleEffectProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            backgroundColor: color,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -50, -100],
            x: [0, Math.random() * 40 - 20, Math.random() * 80 - 40],
            scale: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration,
            delay: Math.random() * 2,
            repeat: Infinity,
            repeatDelay: Math.random() * 3
          }}
        />
      ))}
    </div>
  );
}
