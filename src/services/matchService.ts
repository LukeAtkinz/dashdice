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
import AchievementTrackingService from './achievementTrackingService';

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
      
      // Calculate dice values and check for patterns
      const diceSum = dice1 + dice2;
      const isDouble = dice1 === dice2;
      const isSingleOne = (dice1 === 1 && dice2 !== 1) || (dice2 === 1 && dice1 !== 1);
      const isDoubleOne = dice1 === 1 && dice2 === 1;
      const isDoubleSix = dice1 === 6 && dice2 === 6;
      
      // Prepare updates object early so it can be used in game mode logic
      const updates: any = {
        'gameData.isRolling': false,
        'gameData.rollPhase': deleteField(),
        'gameData.turnScore': 0, // Will be updated based on game mode logic
      };
      
      // Process roll using game mode service for special elimination rules
      if (isSingleOne && gameMode.rules.eliminationRules.singleOne) {
        console.log('🎲 Single 1 rolled - Player eliminated');
        eliminatePlayer = true;
        turnOver = true;
        newTurnScore = 0;
      }
      // Zero Hour specific processing
      else if (gameMode.id === 'zero-hour') {
        console.log('🎲 Zero Hour Mode Processing');
        
        // In Zero Hour, single 1s end the turn and reset turn score (but don't eliminate player)
        if (isSingleOne) {
          console.log('🎲 Zero Hour - Single 1 rolled, turn ends and turn score resets to 0');
          turnOver = true;
          newTurnScore = 0;
        }
        else {
          // Get current multiplier status
          const hasMultiplier = matchData.gameData.hasDoubleMultiplier || false;
          
          if (isDoubleOne) {
            // Snake Eyes: +20 to turn score and opponent, activate multiplier
            console.log('🎲 Zero Hour - Snake Eyes: +20 to turn score, +20 to opponent, activate multiplier');
            newTurnScore = currentTurnScore + 20;
            
            // Add 20 to opponent's score
            const opponentPlayer = isHost ? matchData.opponentData : matchData.hostData;
            const opponentNewScore = (opponentPlayer.playerScore || 0) + 20;
            if (isHost) {
              updates['opponentData.playerScore'] = opponentNewScore;
            } else {
              updates['hostData.playerScore'] = opponentNewScore;
            }
            
            // Activate multiplier for future rolls
            updates['gameData.hasDoubleMultiplier'] = true;
            turnOver = false;
          }
          else if (isDouble) {
            // Any other double: add roll total to turn score, add roll total to opponent, activate multiplier
            console.log(`🎲 Zero Hour - Double ${dice1}s: +${diceSum} to turn score, +${diceSum} to opponent, activate multiplier`);
            
            // Add dice sum to turn score (not doubled yet)
            newTurnScore = currentTurnScore + diceSum;
            
            // Add dice sum to opponent's score
            const opponentPlayer = isHost ? matchData.opponentData : matchData.hostData;
            const opponentNewScore = (opponentPlayer.playerScore || 0) + diceSum;
            if (isHost) {
              updates['opponentData.playerScore'] = opponentNewScore;
            } else {
              updates['hostData.playerScore'] = opponentNewScore;
            }
            
            // Activate multiplier for future rolls
            updates['gameData.hasDoubleMultiplier'] = true;
            turnOver = false;
          }
          else {
            // Normal roll: add to turn score (apply multiplier if active)
            const scoreToAdd = hasMultiplier ? diceSum * 2 : diceSum;
            newTurnScore = currentTurnScore + scoreToAdd;
            console.log(`🎲 Zero Hour - Normal roll: ${dice1} + ${dice2} = ${diceSum}${hasMultiplier ? ' (x2 = ' + scoreToAdd + ')' : ''}, Turn score: ${newTurnScore}`);
            turnOver = false;
          }
        }
      }
      // True Grit specific processing
      else if (gameMode.id === 'true-grit') {
        console.log('🎲 True Grit Mode Processing');
        
        // Get current multiplier from game state (defaults to 1)
        const currentMultiplier = matchData.gameData.trueGritMultiplier || 1;
        
        if (isSingleOne) {
          // Single 1 ends turn immediately and auto-banks the current turn score
          console.log('🎲 True Grit - Single 1: Turn ends, auto-banking score');
          
          // Auto-bank the current turn score to player's total
          const currentPlayerScore = currentPlayer.playerScore || 0;
          const newPlayerScore = currentPlayerScore + currentTurnScore;
          
          if (isHost) {
            updates['hostData.playerScore'] = newPlayerScore;
          } else {
            updates['opponentData.playerScore'] = newPlayerScore;
          }
          
          console.log(`💰 True Grit - Auto-banked ${currentTurnScore} points, new total: ${newPlayerScore}`);
          
          turnOver = true;
          newTurnScore = 0; // Reset turn score since it's been banked
          
          // Reset multiplier for next player's turn
          updates['gameData.trueGritMultiplier'] = 1;
        }
        else if (isDoubleOne) {
          // Double 1 = x7 multiplier
          const newMultiplier = currentMultiplier * 7;
          console.log(`🎲 True Grit - Double 1s: Multiplier ${currentMultiplier} -> ${newMultiplier}`);
          
          // Add current roll with current multiplier
          const scoreToAdd = diceSum * currentMultiplier;
          newTurnScore = currentTurnScore + scoreToAdd;
          
          // Update multiplier for future rolls
          updates['gameData.trueGritMultiplier'] = newMultiplier;
          
          console.log(`🎲 True Grit - Added ${diceSum} × ${currentMultiplier} = ${scoreToAdd}, Turn score: ${newTurnScore}`);
          turnOver = false;
        }
        else if (isDouble) {
          // Other doubles increase multiplier multiplicatively
          const multiplierIncrease = dice1;
          const newMultiplier = currentMultiplier * multiplierIncrease;
          console.log(`🎲 True Grit - Double ${dice1}s: Multiplier ${currentMultiplier} -> ${newMultiplier}`);
          
          // Add current roll with current multiplier
          const scoreToAdd = diceSum * currentMultiplier;
          newTurnScore = currentTurnScore + scoreToAdd;
          
          // Update multiplier for future rolls
          updates['gameData.trueGritMultiplier'] = newMultiplier;
          
          console.log(`🎲 True Grit - Added ${diceSum} × ${currentMultiplier} = ${scoreToAdd}, Turn score: ${newTurnScore}`);
          turnOver = false;
        }
        else {
          // Normal roll: add dice sum multiplied by current multiplier
          const scoreToAdd = diceSum * currentMultiplier;
          newTurnScore = currentTurnScore + scoreToAdd;
          console.log(`🎲 True Grit - Normal roll: ${dice1} + ${dice2} = ${diceSum} × ${currentMultiplier} = ${scoreToAdd}, Turn score: ${newTurnScore}`);
          turnOver = false;
        }
      }
      // Handle double 1 (Snake Eyes) for other modes
      else if (isDoubleOne) {
        if (gameMode.rules.eliminationRules.doubleOne) {
          // Modes with doubleOne elimination (this shouldn't happen as it's handled by True Grit above)
          console.log('🎲 Double 1 rolled - Turn over (elimination rule)');
          turnOver = true;
          newTurnScore = 0;
        } else {
          // All other modes (Classic, Quickfire, Last Line): Snake Eyes +20 rule
          console.log('🎲 Snake Eyes rolled - +20 to turn score');
          newTurnScore = currentTurnScore + 20;
          turnOver = false;
        }
      }
      // Handle double 6s based on game mode
      else if (isDoubleSix) {
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
      // Handle single 1 (non-elimination modes) - already handled by Zero Hour and True Grit above
      else if (isSingleOne) {
        // Other modes: Single 1 ends turn, no score added
        console.log('🎲 Single 1 rolled - Turn over, no score added');
        turnOver = true;
        newTurnScore = 0;
      }
      // Handle other doubles
      else if (isDouble) {
        newTurnScore = currentTurnScore + diceSum;
        console.log(`🎲 Double ${dice1}s rolled - ${diceSum} points added`);
        turnOver = false; // Continue turn
      }
      // Normal scoring
      else {
        const currentMultiplier = matchData.gameData.hasDoubleMultiplier || false;
        const scoreToAdd = currentMultiplier ? diceSum * 2 : diceSum;
        newTurnScore = currentTurnScore + scoreToAdd;
        console.log(`🎲 Normal roll: ${dice1} + ${dice2} = ${diceSum}${currentMultiplier ? ' (x2 = ' + scoreToAdd + ')' : ''}, Turn score: ${newTurnScore}`);
        turnOver = false;
      }
      
      // Special rule for Last Line: Only 1 roll allowed, but doubles grant extra roll
      if (gameMode.id === 'last-line') {
        if (isDouble && gameMode.rules.specialRules?.doubleGrantsExtraRoll) {
          console.log('🎲 Last Line mode - Double rolled! Granting extra roll');
          turnOver = false; // Allow another roll due to double
        } else {
          console.log('🎲 Last Line mode - Turn ends after 1 roll');
          turnOver = true;
        }
      }
      
      // Update turn score in the updates object
      updates['gameData.turnScore'] = newTurnScore;
      
      // Activate 2x multiplier for double 1s in modes that continue turn (Classic, Quickfire, Zero Hour)
      if (isDoubleOne && !gameMode.rules.eliminationRules.doubleOne) {
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
      
      // Special handling for Last Line mode - auto-bank the roll score only when turn ends
      if (gameMode.id === 'last-line' && turnOver) {
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
            
            // 🏆 TRACK ACHIEVEMENTS: Record game completion for both players (Last Line mode)
            const achievementService = AchievementTrackingService.getInstance();
            const currentDiceRoll = [matchData.gameData.diceOne, matchData.gameData.diceTwo];
            
            // Record achievement data for winner
            await achievementService.recordGameEnd(
              winnerId,
              true, // won
              currentDiceRoll,
              {
                opponentId: winnerId === matchData.hostData.playerId ? matchData.opponentData.playerId : matchData.hostData.playerId,
                gameMode: matchData.gameMode,
                finalScore: winnerId === matchData.hostData.playerId ? hostFinalScore : opponentFinalScore
              }
            );
            
            // Record achievement data for loser
            const loserId = winnerId === matchData.hostData.playerId ? matchData.opponentData.playerId : matchData.hostData.playerId;
            await achievementService.recordGameEnd(
              loserId,
              false, // lost
              currentDiceRoll,
              {
                opponentId: winnerId,
                gameMode: matchData.gameMode,
                finalScore: winnerId === matchData.hostData.playerId ? opponentFinalScore : hostFinalScore
              }
            );
            
            console.log('✅ Last Line stats and achievements updated - match completed');
          }
          
          return; // Exit early to prevent further processing
        }
      }
      
      // Special handling for True Grit mode - auto-bank when turn ends
      if (gameMode.id === 'true-grit' && turnOver) {
        // Only auto-bank if the score hasn't already been banked (e.g., by single 1 logic)
        const currentPlayerScore = currentPlayer.playerScore || 0;
        const expectedScoreAfterBanking = currentPlayerScore + newTurnScore;
        
        // Check if the player score was already updated (single 1 auto-banking)
        const currentUpdatedScore = isHost ? updates['hostData.playerScore'] : updates['opponentData.playerScore'];
        
        if (currentUpdatedScore === undefined) {
          // Score hasn't been banked yet, so bank it now
          if (isHost) {
            updates['hostData.playerScore'] = expectedScoreAfterBanking;
          } else {
            updates['opponentData.playerScore'] = expectedScoreAfterBanking;
          }
          console.log(`💰 True Grit - Auto-banked ${newTurnScore} points, new total: ${expectedScoreAfterBanking}`);
        }
        
        newTurnScore = 0; // Reset turn score since it's banked automatically
        updates['gameData.turnScore'] = 0;
        
        // Reset multiplier for next player's turn
        updates['gameData.trueGritMultiplier'] = 1;
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
      }
      
      // Handle double multiplier logic (Classic and Quickfire modes)
      if (gameMode.id === 'classic' || gameMode.id === 'quickfire') {
        if (dice1 === dice2 && dice1 !== 1 && dice1 !== 6) {
          updates['gameData.hasDoubleMultiplier'] = true;
        } else if (turnOver) {
          updates['gameData.hasDoubleMultiplier'] = false;
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
        
        // Handle True Grit auto-banking when turn ends
        if (gameMode.id === 'true-grit' && turnOver) {
          // Check if the score hasn't already been banked (e.g., by single 1 logic)
          const currentUpdatedScore = isHost ? updates['hostData.playerScore'] : updates['opponentData.playerScore'];
          
          if (currentUpdatedScore === undefined) {
            // Score hasn't been banked yet, add turn score to existing player score
            const currentPlayerScore = currentPlayer.playerScore || 0;
            const newPlayerScore = currentPlayerScore + newTurnScore;
            
            if (isHost) {
              updates['hostData.playerScore'] = newPlayerScore;
            } else {
              updates['opponentData.playerScore'] = newPlayerScore;
            }
            
            console.log(`🎯 True Grit - Auto-banked score: ${newTurnScore}, new total: ${newPlayerScore}`);
          }
          
          // Reset True Grit multiplier for next player
          updates['gameData.trueGritMultiplier'] = 1;
        }
        
        // Check if True Grit mode is complete (both players have completed their single turns)
        if (gameMode.id === 'true-grit' && turnOver && !gameOver) {
          // In True Grit, each player gets exactly one turn
          // Get the final scores after auto-banking
          const hostFinalScore = isHost 
            ? (updates['hostData.playerScore'] || matchData.hostData.playerScore || 0)
            : (matchData.hostData.playerScore || 0);
          const opponentFinalScore = !isHost 
            ? (updates['opponentData.playerScore'] || matchData.opponentData.playerScore || 0)
            : (matchData.opponentData.playerScore || 0);
          
          // Check if both players have completed their turns
          const hostTurnComplete = (isHost && turnOver) || (matchData.hostData.playerScore || 0) > 0;
          const opponentTurnComplete = (!isHost && turnOver) || (matchData.opponentData.playerScore || 0) > 0;
          
          // If both players have completed their turns, determine winner
          if (hostTurnComplete && opponentTurnComplete) {
            if (hostFinalScore > opponentFinalScore) {
              winner = matchData.hostData.playerDisplayName;
            } else if (opponentFinalScore > hostFinalScore) {
              winner = matchData.opponentData.playerDisplayName;
            } else {
              // Tie game
              winner = 'Tie';
            }
            
            gameOver = true;
            gameOverReason = `True Grit Complete! Winner: ${winner} (Host: ${hostFinalScore}, Opponent: ${opponentFinalScore})`;
            
            // Set game over state
            updates['gameData.gamePhase'] = 'gameOver';
            updates['gameData.winner'] = winner;
            updates['gameData.gameOverReason'] = gameOverReason;
            updates['gameData.status'] = 'completed';
            updates['hostData.turnActive'] = false;
            updates['opponentData.turnActive'] = false;
            
            console.log(`🏆 True Grit Complete! Winner: ${winner} (Host: ${hostFinalScore}, Opponent: ${opponentFinalScore})`);
          }
        }
      }
      
      await updateDoc(matchRef, updates);
      
      // Update user stats if game over
      if (gameOver && winner && winner !== 'Tie') {
        const winnerId = isHost ? matchData.hostData.playerId : matchData.opponentData.playerId;
        await this.updateUserStats(matchData, winnerId);
        
        // 🏆 TRACK ACHIEVEMENTS: Record game completion for both players (auto-win/True Grit)
        const achievementService = AchievementTrackingService.getInstance();
        const currentDiceRoll = [dice1, dice2];
        
        // Record achievement data for winner
        await achievementService.recordGameEnd(
          winnerId,
          true, // won
          currentDiceRoll,
          {
            opponentId: isHost ? matchData.opponentData.playerId : matchData.hostData.playerId,
            gameMode: matchData.gameMode,
            finalScore: isHost ? matchData.hostData.playerScore : matchData.opponentData.playerScore
          }
        );
        
        // Record achievement data for loser
        const loserId = isHost ? matchData.opponentData.playerId : matchData.hostData.playerId;
        await achievementService.recordGameEnd(
          loserId,
          false, // lost
          currentDiceRoll,
          {
            opponentId: winnerId,
            gameMode: matchData.gameMode,
            finalScore: isHost ? matchData.opponentData.playerScore : matchData.hostData.playerScore
          }
        );
        
        console.log('✅ Game over stats and achievements updated');
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
      let bankingSuccess = true;
      
      if (gameMode.rules.scoreDirection === 'down') {
        // Zero Hour: subtract banked score from current score
        const proposedScore = (currentPlayer.playerScore || 0) - matchData.gameData.turnScore;
        
        if (proposedScore < 0) {
          // Bust rule: banking would take player below 0, so banking fails
          console.log('🚫 Zero Hour - Banking would go below 0, bust rule applied');
          newPlayerScore = currentPlayer.playerScore || 0; // Keep current score
          bankingSuccess = false;
        } else {
          newPlayerScore = proposedScore;
          console.log(`💰 Zero Hour - Banked ${matchData.gameData.turnScore}, new score: ${newPlayerScore}`);
        }
      } else {
        // Classic and other modes: add banked score to current score
        newPlayerScore = (currentPlayer.playerScore || 0) + matchData.gameData.turnScore;
      }
      
      // Check for win condition based on game mode
      const targetScore = gameMode.rules.targetScore;
      let gameOver = false;
      let winner = '';
      
      if (gameMode.rules.scoreDirection === 'down') {
        // Zero Hour: win by reaching exactly 0 (only if banking was successful)
        if (bankingSuccess && newPlayerScore === 0) {
          gameOver = true;
          winner = currentPlayer.playerDisplayName;
          console.log(`� Zero Hour Victory! ${winner} reached exactly 0`);
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
        'gameData.turnScore': 0, // Always reset turn score (successful bank or bust)
        'gameData.hasDoubleMultiplier': false, // Always clear multiplier when banking
      };
      
      // 📊 TRACK BANKING STATISTICS (only for successful banks)
      const playerStatsPath = isHost ? 'hostData.matchStats' : 'opponentData.matchStats';
      const currentStats = currentPlayer.matchStats || { banks: 0, doubles: 0, biggestTurnScore: 0, lastDiceSum: 0 };
      
      if (bankingSuccess) {
        updates[`${playerStatsPath}.banks`] = currentStats.banks + 1;
      }
      
      // Update player score (only if banking was successful)
      if (bankingSuccess) {
        if (isHost) {
          updates['hostData.playerScore'] = newPlayerScore;
        } else {
          updates['opponentData.playerScore'] = newPlayerScore;
        }
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
        
        // 🏆 TRACK ACHIEVEMENTS: Record game completion for both players
        const achievementService = AchievementTrackingService.getInstance();
        const currentDiceRoll = [matchData.gameData.diceOne, matchData.gameData.diceTwo];
        
        // Record achievement data for winner
        await achievementService.recordGameEnd(
          winnerId,
          true, // won
          currentDiceRoll,
          {
            opponentId: isHost ? matchData.opponentData.playerId : matchData.hostData.playerId,
            gameMode: matchData.gameMode,
            finalScore: newPlayerScore
          }
        );
        
        // Record achievement data for loser
        const loserId = isHost ? matchData.opponentData.playerId : matchData.hostData.playerId;
        await achievementService.recordGameEnd(
          loserId,
          false, // lost
          currentDiceRoll,
          {
            opponentId: winnerId,
            gameMode: matchData.gameMode,
            finalScore: isHost ? matchData.opponentData.playerScore : matchData.hostData.playerScore
          }
        );
        
        // ⚠️ NOTE: Match stays active until players leave or start rematch
        // This allows GameOverPhase to continue reading match data
        console.log('✅ Banking win stats and achievements updated - match remains active for game over screen');
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
      
      // 🏆 TRACK ACHIEVEMENTS: Record game completion for both players (disconnection scenario)
      const achievementService = AchievementTrackingService.getInstance();
      const currentDiceRoll = [matchData.gameData.diceOne, matchData.gameData.diceTwo];
      
      // Record achievement data for winner (by disconnection)
      await achievementService.recordGameEnd(
        winnerId,
        true, // won by disconnection
        currentDiceRoll,
        {
          opponentId: isHostWinner ? matchData.opponentData.playerId : matchData.hostData.playerId,
          gameMode: matchData.gameMode,
          finalScore: isHostWinner ? matchData.hostData.playerScore : matchData.opponentData.playerScore
        }
      );
      
      // Record achievement data for loser (disconnected)
      const loserId = isHostWinner ? matchData.opponentData.playerId : matchData.hostData.playerId;
      await achievementService.recordGameEnd(
        loserId,
        false, // lost by disconnection
        currentDiceRoll,
        {
          opponentId: winnerId,
          gameMode: matchData.gameMode,
          finalScore: isHostWinner ? matchData.opponentData.playerScore : matchData.hostData.playerScore
        }
      );
      
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
