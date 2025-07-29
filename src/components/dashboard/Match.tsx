'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { MatchService } from '@/services/matchService';
import { MatchData } from '@/types/match';
import { useNavigation } from '@/context/NavigationContext';
import { TurnDeciderPhase } from './TurnDeciderPhase';
import { GameplayPhase } from './GameplayPhase';
import { GameOverPhase } from './GameOverPhase';

interface MatchProps {
  gameMode?: string;
  roomId?: string;
}

export const Match: React.FC<MatchProps> = ({ gameMode, roomId }) => {
  const { user } = useAuth();
  const { DisplayBackgroundEquip } = useBackground();
  const { setCurrentSection } = useNavigation();
  
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dice animation states for slot machine effect
  const [dice1Animation, setDice1Animation] = useState<{
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
  }>({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });
  
  const [dice2Animation, setDice2Animation] = useState<{
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
  }>({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });

  // Turn decider dice animation
  const [turnDeciderDiceAnimation, setTurnDeciderDiceAnimation] = useState<{
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
  }>({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });

  // Subscribe to match updates
  useEffect(() => {
    if (!roomId || !user) return;

    console.log('🎮 Match: Subscribing to match:', roomId);
    setLoading(true);
    setError(null);

    const unsubscribe = MatchService.subscribeToMatch(roomId, (data) => {
      if (data) {
        console.log('🎮 Match: Received match data:', data);
        setMatchData(data);
        
        // Initialize game phase if needed
        if (!data.gameData.gamePhase) {
          MatchService.initializeGamePhase(roomId);
        }
      } else {
        console.error('❌ Match: No match data received');
        setError('Match not found');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId, user]);

  // Slot machine animation function
  const startSlotMachineAnimation = (
    diceNumber: 1 | 2 | 'turnDecider', 
    finalValue: number,
    animationDuration: number = 2000
  ) => {
    const setDiceState = diceNumber === 1 ? setDice1Animation : 
                        diceNumber === 2 ? setDice2Animation : 
                        setTurnDeciderDiceAnimation;
    
    // Start spinning
    setDiceState({
      isSpinning: true,
      currentNumber: Math.floor(Math.random() * 6) + 1,
      finalNumber: null,
      reelSpeed: 0.1
    });

    // Progressive deceleration animation with synchronized background reel
    let currentSpeed = 60;
    let intervalId: NodeJS.Timeout;
    let elapsedTime = 0;
    let reelAnimationSpeed = 0.1; // Background reel speed

    const animateReel = () => {
      setDiceState(prev => ({
        ...prev,
        currentNumber: Math.floor(Math.random() * 6) + 1
      }));
      
      elapsedTime += currentSpeed;
      const progress = elapsedTime / animationDuration;
      
      // Progressive deceleration
      if (progress < 0.7) {
        // Fast spinning phase (first 70% of time)
        currentSpeed = Math.max(60, 60 + (progress * 40)); // 60ms to 88ms
        reelAnimationSpeed = 0.1; // Fast background reel
      } else if (progress < 0.9) {
        // Deceleration phase (70% to 90% of time)
        const decelProgress = (progress - 0.7) / 0.2;
        currentSpeed = 88 + (decelProgress * 112); // 88ms to 200ms
        reelAnimationSpeed = 0.1 + (decelProgress * 0.4); // 0.1s to 0.5s
      } else {
        // Final slow phase (last 10% of time)
        const finalProgress = (progress - 0.9) / 0.1;
        currentSpeed = 200 + (finalProgress * 300); // 200ms to 500ms
        reelAnimationSpeed = 0.5 + (finalProgress * 1.5); // 0.5s to 2.0s
      }
      
      // Update the animation speed for the reel background
      setDiceState(prev => ({
        ...prev,
        currentNumber: Math.floor(Math.random() * 6) + 1,
        reelSpeed: reelAnimationSpeed // Add reel speed to state
      }));
      
      if (elapsedTime < animationDuration) {
        intervalId = setTimeout(animateReel, currentSpeed);
      }
    };

    animateReel();

    // Create "near miss" moments - show high value briefly
    const nearMissTimeout = setTimeout(() => {
      if (Math.random() < 0.7) { // 70% chance of near miss
        setDiceState(prev => ({
          ...prev,
          currentNumber: 6 // Briefly show a 6 for excitement
        }));
      }
    }, animationDuration * 0.6);

    // Show final result with overshoot effect
    setTimeout(() => {
      clearTimeout(intervalId);
      clearTimeout(nearMissTimeout);
      
      const overshoot = finalValue < 6 ? finalValue + 1 : finalValue - 1;
      setDiceState({
        isSpinning: false,
        currentNumber: overshoot,
        finalNumber: finalValue,
        reelSpeed: 0.1 // Reset reel speed
      });

      setTimeout(() => {
        setDiceState({
          isSpinning: false,
          currentNumber: finalValue,
          finalNumber: finalValue,
          reelSpeed: 0.1 // Reset reel speed
        });
      }, 300);
      
    }, animationDuration);
  };

  // Handle turn decider choice
  const handleTurnDeciderChoice = async (choice: 'odd' | 'even') => {
    if (!matchData || !user) return;
    
    try {
      // Use test user ID for testing
      const playerId = user.uid || 'test-user-1';
      await MatchService.makeTurnDeciderChoice(matchData.id!, playerId, choice);
    } catch (error) {
      console.error('❌ Error making turn decider choice:', error);
    }
  };

  // Handle dice roll
  const handleRollDice = async () => {
    if (!matchData || !user) return;
    
    try {
      // Use test user ID for testing
      const playerId = user.uid || 'test-user-1';
      
      // Debug logging
      console.log('🎲 Rolling dice...');
      console.log('Match Data:', matchData);
      console.log('Player ID:', playerId);
      console.log('Is Host:', matchData.hostData.playerId === playerId);
      console.log('Current Player:', matchData.hostData.playerId === playerId ? matchData.hostData : matchData.opponentData);
      console.log('Game Phase:', matchData.gameData.gamePhase);
      console.log('Host Turn Active:', matchData.hostData.turnActive);
      console.log('Opponent Turn Active:', matchData.opponentData?.turnActive);
      
      await MatchService.rollDice(matchData.id!, playerId);
    } catch (error) {
      console.error('❌ Error rolling dice:', error);
    }
  };

  // Handle bank score
  const handleBankScore = async () => {
    if (!matchData || !user) return;
    
    try {
      // Use test user ID for testing
      const playerId = user.uid || 'test-user-1';
      await MatchService.bankScore(matchData.id!, playerId);
    } catch (error) {
      console.error('❌ Error banking score:', error);
    }
  };

  // Handle leaving match
  const handleLeaveMatch = () => {
    setCurrentSection('dashboard');
  };

  // Trigger dice animations based on match data
  useEffect(() => {
    if (!matchData) return;

    // Turn decider dice animation
    if (matchData.gameData.gamePhase === 'turnDecider' && 
        matchData.gameData.turnDeciderChoice && 
        matchData.gameData.turnDeciderDice && 
        !turnDeciderDiceAnimation.isSpinning) {
      startSlotMachineAnimation('turnDecider', matchData.gameData.turnDeciderDice, 1500);
    }

    // Gameplay dice animations
    if (matchData.gameData.isRolling && matchData.gameData.rollPhase === 'dice1' && 
        matchData.gameData.diceOne > 0 && !dice1Animation.isSpinning) {
      startSlotMachineAnimation(1, matchData.gameData.diceOne, 2000);
    }

    if (matchData.gameData.isRolling && matchData.gameData.rollPhase === 'dice2' && 
        matchData.gameData.diceTwo > 0 && !dice2Animation.isSpinning) {
      startSlotMachineAnimation(2, matchData.gameData.diceTwo, 2500);
    }
  }, [
    matchData?.gameData.turnDeciderChoice, 
    matchData?.gameData.turnDeciderDice,
    matchData?.gameData.rollPhase,
    matchData?.gameData.diceOne,
    matchData?.gameData.diceTwo,
    matchData?.gameData.isRolling,
    dice1Animation.isSpinning,
    dice2Animation.isSpinning,
    turnDeciderDiceAnimation.isSpinning
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Audiowide" }}>
            Loading Match...
          </h2>
          <p className="text-gray-300">Connecting to game server</p>
        </div>
      </div>
    );
  }

  if (error || !matchData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "Audiowide" }}>
            Match Error
          </h2>
          <p className="text-red-300 mb-6">{error || 'Match not found'}</p>
          <button
            onClick={handleLeaveMatch}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            style={{ fontFamily: "Audiowide" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Determine current player data (for testing, treat user as host)
  const isHost = matchData.hostData.playerId === user?.uid || matchData.hostData.playerId === 'test-user-1';
  const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
  const opponent = isHost ? matchData.opponentData : matchData.hostData;

  // Arena background style
  const arenaBackgroundStyle = DisplayBackgroundEquip?.file ? {
    backgroundImage: DisplayBackgroundEquip.type !== 'video' ? `url(${DisplayBackgroundEquip.file})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {
    background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
  };

  // Player background style
  const getPlayerBackgroundStyle = (background: any) => {
    if (!background?.url) {
      return {
        background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
      };
    }
    
    return background.isVideo ? {} : {
      backgroundImage: `url(${background.url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  };

  // Mock player backgrounds for demo
  const playerBackgrounds = [
    {
      id: 'All For Glory',
      name: 'All For Glory',
      url: '/backgrounds/All For Glory.jpg',
      isVideo: false
    },
    {
      id: 'Long Road Ahead',
      name: 'Long Road Ahead', 
      url: '/backgrounds/Long Road Ahead.jpg',
      isVideo: false
    }
  ];

  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      style={arenaBackgroundStyle}
    >
      {/* Arena Background Video */}
      {DisplayBackgroundEquip?.file && DisplayBackgroundEquip.type === 'video' && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover -z-10"
        >
          <source src={DisplayBackgroundEquip.file} type="video/mp4" />
        </video>
      )}

      {/* Main Game Layout */}
      <div className="relative w-full h-full flex flex-col">
        
        {/* Top Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={handleLeaveMatch}
              className="flex items-center gap-2 px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-colors"
              style={{ fontFamily: 'Audiowide' }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 7v4H5.83l2.88-2.88-1.42-1.41L2 12l5.29 5.29 1.42-1.41L5.83 13H19v4l5-5-5-5z"/>
              </svg>
              Exit Match
            </button>
            
            <div className="text-center">
              <h1 className="text-6xl font-bold text-white" style={{ fontFamily: 'Audiowide' }}>
                {gameMode?.toUpperCase() || 'MATCH'}
              </h1>
            </div>
            
            <div className="w-32"></div> {/* Spacer for center alignment */}
          </div>
        </div>

        {/* Game Arena */}
        <div className="flex-1 flex items-center justify-center p-8 pt-24">
          <div className="flex items-center justify-between gap-8" style={{ width: 'calc(100vw - 160px)' }}>
            
            {/* Player 1 (Current User - Left Side) */}
            <div className="flex-1 max-w-[500px]">
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
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4"
                style={{ 
                  borderColor: currentPlayer.turnActive ? '#00ff00' : '#ffffff',
                  height: '500px'
                }}
              >
                {/* Player Background */}
                <div 
                  className="absolute inset-0"
                  style={getPlayerBackgroundStyle(playerBackgrounds[0])}
                >
                  {/* Background Video */}
                  {playerBackgrounds[0]?.isVideo && (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover"
                    >
                      <source src={playerBackgrounds[0].url} type="video/mp4" />
                    </video>
                  )}
                </div>

                {/* Player Info Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Match Score - Large and Centered */}
                  <div 
                    className="text-8xl font-bold text-white"
                    style={{ 
                      fontFamily: 'Audiowide',
                      textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                    }}
                  >
                    {currentPlayer.playerScore}
                  </div>
                </div>

                {/* Turn Indicator */}
                {matchData.gameData.gamePhase === 'gameplay' && currentPlayer.turnActive && (
                  <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                    YOUR TURN
                  </div>
                )}

                {/* Turn Decider Indicator */}
                {matchData.gameData.gamePhase === 'turnDecider' && (
                  <div className="absolute top-4 left-4">
                    {(() => {
                      const playerNumber = isHost ? 1 : 2;
                      const isPlayerTurn = matchData.gameData.turnDecider === playerNumber;
                      
                      if (isPlayerTurn && !matchData.gameData.turnDeciderChoice) {
                        return (
                          <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                            CHOOSE
                          </div>
                        );
                      }
                      return null;
                    })()}
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
                  EPIC
                </span>
              </div>
            </div>

            {/* Center Dice Area */}
            <div className="flex flex-col items-center justify-center min-w-0" style={{ alignSelf: 'center' }}>
              {/* Phase-specific content */}
              {matchData.gameData.gamePhase === 'turnDecider' && (
                <TurnDeciderPhase
                  matchData={matchData}
                  currentPlayer={currentPlayer}
                  opponent={opponent}
                  isHost={isHost}
                  diceAnimation={turnDeciderDiceAnimation}
                  onChoiceSelect={handleTurnDeciderChoice}
                />
              )}

              {matchData.gameData.gamePhase === 'gameplay' && (
                <GameplayPhase
                  matchData={matchData}
                  currentPlayer={currentPlayer}
                  opponent={opponent}
                  isHost={isHost}
                  dice1Animation={dice1Animation}
                  dice2Animation={dice2Animation}
                  onRollDice={handleRollDice}
                  onBankScore={handleBankScore}
                />
              )}

              {matchData.gameData.gamePhase === 'gameOver' && (
                <GameOverPhase
                  matchData={matchData}
                  onLeaveMatch={handleLeaveMatch}
                />
              )}
            </div>

            {/* Player 2 (Opponent - Right Side) */}
            <div className="flex-1 max-w-[500px]">
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
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4"
                style={{ 
                  borderColor: opponent.turnActive ? '#00ff00' : '#ffffff',
                  height: '500px'
                }}
              >
                {/* Player Background */}
                <div 
                  className="absolute inset-0"
                  style={getPlayerBackgroundStyle(playerBackgrounds[1])}
                >
                  {/* Background Video */}
                  {playerBackgrounds[1]?.isVideo && (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover"
                    >
                      <source src={playerBackgrounds[1].url} type="video/mp4" />
                    </video>
                  )}
                </div>

                {/* Player Info Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Match Score - Large and Centered */}
                  <div 
                    className="text-8xl font-bold text-white"
                    style={{ 
                      fontFamily: 'Audiowide',
                      textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                    }}
                  >
                    {opponent.playerScore}
                  </div>
                </div>

                {/* Turn Indicator */}
                {matchData.gameData.gamePhase === 'gameplay' && opponent.turnActive && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                    THEIR TURN
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
        </div>
      </div>
    </div>
  );
};
