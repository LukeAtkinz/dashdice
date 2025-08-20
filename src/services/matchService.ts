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
import { UserService } from './userService';
import { CompletedMatchService } from './completedMatchService';
import { GameModeService } from './gameModeService';

export class MatchService {
  /**
   * Update user stats when a match ends
   */
  private static async updateUserStats(matchData: MatchData, winnerId: string): Promise<void> {
    try {
      console.log('📊 MatchService: Updating user stats for match completion');
      
      const hostId = matchData.hostData.playerId;
      const opponentId = matchData.opponentData.playerId;
      
      // Skip stats updates for test users
      const isTestMatch = hostId.startsWith('test-user-') || opponentId.startsWith('test-user-');
      if (isTestMatch) {
        console.log('🧪 MatchService: Skipping stats update for test match');
        return;
      }
      
      // Update gamesPlayed for both players
      const gamePlayedPromises = [
        UserService.updateGamePlayed(hostId),
        UserService.updateGamePlayed(opponentId)
      ];
      await Promise.all(gamePlayedPromises);
      
      // Update win/loss stats
      if (winnerId === hostId) {
        // Host wins, opponent loses
        await Promise.all([
          UserService.updateMatchWin(hostId),
          UserService.updateMatchLoss(opponentId)
        ]);
        console.log('🏆 MatchService: Host wins - stats updated');
      } else if (winnerId === opponentId) {
        // Opponent wins, host loses
        await Promise.all([
          UserService.updateMatchWin(opponentId),
          UserService.updateMatchLoss(hostId)
        ]);
        console.log('🏆 MatchService: Opponent wins - stats updated');
      }
      
      console.log('✅ MatchService: User stats update completed');
    } catch (error) {
      console.error('❌ MatchService: Error updating user stats:', error);
      // Don't throw error to prevent match completion from failing
    }
  }

  /**
   * Subscribe to real-time match updates
   * Checks both active matches and completed matches collections
   */
  static subscribeToMatch(matchId: string, callback: (data: MatchData | null) => void) {
    console.log('🔍 MatchService: Starting subscription for match:', matchId);
    
    let activeUnsubscribe: (() => void) | null = null;
    let completedUnsubscribe: (() => void) | null = null;
    let hasFoundMatch = false;
    
    // First, try to subscribe to active matches
    const matchRef = doc(db, 'matches', matchId);
    activeUnsubscribe = onSnapshot(matchRef, async (snapshot) => {
      if (snapshot.exists()) {
        if (!hasFoundMatch) {
          hasFoundMatch = true;
        }
        const data = { id: snapshot.id, ...snapshot.data() } as MatchData;
        
        // Validate required fields before passing data
        if (data.gameData && data.hostData && data.opponentData) {
          console.log('🎮 Match data updated (active):', data);
          callback(data);
        } else {
          console.error('❌ Invalid match data structure:', data);
          callback(null);
        }
      } else if (!snapshot.exists() && !hasFoundMatch) {
        // Match not found in active collection, check completed collection
        console.log('🔍 Match not in active collection, checking completed matches...');
        
        // Try to find in completed matches
        const completedMatchRef = doc(db, 'completedmatches', matchId);
        completedUnsubscribe = onSnapshot(completedMatchRef, (completedSnapshot) => {
          if (completedSnapshot.exists()) {
            hasFoundMatch = true;
            const data = { id: completedSnapshot.id, ...completedSnapshot.data() } as MatchData;
            
            // Validate required fields before passing data
            if (data.gameData && data.hostData && data.opponentData) {
              console.log('🎮 Match data found in completed collection:', data);
              callback(data);
            } else {
              console.error('❌ Invalid completed match data structure:', data);
              callback(null);
            }
          } else if (!hasFoundMatch) {
            console.log('❌ Match not found in either active or completed collections:', matchId);
            callback(null);
          }
        }, (error) => {
          console.error('❌ Error listening to completed match updates:', error);
          if (!hasFoundMatch) {
            callback(null);
          }
        });
      }
    }, (error) => {
      console.error('❌ Error listening to active match updates:', error);
      if (!hasFoundMatch) {
        callback(null);
      }
    });
    
    // Return cleanup function that unsubscribes from both listeners
    return () => {
      console.log('🧹 MatchService: Cleaning up subscriptions for match:', matchId);
      if (activeUnsubscribe) {
        activeUnsubscribe();
      }
      if (completedUnsubscribe) {
        completedUnsubscribe();
      }
    };
  }

  /**
   * Get match data by ID
   * Checks both active matches and completed matches collections
   */
  static async getMatch(matchId: string): Promise<MatchData | null> {
    try {
      console.log('🔍 MatchService: Getting match data for:', matchId);
      
      // First try active matches
      const matchRef = doc(db, 'matches', matchId);
      const matchSnapshot = await getDoc(matchRef);
      
      if (matchSnapshot.exists()) {
        console.log('✅ MatchService: Found match in active collection');
        return { id: matchSnapshot.id, ...matchSnapshot.data() } as MatchData;
      }
      
      // If not found in active, try completed matches
      console.log('🔍 MatchService: Match not in active collection, checking completed...');
      const completedMatchRef = doc(db, 'completedmatches', matchId);
      const completedMatchSnapshot = await getDoc(completedMatchRef);
      
      if (completedMatchSnapshot.exists()) {
        console.log('✅ MatchService: Found match in completed collection');
        return { id: completedMatchSnapshot.id, ...completedMatchSnapshot.data() } as MatchData;
      }
      
      console.log('❌ MatchService: Match not found in either collection');
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
      console.log('📝 Updating match document with choice and dice...');
      
      // Update choice and dice
      await updateDoc(matchRef, {
        'gameData.turnDeciderChoice': choice,
        'gameData.turnDeciderDice': dice,
        'gameData.isRolling': true, // Start dice animation
      });
      
      console.log('✅ Firebase update completed successfully');
      
      // Process turn decider result after animation delay
      setTimeout(async () => {
        console.log('⏰ Processing turn decider result after animation delay...');
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
      
      // Use chooserPlayerIndex system (1 = host, 2 = opponent)
      const chooserPlayer = matchData.gameData.chooserPlayerIndex || 1;
      let hostGoesFirst = false;
      
      if (chooserPlayer === 1) {
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
      
      // 🎰 Generate dice values with special logic for True Grit mode
      let dice1, dice2;
      
      if (matchData.gameMode === 'true-grit') {
        // Special dice generation for True Grit - reduce single 1 probability
        dice1 = this.generateTrueGritDice();
        dice2 = this.generateTrueGritDice();
        
        // If we get a single 1, make sure the other die isn't also 1 (unless both start as 1)
        if ((dice1 === 1 && dice2 !== 1) || (dice2 === 1 && dice1 !== 1)) {
          // 70% chance to reroll the single 1 to a different number
          if (Math.random() < 0.7) {
            if (dice1 === 1) {
              dice1 = Math.floor(Math.random() * 5) + 2; // 2-6
            } else {
              dice2 = Math.floor(Math.random() * 5) + 2; // 2-6
            }
          }
        }
      } else {
        // Normal dice generation for other modes
        dice1 = Math.floor(Math.random() * 6) + 1;
        dice2 = Math.floor(Math.random() * 6) + 1;
      }
      
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
   * Generate weighted dice for True Grit mode - slightly increase probability of rolling 1
   */
  private static generateTrueGritDice(): number {
    const random = Math.random();
    
    // Weighted probability distribution for True Grit
    // 1: 12% chance (slightly higher than 8% but less than normal 16.67%)
    // 2-6: ~17.6% each (slightly less than normal)
    if (random < 0.12) return 1;
    if (random < 0.296) return 2;  // 0.12 + 0.176
    if (random < 0.472) return 3;  // 0.296 + 0.176
    if (random < 0.648) return 4;  // 0.472 + 0.176
    if (random < 0.824) return 5;  // 0.648 + 0.176
    return 6;                      // 0.824 + 0.176 = 1.0
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
      const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
      const currentPlayerScore = currentPlayer.playerScore || 0;
      
      // Get game mode configuration
      const gameMode = await GameModeService.getGameMode(matchData.gameMode || 'classic');
      if (!gameMode) {
        console.error('❌ Game mode not found:', matchData.gameMode);
        return;
      }
      
      let newTurnScore = currentTurnScore;
      let turnOver = false;
      let resetPlayerScore = false;
      let gameOver = false;
      let winner = '';
      let gameOverReason = '';
      let eliminatePlayer = false;
      let opponentScoreBonus = 0; // For Zero Hour doubles that affect opponent
      let tripleMultiplier = false; // For Double 3 in Zero Hour (3x instead of 2x)
      let stackingMultiplier = 0; // For True Grit stacking multipliers
      
      // Calculate dice values and check for patterns
      const diceSum = dice1 + dice2;
      const isDouble = dice1 === dice2;
      const isSingleOne = (dice1 === 1 && dice2 !== 1) || (dice2 === 1 && dice1 !== 1);
      const isDoubleOne = dice1 === 1 && dice2 === 1;
      const isDoubleSix = dice1 === 6 && dice2 === 6;
      
      // Process roll using game mode service for special elimination rules
      if (isSingleOne && gameMode.rules.eliminationRules.singleOne) {
        console.log('🎲 Single 1 rolled - Player eliminated');
        eliminatePlayer = true;
        turnOver = true;
        newTurnScore = 0;
      }
      // Handle double 1 (Snake Eyes or Turn End)
      else if (isDoubleOne) {
        if (gameMode.rules.eliminationRules.doubleOne) {
          // This case should not happen for True Grit since doubleOne is false
          console.log('🎲 Double 1 rolled - Turn over (elimination rule)');
          turnOver = true;
          newTurnScore = 0;
        } else if (gameMode.id === 'true-grit') {
          // True Grit: Double 1 is +20 and activates 2x stacking multiplier
          console.log('🎲 True Grit Double 1 - +20 to turn score, 2x multiplier activated');
          newTurnScore = currentTurnScore + 20;
          turnOver = false;
          // Will handle stacking multiplier later
          stackingMultiplier = 2;
        } else if (gameMode.id === 'zero-hour') {
          // Zero Hour: Double 1 is -20 to turn score and activate 2x multiplier
          console.log('🎲 Snake Eyes rolled in Zero Hour - -20 to turn score, 2x activated');
          newTurnScore = currentTurnScore - 20;
          turnOver = false;
          // Will activate 2x multiplier later after updates object is created
        } else {
          // All other modes (Classic, Quickfire, Last Line): Snake Eyes +20 rule
          console.log('🎲 Snake Eyes rolled - +20 to turn score');
          newTurnScore = currentTurnScore + 20;
          turnOver = false;
        }
      }
      // Handle double 6s based on game mode
      else if (isDoubleSix) {
        if (gameMode.id === 'true-grit') {
          // True Grit: Double 6 is +12 and activates 6x stacking multiplier
          console.log('🎲 True Grit Double 6 - +12 to turn score, 6x multiplier activated');
          newTurnScore = currentTurnScore + 12;
          turnOver = false;
          stackingMultiplier = 6;
        } else if (gameMode.id === 'zero-hour') {
          // Zero Hour: Double 6 gives +12 to opponent, -12 to turn score, activate 2x multiplier
          console.log('🎲 Double 6 in Zero Hour - +12 to opponent, -12 to turn score, 2x activated');
          newTurnScore = currentTurnScore - 12;
          turnOver = false;
          // Store opponent score update for later
          opponentScoreBonus = 12;
        } else {
          switch (gameMode.rules.eliminationRules.doubleSix) {
            case 'reset':
              console.log('🎲 Double 6 rolled - Player score reset to starting score');
              resetPlayerScore = true;
              turnOver = true;
              newTurnScore = 0;
              break;
            case 'score':
              console.log('🎲 Double 6 rolled - Scores normally');
              newTurnScore = currentTurnScore + diceSum;
              turnOver = false;
              break;
            default:
              // Classic mode behavior - reset score
              console.log('🎲 Double 6 rolled - Player score reset to 0');
              resetPlayerScore = true;
              turnOver = true;
              newTurnScore = 0;
          }
        }
      }
      // Handle other doubles (2, 3, 4, 5) - True Grit and Zero Hour special rules
      else if (isDouble) {
        const doubleValue = dice1;
        
        if (gameMode.id === 'true-grit') {
          // True Grit: All doubles have specific scores and stacking multipliers
          if (doubleValue === 2) {
            console.log('🎲 True Grit Double 2 - +4 to turn score, 2x multiplier activated');
            newTurnScore = currentTurnScore + 4;
            stackingMultiplier = 2;
          } else if (doubleValue === 3) {
            console.log('🎲 True Grit Double 3 - +6 to turn score, 3x multiplier activated');
            newTurnScore = currentTurnScore + 6;
            stackingMultiplier = 3;
          } else if (doubleValue === 4) {
            console.log('🎲 True Grit Double 4 - +8 to turn score, 4x multiplier activated');
            newTurnScore = currentTurnScore + 8;
            stackingMultiplier = 4;
          } else if (doubleValue === 5) {
            console.log('🎲 True Grit Double 5 - +10 to turn score, 5x multiplier activated');
            newTurnScore = currentTurnScore + 10;
            stackingMultiplier = 5;
          }
          turnOver = false; // Continue turn with stacking multiplier
        } else if (gameMode.id === 'zero-hour') {
          // Zero Hour: Different effects for each double
          if (doubleValue === 2) {
            // Double 2: +4 to opponent, -4 to turn score, 2x multiplier
            console.log('🎲 Double 2 in Zero Hour - +4 to opponent, -4 to turn score, 2x activated');
            newTurnScore = currentTurnScore - 4;
            opponentScoreBonus = 4;
          } else if (doubleValue === 3) {
            // Double 3: -6 to turn score, 3x multiplier
            console.log('🎲 Double 3 in Zero Hour - -6 to turn score, 3x activated');
            newTurnScore = currentTurnScore - 6;
            tripleMultiplier = true; // Special flag for 3x multiplier
          } else if (doubleValue === 4) {
            // Double 4: +8 to opponent, -8 to turn score, 2x multiplier
            console.log('🎲 Double 4 in Zero Hour - +8 to opponent, -8 to turn score, 2x activated');
            newTurnScore = currentTurnScore - 8;
            opponentScoreBonus = 8;
          } else if (doubleValue === 5) {
            // Double 5: +10 to opponent, -10 to turn score, 2x multiplier
            console.log('🎲 Double 5 in Zero Hour - +10 to opponent, -10 to turn score, 2x activated');
            newTurnScore = currentTurnScore - 10;
            opponentScoreBonus = 10;
          }
          turnOver = false; // Continue turn with multiplier
        } else {
          // Handle other doubles (non-True Grit, non-Zero Hour modes)
          newTurnScore = currentTurnScore + diceSum;
          console.log(`🎲 Double ${dice1}s rolled - ${diceSum} points added`);
          
          // In most modes, doubles don't grant extra rolls (except classic with multiplier)
          if (gameMode.id === 'classic' || gameMode.id === 'quickfire') {
            turnOver = false; // Classic mode: activate multiplier for future rolls
          } else {
            turnOver = false; // Continue turn
          }
        }
      }
      // Normal scoring
      else {
        const currentDoubleMultiplier = matchData.gameData.hasDoubleMultiplier || false;
        const currentTripleMultiplier = matchData.gameData.hasTripleMultiplier || false;
        const currentStackingMultiplier = matchData.gameData.currentMultiplier || 1;
        
        let scoreToAdd = diceSum;
        let multiplierText = '';
        
        if (gameMode.id === 'true-grit' && currentStackingMultiplier > 1) {
          // True Grit: Use stacking multiplier
          scoreToAdd = diceSum * currentStackingMultiplier;
          multiplierText = ` (x${currentStackingMultiplier} = ${scoreToAdd})`;
        } else if (currentTripleMultiplier) {
          scoreToAdd = diceSum * 3;
          multiplierText = ' (x3 = ' + scoreToAdd + ')';
        } else if (currentDoubleMultiplier) {
          scoreToAdd = diceSum * 2;
          multiplierText = ' (x2 = ' + scoreToAdd + ')';
        }
        
        // In Zero Hour, multiplied normal rolls are negative to turn score
        if (gameMode.id === 'zero-hour' && (currentDoubleMultiplier || currentTripleMultiplier)) {
          newTurnScore = currentTurnScore - scoreToAdd;
          console.log(`🎲 Zero Hour multiplied roll: ${dice1} + ${dice2} = ${diceSum}${multiplierText} (negative), Turn score: ${newTurnScore}`);
        } else {
          newTurnScore = currentTurnScore + scoreToAdd;
          console.log(`🎲 Normal roll: ${dice1} + ${dice2} = ${diceSum}${multiplierText}, Turn score: ${newTurnScore}`);
        }
        
        if (gameMode.id === 'true-grit') {
          // True Grit: Normal rolls continue the turn
          turnOver = false;
        } else {
          turnOver = false;
        }
      }
      
      // Special rule for Last Line: Only 1 roll allowed, then turn ends
      if (gameMode.id === 'last-line') {
        console.log('🎲 Last Line mode - Turn ends after 1 roll');
        turnOver = true;
      }
      
      // True Grit: Do NOT automatically end turn after one roll - only end on single 1
      // Remove the automatic turn end for True Grit mode
      
      // Prepare updates
      const updates: any = {
        'gameData.isRolling': false,
        'gameData.rollPhase': deleteField(),
        'gameData.turnScore': newTurnScore,
      };
      
      // Apply opponent score bonus for Zero Hour doubles
      if (opponentScoreBonus > 0) {
        const opponentScore = isHost ? matchData.opponentData.playerScore : matchData.hostData.playerScore;
        const newOpponentScore = opponentScore + opponentScoreBonus;
        if (isHost) {
          updates['opponentData.playerScore'] = newOpponentScore;
        } else {
          updates['hostData.playerScore'] = newOpponentScore;
        }
      }
      
      // Handle True Grit stacking multipliers
      if (gameMode.id === 'true-grit' && stackingMultiplier > 0) {
        const currentMultiplier = matchData.gameData.currentMultiplier || 1;
        const newMultiplier = currentMultiplier * stackingMultiplier;
        updates['gameData.currentMultiplier'] = newMultiplier;
        console.log(`🎲 True Grit: Multiplier stacked from ${currentMultiplier}x to ${newMultiplier}x`);
      }
      
      // Activate multipliers for doubles in Zero Hour
      if (gameMode.id === 'zero-hour' && isDouble) {
        if (tripleMultiplier) {
          // Double 3 gets 3x multiplier
          updates['gameData.hasTripleMultiplier'] = true;
        } else {
          // All other doubles get 2x multiplier
          updates['gameData.hasDoubleMultiplier'] = true;
        }
      }
      // Activate 2x multiplier for double 1s in non-Zero Hour, non-True Grit modes that continue turn
      else if (isDoubleOne && !gameMode.rules.eliminationRules.doubleOne && gameMode.id !== 'zero-hour' && gameMode.id !== 'true-grit') {
        updates['gameData.hasDoubleMultiplier'] = true;
      }
      
      // Statistics tracking
      const playerStatsPath = isHost ? 'hostData.matchStats' : 'opponentData.matchStats';
      const currentStats = currentPlayer.matchStats || { banks: 0, doubles: 0, biggestTurnScore: 0, lastDiceSum: 0 };
      
      if (isDouble) {
        updates[`${playerStatsPath}.doubles`] = currentStats.doubles + 1;
      }
      
      if (newTurnScore > currentStats.biggestTurnScore) {
        updates[`${playerStatsPath}.biggestTurnScore`] = newTurnScore;
      }
      
      updates[`${playerStatsPath}.lastDiceSum`] = diceSum;
      
      // Special handling for Last Line mode - auto-bank the roll score
      if (gameMode.id === 'last-line') {
        const playerScoreUpdate = newTurnScore;
        
        if (isHost) {
          updates['hostData.playerScore'] = playerScoreUpdate;
        } else {
          updates['opponentData.playerScore'] = playerScoreUpdate;
        }
        newTurnScore = 0; // Reset turn score since it's banked automatically
        updates['gameData.turnScore'] = 0;
        
        // Check if Last Line mode is complete immediately after banking
        const hostFinalScore = isHost ? playerScoreUpdate : matchData.hostData.playerScore;
        const opponentFinalScore = !isHost ? playerScoreUpdate : matchData.opponentData.playerScore;
        
        // Both players have completed their rolls if both have scores > 0
        if (hostFinalScore > 0 && opponentFinalScore > 0) {
          let winnerId = '';
          
          if (hostFinalScore > opponentFinalScore) {
            winner = matchData.hostData.playerDisplayName;
            winnerId = matchData.hostData.playerId;
          } else if (opponentFinalScore > hostFinalScore) {
            winner = matchData.opponentData.playerDisplayName;
            winnerId = matchData.opponentData.playerId;
          } else {
            // Tie game
            winner = 'Tie';
            winnerId = ''; // No winner for tie
          }
          
          gameOver = true;
          gameOverReason = `Highest roll wins! ${winner}`;
          
          // Set game over state immediately
          updates['gameData.gamePhase'] = 'gameOver';
          updates['gameData.winner'] = winner;
          updates['gameData.gameOverReason'] = gameOverReason;
          updates['gameData.status'] = 'completed';
          updates['hostData.turnActive'] = false;
          updates['opponentData.turnActive'] = false;
          
          console.log(`🏆 Last Line Complete! Winner: ${winner} (Host: ${hostFinalScore}, Opponent: ${opponentFinalScore})`);
          
          // Update the match in Firebase first
          await updateDoc(matchRef, updates);
          
          // Then update user stats if there's a winner
          if (winnerId) {
            await this.updateUserStats(matchData, winnerId);
            console.log('✅ Last Line stats updated - match completed');
          }
          
          return; // Exit early to prevent further processing
        }
      }
      
      // Special handling for True Grit mode - auto-bank when turn ends (single 1 rolled)
      if (gameMode.id === 'true-grit' && turnOver) {
        // Add the turn score to the existing player score (cumulative)
        const currentPlayerScore = isHost ? (matchData.hostData.playerScore || 0) : (matchData.opponentData.playerScore || 0);
        if (isHost) {
          updates['hostData.playerScore'] = currentPlayerScore + newTurnScore;
        } else {
          updates['opponentData.playerScore'] = currentPlayerScore + newTurnScore;
        }
        newTurnScore = 0; // Reset turn score since it's banked automatically
        updates['gameData.turnScore'] = 0;
      }
      
      // Auto-win logic for reaching target score
      const targetScore = gameMode.rules.targetScore;
      const shouldCheckAutoWin = gameMode.rules.scoreDirection === 'up' && 
                                currentPlayerScore + newTurnScore >= targetScore && 
                                !turnOver && !eliminatePlayer;

      if (shouldCheckAutoWin) {
        console.log(`🏆 AUTO-WIN! ${currentPlayer.playerDisplayName} reached ${targetScore} points!`);
        gameOver = true;
        winner = currentPlayer.playerDisplayName;
        gameOverReason = 'Game completed!';
        
        // Auto-bank the winning score
        if (isHost) {
          updates['hostData.playerScore'] = currentPlayerScore + newTurnScore;
        } else {
          updates['opponentData.playerScore'] = currentPlayerScore + newTurnScore;
        }
        
        updates['gameData.turnScore'] = 0;
        turnOver = true;
        
        // Set game over state
        updates['gameData.gamePhase'] = 'gameOver';
        updates['gameData.winner'] = winner;
        updates['gameData.gameOverReason'] = gameOverReason;
        updates['gameData.status'] = 'completed';
        updates['hostData.turnActive'] = false;
        updates['opponentData.turnActive'] = false;
      }

      // Auto-win logic for Zero Hour - reaching 0 or below
      const shouldCheckZeroHourWin = gameMode.rules.scoreDirection === 'down' && 
                                   currentPlayerScore - newTurnScore <= 0 && 
                                   !turnOver && !eliminatePlayer;

      if (shouldCheckZeroHourWin) {
        const newScore = currentPlayerScore - newTurnScore;
        
        if (newScore === 0) {
          console.log(`🏆 ZERO HOUR WIN! ${currentPlayer.playerDisplayName} reached exactly 0!`);
          gameOver = true;
          winner = currentPlayer.playerDisplayName;
          gameOverReason = 'Zero Hour completed!';
          
          // Auto-bank the winning score (subtract turn score to reach 0)
          if (isHost) {
            updates['hostData.playerScore'] = 0;
          } else {
            updates['opponentData.playerScore'] = 0;
          }
          
          updates['gameData.turnScore'] = 0;
          turnOver = true;
          
          // Set game over state
          updates['gameData.gamePhase'] = 'gameOver';
          updates['gameData.winner'] = winner;
          updates['gameData.gameOverReason'] = gameOverReason;
          updates['gameData.status'] = 'completed';
          updates['hostData.turnActive'] = false;
          updates['opponentData.turnActive'] = false;
        } else if (gameMode.rules.specialRules?.exactScoreRequired && newScore < 0) {
          // Overshoot in Zero Hour - reset to starting score
          console.log('🎯 Overshoot in Zero Hour during turn - score reset to starting value');
          if (isHost) {
            updates['hostData.playerScore'] = gameMode.rules.startingScore;
          } else {
            updates['opponentData.playerScore'] = gameMode.rules.startingScore;
          }
          updates['gameData.turnScore'] = 0;
          turnOver = true;
        }
      }      // Handle double multiplier logic (Classic and Quickfire modes)
      if (gameMode.id === 'classic' || gameMode.id === 'quickfire') {
        if (dice1 === dice2 && dice1 !== 1 && dice1 !== 6) {
          updates['gameData.hasDoubleMultiplier'] = true;
        } else if (turnOver) {
          updates['gameData.hasDoubleMultiplier'] = false;
          updates['gameData.hasTripleMultiplier'] = false;
        }
      }
      
      // Handle turn over scenarios
      if (turnOver || eliminatePlayer) {
        updates['gameData.turnScore'] = 0;
        
        // Handle player score reset (double 6 in Zero Hour)
        if (resetPlayerScore) {
          const resetScore = gameMode.rules.startingScore;
          if (isHost) {
            updates['hostData.playerScore'] = resetScore;
          } else {
            updates['opponentData.playerScore'] = resetScore;
          }
        }
        
        // Handle Last Line elimination - player's turn score becomes final score
        if (eliminatePlayer && gameMode.id === 'last-line') {
          if (isHost) {
            updates['hostData.playerScore'] = newTurnScore;
          } else {
            updates['opponentData.playerScore'] = newTurnScore;
          }
          updates['gameData.turnScore'] = 0;
        }
        
        // Switch turns (only if game is not over)
        if (!gameOver) {
          updates['hostData.turnActive'] = !isHost;
          updates['opponentData.turnActive'] = isHost;
        }
        
        // Check if True Grit mode is complete (all players eliminated except one, or target reached)
        if (gameMode.id === 'true-grit' && turnOver && !gameOver) {
          // In True Grit, players continue until they roll a single 1 (which ends their turn)
          // Check if target score was reached during this turn
          const currentPlayerFinalScore = isHost ? 
            (matchData.hostData.playerScore || 0) + newTurnScore : 
            (matchData.opponentData.playerScore || 0) + newTurnScore;
          
          if (currentPlayerFinalScore >= targetScore) {
            // Current player wins by reaching target score
            winner = currentPlayer.playerDisplayName;
            gameOver = true;
            gameOverReason = `${winner} reached ${targetScore} points!`;
            
            // Set game over state
            updates['gameData.gamePhase'] = 'gameOver';
            updates['gameData.winner'] = winner;
            updates['gameData.gameOverReason'] = gameOverReason;
            updates['gameData.status'] = 'completed';
            updates['hostData.turnActive'] = false;
            updates['opponentData.turnActive'] = false;
            
            console.log(`🏆 True Grit Complete! Winner: ${winner} reached ${targetScore} points!`);
          }
          // Otherwise, the turn ends (due to single 1) and switches to the other player
          // The other player continues from where they left off or starts their turn
        }
      }
      
      await updateDoc(matchRef, updates);
      
      // Update user stats if game over
      if (gameOver && winner) {
        const winnerId = isHost ? matchData.hostData.playerId : matchData.opponentData.playerId;
        await this.updateUserStats(matchData, winnerId);
        console.log('✅ Game over stats updated');
      }
      
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
      
      // Get game mode configuration
      const gameMode = await GameModeService.getGameMode(matchData.gameMode || 'classic');
      if (!gameMode) {
        console.error('❌ Game mode not found:', matchData.gameMode);
        throw new Error('Game mode not found');
      }
      
      // Check if banking is allowed in this game mode
      if (!gameMode.rules.allowBanking) {
        throw new Error('Banking is not allowed in this game mode');
      }
      
      // Calculate new player score based on game mode direction
      let newPlayerScore;
      if (gameMode.rules.scoreDirection === 'down') {
        // Zero Hour: subtract banked score from current score
        newPlayerScore = (currentPlayer.playerScore || 0) - matchData.gameData.turnScore;
      } else {
        // Classic and other modes: add banked score to current score
        newPlayerScore = (currentPlayer.playerScore || 0) + matchData.gameData.turnScore;
      }
      
      // Check for win condition based on game mode
      const targetScore = gameMode.rules.targetScore;
      let gameOver = false;
      let winner = '';
      
      if (gameMode.rules.scoreDirection === 'down') {
        // Zero Hour: win by reaching exactly 0
        if (newPlayerScore <= 0) {
          if (gameMode.rules.specialRules?.exactScoreRequired && newPlayerScore < 0) {
            // Overshoot in Zero Hour - reset to starting score
            newPlayerScore = gameMode.rules.startingScore;
            console.log('🎯 Overshoot in Zero Hour - score reset to starting value');
          } else if (newPlayerScore === 0) {
            gameOver = true;
            winner = currentPlayer.playerDisplayName;
          }
        }
      } else {
        // Classic and other modes: win by reaching target score
        if (newPlayerScore >= targetScore) {
          gameOver = true;
          winner = currentPlayer.playerDisplayName;
        }
      }
      
      // Prepare updates
      const updates: any = {
        'gameData.turnScore': 0,
        'gameData.hasDoubleMultiplier': false, // Clear multiplier when banking
        'gameData.hasTripleMultiplier': false, // Clear 3x multiplier when banking
        'gameData.currentMultiplier': 1, // Reset stacking multiplier to 1x when banking
      };
      
      // 📊 TRACK BANKING STATISTICS
      const playerStatsPath = isHost ? 'hostData.matchStats' : 'opponentData.matchStats';
      const currentStats = currentPlayer.matchStats || { banks: 0, doubles: 0, biggestTurnScore: 0, lastDiceSum: 0 };
      updates[`${playerStatsPath}.banks`] = currentStats.banks + 1;
      
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
        updates['gameData.gameOverReason'] = `Game completed!`;
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
        
        // 📊 UPDATE USER STATS: Update user profiles when match ends
        const winnerId = currentPlayer.playerId;
        await this.updateUserStats(matchData, winnerId);
        
        // ⚠️ NOTE: Match stays active until players leave or start rematch
        // This allows GameOverPhase to continue reading match data
        console.log('✅ Banking win stats updated - match remains active for game over screen');
      }
      
    } catch (error) {
      console.error('❌ Error banking score:', error);
      throw error;
    }
  }

  /**
   * Get completed match data and immediately archive it
   * This prevents "Match Not Found" errors in the match end screen
   */
  static async getAndArchiveCompletedMatch(matchId: string): Promise<MatchData | null> {
    try {
      console.log('📦 Getting and archiving completed match:', matchId);
      
      // First, get the match data
      const matchData = await this.getMatch(matchId);
      if (!matchData) {
        console.error('❌ Match not found for archival:', matchId);
        return null;
      }
      
      // Verify it's actually completed
      if (matchData.gameData.gamePhase !== 'gameOver' || !matchData.gameData.winner) {
        console.error('❌ Match is not completed:', matchId);
        return null;
      }
      
      // Archive the match immediately
      const winner = matchData.gameData.winner;
      const winnerData = matchData.hostData.playerDisplayName === winner 
        ? matchData.hostData 
        : matchData.opponentData;
      
      await CompletedMatchService.moveMatchToCompleted(matchId, {
        playerId: winnerData.playerId,
        playerDisplayName: winnerData.playerDisplayName,
        finalScore: winnerData.playerScore
      });
      
      console.log('✅ Match data retrieved and archived successfully');
      return matchData;
    } catch (error) {
      console.error('❌ Error getting and archiving completed match:', error);
      return null;
    }
  }

  /**
   * End a match due to player disconnection or inactivity
   */
  static async endMatch(matchId: string, winnerId: string): Promise<void> {
    try {
      console.log('🏁 Ending match due to disconnection:', matchId, 'Winner:', winnerId);
      
      const matchRef = doc(db, 'matches', matchId);
      const matchSnapshot = await getDoc(matchRef);
      
      if (!matchSnapshot.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchSnapshot.data() as MatchData;
      
      // Determine winner details
      const isHostWinner = matchData.hostData.playerId === winnerId;
      const winnerData = isHostWinner ? matchData.hostData : matchData.opponentData;
      const loserData = isHostWinner ? matchData.opponentData : matchData.hostData;
      
      // Update match to completed state
      const updates = {
        'gameData.gamePhase': 'gameOver' as const,
        'gameData.status': 'completed' as const,
        'gameData.winner': winnerData.playerDisplayName,
        'gameData.gameOverReason': `${loserData.playerDisplayName} disconnected`,
        'hostData.turnActive': false,
        'opponentData.turnActive': false,
      };
      
      await updateDoc(matchRef, updates);
      
      // Update user stats
      await this.updateUserStats(matchData, winnerId);
      
      console.log('✅ Match ended successfully due to disconnection');
    } catch (error) {
      console.error('❌ Error ending match:', error);
      throw error;
    }
  }

  /**
   * Archive a completed match to prevent rejoining
   * Called when players leave the game over screen or start a rematch
   */
  static async archiveCompletedMatch(
    matchId: string, 
    winnerId: string, 
    winnerDisplayName: string, 
    finalScore: number
  ): Promise<void> {
    try {
      console.log('🏆 Archiving completed match:', matchId);
      
      await CompletedMatchService.moveMatchToCompleted(matchId, {
        playerId: winnerId,
        playerDisplayName: winnerDisplayName,
        finalScore: finalScore
      });
      
      console.log('✅ Match successfully archived to CompletedMatches collection');
    } catch (error) {
      console.error('❌ Error archiving completed match:', error);
      throw error;
    }
  }
}
