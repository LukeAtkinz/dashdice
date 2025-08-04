'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GameService } from '@/services/gameService';

interface MatchProps {
  matchId: string;
  onBack: () => void;
}

interface MatchData {
  gameData: {
    turnDecider: number | null;
    turnScore: number;
    diceOne: number;
    diceTwo: number;
    roundObjective: number;
    startingScore: number;
    gameMode: string;
    status: string;
    isPregame?: boolean; // Optional for backwards compatibility
    chooserPlayerIndex?: number; // Optional for backwards compatibility
    oddEvenDieValue?: number | null; // Optional for backwards compatibility
    oddEvenChoice?: string | null; // Optional for backwards compatibility
  };
  hostData: {
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
  };
  opponentData: {
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
  };
}

export const Match: React.FC<MatchProps> = ({ matchId, onBack }) => {
  const { user } = useAuth();
  const { MatchBackgroundEquip } = useBackground();
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);

  console.log('🎮 Match: Component rendered with props:', { matchId, user: user?.uid });
  console.log('🔍 DEBUG: Match component entry point:', { matchId, userId: user?.uid });
  console.log('🔍 DEBUG: Match component context:', { matchData: !!matchData, isHost, loading });

  useEffect(() => {
    if (!matchId) return;

    console.log('🎮 Match: useEffect triggered with roomId:', matchId, 'user:', user?.uid);
    console.log('🎮 Match: Subscribing to match:', matchId);
    console.log('🔄 Match navigation detected - allowing match to load (refresh detection disabled)');

    // Listen to match updates
    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as MatchData;
        console.log('🎮 Match data updated (active):', data);
        console.log('🎮 Match: Received match data:', {
          isPregame: data.gameData?.isPregame,
          chooserPlayerIndex: data.gameData?.chooserPlayerIndex,
          oddEvenChoice: data.gameData?.oddEvenChoice,
          turnDecider: data.gameData?.turnDecider
        });
        setMatchData(data);
        
        // Determine if current user is host
        setIsHost(data.hostData.playerId === user?.uid);
      }
    });

    return () => unsubscribe();
  }, [matchId, user?.uid]);

  const handleOddEvenChoice = async (choice: 'odd' | 'even') => {
    if (!user?.uid || !matchData || loading) return;
    
    setLoading(true);
    try {
      console.log('🎯 Match: Making odd/even choice:', { choice, matchId, userId: user.uid });
      await GameService.makeOddEvenChoice(matchId, choice, user.uid);
    } catch (error) {
      console.error('❌ Match: Error making odd/even choice:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderBackground = () => {
    console.log('🎨 Match backgrounds:', { MatchBackgroundEquip });
    
    if (MatchBackgroundEquip) {
      if (MatchBackgroundEquip.type === 'video') {
        return (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
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
          background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
        }}
      />
    );
  };

  if (!matchData) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        {renderBackground()}
        <div className="relative z-20 text-white text-2xl">Loading match...</div>
      </div>
    );
  }

  const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
  const opponent = isHost ? matchData.opponentData : matchData.hostData;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {renderBackground()}
      
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
              {matchData.gameData.gameMode.toUpperCase()} MATCH
            </h1>
            <p className="text-lg">Objective: {matchData.gameData.roundObjective} points</p>
          </div>
          
          <div className="text-white text-right">
            <p>Turn: {matchData.gameData.turnDecider === 1 ? 'Host' : 'Opponent'}</p>
          </div>
        </header>

        {/* Game Area */}
        <main className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            
            {/* Current Player - Hidden on Mobile */}
            <div className={`hidden md:block text-center p-6 rounded-lg ${currentPlayer.gameState.turnActive ? 'bg-green-500/20 border-2 border-green-400' : 'bg-gray-500/20'}`}>
              <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "Audiowide" }}>
                {currentPlayer.playerDisplayName} (You)
              </h2>
              <div className="text-white space-y-2">
                <p>Score: {currentPlayer.gameState.playerScore}</p>
                <p>Round Score: {currentPlayer.gameState.roundScore}</p>
                <p className={currentPlayer.gameState.turnActive ? 'text-green-400 font-bold' : ''}>
                  {matchData.gameData.isPregame 
                    ? (matchData.gameData.chooserPlayerIndex === (isHost ? 1 : 2) ? 'CHOOSE ODD/EVEN' : 'WAITING...') 
                    : (currentPlayer.gameState.turnActive ? 'YOUR TURN' : 'Waiting...')
                  }
                </p>
              </div>
            </div>

            {/* Dice/Choice Area */}
            <div className="text-center col-span-1 md:col-span-1">
              <div className="bg-white/10 p-8 rounded-lg backdrop-blur-sm">
                {matchData.gameData.isPregame ? (
                  <>
                    <h3 className="text-xl text-white mb-4" style={{ fontFamily: "Audiowide" }}>
                      {matchData.gameData.oddEvenChoice ? 'DIE ROLLED' : 'CHOOSE ODD OR EVEN'}
                    </h3>
                    
                    {matchData.gameData.oddEvenDieValue ? (
                      <div className="flex justify-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-2xl font-bold">
                          {matchData.gameData.oddEvenDieValue}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center text-2xl font-bold text-white">
                          ?
                        </div>
                      </div>
                    )}
                    
                    {matchData.gameData.oddEvenChoice && (
                      <p className="text-white mb-4">
                        Choice: {matchData.gameData.oddEvenChoice.toUpperCase()}
                        {matchData.gameData.oddEvenDieValue && (
                          <>
                            <br />
                            Result: {matchData.gameData.oddEvenDieValue % 2 === 1 ? 'ODD' : 'EVEN'}
                            <br />
                            {((matchData.gameData.oddEvenChoice === 'odd') === (matchData.gameData.oddEvenDieValue % 2 === 1)) ? 'WIN!' : 'LOSE!'}
                          </>
                        )}
                      </p>
                    )}
                    
                    {!matchData.gameData.oddEvenChoice && matchData.gameData.chooserPlayerIndex === (isHost ? 1 : 2) && (
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
                    
                    {(!matchData.gameData.chooserPlayerIndex || matchData.gameData.chooserPlayerIndex !== (isHost ? 1 : 2)) && !matchData.gameData.oddEvenChoice && (
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
                        {matchData.gameData.diceOne || '?'}
                      </div>
                      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-2xl font-bold">
                        {matchData.gameData.diceTwo || '?'}
                      </div>
                    </div>
                    <p className="text-white mb-4">Turn Score: {matchData.gameData.turnScore}</p>
                    
                    {currentPlayer.gameState.turnActive && (
                      <div className="space-y-2">
                        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors">
                          Roll Dice
                        </button>
                        <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors">
                          Bank Score
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Opponent - Hidden on Mobile */}
            <div className={`hidden md:block text-center p-6 rounded-lg ${opponent.gameState.turnActive ? 'bg-red-500/20 border-2 border-red-400' : 'bg-gray-500/20'}`}>
              <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "Audiowide" }}>
                {opponent.playerDisplayName}
              </h2>
              <div className="text-white space-y-2">
                <p>Score: {opponent.gameState.playerScore}</p>
                <p>Round Score: {opponent.gameState.roundScore}</p>
                <p className={opponent.gameState.turnActive ? 'text-red-400 font-bold' : ''}>
                  {matchData.gameData.isPregame 
                    ? (matchData.gameData.chooserPlayerIndex === (isHost ? 2 : 1) ? 'CHOOSING...' : 'WAITING...') 
                    : (opponent.gameState.turnActive ? 'THEIR TURN' : 'Waiting...')
                  }
                </p>
              </div>
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
};
