import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchData } from '@/types/match';
import { SlotMachineDice } from './SlotMachineDice';
import { useBackground } from '@/context/BackgroundContext';
import { useAuth } from '@/context/AuthContext';
import InlineAbilitiesDisplay from '@/components/match/InlineAbilitiesDisplay';

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

  // Create button gradient style based on user's display background
  const getButtonGradientStyle = (baseColor: string) => {
    if (DisplayBackgroundEquip?.file) {
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
    const hasMultiplier = matchData.gameData.hasDoubleMultiplier || false;
    
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
        {/* Game Status Box - Improved animations and turn display */}
        <motion.div 
          className="mb-8 hidden md:block"
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
          {/* Dice 1 - Slot Machine */}
          <div className="w-full max-w-[600px] md:max-w-[900px] md:w-[900px]" style={{ width: 'min(600px, 70vw)' }}>
            <SlotMachineDice
              diceNumber={1}
              animationState={dice1Animation}
              matchRollPhase={matchData.gameData.rollPhase}
              actualValue={matchData.gameData.diceOne}
              isGameRolling={matchData.gameData.isRolling || false}
              matchData={matchData}
            />
          </div>
          
          {/* Turn Score - Positioned absolutely between dice - Mobile bigger and more padding */}
          <div 
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center relative"
            >
              {/* Turn Score Container - Smaller on Mobile */}
              <div className="inline-block px-4 md:px-8 py-3 md:py-4 bg-yellow-600/30 border-2 border-yellow-500 rounded-2xl backdrop-blur-sm shadow-xl">
                <p 
                  className="text-sm md:text-lg text-yellow-300 mb-1 md:mb-1"
                  style={{ fontFamily: "Audiowide" }}
                >
                  Turn Score
                </p>
                <p 
                  className="text-2xl md:text-4xl font-bold text-yellow-400" 
                  style={{ fontFamily: "Audiowide" }}
                >
                  {matchData.gameData.turnScore}
                </p>
              </div>
              
              {/* Potential Total Score Counter - Left side */}
              {matchData.gameData.turnScore > 0 && (
                <motion.div
                  key={`potential-total-${matchData.gameData.turnScore}-${currentPlayer.score || 0}`}
                  initial={{ opacity: 0, scale: 0.5, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: "backOut" }}
                  className="absolute -left-20 md:-left-28 top-1/2 transform -translate-y-1/2 px-3 md:px-4 py-2 md:py-3 bg-blue-600/40 border-2 border-blue-400 rounded-xl backdrop-blur-sm shadow-xl"
                >
                  <p 
                    className="text-xs md:text-sm text-blue-300 mb-1" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    Total
                  </p>
                  <motion.p 
                    key={`total-value-${(matchData.gameData.turnScore || 0) + (currentPlayer.score || 0)}`}
                    initial={{ scale: 1.3, color: "#60A5FA" }}
                    animate={{ scale: 1, color: "#93C5FD" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="text-lg md:text-xl font-bold text-blue-300" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    {(matchData.gameData.turnScore || 0) + (currentPlayer.score || 0)}
                  </motion.p>
                </motion.div>
              )}
              
              {/* Multiplier Indicators - Absolutely positioned */}
              {/* Zero Hour Enhanced Multiplier */}
              {matchData.gameData.hasDoubleMultiplier && matchData.gameMode === 'zero-hour' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -right-20 md:-right-24 top-1/2 transform -translate-y-1/2 px-6 md:px-4 py-3 md:py-2 bg-purple-600/40 border-2 border-purple-400 rounded-xl backdrop-blur-sm shadow-xl"
                >
                  <p 
                    className="text-xl md:text-2xl font-bold text-purple-300" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    {matchData.gameData.multiplierLevel || 2}X
                  </p>
                </motion.div>
              )}
              
              {/* Classic Mode 2X Multiplier */}
              {matchData.gameData.hasDoubleMultiplier && matchData.gameMode !== 'true-grit' && matchData.gameMode !== 'zero-hour' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -right-20 md:-right-24 top-1/2 transform -translate-y-1/2 px-6 md:px-4 py-3 md:py-2 bg-red-600/40 border-2 border-red-400 rounded-xl backdrop-blur-sm shadow-xl"
                >
                  <p 
                    className="text-xl md:text-2xl font-bold text-red-300" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    2X
                  </p>
                </motion.div>
              )}
              
              {/* True Grit Multiplier */}
              {matchData.gameMode === 'true-grit' && matchData.gameData.trueGritMultiplier && matchData.gameData.trueGritMultiplier > 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -right-20 md:-right-24 top-1/2 transform -translate-y-1/2 px-6 md:px-4 py-3 md:py-2 bg-orange-600/40 border-2 border-orange-400 rounded-xl backdrop-blur-sm shadow-xl"
                >
                  <p 
                    className="text-xl md:text-2xl font-bold text-orange-300" 
                    style={{ fontFamily: "Audiowide" }}
                  >
                    {matchData.gameData.trueGritMultiplier}X
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>
          
          {/* Dice 2 - Slot Machine */}
          <div className="w-full max-w-[600px] md:max-w-[900px] md:w-[900px]" style={{ width: 'min(600px, 70vw)' }}>
            <SlotMachineDice
              diceNumber={2}
              animationState={dice2Animation}
              matchRollPhase={matchData.gameData.rollPhase}
              actualValue={matchData.gameData.diceTwo}
              isGameRolling={matchData.gameData.isRolling || false}
              matchData={matchData}
            />
          </div>
        </motion.div>

        {/* Desktop Abilities Display - Using simplified component */}
        {user && onAbilityUsed && (
          <div className="hidden md:block mb-6 mt-8 w-full flex justify-center">
            <div className="w-full max-w-[600px] md:max-w-[900px] md:w-[900px]" style={{ width: 'min(600px, 70vw)' }}>
              <InlineAbilitiesDisplay
                matchData={matchData}
                onAbilityUsed={onAbilityUsed}
                isPlayerTurn={isMyTurn}
                playerId={user.uid}
                className="justify-between"
              />
            </div>
          </div>
        )}

        {/* Action Buttons - Desktop Only with improved animations */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={`buttons-${isMyTurn}-${canRoll}-${canBank}`}
            className="hidden md:flex gap-4 mb-8 mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
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
                  initial={{ scale: 0.95, opacity: 0.8 }}
                  animate={{ 
                    scale: canRoll ? 1 : 0.95, 
                    opacity: canRoll ? 1 : 0.6 
                  }}
                  whileHover={canRoll ? { scale: 1.05 } : {}}
                  whileTap={canRoll ? { scale: 0.95 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  PLAY
                </motion.button>
                
                {/* Only show bank button for modes other than True Grit on desktop */}
                {matchData.gameMode !== 'true-grit' && (
                  <motion.button
                    onClick={onBankScore}
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
                    initial={{ scale: 0.95, opacity: 0.8 }}
                    animate={{ 
                      scale: canBank ? 1 : 0.95, 
                      opacity: canBank ? 1 : 0.6 
                    }}
                    whileHover={canBank ? { scale: 1.05 } : {}}
                    whileTap={canBank ? { scale: 0.95 } : {}}
                    transition={{ duration: 0.2 }}
                  >
                    {matchData.gameMode === 'last-line' ? 'ATTACK' : 'BANK'}
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
        </AnimatePresence>
      </div>

      {/* Mobile Combined Abilities and Buttons Container - Transparent background */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50"
        style={{ 
          background: 'transparent'
        }}
      >
        {/* Abilities Display Section - Transparent background on mobile */}
        {user && onAbilityUsed && (
          <div className="px-2 py-3" style={{ background: 'transparent' }}>
            <InlineAbilitiesDisplay
              matchData={matchData}
              onAbilityUsed={onAbilityUsed}
              isPlayerTurn={isMyTurn}
              playerId={user.uid}
              className="justify-between w-full"
            />
          </div>
        )}
        
        {/* Buttons Section with improved mobile animations */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={`mobile-buttons-${isMyTurn}-${canRoll}-${canBank}`}
            className="w-full flex flex-row items-stretch"
            style={{ 
              height: 'max(70px, env(safe-area-inset-bottom) + 70px)'
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {isMyTurn ? (
              <>
                <motion.button
                  onClick={onRollDice}
                  disabled={!canRoll}
                  className={`text-xl font-bold transition-all ${
                    canRoll
                      ? 'text-white active:scale-95'
                      : 'cursor-not-allowed'
                  }`}
                  style={{ 
                    width: (matchData.gameMode === 'true-grit') ? '100%' : '50%',
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
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: canRoll ? 1 : 0.5 }}
                  whileTap={canRoll ? { scale: 0.95 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatePresence mode="wait">
                    {canRoll && (
                      <motion.span
                        key="play-text"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                      >
                        PLAY
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
                
                {/* Only show bank button for modes other than True Grit on mobile */}
                {matchData.gameMode !== 'true-grit' && (
                  <motion.button
                    onClick={onBankScore}
                    disabled={!canBank}
                    className={`text-xl font-bold transition-all ${
                      canBank
                        ? 'text-white active:scale-95'
                        : 'cursor-not-allowed'
                    }`}
                    style={{ 
                      width: '50%',
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
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: canBank ? 1 : 0.5 }}
                    whileTap={canBank ? { scale: 0.95 } : {}}
                    transition={{ duration: 0.2 }}
                  >
                    <AnimatePresence mode="wait">
                      {canBank && (
                        <motion.span
                          key="bank-text"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.2 }}
                        >
                          {matchData.gameMode === 'last-line' ? 'ATTACK' : 'BANK'}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                )}
              </>
            ) : (
              <motion.div 
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'transparent' }}
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
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </React.Fragment>
  );
};
