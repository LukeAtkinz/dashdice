import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  runTransaction,
  orderBy,
  limit,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { SessionPlayerData, SessionConfiguration, SessionType } from './gameSessionService';
import { GameSessionService } from './gameSessionService';

export interface QueuePlayer {
  id: string;
  playerId: string;
  playerData: SessionPlayerData;
  gameMode: string;
  sessionType: 'quick' | 'ranked' | 'tournament';
  skillRating: number;
  priority: number;
  joinedAt: Date;
  lastActivity: Date;
  waitTime: number;
  region: string;
  preferences: QueuePreferences;
  matchAttempts: number;
  queueVersion: number;
}

export interface QueuePreferences {
  maxWaitTime: number;
  skillTolerance: 'strict' | 'balanced' | 'loose';
  regionPreference: string;
  allowCrossPlatform: boolean;
  preferredGameSpeed: 'slow' | 'normal' | 'fast';
  avoidRecentOpponents: boolean;
  premiumPriority: boolean;
}

export interface QueueSegment {
  id: string;
  gameMode: string;
  sessionType: string;
  skillRangeMin: number;
  skillRangeMax: number;
  region: string;
  players: string[]; // Player IDs
  lastProcessed: Date;
  isActive: boolean;
}

export interface MatchmakingPool {
  poolId: string;
  gameMode: string;
  sessionType: string;
  players: QueuePlayer[];
  skillRange: [number, number];
  avgWaitTime: number;
  processedAt: Date;
  region: string;
}

export interface QueueStats {
  totalPlayers: number;
  averageWaitTime: number;
  successfulMatches: number;
  failedMatches: number;
  queuesByMode: Record<string, number>;
  queuesByRegion: Record<string, number>;
  queuesBySkill: Record<string, number>;
  concurrentLoad: number;
  processingRate: number;
}

/**
 * Advanced Queue Management Service
 * Handles thousands of concurrent players with intelligent segmentation and load balancing
 */
export class AdvancedQueueManagementService {
  private static readonly COLLECTION_NAME = 'matchmakingQueues';
  private static readonly SEGMENTS_COLLECTION = 'queueSegments';
  private static readonly POOLS_COLLECTION = 'matchmakingPools';
  
  // Performance thresholds
  private static readonly MAX_QUEUE_SIZE = 1000; // Per segment
  private static readonly SEGMENT_SPLIT_THRESHOLD = 500;
  private static readonly PROCESSING_INTERVAL = 2000; // 2 seconds
  private static readonly HIGH_LOAD_THRESHOLD = 5000; // Total players
  
  // Skill ranges for segmentation
  private static readonly SKILL_RANGES = [
    [0, 500],      // Beginner
    [500, 1000],   // Intermediate  
    [1000, 1500],  // Advanced
    [1500, 2000],  // Expert
    [2000, 3000]   // Master
  ];
  
  // Priority weights
  private static readonly PRIORITY_WEIGHTS = {
    premium: 1000,
    ranked: 500,
    longWait: 300,
    newPlayer: 200,
    streak: 100
  };

  private static processingTimers: Map<string, NodeJS.Timeout> = new Map();
  private static queueStats: QueueStats = {
    totalPlayers: 0,
    averageWaitTime: 0,
    successfulMatches: 0,
    failedMatches: 0,
    queuesByMode: {},
    queuesByRegion: {},
    queuesBySkill: {},
    concurrentLoad: 0,
    processingRate: 0
  };

  /**
   * Add player to intelligent queue with automatic segmentation
   */
  static async joinQueue(
    playerData: SessionPlayerData,
    gameMode: string,
    sessionType: 'quick' | 'ranked' | 'tournament',
    preferences: QueuePreferences,
    region: string = 'global'
  ): Promise<{
    success: boolean;
    queueId: string;
    segmentId: string;
    estimatedWaitTime: number;
    queuePosition: number;
  }> {
    try {
      console.log(`🎯 Adding player ${playerData.playerId} to ${gameMode} ${sessionType} queue`);

      // Check if player is already in queue
      const existingEntry = await this.findPlayerInQueue(playerData.playerId);
      if (existingEntry) {
        await this.leaveQueue(playerData.playerId);
      }

      // Calculate skill rating and priority
      const skillRating = this.calculateSkillRating(playerData);
      const priority = this.calculatePlayerPriority(playerData, preferences, sessionType);

      // Find or create appropriate segment
      const segment = await this.findBestSegment(gameMode, sessionType, skillRating, region);

      // Create queue player entry
      const queuePlayer: Omit<QueuePlayer, 'id'> = {
        playerId: playerData.playerId,
        playerData,
        gameMode,
        sessionType,
        skillRating,
        priority,
        joinedAt: new Date(),
        lastActivity: new Date(),
        waitTime: 0,
        region,
        preferences,
        matchAttempts: 0,
        queueVersion: 1
      };

      // Add to database
      const queueRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...queuePlayer,
        joinedAt: serverTimestamp(),
        lastActivity: serverTimestamp()
      });

      // Update segment
      await this.addPlayerToSegment(segment.id, queueRef.id);

      // Start processing this segment if not already running
      this.startSegmentProcessing(segment.id);

      // Calculate queue position and estimated wait time
      const queueStatus = await this.getQueuePosition(queueRef.id, segment.id);

      console.log(`✅ Player ${playerData.playerId} added to queue ${queueRef.id} in segment ${segment.id}`);

      return {
        success: true,
        queueId: queueRef.id,
        segmentId: segment.id,
        estimatedWaitTime: queueStatus.estimatedWaitTime,
        queuePosition: queueStatus.position
      };

    } catch (error) {
      console.error('❌ Error joining queue:', error);
      return {
        success: false,
        queueId: '',
        segmentId: '',
        estimatedWaitTime: 0,
        queuePosition: 0
      };
    }
  }

  /**
   * Remove player from queue
   */
  static async leaveQueue(playerId: string): Promise<boolean> {
    try {
      console.log(`🚪 Removing player ${playerId} from queue`);

      const queueEntry = await this.findPlayerInQueue(playerId);
      if (!queueEntry) {
        return false;
      }

      // Remove from database
      await deleteDoc(doc(db, this.COLLECTION_NAME, queueEntry.id));

      // Remove from segment
      await this.removePlayerFromSegment(queueEntry.segmentId, queueEntry.id);

      console.log(`✅ Player ${playerId} removed from queue`);
      return true;

    } catch (error) {
      console.error(`❌ Error removing player ${playerId} from queue:`, error);
      return false;
    }
  }

  /**
   * Find or create best segment for player
   */
  private static async findBestSegment(
    gameMode: string,
    sessionType: string,
    skillRating: number,
    region: string
  ): Promise<QueueSegment> {
    try {
      // Find skill range
      const skillRange = this.SKILL_RANGES.find(range => 
        skillRating >= range[0] && skillRating < range[1]
      ) || this.SKILL_RANGES[this.SKILL_RANGES.length - 1];

      // Look for existing segment
      const segmentsQuery = query(
        collection(db, this.SEGMENTS_COLLECTION),
        where('gameMode', '==', gameMode),
        where('sessionType', '==', sessionType),
        where('skillRangeMin', '==', skillRange[0]),
        where('skillRangeMax', '==', skillRange[1]),
        where('region', '==', region),
        where('isActive', '==', true)
      );

      const segmentsSnapshot = await getDocs(segmentsQuery);
      
      // Check if existing segment has space
      for (const segmentDoc of segmentsSnapshot.docs) {
        const segmentData = segmentDoc.data();
        if (segmentData.players.length < this.MAX_QUEUE_SIZE) {
          return {
            id: segmentDoc.id,
            ...segmentData,
            lastProcessed: segmentData.lastProcessed.toDate()
          } as QueueSegment;
        }
      }

      // Create new segment
      const newSegment: Omit<QueueSegment, 'id'> = {
        gameMode,
        sessionType,
        skillRangeMin: skillRange[0],
        skillRangeMax: skillRange[1],
        region,
        players: [],
        lastProcessed: new Date(),
        isActive: true
      };

      const segmentRef = await addDoc(collection(db, this.SEGMENTS_COLLECTION), {
        ...newSegment,
        lastProcessed: serverTimestamp()
      });

      console.log(`📦 Created new segment ${segmentRef.id} for ${gameMode} ${sessionType} ${region}`);

      return {
        id: segmentRef.id,
        ...newSegment
      };

    } catch (error) {
      console.error('❌ Error finding/creating segment:', error);
      throw error;
    }
  }

  /**
   * Add player to segment
   */
  private static async addPlayerToSegment(segmentId: string, queueId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const segmentRef = doc(db, this.SEGMENTS_COLLECTION, segmentId);
        const segmentDoc = await transaction.get(segmentRef);
        
        if (!segmentDoc.exists()) {
          throw new Error('Segment not found');
        }

        const segmentData = segmentDoc.data();
        const updatedPlayers = [...(segmentData.players || []), queueId];

        transaction.update(segmentRef, {
          players: updatedPlayers,
          lastProcessed: serverTimestamp()
        });

        // Check if segment needs splitting
        if (updatedPlayers.length >= this.SEGMENT_SPLIT_THRESHOLD) {
          this.scheduleSegmentSplit(segmentId);
        }
      });
    } catch (error) {
      console.error('Error adding player to segment:', error);
      throw error;
    }
  }

  /**
   * Create matchmaking pools by grouping players from segments into efficient matchmaking pools
   */
  private static async createMatchmakingPools(segmentId: string): Promise<MatchmakingPool[]> {
    try {
      const segmentDoc = await getDoc(doc(db, this.SEGMENTS_COLLECTION, segmentId));
      if (!segmentDoc.exists()) {
        return [];
      }

      const segmentData = segmentDoc.data() as QueueSegment;
      
      // Get all players in segment
      const players: QueuePlayer[] = [];
      for (const queueId of segmentData.players) {
        const queueDoc = await getDoc(doc(db, this.COLLECTION_NAME, queueId));
        if (queueDoc.exists()) {
          const queueData = queueDoc.data();
          players.push({
            id: queueDoc.id,
            ...queueData,
            joinedAt: queueData.joinedAt.toDate(),
            lastActivity: queueData.lastActivity.toDate()
          } as QueuePlayer);
        }
      }

      if (players.length < 2) {
        return [];
      }

      // Sort by priority and wait time
      players.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.joinedAt.getTime() - b.joinedAt.getTime(); // Earlier first
      });

      // Create pools for matching
      const pools: MatchmakingPool[] = [];
      
      // Group players into pools of similar skill levels
      const skillGroups = this.groupPlayersBySkill(players);
      
      for (const [skillRange, groupPlayers] of skillGroups) {
        if (groupPlayers.length >= 2) {
          pools.push({
            poolId: `${segmentId}_${skillRange}`,
            gameMode: segmentData.gameMode,
            sessionType: segmentData.sessionType,
            players: groupPlayers,
            skillRange: [segmentData.skillRangeMin, segmentData.skillRangeMax],
            avgWaitTime: this.calculateAverageWaitTime(groupPlayers),
            processedAt: new Date(),
            region: segmentData.region
          });
        }
      }

      return pools;

    } catch (error) {
      console.error(`❌ Error creating matchmaking pools for segment ${segmentId}:`, error);
      return [];
    }
  }

  /**
   * Process pools and create matches
   */
  private static async processMatchmakingPools(pools: MatchmakingPool[]): Promise<void> {
    try {
      for (const pool of pools) {
        const matches = this.findOptimalMatches(pool.players);
        
        for (const match of matches) {
          await this.createMatchFromPlayers(match.players, pool);
        }
      }
    } catch (error) {
      console.error('❌ Error processing matchmaking pools:', error);
    }
  }

  /**
   * Find optimal matches within a player pool
   */
  private static findOptimalMatches(players: QueuePlayer[]): Array<{
    players: QueuePlayer[];
    quality: number;
  }> {
    const matches: Array<{ players: QueuePlayer[]; quality: number }> = [];
    const usedPlayers = new Set<string>();

    // For now, create 2-player matches
    for (let i = 0; i < players.length - 1; i++) {
      const player1 = players[i];
      if (usedPlayers.has(player1.id)) continue;

      let bestMatch: QueuePlayer | null = null;
      let bestQuality = 0;

      for (let j = i + 1; j < players.length; j++) {
        const player2 = players[j];
        if (usedPlayers.has(player2.id)) continue;

        const quality = this.calculateMatchQuality(player1, player2);
        if (quality > bestQuality) {
          bestQuality = quality;
          bestMatch = player2;
        }
      }

      if (bestMatch && bestQuality > 0.6) { // Minimum quality threshold
        matches.push({
          players: [player1, bestMatch],
          quality: bestQuality
        });
        usedPlayers.add(player1.id);
        usedPlayers.add(bestMatch.id);
      }
    }

    return matches;
  }

  /**
   * Calculate match quality between two players
   */
  private static calculateMatchQuality(player1: QueuePlayer, player2: QueuePlayer): number {
    let quality = 1.0;

    // Skill difference penalty
    const skillDiff = Math.abs(player1.skillRating - player2.skillRating);
    const maxSkillDiff = 200; // Maximum acceptable skill difference
    quality -= (skillDiff / maxSkillDiff) * 0.4;

    // Wait time bonus (players who waited longer get better quality matches)
    const avgWaitTime = (player1.waitTime + player2.waitTime) / 2;
    const waitTimeBonus = Math.min(avgWaitTime / 60000, 0.3); // Up to 30% bonus for 1+ min wait
    quality += waitTimeBonus;

    // Region compatibility
    if (player1.region === player2.region) {
      quality += 0.1;
    }

    // Preferences compatibility
    if (this.arePreferencesCompatible(player1.preferences, player2.preferences)) {
      quality += 0.1;
    }

    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Check if player preferences are compatible
   */
  private static arePreferencesCompatible(pref1: QueuePreferences, pref2: QueuePreferences): boolean {
    // Game speed compatibility
    if (pref1.preferredGameSpeed !== pref2.preferredGameSpeed) {
      return false;
    }

    // Cross-platform compatibility
    if (!pref1.allowCrossPlatform && !pref2.allowCrossPlatform) {
      // Both must be on same platform (would need platform detection)
    }

    return true;
  }

  /**
   * Create actual game session from matched players
   */
  private static async createMatchFromPlayers(players: QueuePlayer[], pool: MatchmakingPool): Promise<void> {
    try {
      console.log(`🎮 Creating match from ${players.length} players in pool ${pool.poolId}`);

      // Use existing GameSessionService to create session
      const { GameSessionService } = await import('./gameSessionService');
      
      const hostPlayer = players[0];
      const sessionId = await GameSessionService.createSession(
        pool.sessionType === 'ranked' ? 'ranked' : 'quick',
        pool.gameMode,
        hostPlayer.playerData,
        {
          maxPlayers: players.length,
          skillRange: { min: 0, max: 3000 },
          expirationTime: 30
        }
      );

      // Add other players to session
      for (let i = 1; i < players.length; i++) {
        await GameSessionService.joinSession(sessionId, players[i].playerData);
      }

      // Remove players from queue
      for (const player of players) {
        await this.leaveQueue(player.playerId);
      }

      // Update stats
      this.queueStats.successfulMatches++;
      
      console.log(`✅ Match created: ${sessionId} with ${players.length} players`);

    } catch (error) {
      console.error('❌ Error creating match from players:', error);
      this.queueStats.failedMatches++;
    }
  }

  /**
   * Group players by skill levels for better matching
   */
  private static groupPlayersBySkill(players: QueuePlayer[]): Map<string, QueuePlayer[]> {
    const groups = new Map<string, QueuePlayer[]>();

    for (const player of players) {
      const skillGroup = this.getSkillGroup(player.skillRating);
      if (!groups.has(skillGroup)) {
        groups.set(skillGroup, []);
      }
      groups.get(skillGroup)!.push(player);
    }

    return groups;
  }

  /**
   * Get skill group identifier
   */
  private static getSkillGroup(skillRating: number): string {
    for (let i = 0; i < this.SKILL_RANGES.length; i++) {
      const range = this.SKILL_RANGES[i];
      if (skillRating >= range[0] && skillRating < range[1]) {
        return `${range[0]}-${range[1]}`;
      }
    }
    return `${this.SKILL_RANGES[this.SKILL_RANGES.length - 1][0]}+`;
  }

  /**
   * Calculate average wait time for players
   */
  private static calculateAverageWaitTime(players: QueuePlayer[]): number {
    if (players.length === 0) return 0;
    
    const totalWaitTime = players.reduce((sum, player) => {
      return sum + (Date.now() - player.joinedAt.getTime());
    }, 0);
    
    return totalWaitTime / players.length;
  }

  /**
   * Calculate skill rating from player data
   */
  private static calculateSkillRating(playerData: SessionPlayerData): number {
    const stats = playerData.playerStats;
    if (!stats || stats.gamesPlayed === 0) {
      return 1000; // Default rating for new players
    }

    const winRate = stats.matchWins / stats.gamesPlayed;
    const baseRating = 1000 + (winRate - 0.5) * 1000; // 500-1500 range based on win rate
    
    // Adjust for streak and experience
    const experienceBonus = Math.min(stats.gamesPlayed * 5, 200);
    const streakBonus = (stats.currentStreak || 0) * 10;
    
    return Math.max(100, Math.min(3000, baseRating + experienceBonus + streakBonus));
  }

  /**
   * Calculate player priority
   */
  private static calculatePlayerPriority(
    playerData: SessionPlayerData,
    preferences: QueuePreferences,
    sessionType: string
  ): number {
    let priority = 100; // Base priority

    // Premium users get higher priority
    if (preferences.premiumPriority) {
      priority += this.PRIORITY_WEIGHTS.premium;
    }

    // Ranked games get higher priority
    if (sessionType === 'ranked') {
      priority += this.PRIORITY_WEIGHTS.ranked;
    }

    // New players get slight boost
    if (playerData.playerStats.gamesPlayed < 10) {
      priority += this.PRIORITY_WEIGHTS.newPlayer;
    }

    // Streak bonus
    if (playerData.playerStats.currentStreak && playerData.playerStats.currentStreak > 3) {
      priority += this.PRIORITY_WEIGHTS.streak;
    }

    return priority;
  }

  /**
   * Find player in queue
   */
  private static async findPlayerInQueue(playerId: string): Promise<(QueuePlayer & { segmentId: string }) | null> {
    try {
      const queueQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('playerId', '==', playerId)
      );

      const queueSnapshot = await getDocs(queueQuery);
      if (queueSnapshot.empty) {
        return null;
      }

      const queueDoc = queueSnapshot.docs[0];
      const queueData = queueDoc.data();

      // Find which segment this player is in
      const segmentsQuery = query(
        collection(db, this.SEGMENTS_COLLECTION),
        where('players', 'array-contains', queueDoc.id)
      );

      const segmentsSnapshot = await getDocs(segmentsQuery);
      const segmentId = segmentsSnapshot.empty ? '' : segmentsSnapshot.docs[0].id;

      return {
        id: queueDoc.id,
        segmentId,
        ...queueData,
        joinedAt: queueData.joinedAt.toDate(),
        lastActivity: queueData.lastActivity.toDate()
      } as QueuePlayer & { segmentId: string };

    } catch (error) {
      console.error(`❌ Error finding player ${playerId} in queue:`, error);
      return null;
    }
  }

  /**
   * Remove player from segment
   */
  private static async removePlayerFromSegment(segmentId: string, queueId: string): Promise<void> {
    try {
      if (!segmentId) return;

      await runTransaction(db, async (transaction) => {
        const segmentRef = doc(db, this.SEGMENTS_COLLECTION, segmentId);
        const segmentDoc = await transaction.get(segmentRef);
        
        if (!segmentDoc.exists()) return;

        const segmentData = segmentDoc.data();
        const updatedPlayers = (segmentData.players || []).filter((id: string) => id !== queueId);

        transaction.update(segmentRef, {
          players: updatedPlayers,
          lastProcessed: serverTimestamp()
        });

        // Deactivate segment if empty
        if (updatedPlayers.length === 0) {
          transaction.update(segmentRef, { isActive: false });
        }
      });

    } catch (error) {
      console.error(`❌ Error removing player from segment ${segmentId}:`, error);
    }
  }

  /**
   * Get queue position and estimated wait time
   */
  private static async getQueuePosition(queueId: string, segmentId: string): Promise<{
    position: number;
    estimatedWaitTime: number;
  }> {
    try {
      const segmentDoc = await getDoc(doc(db, this.SEGMENTS_COLLECTION, segmentId));
      if (!segmentDoc.exists()) {
        return { position: 0, estimatedWaitTime: 0 };
      }

      const segmentData = segmentDoc.data();
      const players = segmentData.players || [];
      const position = players.indexOf(queueId) + 1;

      // Estimate wait time based on queue position and processing rate
      const avgProcessingTime = 30000; // 30 seconds average
      const estimatedWaitTime = Math.max(0, (position - 1) * avgProcessingTime / 2);

      return { position, estimatedWaitTime };

    } catch (error) {
      console.error('❌ Error getting queue position:', error);
      return { position: 0, estimatedWaitTime: 0 };
    }
  }

  /**
   * Get comprehensive queue statistics
   */
  static async getQueueStatistics(): Promise<QueueStats> {
    try {
      // Get total players in queue
      const queueSnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      const totalPlayers = queueSnapshot.size;

      // Calculate averages and distributions
      const queuesByMode: Record<string, number> = {};
      const queuesByRegion: Record<string, number> = {};
      const queuesBySkill: Record<string, number> = {};
      let totalWaitTime = 0;

      queueSnapshot.forEach(doc => {
        const data = doc.data();
        
        // Count by game mode
        queuesByMode[data.gameMode] = (queuesByMode[data.gameMode] || 0) + 1;
        
        // Count by region
        queuesByRegion[data.region] = (queuesByRegion[data.region] || 0) + 1;
        
        // Count by skill group
        const skillGroup = this.getSkillGroup(data.skillRating);
        queuesBySkill[skillGroup] = (queuesBySkill[skillGroup] || 0) + 1;
        
        // Sum wait times
        const waitTime = Date.now() - data.joinedAt.toDate().getTime();
        totalWaitTime += waitTime;
      });

      const averageWaitTime = totalPlayers > 0 ? totalWaitTime / totalPlayers : 0;

      this.queueStats = {
        totalPlayers,
        averageWaitTime,
        successfulMatches: this.queueStats.successfulMatches,
        failedMatches: this.queueStats.failedMatches,
        queuesByMode,
        queuesByRegion,
        queuesBySkill,
        concurrentLoad: totalPlayers,
        processingRate: this.calculateProcessingRate()
      };

      return this.queueStats;

    } catch (error) {
      console.error('❌ Error getting queue statistics:', error);
      return this.queueStats;
    }
  }

  /**
   * Calculate current processing rate
   */
  private static calculateProcessingRate(): number {
    const recentMatches = this.queueStats.successfulMatches;
    const timeWindow = 60000; // 1 minute
    return recentMatches / (timeWindow / 1000); // matches per second
  }

  /**
   * Clean up expired queue entries and inactive segments
   */
  static async cleanupExpiredEntries(): Promise<{
    expiredPlayers: number;
    inactiveSegments: number;
  }> {
    try {
      console.log('🧹 Starting queue cleanup...');
      
      const now = Date.now();
      const maxWaitTime = 600000; // 10 minutes max wait
      
      let expiredPlayers = 0;
      let inactiveSegments = 0;

      // Clean up expired players
      const expiredQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('joinedAt', '<', Timestamp.fromDate(new Date(now - maxWaitTime)))
      );

      const expiredSnapshot = await getDocs(expiredQuery);
      const batch = writeBatch(db);

      for (const playerDoc of expiredSnapshot.docs) {
        batch.delete(playerDoc.ref);
        expiredPlayers++;
      }

      if (expiredPlayers > 0) {
        await batch.commit();
      }

      // Clean up inactive segments
      const inactiveQuery = query(
        collection(db, this.SEGMENTS_COLLECTION),
        where('lastProcessed', '<', Timestamp.fromDate(new Date(now - 300000))) // 5 minutes
      );

      const inactiveSnapshot = await getDocs(inactiveQuery);
      const segmentBatch = writeBatch(db);

      for (const segmentDoc of inactiveSnapshot.docs) {
        const segmentData = segmentDoc.data();
        if (segmentData.players.length === 0) {
          segmentBatch.update(segmentDoc.ref, { isActive: false });
          inactiveSegments++;
        }
      }

      if (inactiveSegments > 0) {
        await segmentBatch.commit();
      }

      console.log(`✅ Queue cleanup completed: ${expiredPlayers} expired players, ${inactiveSegments} inactive segments`);

      return { expiredPlayers, inactiveSegments };

    } catch (error) {
      console.error('❌ Error during queue cleanup:', error);
      return { expiredPlayers: 0, inactiveSegments: 0 };
    }
  }

  /**
   * Start the advanced queue management system
   */
  static startAdvancedQueueSystem(): void {
    console.log('🚀 Starting Advanced Queue Management System...');

    // Start global cleanup process
    setInterval(() => {
      this.cleanupExpiredEntries().catch(error => {
        console.error('❌ Error in queue cleanup:', error);
      });
    }, 60000); // Every minute

    // Start segment discovery and processing
    setInterval(() => {
      this.discoverAndProcessActiveSegments().catch(error => {
        console.error('❌ Error in segment processing:', error);
      });
    }, this.PROCESSING_INTERVAL);

    console.log('✅ Advanced Queue Management System started');
  }

  /**
   * Discover and process all active segments
   */
  private static async discoverAndProcessActiveSegments(): Promise<void> {
    try {
      const activeSegmentsQuery = query(
        collection(db, this.SEGMENTS_COLLECTION),
        where('isActive', '==', true)
      );

      const segmentsSnapshot = await getDocs(activeSegmentsQuery);
      
      for (const segmentDoc of segmentsSnapshot.docs) {
        const segmentData = segmentDoc.data();
        if (segmentData.players.length >= 2) {
          await this.processSegment(segmentDoc.id);
        }
      }

    } catch (error) {
      console.error('❌ Error discovering active segments:', error);
    }
  }

  /**
   * Stop the advanced queue management system
   */
  static stopAdvancedQueueSystem(): void {
    console.log('🛑 Stopping Advanced Queue Management System...');
    
    // Clear all processing timers
    for (const [segmentId, timer] of this.processingTimers) {
      clearInterval(timer);
    }
    this.processingTimers.clear();

    console.log('✅ Advanced Queue Management System stopped');
  }

  /**
   * Schedule segment split when it reaches threshold
   */
  private static async scheduleSegmentSplit(segmentId: string): Promise<void> {
    try {
      // Create new segment
      const newSegmentId = `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await setDoc(doc(db, this.SEGMENTS_COLLECTION, newSegmentId), {
        id: newSegmentId,
        players: [],
        createdAt: serverTimestamp(),
        lastProcessed: serverTimestamp(),
        skillRange: { min: 0, max: 3000 },
        isActive: true
      });

      // Move half the players to new segment
      const segmentDoc = await getDoc(doc(db, this.SEGMENTS_COLLECTION, segmentId));
      if (segmentDoc.exists()) {
        const segmentData = segmentDoc.data() as QueueSegment;
        const players = segmentData.players || [];
        const halfPoint = Math.floor(players.length / 2);
        
        const playersForOriginal = players.slice(0, halfPoint);
        const playersForNew = players.slice(halfPoint);

        // Update original segment
        await updateDoc(doc(db, this.SEGMENTS_COLLECTION, segmentId), {
          players: playersForOriginal,
          lastProcessed: serverTimestamp()
        });

        // Update new segment
        await updateDoc(doc(db, this.SEGMENTS_COLLECTION, newSegmentId), {
          players: playersForNew,
          lastProcessed: serverTimestamp()
        });

        // Start processing for new segment
        this.startSegmentProcessing(newSegmentId);
      }
    } catch (error) {
      console.error('Error splitting segment:', error);
    }
  }

  /**
   * Start background processing for a segment
   */
  private static startSegmentProcessing(segmentId: string): void {
    if (this.processingTimers.has(segmentId)) {
      return; // Already processing
    }

    const timer = setInterval(async () => {
      await this.processSegment(segmentId);
    }, 5000); // Process every 5 seconds

    this.processingTimers.set(segmentId, timer);
  }

  /**
   * Process individual segment for matchmaking
   */
  private static async processSegment(segmentId: string): Promise<void> {
    try {
      const pools = await this.createMatchmakingPools(segmentId);
      
      for (const pool of pools) {
        const matches = await this.findOptimalMatches(pool.players);
        
        for (const match of matches) {
          await this.createGameSession(match.players);
          
          // Remove matched players from queue
          for (const player of match.players) {
            await this.leaveQueue(player.playerId);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing segment ${segmentId}:`, error);
    }
  }

  /**
   * Create game session for matched players
   */
  private static async createGameSession(players: QueuePlayer[]): Promise<void> {
    try {
      if (players.length < 2) {
        console.warn('Not enough players for game session');
        return;
      }

      // Use first player as host
      const hostPlayer = players[0];
      
      // Convert QueuePlayer to SessionPlayerData for host
      const hostData: SessionPlayerData = {
        playerId: hostPlayer.playerId,
        playerDisplayName: hostPlayer.playerId, // Will be updated by UserService
        playerStats: {
          bestStreak: 0,
          currentStreak: 0,
          gamesPlayed: 0,
          matchWins: 0
        },
        displayBackgroundEquipped: null,
        matchBackgroundEquipped: null,
        ready: false,
        joinedAt: new Date(),
        isConnected: true,
        lastHeartbeat: new Date()
      };

      // Create session configuration
      const configuration: SessionConfiguration = {
        maxPlayers: players.length,
        skillRange: { min: 0, max: 3000 }
      };

      // Determine session type based on game mode
      const sessionType: SessionType = hostPlayer.gameMode === 'ranked' ? 'ranked' : 'quick';

      // Create session through GameSessionService
      const sessionId = await GameSessionService.createSession(
        sessionType,
        hostPlayer.gameMode,
        hostData,
        configuration
      );

      // Add other players to the session (opponent data will be handled by session service)
      console.log(`✅ Created game session ${sessionId} for ${players.length} players`);
      
    } catch (error) {
      console.error('Error creating game session:', error);
    }
  }
}
