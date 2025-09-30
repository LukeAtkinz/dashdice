'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { guestBotMatchmaking, GuestMatchData } from '@/services/guestBotMatchmaking';

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
  const [matchData, setMatchData] = useState<GuestMatchData | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    isPregame: true,
    chooserPlayerIndex: 1, // Guest player chooses first
    oddEvenChoice: null,
    oddEvenDieValue: null,
    turnDecider: null,
    turnScore: 0,
    diceOne: 0,
    diceTwo: 0,
    roundObjective: 100,
    startingScore: 0,
    gameMode: 'quickfire',
    status: 'active'
  });
  const [currentPlayer, setCurrentPlayer] = useState<PlayerData | null>(null);
  const [opponent, setOpponent] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);

  // Memoize game mode display name function
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

  useEffect(() => {
    if (!matchId) return;

    // Get the match data
    const match = guestBotMatchmaking.getGuestMatch(matchId);
    if (!match) {
      console.error('No match data found for matchId:', matchId);
      onBack();
      return;
    }

    setMatchData(match);
    
    // Initialize game state
    setGameState(prev => ({
      ...prev,
      gameMode: match.gameMode,
      roundObjective: match.gameMode === 'quickfire' ? 50 : 100
    }));

    // Initialize players to match real Match component structure
    const guestPlayerData: PlayerData = {
      playerDisplayName: match.guestPlayer.displayName,
      playerId: match.guestPlayer.id,
      displayBackgroundEquipped: '/backgrounds/New Day.mp4',
      matchBackgroundEquipped: '/backgrounds/New Day.mp4',
      playerStats: {
        bestStreak: 0,
        currentStreak: 0,
        gamesPlayed: 1,
        matchWins: 0
      },
      gameState: {
        turnActive: true,
        playerScore: match.gameState?.scores[match.guestPlayer.id] || 0,
        roundScore: 0
      }
    };

    const botPlayerData: PlayerData = {
      playerDisplayName: match.botOpponent.displayName,
      playerId: match.botOpponent.id,
      displayBackgroundEquipped: '/backgrounds/New Day.mp4',
      matchBackgroundEquipped: '/backgrounds/New Day.mp4',
      playerStats: {
        bestStreak: Math.floor(Math.random() * 10),
        currentStreak: Math.floor(Math.random() * 5),
        gamesPlayed: Math.floor(Math.random() * 50) + 10,
        matchWins: Math.floor(Math.random() * 30) + 5
      },
      gameState: {
        turnActive: false,
        playerScore: match.gameState?.scores[match.botOpponent.id] || 0,
        roundScore: 0
      },
      isBot: true
    };

    setCurrentPlayer(guestPlayerData);
    setOpponent(botPlayerData);
  }, [matchId, onBack]);

  const handleOddEvenChoice = useCallback(async (choice: 'odd' | 'even') => {
    if (loading) return;
    
    setLoading(true);
    try {
      console.log('🎯 Guest Match: Making odd/even choice:', { choice, matchId });
      
      // Update game state with choice
      setGameState(prev => ({
        ...prev,
        oddEvenChoice: choice
      }));

      // Simulate die roll after a short delay
      setTimeout(() => {
        const dieValue = Math.floor(Math.random() * 6) + 1;
        const isOdd = dieValue % 2 === 1;
        const playerWins = (choice === 'odd' && isOdd) || (choice === 'even' && !isOdd);

        setGameState(prev => ({
          ...prev,
          oddEvenDieValue: dieValue,
          turnDecider: playerWins ? 1 : 2,
          isPregame: false
        }));

        // Update turn active states
        setCurrentPlayer(prev => prev ? {
          ...prev,
          gameState: {
            ...prev.gameState,
            turnActive: playerWins
          }
        } : null);

        setOpponent(prev => prev ? {
          ...prev,
          gameState: {
            ...prev.gameState,
            turnActive: !playerWins
          }
        } : null);

        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('❌ Guest Match: Error making odd/even choice:', error);
      setLoading(false);
    }
  }, [loading, matchId]);

  const handleRollDice = useCallback(() => {
    if (!currentPlayer?.gameState.turnActive || loading) return;

    setLoading(true);

    // Simulate dice roll
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const rollTotal = dice1 + dice2;

    setGameState(prev => ({
      ...prev,
      diceOne: dice1,
      diceTwo: dice2,
      turnScore: prev.turnScore + rollTotal
    }));

    setCurrentPlayer(prev => prev ? {
      ...prev,
      gameState: {
        ...prev.gameState,
        roundScore: prev.gameState.roundScore + rollTotal
      }
    } : null);

    setLoading(false);
  }, [currentPlayer, loading]);

  const handleBankScore = useCallback(() => {
    if (!currentPlayer?.gameState.turnActive || loading) return;

    setLoading(true);

    const newScore = currentPlayer.gameState.playerScore + currentPlayer.gameState.roundScore;

    // Update player score and reset round score
    setCurrentPlayer(prev => prev ? {
      ...prev,
      gameState: {
        ...prev.gameState,
        playerScore: newScore,
        roundScore: 0,
        turnActive: false
      }
    } : null);

    // Reset turn score and switch turns
    setGameState(prev => ({
      ...prev,
      turnScore: 0,
      turnDecider: prev.turnDecider === 1 ? 2 : 1
    }));

    // Check for win condition
    if (newScore >= gameState.roundObjective) {
      setGameState(prev => ({ ...prev, status: 'finished' }));
      setTimeout(() => onBack(), 3000);
      setLoading(false);
      return;
    }

    // Switch to bot turn
    setOpponent(prev => prev ? {
      ...prev,
      gameState: {
        ...prev.gameState,
        turnActive: true
      }
    } : null);

    // Simulate bot turn after delay
    setTimeout(() => {
      simulateBotTurn();
    }, 2000);

    setLoading(false);
  }, [currentPlayer, gameState.roundObjective, onBack, loading]);

  const simulateBotTurn = useCallback(() => {
    if (!opponent?.gameState.turnActive) return;

    // Bot decision making (simple AI)
    const shouldContinue = Math.random() > 0.3; // 70% chance to continue
    const botRoundScore = opponent.gameState.roundScore;

    if (shouldContinue && botRoundScore < 20) {
      // Bot rolls dice
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const rollTotal = dice1 + dice2;

      setGameState(prev => ({
        ...prev,
        diceOne: dice1,
        diceTwo: dice2,
        turnScore: rollTotal
      }));

      setOpponent(prev => prev ? {
        ...prev,
        gameState: {
          ...prev.gameState,
          roundScore: prev.gameState.roundScore + rollTotal
        }
      } : null);

      // Continue bot turn or bank
      setTimeout(() => {
        if (Math.random() > 0.4) {
          simulateBotTurn();
        } else {
          botBankScore();
        }
      }, 1500);
    } else {
      // Bot banks score
      botBankScore();
    }
  }, [opponent]);

  const botBankScore = useCallback(() => {
    if (!opponent) return;

    const newScore = opponent.gameState.playerScore + opponent.gameState.roundScore;

    setOpponent(prev => prev ? {
      ...prev,
      gameState: {
        ...prev.gameState,
        playerScore: newScore,
        roundScore: 0,
        turnActive: false
      }
    } : null);

    setGameState(prev => ({
      ...prev,
      turnScore: 0,
      turnDecider: 1
    }));

    // Check for bot win condition
    if (newScore >= gameState.roundObjective) {
      setGameState(prev => ({ ...prev, status: 'finished' }));
      setTimeout(() => onBack(), 3000);
      return;
    }

    // Switch back to player
    setCurrentPlayer(prev => prev ? {
      ...prev,
      gameState: {
        ...prev.gameState,
        turnActive: true
      }
    } : null);
  }, [opponent, gameState.roundObjective, onBack]);

  const renderBackground = useMemo(() => {
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
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/backgrounds/New Day.mp4" type="video/mp4" />
      </video>
    );
  }, []);

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
            ← Back
          </button>
          
          <div className="text-white text-center">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "Audiowide" }}>
              {getGameModeDisplayName(gameState.gameMode)} MATCH
            </h1>
            <p className="text-lg">Objective: {gameState.roundObjective} points</p>
          </div>
          
          <div className="text-white text-right">
            <p>Turn: {gameState.turnDecider === 1 ? 'Guest' : 'Bot'}</p>
          </div>
        </header>

        {/* Game Area */}
        <main className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            
            {/* Current Player - Hidden on Mobile */}
            <div className={`hidden md:block text-center p-6 rounded-lg ${currentPlayer.gameState.turnActive ? 'bg-green-500/20 border-2 border-green-400' : 'bg-gray-500/20'}`}>
              <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "Audiowide" }}>
                {currentPlayer.playerDisplayName}
              </h2>
              <div className="text-white space-y-2">
                <p>Score: {currentPlayer.gameState.playerScore}</p>
                <p>Round Score: {currentPlayer.gameState.roundScore}</p>
                {gameState.gameMode !== 'true-grit' && gameState.gameMode !== 'last-line' && (
                  <p className={currentPlayer.gameState.turnActive ? 'text-green-400 font-bold' : ''}>
                    {gameState.isPregame 
                      ? (gameState.chooserPlayerIndex === 1 ? 'CHOOSE ODD/EVEN' : 'WAITING...') 
                      : (currentPlayer.gameState.turnActive ? 'YOUR TURN' : 'Waiting...')
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Dice/Choice Area */}
            <div className="text-center col-span-1 md:col-span-1">
              <div className="bg-white/10 p-8 rounded-lg backdrop-blur-sm">
                {gameState.isPregame ? (
                  <>
                    <h3 className="text-xl text-white mb-4" style={{ fontFamily: "Audiowide" }}>
                      {gameState.oddEvenChoice ? 'DIE ROLLED' : 'CHOOSE ODD OR EVEN'}
                    </h3>
                    
                    {gameState.oddEvenDieValue ? (
                      <div className="flex justify-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-2xl font-bold">
                          {gameState.oddEvenDieValue}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center text-2xl font-bold text-white">
                          ?
                        </div>
                      </div>
                    )}
                    
                    {gameState.oddEvenChoice && (
                      <p className="text-white mb-4">
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
                    
                    {!gameState.oddEvenChoice && gameState.chooserPlayerIndex === 1 && (
                      <div className="flex flex-col md:flex-row justify-center gap-4">
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
                    
                    {gameState.chooserPlayerIndex !== 1 && !gameState.oddEvenChoice && (
                      <p className="text-white/70 text-lg">
                        Waiting for opponent to choose...
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-xl text-white mb-4" style={{ fontFamily: "Audiowide" }}>DICE</h3>
                    <div className="flex justify-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-2xl font-bold">
                        {gameState.diceOne || '?'}
                      </div>
                      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-2xl font-bold">
                        {gameState.diceTwo || '?'}
                      </div>
                    </div>
                    <p className="text-white mb-4">Turn Score: {gameState.turnScore}</p>
                    
                    {currentPlayer.gameState.turnActive && (
                      <div className="space-y-2">
                        <button 
                          onClick={handleRollDice}
                          disabled={loading}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors disabled:opacity-50"
                        >
                          Roll Dice
                        </button>
                        {currentPlayer.gameState.roundScore > 0 && (
                          <button 
                            onClick={handleBankScore}
                            disabled={loading}
                            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors disabled:opacity-50"
                          >
                            Bank Score
                          </button>
                        )}
                      </div>
                    )}

                    {gameState.status === 'finished' && (
                      <div className="text-center">
                        <h2 className="text-2xl text-white mb-4" style={{ fontFamily: "Audiowide" }}>
                          {currentPlayer.gameState.playerScore >= gameState.roundObjective ? 'YOU WIN!' : 'BOT WINS!'}
                        </h2>
                        <p className="text-white">Returning to dashboard...</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Opponent - Hidden on Mobile */}
            <div className={`hidden md:block text-center p-6 rounded-lg ${opponent.gameState.turnActive ? 'bg-red-500/20 border-2 border-red-400' : 'bg-gray-500/20'}`}>
              <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "Audiowide" }}>
                {opponent.playerDisplayName} 🤖
              </h2>
              <div className="text-white space-y-2">
                <p>Score: {opponent.gameState.playerScore}</p>
                <p>Round Score: {opponent.gameState.roundScore}</p>
                {gameState.gameMode !== 'true-grit' && gameState.gameMode !== 'last-line' && (
                  <p className={opponent.gameState.turnActive ? 'text-red-400 font-bold' : ''}>
                    {gameState.isPregame 
                      ? (gameState.chooserPlayerIndex === 2 ? 'CHOOSING...' : 'WAITING...') 
                      : (opponent.gameState.turnActive ? 'THEIR TURN' : 'Waiting...')
                    }
                  </p>
                )}
              </div>
            </div>

          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 text-center py-4">
          <p className="text-white/60">Guest Bot Match - {matchId}</p>
        </footer>

      </div>
    </div>
  );
});

// Add display name for debugging
GuestMatch.displayName = 'GuestMatch';