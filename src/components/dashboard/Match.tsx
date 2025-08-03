'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { MatchService } from '@/services/matchService';
import { MatchData } from '@/types/match';
import { useNavigation } from '@/context/NavigationContext';
import { TurnDeciderPhase } from './TurnDeciderPhase';
import { GameplayPhase } from './GameplayPhase';
import { GameOverWrapper } from './GameOverWrapper';

interface MatchProps {
  gameMode?: string;
  roomId?: string;
}

export const Match: React.FC<MatchProps> = ({ gameMode, roomId }) => {
  console.log('🎮 Match: Component rendered with props:', { gameMode, roomId });
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();
  
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Connection and leaving states
  const [disconnectedPlayer, setDisconnectedPlayer] = useState<{
    playerId: string;
    playerDisplayName: string;
  } | null>(null);
  const [inactivityCountdown, setInactivityCountdown] = useState<number | null>(null);
  
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
    console.log('🎮 Match: useEffect triggered with roomId:', roomId, 'user:', user?.uid);
    if (!roomId || !user) {
      console.log('🎮 Match: Early return - missing roomId or user');
      return;
    }

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

    // Dynamically import and start heartbeat for current player
    import('@/services/playerHeartbeatService').then(({ PlayerHeartbeatService }) => {
      if (PlayerHeartbeatService && typeof PlayerHeartbeatService.startHeartbeat === 'function') {
        PlayerHeartbeatService.startHeartbeat(roomId, user.uid);
      } else {
        console.error('❌ PlayerHeartbeatService is not available:', PlayerHeartbeatService);
      }
    }).catch(error => {
      console.error('❌ Failed to import PlayerHeartbeatService:', error);
    });
    
    // Monitor player connections
    let connectionUnsubscribe = () => {}; // Default empty function
    import('@/services/playerHeartbeatService').then(({ PlayerHeartbeatService }) => {
      if (PlayerHeartbeatService && typeof PlayerHeartbeatService.monitorPlayerConnections === 'function') {
        connectionUnsubscribe = PlayerHeartbeatService.monitorPlayerConnections(
          roomId,
          user.uid,
          (playerId: string, playerDisplayName: string) => {
            console.log('🔌 Player disconnected:', playerDisplayName);
            setDisconnectedPlayer({ playerId, playerDisplayName });
          },
          (timeLeft: number) => {
            console.log('⏰ Inactivity warning:', timeLeft, 'seconds left');
            setInactivityCountdown(timeLeft);
          },
          (winnerId: string, winnerDisplayName: string) => {
            console.log('🏆 Match ended due to inactivity, winner:', winnerDisplayName);
            // End the match and go to game over screen
            MatchService.endMatch(roomId, winnerId).then(() => {
              console.log('✅ Match ended successfully');
            });
          }
        );
      } else {
        console.error('❌ PlayerHeartbeatService.monitorPlayerConnections is not available');
      }
    }).catch(error => {
      console.error('❌ Failed to import PlayerHeartbeatService for monitoring:', error);
    });

    return () => {
      unsubscribe();
      connectionUnsubscribe();
      import('@/services/playerHeartbeatService').then(({ PlayerHeartbeatService }) => {
        if (PlayerHeartbeatService && typeof PlayerHeartbeatService.cleanup === 'function') {
          PlayerHeartbeatService.cleanup();
        }
      }).catch(error => {
        console.error('❌ Failed to import PlayerHeartbeatService for cleanup:', error);
      });
    };
  }, [roomId, user]);

  // Slot machine animation function
  /*
   * 🎰 DICE REEL ANIMATION SYSTEM
   * 
   * Animation Durations:
   * - Dice 1 & 2: 1200ms (1.2 seconds)
   * - Turn Decider: 1500ms (1.5 seconds)
   * 
   * 3-Phase Speed Progression:
   * 
   * Phase 1 (0-70%): Fast Spinning
   * - Speed: 60ms → 88ms intervals
   * - Background Reel: 0.1s (very fast)
   * 
   * Phase 2 (70-90%): Deceleration  
   * - Speed: 88ms → 200ms intervals
   * - Background Reel: 0.1s → 0.5s (slowing)
   * 
   * Phase 3 (90-100%): Final Slow
   * - Speed: 200ms → 500ms intervals  
   * - Background Reel: 0.5s → 2.0s (very slow)
   * 
   * Special Effects:
   * - Near Miss: Triggered at 60% duration
   * - Overshoot: Shows wrong number briefly
   * - Tick-Back: 300ms pause before final result
   */
  const startSlotMachineAnimation = (
    diceNumber: 1 | 2 | 'turnDecider', 
    finalValue: number,
    animationDuration: number = 1200 // Default to 1200ms for dice 1 & 2
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

    // 🎰 3-Phase Progressive Deceleration System
    let currentSpeed = 60; // Initial speed: 60ms intervals
    let intervalId: NodeJS.Timeout;
    let elapsedTime = 0;
    let reelAnimationSpeed = 0.1; // Background reel speed: very fast

    const animateReel = () => {
      setDiceState(prev => ({
        ...prev,
        currentNumber: Math.floor(Math.random() * 6) + 1
      }));
      
      elapsedTime += currentSpeed;
      const progress = elapsedTime / animationDuration;
      
      // 🎰 Phase 1 - Fast Spinning (0-70% of duration)
      if (progress < 0.7) {
        // Speed: 60ms → 88ms intervals
        currentSpeed = 60 + (progress / 0.7) * 28; // Linear interpolation: 60ms to 88ms
        reelAnimationSpeed = 0.1; // Background reel: 0.1s (very fast)
      } 
      // 🎰 Phase 2 - Deceleration (70-90% of duration)
      else if (progress < 0.9) {
        const decelProgress = (progress - 0.7) / 0.2; // 0-1 over 20% of duration
        // Speed: 88ms → 200ms intervals
        currentSpeed = 88 + (decelProgress * 112);
        // Background reel: 0.1s → 0.5s (slowing down)
        reelAnimationSpeed = 0.1 + (decelProgress * 0.4);
      } 
      // 🎰 Phase 3 - Final Slow (90-100% of duration)
      else {
        const finalProgress = (progress - 0.9) / 0.1; // 0-1 over last 10% of duration
        // Speed: 200ms → 500ms intervals
        currentSpeed = 200 + (finalProgress * 300);
        // Background reel: 0.5s → 2.0s (very slow)
        reelAnimationSpeed = 0.5 + (finalProgress * 1.5);
      }
      
      // Update the animation speed for the reel background
      setDiceState(prev => ({
        ...prev,
        currentNumber: Math.floor(Math.random() * 6) + 1,
        reelSpeed: reelAnimationSpeed // Synchronized background reel speed
      }));
      
      if (elapsedTime < animationDuration) {
        intervalId = setTimeout(animateReel, currentSpeed);
      }
    };

    animateReel();

    // 🎰 Near Miss Timing - Triggered at 60% of animation duration
    const nearMissTimeout = setTimeout(() => {
      if (Math.random() < 0.7) { // 70% chance of near miss
        setDiceState(prev => ({
          ...prev,
          currentNumber: 6 // Briefly show a 6 for excitement
        }));
      }
    }, animationDuration * 0.6); // Exactly 60% of duration

    // 🎰 Overshoot Effect - Shows wrong number briefly before final value
    setTimeout(() => {
      clearTimeout(intervalId);
      clearTimeout(nearMissTimeout);
      
      // Show wrong number briefly (overshoot effect)
      const overshoot = finalValue < 6 ? finalValue + 1 : finalValue - 1;
      setDiceState({
        isSpinning: false,
        currentNumber: overshoot,
        finalNumber: finalValue,
        reelSpeed: 0.1 // Reset reel speed
      });

      // 🎰 Tick-Back Delay - 150ms pause before showing final result
      setTimeout(() => {
        setDiceState({
          isSpinning: false,
          currentNumber: finalValue,
          finalNumber: finalValue,
          reelSpeed: 0.1 // Reset reel speed
        });
      }, 150); // Reduced from 300ms to 150ms for smoother transition
      
    }, animationDuration);
  };

  // Handle turn decider choice
  const handleTurnDeciderChoice = async (choice: 'odd' | 'even') => {
    if (!matchData) return;
    
    try {
      // Use the actual authenticated user ID
      const playerId = user?.uid;
      
      if (!playerId) {
        console.error('❌ No authenticated user found');
        return;
      }
      
      await MatchService.makeTurnDeciderChoice(matchData.id!, playerId, choice);
    } catch (error) {
      console.error('❌ Error making turn decider choice:', error);
    }
  };

  // Handle dice roll
  const handleRollDice = async () => {
    if (!matchData) return;
    
    try {
      // Use the actual authenticated user ID
      const playerId = user?.uid;
      
      if (!playerId) {
        console.error('❌ No authenticated user found');
        return;
      }
      
      // Debug logging
      console.log('🎲 Rolling dice...');
      console.log('Match Data:', matchData);
      console.log('Player ID (authenticated user):', playerId);
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
    if (!matchData) return;
    
    try {
      // Use the actual authenticated user ID
      const playerId = user?.uid;
      
      if (!playerId) {
        console.error('❌ No authenticated user found');
        return;
      }
      
      await MatchService.bankScore(matchData.id!, playerId);
    } catch (error) {
      console.error('❌ Error banking score:', error);
    }
  };

  // Trigger dice animations based on match data
  useEffect(() => {
    if (!matchData) return;

    // Turn decider dice animation
    if (matchData.gameData.gamePhase === 'turnDecider' && 
        matchData.gameData.turnDeciderChoice && 
        matchData.gameData.turnDeciderDice && 
        !turnDeciderDiceAnimation.isSpinning) {
      // 🎰 Animation Durations per specification:
      // Turn Decider Dice: 1500ms (1.5 seconds)
      startSlotMachineAnimation('turnDecider', matchData.gameData.turnDeciderDice, 1500);
    }

    // Gameplay dice animations - Simplified with immediate values
    if (matchData.gameData.isRolling && matchData.gameData.rollPhase === 'dice1' && 
        matchData.gameData.diceOne > 0 && !dice1Animation.isSpinning) {
      // 🎰 Animation Durations per specification:
      // Both Dice 1 & 2: 1200ms (1.2 seconds)
      startSlotMachineAnimation(1, matchData.gameData.diceOne, 1200);
    }

    if (matchData.gameData.isRolling && matchData.gameData.rollPhase === 'dice2' && 
        matchData.gameData.diceTwo > 0 && !dice2Animation.isSpinning &&
        dice2Animation.finalNumber !== matchData.gameData.diceTwo) {
      // 🎰 Animation Durations per specification:
      // Both Dice 1 & 2: 1200ms (1.2 seconds)
      console.log('🎲 Starting Dice 2 animation with value:', matchData.gameData.diceTwo);
      startSlotMachineAnimation(2, matchData.gameData.diceTwo, 1200);
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
            onClick={() => setCurrentSection('dashboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            style={{ fontFamily: "Audiowide" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Determine current player data using authenticated user ID
  const isHost = matchData.hostData.playerId === user?.uid;
  const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
  const opponent = isHost ? matchData.opponentData : matchData.hostData;

  // Debug logging for background data
  console.log('🎨 Match backgrounds:', {
    currentPlayerBackground: currentPlayer.matchBackgroundEquipped,
    opponentBackground: opponent.matchBackgroundEquipped,
    currentPlayerRarity: currentPlayer.matchBackgroundEquipped?.rarity,
    opponentRarity: opponent.matchBackgroundEquipped?.rarity
  });

  return (
    <div className="w-full flex flex-col items-center justify-start gap-[2rem] pt-[1rem] pb-[2rem] min-h-screen">
      {/* Game Arena */}
      <div className="flex items-center justify-center p-4">
          <div className="flex items-center justify-between gap-8" style={{ width: '95vw' }}>
            
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
                {/* Grey overlay for disconnected player */}
                {disconnectedPlayer?.playerId === currentPlayer.playerId && (
                  <div 
                    className="absolute inset-0 z-20"
                    style={{
                      background: 'rgba(128, 128, 128, 0.7)',
                      backdropFilter: 'grayscale(100%)'
                    }}
                  />
                )}
                
                {/* Player Background */}
                {currentPlayer.matchBackgroundEquipped ? (
                  currentPlayer.matchBackgroundEquipped.type === 'video' ? (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    >
                      <source src={currentPlayer.matchBackgroundEquipped.file} type="video/mp4" />
                    </video>
                  ) : (
                    <img
                      src={currentPlayer.matchBackgroundEquipped.file}
                      alt={currentPlayer.matchBackgroundEquipped.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )
                ) : (
                  /* Default gradient background */
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
                    }}
                  />
                )}
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
                  {currentPlayer.matchBackgroundEquipped?.rarity || 'COMMON'}
                </span>
              </div>
              
              {/* Leaving/Countdown Message - Below Rarity */}
              {(disconnectedPlayer?.playerId === currentPlayer.playerId || 
                (inactivityCountdown !== null && currentPlayer.playerId !== user?.uid)) && (
                <div 
                  className="mt-2 text-left"
                  style={{
                    display: 'flex',
                    width: '190px',
                    height: '45px',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    borderRadius: '10px',
                    background: 'linear-gradient(90deg, #FF0000 0%, #CC0000 100%)',
                    border: '2px solid #FF4444',
                    boxShadow: '0px 0px 10px rgba(255, 0, 0, 0.5)'
                  }}
                >
                  <span style={{
                    alignSelf: 'stretch',
                    color: '#FFF',
                    textAlign: 'center',
                    fontFamily: 'Orbitron',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 700,
                    lineHeight: '22px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                  }}>
                    {disconnectedPlayer?.playerId === currentPlayer.playerId 
                      ? `${currentPlayer.playerDisplayName} has left`
                      : inactivityCountdown !== null && currentPlayer.playerId !== user?.uid
                      ? `${inactivityCountdown}s remaining`
                      : ''
                    }
                  </span>
                </div>
              )}
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
                <GameOverWrapper
                  matchId={matchData.id || ''}
                  onLeaveMatch={() => setCurrentSection('dashboard')}
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
                {/* Grey overlay for disconnected player */}
                {disconnectedPlayer?.playerId === opponent.playerId && (
                  <div 
                    className="absolute inset-0 z-20"
                    style={{
                      background: 'rgba(128, 128, 128, 0.7)',
                      backdropFilter: 'grayscale(100%)'
                    }}
                  />
                )}
                
                {/* Player Background */}
                {opponent.matchBackgroundEquipped ? (
                  opponent.matchBackgroundEquipped.type === 'video' ? (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    >
                      <source src={opponent.matchBackgroundEquipped.file} type="video/mp4" />
                    </video>
                  ) : (
                    <img
                      src={opponent.matchBackgroundEquipped.file}
                      alt={opponent.matchBackgroundEquipped.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )
                ) : (
                  /* Default gradient background */
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
                    }}
                  />
                )}
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
                  {opponent.matchBackgroundEquipped?.rarity || 'COMMON'}
                </span>
              </div>
              
              {/* Leaving/Countdown Message - Below Rarity */}
              {(disconnectedPlayer?.playerId === opponent.playerId || 
                (inactivityCountdown !== null && opponent.playerId !== user?.uid)) && (
                <div 
                  className="mt-2 text-right ml-auto"
                  style={{
                    display: 'flex',
                    width: '190px',
                    height: '45px',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    borderRadius: '10px',
                    background: 'linear-gradient(90deg, #FF0000 0%, #CC0000 100%)',
                    border: '2px solid #FF4444',
                    boxShadow: '0px 0px 10px rgba(255, 0, 0, 0.5)'
                  }}
                >
                  <span style={{
                    alignSelf: 'stretch',
                    color: '#FFF',
                    textAlign: 'center',
                    fontFamily: 'Orbitron',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 700,
                    lineHeight: '22px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                  }}>
                    {disconnectedPlayer?.playerId === opponent.playerId 
                      ? `${opponent.playerDisplayName} has left`
                      : inactivityCountdown !== null && opponent.playerId !== user?.uid
                      ? `${inactivityCountdown}s remaining`
                      : ''
                    }
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
    </div>
  );
};
