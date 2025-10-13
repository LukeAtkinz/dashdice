'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MatchTransitionProps {
  hostData: any;
  opponentData: any;
  gameMode: string;
  onTransitionComplete: () => void;
  isVisible: boolean;
}

export const MatchTransition: React.FC<MatchTransitionProps> = ({
  hostData,
  opponentData,
  gameMode,
  onTransitionComplete,
  isVisible
}) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const stageTimings = [
      500,  // Stage 0: Initial setup
      1200, // Stage 1: Player cards animate in
      800,  // Stage 2: Game mode display
      800,  // Stage 3: Controls animate in
      600,  // Stage 4: Dice containers grow
      800   // Stage 5: Final flash and transition
    ];

    const timers: NodeJS.Timeout[] = [];
    let totalTime = 0;

    stageTimings.forEach((duration, index) => {
      totalTime += duration;
      timers.push(setTimeout(() => {
        console.log(`🎬 Transition Stage ${index + 1} starting`);
        setCurrentStage(index + 1);
        if (index === stageTimings.length - 1) {
          // Complete transition after final stage
          console.log('🎬 Transition completing...');
          setTimeout(() => {
            console.log('🎬 Transition complete! Calling onTransitionComplete');
            onTransitionComplete();
          }, 400);
        }
      }, totalTime));
    });

    return () => timers.forEach(clearTimeout);
  }, [isVisible, onTransitionComplete]);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-lg cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={() => {
        console.log('🎬 Transition clicked - skipping to completion');
        onTransitionComplete();
      }}
    >
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            initial={{ 
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              scale: 0
            }}
            animate={{ 
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              scale: [0, 1, 0],
              opacity: [0, 0.4, 0]
            }}
            transition={{
              duration: 2,
              repeat: currentStage < 5 ? Infinity : 0,
              delay: Math.random() * 1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full flex flex-col justify-center items-center p-4">
        {/* Stage 1: Player Cards Animation */}
        <AnimatePresence>
          {currentStage >= 1 && (
            <div className={`w-full max-w-4xl ${isMobile ? 'space-y-8' : 'flex justify-between items-center'}`}>
              {/* Host Player Card */}
              <motion.div
                initial={isMobile ? 
                  { y: -200, opacity: 0, scale: 0.8 } : 
                  { x: -300, opacity: 0, scale: 0.8, rotateY: 45 }
                }
                animate={{ 
                  y: 0, 
                  x: 0, 
                  opacity: 1, 
                  scale: 1, 
                  rotateY: 0 
                }}
                transition={{ 
                  duration: 0.8, 
                  ease: [0.175, 0.885, 0.32, 1.275],
                  type: "spring",
                  stiffness: 100
                }}
                className="bg-gradient-to-br from-green-600/40 to-emerald-600/40 backdrop-blur-lg rounded-3xl p-6 border border-green-400/50 shadow-2xl"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Audiowide' }}>
                      {hostData?.playerDisplayName?.[0] || 'H'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Audiowide' }}>
                    {hostData?.playerDisplayName || 'Host'}
                  </h3>
                  <div className="text-green-400 text-sm">
                    {hostData?.playerStats?.matchWins || 0} Wins
                  </div>
                </div>
              </motion.div>

              {/* VS Indicator (Desktop) */}
              {!isMobile && currentStage >= 2 && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
                  className="text-6xl font-bold text-white/80"
                  style={{ fontFamily: 'Audiowide' }}
                >
                  VS
                </motion.div>
              )}

              {/* Opponent Player Card */}
              <motion.div
                initial={isMobile ? 
                  { y: -200, opacity: 0, scale: 0.8 } : 
                  { x: 300, opacity: 0, scale: 0.8, rotateY: -45 }
                }
                animate={{ 
                  y: 0, 
                  x: 0, 
                  opacity: 1, 
                  scale: 1, 
                  rotateY: 0 
                }}
                transition={{ 
                  duration: 0.8, 
                  delay: 0.2,
                  ease: [0.175, 0.885, 0.32, 1.275],
                  type: "spring",
                  stiffness: 100
                }}
                className="bg-gradient-to-br from-orange-600/40 to-red-600/40 backdrop-blur-lg rounded-3xl p-6 border border-orange-400/50 shadow-2xl"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Audiowide' }}>
                      {opponentData?.playerDisplayName?.[0] || 'O'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Audiowide' }}>
                    {opponentData?.playerDisplayName || 'Opponent'}
                  </h3>
                  <div className="text-orange-400 text-sm">
                    {opponentData?.playerStats?.matchWins || 0} Wins
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* VS Indicator (Mobile) */}
        {isMobile && currentStage >= 2 && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, duration: 0.6, type: "spring" }}
            className="text-4xl font-bold text-white/80 my-6"
            style={{ fontFamily: 'Audiowide' }}
          >
            VS
          </motion.div>
        )}

        {/* Stage 2: Game Mode Display */}
        <AnimatePresence>
          {currentStage >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.8, type: "spring" }}
              className="mt-8 bg-gradient-to-r from-purple-600/30 to-blue-600/30 backdrop-blur-lg rounded-2xl px-8 py-4 border border-purple-400/50"
            >
              <div className="text-center">
                <div className="text-sm text-purple-300 mb-1">GAME MODE</div>
                <div className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: 'Audiowide' }}>
                  {gameMode?.toUpperCase() || 'QUICKFIRE'}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 3: Controls Animation (Mobile) */}
        {isMobile && (
          <AnimatePresence>
            {currentStage >= 3 && (
              <motion.div
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                className="fixed bottom-8 left-4 right-4"
              >
                <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-lg rounded-2xl p-4 border border-gray-600/50">
                  <div className="flex justify-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/30 rounded-xl border border-blue-400/50"></div>
                    <div className="w-12 h-12 bg-green-500/30 rounded-xl border border-green-400/50"></div>
                    <div className="w-12 h-12 bg-purple-500/30 rounded-xl border border-purple-400/50"></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Stage 4: Dice Containers Growth */}
        <AnimatePresence>
          {currentStage >= 4 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                delay: 1.0, 
                duration: 0.8, 
                type: "spring",
                stiffness: 150
              }}
              className="mt-8 flex gap-4"
            >
              {[1, 2].map((dice) => (
                <motion.div
                  key={dice}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    delay: 1.0 + (dice * 0.2), 
                    duration: 0.6,
                    type: "spring"
                  }}
                  className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl border-2 border-yellow-300/50 flex items-center justify-center shadow-lg"
                >
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 5: Final Flash and Ready Text */}
        <AnimatePresence>
          {currentStage >= 5 && (
            <>
              {/* Flash Effect */}
              <motion.div
                className="absolute inset-0 bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 0.4 }}
              />
              
              {/* Ready Text */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="text-6xl md:text-8xl font-bold text-white" style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 30px rgba(255,255,255,0.5)'
                }}>
                  READY!
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Skip indicator */}
        {currentStage < 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 2 }}
            className="absolute bottom-8 right-8 text-white/70 text-sm"
            style={{ fontFamily: 'Audiowide' }}
          >
            Click to skip →
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};