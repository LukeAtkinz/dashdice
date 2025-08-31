import { UserProfile } from './userService';
import { SessionPlayerData } from './gameSessionService';

export interface SkillRating {
  rating: number;
  volatility: number; // How uncertain the rating is
  gamesPlayed: number;
  winRate: number;
  recentPerformance: number[]; // Last 10 games performance
}

export interface MatchmakingPool {
  gameMode: string;
  skillRange: { min: number; max: number };
  players: SessionPlayerData[];
  averageSkill: number;
  waitTime: number;
}

export class SkillBasedMatchmakingService {
  private static readonly K_FACTOR = 32; // ELO calculation factor
  private static readonly INITIAL_RATING = 1200;
  private static readonly SKILL_RANGE_MULTIPLIER = 50; // Expand search range over time

  /**
   * Calculate player skill rating based on match history
   */
  static calculateSkillRating(profile: UserProfile): SkillRating {
    const stats = profile.stats;
    const gamesPlayed = stats.gamesPlayed || 0;
    
    if (gamesPlayed === 0) {
      return {
        rating: this.INITIAL_RATING,
        volatility: 150, // High uncertainty for new players
        gamesPlayed: 0,
        winRate: 0,
        recentPerformance: []
      };
    }

    const winRate = stats.matchWins / gamesPlayed;
    const streakBonus = Math.min(stats.currentStreak * 10, 100);
    
    // Base rating calculation
    let rating = this.INITIAL_RATING + (winRate * 400) + streakBonus;
    
    // Volatility decreases as more games are played
    const volatility = Math.max(50, 150 - (gamesPlayed * 2));
    
    return {
      rating: Math.round(rating),
      volatility,
      gamesPlayed,
      winRate,
      recentPerformance: [] // TODO: Implement recent match tracking
    };
  }

  /**
   * Find suitable opponents within skill range
   */
  static findSkillMatchedOpponents(
    playerSkill: SkillRating,
    availablePlayers: SessionPlayerData[],
    waitTime: number = 0
  ): SessionPlayerData[] {
    const baseRange = 100; // Base skill range
    const expandedRange = baseRange + (waitTime * this.SKILL_RANGE_MULTIPLIER / 1000); // Expand every second
    
    const minRating = playerSkill.rating - expandedRange;
    const maxRating = playerSkill.rating + expandedRange;

    return availablePlayers.filter(player => {
      // Calculate opponent skill (simplified - in real implementation, get from DB)
      const opponentRating = this.estimatePlayerRating(player);
      return opponentRating >= minRating && opponentRating <= maxRating;
    });
  }

  /**
   * Create balanced teams for team-based modes
   */
  static createBalancedTeams(players: SessionPlayerData[]): {
    team1: SessionPlayerData[];
    team2: SessionPlayerData[];
    skillDifference: number;
  } {
    if (players.length % 2 !== 0) {
      throw new Error('Cannot create balanced teams with odd number of players');
    }

    const playersWithSkill = players.map(player => ({
      player,
      skill: this.estimatePlayerRating(player)
    })).sort((a, b) => b.skill - a.skill);

    const team1: SessionPlayerData[] = [];
    const team2: SessionPlayerData[] = [];
    let team1Skill = 0;
    let team2Skill = 0;

    // Distribute players to balance teams
    for (const { player, skill } of playersWithSkill) {
      if (team1Skill <= team2Skill) {
        team1.push(player);
        team1Skill += skill;
      } else {
        team2.push(player);
        team2Skill += skill;
      }
    }

    return {
      team1,
      team2,
      skillDifference: Math.abs(team1Skill - team2Skill)
    };
  }

  /**
   * Estimate player rating from stats (simplified)
   */
  private static estimatePlayerRating(player: SessionPlayerData): number {
    const stats = player.playerStats;
    const gamesPlayed = stats.gamesPlayed || 1;
    const winRate = stats.matchWins / gamesPlayed;
    const streakBonus = Math.min(stats.currentStreak * 10, 100);
    
    return this.INITIAL_RATING + (winRate * 400) + streakBonus;
  }

  /**
   * Update player rating after match
   */
  static updatePlayerRating(
    playerRating: SkillRating,
    opponentRating: SkillRating,
    didWin: boolean
  ): SkillRating {
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating.rating - playerRating.rating) / 400));
    const actualScore = didWin ? 1 : 0;
    
    const kFactor = Math.max(16, this.K_FACTOR - (playerRating.gamesPlayed * 0.5));
    const ratingChange = kFactor * (actualScore - expectedScore);
    
    return {
      ...playerRating,
      rating: Math.round(playerRating.rating + ratingChange),
      gamesPlayed: playerRating.gamesPlayed + 1,
      volatility: Math.max(30, playerRating.volatility - 2)
    };
  }
}
