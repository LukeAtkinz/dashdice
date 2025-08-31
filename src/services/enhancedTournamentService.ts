import { SessionPlayerData } from './gameSessionService';
import { NewMatchmakingService } from './newMatchmakingService';

export interface Tournament {
  id: string;
  name: string;
  description: string;
  gameMode: string;
  tournamentType: 'single-elimination' | 'double-elimination' | 'round-robin' | 'swiss';
  status: 'registration' | 'in-progress' | 'completed' | 'cancelled';
  maxParticipants: number;
  currentParticipants: number;
  entryFee?: number;
  prizePool?: TournamentPrize[];
  startTime: Date;
  endTime?: Date;
  registrationDeadline: Date;
  bracket: TournamentBracket;
  rules: TournamentRules;
  organizer: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentBracket {
  rounds: TournamentRound[];
  currentRound: number;
  participants: TournamentParticipant[];
}

export interface TournamentRound {
  roundNumber: number;
  matches: TournamentMatch[];
  status: 'pending' | 'in-progress' | 'completed';
  startTime?: Date;
  endTime?: Date;
}

export interface TournamentMatch {
  id: string;
  roundNumber: number;
  matchNumber: number;
  player1: TournamentParticipant;
  player2?: TournamentParticipant; // null for bye
  winner?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'forfeit';
  sessionId?: string;
  startTime?: Date;
  endTime?: Date;
  score?: { [playerId: string]: number };
}

export interface TournamentParticipant {
  playerId: string;
  displayName: string;
  seed: number;
  status: 'active' | 'eliminated' | 'forfeit';
  matchesWon: number;
  matchesLost: number;
  currentRound: number;
  joinedAt: Date;
}

export interface TournamentRules {
  matchFormat: 'best-of-1' | 'best-of-3' | 'best-of-5';
  timeLimit?: number; // in minutes
  allowSpectators: boolean;
  tiebreaker: 'sudden-death' | 'extra-time' | 'coin-flip';
  forfeitTime: number; // minutes before automatic forfeit
}

export interface TournamentPrize {
  position: number; // 1st, 2nd, 3rd, etc.
  reward: {
    type: 'currency' | 'item' | 'title' | 'badge';
    amount?: number;
    itemId?: string;
    title?: string;
  };
}

export class EnhancedTournamentService {
  private static readonly COLLECTION_NAME = 'tournaments';

  /**
   * Create a new tournament
   */
  static async createTournament(
    organizerId: string,
    tournamentData: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt' | 'currentParticipants' | 'bracket'>
  ): Promise<string> {
    try {
      const tournament: Omit<Tournament, 'id'> = {
        ...tournamentData,
        currentParticipants: 0,
        bracket: {
          rounds: [],
          currentRound: 0,
          participants: []
        },
        organizer: organizerId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database and return ID
      console.log('🏆 Creating tournament:', tournament.name);
      // TODO: Implement database save
      return 'tournament-id';
    } catch (error) {
      console.error('❌ Error creating tournament:', error);
      throw error;
    }
  }

  /**
   * Register player for tournament
   */
  static async registerPlayer(
    tournamentId: string,
    playerId: string,
    playerData: SessionPlayerData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Get tournament from database
      const tournament = await this.getTournament(tournamentId);
      
      if (!tournament) {
        return { success: false, error: 'Tournament not found' };
      }

      if (tournament.status !== 'registration') {
        return { success: false, error: 'Registration is closed' };
      }

      if (tournament.currentParticipants >= tournament.maxParticipants) {
        return { success: false, error: 'Tournament is full' };
      }

      if (new Date() > tournament.registrationDeadline) {
        return { success: false, error: 'Registration deadline has passed' };
      }

      // Check if player already registered
      if (tournament.bracket.participants.some(p => p.playerId === playerId)) {
        return { success: false, error: 'Already registered for this tournament' };
      }

      const participant: TournamentParticipant = {
        playerId,
        displayName: playerData.playerDisplayName,
        seed: tournament.currentParticipants + 1,
        status: 'active',
        matchesWon: 0,
        matchesLost: 0,
        currentRound: 1,
        joinedAt: new Date()
      };

      tournament.bracket.participants.push(participant);
      tournament.currentParticipants++;
      tournament.updatedAt = new Date();

      // TODO: Save tournament to database
      console.log(`✅ Player ${playerId} registered for tournament ${tournamentId}`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error registering player:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  /**
   * Get tournament by ID
   */
  private static async getTournament(tournamentId: string): Promise<Tournament | null> {
    // TODO: Implement database retrieval
    console.log(`📋 Getting tournament ${tournamentId}`);
    return null;
  }
}
