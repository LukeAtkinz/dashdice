import { SessionPlayerData } from './gameSessionService';
import { SkillRating } from './skillBasedMatchmaking';

export interface QueueEntry {
  id: string;
  playerId: string;
  playerData: SessionPlayerData;
  gameMode: string;
  sessionType: 'quick' | 'ranked' | 'tournament' | 'custom';
  skillRating?: SkillRating;
  joinedAt: Date;
  waitTime: number;
  preferences: MatchmakingPreferences;
  priority: number; // Higher = higher priority
}

export interface MatchmakingPreferences {
  maxWaitTime: number; // in milliseconds
  skillTolerance: 'strict' | 'balanced' | 'loose';
  regionPreference?: string;
  allowCrossPlatform?: boolean;
  preferredGameSpeed?: 'slow' | 'normal' | 'fast';
  avoidRecentOpponents?: boolean;
}

export interface QueueStatus {
  queueLength: number;
  estimatedWaitTime: number;
  averageSkillLevel: number;
  position: number;
}

export class MatchmakingQueueService {
  private static queues: Map<string, QueueEntry[]> = new Map();
  private static readonly MAX_WAIT_TIME = 300000; // 5 minutes
  private static readonly PRIORITY_BOOST_INTERVAL = 30000; // 30 seconds

  /**
   * Add player to matchmaking queue
   */
  static async joinQueue(
    playerId: string,
    playerData: SessionPlayerData,
    gameMode: string,
    sessionType: 'quick' | 'ranked' | 'tournament' | 'custom',
    preferences: MatchmakingPreferences,
    skillRating?: SkillRating
  ): Promise<string> {
    const queueKey = `${gameMode}-${sessionType}`;
    
    if (!this.queues.has(queueKey)) {
      this.queues.set(queueKey, []);
    }

    const queue = this.queues.get(queueKey)!;
    
    // Remove player if already in queue
    await this.leaveQueue(playerId, gameMode, sessionType);

    const entry: QueueEntry = {
      id: `${playerId}-${Date.now()}`,
      playerId,
      playerData,
      gameMode,
      sessionType,
      skillRating,
      joinedAt: new Date(),
      waitTime: 0,
      preferences,
      priority: this.calculateInitialPriority(sessionType, skillRating)
    };

    queue.push(entry);
    console.log(`🎯 Player ${playerId} joined ${queueKey} queue`);
    
    return entry.id;
  }

  /**
   * Remove player from queue
   */
  static async leaveQueue(
    playerId: string,
    gameMode: string,
    sessionType: string
  ): Promise<boolean> {
    const queueKey = `${gameMode}-${sessionType}`;
    const queue = this.queues.get(queueKey);
    
    if (!queue) return false;

    const index = queue.findIndex(entry => entry.playerId === playerId);
    if (index === -1) return false;

    queue.splice(index, 1);
    console.log(`🚪 Player ${playerId} left ${queueKey} queue`);
    return true;
  }

  /**
   * Find the best match for a player
   */
  static async findMatch(
    playerId: string,
    gameMode: string,
    sessionType: string
  ): Promise<QueueEntry[]> {
    const queueKey = `${gameMode}-${sessionType}`;
    const queue = this.queues.get(queueKey);
    
    if (!queue || queue.length < 2) return [];

    const playerEntry = queue.find(entry => entry.playerId === playerId);
    if (!playerEntry) return [];

    // Update wait times and priorities
    this.updateQueuePriorities(queue);

    // Find compatible opponents
    const compatibleOpponents = this.findCompatibleOpponents(playerEntry, queue);
    
    if (compatibleOpponents.length === 0) return [];

    // Select best opponent based on skill, wait time, and preferences
    const bestOpponent = this.selectBestOpponent(playerEntry, compatibleOpponents);
    
    if (bestOpponent) {
      // Remove both players from queue
      const playerIndex = queue.indexOf(playerEntry);
      const opponentIndex = queue.indexOf(bestOpponent);
      
      // Remove in reverse order to maintain indices
      if (playerIndex > opponentIndex) {
        queue.splice(playerIndex, 1);
        queue.splice(opponentIndex, 1);
      } else {
        queue.splice(opponentIndex, 1);
        queue.splice(playerIndex, 1);
      }

      return [playerEntry, bestOpponent];
    }

    return [];
  }

  /**
   * Get queue status for a player
   */
  static getQueueStatus(
    playerId: string,
    gameMode: string,
    sessionType: string
  ): QueueStatus | null {
    const queueKey = `${gameMode}-${sessionType}`;
    const queue = this.queues.get(queueKey);
    
    if (!queue) return null;

    const playerIndex = queue.findIndex(entry => entry.playerId === playerId);
    if (playerIndex === -1) return null;

    const totalSkill = queue.reduce((sum, entry) => 
      sum + (entry.skillRating?.rating || 1200), 0
    );

    return {
      queueLength: queue.length,
      estimatedWaitTime: this.estimateWaitTime(queue, playerIndex),
      averageSkillLevel: totalSkill / queue.length,
      position: playerIndex + 1
    };
  }

  /**
   * Clean up expired queue entries
   */
  static cleanupExpiredEntries(): void {
    const now = Date.now();
    
    for (const [queueKey, queue] of this.queues.entries()) {
      const expiredEntries = queue.filter(entry => 
        now - entry.joinedAt.getTime() > this.MAX_WAIT_TIME
      );

      for (const entry of expiredEntries) {
        const index = queue.indexOf(entry);
        queue.splice(index, 1);
        console.log(`⏰ Removed expired entry for player ${entry.playerId} from ${queueKey}`);
      }
    }
  }

  /**
   * Calculate initial priority for a player
   */
  private static calculateInitialPriority(
    sessionType: string,
    skillRating?: SkillRating
  ): number {
    let priority = 100; // Base priority

    if (sessionType === 'ranked') {
      priority += 50; // Ranked games get higher priority
    }

    if (skillRating && skillRating.gamesPlayed < 10) {
      priority += 25; // New players get slight boost
    }

    return priority;
  }

  /**
   * Update queue priorities based on wait time
   */
  private static updateQueuePriorities(queue: QueueEntry[]): void {
    const now = Date.now();
    
    for (const entry of queue) {
      entry.waitTime = now - entry.joinedAt.getTime();
      
      // Boost priority for long-waiting players
      const waitTimeBoost = Math.floor(entry.waitTime / this.PRIORITY_BOOST_INTERVAL) * 10;
      entry.priority += waitTimeBoost;
    }
  }

  /**
   * Find compatible opponents for a player
   */
  private static findCompatibleOpponents(
    player: QueueEntry,
    queue: QueueEntry[]
  ): QueueEntry[] {
    return queue.filter(entry => {
      if (entry.playerId === player.playerId) return false;

      // Check skill compatibility
      if (player.skillRating && entry.skillRating) {
        const skillDiff = Math.abs(player.skillRating.rating - entry.skillRating.rating);
        const tolerance = this.getSkillTolerance(player.preferences.skillTolerance, player.waitTime);
        
        if (skillDiff > tolerance) return false;
      }

      // Check other preferences (region, cross-platform, etc.)
      // TODO: Implement additional preference checks

      return true;
    });
  }

  /**
   * Select the best opponent from compatible players
   */
  private static selectBestOpponent(
    player: QueueEntry,
    opponents: QueueEntry[]
  ): QueueEntry | null {
    if (opponents.length === 0) return null;

    // Score each opponent
    const scoredOpponents = opponents.map(opponent => ({
      opponent,
      score: this.calculateMatchScore(player, opponent)
    }));

    // Sort by score (higher = better match)
    scoredOpponents.sort((a, b) => b.score - a.score);

    return scoredOpponents[0].opponent;
  }

  /**
   * Calculate match quality score
   */
  private static calculateMatchScore(player: QueueEntry, opponent: QueueEntry): number {
    let score = 100;

    // Skill difference penalty
    if (player.skillRating && opponent.skillRating) {
      const skillDiff = Math.abs(player.skillRating.rating - opponent.skillRating.rating);
      score -= skillDiff / 10; // Penalty for skill difference
    }

    // Wait time bonus
    const avgWaitTime = (player.waitTime + opponent.waitTime) / 2;
    score += Math.min(avgWaitTime / 1000, 50); // Bonus for longer wait times

    // Priority bonus
    score += (player.priority + opponent.priority) / 20;

    return score;
  }

  /**
   * Get skill tolerance based on preferences and wait time
   */
  private static getSkillTolerance(tolerance: string, waitTime: number): number {
    let baseTolerance = 100;

    switch (tolerance) {
      case 'strict': baseTolerance = 50; break;
      case 'balanced': baseTolerance = 100; break;
      case 'loose': baseTolerance = 200; break;
    }

    // Expand tolerance over time
    const waitTimeBonus = Math.min(waitTime / 1000, 100);
    return baseTolerance + waitTimeBonus;
  }

  /**
   * Estimate wait time for a player
   */
  private static estimateWaitTime(queue: QueueEntry[], playerIndex: number): number {
    const baseWaitTime = 30000; // 30 seconds base
    const queuePositionPenalty = playerIndex * 5000; // 5 seconds per position
    const queueSizeFactor = Math.max(1, queue.length / 10); // Scale with queue size

    return Math.round((baseWaitTime + queuePositionPenalty) * queueSizeFactor);
  }
}

// Initialize cleanup interval
setInterval(() => {
  MatchmakingQueueService.cleanupExpiredEntries();
}, 30000); // Clean up every 30 seconds
