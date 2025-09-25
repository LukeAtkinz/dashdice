import { DashDiceAPI } from './apiClientNew';

/**
 * Bot Matching Service - Simplified for Unified Backend
 */
export class BotMatchingService {
  private static readonly BOT_MATCH_TIMEOUT = 10000;
  private static isMatching = false;

  static async findAndJoinUserMatch(
    userId: string, 
    gameMode: string = 'quickfire'
  ): Promise<{success: boolean; matchId?: string; message?: string; error?: string;}> {
    if (this.isMatching) {
      return { success: false, message: 'Bot matching already active' };
    }

    this.isMatching = true;
    try {
      await new Promise(resolve => setTimeout(resolve, this.BOT_MATCH_TIMEOUT));
      return { success: true, message: 'Backend handling bot matching' };
    } catch (error) {
      return { success: false, error: 'Bot matching service failed' };
    } finally {
      this.isMatching = false;
    }
  }

  static async startBotMatchingForSession(sessionId: string): Promise<void> {
    console.log(' Legacy - backend handles automatically');
  }

  static cancelBotMatching(sessionId: string): void {
    console.log(' Legacy cancel - no action needed');
  }

  static startBotFallbackTimer(sessionId: string, hostPlayerId: string, gameMode: string, sessionType: 'quick' | 'ranked'): void {
    console.log(' Legacy fallback timer - backend handles automatically');
  }

  static clearBotFallbackTimer(sessionId: string): void {}
  static startGuestBotTimer(sessionId: string, hostPlayerId: string, gameMode: string, sessionType: 'quick' | 'ranked' = 'quick'): void {}
  static async getBotAvailabilityStatus(): Promise<{available: boolean; count: number; source: 'bot_profiles' | 'users' | 'fallback';}> {
    return { available: true, count: 1, source: 'fallback' };
  }
  static clearAllBotTimers(): void {}
  static getActiveTimerCount(): number { return 0; }
}
