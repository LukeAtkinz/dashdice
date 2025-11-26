import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchData } from '@/types/match';
import { SlotMachineDice } from './SlotMachineDice';
import { useBackground } from '@/context/BackgroundContext';
import { useAuth } from '@/context/AuthContext';
import InlineAbilitiesDisplay from '@/components/match/InlineAbilitiesDisplay';
import AuraCounter from '@/components/ui/AuraCounter';
import { MultiplierAnimation } from '@/components/ui/MultiplierAnimation';
import { SpriteSheetPlayer } from './SpriteSheetPlayer';

interface GameplayPhaseProps {
  matchData: MatchData;
  currentPlayer: any;
  opponent: any;
  isHost: boolean;
  dice1Animation: {
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
  };
  dice2Animation: {
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
  };
  onRollDice: () => void;
  onBankScore: () => void;
  onAbilityUsed?: (effect: any) => void;
}

export const GameplayPhase: React.FC<GameplayPhaseProps> = ({
  matchData,
  currentPlayer,
  opponent,
  isHost,
  dice1Animation,
  dice2Animation,
  onRollDice,
  onBankScore,
  onAbilityUsed
}) => {
  const { DisplayBackgroundEquip } = useBackground();
  const { user } = useAuth();
  const isMyTurn = currentPlayer.turnActive;
  const canRoll = isMyTurn && !matchData.gameData.isRolling;
  const canBank = isMyTurn && !matchData.gameData.isRolling && matchData.gameData.turnScore > 0;
  
  // Get current user's AURA from match data
  const currentUserAura = user ? (matchData.gameData.playerAura?.[user.uid] || 0) : 0;
  
  // Check if any multiplier is active
  const hasDoubleMultiplier = matchData.gameData.hasDoubleMultiplier || false;
  const hasTripleMultiplier = matchData.gameData.hasTripleMultiplier || false;
  const hasQuadMultiplier = matchData.gameData.hasQuadMultiplier || false;
  const hasMultiplier = hasDoubleMultiplier || hasTripleMultiplier || hasQuadMultiplier;
  
  // State for score shooting animation
  const [isScoreShooting, setIsScoreShooting] = useState(false);
  
  // State for Aura Forge selection mode and animations
  const [isAuraForgeActive, setIsAuraForgeActive] = useState(false);
  const [auraForgeCallback, setAuraForgeCallback] = useState<((amount: number) => void) | null>(null);
  const [showAuraForgeBottom, setShowAuraForgeBottom] = useState(false); // Stage 1: Bottom transition video
  const [showAuraForgeTurnScore, setShowAuraForgeTurnScore] = useState(false); // Stage 2: Turn score animation
  const [showAuraForgeAura, setShowAuraForgeAura] = useState(false); // Stage 2: Aura animation
  const [auraForgeAnimationKey, setAuraForgeAnimationKey] = useState(0); // For triggering video replays
  const [auraForgePulseCount, setAuraForgePulseCount] = useState(0); // Track current pulse
  const [auraForgeAmount, setAuraForgeAmount] = useState(0); // Selected amount
  const [turnScoreDisplay, setTurnScoreDisplay] = useState(0); // Animated turn score
  const [totalScoreDisplay, setTotalScoreDisplay] = useState(0); // Animated total score
  const [auraDisplay, setAuraDisplay] = useState(0); // Animated aura value
  
  // State for Vital Rush animation
  const [vitalRushActive, setVitalRushActive] = useState(false);
  const [showVitalRushInitial, setShowVitalRushInitial] = useState(false);
  const [showVitalRushTopDice, setShowVitalRushTopDice] = useState(false);
  const [showVitalRushBottomDice, setShowVitalRushBottomDice] = useState(false);
  
  // Wrapped ability handler to detect Aura Forge and Vital Rush activation
  const handleAbilityUsed = useCallback((effect: any) => {
    // Check if this is Aura Forge activation
    if (effect?.abilityId === 'aura_forge' || effect?.type === 'aura_forge_pending') {
      console.log('🔥 Aura Forge activated - Stage 1: showing bottom transition video');
      // Activate selection mode
      setIsAuraForgeActive(true);
      // Show Stage 1: Bottom transition video
      setShowAuraForgeBottom(true);
      // Store the callback for when user selects an amount
      if (effect.callback) {
        setAuraForgeCallback(() => effect.callback);
      }
    } 
    // Check if this is Vital Rush activation
    else if (effect?.abilityId === 'vital_rush' || effect?.ability?.id === 'vital_rush') {
      console.log('🎬 Vital Rush activated - starting animation sequence');
      setVitalRushActive(true);
      
      // Start initial animation immediately
      setShowVitalRushInitial(true);
      
      // Start top dice animation after 0.5s
      setTimeout(() => {
        setShowVitalRushTopDice(true);
      }, 500);
      
      // Start bottom dice animation after 0.8s
      setTimeout(() => {
        setShowVitalRushBottomDice(true);
      }, 800);
    }
    else {
      // Pass through to parent handler (including Hard Hat which is handled in Match.tsx)
      if (onAbilityUsed) {
        onAbilityUsed(effect);
      }
    }
  }, [onAbilityUsed]);
  
  // Handle Aura Forge amount selection and Stage 2 animations
  const handleAuraForgeSelect = useCallback(async (amount: number) => {
    console.log(`🔥 Aura Forge Stage 2: User selected ${amount} aura to convert`);
    
    // Store the selected amount
    setAuraForgeAmount(amount);
    
    // Initialize display values from current game state
    const activePlayer = currentPlayer.turnActive ? currentPlayer : opponent;
    const currentTurnScore = matchData.gameData.turnScore || 0;
    const currentTotalScore = matchData.gameMode === 'zero-hour' 
      ? (activePlayer.playerScore || 0) - currentTurnScore
      : (activePlayer.playerScore || 0) + currentTurnScore;
    const currentAura = currentUserAura || 0;
    
    setTurnScoreDisplay(currentTurnScore);
    setTotalScoreDisplay(currentTotalScore);
    setAuraDisplay(currentAura);
    
    // Hide bottom video and number selectors
    setShowAuraForgeBottom(false);
    setIsAuraForgeActive(false);
    
    // Start Stage 2: Turn Score and Aura animations
    console.log('🔥 Starting Stage 2 animations: Turn Score + Aura');
    setShowAuraForgeTurnScore(true);
    setShowAuraForgeAura(true);
    setAuraForgeAnimationKey(prev => prev + 1);
    setAuraForgePulseCount(0);
    
    // Determine timing based on amount
    const videoPlayCount = amount <= 2 ? 1 : 2;
    const pulsesInFirstSecond = Math.min(amount, 2);
    const pulsesInSecondSecond = amount > 2 ? amount - 2 : 0;
    
    // Execute pulses in first second
    for (let i = 0; i < pulsesInFirstSecond; i++) {
      setTimeout(() => {
        console.log(`🔥 Pulse ${i + 1}: -5 turn/total, +1 aura`);
        setTurnScoreDisplay(prev => prev - 5);
        setTotalScoreDisplay(prev => prev - 5);
        setAuraDisplay(prev => prev + 1);
        setAuraForgePulseCount(i + 1);
      }, (i * 500) + 100); // Space pulses 500ms apart, start 100ms in
    }
    
    // If amount is 3 or 4, play videos again and do additional pulses
    if (amount > 2) {
      setTimeout(() => {
        console.log('🔥 Playing second set of animations');
        setAuraForgeAnimationKey(prev => prev + 1); // Trigger video replay
        
        // Execute remaining pulses in second second
        for (let i = 0; i < pulsesInSecondSecond; i++) {
          setTimeout(() => {
            console.log(`🔥 Pulse ${pulsesInFirstSecond + i + 1}: -5 turn/total, +1 aura`);
            setTurnScoreDisplay(prev => prev - 5);
            setTotalScoreDisplay(prev => prev - 5);
            setAuraDisplay(prev => prev + 1);
            setAuraForgePulseCount(pulsesInFirstSecond + i + 1);
          }, (i * 500) + 100);
        }
      }, 1000); // Start second set after 1 second
    }
    
    // Clean up after animations complete
    const totalDuration = videoPlayCount * 1000;
    setTimeout(() => {
      console.log('🔥 Aura Forge animations complete, calling backend');
      setShowAuraForgeTurnScore(false);
      setShowAuraForgeAura(false);
      setAuraForgeAmount(0);
      setAuraForgePulseCount(0);
      
      // Execute the actual backend callback
      if (auraForgeCallback) {
        auraForgeCallback(amount);
      }
      setAuraForgeCallback(null);
    }, totalDuration + 200); // Extra 200ms buffer
    
  }, [auraForgeCallback, currentPlayer, opponent, matchData.gameData.turnScore, matchData.gameMode, currentUserAura]);

  // Cleanup Vital Rush animations when turn ends
  useEffect(() => {
    // Clear animations when turn score resets or turn changes
    if (matchData.gameData.turnScore === 0 || !isMyTurn) {
      if (vitalRushActive) {
        console.log('🎬 Clearing Vital Rush animations - turn ended');
        setVitalRushActive(false);
        setShowVitalRushInitial(false);
        setShowVitalRushTopDice(false);
        setShowVitalRushBottomDice(false);
      }
    }
  }, [matchData.gameData.turnScore, isMyTurn, vitalRushActive]);

  // Handle bank/save with animation
  const handleBankScore = () => {
    // Clear Vital Rush animations immediately when banking
    if (vitalRushActive) {
      console.log('🎬 Clearing Vital Rush animations - player banked');
      setVitalRushActive(false);
      setShowVitalRushInitial(false);
      setShowVitalRushTopDice(false);
      setShowVitalRushBottomDice(false);
    }
    if (!canBank) return;
    
    // Trigger shooting animation
    setIsScoreShooting(true);
    
    // Reset animation after completion
    setTimeout(() => {
      setIsScoreShooting(false);
    }, 600); // Animation duration
    
    // Call the original bank function
    onBankScore();
  };

  // Create button gradient style based on user's display background
  const getButtonGradientStyle = (baseColor: string) => {
    if (DisplayBackgroundEquip?.id) {
      return {
        background: `var(--ui-button-bg, linear-gradient(243deg, ${baseColor} 25.17%, rgba(153, 153, 153, 0.00) 109.89%))`,
        backdropFilter: 'blur(5px)',
        border: '2px solid rgba(255, 255, 255, 0.3)'
      };
    }
    return {
      background: `linear-gradient(243deg, ${baseColor} 25.17%, rgba(153, 153, 153, 0.00) 109.89%)`,
      backdropFilter: 'blur(5px)',
      border: '2px solid rgba(255, 255, 255, 0.3)'
    };
  };

  // Get nav-style button styling to match dashboard/rematch buttons
  const getNavButtonStyle = (buttonType: 'play' | 'save') => {
    const baseStyle = {
      fontFamily: "Audiowide",
      textTransform: "uppercase" as const,
      display: 'flex',
      width: '209px',
      height: '56px',
      padding: '4px 16px',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '10px',
      borderRadius: '18px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      backdropFilter: 'blur(6px)',
    };

    if (buttonType === 'play') {
      return {
        ...baseStyle,
        background: "linear-gradient(135deg, #3B82F6 0%, transparent 100%)", // Blue to transparent
        color: "#FFF",
        boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
      };
    } else {
      return {
        ...baseStyle,
        background: "linear-gradient(135deg, #22C55E 0%, transparent 100%)", // Green to transparent  
        color: "#FFF",
        boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)",
      };
    }
  };

  // Get mobile container gradient based on equipped background - FROM BOTTOM TO TRANSPARENT
  const getMobileContainerGradient = () => {
    if (DisplayBackgroundEquip?.name === 'On A Mission') {
      return 'linear-gradient(0deg, rgba(14, 165, 233, 0.8) 0%, rgba(14, 165, 233, 0.4) 50%, transparent 100%)';
    } else if (DisplayBackgroundEquip?.name === 'Long Road Ahead') {
      return 'linear-gradient(0deg, rgba(124, 58, 237, 0.8) 0%, rgba(76, 29, 149, 0.5) 30%, rgba(30, 27, 75, 0.3) 60%, transparent 100%)';
    } else if (DisplayBackgroundEquip?.name === 'New Day') {
      return 'linear-gradient(0deg, rgba(90, 117, 121, 0.8) 0%, rgba(90, 117, 121, 0.4) 50%, transparent 100%)';
    } else if (DisplayBackgroundEquip?.name === 'Relax') {
      return 'linear-gradient(0deg, rgba(64, 112, 128, 0.8) 0%, rgba(64, 112, 128, 0.4) 50%, transparent 100%)';
    } else if (DisplayBackgroundEquip?.name === 'Underwater') {
      return 'linear-gradient(0deg, rgba(0, 81, 140, 0.8) 0%, rgba(0, 81, 140, 0.4) 50%, transparent 100%)';
    }
    return 'linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.3) 50%, transparent 100%)';
  };

  // Get game rule result for display
  const getGameRuleResult = () => {
    const dice1 = matchData.gameData.diceOne;
    const dice2 = matchData.gameData.diceTwo;
    
    if (!dice1 || !dice2) return null;
    
    // Single 1
    if ((dice1 === 1 && dice2 !== 1) || (dice2 === 1 && dice1 !== 1)) {
      return { rule: 'SINGLE ONE', result: 'Turn over, no score added', color: 'text-red-400' };
    }
    // Double 6
    else if (dice1 === 6 && dice2 === 6) {
      return { rule: 'DOUBLE SIX', result: 'Player score reset to 0', color: 'text-red-500' };
    }
    // Snake Eyes
    else if (dice1 === 1 && dice2 === 1) {
      return { rule: 'SNAKE EYES', result: '+20 to turn score, continue playing', color: 'text-yellow-400' };
    }
    // Other Doubles (22, 33, 44, 55)
    else if (dice1 === dice2) {
      const sum = dice1 + dice2;
      const actualScore = hasMultiplier ? sum * 2 : sum;
      return { 
        rule: `DOUBLE ${dice1}s`, 
        result: `+${actualScore} to turn score, 2x MULTIPLIER ACTIVE!`, 
        color: 'text-purple-400' 
      };
    }
    // Normal scoring (with multiplier if active)
    else {
      const sum = dice1 + dice2;
      const actualScore = hasMultiplier ? sum * 2 : sum;
      const multiplierText = hasMultiplier ? ' (2x MULTIPLIER)' : '';
      return { 
        rule: 'NORMAL' + multiplierText, 
        result: `+${actualScore} to turn score`, 
        color: hasMultiplier ? 'text-blue-400' : 'text-green-400' 
      };
    }
  };

  const gameRuleResult = getGameRuleResult();

  return (
    <React.Fragment>
      <div className="flex flex-col items-center justify-center">
        {/* Game Status Box - Improved animations and turn display - HIDDEN ON DESKTOP */}
        <motion.div 
          className="mb-8 hidden"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div 
            className="inline-block px-4 md:px-8 py-3 md:py-4 border-2 border-white/30 rounded-2xl min-w-[250px] md:min-w-[300px]"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              backdropFilter: "blur(5px)"
            }}
          >
            <AnimatePresence mode="wait">
              {!isMyTurn ? (
                // Opponent's turn - clear messaging
                <motion.div 
                  key="opponent-turn"
                  className="text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  <p 
                    className="text-xl md:text-2xl font-bold text-red-400" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    {opponent.playerDisplayName}'S TURN
                  </p>
                  <p 
                    className="text-base md:text-lg text-gray-300 mt-1"
                    style={{ fontFamily: "Audiowide" }}
                  >
                    Waiting for their move...
                  </p>
                </motion.div>
              ) : matchData.gameData.isRolling ? (
                // Rolling state
                <motion.div 
                  key="rolling-state"
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <p 
                    className="text-xl md:text-2xl font-bold text-purple-400 animate-pulse" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    ROLLING DICE...
                  </p>
                  <p 
                    className="text-base md:text-lg text-gray-300 mt-1"
                    style={{ fontFamily: "Audiowide" }}
                  >
                    See what you got!
                  </p>
                </motion.div>
              ) : gameRuleResult && matchData.gameData.diceOne > 0 && matchData.gameData.diceTwo > 0 ? (
                // Show game rule result after roll
                <motion.div 
                  key="game-result"
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ duration: 0.5, ease: "backOut" }}
                >
                  <motion.p 
                    className={`text-lg md:text-xl font-bold ${gameRuleResult.color}`} 
                    style={{ fontFamily: "Audiowide" }}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    {gameRuleResult.rule}
                  </motion.p>
                  <motion.p 
                    className="text-base md:text-lg text-white mt-1"
                    style={{ fontFamily: "Audiowide" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    {gameRuleResult.result}
                  </motion.p>
                </motion.div>
              ) : (
                // Your turn - ready to roll
                <motion.div 
                  key="your-turn"
                  className="text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  <p 
                    className="text-lg md:text-xl font-bold text-green-400" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    YOUR TURN
                  </p>
                  <AnimatePresence mode="wait">
                    {matchData.gameData.hasDoubleMultiplier ? (
                      <motion.p 
                        key="multiplier-active"
                        className="text-base md:text-lg text-purple-400 mt-1"
                        style={{ fontFamily: "Audiowide" }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        🔥 2x MULTIPLIER ACTIVE! 🔥
                      </motion.p>
                    ) : (
                      <motion.p 
                        key="roll-instruction"
                        className="text-base md:text-lg text-gray-300 mt-1"
                        style={{ fontFamily: "Audiowide" }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        Roll the dice to play
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Dice Container with Turn Score Between - Constrained to 60vh */}
        <motion.div 
          className="relative flex flex-col gap-0 md:gap-3 mb-1 md:mb-3 justify-between px-4 md:px-0" 
          style={{
            height: '60vh', // Fixed height to fit in container
            maxHeight: '60vh',
            overflow: 'visible',
            justifyContent: 'center',
            gap: '60px',
            marginTop: '-40px' // Move dice container up on mobile
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.8, 
            ease: [0.4, 0, 0.2, 1],
            delay: 0.4
          }}
        >
          {/* Dice 1 - Enhanced Slot Machine */}
          <motion.div 
            className="w-full max-w-[600px] md:max-w-[600px] md:w-[600px]" 
            style={{ width: 'min(600px, 70vw)', position: 'relative', overflow: 'hidden', borderRadius: '20px' }}
          >
            <SlotMachineDice
              diceNumber={1}
              animationState={dice1Animation}
              matchRollPhase={matchData.gameData.rollPhase}
              actualValue={matchData.gameData.diceOne}
              isGameRolling={matchData.gameData.isRolling || false}
              matchData={matchData}
              isTopDice={true} // Top dice - normal orientation
              isVitalRushActive={vitalRushActive} // Vital Rush ability state
            />
            
            {/* Vital Rush Top Dice Animation Overlay - DISABLED FOR SPRITE SHEET TESTING */}
            {/* {showVitalRushTopDice && (
              <video
                key="vital-rush-top-dice"
                src="/Abilities/Animations/Vital Rush/Vital Rush Top Dice Container.webm"
                autoPlay
                loop
                muted
                playsInline
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              />
            )} */}
          </motion.div>
          
          {/* Turn Score - Positioned absolutely between dice - Mobile bigger and more padding */}
          <div 
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center relative"
            >
              {/* Turn Score Container - CENTER - ALWAYS CENTERED */}
              {(() => {
                const turnScore = matchData.gameData.turnScore || 0;
                const dice1 = matchData.gameData.diceOne;
                const dice2 = matchData.gameData.diceTwo;
                const isRolling = matchData.gameData.isRolling;
                
                // Check if dice are doubles (removed gold flash effect)
                const areDoublesGold = false; // Disabled gold glow effect
                
                // Determine color based on turn score - Updated color system with 70% opacity
                let textColor = 'text-white'; // Default white text
                let bgColor = 'rgba(125, 125, 125, 0.7)'; // Grey (<10)
                
                // Override all colors when multiplier is active with specific gradients
                if (hasQuadMultiplier) {
                  // x4 Multiplier - White Themed
                  textColor = 'text-black';
                  bgColor = 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.7), rgba(174, 238, 238, 0.7))';
                } else if (hasTripleMultiplier) {
                  // x3 Multiplier - Red Themed
                  textColor = 'text-white';
                  bgColor = 'linear-gradient(to bottom right, rgba(255, 0, 0, 0.7), rgba(255, 69, 0, 0.7))';
                } else if (hasDoubleMultiplier) {
                  // x2 Multiplier - Purple Themed
                  textColor = 'text-white';
                  bgColor = 'linear-gradient(to bottom right, rgba(155, 48, 255, 0.7), rgba(255, 51, 255, 0.7))';
                } else if (turnScore >= 50) {
                  textColor = 'text-black'; // Gold (50+) - Black text
                  bgColor = 'rgba(255, 215, 0, 0.7)';
                } else if (turnScore >= 40) {
                  textColor = 'text-black'; // White (40-50) - Black text
                  bgColor = 'rgba(255, 255, 255, 0.7)';
                } else if (turnScore >= 30) {
                  textColor = 'text-white'; // Red (30-40)
                  bgColor = 'rgba(220, 20, 60, 0.7)';
                } else if (turnScore >= 20) {
                  textColor = 'text-white'; // Purple (20-30)
                  bgColor = 'rgba(138, 43, 226, 0.7)';
                } else if (turnScore >= 10) {
                  textColor = 'text-white'; // Blue (10-20)
                  bgColor = 'rgba(0, 174, 239, 0.7)';
                }
                
                return (
                  <motion.div 
                    className="inline-block px-4 md:px-8 py-3 md:py-4 border-2 border-gray-500 rounded-2xl backdrop-blur-sm shadow-xl overflow-hidden"
                    style={{
                      background: hasMultiplier && bgColor.startsWith('linear') ? bgColor : undefined,
                      backgroundColor: !hasMultiplier || !bgColor.startsWith('linear') ? bgColor : undefined
                    }}
                    animate={areDoublesGold ? {
                      boxShadow: [
                        '0 0 10px rgba(255, 215, 0, 0.7), 0 0 20px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.3)',
                        '0 0 15px rgba(255, 215, 0, 0.9), 0 0 30px rgba(255, 215, 0, 0.7), 0 0 45px rgba(255, 215, 0, 0.5)',
                        '0 0 10px rgba(255, 215, 0, 0.7), 0 0 20px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.3)'
                      ]
                    } : {}}
                    transition={areDoublesGold ? {
                      duration: 0.6,
                      repeat: Infinity,
                      repeatType: "reverse"
                    } : {}}
                  >
                    {/* Label */}
                    <p 
                      className={`text-sm md:text-sm ${textColor} mb-1 md:mb-1 opacity-90`}
                      style={{ fontFamily: "Audiowide" }}
                    >
                      Turn Score
                    </p>
                    
                    {/* Number - Show animated value during Aura Forge, otherwise real value */}
                    <p 
                      className={`text-2xl md:text-4xl font-bold ${textColor}`}
                      style={{ fontFamily: "Audiowide" }}
                    >
                      {showAuraForgeTurnScore ? turnScoreDisplay : matchData.gameData.turnScore}
                    </p>
                    
                    {/* 🔥 AURA FORGE TURN SCORE ANIMATION - STAGE 2 */}
                    {showAuraForgeTurnScore && (
                      <motion.div
                        key={auraForgeAnimationKey}
                        className="absolute inset-0 pointer-events-none z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <video
                          src="/Abilities/Animations/Aura Forge/Aura Forge Turn Score.webm"
                          autoPlay
                          loop={false}
                          muted
                          playsInline
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '16px'
                          }}
                        />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })()}

              {/* Potential Total Score Counter - ABSOLUTE LEFT of Turn Score */}
              {matchData.gameData.turnScore > 0 && (() => {
                // Get the active player's score (whoever's turn it is)
                const activePlayer = currentPlayer.turnActive ? currentPlayer : opponent;
                
                // Calculate total score based on game mode
                const totalScore = matchData.gameMode === 'zero-hour' 
                  ? (activePlayer.playerScore || 0) - (matchData.gameData.turnScore || 0) // Zero Hour: subtract turn score
                  : (activePlayer.playerScore || 0) + (matchData.gameData.turnScore || 0); // Normal: add turn score
                  
                const isThreeDigits = Math.abs(totalScore) >= 100; // Use absolute value for digit count
                const isLastLine = matchData.gameMode === 'last-line';
                
                // Determine color based on total score - Same multiplier logic as turn score
                let totalTextColor = 'text-white'; // Default white text
                let totalBgColor = 'rgba(125, 125, 125, 0.7)'; // Grey (<10)
                
                // Override with multiplier colors first (same as turn score)
                if (hasQuadMultiplier) {
                  // x4 Multiplier - White Themed
                  totalTextColor = 'text-black';
                  totalBgColor = 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.7), rgba(174, 238, 238, 0.7))';
                } else if (hasTripleMultiplier) {
                  // x3 Multiplier - Red Themed
                  totalTextColor = 'text-white';
                  totalBgColor = 'linear-gradient(to bottom right, rgba(255, 0, 0, 0.7), rgba(255, 69, 0, 0.7))';
                } else if (hasDoubleMultiplier) {
                  // x2 Multiplier - Purple Themed
                  totalTextColor = 'text-white';
                  totalBgColor = 'linear-gradient(to bottom right, rgba(155, 48, 255, 0.7), rgba(255, 51, 255, 0.7))';
                } else if (totalScore >= 50) {
                  totalTextColor = 'text-black'; // Gold (50+) - Black text
                  totalBgColor = 'rgba(255, 215, 0, 0.7)';
                } else if (totalScore >= 40) {
                  totalTextColor = 'text-black'; // White (40-50) - Black text
                  totalBgColor = 'rgba(255, 255, 255, 0.7)';
                } else if (totalScore >= 30) {
                  totalTextColor = 'text-white'; // Red (30-40)
                  totalBgColor = 'rgba(220, 20, 60, 0.7)';
                } else if (totalScore >= 20) {
                  totalTextColor = 'text-white'; // Purple (20-30)
                  totalBgColor = 'rgba(138, 43, 226, 0.7)';
                } else if (totalScore >= 10) {
                  totalTextColor = 'text-white'; // Blue (10-20)
                  totalBgColor = 'rgba(0, 174, 239, 0.7)';
                }
                
                return (
                  <motion.div
                    key={`potential-total-${matchData.gameData.turnScore}-${activePlayer.playerScore || 0}`}
                    initial={{ opacity: 0, scale: 0.5, x: 10 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      x: isScoreShooting ? [0, 16, 0] : 0,
                      y: 0
                    }}
                    transition={{ 
                      duration: isScoreShooting ? 0.6 : 0.4, 
                      ease: isScoreShooting ? "easeInOut" : "backOut",
                      x: isScoreShooting ? { duration: 0.6, ease: "easeInOut" } : undefined
                    }}
                    className="absolute left-[-70px] md:left-[-70px] top-1/2 transform -translate-y-1/2 border-2 border-gray-500 rounded-xl backdrop-blur-sm shadow-xl overflow-hidden"
                    style={{
                      background: totalBgColor.startsWith('linear') ? totalBgColor : undefined,
                      backgroundColor: !totalBgColor.startsWith('linear') ? totalBgColor : undefined,
                      padding: '6px 8px',
                      minWidth: isThreeDigits ? 'auto' : '50px',
                      minHeight: isThreeDigits ? 'auto' : '50px',
                      aspectRatio: isThreeDigits ? 'auto' : '1 / 1',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    {/* Label */}
                    <p 
                      className={`text-xs md:text-xs ${totalTextColor} mb-1 opacity-90`}
                      style={{ fontFamily: "Audiowide" }}
                    >
                      Total
                    </p>
                    
                    {/* Number - Show animated value during Aura Forge, otherwise real value */}
                    <p 
                      className={`text-lg md:text-2xl font-bold ${totalTextColor}`}
                      style={{ fontFamily: "Audiowide" }}
                    >
                      {showAuraForgeTurnScore ? totalScoreDisplay : totalScore}
                    </p>
                  </motion.div>
                );
              })()}

              {/* Multiplier Indicators - ABSOLUTE RIGHT of Turn Score */}
              {/* Zero Hour Enhanced Multiplier */}
              {matchData.gameData.hasDoubleMultiplier && matchData.gameMode === 'zero-hour' && (
                <motion.div
                  id="multiplier-indicator"
                  initial={{ opacity: 0, scale: 0.5, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: "backOut", delay: 0.2 }}
                  className="absolute right-[-70px] md:right-[-70px] top-1/2 transform -translate-y-1/2 border-2 border-purple-500 rounded-xl backdrop-blur-sm shadow-xl"
                  style={{
                    background: 'linear-gradient(to bottom right, rgba(155, 48, 255, 0.7), rgba(255, 51, 255, 0.7))',
                    padding: '6px 8px',
                    minWidth: '50px',
                    minHeight: '50px',
                    aspectRatio: '1 / 1',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <motion.p 
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="text-lg md:text-base font-bold text-white" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    {matchData.gameData.multiplierLevel || 2}X
                  </motion.p>
                </motion.div>
              )}
              
              {/* Classic Mode 2X Multiplier - Purple Themed */}
              {matchData.gameData.hasDoubleMultiplier && matchData.gameMode !== 'true-grit' && matchData.gameMode !== 'zero-hour' && (
                <motion.div
                  id="multiplier-indicator"
                  initial={{ opacity: 0, scale: 0.5, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: "backOut", delay: 0.2 }}
                  className="absolute right-[-70px] md:right-[-90px] top-1/2 transform -translate-y-1/2 border-2 border-purple-500 rounded-xl backdrop-blur-sm shadow-xl"
                  style={{
                    background: 'linear-gradient(to bottom right, rgba(155, 48, 255, 0.7), rgba(255, 51, 255, 0.7))',
                    padding: '8px 10px',
                    minWidth: '60px',
                    minHeight: '60px',
                    aspectRatio: '1 / 1',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <motion.p 
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="text-lg md:text-2xl font-bold text-white" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    2X
                  </motion.p>
                </motion.div>
              )}
              
              {/* 3X Multiplier - Red Themed */}
              {matchData.gameData.hasTripleMultiplier && (
                <motion.div
                  id="multiplier-indicator"
                  initial={{ opacity: 0, scale: 0.5, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: "backOut", delay: 0.2 }}
                  className="absolute right-[-70px] md:right-[-90px] top-1/2 transform -translate-y-1/2 border-2 border-red-500 rounded-xl backdrop-blur-sm shadow-xl"
                  style={{
                    background: 'linear-gradient(to bottom right, rgba(255, 0, 0, 0.7), rgba(255, 69, 0, 0.7))',
                    padding: '8px 10px',
                    minWidth: '60px',
                    minHeight: '60px',
                    aspectRatio: '1 / 1',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <motion.p 
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="text-lg md:text-2xl font-bold text-white" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    3X
                  </motion.p>
                </motion.div>
              )}
              
              {/* 4X Multiplier - White Themed */}
              {matchData.gameData.hasQuadMultiplier && (
                <motion.div
                  id="multiplier-indicator"
                  initial={{ opacity: 0, scale: 0.5, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: "backOut", delay: 0.2 }}
                  className="absolute right-[-70px] md:right-[-90px] top-1/2 transform -translate-y-1/2 border-2 border-white rounded-xl backdrop-blur-sm shadow-xl"
                  style={{
                    background: 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.7), rgba(174, 238, 238, 0.7))',
                    padding: '8px 10px',
                    minWidth: '60px',
                    minHeight: '60px',
                    aspectRatio: '1 / 1',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <motion.p 
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="text-lg md:text-2xl font-bold text-black" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    4X
                  </motion.p>
                </motion.div>
              )}
              
              {/* True Grit Multiplier */}
              {matchData.gameMode === 'true-grit' && (matchData.gameData.trueGritMultiplier ?? 0) > 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: "backOut" }}
                  className="absolute right-[-70px] md:right-[-90px] top-1/2 transform -translate-y-1/2 bg-orange-600/40 border-2 border-orange-400 rounded-xl backdrop-blur-sm shadow-xl"
                  style={{
                    padding: '6px 8px',
                    minWidth: '50px',
                    minHeight: '50px',
                    aspectRatio: '1 / 1',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <motion.p 
                    initial={{ scale: 1.3, color: "#FB923C" }}
                    animate={{ scale: 1, color: "#FDBA74" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="text-lg md:text-base font-bold text-orange-300" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    {matchData.gameData.trueGritMultiplier || 1}X
                  </motion.p>
                </motion.div>
              )}
            </motion.div>
          </div>
          
          {/* Dice 2 - Enhanced Slot Machine */}
          <motion.div 
            className="w-full max-w-[600px] md:max-w-[600px] md:w-[600px]" 
            style={{ width: 'min(600px, 70vw)', position: 'relative', overflow: 'hidden', borderRadius: '20px' }}
          >
            <SlotMachineDice
              diceNumber={2}
              animationState={dice2Animation}
              matchRollPhase={matchData.gameData.rollPhase}
              actualValue={matchData.gameData.diceTwo}
              isGameRolling={matchData.gameData.isRolling || false}
              matchData={matchData}
              isTopDice={false} // Bottom dice - flipped vertically
              isVitalRushActive={vitalRushActive} // Vital Rush ability state
            />
            
            {/* Vital Rush Bottom Dice Animation Overlay - DISABLED FOR SPRITE SHEET TESTING */}
            {/* {showVitalRushBottomDice && (
              <video
                key="vital-rush-bottom-dice"
                src="/Abilities/Animations/Vital Rush/Vital Rush Bottom Dice Container.webm"
                autoPlay
                loop
                muted
                playsInline
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              />
            )} */}
          </motion.div>
        </motion.div>
        
        {/* Vital Rush Initial Animation - SPRITE SHEET VERSION */}
        {showVitalRushInitial && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, calc(-50% - 60px))',
            width: 'min(600px, 70vw)',
            height: 'min(600px, 70vw)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            pointerEvents: 'none',
            zIndex: 20
          }}>
            <SpriteSheetPlayer
              jsonPath="/Abilities/Animations/Vital Rush/Initial/Vital Rush Initial.json"
              imagePath="/Abilities/Animations/Vital Rush/Initial/Vital Rush Initial.webp"
              frameRate={30}
              loop={false}
              onComplete={() => setShowVitalRushInitial(false)}
              style={{
                width: '100%',
                height: 'auto',
                transform: 'rotate(90deg)',
                transformOrigin: 'center center',
                marginLeft: '-50%'
              }}
            />
          </div>
        )}

        {/* Desktop Abilities Display - Enhanced animations */}
        {user && onAbilityUsed && (
          <motion.div 
            className="hidden md:block mb-6 mt-8 w-full flex justify-center"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.6, 
              ease: [0.4, 0, 0.2, 1],
              delay: 0.8 // Delay after dice animation
            }}
          >
            <motion.div 
              className="w-full max-w-[600px] md:max-w-[900px] md:w-[900px]" 
              style={{ width: 'min(600px, 70vw)' }}
              transition={{ duration: 0.2 }}
            >
              <InlineAbilitiesDisplay
                matchData={matchData}
                onAbilityUsed={handleAbilityUsed}
                isPlayerTurn={isMyTurn}
                playerId={user.uid}
                className="justify-between"
              />
            </motion.div>
          </motion.div>
        )}

        {/* Action Buttons - Desktop Enhanced Animations */}
        <motion.div 
          className="hidden md:flex gap-4 mb-8 mt-4"
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 0.5, 
            ease: [0.4, 0, 0.2, 1],
            staggerChildren: 0.1
          }}
        >
            {isMyTurn ? (
              <>
                <motion.button
                  onClick={onRollDice}
                  disabled={!canRoll}
                  className={`px-12 py-6 rounded-xl text-2xl font-bold transition-all transform ${
                    canRoll
                      ? 'text-white hover:scale-105'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed border-2 border-gray-500'
                  }`}
                  style={{ 
                    fontFamily: "Audiowide",
                    ...(canRoll ? getButtonGradientStyle('rgba(59, 130, 246, 0.8)') : {})
                  }}
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ 
                    scale: canRoll ? 1 : 0.95, 
                    opacity: canRoll ? 1 : 0.6,
                    y: 0
                  }}
                  whileHover={{}}
                  whileTap={canRoll ? { 
                    scale: 0.95,
                    boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)"
                  } : {}}
                  transition={{ 
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                >
                  PLAY
                </motion.button>
                
                {/* Only show bank button for modes other than True Grit on desktop */}
                {matchData.gameMode !== 'true-grit' && (
                  <motion.button
                    onClick={handleBankScore}
                    disabled={!canBank}
                    className={`px-12 py-6 rounded-xl text-2xl font-bold transition-all transform ${
                      canBank
                        ? 'text-white hover:scale-105'
                        : 'bg-gray-600 text-gray-300 cursor-not-allowed border-2 border-gray-500'
                    }`}
                    style={{ 
                      fontFamily: "Audiowide",
                      ...(canBank ? getButtonGradientStyle('rgba(34, 197, 94, 0.8)') : {})
                    }}
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ 
                      scale: canBank ? 1 : 0.95, 
                      opacity: canBank ? 1 : 0.6,
                      y: 0 
                    }}
                    whileHover={{}}
                    whileTap={canBank ? { 
                      scale: 0.95,
                      boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)"
                    } : {}}
                    transition={{ 
                      duration: 0.3,
                      ease: [0.4, 0, 0.2, 1],
                      delay: 0.1 // Slight stagger after play button
                    }}
                  >
                    {matchData.gameMode === 'last-line' ? 'ATTACK' : 'SAVE'}
                  </motion.button>
                )}
              </>
            ) : (
              <motion.div 
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <p 
                  className="text-gray-300 text-xl"
                  style={{ 
                    fontFamily: "Audiowide",
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                  }}
                >
                  Waiting for {opponent.playerDisplayName} to play...
                </p>
              </motion.div>
            )}
        </motion.div>
      </div>

      {/* Mobile Combined Abilities and Buttons Container - Transparent background */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50"
        style={{ 
          background: 'transparent'
        }}
      >
        {/* Abilities Display Section - Enhanced mobile animations */}
        {user && onAbilityUsed && (
          <motion.div 
            className="px-2 py-3" 
            style={{ background: 'transparent' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              ease: "easeOut",
              delay: 0.3 // Slight delay for smoother appearance 
            }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <InlineAbilitiesDisplay
                matchData={matchData}
                onAbilityUsed={handleAbilityUsed}
                isPlayerTurn={isMyTurn}
                playerId={user.uid}
                className="justify-between w-full"
              />
            </motion.div>
          </motion.div>
        )}
        
        {/* Buttons Section - Enhanced Mobile Animations */}
        <motion.div 
          className="w-full flex flex-row items-stretch px-6 gap-2"
            style={{ 
              height: 'max(70px, env(safe-area-inset-bottom) + 70px)'
            }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0, 0.2, 1],
              staggerChildren: 0.1
            }}
          >
            {isMyTurn ? (
              <>
                {/* AURA Counter - LEFT SIDE */}
                <motion.div
                  className="flex items-center justify-center text-white"
                  style={{ 
                    width: '28%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: 'none',
                    borderRadius: '0',
                    background: 'transparent',
                    backdropFilter: 'none',
                  }}
                  initial={{ opacity: 0, x: -50, scale: 0.9 }}
                  animate={{ 
                    opacity: 1,
                    x: 0,
                    scale: 1
                  }}
                  transition={{ 
                    duration: 0.4, 
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.1
                  }}
                >
                  <AuraCounter 
                    auraValue={showAuraForgeAura ? auraDisplay : currentUserAura} 
                    size="medium"
                    className="flex items-center"
                  />
                  
                  {/* 🔥 AURA FORGE AURA ANIMATION - STAGE 2 */}
                  {showAuraForgeAura && (
                    <motion.div
                      key={auraForgeAnimationKey}
                      className="absolute pointer-events-none z-50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        left: '-20%',
                        right: '-20%',
                        top: '-20%',
                        bottom: '-20%',
                        width: '140%',
                        height: '140%'
                      }}
                    >
                      <video
                        src="/Abilities/Animations/Aura Forge/Aura Forge Aura.webm"
                        autoPlay
                        loop={false}
                        muted
                        playsInline
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </motion.div>
                  )}
                </motion.div>

                {/* 🔥 AURA FORGE BOTTOM ANIMATION - STAGE 1 */}
                {showAuraForgeBottom && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none z-40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <video
                      src="/Abilities/Animations/Aura Forge/Aura Forge Bottom.webm"
                      autoPlay
                      loop={false}
                      muted
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onEnded={() => {
                        console.log('🔥 Aura Forge Bottom animation ended - hiding video');
                        setShowAuraForgeBottom(false);
                      }}
                    />
                  </motion.div>
                )}
                
                {/* AURA FORGE: Show 1,2,3,4 selection buttons when active */}
                {isAuraForgeActive ? (
                  <>
                    {[1, 2, 3, 4].map((amount) => {
                      const pointsCost = amount * 5;
                      const canAfford = matchData.gameData.turnScore >= pointsCost;
                      
                      return (
                        <motion.button
                          key={amount}
                          onClick={() => canAfford && handleAuraForgeSelect(amount)}
                          disabled={!canAfford}
                          className={`text-2xl font-bold transition-all ${
                            canAfford
                              ? 'text-white active:scale-95'
                              : 'cursor-not-allowed opacity-40'
                          }`}
                          style={{ 
                            width: '18%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontFamily: "Audiowide",
                            border: 'none',
                            borderRadius: '0',
                            background: 'transparent',
                            backdropFilter: 'none',
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ 
                            opacity: canAfford ? 1 : 0.4,
                            scale: 1
                          }}
                          whileTap={canAfford ? { 
                            scale: 0.92,
                            boxShadow: "0 4px 15px rgba(139, 92, 246, 0.5)"
                          } : {}}
                          transition={{ 
                            duration: 0.3,
                            delay: amount * 0.05
                          }}
                        >
                          <span className="text-3xl">{amount}</span>
                          <span className="text-xs text-gray-400 mt-1">-{pointsCost}pts</span>
                        </motion.button>
                      );
                    })}
                  </>
                ) : (
                  <>
                {/* SAVE button for modes other than True Grit - MIDDLE */}
                {matchData.gameMode !== 'true-grit' && (
                  <motion.button
                    onClick={handleBankScore}
                    disabled={!canBank}
                    className={`text-xl font-bold transition-all ${
                      canBank
                        ? 'text-white active:scale-95'
                        : 'cursor-not-allowed'
                    }`}
                    style={{ 
                      width: '36%',
                      height: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontFamily: "Audiowide",
                      textTransform: "uppercase" as const,
                      border: 'none',
                      borderRadius: '0',
                      background: 'transparent',
                      backdropFilter: 'none',
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: canBank ? 1 : 0.5,
                      scale: 1
                    }}
                    whileTap={canBank ? { 
                      scale: 0.95,
                      boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)"
                    } : {}}
                    transition={{ 
                      duration: 0.4, 
                      ease: [0.4, 0, 0.2, 1],
                      delay: 0.15
                    }}
                  >
                    <span>
                      {matchData.gameMode === 'last-line' ? 'ATTACK' : 'SAVE'}
                    </span>
                  </motion.button>
                )}

                {/* PLAY button - RIGHT SIDE */}
                <motion.button
                  onClick={onRollDice}
                  disabled={!canRoll}
                  className={`text-xl font-bold transition-all ${
                    canRoll
                      ? 'text-white active:scale-95'
                      : 'cursor-not-allowed'
                  }`}
                  style={{ 
                    width: (matchData.gameMode === 'true-grit') ? '72%' : '36%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontFamily: "Audiowide",
                    textTransform: "uppercase" as const,
                    border: 'none',
                    borderRadius: '0',
                    background: 'transparent',
                    backdropFilter: 'none',
                  }}
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ 
                    opacity: canRoll ? 1 : 0.5,
                    x: 0,
                    scale: 1
                  }}
                  whileTap={canRoll ? { 
                    scale: 0.95,
                    boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)"
                  } : {}}
                  transition={{ 
                    duration: 0.4, 
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.2 // Slight delay after save button
                  }}
                >
                  <span>PLAY</span>
                </motion.button>
                  </>
                )}
              </>
            ) : (
              <>
                {/* AURA Counter - LEFT SIDE (always visible) */}
                <motion.div
                  className="flex items-center justify-center text-white"
                  style={{ 
                    width: '28%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: 'none',
                    borderRadius: '0',
                    background: 'transparent',
                    backdropFilter: 'none',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <AuraCounter 
                    auraValue={currentUserAura} 
                    size="medium"
                    className="flex items-center"
                  />
                </motion.div>

                {/* Waiting Message - CENTER */}
                <motion.div 
                  className="flex items-center justify-center"
                  style={{ 
                    width: '72%',
                    height: '100%',
                    background: 'transparent' 
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.p 
                    className="text-gray-300 text-lg"
                    style={{ 
                      fontFamily: "Audiowide",
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                    }}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    Waiting for {opponent.playerDisplayName}...
                  </motion.p>
                </motion.div>
              </>
            )}
        </motion.div>
      </div>

      {/* Multiplier Activation Animation */}
      <MultiplierAnimation
        hasDoubleMultiplier={hasDoubleMultiplier}
        hasTripleMultiplier={hasTripleMultiplier}
        hasQuadMultiplier={hasQuadMultiplier}
      />
    </React.Fragment>
  );
};
