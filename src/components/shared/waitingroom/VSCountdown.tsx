import React from 'react';
import { motion } from 'framer-motion';

interface VSCountdownProps {
  countdown: number | null;
  isStarting?: boolean;
  isMobile?: boolean;
  enableMorphTransition?: boolean; // New prop to enable morph animation
}

const VSCountdown: React.FC<VSCountdownProps> = ({ 
  countdown, 
  isStarting = false, 
  isMobile = false,
  enableMorphTransition = false
}) => {
  const isGo = countdown === 0;
  
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '20px' : '40px',
        order: isMobile ? 1 : 0
      }}
    >
      {countdown !== null ? (
        // Use Framer Motion for morphing transition when enabled
        enableMorphTransition ? (
          <motion.div
            layoutId="vs-morph-text" // This creates the morphing connection
            style={{
              color: isGo ? '#00FF80' : '#E2E2E2',
              textAlign: 'center',
              fontFamily: 'Audiowide',
              fontSize: isMobile ? (isGo ? '48px' : '40px') : (isGo ? '72px' : '64px'),
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: isMobile ? (isGo ? '52px' : '44px') : (isGo ? '80px' : '72px'),
              textTransform: 'uppercase',
              textShadow: isGo 
                ? '0 0 20px rgba(0, 255, 0, 0.8), 0 0 40px rgba(0, 255, 0, 0.4)' 
                : '0 0 15px rgba(255, 255, 255, 0.4)',
              animation: isGo ? 'goGlow 1s ease-in-out' : 'subtleGlow 1.5s infinite'
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.8
            }}
          >
            {isGo ? 'GO!' : countdown}
          </motion.div>
        ) : (
          // Original static version
          <div
            style={{
              color: isGo ? '#00FF80' : '#E2E2E2',
              textAlign: 'center',
              fontFamily: 'Audiowide',
              fontSize: isMobile ? (isGo ? '48px' : '40px') : (isGo ? '72px' : '64px'),
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: isMobile ? (isGo ? '52px' : '44px') : (isGo ? '80px' : '72px'),
              textTransform: 'uppercase',
              textShadow: isGo 
                ? '0 0 20px rgba(0, 255, 0, 0.8), 0 0 40px rgba(0, 255, 0, 0.4)' 
                : '0 0 15px rgba(255, 255, 255, 0.4)',
              animation: isGo ? 'goGlow 1s ease-in-out' : 'subtleGlow 1.5s infinite'
            }}
          >
            {isGo ? 'GO!' : countdown}
          </div>
        )
      ) : (
        // VS display - also with morph capability
        enableMorphTransition ? (
          <motion.div
            layoutId="vs-morph-text" // Same layoutId for morphing
            style={{
              color: '#E2E2E2',
              fontFamily: 'Audiowide',
              fontSize: isMobile ? '32px' : '48px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: isMobile ? '36px' : '56px',
              textTransform: 'uppercase'
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.8
            }}
          >
            VS
          </motion.div>
        ) : (
          <div
            style={{
              color: '#E2E2E2',
              fontFamily: 'Audiowide',
              fontSize: isMobile ? '32px' : '48px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: isMobile ? '36px' : '56px',
              textTransform: 'uppercase'
            }}
          >
            VS
          </div>
        )
      )}
    </div>
  );
};

export default VSCountdown;