'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export const GameLobby: React.FC = () => {
  const { user } = useAuth();
  const { currentGame, loading, createGame, joinGame, leaveGame, updatePlayerReady } = useGame();

  const handleCreateGame = async () => {
    try {
      await createGame();
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const handleJoinGame = async () => {
    const gameId = prompt('Enter Game ID:');
    if (gameId) {
      try {
        await joinGame(gameId);
      } catch (error) {
        console.error('Error joining game:', error);
        alert('Failed to join game. Please check the Game ID and try again.');
      }
    }
  };

  const handleLeaveGame = async () => {
    try {
      await leaveGame();
    } catch (error) {
      console.error('Error leaving game:', error);
    }
  };

  const handleToggleReady = async () => {
    if (!currentGame || !user) return;
    
    const currentPlayer = currentGame.players.find(p => p.uid === user.uid);
    if (currentPlayer) {
      try {
        await updatePlayerReady(!currentPlayer.ready);
      } catch (error) {
        console.error('Error updating ready status:', error);
      }
    }
  };

  const currentPlayer = currentGame?.players.find(p => p.uid === user?.uid);
  const allPlayersReady = currentGame?.players.every(p => p.ready) && currentGame.players.length >= 2;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentGame) {
    return (
      <div className="space-y-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Game Lobby</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              Start a new game or join an existing one!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCreateGame}>
                Create New Game
              </Button>
              <Button variant="outline" onClick={handleJoinGame}>
                Join Game
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Game Lobby - {currentGame.gameId}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Players ({currentGame.players.length})</h3>
              <div className="space-y-2">
                {currentGame.players.map((player) => (
                  <div
                    key={player.uid}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {player.displayName[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{player.displayName}</span>
                      {player.uid === user?.uid && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Score: {player.score}</span>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          player.ready ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={player.ready ? 'Ready' : 'Not Ready'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {currentPlayer && (
                  <Button
                    onClick={handleToggleReady}
                    variant={currentPlayer.ready ? 'secondary' : 'primary'}
                  >
                    {currentPlayer.ready ? 'Not Ready' : 'Ready'}
                  </Button>
                )}
                
                <Button variant="outline" onClick={handleLeaveGame}>
                  Leave Game
                </Button>
              </div>

              {allPlayersReady && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">
                    🎉 All players are ready! The game will start soon...
                  </p>
                </div>
              )}

              {currentGame.status === 'waiting' && currentGame.players.length < 2 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">
                    Waiting for more players to join. Share this Game ID: <strong>{currentGame.gameId}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
