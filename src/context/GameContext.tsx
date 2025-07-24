'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GameState, GamePlayer, GameContextType } from '@/types';
import { useAuth } from './AuthContext';

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: React.ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentGame, setCurrentGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGame = async (): Promise<string> => {
    if (!user) {
      throw new Error('User must be logged in to create a game');
    }

    try {
      setLoading(true);
      setError(null);

      const gamePlayer: GamePlayer = {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        avatar: user.photoURL,
        score: 0,
        ready: false,
      };

      const gameData = {
        players: [gamePlayer],
        currentPlayer: user.uid,
        status: 'waiting' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const gameRef = await addDoc(collection(db, 'games'), gameData);
      return gameRef.id;
    } catch (err) {
      console.error('Error creating game:', err);
      setError('Failed to create game');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async (gameId: string) => {
    if (!user) {
      throw new Error('User must be logged in to join a game');
    }

    try {
      setLoading(true);
      setError(null);

      const gameRef = doc(db, 'games', gameId);
      
      // Check if user is already in the game
      if (currentGame?.players.some(player => player.uid === user.uid)) {
        return;
      }

      const newPlayer: GamePlayer = {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        avatar: user.photoURL,
        score: 0,
        ready: false,
      };

      const updatedPlayers = [...(currentGame?.players || []), newPlayer];

      await updateDoc(gameRef, {
        players: updatedPlayers,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error joining game:', err);
      setError('Failed to join game');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const leaveGame = async () => {
    if (!user || !currentGame) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const gameRef = doc(db, 'games', currentGame.gameId);
      const updatedPlayers = currentGame.players.filter(player => player.uid !== user.uid);

      if (updatedPlayers.length === 0) {
        // Delete the game if no players left
        await deleteDoc(gameRef);
      } else {
        // Update the game with remaining players
        const updateData: any = {
          players: updatedPlayers,
          updatedAt: serverTimestamp(),
        };

        // If the leaving player was the current player, assign to next player
        if (currentGame.currentPlayer === user.uid && updatedPlayers.length > 0) {
          updateData.currentPlayer = updatedPlayers[0].uid;
        }

        await updateDoc(gameRef, updateData);
      }

      setCurrentGame(null);
    } catch (err) {
      console.error('Error leaving game:', err);
      setError('Failed to leave game');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePlayerReady = async (ready: boolean) => {
    if (!user || !currentGame) {
      throw new Error('No active game to update');
    }

    try {
      setLoading(true);
      setError(null);

      const gameRef = doc(db, 'games', currentGame.gameId);
      const updatedPlayers = currentGame.players.map(player =>
        player.uid === user.uid ? { ...player, ready } : player
      );

      // Check if all players are ready and start the game
      const allReady = updatedPlayers.every(player => player.ready);
      const updateData: any = {
        players: updatedPlayers,
        updatedAt: serverTimestamp(),
      };

      if (allReady && updatedPlayers.length >= 2) {
        updateData.status = 'active';
      }

      await updateDoc(gameRef, updateData);
    } catch (err) {
      console.error('Error updating player ready status:', err);
      setError('Failed to update ready status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Listen to current game changes
  useEffect(() => {
    if (!user || !currentGame?.gameId) {
      return;
    }

    const gameRef = doc(db, 'games', currentGame.gameId);
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const gameData = doc.data();
        setCurrentGame({
          gameId: doc.id,
          players: gameData.players || [],
          currentPlayer: gameData.currentPlayer,
          status: gameData.status,
          createdAt: gameData.createdAt?.toDate() || new Date(),
          updatedAt: gameData.updatedAt?.toDate() || new Date(),
          winner: gameData.winner,
        });
      } else {
        setCurrentGame(null);
      }
    }, (err) => {
      console.error('Error listening to game changes:', err);
      setError('Failed to sync game state');
    });

    return unsubscribe;
  }, [user, currentGame?.gameId]);

  // Listen for games where the user is a player
  useEffect(() => {
    if (!user) {
      setCurrentGame(null);
      return;
    }

    // Simplified query without orderBy to avoid index requirement temporarily
    const gamesQuery = query(
      collection(db, 'games'),
      where('players', 'array-contains-any', [user.uid])
      // orderBy('updatedAt', 'desc') // Commented out temporarily
    );

    const unsubscribe = onSnapshot(gamesQuery, (snapshot) => {
      if (!snapshot.empty) {
        // Sort manually in JavaScript instead of Firestore
        const sortedDocs = snapshot.docs.sort((a, b) => {
          const aTime = a.data().updatedAt?.toDate() || new Date(0);
          const bTime = b.data().updatedAt?.toDate() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });
        const latestGame = sortedDocs[0];
        const gameData = latestGame.data();
        
        // Only set if the user is actually in the players array
        const userInGame = gameData.players.some((player: GamePlayer) => player.uid === user.uid);
        
        if (userInGame) {
          setCurrentGame({
            gameId: latestGame.id,
            players: gameData.players || [],
            currentPlayer: gameData.currentPlayer,
            status: gameData.status,
            createdAt: gameData.createdAt?.toDate() || new Date(),
            updatedAt: gameData.updatedAt?.toDate() || new Date(),
            winner: gameData.winner,
          });
        }
      }
    }, (err) => {
      console.error('Error listening to user games:', err);
      setError('Failed to sync user games');
    });

    return unsubscribe;
  }, [user]);

  const value: GameContextType = {
    currentGame,
    loading,
    error,
    createGame,
    joinGame,
    leaveGame,
    updatePlayerReady,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
