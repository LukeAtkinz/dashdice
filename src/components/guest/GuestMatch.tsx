'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBackground } from '@/context/BackgroundContext';
import { guestMatchManager, GuestMatchState } from '@/components/shared/waitingroom/GuestMatchManager';
import { SlotMachineDice } from '@/components/dashboard/SlotMachineDice';
import { motion, AnimatePresence } from 'framer-motion';

interface GuestMatchProps {
  matchId: string;
  onBack: () => void;
}

interface GameState {
  isPregame: boolean;
  chooserPlayerIndex: number | null;
  oddEvenChoice: string | null;
  oddEvenDieValue: number | null;
  turnDecider: number | null;
  turnScore: number;
  diceOne: number;
  diceTwo: number;
  roundObjective: number;
  startingScore: number;
  gameMode: string;
  status: string;
}

interface PlayerData {
  playerDisplayName: string;
  playerId: string;
  displayBackgroundEquipped: string;
  matchBackgroundEquipped: string;
  playerStats: {
    bestStreak: number;
    currentStreak: number;
    gamesPlayed: number;
    matchWins: number;
  };
  gameState: {
    turnActive: boolean;
    playerScore: number;
    roundScore: number;
  };
  isBot?: boolean;
}

export const GuestMatch: React.FC<GuestMatchProps> = React.memo(({ matchId, onBack }) => {
  const { MatchBackgroundEquip } = useBackground();
  const [matchData, setMatchData] = useState<GuestMatchState | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    isPregame: true,
    chooserPlayerIndex: 1,
    oddEvenChoice: null,
    oddEvenDieValue: null,
    turnDecider: null,
    turnScore: 0,
    diceOne: 0,
    diceTwo: 0,
    roundObjective: 100,
    startingScore: 0,
    gameMode: 'classic',
    status: 'active'
  });
  const [currentPlayer, setCurrentPlayer] = useState<PlayerData | null>(null);
  const [opponent, setOpponent] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isHost] = useState(true);

  // Dice animation states for slot machine effect
  const [dice1Animation, setDice1Animation] = useState<{
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
    animationKey?: number;
  }>({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });
  
  const [dice2Animation, setDice2Animation] = useState<{
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
    animationKey?: number;
  }>({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });

  // Rolling state for button management
  const [isRolling, setIsRolling] = useState(false);

  // Initialize match data and players
  useEffect(() => {
    console.log(' GuestMatch: Looking for match with ID:', matchId);
    const data = guestMatchManager.getCurrentMatch();
    
    if (data) {
      console.log(' GuestMatch: Found match data:', data);
      setMatchData(data);
      
      // Initialize game state from match data
      setGameState(prev => ({
        ...prev,
        gameMode: data.gameMode,
        roundObjective: data.gameMode === 'quickfire' ? 50 : 100,
        isPregame: true,
        chooserPlayerIndex: 1 // Host chooses first
      }));
      
      // Set up players
      const hostPlayer: PlayerData = {
        playerDisplayName: data.hostPlayer.displayName,
        playerId: data.hostPlayer.id,
        displayBackgroundEquipped: data.hostPlayer.background?.file || 'default',
        matchBackgroundEquipped: data.hostPlayer.background?.file || 'default',
        playerStats: {
          bestStreak: data.hostPlayer.stats.bestStreak,
          currentStreak: data.hostPlayer.stats.currentStreak,
          gamesPlayed: data.hostPlayer.stats.gamesPlayed,
          matchWins: data.hostPlayer.stats.matchWins
        },
        gameState: {
          turnActive: false,
          playerScore: 0,
          roundScore: 0
        }
      };
      
      const botPlayer: PlayerData = {
        playerDisplayName: data.opponentPlayer?.displayName || 'DiceBot Alpha',
        playerId: data.opponentPlayer?.id || 'bot_1',
        displayBackgroundEquipped: 'default',
        matchBackgroundEquipped: 'default',
        playerStats: {
          bestStreak: 15,
          currentStreak: 3,
          gamesPlayed: 100,
          matchWins: 67
        },
        gameState: {
          turnActive: false,
          playerScore: 0,
          roundScore: 0
        },
        isBot: true
      };
      
      setCurrentPlayer(hostPlayer);
      setOpponent(botPlayer);
    }
  }, [matchId]);

  // Bot decision-making logic
  const botShouldBank = useCallback((): boolean => {
    const botScore = opponent?.gameState.playerScore || 0;
    const playerScore = currentPlayer?.gameState.playerScore || 0;
    const turnScore = gameState.turnScore;
    const objective = gameState.roundObjective;
    
    // If bot can win, always bank
    if (botScore + turnScore >= objective) return true;
    
    // If turn score is high, bank it
    if (turnScore >= 15) return true;
    
    // If bot is behind by a lot, take more risks
    if (playerScore - botScore > 20) {
      return turnScore >= 8;
    }
    
    // If bot is ahead, be more conservative
    if (botScore - playerScore > 15) {
      return turnScore >= 6;
    }
    
    // Default banking threshold
    return turnScore >= 10;
  }, [opponent?.gameState.playerScore, currentPlayer?.gameState.playerScore, gameState.turnScore, gameState.roundObjective]);

  // Bot turn automation - THIS IS THE KEY PART!
  useEffect(() => {
    if (!opponent?.isBot || !opponent.gameState.turnActive || gameState.isPregame || loading) return;
    
    console.log(' Bot turn detected! Starting automation...');
    
    const handleBotTurn = async () => {
      // Add realistic delay
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
      
      if (gameState.turnScore === 0) {
        // Bot needs to roll first
        console.log(' Bot is rolling dice...');
        handleRollDice(true);
      } else {
        // Bot decides whether to bank or roll again
        if (botShouldBank()) {
          console.log(' Bot decides to bank score');
          handleBankScore(true);
        } else {
          console.log(' Bot decides to roll again');
          handleRollDice(true);
        }
      }
    };
    
    const timeoutId = setTimeout(handleBotTurn, 500);
    return () => clearTimeout(timeoutId);
  }, [opponent?.gameState.turnActive, gameState.turnScore, loading, botShouldBank]);

  const getGameModeDisplayName = useCallback((gameType: string): string => {
    const modeNames: Record<string, string> = {
      'classic': 'Classic Mode',
      'quickfire': 'Quick Fire',
      'zero-hour': 'Zero Hour',
      'last-line': 'Last Line',
      'true-grit': 'True Grit',
      'tag-team': 'Tag Team'
    };
    return modeNames[gameType.toLowerCase()] || gameType.charAt(0).toUpperCase() + gameType.slice(1);
  }, []);

  const handleOddEvenChoice = useCallback(async (choice: 'odd' | 'even') => {
    if (loading) return;
    setLoading(true);
    
    console.log(' Guest Match: Making odd/even choice:', { choice });
    
    try {
      // Set the choice
      setGameState(prev => ({ ...prev, oddEvenChoice: choice }));
      
      // Roll the die
      await new Promise(resolve => setTimeout(resolve, 500));
      const dieValue = Math.floor(Math.random() * 6) + 1;
      
      console.log(' Guest Match: Die roll result:', { dieValue, choice });
      
      setGameState(prev => ({ ...prev, oddEvenDieValue: dieValue }));
      
      // Determine who won and gets to go first
      const isOdd = dieValue % 2 === 1;
      const playerWon = (choice === 'odd' && isOdd) || (choice === 'even' && !isOdd);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Start the actual game
      setGameState(prev => ({
        ...prev,
        isPregame: false,
        turnDecider: playerWon ? 1 : 2
      }));
      
      // Set initial turn
      if (playerWon) {
        setCurrentPlayer(prev => prev ? { ...prev, gameState: { ...prev.gameState, turnActive: true } } : null);
        setOpponent(prev => prev ? { ...prev, gameState: { ...prev.gameState, turnActive: false } } : null);
      } else {
        setCurrentPlayer(prev => prev ? { ...prev, gameState: { ...prev.gameState, turnActive: false } } : null);
        setOpponent(prev => prev ? { ...prev, gameState: { ...prev.gameState, turnActive: true } } : null);
      }
      
    } catch (error) {
      console.error(' Error in odd/even choice:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleRollDice = useCallback(async (isBotTurn: boolean = false) => {
    if (loading) return;
    if (!isBotTurn && !currentPlayer?.gameState.turnActive) return;
    
    setLoading(true);
    setIsRolling(true);
    
    try {
      // Start dice animation
      const animationKey = Date.now();
      setDice1Animation({
        isSpinning: true,
        currentNumber: 1,
        finalNumber: null,
        reelSpeed: 0.1,
        animationKey
      });
      setDice2Animation({
        isSpinning: true,
        currentNumber: 1,
        finalNumber: null,
        reelSpeed: 0.1,
        animationKey
      });
      
      // Wait for animation start
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const total = dice1 + dice2;
      
      console.log(' Player rolled:', { dice1, dice2, total, isBotTurn });
      
      setGameState(prev => ({
        ...prev,
        diceOne: dice1,
        diceTwo: dice2
      }));
      
      // Wait for dice animation to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Stop dice animation and show final values
      setDice1Animation({
        isSpinning: false,
        currentNumber: dice1,
        finalNumber: dice1,
        reelSpeed: undefined,
        animationKey
      });
      setDice2Animation({
        isSpinning: false,
        currentNumber: dice2,
        finalNumber: dice2,
        reelSpeed: undefined,
        animationKey
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for bust (double 1s)
      if (dice1 === 1 && dice2 === 1) {
        console.log(' BUST! Double ones - lose all points!');
        // Bust - lose all points and switch turns
        if (isBotTurn) {
          setOpponent(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, playerScore: 0, turnActive: false }
          } : null);
          setCurrentPlayer(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, turnActive: true }
          } : null);
        } else {
          setCurrentPlayer(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, playerScore: 0, turnActive: false }
          } : null);
          setOpponent(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, turnActive: true }
          } : null);
        }
        
        setGameState(prev => ({ ...prev, turnScore: 0 }));
        return;
      }
      
      // Check for single 1 (lose turn score)
      if (dice1 === 1 || dice2 === 1) {
        console.log(' Single one - lose turn!');
        // Switch turns without adding score
        if (isBotTurn) {
          setOpponent(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, turnActive: false }
          } : null);
          setCurrentPlayer(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, turnActive: true }
          } : null);
        } else {
          setCurrentPlayer(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, turnActive: false }
          } : null);
          setOpponent(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, turnActive: true }
          } : null);
        }
        
        setGameState(prev => ({ ...prev, turnScore: 0 }));
        return;
      }
      
      // Add to turn score
      setGameState(prev => ({ ...prev, turnScore: prev.turnScore + total }));
      
    } catch (error) {
      console.error(' Error rolling dice:', error);
    } finally {
      setLoading(false);
      setIsRolling(false);
    }
  }, [loading, currentPlayer?.gameState.turnActive]);

  const handleBankScore = useCallback(async (isBotTurn: boolean = false) => {
    if (loading) return;
    if (!isBotTurn && !currentPlayer?.gameState.turnActive) return;
    if (gameState.turnScore === 0) return;
    
    setLoading(true);
    
    try {
      const scoreToBank = gameState.turnScore;
      console.log(' Player banked', scoreToBank, 'points', isBotTurn ? '(Bot)' : '(Human)');
      
      // Add turn score to player's total
      if (isBotTurn) {
        setOpponent(prev => {
          if (!prev) return null;
          const newScore = prev.gameState.playerScore + scoreToBank;
          
          // Check for win
          if (newScore >= gameState.roundObjective) {
            // Bot wins
            console.log(' Bot wins!');
            setGameState(prev => ({ ...prev, status: 'finished' }));
          }
          
          return {
            ...prev,
            gameState: { 
              ...prev.gameState, 
              playerScore: newScore,
              turnActive: false 
            }
          };
        });
        
        // Switch to player's turn if game isn't over
        if (gameState.status === 'active') {
          setCurrentPlayer(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, turnActive: true }
          } : null);
        }
      } else {
        setCurrentPlayer(prev => {
          if (!prev) return null;
          const newScore = prev.gameState.playerScore + scoreToBank;
          
          // Check for win
          if (newScore >= gameState.roundObjective) {
            // Player wins
            console.log(' Player wins!');
            setGameState(prev => ({ ...prev, status: 'finished' }));
          }
          
          return {
            ...prev,
            gameState: { 
              ...prev.gameState, 
              playerScore: newScore,
              turnActive: false 
            }
          };
        });
        
        // Switch to bot's turn if game isn't over
        if (gameState.status === 'active') {
          setOpponent(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, turnActive: true }
          } : null);
        }
      }
      
      // Reset turn score
      setGameState(prev => ({ ...prev, turnScore: 0 }));
      
    } catch (error) {
      console.error(' Error banking score:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, currentPlayer?.gameState.turnActive, gameState.turnScore, gameState.roundObjective, gameState.status]);

  // Background rendering
  const renderBackground = useMemo(() => {
    if (MatchBackgroundEquip) {
      if (MatchBackgroundEquip.type === 'video') {
        return (
          <video
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            webkit-playsinline="true"
            x5-playsinline="true"
            preload="metadata"
            disablePictureInPicture
            controlsList="nodownload noplaybackrate nofullscreen"
            className="absolute inset-0 w-full h-full object-cover z-0"
            style={{
              pointerEvents: 'none',
              WebkitAppearance: 'none',
              outline: 'none'
            }}
          >
            <source src={MatchBackgroundEquip.file} type="video/mp4" />
          </video>
        );
      } else {
        return (
          <img
            src={MatchBackgroundEquip.file}
            alt={MatchBackgroundEquip.name}
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        );
      }
    }
    
    return (
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 50%, rgba(30, 41, 59, 0.9) 100%)"
        }}
      />
    );
  }, [MatchBackgroundEquip]);

  if (!matchData || !currentPlayer || !opponent) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        {renderBackground}
        <div className="relative z-20 text-white text-2xl">Loading match...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {renderBackground}
      
      {/* Overlay for better content visibility */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Main Match Content */}
      <div className="relative z-20 h-screen flex flex-col">
        
        {/* Header */}
        <header className="flex-shrink-0 w-full flex items-center justify-between px-8 py-6">
          <button
            onClick={onBack}
            className="text-white hover:text-yellow-400 transition-colors"
          >
             Back
          </button>
          
          <div className="text-white text-center">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "Audiowide" }}>
              {getGameModeDisplayName(gameState.gameMode)} MATCH
            </h1>
            <p className="text-lg">Objective: {gameState.roundObjective} points</p>
          </div>
          
          <div className="text-white text-right">
            <p>Turn: {gameState.turnDecider === 1 ? 'Host' : 'Opponent'}</p>
          </div>
        </header>

        {/* Game Area */}
        <main className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-6xl flex items-center justify-between gap-16">
            
            {/* Current Player - Left Side */}
            <div className="flex-1 hidden md:block">
              {/* Player Name Above Container - Left Aligned */}
              <h2 
                className="text-3xl font-bold text-white mb-4 text-left"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
              >
                {currentPlayer.playerDisplayName}
              </h2>
              
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4 z-20"
                style={{ 
                  borderColor: currentPlayer.gameState.turnActive ? '#00ff00' : '#ffffff',
                  height: '500px'
                }}
              >
                {/* Player Background */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 50%, rgba(30, 41, 59, 0.9) 100%)"
                  }}
                />
                
                {/* Player Info Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Match Score - Large and Centered */}
                  <div 
                    className="text-9xl font-bold text-white"
                    style={{ 
                      fontFamily: 'Audiowide',
                      textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                    }}
                  >
                    {currentPlayer.gameState.playerScore}
                  </div>
                </div>

                {/* Turn Status Indicator */}
                {gameState.isPregame && gameState.chooserPlayerIndex === (isHost ? 1 : 2) && !gameState.oddEvenChoice && (
                  <div className="absolute top-4 left-4">
                    <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                      CHOOSE
                    </div>
                  </div>
                )}
              </div>
              
              {/* Background Rarity Display - Below Container, Left Aligned */}
              <div 
                className="mt-4 text-left"
                style={{
                  display: 'flex',
                  width: '190px',
                  height: '45px',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.09)',
                  backdropFilter: 'blur(5.5px)'
                }}
              >
                <span style={{
                  alignSelf: 'stretch',
                  color: '#FFF',
                  textAlign: 'center',
                  fontFamily: 'Orbitron',
                  fontSize: '20px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '42px',
                  textTransform: 'uppercase'
                }}>
                  COMMON
                </span>
              </div>
            </div>

            {/* Center Dice Area */}
            <div className="flex flex-col items-center justify-center relative z-10" style={{ alignSelf: 'center', minWidth: '600px', width: '600px', height: '60vh', overflow: 'visible' }}>
              {/* Phase-specific content with transitions */}
              <AnimatePresence mode="wait">
                {gameState.isPregame ? (
                  <motion.div
                    key="turnDecider"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="w-full flex flex-col items-center"
                  >
                    <h3 className="text-xl text-white mb-4" style={{ fontFamily: "Audiowide" }}>
                      {gameState.oddEvenChoice ? 'DIE ROLLED' : 'CHOOSE ODD OR EVEN'}
                    </h3>
                    
                    <div className="w-full max-w-[600px]" style={{ width: 'min(600px, 70vw)' }}>
                      <SlotMachineDice
                        diceNumber={'turnDecider' as any}
                        animationState={{
                          isSpinning: false,
                          currentNumber: gameState.oddEvenDieValue || 1,
                          finalNumber: gameState.oddEvenDieValue
                        }}
                        matchRollPhase={gameState.oddEvenChoice ? 'turnDecider' : undefined}
                        actualValue={gameState.oddEvenDieValue || null}
                        isGameRolling={gameState.oddEvenChoice !== null && gameState.oddEvenDieValue !== null}
                        isTurnDecider={true}
                      />
                    </div>
                    
                    {gameState.oddEvenChoice && (
                      <p className="text-white mb-4 mt-4 text-center">
                        Choice: {gameState.oddEvenChoice.toUpperCase()}
                        {gameState.oddEvenDieValue && (
                          <>
                            <br />
                            Result: {gameState.oddEvenDieValue % 2 === 1 ? 'ODD' : 'EVEN'}
                            <br />
                            {((gameState.oddEvenChoice === 'odd') === (gameState.oddEvenDieValue % 2 === 1)) ? 'WIN!' : 'LOSE!'}
                          </>
                        )}
                      </p>
                    )}
                    
                    {!gameState.oddEvenChoice && gameState.chooserPlayerIndex === (isHost ? 1 : 2) && (
                      <div className="flex flex-col md:flex-row justify-center gap-4 mt-8">
                        <button
                          onClick={() => handleOddEvenChoice('odd')}
                          disabled={loading}
                          className="px-6 md:px-8 py-3 md:py-4 text-white font-bold text-xl md:text-2xl rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                          style={{
                            background: '#FFD700',
                            fontFamily: 'Audiowide',
                            textTransform: 'uppercase'
                          }}
                        >
                          ODD
                        </button>
                        <button
                          onClick={() => handleOddEvenChoice('even')}
                          disabled={loading}
                          className="px-6 md:px-8 py-3 md:py-4 text-white font-bold text-xl md:text-2xl rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                          style={{
                            background: '#8e44ad',
                            fontFamily: 'Audiowide',
                            textTransform: 'uppercase'
                          }}
                        >
                          EVEN
                        </button>
                      </div>
                    )}
                    
                    {(!gameState.chooserPlayerIndex || gameState.chooserPlayerIndex !== (isHost ? 1 : 2)) && !gameState.oddEvenChoice && (
                      <p className="text-white/70 text-lg mt-8">
                        Waiting for opponent to choose...
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="gameplay"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="w-full flex flex-col items-center gap-4"
                  >
                    {/* Dice 1 - Slot Machine */}
                    <div className="w-full max-w-[600px]" style={{ width: 'min(600px, 70vw)' }}>
                      <SlotMachineDice
                        diceNumber={1}
                        animationState={dice1Animation}
                        matchRollPhase={loading ? 'dice1' : undefined}
                        actualValue={gameState.diceOne}
                        isGameRolling={loading}
                        matchData={{
                          gameData: {
                            diceOne: gameState.diceOne,
                            diceTwo: gameState.diceTwo,
                            turnScore: gameState.turnScore,
                            isRolling: loading
                          },
                          gameMode: gameState.gameMode
                        } as any}
                      />
                    </div>

                    {/* Turn Score Display */}
                    <motion.div
                      className="px-6 py-3 bg-black/40 border-2 border-white/30 rounded-xl backdrop-blur-sm"
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-white text-xl font-bold" style={{ fontFamily: "Audiowide" }}>
                        TURN SCORE: {gameState.turnScore}
                      </p>
                    </motion.div>

                    {/* Dice 2 - Slot Machine */}
                    <div className="w-full max-w-[600px]" style={{ width: 'min(600px, 70vw)' }}>
                      <SlotMachineDice
                        diceNumber={2}
                        animationState={dice2Animation}
                        matchRollPhase={loading ? 'dice2' : undefined}
                        actualValue={gameState.diceTwo}
                        isGameRolling={loading}
                        matchData={{
                          gameData: {
                            diceOne: gameState.diceOne,
                            diceTwo: gameState.diceTwo,
                            turnScore: gameState.turnScore,
                            isRolling: loading
                          },
                          gameMode: gameState.gameMode
                        } as any}
                      />
                    </div>

                    {/* Action Buttons */}
                    {currentPlayer.gameState.turnActive && (
                      <div className="flex gap-4 mt-8">
                        <button
                          onClick={() => handleRollDice(false)}
                          disabled={loading}
                          className={`px-12 py-6 rounded-xl text-2xl font-bold transition-all transform ${
                            !loading
                              ? 'text-white hover:scale-105'
                              : 'bg-gray-600 text-gray-300 cursor-not-allowed border-2 border-gray-500'
                          }`}
                          style={{
                            fontFamily: "Audiowide",
                            background: !loading ? 'var(--ui-button-bg, linear-gradient(243deg, rgba(59, 130, 246, 0.8) 25.17%, rgba(153, 153, 153, 0.00) 109.89%))' : undefined,
                            backdropFilter: !loading ? 'blur(5px)' : undefined,
                            border: !loading ? '2px solid rgba(255, 255, 255, 0.3)' : undefined
                          }}
                        >
                          PLAY
                        </button>
                        
                        {gameState.gameMode !== 'true-grit' && (
                          <button
                            onClick={() => handleBankScore(false)}
                            disabled={loading || gameState.turnScore === 0}
                            className={`px-12 py-6 rounded-xl text-2xl font-bold transition-all transform ${
                              !loading && gameState.turnScore > 0
                                ? 'text-white hover:scale-105'
                                : 'bg-gray-600 text-gray-300 cursor-not-allowed border-2 border-gray-500'
                            }`}
                            style={{
                              fontFamily: "Audiowide",
                              background: (!loading && gameState.turnScore > 0) ? 'var(--ui-button-bg, linear-gradient(243deg, rgba(34, 197, 94, 0.8) 25.17%, rgba(153, 153, 153, 0.00) 109.89%))' : undefined,
                              backdropFilter: (!loading && gameState.turnScore > 0) ? 'blur(5px)' : undefined,
                              border: (!loading && gameState.turnScore > 0) ? '2px solid rgba(255, 255, 255, 0.3)' : undefined
                            }}
                          >
                            {gameState.gameMode === 'last-line' ? 'ATTACK' : 'BANK'}
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Opponent - Right Side */}
            <div className="flex-1 hidden md:block">
              {/* Player Name Above Container - Right Aligned */}
              <h2 
                className="text-3xl font-bold text-white mb-4 text-right"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
              >
                {opponent.playerDisplayName}
              </h2>
              
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4 z-20"
                style={{ 
                  borderColor: opponent.gameState.turnActive ? '#ff0000' : '#ffffff',
                  height: '500px'
                }}
              >
                {/* Opponent Background */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 50%, rgba(30, 41, 59, 0.9) 100%)"
                  }}
                />
                
                {/* Opponent Info Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Match Score - Large and Centered */}
                  <div 
                    className="text-9xl font-bold text-white"
                    style={{ 
                      fontFamily: 'Audiowide',
                      textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                    }}
                  >
                    {opponent.gameState.playerScore}
                  </div>
                </div>

                {/* Bot Thinking Indicator */}
                {opponent.gameState.turnActive && !gameState.isPregame && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                      THINKING...
                    </div>
                  </div>
                )}
              </div>
              
              {/* Background Rarity Display - Below Container, Right Aligned */}
              <div 
                className="mt-4 text-right ml-auto"
                style={{
                  display: 'flex',
                  width: '190px',
                  height: '45px',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.09)',
                  backdropFilter: 'blur(5.5px)'
                }}
              >
                <span style={{
                  alignSelf: 'stretch',
                  color: '#FFF',
                  textAlign: 'center',
                  fontFamily: 'Orbitron',
                  fontSize: '20px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '42px',
                  textTransform: 'uppercase'
                }}>
                  LEGENDARY
                </span>
              </div>
            </div>

          </div>

          {/* Mobile Layout - Stacked */}
          <div className="md:hidden flex flex-col items-center w-full" style={{ width: '100vw', paddingTop: '0px' }}>
            
            {/* User Profiles Section - Top */}
            <div className="w-full flex justify-between mb-3" style={{ paddingLeft: '10px', paddingRight: '10px', gap: '10px' }}>
              {/* Current Player Profile - Left */}
              <div style={{ width: 'calc(50vw - 15px)' }}>
                <h3 
                  className="font-bold text-white mb-2 text-center px-1"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    fontSize: 'clamp(12px, 3.5vw, 16px)',
                    lineHeight: '1.2',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {currentPlayer.playerDisplayName}
                </h3>
                
                <div
                  className="relative rounded-xl overflow-hidden shadow-lg border-2"
                  style={{ 
                    borderColor: currentPlayer.gameState.turnActive ? '#00ff00' : '#ffffff',
                    height: '120px',
                    width: '100%'
                  }}
                >
                  {/* Player Background */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 50%, rgba(30, 41, 59, 0.9) 100%)"
                    }}
                  />
                  
                  {/* Score Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="text-4xl font-bold text-white"
                      style={{ 
                        fontFamily: 'Audiowide',
                        textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                      }}
                    >
                      {currentPlayer.gameState.playerScore}
                    </div>
                  </div>
                </div>
              </div>

              {/* Opponent Profile - Right */}
              <div style={{ width: 'calc(50vw - 15px)' }}>
                <h3 
                  className="font-bold text-white mb-2 text-center px-1"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    fontSize: 'clamp(12px, 3.5vw, 16px)',
                    lineHeight: '1.2',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {opponent.playerDisplayName}
                </h3>
                
                <div
                  className="relative rounded-xl overflow-hidden shadow-lg border-2"
                  style={{ 
                    borderColor: opponent.gameState.turnActive ? '#00ff00' : '#ffffff',
                    height: '120px',
                    width: '100%'
                  }}
                >
                  {/* Player Background */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 50%, rgba(30, 41, 59, 0.9) 100%)"
                    }}
                  />
                  
                  {/* Score Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="text-4xl font-bold text-white"
                      style={{ 
                        fontFamily: 'Audiowide',
                        textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                      }}
                    >
                      {opponent.gameState.playerScore}
                    </div>
                  </div>

                  {/* Bot Thinking Indicator */}
                  {opponent.gameState.turnActive && !gameState.isPregame && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                      THINKING...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center Dice Area - Mobile */}
            <div className="w-full flex flex-col items-center justify-center mb-3" style={{ paddingBottom: '120px', paddingTop: '120px', height: '60vh', overflow: 'visible' }}>
              {gameState.isPregame ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="pre-game-mobile"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="w-full flex flex-col items-center"
                  >
                    {!gameState.oddEvenChoice ? (
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-6" style={{ fontFamily: "Audiowide" }}>
                          Choose Odd or Even
                        </h2>
                        <div className="flex flex-col md:flex-row justify-center gap-4 mt-8">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleOddEvenChoice('odd')}
                            style={{
                              width: '190px',
                              height: '80px',
                              borderRadius: '50px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              backdropFilter: 'blur(10px)',
                              WebkitBackdropFilter: 'blur(10px)',
                              color: 'white',
                              fontFamily: 'Audiowide',
                              fontSize: '18px',
                              fontWeight: 'bold',
                              border: '2px solid rgba(255, 255, 255, 0.3)',
                              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ODD
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleOddEvenChoice('even')}
                            style={{
                              width: '190px',
                              height: '80px',
                              borderRadius: '50px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              backdropFilter: 'blur(10px)',
                              WebkitBackdropFilter: 'blur(10px)',
                              color: 'white',
                              fontFamily: 'Audiowide',
                              fontSize: '18px',
                              fontWeight: 'bold',
                              border: '2px solid rgba(255, 255, 255, 0.3)',
                              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            EVEN
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "Audiowide" }}>
                          Bot is choosing...
                        </h2>
                        <div className="animate-pulse text-white text-lg">
                          Please wait
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="gameplay-mobile"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="w-full flex flex-col items-center gap-4"
                  >
                    {/* Dice Area */}
                    <div className="flex justify-center gap-8 mb-6">
                      <motion.div
                        animate={dice1Animation}
                        transition={{
                          duration: 0.5,
                          ease: "easeInOut"
                        }}
                      >
                        <SlotMachineDice
                          diceNumber={1}
                          animationState={dice1Animation}
                          matchRollPhase={gameState.isPregame ? 'pregame' : 'gameplay'}
                          actualValue={gameState.diceOne}
                          isGameRolling={isRolling}
                          isTurnDecider={false}
                        />
                      </motion.div>
                      <motion.div
                        animate={dice2Animation}
                        transition={{
                          duration: 0.5,
                          ease: "easeInOut"
                        }}
                      >
                        <SlotMachineDice
                          diceNumber={2}
                          animationState={dice2Animation}
                          matchRollPhase={gameState.isPregame ? 'pregame' : 'gameplay'}
                          actualValue={gameState.diceTwo}
                          isGameRolling={isRolling}
                          isTurnDecider={false}
                        />
                      </motion.div>
                    </div>

                    {/* Game Actions */}
                    {currentPlayer.gameState.turnActive && (
                      <div className="flex gap-4">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleRollDice(false)}
                          disabled={isRolling}
                          style={{
                            width: '150px',
                            height: '60px',
                            borderRadius: '30px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            color: 'white',
                            fontFamily: 'Audiowide',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isRolling ? 0.5 : 1
                          }}
                        >
                          {isRolling ? 'Rolling...' : 'ROLL DICE'}
                        </motion.button>

                        {currentPlayer.gameState.roundScore > 0 && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleBankScore(false)}
                            disabled={isRolling}
                            style={{
                              width: '150px',
                              height: '60px',
                              borderRadius: '30px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              backdropFilter: 'blur(10px)',
                              WebkitBackdropFilter: 'blur(10px)',
                              color: 'white',
                              fontFamily: 'Audiowide',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              border: '2px solid rgba(255, 255, 255, 0.3)',
                              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: isRolling ? 0.5 : 1
                            }}
                          >
                            BANK ({currentPlayer.gameState.roundScore})
                          </motion.button>
                        )}
                      </div>
                    )}

                    {!currentPlayer.gameState.turnActive && (
                      <div className="text-center text-white text-xl" style={{ fontFamily: "Audiowide" }}>
                        Opponent's Turn
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 text-center py-4">
          <p className="text-white/60">Match ID: {matchId}</p>
        </footer>

      </div>
    </div>
  );
});

GuestMatch.displayName = 'GuestMatch';
export default GuestMatch;
