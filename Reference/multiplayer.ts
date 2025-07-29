import {
  doc,
  collection,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GameMatch, Player } from '@/types';

export class MultiplayerService {
  static async createMatch(hostId: string, hostName: string): Promise<string> {
    try {
      const matchData: Omit<GameMatch, 'id'> = {
        players: [hostId],
        status: 'waiting',
        gameData: {
          currentPlayer: hostId,
          diceRolls: [],
          scores: { [hostId]: 0 },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'matches'), {
        ...matchData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create players subcollection
      await addDoc(collection(db, 'matches', docRef.id, 'players'), {
        uid: hostId,
        displayName: hostName,
        avatar: '',
        isReady: false,
        isHost: true,
        joinedAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  static async joinMatch(matchId: string, playerId: string, playerName: string): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }

      const matchData = matchDoc.data();
      if (matchData.status !== 'waiting') {
        throw new Error('Match is not accepting new players');
      }

      // Add player to match
      await updateDoc(matchRef, {
        players: arrayUnion(playerId),
        updatedAt: serverTimestamp(),
      });

      // Add player to players subcollection
      await addDoc(collection(db, 'matches', matchId, 'players'), {
        uid: playerId,
        displayName: playerName,
        avatar: '',
        isReady: false,
        isHost: false,
        joinedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error joining match:', error);
      throw error;
    }
  }

  static async leaveMatch(matchId: string, playerId: string): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      
      // Remove player from match
      await updateDoc(matchRef, {
        players: arrayRemove(playerId),
        updatedAt: serverTimestamp(),
      });

      // Note: In a real implementation, you'd also remove the player document
      // from the players subcollection
    } catch (error) {
      console.error('Error leaving match:', error);
      throw error;
    }
  }

  static async updatePlayerReady(matchId: string, playerId: string, ready: boolean): Promise<void> {
    try {
      // In a real implementation, you'd update the specific player document
      // in the players subcollection based on the playerId
      console.log(`Player ${playerId} ready status: ${ready} in match ${matchId}`);
    } catch (error) {
      console.error('Error updating player ready status:', error);
      throw error;
    }
  }

  static async startGame(matchId: string): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        status: 'in-progress',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  }

  static async deleteMatch(matchId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'matches', matchId));
    } catch (error) {
      console.error('Error deleting match:', error);
      throw error;
    }
  }

  static onMatchChange(matchId: string, callback: (match: GameMatch | null) => void) {
    return onSnapshot(doc(db, 'matches', matchId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          id: doc.id,
          players: data.players || [],
          status: data.status || 'waiting',
          winner: data.winner,
          gameData: data.gameData || {
            currentPlayer: '',
            diceRolls: [],
            scores: {},
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      } else {
        callback(null);
      }
    });
  }

  static onPlayersChange(matchId: string, callback: (players: Player[]) => void) {
    return onSnapshot(collection(db, 'matches', matchId, 'players'), (snapshot) => {
      const players: Player[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        players.push({
          uid: data.uid,
          displayName: data.displayName,
          avatar: data.avatar,
          isReady: data.isReady,
        });
      });
      callback(players);
    });
  }
}
