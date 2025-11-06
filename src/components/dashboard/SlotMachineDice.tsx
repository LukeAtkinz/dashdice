'use client';

/*
 * 🎰 SLOT MACHINE DICE COMPONENT
 * 
 * Implements 3-phase progressive deceleration animation:
 * - Phase 1: Fast spinning with background reel at 0.1s
 * - Phase 2: Deceleration with reel slowing from 0.1s to 0.5s  
 * - Phase 3: Final slow with reel at 0.5s to 2.0s
 * 
 * Features:
 * - Responsive background reel speed (synced with main animation)
 * - Micro-animations for spinning numbers (scale/rotate)
 * - Conditional glow effects for special dice combinations
 * - Static display when not animating
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchData } from '@/types/match';

interface SlotMachineDiceProps {
  diceNumber: 1 | 2 | 'turnDecider';
  animationState: {
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
    animationKey?: number;
  };
  matchRollPhase: string | undefined;
  actualValue: number | null;
  isGameRolling: boolean;
  isTurnDecider?: boolean;
  matchData?: MatchData;
  isTopDice?: boolean; // NEW: Identify if this is the top dice (for animation orientation)
}

export const SlotMachineDice: React.FC<SlotMachineDiceProps> = ({ 
  diceNumber, 
  animationState, 
  matchRollPhase, 
  actualValue,
  isGameRolling,
  isTurnDecider = false,
  matchData,
  isTopDice = true // Default to top dice
}) => {
  // For turn decider, handle animation logic differently with proper timing
  const isCurrentlyRolling = isTurnDecider ? 
    (matchRollPhase === 'turnDecider' && animationState.isSpinning) :
    (isGameRolling && 
      ((diceNumber === 1 && matchRollPhase === 'dice1') || 
       (diceNumber === 2 && matchRollPhase === 'dice2')));
  
  // Enhanced animation logic to prevent jumping for second dice
  const shouldShowAnimation = animationState.isSpinning && isCurrentlyRolling;
  
  // Turn decider should have faster animation
  const getAnimationSpeed = () => {
    if (isTurnDecider && shouldShowAnimation) {
      return animationState.reelSpeed || 0.1; // Faster for turn decider
    }
    return animationState.reelSpeed || 0.1;
  };
  
  // Enhanced display logic to prevent jumping during dice 2 rolling
  const getDisplayValue = () => {
    // If currently animating, always show animation number
    if (shouldShowAnimation) {
      return animationState.currentNumber;
    }
    
    // If this is dice 2 and it's in the "overshoot" phase, show the overshoot value
    if (diceNumber === 2 && animationState.finalNumber !== null && !animationState.isSpinning) {
      return animationState.currentNumber; // This handles the overshoot and tick-back phases
    }
    
    // If this is dice 1 and dice 2 is rolling, show dice 1's settled value
    if (diceNumber === 1 && isGameRolling && matchRollPhase === 'dice2') {
      return actualValue || animationState.finalNumber || 1;
    }
    
    // Normal settled state - show actual game value first, then animation final
    if (actualValue !== null && actualValue !== undefined && !isGameRolling) {
      return actualValue;
    }
    
    // Show animation final number if available
    if (animationState.finalNumber !== null) {
      return animationState.finalNumber;
    }
    
    return '?';
  };
  
  const displayValue = getDisplayValue();

  // Check if Luck Turner ability is active for any player
  const isLuckTurnerActive = React.useMemo(() => {
    if (!matchData?.gameData?.activeEffects) {
      console.log('🍀 Luck Turner check: No activeEffects in matchData');
      return false;
    }
    
    console.log('🍀 Luck Turner check: activeEffects =', matchData.gameData.activeEffects);
    
    // Check all players' active effects for luck_turner
    for (const playerId in matchData.gameData.activeEffects) {
      const effects = matchData.gameData.activeEffects[playerId];
      console.log(`🍀 Checking player ${playerId}:`, effects);
      if (effects && Array.isArray(effects)) {
        const hasLuckTurner = effects.some(effect => {
          const match = effect.abilityId === 'luck_turner' || effect.effectId?.includes('luck_turner');
          console.log(`🍀 Effect check:`, effect, 'Match:', match);
          return match;
        });
        if (hasLuckTurner) {
          console.log('✅ LUCK TURNER IS ACTIVE! Showing video overlay');
          return true;
        }
      }
    }
    console.log('❌ Luck Turner NOT active');
    return false;
  }, [matchData]);

  // Determine if this dice number should glow and what color
  const getDiceNumberGlow = () => {
    // Turn decider dice never glow
    if (isTurnDecider) {
      return { shouldGlow: false, color: '', intensity: '' };
    }
    
    const dice1Value = matchData?.gameData.diceOne;
    const dice2Value = matchData?.gameData.diceTwo;
    const isRolling = matchData?.gameData.isRolling;
    const rollPhase = matchData?.gameData.rollPhase;
    const gameMode = matchData?.gameMode;
    
    // Special handling for Zero Hour, True Grit, and Last Line modes
    const isSpecialMode = gameMode === 'zero-hour' || gameMode === 'true-grit' || gameMode === 'last-line';
    
    // 🌟 UNIVERSAL GOLD GLOW FOR ALL DOUBLES 🌟
    // Check for any double (1-1, 2-2, 3-3, 4-4, 5-5, 6-6) and make them all gold
    if (dice1Value && dice2Value && dice1Value === dice2Value && !isRolling) {
      return { 
        shouldGlow: true, 
        color: '#FFD700', 
        intensity: '0 0 10px rgba(255, 215, 0, 0.7), 0 0 20px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.3)' 
      };
    }

    // Don't glow 2, 3, 4, 5 individually (only as doubles above)
    if (displayValue === 2 || displayValue === 3 || displayValue === 4 || displayValue === 5) {
      return { shouldGlow: false, color: '', intensity: '' };
    }

    // First dice logic (keep existing special case logic for non-doubles)
    if (diceNumber === 1) {
      if (dice1Value === 1) {
        // First dice is 1
        if (isRolling && rollPhase === 'dice2') {
          // Second dice still rolling, keep 1 red
          return { 
            shouldGlow: true, 
            color: '#FF0000', 
            intensity: '0 0 8px rgba(255, 0, 0, 0.6), 0 0 16px rgba(255, 0, 0, 0.4)' 
          };
        } else if (!isRolling && dice2Value) {
          // Both dice settled
          if (dice2Value === 1) {
            // Snake eyes handled above in doubles section
            return { shouldGlow: false, color: '', intensity: '' };
          } else if (isSpecialMode) {
            // Zero Hour/True Grit: Single 1s don't glow in special modes
            return { shouldGlow: false, color: '', intensity: '' };
          } else {
            // Other modes: Second dice is not 1 - both glow red
            return { 
              shouldGlow: true, 
              color: '#FF0000', 
              intensity: '0 0 8px rgba(255, 0, 0, 0.6), 0 0 16px rgba(255, 0, 0, 0.4)' 
            };
          }
        }
      } else if (dice1Value === 6) {
        // First dice is 6
        if (isRolling && rollPhase === 'dice2') {
          // Second dice still rolling - no glow for 6s in special modes
          if (isSpecialMode) {
            // Zero Hour/True Grit/Last Line: No glow on 6s at all
            return { shouldGlow: false, color: '', intensity: '' };
          } else {
            // Other modes: keep 6 red while rolling
            return { 
              shouldGlow: true, 
              color: '#FF0000', 
              intensity: '0 0 8px rgba(255, 0, 0, 0.6), 0 0 16px rgba(255, 0, 0, 0.4)' 
            };
          }
        } else if (!isRolling && dice2Value) {
          // Both dice settled - no glow for 6s in special modes
          if (isSpecialMode) {
            // Zero Hour/True Grit/Last Line: No glow on 6s at all
            return { shouldGlow: false, color: '', intensity: '' };
          } else {
            if (dice2Value === 6) {
              // Double sixes handled above in doubles section
              return { shouldGlow: false, color: '', intensity: '' };
            } else {
              // Second dice is not 6 - remove glow
              return { shouldGlow: false, color: '', intensity: '' };
            }
          }
        }
      }
    }
    
    // Second dice logic (keep existing special case logic for non-doubles)
    if (diceNumber === 2) {
      if (dice1Value === 1 && dice2Value && !isRolling) {
        // First dice was 1, second dice settled
        if (dice2Value === 1) {
          // Snake eyes handled above in doubles section
          return { shouldGlow: false, color: '', intensity: '' };
        } else if (isSpecialMode) {
          // Zero Hour/True Grit: Single 1s don't glow in special modes
          return { shouldGlow: false, color: '', intensity: '' };
        } else {
          // Other modes: Second dice is not 1 - both glow red
          return { 
            shouldGlow: true, 
            color: '#FF0000', 
            intensity: '0 0 8px rgba(255, 0, 0, 0.6), 0 0 16px rgba(255, 0, 0, 0.4)' 
          };
        }
      } else if (dice1Value === 6 && dice2Value && !isRolling) {
        // First dice was 6, second dice settled
        if (dice2Value === 6) {
          // Double sixes handled above in doubles section
          return { shouldGlow: false, color: '', intensity: '' };
        }
        // If second dice is not 6, no glow (first dice glow also removed)
      }
    }
    
    return { shouldGlow: false, color: '', intensity: '' };
  };

  const glowInfo = getDiceNumberGlow();

  // Create multiple reel numbers for visual depth
  const createReelNumbers = () => {
    const numbers = [];
    for (let i = 0; i < 8; i++) {
      numbers.push(Math.floor(Math.random() * 6) + 1);
    }
    return numbers;
  };
  
  // Check if multiplier is active for border styling and background
  const hasMultiplier = matchData?.gameData?.hasDoubleMultiplier || false;
  const borderClass = hasMultiplier ? 'border-red-500/70' : 'border-white/0';
  const backgroundClass = hasMultiplier ? 'bg-gradient-to-br from-red-600/50 to-purple-600/50' : '';
  
  return (
    <div className={`relative rounded-[30px] border overflow-hidden ${borderClass} ${backgroundClass}`}
         style={{
           display: 'flex',
           height: 'clamp(150px, 35vw, 300px)', // Reduced from 50vw to 35vw for mobile
           width: '100%',
           padding: '0 clamp(50px, 18vw, 110px)',
           flexDirection: 'row',
           justifyContent: 'space-between',
           alignItems: 'center',
           alignSelf: 'stretch',
           backdropFilter: 'blur(5px)'
         }}>
      {shouldShowAnimation ? (
        // Slot machine reel effect
        <div className="absolute inset-0">
          {/* 🎰 Spinning reel background with progressive speed changes */}
          <motion.div
            className="absolute inset-0 flex flex-row items-center"
            animate={{
              x: [-600, 0, -600],
            }}
            transition={{
              duration: getAnimationSpeed(), // Use dynamic speed
              repeat: Infinity,
              ease: "linear"
            }}
          >
            {createReelNumbers().map((num, index) => (
              <div
                key={`reel-${index}`}
                className="h-full flex items-center justify-center opacity-30"
                style={{ 
                  minWidth: '100%',
                  backgroundColor: index % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'transparent',
                  color: isTurnDecider ? '#FFD700' : '#000',
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 'clamp(80px, 18vw, 200px)',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '42px',
                  textTransform: 'uppercase',
                  textShadow: isTurnDecider ? '0 0 15px rgba(255, 215, 0, 0.6)' : 'none',
                  WebkitFontSmoothing: 'antialiased'
                }}
              >
                {num}
              </div>
            ))}
          </motion.div>
          
          {/* 🎰 Main spinning number with micro-animations */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-10"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{
              duration: 0.15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <span style={{
              color: isTurnDecider ? '#FFD700' : '#000',
              fontFamily: 'Orbitron, monospace',
              fontSize: 'clamp(120px, 18vw, 200px)',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '42px',
              textTransform: 'uppercase',
              textShadow: isTurnDecider ? '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)' : 'none',
              WebkitFontSmoothing: 'antialiased'
            }}>
              {animationState.currentNumber}
            </span>
          </motion.div>
          
          {/* Slot machine glow effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-yellow-300/40 via-transparent to-yellow-300/40"
            animate={{
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
              duration: 0.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Multiplier active glow effect */}
          {hasMultiplier && (
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-red-400/30 via-purple-400/20 to-red-400/30"
              animate={{
                opacity: [0.4, 0.8, 0.4]
              }}
              transition={{
                duration: 1.0,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}

          {/* Slot machine window frame effect - REMOVED gold border */}
          {/* <div className="absolute inset-0 border-2 border-yellow-400/50 rounded-[30px] pointer-events-none" /> */}
        </div>
      ) : (
        // Static dice display - completely still when not rolling
        <div className="w-full h-full flex items-center justify-center relative">
          {/* Multiplier active background glow for static dice */}
          {hasMultiplier && (
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-red-400/25 via-purple-400/15 to-red-400/25 rounded-[30px]"
              animate={{
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
          
          {/* Dice number with conditional glow */}
          {glowInfo.shouldGlow ? (
            <motion.span
              style={{
                color: glowInfo.color,
                fontFamily: 'Orbitron, monospace',
                fontSize: 'clamp(120px, 18vw, 200px)', // Responsive font size for mobile
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '42px',
                textTransform: 'uppercase',
                textShadow: glowInfo.intensity
              }}
              className="relative z-10"
              animate={{
                textShadow: [
                  glowInfo.intensity,
                  `${glowInfo.intensity}, 0 0 20px ${glowInfo.color}40`,
                  glowInfo.intensity
                ]
              }}
              transition={{
                duration: 2.0,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {displayValue}
            </motion.span>
          ) : (
            <span style={{
              color: '#000',
              fontFamily: 'Orbitron, monospace',
              fontSize: 'clamp(120px, 18vw, 200px)', // Responsive font size for mobile
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '42px',
              textTransform: 'uppercase'
            }} className="relative z-10">
              {displayValue}
            </span>
          )}
        </div>
      )}
      
      {/* "Near miss" flash effect - More dramatic */}
      {animationState.finalNumber && displayValue !== animationState.finalNumber && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-orange-400/60 to-red-400/60 rounded-[30px]"
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ 
            opacity: [0, 1, 0.5, 0], 
            scale: [1.2, 1, 1, 0.95]
          }}
          transition={{ 
            duration: 0.4,
            ease: "easeOut"
          }}
        />
      )}

      {/* Winning number celebration effect */}
      {animationState.finalNumber && displayValue === 6 && (
        <motion.div
          className="absolute -inset-1 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-[35px]"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      {/* 🍀 LUCK TURNER ABILITY ANIMATION 🍀 */}
      {isLuckTurnerActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <video
            src="/Abilities/Animations/Luck Turner Animation.webm"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: isTopDice ? 'none' : 'scaleY(-1)', // Flip vertically for bottom dice
              borderRadius: '30px',
              overflow: 'hidden',
              // Hardware acceleration for better performance
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
            // 1.5x speed for snappier animation
            onLoadedData={(e) => {
              const video = e.target as HTMLVideoElement;
              video.playbackRate = 1.5;
            }}
          />
        </motion.div>
      )}
    </div>
  );
};
