import { 
  doc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface MatchData {
  id: string;
  hostData: {
    playerId: string;
    playerDisplayName: string;
    playerMatchBackgroundEquipped: string;
    matchData: {
      playerScore: number;
      turnActive: boolean;
    };
  };
  opponentData: {
    playerId: string;
    playerDisplayName: string;
    playerMatchBackgroundEquipped: string;
    matchData: {
      playerScore: number;
      turnActive: boolean;
    };
  };
  gameData: {
    gameMode: string;
    roundObjective: number;
    gamePhase: 'turnDecider' | 'gameplay' | 'gameOver';
    isRolling: boolean;
    rollPhase?: 'dice1' | 'dice2';
    diceOne: number | null;
    diceTwo: number | null;
    turnScore: number;
    turnDecider?: number;
    turnDeciderDice?: number;
    turnDeciderChoice?: 'odd' | 'even';
    winner?: string;
    gameOverReason?: string;
  };
  matchMetadata: {
    createdAt: Timestamp;
    lastActivity: Timestamp;
    status: 'active' | 'completed' | 'abandoned';
  };
}

export class MatchService {
  /**
   * Subscribe to real-time match updates
   */
  static subscribeToMatch(matchId: string, callback: (data: MatchData | null) => void) {
    const matchRef = doc(db, 'matches', matchId);
    
    return onSnapshot(matchRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() } as MatchData;
        callback(data);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error listening to match updates:', error);
      callback(null);
    });
  }

  /**
   * Roll dice with complete game rules implementation
   */
  static async rollDice(matchId: string, playerId: string): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    
    try {
      const matchSnapshot = await getDoc(matchRef);
      if (!matchSnapshot.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchSnapshot.data() as MatchData;
      
      // Validate it's the player's turn and game is in correct phase
      const isHost = matchData.hostData.playerId === playerId;
      const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
      
      if (!currentPlayer.matchData.turnActive || matchData.gameData.gamePhase !== 'gameplay') {
        throw new Error('Not your turn or invalid game phase');
      }
      
      // Start rolling animation
      await updateDoc(matchRef, {
        'gameData.isRolling': true,
        'gameData.rollPhase': 'dice1',
        'gameData.diceOne': null,
        'gameData.diceTwo': null,
        'matchMetadata.lastActivity': Timestamp.now()
      });
      
      // Roll first dice after animation delay
      setTimeout(async () => {
        const dice1 = Math.floor(Math.random() * 6) + 1;
        
        await updateDoc(matchRef, {
          'gameData.diceOne': dice1,
          'gameData.rollPhase': 'dice2'
        });
        
        // Roll second dice after first dice settles
        setTimeout(async () => {
          const dice2 = Math.floor(Math.random() * 6) + 1;
          
          await updateDoc(matchRef, {
            'gameData.diceTwo': dice2
          });
          
          // Process game rules after second dice settles
          setTimeout(async () => {
            await this.processGameRules(matchId, dice1, dice2, isHost);
          }, 1500); // Wait for dice animation to complete
          
        }, 1500); // Wait for first dice to settle
      }, 500); // Initial delay before first dice
      
    } catch (error) {
      console.error('Error rolling dice:', error);
      throw error;
    }
  }

  /**
   * Process game rules based on dice values
   */
  private static async processGameRules(matchId: string, dice1: number, dice2: number, isHost: boolean): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    
    try {
      const matchSnapshot = await getDoc(matchRef);
      if (!matchSnapshot.exists()) return;
      
      const matchData = matchSnapshot.data() as MatchData;
      const currentTurnScore = matchData.gameData.turnScore || 0;
      
      let newTurnScore = currentTurnScore;
      let turnOver = false;
      let resetPlayerScore = false;
      let gameOver = false;
      let winner = '';
      let gameOverReason = '';
      
      // Rule 1: Single 1 - Turn over, no score added
      if ((dice1 === 1 && dice2 !== 1) || (dice2 === 1 && dice1 !== 1)) {
        console.log('🎲 Single 1 rolled - Turn over, no score added');
        turnOver = true;
        newTurnScore = 0; // Don't add to player score
      }
      // Rule 2: Double 6 - Turn over, player score reset to 0
      else if (dice1 === 6 && dice2 === 6) {
        console.log('🎲 Double 6 rolled - Player score reset to 0');
        turnOver = true;
        resetPlayerScore = true;
        newTurnScore = 0;
      }
      // Rule 3: Double 1 (Snake Eyes) - +20 to turn score, continue playing
      else if (dice1 === 1 && dice2 === 1) {
        console.log('🎲 Snake Eyes rolled - +20 to turn score');
        newTurnScore = currentTurnScore + 20;
        turnOver = false; // Continue playing
      }
      // Normal scoring - add dice sum to turn score
      else {
        const diceSum = dice1 + dice2;
        newTurnScore = currentTurnScore + diceSum;
        console.log(`🎲 Normal roll: ${dice1} + ${dice2} = ${diceSum}, Turn score: ${newTurnScore}`);
        turnOver = false; // Continue playing
      }
      
      // Prepare updates
      const updates: any = {
        'gameData.isRolling': false,
        'gameData.rollPhase': null,
        'gameData.turnScore': newTurnScore,
        'matchMetadata.lastActivity': Timestamp.now()
      };
      
      // Handle turn over scenarios
      if (turnOver) {
        updates['gameData.turnScore'] = 0; // Reset turn score
        
        // Handle player score reset (double 6)
        if (resetPlayerScore) {
          if (isHost) {
            updates['hostData.matchData.playerScore'] = 0;
          } else {
            updates['opponentData.matchData.playerScore'] = 0;
          }
        }
        
        // Switch turns
        updates['hostData.matchData.turnActive'] = !isHost;
        updates['opponentData.matchData.turnActive'] = isHost;
      }
      
      await updateDoc(matchRef, updates);
      
    } catch (error) {
      console.error('Error processing game rules:', error);
    }
  }

  /**
   * Bank the current turn score to player score
   */
  static async bankScore(matchId: string, playerId: string): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    
    try {
      const matchSnapshot = await getDoc(matchRef);
      if (!matchSnapshot.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchSnapshot.data() as MatchData;
      
      // Validate it's the player's turn
      const isHost = matchData.hostData.playerId === playerId;
      const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
      
      if (!currentPlayer.matchData.turnActive || matchData.gameData.gamePhase !== 'gameplay') {
        throw new Error('Not your turn or invalid game phase');
      }
      
      if (matchData.gameData.turnScore <= 0) {
        throw new Error('No score to bank');
      }
      
      // Calculate new player score
      const newPlayerScore = currentPlayer.matchData.playerScore + matchData.gameData.turnScore;
      
      // Check for win condition
      const roundObjective = matchData.gameData.roundObjective || 100;
      let gameOver = false;
      let winner = '';
      
      if (newPlayerScore >= roundObjective) {
        gameOver = true;
        winner = currentPlayer.playerDisplayName;
      }
      
      // Prepare updates
      const updates: any = {
        'gameData.turnScore': 0,
        'matchMetadata.lastActivity': Timestamp.now()
      };
      
      // Update player score
      if (isHost) {
        updates['hostData.matchData.playerScore'] = newPlayerScore;
      } else {
        updates['opponentData.matchData.playerScore'] = newPlayerScore;
      }
      
      // Handle game over
      if (gameOver) {
        updates['gameData.gamePhase'] = 'gameOver';
        updates['gameData.winner'] = winner;
        updates['gameData.gameOverReason'] = `${winner} reached ${roundObjective} points!`;
        updates['matchMetadata.status'] = 'completed';
        
        // Both players lose turn
        updates['hostData.matchData.turnActive'] = false;
        updates['opponentData.matchData.turnActive'] = false;
      } else {
        // Switch turns
        updates['hostData.matchData.turnActive'] = !isHost;
        updates['opponentData.matchData.turnActive'] = isHost;
      }
      
      await updateDoc(matchRef, updates);
      
      console.log(`💰 Score banked: ${matchData.gameData.turnScore} points. New score: ${newPlayerScore}`);
      if (gameOver) {
        console.log(`🏆 Game Over! ${winner} wins!`);
      }
      
    } catch (error) {
      console.error('Error banking score:', error);
      throw error;
    }
  }

  /**
   * Make turn decider choice (odd/even)
   */
  static async makeTurnDeciderChoice(matchId: string, playerId: string, choice: 'odd' | 'even'): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    
    try {
      const matchSnapshot = await getDoc(matchRef);
      if (!matchSnapshot.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchSnapshot.data() as MatchData;
      
      if (matchData.gameData.gamePhase !== 'turnDecider') {
        throw new Error('Not in turn decider phase');
      }
      
      // Generate dice immediately when choice is made
      const dice = Math.floor(Math.random() * 6) + 1;
      
      console.log(`🎯 Turn decider choice: ${choice}, Dice rolled: ${dice}`);
      
      // Update choice and dice
      await updateDoc(matchRef, {
        'gameData.turnDeciderChoice': choice,
        'gameData.turnDeciderDice': dice,
        'matchMetadata.lastActivity': Timestamp.now()
      });
      
      // Process turn decider result after animation delay
      setTimeout(async () => {
        await this.processTurnDecider(matchId);
      }, 4000); // Longer delay to accommodate extended transition message
      
    } catch (error) {
      console.error('Error making turn decider choice:', error);
      throw error;
    }
  }

  /**
   * Process turn decider result
   */
  private static async processTurnDecider(matchId: string): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    
    try {
      const matchSnapshot = await getDoc(matchRef);
      if (!matchSnapshot.exists()) return;
      
      const matchData = matchSnapshot.data() as MatchData;
      
      // Ensure we have both choice and dice
      if (!matchData.gameData.turnDeciderChoice || !matchData.gameData.turnDeciderDice) {
        console.log('⚠️ Missing choice or dice for turn decider');
        return;
      }
      
      const dice = matchData.gameData.turnDeciderDice;
      const choice = matchData.gameData.turnDeciderChoice;
      const isOdd = dice % 2 === 1;
      const choiceCorrect = (choice === 'odd' && isOdd) || (choice === 'even' && !isOdd);
      
      // Determine who goes first
      const turnDeciderPlayer = matchData.gameData.turnDecider || 1;
      let hostGoesFirst = false;
      
      if (turnDeciderPlayer === 1) {
        // Host made choice
        hostGoesFirst = choiceCorrect;
      } else {
        // Opponent made choice
        hostGoesFirst = !choiceCorrect;
      }
      
      // Start gameplay phase
      await updateDoc(matchRef, {
        'gameData.gamePhase': 'gameplay',
        'gameData.turnScore': 0,
        'hostData.matchData.turnActive': hostGoesFirst,
        'opponentData.matchData.turnActive': !hostGoesFirst,
        'matchMetadata.lastActivity': Timestamp.now()
      });
      
      console.log(`🎯 Turn decider result: ${choice} on ${dice} (${isOdd ? 'odd' : 'even'}) - ${choiceCorrect ? 'Correct' : 'Incorrect'}`);
      console.log(`🎮 ${hostGoesFirst ? 'Host' : 'Opponent'} goes first`);
      
    } catch (error) {
      console.error('Error processing turn decider:', error);
    }
  }

  /**
   * Get match data by ID
   */
  static async getMatch(matchId: string): Promise<MatchData | null> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchSnapshot = await getDoc(matchRef);
      
      if (matchSnapshot.exists()) {
        return { id: matchSnapshot.id, ...matchSnapshot.data() } as MatchData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting match:', error);
      return null;
    }
  }
}
