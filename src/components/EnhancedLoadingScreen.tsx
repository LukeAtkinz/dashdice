/**
 * Enhanced Loading Screen with Preloader
 * Shows progress while preloading all app resources during splash
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppPreloaderService, { PreloadProgress } from '@/services/appPreloader';

interface EnhancedLoadingScreenProps {
  onLoadingComplete: () => void;
  skipPreload?: boolean;
}

const EnhancedLoadingScreen: React.FC<EnhancedLoadingScreenProps> = ({
  onLoadingComplete,
  skipPreload = false
}) => {
  const [progress, setProgress] = useState<PreloadProgress>({
    step: 'Initializing...',
    progress: 0,
    total: 8,
    current: 0
  });
  const [isComplete, setIsComplete] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    const startPreloading = async () => {
      // Show progress after a brief delay
      setTimeout(() => setShowProgress(true), 800);

      try {
        if (skipPreload || AppPreloaderService.isRecentlyPreloaded()) {
          // Skip preloading if recently done
          setProgress({
            step: 'Ready!',
            progress: 100,
            total: 8,
            current: 8
          });
          setTimeout(() => {
            setIsComplete(true);
            setTimeout(onLoadingComplete, 500);
          }, 1000);
          return;
        }

        const preloader = AppPreloaderService.getInstance();
        await preloader.preloadApp((progressData) => {
          setProgress(progressData);
        });

        // Mark as complete
        setIsComplete(true);
        setTimeout(onLoadingComplete, 800);

      } catch (error) {
        console.error('Preloading failed:', error);
        // Still complete the loading even if preloading fails
        setIsComplete(true);
        setTimeout(onLoadingComplete, 500);
      }
    };

    startPreloading();
  }, [onLoadingComplete, skipPreload]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
      >
        {/* Background Video/Animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black opacity-80" />
        
        {/* Animated Crown Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-10 mb-8"
        >
          <motion.img
            src="/images/CrownLogo.png"
            alt="DashDice"
            className="w-24 h-24 md:w-32 md:h-32"
            animate={{ 
              rotate: isComplete ? 360 : 0,
              scale: isComplete ? 1.1 : 1
            }}
            transition={{ 
              rotate: { duration: 1, ease: "easeInOut" },
              scale: { duration: 0.5, ease: "easeInOut" }
            }}
          />
        </motion.div>

        {/* App Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-4xl md:text-6xl font-bold text-white mb-4 font-audiowide"
        >
          DASHDICE
        </motion.h1>

        {/* Loading Progress */}
        <AnimatePresence>
          {showProgress && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md px-8"
            >
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <motion.span
                    key={progress.step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm text-gray-300 font-montserrat"
                  >
                    {progress.step}
                  </motion.span>
                  <span className="text-sm text-gray-400 font-montserrat">
                    {progress.current}/{progress.total}
                  </span>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    style={{ width: `${progress.progress}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>

                <div className="text-center mt-2">
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-xs text-gray-400 font-montserrat"
                  >
                    {progress.progress}% Complete
                  </motion.span>
                </div>
              </div>

              {/* Completion Animation */}
              {isComplete && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 180, 360]
                    }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="inline-block text-green-400 text-2xl mb-2"
                  >
                    ✓
                  </motion.div>
                  <p className="text-green-400 font-montserrat font-semibold">
                    Ready to Play!
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Dots Animation */}
        {!isComplete && (
          <motion.div
            className="flex space-x-1 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-white rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Subtle Particle Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-20, -100],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedLoadingScreen;
