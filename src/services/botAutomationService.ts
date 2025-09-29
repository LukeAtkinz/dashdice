import { db } from './firebase';
import { doc, onSnapshot, collection, updateDoc, getDoc } from 'firebase/firestore';
import { BotAIService } from './botAIService';
import { MatchService } from './matchService';
import { BotProfile, BotDecisionContext } from '@/types/bot';
import { MatchData } from '@/types/match';

/**
 * Bot Automation Service
 * Handles automated bot gameplay by monitoring matches and triggering AI decisions
 */
export class BotAutomationService {
  private static activeListeners = new Map<string, () => void>();
  private static botTurnTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Start monitoring a match for bot automation
   */
  static startMatchMonitoring(matchId: string): void {
    console.log(`🤖 Starting bot automation monitoring for match: ${matchId}`);
    
    // Don't create duplicate listeners
    if (this.activeListeners.has(matchId)) {
      console.log(`⚠️ Already monitoring match ${matchId}`);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (doc) => {
      if (doc.exists()) {
        const matchData = { ...doc.data(), id: doc.id } as MatchData;
        this.handleMatchUpdate(matchData);
      }
    });

    this.activeListeners.set(matchId, unsubscribe);
  }

  /**
   * Stop monitoring a match
   */
  static stopMatchMonitoring(matchId: string): void {
    console.log(`🛑 Stopping bot automation monitoring for match: ${matchId}`);
    
    const unsubscribe = this.activeListeners.get(matchId);
    if (unsubscribe) {
      unsubscribe();
      this.activeListeners.delete(matchId);
    }

    // Clear any pending bot timeouts
    const timeout = this.botTurnTimeouts.get(matchId);
    if (timeout) {
      clearTimeout(timeout);
      this.botTurnTimeouts.delete(matchId);
    }
  }

  /**
   * Handle match state updates and trigger bot actions
   */
  private static async handleMatchUpdate(matchData: MatchData): Promise<void> {
    try {
      console.log(`🔍 Bot automation checking match ${matchData.id}:`, {
        status: matchData.status,
        gamePhase: matchData.gameData?.gamePhase,
        hostId: matchData.hostData?.playerId,
        opponentId: matchData.opponentData?.playerId,
        hostTurnActive: matchData.hostData?.turnActive,
        opponentTurnActive: matchData.opponentData?.turnActive
      });

      // Only process active matches in gameplay or turnDecider phase
      if (matchData.status !== 'active' || 
          !['gameplay', 'turnDecider'].includes(matchData.gameData.gamePhase)) {
        console.log(`🚫 Skipping match ${matchData.id} - status: ${matchData.status}, phase: ${matchData.gameData?.gamePhase}`);
        return;
      }

      // Check if it's a bot's turn
      const activeBot = this.getActiveBotPlayer(matchData);
      if (!activeBot) {
        console.log(`🚫 No active bot found in match ${matchData.id}`);
        return; // No bot is active
      }

      console.log(`🤖 Bot ${activeBot.playerDisplayName} is active in match ${matchData.id}`);

      // Handle different game phases
      if (matchData.gameData.gamePhase === 'turnDecider') {
        await this.handleBotTurnDecider(matchData, activeBot);
      } else if (matchData.gameData.gamePhase === 'gameplay') {
        await this.handleBotGameplay(matchData, activeBot);
      }

    } catch (error) {
      console.error(`❌ Error handling bot automation for match ${matchData.id}:`, error);
    }
  }

  /**
   * Handle bot turn decider choice
   */
  private static async handleBotTurnDecider(matchData: MatchData, botPlayer: any): Promise<void> {
    // Check if bot needs to make turn decider choice
    if (matchData.gameData.turnDecider === undefined || 
        matchData.gameData.turnDeciderChoice) {
      return; // Choice already made or not needed
    }

    const isHost = matchData.hostData.playerId === botPlayer.playerId;
    const turnDeciderPlayer = matchData.gameData.turnDecider === 1 ? 1 : 2;
    const botPlayerIndex = isHost ? 1 : 2;

    if (turnDeciderPlayer !== botPlayerIndex) {
      return; // Not this bot's turn to choose
    }

    console.log(`🎯 Bot ${botPlayer.playerDisplayName} making turn decider choice`);

    // Bot makes random choice with slight delay for realism
    setTimeout(async () => {
      const choice = Math.random() > 0.5 ? 'odd' : 'even';
      console.log(`🤖 Bot choosing: ${choice}`);
      
      try {
        await MatchService.makeTurnDeciderChoice(matchData.id!, botPlayer.playerId, choice);
      } catch (error) {
        console.error(`❌ Error making bot turn decider choice:`, error);
      }
    }, 1500 + Math.random() * 2000); // 1.5-3.5 second delay
  }

  /**
   * Handle bot gameplay actions
   */
  private static async handleBotGameplay(matchData: MatchData, botPlayer: any): Promise<void> {
    // Check if bot is actively playing
    if (!botPlayer.turnActive || matchData.gameData.isRolling) {
      return; // Not bot's turn or dice are rolling
    }

    // Get bot profile for AI decision making
    const botProfile = await this.getBotProfile(botPlayer.playerId);
    if (!botProfile) {
      console.warn(`⚠️ Could not find bot profile for ${botPlayer.playerId}`);
      return;
    }

    // Build decision context
    const opponentPlayer = matchData.hostData.playerId === botPlayer.playerId 
      ? matchData.opponentData 
      : matchData.hostData;

    const context: BotDecisionContext = {
      currentScore: botPlayer.playerScore || 0,
      opponentScore: opponentPlayer.playerScore || 0,
      turnScore: matchData.gameData.turnScore || 0,
      diceRolls: this.estimateDiceRolls(matchData),
      gameMode: matchData.gameMode,
      targetScore: matchData.gameData.roundObjective || 100,
      turnsPlayed: 1, // Simplified for now
      banksThisTurn: 0,
      consecutiveTurns: 1,
      opponentBankingPattern: [],
      opponentAggressiveness: 0.5,
      opponentLastActions: [],
      isLosingBadly: (botPlayer.playerScore || 0) < (opponentPlayer.playerScore || 0) - 30,
      isWinningBig: (botPlayer.playerScore || 0) > (opponentPlayer.playerScore || 0) + 30,
      currentDateTime: new Date()
    };

    // Make AI decision
    const decision = BotAIService.makeDecision(botProfile, context);
    console.log(`🧠 Bot ${botProfile.displayName} decision:`, decision);

    // Execute decision with delay for realism
    const delayMs = decision.delayMs || (2000 + Math.random() * 3000); // 2-5 seconds
    
    // Clear any existing timeout for this match
    const existingTimeout = this.botTurnTimeouts.get(matchData.id!);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        if (decision.action === 'roll') {
          console.log(`🎲 Bot ${botProfile.displayName} rolling dice`);
          await MatchService.rollDice(matchData.id!, botPlayer.playerId);
        } else if (decision.action === 'bank') {
          console.log(`🏦 Bot ${botProfile.displayName} banking score`);
          await MatchService.bankScore(matchData.id!, botPlayer.playerId);
        }
      } catch (error) {
        console.error(`❌ Error executing bot action:`, error);
      } finally {
        this.botTurnTimeouts.delete(matchData.id!);
      }
    }, delayMs);

    this.botTurnTimeouts.set(matchData.id!, timeout);
  }

  /**
   * Get the active bot player from match data
   */
  private static getActiveBotPlayer(matchData: MatchData): any | null {
    // Check if host is a bot and active
    if (matchData.hostData.playerId.includes('bot') && 
        (matchData.hostData.turnActive || this.isBotTurnDecider(matchData, matchData.hostData))) {
      return matchData.hostData;
    }

    // Check if opponent is a bot and active
    if (matchData.opponentData?.playerId.includes('bot') && 
        (matchData.opponentData.turnActive || this.isBotTurnDecider(matchData, matchData.opponentData))) {
      return matchData.opponentData;
    }

    return null;
  }

  /**
   * Check if a player is the bot that needs to make turn decider choice
   */
  private static isBotTurnDecider(matchData: MatchData, player: any): boolean {
    if (matchData.gameData.gamePhase !== 'turnDecider' || 
        matchData.gameData.turnDeciderChoice) {
      return false;
    }

    const isHost = matchData.hostData.playerId === player.playerId;
    const turnDeciderPlayer = matchData.gameData.turnDecider === 1 ? 1 : 2;
    const playerIndex = isHost ? 1 : 2;

    return turnDeciderPlayer === playerIndex;
  }

  /**
   * Get bot profile from Firebase
   */
  private static async getBotProfile(botId: string): Promise<BotProfile | null> {
    try {
      const botDoc = await getDoc(doc(db, 'bots', botId));
      if (botDoc.exists()) {
        return { ...botDoc.data(), id: botDoc.id } as unknown as BotProfile;
      }
    } catch (error) {
      console.error(`❌ Error fetching bot profile for ${botId}:`, error);
    }
    return null;
  }

  /**
   * Estimate number of dice rolls this turn (simplified)
   */
  private static estimateDiceRolls(matchData: MatchData): number {
    const turnScore = matchData.gameData.turnScore || 0;
    // Rough estimation: average 7 points per roll
    return Math.max(1, Math.floor(turnScore / 7));
  }

  /**
   * Clean up all listeners (for app shutdown)
   */
  static cleanup(): void {
    console.log(`🧹 Cleaning up ${this.activeListeners.size} bot automation listeners`);
    
    this.activeListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.activeListeners.clear();

    this.botTurnTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.botTurnTimeouts.clear();
  }
}