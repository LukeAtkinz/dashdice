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

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  isVitalRushActive?: boolean; // NEW: Vital Rush ability active state
}

export const SlotMachineDice: React.FC<SlotMachineDiceProps> = ({ 
  diceNumber, 
  animationState, 
  matchRollPhase, 
  actualValue,
  isGameRolling,
  isTurnDecider = false,
  matchData,
  isTopDice = true, // Default to top dice
  isVitalRushActive = false // Default to inactive
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

  // 🍀 Luck Turner ability state management
  const [luckTurnerVideoPlaying, setLuckTurnerVideoPlaying] = useState(false);
  const [luckTurnerVideoEnded, setLuckTurnerVideoEnded] = useState(false);
  const [luckTurnerFreezeFrame, setLuckTurnerFreezeFrame] = useState(false);
  const [luckTurnerWhiteBackground, setLuckTurnerWhiteBackground] = useState(false);
  const [luckTurnerHasPlayed, setLuckTurnerHasPlayed] = useState(false);
  
  // Check if Luck Turner ability is active for any player
  const isLuckTurnerActive = useMemo(() => {
    if (!matchData?.gameData?.activeEffects) {
      return false;
    }
    
    // Check all players' active effects for luck_turner
    for (const playerId in matchData.gameData.activeEffects) {
      const effects = matchData.gameData.activeEffects[playerId];
      if (effects && Array.isArray(effects)) {
        const hasLuckTurner = effects.some(effect => {
          return effect.abilityId === 'luck_turner' || effect.effectId?.includes('luck_turner');
        });
        if (hasLuckTurner) {
          return true;
        }
      }
    }
    
    return false;
  }, [matchData?.gameData?.activeEffects]);
  
  // Handle Luck Turner activation and video playback sequence
  useEffect(() => {
    if (isLuckTurnerActive && !luckTurnerHasPlayed) {
      console.log('🍀 Luck Turner activated - starting video sequence');
      setLuckTurnerVideoPlaying(true);
      setLuckTurnerHasPlayed(true);
    }
  }, [isLuckTurnerActive, luckTurnerHasPlayed]);
  
  // Handle video end sequence: freeze frame → white background
  useEffect(() => {
    if (luckTurnerVideoEnded && !luckTurnerFreezeFrame) {
      console.log('🍀 Luck Turner video ended - starting freeze frame (0.2s)');
      setLuckTurnerFreezeFrame(true);
      
      // After 0.2s freeze, wait 0.1s then show white background
      setTimeout(() => {
        console.log('🍀 Freeze frame complete - transitioning to white background');
        setLuckTurnerVideoPlaying(false); // Hide video
        
        setTimeout(() => {
          console.log('🍀 Showing white background');
          setLuckTurnerWhiteBackground(true);
        }, 100); // 0.1s delay
      }, 200); // 0.2s freeze
    }
  }, [luckTurnerVideoEnded, luckTurnerFreezeFrame]);
  
  // Clean up Luck Turner effect after ability expires (1 roll)
  useEffect(() => {
    if (!isLuckTurnerActive && luckTurnerHasPlayed) {
      console.log('🍀 Luck Turner expired - resetting to normal state');
      setLuckTurnerVideoPlaying(false);
      setLuckTurnerVideoEnded(false);
      setLuckTurnerFreezeFrame(false);
      setLuckTurnerWhiteBackground(false);
      setLuckTurnerHasPlayed(false);
    }
  }, [isLuckTurnerActive, luckTurnerHasPlayed]);

  // 🍳 Check if Pan Slap ability is active for any player
  const [isPanSlapActive, setIsPanSlapActive] = useState(false);
  const [showRedDice, setShowRedDice] = useState(false);
  const [panSlapPulsing, setPanSlapPulsing] = useState(false);
  const panSlapVideoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (!matchData?.gameData?.activeEffects) {
      return;
    }
    
    // Check all players' active effects for pan_slap
    let panSlapFound = false;
    for (const playerId in matchData.gameData.activeEffects) {
      const effects = matchData.gameData.activeEffects[playerId];
      if (effects && Array.isArray(effects)) {
        const hasPanSlap = effects.some(effect => 
          effect.abilityId === 'pan_slap' || effect.effectId?.includes('pan_slap')
        );
        if (hasPanSlap) {
          panSlapFound = true;
          console.log('🍳 PAN SLAP IS ACTIVE! Triggering video playback');
          break;
        }
      }
    }
    
    if (panSlapFound && !isPanSlapActive) {
      // Pan Slap just activated - immediately play video
      setIsPanSlapActive(true);
      setShowRedDice(true);
      
      // Trigger video playback when activated (with mobile safeguards)
      setTimeout(() => {
        if (panSlapVideoRef.current && panSlapVideoRef.current.readyState >= 2) {
          console.log('🍳 Playing Pan Slap video via ref');
          panSlapVideoRef.current.currentTime = 0;
          panSlapVideoRef.current.muted = true;
          panSlapVideoRef.current.play().catch((err) => {
            console.error('🍳 Pan Slap video play failed:', err);
            // Fallback: just show red dice without video
            setIsPanSlapActive(false);
            setShowRedDice(true);
            setPanSlapPulsing(true);
          });
        }
      }, 100);
    } else if (!panSlapFound && isPanSlapActive) {
      // Pan Slap deactivated - reset states
      setIsPanSlapActive(false);
      setShowRedDice(false);
      setPanSlapPulsing(false);
      if (panSlapVideoRef.current) {
        try {
          panSlapVideoRef.current.pause();
          panSlapVideoRef.current.currentTime = 0;
        } catch (err) {
          console.error('🍳 Pan Slap video cleanup error:', err);
        }
      }
    }
  }, [matchData?.gameData?.activeEffects, isPanSlapActive]);

  // Determine if this dice number should glow and what color
  const getDiceNumberGlow = () => {
    // Turn decider dice never glow
    if (isTurnDecider) {
      return { shouldGlow: false, color: '', intensity: '' };
    }
    
    // 🍳 Pan Slap override: ALWAYS show red glow on both dice when Pan Slap is active
    if (isPanSlapActive || showRedDice) {
      return { 
        shouldGlow: true, 
        color: '#FF0000', 
        intensity: '0 0 15px rgba(255, 0, 0, 0.8), 0 0 30px rgba(255, 0, 0, 0.6), 0 0 45px rgba(255, 0, 0, 0.4)' 
      };
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
    // EXCEPT double 6s in quickfire/classic which should glow red
    if (dice1Value && dice2Value && dice1Value === dice2Value && !isRolling) {
      // Double 6s in quickfire/classic = RED glow (you're out!)
      if (dice1Value === 6 && (gameMode === 'quickfire' || gameMode === 'classic')) {
        return { 
          shouldGlow: true, 
          color: '#FF0000', 
          intensity: '0 0 12px rgba(255, 0, 0, 0.8), 0 0 24px rgba(255, 0, 0, 0.6), 0 0 36px rgba(255, 0, 0, 0.4)' 
        };
      }
      // All other doubles = GOLD glow
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
          } else {
            // ALL MODES: Single 1 means you're out - both dice glow red
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
        } else {
          // ALL MODES: Single 1 means you're out - both dice glow red
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
  
  // Check multiplier type and apply appropriate styling
  const hasDoubleMultiplier = matchData?.gameData?.hasDoubleMultiplier || false;
  const hasTripleMultiplier = matchData?.gameData?.hasTripleMultiplier || false;
  const hasQuadMultiplier = matchData?.gameData?.hasQuadMultiplier || false;
  
  // Determine dice number color based on multiplier (white for x2/x3, black for x4)
  const getDiceNumberColor = () => {
    // 🍀 Luck Turner white background shows BLACK dice
    if (luckTurnerWhiteBackground) return '#000000';
    // 💨 Vital Rush turns dice BLACK (per user request)
    if (isVitalRushActive) return '#000000';
    // 🍳 Pan Slap turns dice RED
    if (showRedDice) return '#FF0000'; // Bright red for Pan Slap
    if (hasQuadMultiplier) return '#000000'; // Black for x4
    if (hasTripleMultiplier || hasDoubleMultiplier) return '#FFFFFF'; // White for x2 and x3
    return isTurnDecider ? '#FFD700' : '#000000'; // Default colors
  };
  
  // Determine border and background based on multiplier type
  let borderStyle = '';
  let backgroundStyle = '';
  
  if (luckTurnerWhiteBackground) {
    // 🍀 Luck Turner - White Background
    borderStyle = 'border-white/90';
    backgroundStyle = 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95))';
  } else if (isVitalRushActive) {
    // 💨 Vital Rush - Light Blue Themed
    borderStyle = 'border-blue-400/70';
    backgroundStyle = 'linear-gradient(to bottom right, rgba(173, 216, 230, 0.7), rgba(135, 206, 250, 0.7))';
  } else if (hasQuadMultiplier) {
    // x4 Multiplier - White Themed
    borderStyle = 'border-white/70';
    backgroundStyle = 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.7), rgba(174, 238, 238, 0.7))';
  } else if (hasTripleMultiplier) {
    // x3 Multiplier - Red Themed
    borderStyle = 'border-red-500/70';
    backgroundStyle = 'linear-gradient(to bottom right, rgba(255, 0, 0, 0.7), rgba(255, 69, 0, 0.7))';
  } else if (hasDoubleMultiplier) {
    // x2 Multiplier - Purple Themed
    borderStyle = 'border-purple-500/70';
    backgroundStyle = 'linear-gradient(to bottom right, rgba(155, 48, 255, 0.7), rgba(255, 51, 255, 0.7))';
  } else {
    borderStyle = 'border-white/0';
    backgroundStyle = '';
  }
  
  const hasAnyMultiplier = hasDoubleMultiplier || hasTripleMultiplier || hasQuadMultiplier;
  
  return (
    <div className={`relative rounded-[30px] overflow-hidden ${isTurnDecider ? '' : `border ${borderStyle}`}`}
         style={{
           display: 'flex',
           height: isTurnDecider ? 'clamp(150px, 35vw, 300px)' : 'clamp(120px, 25vw, 180px)', // Smaller for match dice on desktop
           width: '100%',
           padding: isTurnDecider ? '0 clamp(50px, 18vw, 110px)' : '0 clamp(40px, 15vw, 80px)',
           flexDirection: 'row',
           justifyContent: 'space-between',
           alignItems: 'center',
           alignSelf: 'stretch',
           backdropFilter: isTurnDecider ? 'none' : 'blur(5px)',
           background: isTurnDecider ? 'transparent' : (backgroundStyle || undefined)
         }}>
      {shouldShowAnimation ? (
        // Conditional reel animation: VERTICAL for turn decider, HORIZONTAL for match
        <div className="absolute inset-0 overflow-hidden">
          {isTurnDecider ? (
            // 🎰 TURN DECIDER: Vertical spinning reel - casino style
            <>
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center"
                animate={{
                  y: [-1400, 0, -1400],
                }}
                transition={{
                  duration: getAnimationSpeed(),
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                {createReelNumbers().map((num, index) => (
                  <div
                    key={`reel-${index}`}
                    className="w-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: index % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent',
                      color: '#FFD700',
                      fontFamily: 'Orbitron, monospace',
                      fontSize: isTurnDecider ? 'clamp(60px, 15vw, 140px)' : 'clamp(50px, 12vw, 100px)', // Even smaller for match dice on desktop
                      opacity: 0.6,
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '1',
                      textTransform: 'uppercase',
                      textShadow: '0 0 15px rgba(255, 215, 0, 0.6)',
                      WebkitFontSmoothing: 'antialiased'
                    }}
                  >
                    {num}
                  </div>
                ))}
              </motion.div>
              
              {/* Main spinning number - NO scale/rotate, pure vertical scroll */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span style={{
                  color: getDiceNumberColor(),
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 'clamp(160px, 24vw, 300px)',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '1',
                  textTransform: 'uppercase',
                  textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)',
                  WebkitFontSmoothing: 'antialiased'
                }}>
                  {animationState.currentNumber}
                </span>
              </div>
              
              {/* Vertical glow effect */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-b from-yellow-300/40 via-transparent to-yellow-300/40"
                animate={{
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{
                  duration: 0.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </>
          ) : (
            // 🎰 MATCH GAMEPLAY: Horizontal spinning reel - original style
            <>
              <motion.div
                className="absolute inset-0 flex flex-row items-center"
                animate={{
                  x: [-600, 0, -600],
                }}
                transition={{
                  duration: getAnimationSpeed(),
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
                      color: '#000',
                      fontFamily: 'Orbitron, monospace',
                      fontSize: isTurnDecider ? 'clamp(80px, 18vw, 200px)' : 'clamp(60px, 14vw, 150px)',
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '42px',
                      textTransform: 'uppercase',
                      WebkitFontSmoothing: 'antialiased'
                    }}
                  >
                    {num}
                  </div>
                ))}
              </motion.div>
              
              {/* Main spinning number with micro-animations */}
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
                  color: getDiceNumberColor(),
                  fontFamily: 'Orbitron, monospace',
                  fontSize: isTurnDecider ? 'clamp(120px, 18vw, 200px)' : 'clamp(90px, 15vw, 150px)',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '42px',
                  textTransform: 'uppercase',
                  WebkitFontSmoothing: 'antialiased'
                }}>
                  {animationState.currentNumber}
                </span>
              </motion.div>
              
              {/* Horizontal glow effect - Disabled for turn decider */}
              {!isTurnDecider && (
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
              )}
            </>
          )}

          {/* Multiplier active glow effect during spin */}
          {hasAnyMultiplier && (
            <motion.div 
              className="absolute inset-0"
              style={{
                background: hasQuadMultiplier 
                  ? 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.3), rgba(174, 238, 238, 0.2))'
                  : hasTripleMultiplier
                  ? 'linear-gradient(to bottom right, rgba(255, 0, 0, 0.3), rgba(255, 69, 0, 0.2))'
                  : 'linear-gradient(to bottom right, rgba(155, 48, 255, 0.3), rgba(255, 51, 255, 0.2))'
              }}
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
          {hasAnyMultiplier && (
            <motion.div 
              className="absolute inset-0 rounded-[30px]"
              style={{
                background: hasQuadMultiplier 
                  ? 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.25), rgba(174, 238, 238, 0.15))'
                  : hasTripleMultiplier
                  ? 'linear-gradient(to bottom right, rgba(255, 0, 0, 0.25), rgba(255, 69, 0, 0.15))'
                  : 'linear-gradient(to bottom right, rgba(155, 48, 255, 0.25), rgba(255, 51, 255, 0.15))'
              }}
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
                fontSize: isTurnDecider ? 'clamp(120px, 18vw, 200px)' : 'clamp(90px, 15vw, 150px)', // Smaller for match dice
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
            <motion.span 
              style={{
                color: getDiceNumberColor(),
                fontFamily: 'Orbitron, monospace',
                fontSize: isTurnDecider ? 'clamp(120px, 18vw, 200px)' : 'clamp(90px, 15vw, 150px)', // Smaller for match dice
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '42px',
                textTransform: 'uppercase'
              }} 
              className="relative z-10"
              animate={panSlapPulsing ? {
                scale: [1, 1.1, 1],
                textShadow: [
                  '0 0 0px rgba(255, 0, 0, 0)',
                  '0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.4)',
                  '0 0 0px rgba(255, 0, 0, 0)'
                ]
              } : {}}
              transition={panSlapPulsing ? {
                duration: 0.8,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
            >
              {displayValue}
            </motion.span>
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
      {luckTurnerVideoPlaying && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <video
            src="/Abilities/Animations/Luck Turner/Luck Turner Animation.webm"
            autoPlay
            loop={false}
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            className="w-full h-full object-cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: isTopDice ? 'none' : 'scaleY(-1)',
              borderRadius: '30px',
              overflow: 'hidden',
              willChange: 'auto'
            }}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              video.muted = true;
              if (video.paused && video.readyState >= 2) {
                video.play().catch((err) => {
                  console.error('🍀 Luck Turner autoplay failed:', err);
                  setLuckTurnerVideoEnded(true);
                });
              }
            }}
            onEnded={() => {
              console.log('🍀 Luck Turner video playback ended');
              setLuckTurnerVideoEnded(true);
            }}
            onError={(e) => {
              console.error('🍀 Luck Turner video error:', e);
              // Fallback: skip to freeze frame immediately
              setLuckTurnerVideoEnded(true);
            }}
          />
        </motion.div>
      )}
      
      {/* 🍳 PAN SLAP ABILITY ANIMATION 🍳 */}
      {isPanSlapActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <video
            ref={panSlapVideoRef}
            src="/Abilities/Animations/Pan Slap/Pan Slap.webm"
            loop={false}
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            className="w-full h-full"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '30px',
              overflow: 'hidden',
              willChange: 'auto'
            }}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              video.muted = true;
            }}
            onEnded={() => {
              console.log('🍳 Pan Slap video finished - starting dice pulse animation');
              setIsPanSlapActive(false);
              setPanSlapPulsing(true);
            }}
            onError={(e) => {
              console.error('🍳 Pan Slap video failed to load:', e);
              // Fallback: skip video, go straight to red dice
              setIsPanSlapActive(false);
              setShowRedDice(true);
              setPanSlapPulsing(true);
            }}
          />
        </motion.div>
      )}
    </div>
  );
};
