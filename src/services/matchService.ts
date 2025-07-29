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
  increment,
  deleteField
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { MatchData, GamePhase, RollPhase, TurnDeciderChoice } from '@/types/match';

export class MatchService {
  /**
   * Subscribe to real-time match updates
   */
  static subscribeToMatch(matchId: string, callback: (data: MatchData | null) => void) {
    const matchRef = doc(db, 'matches', matchId);
    
    return onSnapshot(matchRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() } as MatchData;
        
        // Validate required fields before passing data
        if (data.gameData && data.hostData && data.opponentData) {
          console.log('🎮 Match data updated:', data);
          callback(data);
        } else {
          console.error('❌ Invalid match data structure:', data);
          callback(null);
        }
      } else {
        console.log('❌ Match not found:', matchId);
        callback(null);
      }
    }, (error) => {
      console.error('❌ Error listening to match updates:', error);
      callback(null);
    });
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
      console.error('❌ Error getting match:', error);
      return null;
    }
  }

  /**
   * Initialize game phase for turn decider (if needed)
   * This adapts existing matches to work with the new game phases
   */
  static async initializeGamePhase(matchId: string): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchSnapshot = await getDoc(matchRef);
      
      if (!matchSnapshot.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchSnapshot.data() as MatchData;
      
      // If gamePhase doesn't exist, initialize it based on current state
      if (!matchData.gameData.gamePhase) {
        const updates: any = {
          'gameData.gamePhase': 'turnDecider',
          'gameData.isRolling': false,
          'gameData.turnScore': matchData.gameData.turnScore || 0
        };
        
        await updateDoc(matchRef, updates);
        console.log('🎮 Initialized game phase for match:', matchId);
      }
    } catch (error) {
      console.error('❌ Error initializing game phase:', error);
      throw error;
    }
  }

  /**
   * Make turn decider choice (odd/even) - Compatible with existing turnDecider system
   */
  static async makeTurnDeciderChoice(matchId: string, playerId: string, choice: TurnDeciderChoice): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    
    try {
      const matchSnapshot = await getDoc(matchRef);
      if (!matchSnapshot.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchSnapshot.data() as MatchData;
      
      // Validate current phase
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
        'gameData.isRolling': true, // Start dice animation
      });
      
      // Process turn decider result after animation delay
      setTimeout(async () => {
        await this.processTurnDecider(matchId);
      }, 3000); // Allow time for dice animation
      
    } catch (error) {
      console.error('❌ Error making turn decider choice:', error);
      throw error;
    }
  }

  /**
   * Process turn decider result - Integrates with existing turn system
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
      
      // Use existing turnDecider system (1 = host, 2 = opponent)
      const turnDeciderPlayer = matchData.gameData.turnDecider || 1;
      let hostGoesFirst = false;
      
      if (turnDeciderPlayer === 1) {
        // Host made choice
        hostGoesFirst = choiceCorrect;
      } else {
        // Opponent made choice
        hostGoesFirst = !choiceCorrect;
      }
      
      // Start gameplay phase with existing turn system
      await updateDoc(matchRef, {
        'gameData.gamePhase': 'gameplay',
        'gameData.isRolling': false,
        'gameData.turnScore': 0,
        'hostData.turnActive': hostGoesFirst,
        'opponentData.turnActive': !hostGoesFirst,
      });
      
      console.log(`🎯 Turn decider result: ${choice} on ${dice} (${isOdd ? 'odd' : 'even'}) - ${choiceCorrect ? 'Correct' : 'Incorrect'}`);
      console.log(`🎮 ${hostGoesFirst ? 'Host' : 'Opponent'} goes first`);
      
    } catch (error) {
      console.error('❌ Error processing turn decider:', error);
    }
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
      
      if (!currentPlayer.turnActive || matchData.gameData.gamePhase !== 'gameplay') {
        throw new Error('Not your turn or invalid game phase');
      }
      
      // 🎰 Generate dice values upfront for proper animation coordination
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      
      // Start rolling animation with dice values provided immediately
      await updateDoc(matchRef, {
        'gameData.isRolling': true,
        'gameData.rollPhase': 'dice1',
        'gameData.diceOne': dice1, // Provide value immediately for animation
        'gameData.diceTwo': 0, // Will be revealed when dice2 phase starts
      });
      
      // 🎰 Wait for Dice 1 animation (1200ms) then reveal Dice 2
      setTimeout(async () => {
        await updateDoc(matchRef, {
          'gameData.rollPhase': 'dice2',
          'gameData.diceTwo': dice2 // Provide dice2 value for animation
        });
        
        // 🎰 Wait for Dice 2 animation (1200ms) then process game rules
        setTimeout(async () => {
          await this.processGameRules(matchId, dice1, dice2, isHost);
        }, 1200); // Wait for dice2 animation to complete (1200ms)
        
      }, 1200); // Wait for dice1 animation to complete (1200ms)
      
    } catch (error) {
      console.error('❌ Error rolling dice:', error);
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
      
      // Game Rules Processing
      const currentMultiplier = matchData.gameData.hasDoubleMultiplier || false;
      
      // Rule 1: Single 1 - Turn over, no score added (clears multiplier)
      if ((dice1 === 1 && dice2 !== 1) || (dice2 === 1 && dice1 !== 1)) {
        console.log('🎲 Single 1 rolled - Turn over, no score added');
        turnOver = true;
        newTurnScore = 0; // Don't add to player score
      }
      // Rule 2: Double 6 - Turn over, player score reset to 0 (clears multiplier)
      else if (dice1 === 6 && dice2 === 6) {
        console.log('🎲 Double 6 rolled - Player score reset to 0');
        turnOver = true;
        resetPlayerScore = true;
        newTurnScore = 0;
      }
      // Rule 3: Double 1 (Snake Eyes) - +20 to turn score, continue playing (no multiplier effect)
      else if (dice1 === 1 && dice2 === 1) {
        console.log('🎲 Snake Eyes rolled - +20 to turn score');
        newTurnScore = currentTurnScore + 20;
        turnOver = false; // Continue playing
      }
      // Rule 4: Other Doubles (22, 33, 44, 55) - Set 2x multiplier and add dice sum
      else if (dice1 === dice2) {
        const diceSum = dice1 + dice2;
        const scoreToAdd = currentMultiplier ? diceSum * 2 : diceSum;
        newTurnScore = currentTurnScore + scoreToAdd;
        console.log(`🎲 Double ${dice1}s rolled - ${diceSum} points${currentMultiplier ? ' (2x multiplier already active)' : ''}, 2x multiplier activated for rest of turn`);
        turnOver = false; // Continue playing
        // Multiplier will be set in updates below
      }
      // Normal scoring - add dice sum to turn score (apply multiplier if active)
      else {
        const diceSum = dice1 + dice2;
        const scoreToAdd = currentMultiplier ? diceSum * 2 : diceSum;
        newTurnScore = currentTurnScore + scoreToAdd;
        console.log(`🎲 Normal roll: ${dice1} + ${dice2} = ${diceSum}${currentMultiplier ? ' (x2 = ' + scoreToAdd + ')' : ''}, Turn score: ${newTurnScore}`);
        turnOver = false; // Continue playing
      }
      
      // Prepare updates
      const updates: any = {
        'gameData.isRolling': false,
        'gameData.rollPhase': deleteField(), // Use deleteField() instead of null
        'gameData.turnScore': newTurnScore,
      };
      
      // Handle double multiplier logic
      if (dice1 === dice2 && dice1 !== 1 && dice1 !== 6) {
        // Set multiplier for doubles (22, 33, 44, 55)
        updates['gameData.hasDoubleMultiplier'] = true;
      } else if (turnOver) {
        // Clear multiplier when turn ends
        updates['gameData.hasDoubleMultiplier'] = false;
      }
      // Note: Snake eyes (11) doesn't affect multiplier state
      
      // Handle turn over scenarios
      if (turnOver) {
        updates['gameData.turnScore'] = 0; // Reset turn score
        
        // Handle player score reset (double 6)
        if (resetPlayerScore) {
          if (isHost) {
            updates['hostData.playerScore'] = 0;
          } else {
            updates['opponentData.playerScore'] = 0;
          }
        }
        
        // Switch turns using existing system
        updates['hostData.turnActive'] = !isHost;
        updates['opponentData.turnActive'] = isHost;
      }
      
      await updateDoc(matchRef, updates);
      
    } catch (error) {
      console.error('❌ Error processing game rules:', error);
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
      
      if (!currentPlayer.turnActive || matchData.gameData.gamePhase !== 'gameplay') {
        throw new Error('Not your turn or invalid game phase');
      }
      
      if (matchData.gameData.turnScore <= 0) {
        throw new Error('No score to bank');
      }
      
      // Calculate new player score
      const newPlayerScore = currentPlayer.playerScore + matchData.gameData.turnScore;
      
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
        'gameData.hasDoubleMultiplier': false, // Clear multiplier when banking
      };
      
      // Update player score
      if (isHost) {
        updates['hostData.playerScore'] = newPlayerScore;
      } else {
        updates['opponentData.playerScore'] = newPlayerScore;
      }
      
      // Handle game over
      if (gameOver) {
        updates['gameData.gamePhase'] = 'gameOver';
        updates['gameData.winner'] = winner;
        updates['gameData.gameOverReason'] = `${winner} reached ${roundObjective} points!`;
        updates['gameData.status'] = 'completed';
        
        // Both players lose turn
        updates['hostData.turnActive'] = false;
        updates['opponentData.turnActive'] = false;
      } else {
        // Switch turns using existing system
        updates['hostData.turnActive'] = !isHost;
        updates['opponentData.turnActive'] = isHost;
      }
      
      await updateDoc(matchRef, updates);
      
      console.log(`💰 Score banked: ${matchData.gameData.turnScore} points. New score: ${newPlayerScore}`);
      if (gameOver) {
        console.log(`🏆 Game Over! ${winner} wins!`);
      }
      
    } catch (error) {
      console.error('❌ Error banking score:', error);
      throw error;
    }
  }
}
