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
import { FriendStatsService } from './friendStatsService';
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
      
      // Check if this is a friend match for additional friend stats tracking
      const isFriendMatch = await this.arePlayersFriends(hostId, opponentId);
      
      // Update win/loss stats
      if (winnerId === hostId) {
        // Host wins, opponent loses
        await Promise.all([
          UserService.updateMatchWin(hostId),
          UserService.updateMatchLoss(opponentId)
        ]);
        
        // Update friend stats if this was a friend match
        if (isFriendMatch) {
          await FriendStatsService.updateFriendMatchStats(hostId, opponentId);
        }
        
        console.log('🏆 MatchService: Host wins - stats updated');
      } else if (winnerId === opponentId) {
        // Opponent wins, host loses
        await Promise.all([
          UserService.updateMatchWin(opponentId),
          UserService.updateMatchLoss(hostId)
        ]);
        
        // Update friend stats if this was a friend match
        if (isFriendMatch) {
          await FriendStatsService.updateFriendMatchStats(opponentId, hostId);
        }
        
        console.log('🏆 MatchService: Opponent wins - stats updated');
      }
      
      console.log('✅ MatchService: User stats update completed');
    } catch (error) {
      console.error('❌ MatchService: Error updating user stats:', error);
      // Don't throw error to prevent match completion from failing
    }
  }

  /**
   * Subscribe to real-time match updates - OPTIMIZED for performance
   * Checks both matches and gameSessions collections for compatibility
   */
  static subscribeToMatch(matchId: string, callback: (data: MatchData | null) => void) {
    console.log('🔍 MatchService: Starting subscription for match ID:', matchId);
    
    // Add a retry mechanism for race conditions during match creation
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second between retries
    
    const attemptSubscription = () => {
      // First try the legacy matches collection
      const matchRef = doc(db, 'matches', matchId);
      
      const unsubscribe = onSnapshot(matchRef, (snapshot) => {
        if (snapshot.exists()) {
          console.log('✅ MatchService: Found match document:', matchId);
          const data = { id: snapshot.id, ...snapshot.data() } as MatchData;
          
          // Validate required fields before passing data
          if (data.gameData && data.hostData && data.opponentData) {
            callback(data);
          } else {
            console.error('❌ Invalid match data structure');
            callback(null);
          }
        } else {
          console.log('❌ MatchService: Match document not found:', matchId);
          
          // If document doesn't exist and we haven't exhausted retries, try again
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 MatchService: Retrying subscription (${retryCount}/${maxRetries}) in ${retryDelay}ms...`);
            
            // Unsubscribe current listener before retrying
            unsubscribe();
            
            setTimeout(() => {
              attemptSubscription();
            }, retryDelay);
            return;
          }
          
          // Match not found in legacy collection - try gameSessions
          console.log('🔍 Match not found in matches collection, checking gameSessions...');
          this.checkGameSession(matchId, callback);
        }
      }, (error) => {
        console.error('❌ Match subscription error:', error);
        
        // If error and we haven't exhausted retries, try again
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 MatchService: Retrying after error (${retryCount}/${maxRetries}) in ${retryDelay}ms...`);
          
          setTimeout(() => {
            attemptSubscription();
          }, retryDelay);
          return;
        }
        
        // Fallback to gameSessions on error
        this.checkGameSession(matchId, callback);
      });
      
      return unsubscribe;
    };
    
    return attemptSubscription();
  }

  /**
   * Check for match data in gameSessions collection (unified system)
   */
  private static checkGameSession(sessionId: string, callback: (data: MatchData | null) => void) {
    const sessionRef = doc(db, 'gameSessions', sessionId);
    
    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const sessionData = snapshot.data();
        console.log('✅ Found session data:', sessionData);
        
        // Convert session data to match data format
        if (sessionData.participants && sessionData.participants.length >= 1) {
          const hostParticipant = sessionData.participants[0];
          const opponentParticipant = sessionData.participants.length >= 2 ? sessionData.participants[1] : null;
          
          const matchData: MatchData = {
            id: snapshot.id,
            gameMode: sessionData.gameMode,
            gameType: sessionData.sessionType === 'ranked' ? 'Ranked' : 'Open Server',
            gameData: sessionData.gameState || {
              phase: opponentParticipant ? 'waiting' : 'waiting_for_opponent',
              currentPlayer: hostParticipant.playerId,
              turnNumber: 1,
              playerTurns: {},
              gameWinner: null
            },
            hostData: {
              playerId: hostParticipant.playerId,
              playerDisplayName: hostParticipant.playerDisplayName,
              playerStats: hostParticipant.playerStats,
              displayBackgroundEquipped: hostParticipant.displayBackgroundEquipped,
              matchBackgroundEquipped: hostParticipant.matchBackgroundEquipped,
              // Game-specific fields with defaults
              turnActive: sessionData.gameState?.currentPlayer === hostParticipant.playerId || false,
              playerScore: 0,
              roundScore: 0,
              isConnected: true,
              matchStats: {
                banks: 0,
                doubles: 0,
                biggestTurnScore: 0,
                lastDiceSum: 0
              }
            },
            opponentData: opponentParticipant ? {
              playerId: opponentParticipant.playerId,
              playerDisplayName: opponentParticipant.playerDisplayName,
              playerStats: opponentParticipant.playerStats,
              displayBackgroundEquipped: opponentParticipant.displayBackgroundEquipped,
              matchBackgroundEquipped: opponentParticipant.matchBackgroundEquipped,
              // Game-specific fields with defaults
              turnActive: sessionData.gameState?.currentPlayer === opponentParticipant.playerId || false,
              playerScore: 0,
              roundScore: 0,
              isConnected: true,
              matchStats: {
                banks: 0,
                doubles: 0,
                biggestTurnScore: 0,
                lastDiceSum: 0
              }
            } : {
              // Default opponent data for waiting room
              playerId: 'waiting',
              playerDisplayName: 'Waiting for opponent...',
              playerStats: { bestStreak: 0, currentStreak: 0, gamesPlayed: 0, matchWins: 0 },
              displayBackgroundEquipped: null,
              matchBackgroundEquipped: null,
              turnActive: false,
              playerScore: 0,
              roundScore: 0,
              isConnected: false,
              matchStats: { banks: 0, doubles: 0, biggestTurnScore: 0, lastDiceSum: 0 }
            },
            createdAt: sessionData.createdAt,
            status: sessionData.status
          };
          
          callback(matchData);
        } else {
          console.log('⚠️ Session exists but not enough participants yet');
          callback(null);
        }
      } else {
        // Not found in either collection - check completed matches
        console.log('🔍 Not found in gameSessions, checking completed matches...');
        this.checkCompletedMatch(sessionId, callback);
      }
    }, (error) => {
      console.error('❌ GameSession subscription error:', error);
      callback(null);
    });
    
    return unsubscribe;
  }

  /**
   * One-time check for completed matches (no real-time listener needed)
   */
  private static async checkCompletedMatch(matchId: string, callback: (data: MatchData | null) => void) {
    try {
      const completedMatchRef = doc(db, 'completedmatches', matchId);
      const completedSnapshot = await getDoc(completedMatchRef);
      
      if (completedSnapshot.exists()) {
        const data = { id: completedSnapshot.id, ...completedSnapshot.data() } as MatchData;
        
        if (data.gameData && data.hostData && data.opponentData) {
          callback(data);
        } else {
          callback(null);
        }
      } else {
        callback(null);
      }
    } catch (error) {
      console.error('❌ Error checking completed match:', error);
      callback(null);
    }
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
          'gameData.turnScore': matchData.gameData.turnScore || 0,
          // Ensure chooserPlayerIndex is set for turn decider (defensive programming)
          'gameData.chooserPlayerIndex': matchData.gameData.chooserPlayerIndex || Math.floor(Math.random() * 2) + 1
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
      }, 2000); // Reduced from 3000ms to 2000ms for faster gameplay
      
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
      
      console.log(`🎯 Turn decider result: ${choice} on ${dice} (${isOdd ? 'odd' : 'even'}) - ${choiceCorrect ? 'Correct' : 'Incorrect'}`);
      console.log(`🎮 ${hostGoesFirst ? 'Host' : 'Opponent'} goes first`);
      
      // Process turn decider result after animation delay
      setTimeout(async () => {
        try {
          // Transition to gameplay phase after animation completes
          await updateDoc(matchRef, {
            'gameData.gamePhase': 'gameplay',
            'gameData.isRolling': false,
            'gameData.turnScore': 0,
            'hostData.turnActive': hostGoesFirst,
            'opponentData.turnActive': !hostGoesFirst,
          });
        } catch (error) {
          console.error('❌ Error transitioning to gameplay after turn decider:', error);
        }
      }, 2000); // Reduced from 3000ms to 2000ms for faster gameplay
      
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
      // Enhanced for Zero Hour: 25% chance to force doubles for more exciting gameplay
      let dice1 = Math.floor(Math.random() * 6) + 1;
      let dice2 = Math.floor(Math.random() * 6) + 1;
      
      if (matchData.gameMode === 'zero-hour' && Math.random() < 0.25) {
        const doubleValue = Math.floor(Math.random() * 6) + 1;
        dice1 = doubleValue;
        dice2 = doubleValue;
        console.log('🎲 Zero Hour Enhancement: Forced doubles rolled!', { dice1, dice2 });
      }
      
      // 🏆 TRACK DICE ROLL ACHIEVEMENTS: Update total dice rolled count (2 dice per roll)
      try {
        // PERFORMANCE: Achievement tracking moved to match end to prevent lag
        // Individual dice roll tracking will be batched and written at match completion
        // const achievementService = AchievementTrackingService.getInstance();
        // await achievementService.updateMetric(playerId, 'total_dice_rolled', 2, 'increment');
        // await achievementService.updateMetric(playerId, `dice_${this.numberToWord(dice1)}s_rolled`, 1, 'increment');
        // await achievementService.updateMetric(playerId, `dice_${this.numberToWord(dice2)}s_rolled`, 1, 'increment');
        
        console.log(`🎲 Dice rolled: Player ${playerId} rolled [${dice1}, ${dice2}] (achievements batched)`);
      } catch (achievementError) {
        console.error('❌ Error in dice roll:', achievementError);
        // Don't throw - achievements failing shouldn't break gameplay
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
          // Get current multiplier status and count
          const hasMultiplier = matchData.gameData.hasDoubleMultiplier || false;
          const currentMultiplier = matchData.gameData.multiplierLevel || 2; // Start at 2x
          const doublesThisTurn = matchData.gameData.doublesThisTurn || 0;
          
          if (isDoubleOne) {
            // Snake Eyes: +20 to turn score and opponent, activate/increase multiplier
            const newDoublesCount = doublesThisTurn + 1;
            const newMultiplier = 2 + (newDoublesCount - 1); // 2x + additional doubles
            console.log(`🎲 Zero Hour - Snake Eyes: +20 to turn score, +20 to opponent, ${newMultiplier}x multiplier active`);
            newTurnScore = currentTurnScore + 20;
            
            // Update multiplier tracking
            updates['gameData.doublesThisTurn'] = newDoublesCount;
            updates['gameData.multiplierLevel'] = newMultiplier;
            
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
            // Any other double: add dice sum to turn score and opponent, activate/increase multiplier
            const newDoublesCount = doublesThisTurn + 1;
            const newMultiplier = 2 + (newDoublesCount - 1); // 2x + additional doubles
            console.log(`🎲 Zero Hour - Double ${dice1}s: +${diceSum} to turn score, +${diceSum} to opponent, ${newMultiplier}x multiplier active`);
            
            // Add dice sum to turn score (not doubled yet)
            newTurnScore = currentTurnScore + diceSum;
            
            // Update multiplier tracking
            updates['gameData.doublesThisTurn'] = newDoublesCount;
            updates['gameData.multiplierLevel'] = newMultiplier;
            
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
            // Normal roll: add to turn score (apply current multiplier if active)
            const scoreToAdd = hasMultiplier ? diceSum * currentMultiplier : diceSum;
            newTurnScore = currentTurnScore + scoreToAdd;
            console.log(`🎲 Zero Hour - Normal roll: ${dice1} + ${dice2} = ${diceSum}${hasMultiplier ? ` (x${currentMultiplier} = ${scoreToAdd})` : ''}, Turn score: ${newTurnScore}`);
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
          // Double 1 = add 20 to turn score and set active x2 multiplier
          console.log('🎲 True Grit - Double 1s: +20 to turn score, x2 multiplier active');
          
          // Add 20 to turn score
          newTurnScore = currentTurnScore + 20;
          
          // Set x2 multiplier for future rolls (don't stack, just set to 2)
          updates['gameData.trueGritMultiplier'] = 2;
          
          console.log(`🎲 True Grit - Added 20 points, Turn score: ${newTurnScore}, Multiplier set to 2x`);
          turnOver = false;
        }
        else if (isDouble) {
          // Other doubles: add dice total to turn score and set x2 multiplier
          console.log(`🎲 True Grit - Double ${dice1}s: +${diceSum} to turn score, x2 multiplier active`);
          
          // Add dice total to turn score
          newTurnScore = currentTurnScore + diceSum;
          
          // Set x2 multiplier for future rolls (don't stack, just set to 2)
          updates['gameData.trueGritMultiplier'] = 2;
          
          console.log(`🎲 True Grit - Added ${diceSum} points, Turn score: ${newTurnScore}, Multiplier set to 2x`);
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
      // Last Line (Tug-of-War) specific processing
      else if (gameMode.id === 'last-line') {
        console.log('🎲 Last Line (Tug-of-War) Mode Processing');
        
        if (isSingleOne) {
          // Single 1 ends turn immediately - no score added to turn score
          console.log('🎲 Last Line - Single 1: Turn ends immediately, no score added');
          turnOver = true;
          newTurnScore = 0; // Turn score stays 0
        }
        else if (isDoubleOne) {
          // Double 1: special rule - add 20 to turn score
          console.log('🎲 Last Line - Double 1s: +20 to turn score');
          newTurnScore = currentTurnScore + 20;
          turnOver = false; // Continue turn after double 1
        }
        else if (isDouble) {
          // Any other double: apply 2x multiplier to the dice sum AND activate multiplier for future rolls
          const multiplier = 2; // Fixed 2x multiplier for all doubles
          const effectiveRoll = diceSum * multiplier;
          
          console.log(`🎲 Last Line - Double ${dice1}s: ${diceSum} × ${multiplier} = ${effectiveRoll} added to turn score, 2x multiplier activated`);
          newTurnScore = currentTurnScore + effectiveRoll;
          
          // Activate multiplier for subsequent rolls in this turn
          updates['gameData.hasDoubleMultiplier'] = true;
          
          turnOver = false; // Continue turn after double
        }
        else {
          // Normal roll: add dice sum to turn score (with multiplier if active)
          const hasMultiplier = matchData.gameData.hasDoubleMultiplier || false;
          const scoreToAdd = hasMultiplier ? diceSum * 2 : diceSum;
          
          console.log(`🎲 Last Line - Normal roll: ${dice1} + ${dice2} = ${diceSum}${hasMultiplier ? ' (2x = ' + scoreToAdd + ')' : ''} added to turn score`);
          newTurnScore = currentTurnScore + scoreToAdd;
          turnOver = false; // Continue turn
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
      // Handle single 1 based on game mode elimination rules
      else if (isSingleOne) {
        if (gameMode.rules.eliminationRules.singleOne) {
          // Elimination modes (like True Grit) - auto-bank turn score then end turn
          if (currentTurnScore > 0) {
            const newPlayerScore = currentPlayerScore + currentTurnScore;
            if (isHost) {
              updates['hostData.playerScore'] = newPlayerScore;
            } else {
              updates['opponentData.playerScore'] = newPlayerScore;
            }
            console.log(`💰 Single 1 rolled (elimination mode) - Auto-banked ${currentTurnScore} points, new total: ${newPlayerScore}`);
            
            // Update bank statistics
            const playerStatsPath = isHost ? 'hostData.matchStats' : 'opponentData.matchStats';
            const currentStats = currentPlayer.matchStats || { banks: 0, doubles: 0, biggestTurnScore: 0, lastDiceSum: 0 };
            updates[`${playerStatsPath}.banks`] = currentStats.banks + 1;
          } else {
            console.log('🎲 Single 1 rolled (elimination mode) - Turn over, no score to bank');
          }
        } else {
          // Non-elimination modes (Classic, Quickfire) - just end turn, lose the turn score
          console.log(`🎲 Single 1 rolled - Turn over, ${currentTurnScore} points lost (no auto-banking in ${gameMode.name})`);
        }
        
        // End the turn in both cases
        turnOver = true;
        newTurnScore = 0;
      }
      // Handle other doubles - all doubles activate x2 multiplier and add dice value
      else if (isDouble) {
        if (dice1 === 1) {
          // Double 1 (Snake Eyes) - +20 to turn score and activate x2 multiplier
          newTurnScore = currentTurnScore + 20;
          console.log(`🎲 Double 1s (Snake Eyes) rolled - +20 points added, 2x multiplier activated`);
        } else {
          // All other doubles (2-6) - add dice sum and activate x2 multiplier
          newTurnScore = currentTurnScore + diceSum;
          console.log(`🎲 Double ${dice1}s rolled - +${diceSum} points added, 2x multiplier activated`);
        }
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
      
      // Update turn score in the updates object
      updates['gameData.turnScore'] = newTurnScore;
      
      // Activate 2x multiplier for ALL doubles (including double 1s)
      if (isDouble) {
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
      
      // Get the potentially updated player score (if auto-banking occurred)
      const updatedPlayerScore = isHost ? 
        (updates['hostData.playerScore'] !== undefined ? updates['hostData.playerScore'] : currentPlayerScore) :
        (updates['opponentData.playerScore'] !== undefined ? updates['opponentData.playerScore'] : currentPlayerScore);
      
      const shouldCheckAutoWin = gameMode.rules.scoreDirection === 'up' && 
                                updatedPlayerScore >= targetScore && 
                                !gameOver && !eliminatePlayer;

      if (shouldCheckAutoWin) {
        console.log(`🏆 AUTO-WIN! ${currentPlayer.playerDisplayName} reached ${targetScore} points!`);
        gameOver = true;
        winner = currentPlayer.playerDisplayName;
        gameOverReason = 'Game completed!';
        
        // Ensure the score is set correctly (may already be set by auto-banking)
        if (isHost && updates['hostData.playerScore'] === undefined) {
          updates['hostData.playerScore'] = currentPlayerScore + newTurnScore;
        } else if (!isHost && updates['opponentData.playerScore'] === undefined) {
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
        
        if (newScore <= 0) {
          console.log(`🏆 ZERO HOUR WIN! ${currentPlayer.playerDisplayName} reached ${newScore <= 0 ? '0 or below' : 'exactly 0'}!`);
          gameOver = true;
          winner = currentPlayer.playerDisplayName;
          gameOverReason = 'Zero Hour completed!';
          
          // Auto-bank the winning score (subtract turn score to reach 0 or below)
          if (isHost) {
            updates['hostData.playerScore'] = newScore <= 0 ? 0 : newScore;
          } else {
            updates['opponentData.playerScore'] = newScore <= 0 ? 0 : newScore;
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
        } else if (newScore < 0) {
          // Note: We no longer reset for going below 0 since players can win at 0 or below
          // Auto-win when reaching 0 or below
          console.log(`� ZERO HOUR WIN! ${currentPlayer.playerDisplayName} reached 0 or below (${newScore})!`);
          gameOver = true;
          winner = currentPlayer.playerDisplayName;
          gameOverReason = 'Zero Hour completed!';
          
          // Auto-bank the winning score and set to 0
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
        }
      }
      
      // Win condition check for Last Line (Tug-of-War) - opponent reaches 0
      if (gameMode.id === 'last-line' && !gameOver) {
        const hostScore = isHost ? 
          (updates['hostData.playerScore'] !== undefined ? updates['hostData.playerScore'] : matchData.hostData.playerScore) :
          (updates['hostData.playerScore'] !== undefined ? updates['hostData.playerScore'] : matchData.hostData.playerScore);
        const opponentScore = !isHost ? 
          (updates['opponentData.playerScore'] !== undefined ? updates['opponentData.playerScore'] : matchData.opponentData.playerScore) :
          (updates['opponentData.playerScore'] !== undefined ? updates['opponentData.playerScore'] : matchData.opponentData.playerScore);
        
        if (hostScore <= 0) {
          console.log(`🏆 LAST LINE WIN! ${matchData.opponentData.playerDisplayName} wins! (Host reached 0)`);
          gameOver = true;
          winner = matchData.opponentData.playerDisplayName;
          gameOverReason = 'Last Line completed - opponent eliminated!';
          
          // Ensure host score is exactly 0
          updates['hostData.playerScore'] = 0;
          
          // Set game over state
          updates['gameData.gamePhase'] = 'gameOver';
          updates['gameData.winner'] = winner;
          updates['gameData.gameOverReason'] = gameOverReason;
          updates['gameData.status'] = 'completed';
          updates['hostData.turnActive'] = false;
          updates['opponentData.turnActive'] = false;
          turnOver = true;
        } else if (opponentScore <= 0) {
          console.log(`🏆 LAST LINE WIN! ${matchData.hostData.playerDisplayName} wins! (Opponent reached 0)`);
          gameOver = true;
          winner = matchData.hostData.playerDisplayName;
          gameOverReason = 'Last Line completed - opponent eliminated!';
          
          // Ensure opponent score is exactly 0
          updates['opponentData.playerScore'] = 0;
          
          // Set game over state
          updates['gameData.gamePhase'] = 'gameOver';
          updates['gameData.winner'] = winner;
          updates['gameData.gameOverReason'] = gameOverReason;
          updates['gameData.status'] = 'completed';
          updates['hostData.turnActive'] = false;
          updates['opponentData.turnActive'] = false;
          turnOver = true;
        }
      }
      
      // Clear multiplier when turn ends for any reason
      if (turnOver || eliminatePlayer) {
        updates['gameData.hasDoubleMultiplier'] = false;
        updates['gameData.multiplierLevel'] = 2; // Reset multiplier level to default
        updates['gameData.doublesThisTurn'] = 0; // Reset doubles count for new turn
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
  static async bankScore(matchId: string, playerId: string, siphonEffect?: { isActive: boolean; opponentId: string }): Promise<void> {
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
      
      // Handle Siphon ability effect if active
      let siphonStolenPoints = 0;
      let siphonPlayerGain = 0;
      if (siphonEffect?.isActive && matchData.gameData.turnScore > 0) {
        // Steal half the turn score (round down)
        const totalStolen = Math.floor(matchData.gameData.turnScore / 2);
        // Split stolen points: half to siphon user, half stays with banking player
        siphonPlayerGain = Math.floor(totalStolen / 2);
        const bankingPlayerKeeps = totalStolen - siphonPlayerGain;
        
        console.log(`🔮 Siphon effect: Stealing ${totalStolen} from turn score. Siphon user gets ${siphonPlayerGain}, banking player keeps ${bankingPlayerKeeps}`);
        
        // Only reduce the turn score by the amount the siphon user gains
        siphonStolenPoints = siphonPlayerGain;
      }
      
      // Calculate new player score based on game mode direction
      let newPlayerScore;
      let bankingSuccess = true;
      
      if (gameMode.rules.scoreDirection === 'down') {
        // Zero Hour: subtract banked score from current score (accounting for siphon)
        const effectiveTurnScore = matchData.gameData.turnScore - siphonStolenPoints;
        const proposedScore = (currentPlayer.playerScore || 0) - effectiveTurnScore;
        
        // Allow banking to 0 or below (this triggers a win)
        newPlayerScore = proposedScore;
        console.log(`💰 Zero Hour - Banked ${effectiveTurnScore} (${matchData.gameData.turnScore} - ${siphonStolenPoints} siphoned), new score: ${newPlayerScore}`);
        
        // Banking always succeeds in Zero Hour (no more bust rule for going below 0)
        bankingSuccess = true;
      } else if (gameMode.id === 'last-line') {
        // Last Line (Tug-of-War): transfer turn score from opponent to current player (accounting for siphon)
        console.log('🎲 Last Line - Banking triggers tug-of-war transfer');
        
        const currentPlayerScore = currentPlayer.playerScore || 0;
        const opponentPlayer = isHost ? matchData.opponentData : matchData.hostData;
        const opponentScore = opponentPlayer.playerScore || 0;
        const effectiveTurnScore = matchData.gameData.turnScore - siphonStolenPoints;
        
        // Calculate transfer amount (transfer effective turn score from opponent to current player)
        const transferAmount = Math.min(effectiveTurnScore, opponentScore);
        newPlayerScore = currentPlayerScore + transferAmount;
        
        console.log(`💰 Last Line - Transferred ${transferAmount} points on bank (${matchData.gameData.turnScore} - ${siphonStolenPoints} siphoned) (opponent: ${opponentScore} -> ${opponentScore - transferAmount}, current: ${currentPlayerScore} -> ${newPlayerScore})`);
        
        // We'll update the opponent score in the updates object below
        bankingSuccess = transferAmount > 0; // Banking succeeds if any points were transferred
      } else {
        // Classic and other modes: add banked score to current score (accounting for siphon)
        const effectiveTurnScore = matchData.gameData.turnScore - siphonStolenPoints;
        newPlayerScore = (currentPlayer.playerScore || 0) + effectiveTurnScore;
        console.log(`💰 Classic - Banked ${effectiveTurnScore} (${matchData.gameData.turnScore} - ${siphonStolenPoints} siphoned), new score: ${newPlayerScore}`);
      }
      
      // Check for win condition based on game mode
      const targetScore = gameMode.rules.targetScore;
      let gameOver = false;
      let winner = '';
      
      if (gameMode.rules.scoreDirection === 'down') {
        // Zero Hour: win by reaching 0 or below (only if banking was successful)
        if (bankingSuccess && newPlayerScore <= 0) {
          gameOver = true;
          winner = currentPlayer.playerDisplayName;
          console.log(`🏆 Zero Hour Victory! ${winner} reached ${newPlayerScore <= 0 ? '0 or below' : 'exactly 0'}`);
          // Ensure the final score is set to 0 if it went below
          newPlayerScore = 0;
        }
      } else if (gameMode.id === 'last-line') {
        // Last Line: tug-of-war mechanics with banking
        if (bankingSuccess) {
          console.log(`🎯 Last Line Score Transfer: ${currentPlayer.playerDisplayName} banked ${matchData.gameData.turnScore}, transferring from opponent`);
          
          // Win conditions will be checked after opponent score update below
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
        'gameData.multiplierLevel': 2, // Reset multiplier level to default
        'gameData.doublesThisTurn': 0, // Reset doubles count for new turn
      };
      
      // 📊 TRACK BANKING STATISTICS (only for successful banks)
      const playerStatsPath = isHost ? 'hostData.matchStats' : 'opponentData.matchStats';
      const currentStats = currentPlayer.matchStats || { banks: 0, doubles: 0, biggestTurnScore: 0, lastDiceSum: 0 };
      
      if (bankingSuccess) {
        updates[`${playerStatsPath}.banks`] = currentStats.banks + 1;
      }
      
      // Update player score (only if banking was successful)
      if (bankingSuccess) {
        // Calculate effective turn score after siphon
        const effectiveTurnScore = matchData.gameData.turnScore - siphonStolenPoints;
        
        if (isHost) {
          updates['hostData.playerScore'] = newPlayerScore;
        } else {
          updates['opponentData.playerScore'] = newPlayerScore;
        }
        
        // If siphon is active, add stolen points to the opponent (siphon user)
        if (siphonEffect?.isActive && siphonPlayerGain > 0) {
          const opponentCurrentScore = isHost ? matchData.opponentData.playerScore : matchData.hostData.playerScore;
          const opponentNewScore = (opponentCurrentScore || 0) + siphonPlayerGain;
          
          if (isHost) {
            updates['opponentData.playerScore'] = opponentNewScore;
          } else {
            updates['hostData.playerScore'] = opponentNewScore;
          }
          
          console.log(`⚔️ Siphon activated: Added ${siphonPlayerGain} stolen points to siphon user. New score: ${opponentNewScore}`);
        }
      }
      
      // Handle Last Line tug-of-war opponent score update and win condition check
      if (gameMode.id === 'last-line' && bankingSuccess) {
        // Calculate opponent's new score (subtract the transferred amount)
        const opponentCurrentScore = isHost ? matchData.opponentData.playerScore : matchData.hostData.playerScore;
        const transferAmount = Math.min(matchData.gameData.turnScore, opponentCurrentScore);
        const opponentNewScore = opponentCurrentScore - transferAmount;
        
        // Update opponent's score
        if (isHost) {
          updates['opponentData.playerScore'] = Math.max(0, opponentNewScore);
        } else {
          updates['hostData.playerScore'] = Math.max(0, opponentNewScore);
        }
        
        console.log(`📊 Opponent score: ${opponentCurrentScore} → ${Math.max(0, opponentNewScore)}`);
        
        // Check win conditions after opponent score update
        if (newPlayerScore <= 0) {
          // Current player reached 0 - opponent wins
          gameOver = true;
          winner = (isHost ? matchData.opponentData : matchData.hostData).playerDisplayName;
          console.log(`🏆 Last Line Victory! ${winner} wins! (${currentPlayer.playerDisplayName} reached 0)`);
        } else if (opponentNewScore <= 0) {
          // Opponent reached 0 - current player wins
          gameOver = true;
          winner = currentPlayer.playerDisplayName;
          console.log(`🏆 Last Line Victory! ${winner} wins! (Opponent reached 0)`);
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
        
        // Check if players are friends for friend-related achievements
        const hostId = matchData.hostData.playerId;
        const opponentId = matchData.opponentData.playerId;
        const isFriendMatch = await this.arePlayersFriends(hostId, opponentId);
        
        console.log(`🤝 Friend check: Host ${hostId} and Opponent ${opponentId} are ${isFriendMatch ? 'friends' : 'not friends'}`);
        
        // Record achievement data for winner
        await achievementService.recordGameEnd(
          winnerId,
          true, // won
          currentDiceRoll,
          {
            opponentId: isHost ? matchData.opponentData.playerId : matchData.hostData.playerId,
            gameMode: matchData.gameMode,
            finalScore: newPlayerScore,
            isFriend: isFriendMatch
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
      
      // First, try to get the match data from active matches
      let matchData = await this.getMatch(matchId);
      
      if (!matchData) {
        // If not found in active matches, check if it's already in completed matches
        console.log('🔍 Match not found in active matches, checking completed matches...');
        try {
          const completedMatchRef = doc(db, 'completedmatches', matchId);
          const completedMatchSnapshot = await getDoc(completedMatchRef);
          
          if (completedMatchSnapshot.exists()) {
            console.log('✅ Found match in completed collection, returning data');
            return completedMatchSnapshot.data() as MatchData;
          }
        } catch (completedError) {
          console.log('🔍 Not found in completed matches either');
        }
        
        console.error('❌ Match not found in either collection:', matchId);
        return null;
      }
      
      // Verify it's actually completed
      if (matchData.gameData.gamePhase !== 'gameOver' || !matchData.gameData.winner) {
        console.error('❌ Match is not completed:', matchId);
        return null;
      }
      
      // Archive the match immediately with duration calculation
      const winner = matchData.gameData.winner;
      const winnerData = matchData.hostData.playerDisplayName === winner 
        ? matchData.hostData 
        : matchData.opponentData;
      
      // Calculate match duration
      const matchStartTime = matchData.startedAt || matchData.gameData?.startedAt || matchData.createdAt;
      const matchDuration = matchStartTime ? Date.now() - matchStartTime.toMillis() : 0;
      
      try {
        await CompletedMatchService.moveMatchToCompleted(matchId, {
          playerId: winnerData.playerId,
          playerDisplayName: winnerData.playerDisplayName,
          finalScore: winnerData.playerScore,
          duration: matchDuration // Pass calculated duration
        });
        console.log('✅ Match data retrieved and archived successfully');
      } catch (archiveError: any) {
        // If archiving fails because match is already moved, that's OK
        if (archiveError.message?.includes('not found')) {
          console.log('ℹ️ Match already archived by another player, continuing...');
        } else {
          console.error('❌ Error archiving match:', archiveError);
        }
      }
      
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
      
      // Calculate match duration
      const matchStartTime = matchData.startedAt || matchData.gameData?.startedAt || matchData.createdAt;
      const matchDuration = matchStartTime ? Date.now() - matchStartTime.toMillis() : 0;
      
      // Update match to completed state
      const updates = {
        'gameData.gamePhase': 'gameOver' as const,
        'gameData.status': 'completed' as const,
        'gameData.winner': winnerData.playerDisplayName,
        'gameData.gameOverReason': `${loserData.playerDisplayName} disconnected`,
        'gameData.duration': matchDuration, // Add duration to match data
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
      
      // 🏆 Move match to completed collection with duration
      try {
        await CompletedMatchService.moveMatchToCompleted(matchId, {
          playerId: winnerData.playerId,
          playerDisplayName: winnerData.playerDisplayName,
          finalScore: winnerData.playerScore,
          duration: matchDuration // Pass calculated duration
        });
      } catch (archiveError) {
        console.warn('⚠️ Failed to archive completed match, but match still ended successfully:', archiveError);
      }
      
      console.log('✅ Match ended successfully due to disconnection');
    } catch (error) {
      console.error('❌ Error ending match:', error);
      throw error;
    }
  }

  /**
   * 🔌 Handle player disconnection with coordinated cleanup
   * This method coordinates between MatchService and GameSessionService
   */
  static async handlePlayerDisconnection(
    matchId: string, 
    playerId: string, 
    fromSession = false
  ): Promise<void> {
    try {
      console.log(`🔌 Handling comprehensive disconnection for player ${playerId} in match ${matchId}`);
      
      // 1. End the match in MatchService
      const matchData = await this.getMatch(matchId);
      if (matchData) {
        // Determine winner (other player)
        const winnerId = matchData.hostData.playerId === playerId 
          ? matchData.opponentData.playerId 
          : matchData.hostData.playerId;
          
        await this.endMatch(matchId, winnerId);
        console.log(`✅ Match ${matchId} ended due to disconnection`);
      }
      
      // 2. Handle session-level cleanup if not already done
      if (!fromSession) {
        try {
          const { GameSessionService } = await import('./gameSessionService');
          await GameSessionService.handlePlayerDisconnection(matchId, playerId);
          console.log(`✅ Session cleanup completed for disconnection`);
        } catch (sessionError) {
          console.error(`⚠️ Session cleanup failed (session may not exist):`, sessionError);
        }
      }
      
      // 3. Clean up any waiting room entries
      try {
        await this.cleanupPlayerWaitingRooms(playerId);
        console.log(`✅ Waiting room cleanup completed`);
      } catch (waitingError) {
        console.error(`⚠️ Waiting room cleanup failed:`, waitingError);
      }
      
      // 4. Remove from active game tracking
      try {
        await this.removeFromActiveGames(playerId);
        console.log(`✅ Active games cleanup completed`);
      } catch (activeError) {
        console.error(`⚠️ Active games cleanup failed:`, activeError);
      }
      
      console.log(`✅ Comprehensive disconnection handling completed for ${playerId}`);
      
    } catch (error) {
      console.error(`❌ Error in comprehensive disconnection handling:`, error);
      throw error;
    }
  }

  /**
   * 🧹 Clean up player's waiting room entries
   */
  private static async cleanupPlayerWaitingRooms(playerId: string): Promise<void> {
    try {
      const waitingRoomsQuery = query(
        collection(db, 'waitingroom'),
        where('hostData.playerId', '==', playerId)
      );
      
      const snapshot = await getDocs(waitingRoomsQuery);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (snapshot.docs.length > 0) {
        await batch.commit();
        console.log(`🧹 Cleaned up ${snapshot.docs.length} waiting room entries for ${playerId}`);
      }
    } catch (error) {
      console.error(`❌ Error cleaning up waiting rooms:`, error);
    }
  }

  /**
   * 🎮 Remove player from active games tracking
   */
  private static async removeFromActiveGames(playerId: string): Promise<void> {
    try {
      // Clean up activeGamesSessions collection entries
      const activeGamesQuery = query(
        collection(db, 'activeGamesSessions'),
        where('playerId', '==', playerId)
      );
      
      const snapshot = await getDocs(activeGamesQuery);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (snapshot.docs.length > 0) {
        await batch.commit();
        console.log(`🎮 Removed ${snapshot.docs.length} active game entries for ${playerId}`);
      }
    } catch (error) {
      console.error(`❌ Error removing from active games:`, error);
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

  /**
   * Helper method to convert numbers to words for achievement metrics
   */
  private static numberToWord(num: number): string {
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
    return words[num] || '';
  }

  /**
   * Helper method to check if two players are friends
   */
  private static async arePlayersFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      const friendshipQuery = query(
        collection(db, 'friends'),
        where('userId', '==', userId1),
        where('friendId', '==', userId2),
        where('status', '==', 'accepted')
      );
      
      const snapshot = await getDocs(friendshipQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('❌ Error checking friendship:', error);
      return false;
    }
  }
}
