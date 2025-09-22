/**
 * Bot Game Controller
 * Handles bot AI integration during actual gameplay
 * Monitors match state and executes bot actions when it's the bot's turn
 */

import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { MatchService } from './matchService';

interface BotGameSession {
  matchId: string;
  botPlayerId: string;
  unsubscribe: Unsubscribe | null;
  isActive: boolean;
}

interface MatchState {
  gameData: {
    gamePhase: string;
    turnDecider?: number;
    turnScore: number;
    diceOne: number;
    diceTwo: number;
    roundObjective: number;
    isRolling?: boolean;
    status: string;
  };
  hostData: {
    playerId: string;
    turnActive: boolean;
    playerScore: number;
  };
  opponentData: {
    playerId: string;
    turnActive: boolean;
    playerScore: number;
  };
}

interface BotDecision {
  action: 'roll' | 'bank' | 'wait';
  reasoning: string;
  confidence: number;
  delay: number;
}

export class BotGameController {
  private static instance: BotGameController | null = null;
  private activeSessions: Map<string, BotGameSession> = new Map();
  
  private constructor() {}
  
  static getInstance(): BotGameController {
    if (!this.instance) {
      this.instance = new BotGameController();
    }
    return this.instance;
  }
  
  /**
   * Start monitoring a match for bot AI actions
   */
  startBotSession(matchId: string, botPlayerId: string): void {
    console.log('🤖 BotGameController: Starting bot session for match:', matchId, 'bot:', botPlayerId);
    
    // Clean up existing session if any
    this.stopBotSession(matchId);
    
    // Create new session
    const session: BotGameSession = {
      matchId,
      botPlayerId,
      unsubscribe: null,
      isActive: true
    };
    
    // Start monitoring match state
    session.unsubscribe = onSnapshot(doc(db, 'matches', matchId), (doc) => {
      if (!doc.exists() || !session.isActive) return;
      
      const matchData = doc.data() as MatchState;
      this.handleMatchStateUpdate(session, matchData);
    });
    
    this.activeSessions.set(matchId, session);
    console.log('✅ BotGameController: Bot session started for:', matchId);
  }
  
  /**
   * Stop monitoring a match (when match ends or bot leaves)
   */
  stopBotSession(matchId: string): void {
    const session = this.activeSessions.get(matchId);
    if (session) {
      console.log('🛑 BotGameController: Stopping bot session for:', matchId);
      session.isActive = false;
      session.unsubscribe?.();
      this.activeSessions.delete(matchId);
    }
  }
  
  /**
   * Check if it's the bot's turn and make appropriate action
   */
  private async handleMatchStateUpdate(session: BotGameSession, matchData: MatchState): Promise<void> {
    const { matchId, botPlayerId } = session;
    
    try {
      // Defensive logging to understand match data structure
      console.log('🔍 BotGameController: Match data structure:', {
        hasHostData: !!matchData.hostData,
        hasOpponentData: !!matchData.opponentData,
        hostPlayerID: matchData.hostData?.playerId,
        opponentPlayerID: matchData.opponentData?.playerId,
        hostTurnActive: matchData.hostData?.turnActive,
        opponentTurnActive: matchData.opponentData?.turnActive,
      });
      
      // Determine if it's the bot's turn
      const isBotHost = matchData.hostData?.playerId === botPlayerId;
      const isBotOpponent = matchData.opponentData?.playerId === botPlayerId;
      
      if (!isBotHost && !isBotOpponent) {
        console.log('⚠️ BotGameController: Bot not found in match players');
        return;
      }
      
      const botData = isBotHost ? matchData.hostData : matchData.opponentData;
      const humanData = isBotHost ? matchData.opponentData : matchData.hostData;
      
      // Defensive checks for data structure
      if (!botData || !humanData) {
        console.log('⚠️ BotGameController: Missing player data:', {
          botData: !!botData,
          humanData: !!humanData
        });
        return;
      }
      
      // Check if it's the bot's turn and game is in active state
      const isBotTurn = botData.turnActive;
      const gameInProgress = matchData.gameData?.status === 'active' || matchData.gameData?.gamePhase === 'gameplay';
      const notCurrentlyRolling = !matchData.gameData?.isRolling;
      
      console.log('🔍 BotGameController: Turn check:', {
        isBotTurn,
        gameInProgress,
        notCurrentlyRolling,
        gameStatus: matchData.gameData?.status,
        gamePhase: matchData.gameData?.gamePhase
      });
      
      if (!isBotTurn || !gameInProgress || !notCurrentlyRolling) {
        return; // Not bot's turn or game not ready
      }
      
      console.log('🎯 BotGameController: Bot turn detected, making decision...', {
        matchId,
        botPlayerId,
        turnScore: matchData.gameData.turnScore,
        botScore: botData.playerScore,
        humanScore: humanData.playerScore,
        gamePhase: matchData.gameData.gamePhase
      });
      
      // Get bot decision
      const decision = await this.getBotDecision(matchData, botPlayerId, isBotHost);
      
      // Apply realistic delay
      setTimeout(async () => {
        if (!session.isActive) return;
        
        try {
          await this.executeBotAction(matchId, botPlayerId, decision);
        } catch (error) {
          console.error('❌ BotGameController: Error executing bot action:', error);
        }
      }, decision.delay);
      
    } catch (error) {
      console.error('❌ BotGameController: Error in match state update:', error);
    }
  }
  
  /**
   * Get decision from bot AI system
   */
  private async getBotDecision(matchData: MatchState, botPlayerId: string, isBotHost: boolean): Promise<BotDecision> {
    try {
      const botData = isBotHost ? matchData.hostData : matchData.opponentData;
      const humanData = isBotHost ? matchData.opponentData : matchData.hostData;
      
      // Prepare game state for AI engine
      const gameState = {
        currentScore: botData.playerScore,
        opponentScore: humanData.playerScore,
        turnScore: matchData.gameData.turnScore,
        targetScore: matchData.gameData.roundObjective,
        diceOne: matchData.gameData.diceOne,
        diceTwo: matchData.gameData.diceTwo,
        gamePhase: matchData.gameData.gamePhase,
        turnDecider: matchData.gameData.turnDecider
      };
      
      // Call Go backend bot AI service
      const botServiceUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';
      const response = await fetch(`${botServiceUrl}/api/v1/internal/bots/${botPlayerId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPlayer: botPlayerId,
          gameData: gameState,
          actionType: 'turn_action'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Bot AI API failed: ${response.status}`);
      }
      
      const aiResponse = await response.json();
      console.log('🧠 BotGameController: AI decision received:', aiResponse);
      
      return {
        action: aiResponse.decision?.data?.should_bank ? 'bank' : 'roll',
        reasoning: aiResponse.decision?.reasoning || 'AI decision',
        confidence: aiResponse.decision?.confidence || 0.7,
        delay: aiResponse.decision?.delay || this.calculateRealisticDelay()
      };
      
    } catch (error) {
      console.error('❌ BotGameController: Error getting AI decision, using fallback:', error);
      
      // Fallback decision logic
      return this.getFallbackDecision(matchData);
    }
  }
  
  /**
   * Execute the bot's action in the match
   */
  private async executeBotAction(matchId: string, botPlayerId: string, decision: BotDecision): Promise<void> {
    console.log(`🎮 BotGameController: Executing bot action: ${decision.action} (${decision.reasoning})`);
    
    try {
      if (decision.action === 'bank') {
        await MatchService.bankScore(matchId, botPlayerId);
        console.log('✅ BotGameController: Bot banked score successfully');
      } else if (decision.action === 'roll') {
        await MatchService.rollDice(matchId, botPlayerId);
        console.log('✅ BotGameController: Bot rolled dice successfully');
      }
    } catch (error) {
      console.error('❌ BotGameController: Error executing bot action:', error);
      throw error;
    }
  }
  
  /**
   * Fallback decision logic when AI service is unavailable
   */
  private getFallbackDecision(matchData: MatchState): BotDecision {
    const turnScore = matchData.gameData.turnScore;
    const targetScore = matchData.gameData.roundObjective;
    
    // Simple fallback logic
    if (turnScore >= 25 || turnScore >= targetScore * 0.3) {
      return {
        action: 'bank',
        reasoning: 'Fallback: Playing it safe',
        confidence: 0.6,
        delay: this.calculateRealisticDelay()
      };
    } else {
      return {
        action: 'roll',
        reasoning: 'Fallback: Building score',
        confidence: 0.5,
        delay: this.calculateRealisticDelay()
      };
    }
  }
  
  /**
   * Calculate realistic human-like delay for bot actions
   */
  private calculateRealisticDelay(): number {
    // Random delay between 2-6 seconds for realistic feel
    return Math.floor(Math.random() * 4000) + 2000;
  }
  
  /**
   * Check if a player ID is a bot
   */
  static isBotPlayer(playerId: string): boolean {
    return playerId.startsWith('bot_');
  }
  
  /**
   * Get all active bot sessions (for debugging)
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }
  
  /**
   * Cleanup all sessions (for app shutdown)
   */
  cleanup(): void {
    console.log('🧹 BotGameController: Cleaning up all bot sessions');
    for (const [matchId] of this.activeSessions) {
      this.stopBotSession(matchId);
    }
  }
}

export default BotGameController;