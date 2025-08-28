'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Star, Sparkles, Zap } from 'lucide-react';

interface LevelUpAnimationProps {
  newLevel: number;
  onComplete?: () => void;
  show: boolean;
}

export function LevelUpAnimation({ newLevel, onComplete, show }: LevelUpAnimationProps) {
  const getLevelTier = (level: number) => {
    if (level <= 2) return { name: 'Bronze', color: 'from-gray-400 to-gray-600', icon: Trophy };
    if (level <= 4) return { name: 'Gold', color: 'from-amber-400 to-amber-600', icon: Star };
    if (level <= 6) return { name: 'Sapphire', color: 'from-blue-400 to-blue-600', icon: Crown };
    if (level <= 8) return { name: 'Amethyst', color: 'from-purple-400 to-purple-600', icon: Sparkles };
    return { name: 'Diamond', color: 'from-red-400 to-red-600', icon: Zap };
  };

  const tier = getLevelTier(newLevel);
  const TierIcon = tier.icon;

  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="relative bg-gray-900 rounded-2xl p-8 text-center text-white shadow-2xl border border-gray-700 max-w-md mx-4"
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: -50 }}
        transition={{ 
          type: "spring", 
          damping: 20, 
          stiffness: 300,
          delay: 0.1 
        }}
      >
        {/* Sparkle effects */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: 2,
                delay: Math.random() * 0.5,
                repeat: Infinity,
                repeatDelay: Math.random() * 1
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Level up text */}
          <motion.h1
            className="text-3xl font-bold mb-2 text-yellow-400"
            animate={{ 
              textShadow: [
                '0 0 10px rgba(250, 204, 21, 0.5)',
                '0 0 20px rgba(250, 204, 21, 0.8)',
                '0 0 10px rgba(250, 204, 21, 0.5)'
              ]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            LEVEL UP!
          </motion.h1>

          {/* Level number with icon */}
          <motion.div
            className="flex items-center justify-center space-x-4 mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: 0.5, 
              type: "spring", 
              damping: 15, 
              stiffness: 400 
            }}
          >
            <div className={`p-4 rounded-full bg-gradient-to-r ${tier.color}`}>
              <TierIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <motion.div
                className="text-5xl font-bold"
                animate={{ 
                  scale: [1, 1.1, 1],
                  color: ['#ffffff', '#fbbf24', '#ffffff']
                }}
                transition={{ duration: 1, repeat: 2 }}
              >
                {newLevel}
              </motion.div>
            </div>
          </motion.div>

          {/* Tier name */}
          <motion.p
            className={`text-xl font-semibold mb-6 bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {tier.name} Tier
          </motion.p>

          {/* Continue button */}
          <motion.button
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            onClick={onComplete}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Continue
          </motion.button>
        </motion.div>

        {/* Glow effect */}
        <motion.div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${tier.color} opacity-20 blur-xl`}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
    </motion.div>
  );
}

interface WinStreakAnimationProps {
  streakCount: number;
  show: boolean;
  onComplete?: () => void;
}

export function WinStreakAnimation({ streakCount, show, onComplete }: WinStreakAnimationProps) {
  if (!show || streakCount < 3) return null;

  const getStreakMessage = (streak: number) => {
    if (streak >= 10) return { text: "LEGENDARY!", color: "from-red-500 to-yellow-500" };
    if (streak >= 7) return { text: "DOMINATING!", color: "from-purple-500 to-pink-500" };
    if (streak >= 5) return { text: "ON FIRE!", color: "from-orange-500 to-red-500" };
    return { text: "HOT STREAK!", color: "from-blue-500 to-cyan-500" };
  };

  const streak = getStreakMessage(streakCount);

  return (
    <motion.div
      className="fixed top-4 right-4 z-40"
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: "spring", damping: 20 }}
    >
      <motion.div
        className={`bg-gradient-to-r ${streak.color} p-4 rounded-lg shadow-2xl border border-white/20 backdrop-blur-sm`}
        animate={{
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 10px 25px rgba(0,0,0,0.3)',
            '0 15px 35px rgba(0,0,0,0.4)',
            '0 10px 25px rgba(0,0,0,0.3)'
          ]
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="flex items-center space-x-3 text-white">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="w-6 h-6" />
          </motion.div>
          <div>
            <motion.p
              className="font-bold text-lg"
              animate={{ 
                textShadow: [
                  '0 0 5px rgba(255,255,255,0.5)',
                  '0 0 10px rgba(255,255,255,0.8)',
                  '0 0 5px rgba(255,255,255,0.5)'
                ]
              }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {streak.text}
            </motion.p>
            <p className="text-sm opacity-90">{streakCount} Win Streak</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface SeasonEndAnimationProps {
  finalLevel: number;
  finalRank: number;
  newSeasonNumber: number;
  show: boolean;
  onComplete?: () => void;
}

export function SeasonEndAnimation({ 
  finalLevel, 
  finalRank, 
  newSeasonNumber, 
  show, 
  onComplete 
}: SeasonEndAnimationProps) {
  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 rounded-2xl p-8 text-center text-white shadow-2xl border border-blue-500/30 max-w-lg mx-4"
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {/* Confetti effect */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['#fbbf24', '#3b82f6', '#8b5cf6', '#ef4444', '#10b981'][i % 5],
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                x: [0, Math.random() * 40 - 20, 0],
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3,
                delay: Math.random() * 2,
                repeat: Infinity,
                repeatDelay: Math.random() * 2
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold mb-2 text-yellow-400">Season Complete!</h1>
          <p className="text-gray-300 mb-6">Dash {newSeasonNumber - 1} has ended</p>

          <div className="bg-black/30 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">Your Final Results</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">Final Level</p>
                <p className="text-2xl font-bold text-purple-400">{finalLevel}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400">Final Rank</p>
                <p className="text-2xl font-bold text-yellow-400">#{finalRank}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 mb-6 border border-blue-500/30">
            <Crown className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <p className="text-lg font-semibold text-blue-300">Welcome to Dash {newSeasonNumber}!</p>
            <p className="text-sm text-gray-400">Your journey begins anew</p>
          </div>

          <motion.button
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            onClick={onComplete}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Enter New Season
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
