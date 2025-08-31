import { Tournament, TournamentMatch, TournamentParticipant, TournamentRound } from './enhancedTournamentService';

export class TournamentBracketManager {
  /**
   * Generate tournament bracket based on tournament type
   */
  static generateBracket(tournament: Tournament): TournamentRound[] {
    switch (tournament.tournamentType) {
      case 'single-elimination':
        return this.generateSingleEliminationBracket(tournament.bracket.participants);
      case 'double-elimination':
        return this.generateDoubleEliminationBracket(tournament.bracket.participants);
      case 'round-robin':
        return this.generateRoundRobinBracket(tournament.bracket.participants);
      case 'swiss':
        return this.generateSwissBracket(tournament.bracket.participants);
      default:
        throw new Error(`Unsupported tournament type: ${tournament.tournamentType}`);
    }
  }

  /**
   * Single elimination bracket generation
   */
  private static generateSingleEliminationBracket(participants: TournamentParticipant[]): TournamentRound[] {
    const rounds: TournamentRound[] = [];
    let currentRoundParticipants = [...participants];
    let roundNumber = 1;

    // Ensure we have a power of 2 participants (add byes if needed)
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(participants.length)));
    const byesNeeded = nextPowerOfTwo - participants.length;

    // Add bye participants
    for (let i = 0; i < byesNeeded; i++) {
      const byeParticipant: TournamentParticipant = {
        playerId: `bye-${i}`,
        displayName: 'BYE',
        seed: participants.length + i + 1,
        status: 'eliminated',
        matchesWon: 0,
        matchesLost: 0,
        currentRound: 1,
        joinedAt: new Date()
      };
      currentRoundParticipants.push(byeParticipant);
    }

    // Seed participants (1 vs last, 2 vs second-to-last, etc.)
    currentRoundParticipants = this.seedParticipants(currentRoundParticipants);

    while (currentRoundParticipants.length > 1) {
      const matches: TournamentMatch[] = [];
      const nextRoundParticipants: TournamentParticipant[] = [];

      for (let i = 0; i < currentRoundParticipants.length; i += 2) {
        const player1 = currentRoundParticipants[i];
        const player2 = currentRoundParticipants[i + 1];

        const match: TournamentMatch = {
          id: `r${roundNumber}-m${matches.length + 1}`,
          roundNumber,
          matchNumber: matches.length + 1,
          player1,
          player2,
          status: 'pending'
        };

        // Auto-advance if playing against bye
        if (player2.playerId.startsWith('bye-')) {
          match.winner = player1.playerId;
          match.status = 'completed';
          nextRoundParticipants.push(player1);
        } else if (player1.playerId.startsWith('bye-')) {
          match.winner = player2.playerId;
          match.status = 'completed';
          nextRoundParticipants.push(player2);
        }

        matches.push(match);
      }

      rounds.push({
        roundNumber,
        matches,
        status: 'pending'
      });

      currentRoundParticipants = nextRoundParticipants;
      roundNumber++;
    }

    return rounds;
  }

  /**
   * Double elimination bracket generation
   */
  private static generateDoubleEliminationBracket(participants: TournamentParticipant[]): TournamentRound[] {
    // This is more complex - would need winners and losers brackets
    // For now, fallback to single elimination
    console.log('⚠️ Double elimination not fully implemented, using single elimination');
    return this.generateSingleEliminationBracket(participants);
  }

  /**
   * Round robin bracket generation
   */
  private static generateRoundRobinBracket(participants: TournamentParticipant[]): TournamentRound[] {
    const rounds: TournamentRound[] = [];
    const totalRounds = participants.length - 1;

    for (let round = 1; round <= totalRounds; round++) {
      const matches: TournamentMatch[] = [];
      const roundParticipants = [...participants];

      // Rotate participants (keep first player fixed)
      if (round > 1) {
        const lastPlayer = roundParticipants.pop()!;
        roundParticipants.splice(1, 0, lastPlayer);
      }

      // Create matches for this round
      for (let i = 0; i < roundParticipants.length / 2; i++) {
        const player1 = roundParticipants[i];
        const player2 = roundParticipants[roundParticipants.length - 1 - i];

        if (player1 && player2 && player1.playerId !== player2.playerId) {
          matches.push({
            id: `rr-r${round}-m${matches.length + 1}`,
            roundNumber: round,
            matchNumber: matches.length + 1,
            player1,
            player2,
            status: 'pending'
          });
        }
      }

      rounds.push({
        roundNumber: round,
        matches,
        status: 'pending'
      });
    }

    return rounds;
  }

  /**
   * Swiss system bracket generation
   */
  private static generateSwissBracket(participants: TournamentParticipant[]): TournamentRound[] {
    // Swiss system pairs players with similar scores
    // For first round, pair randomly or by seed
    const rounds: TournamentRound[] = [];
    const matches: TournamentMatch[] = [];

    // First round - pair by seed
    const shuffledParticipants = [...participants].sort((a, b) => a.seed - b.seed);

    for (let i = 0; i < shuffledParticipants.length; i += 2) {
      if (i + 1 < shuffledParticipants.length) {
        matches.push({
          id: `swiss-r1-m${matches.length + 1}`,
          roundNumber: 1,
          matchNumber: matches.length + 1,
          player1: shuffledParticipants[i],
          player2: shuffledParticipants[i + 1],
          status: 'pending'
        });
      }
    }

    rounds.push({
      roundNumber: 1,
      matches,
      status: 'pending'
    });

    return rounds;
  }

  /**
   * Seed participants for optimal bracket distribution
   */
  private static seedParticipants(participants: TournamentParticipant[]): TournamentParticipant[] {
    const seeded = [...participants].sort((a, b) => a.seed - b.seed);
    const bracket: TournamentParticipant[] = [];

    // Standard tournament seeding (1 vs last, 2 vs second-to-last, etc.)
    const n = seeded.length;
    for (let i = 0; i < n / 2; i++) {
      bracket.push(seeded[i]);
      bracket.push(seeded[n - 1 - i]);
    }

    return bracket;
  }

  /**
   * Process match result and advance winner
   */
  static processMatchResult(
    tournament: Tournament,
    matchId: string,
    winnerId: string,
    score?: { [playerId: string]: number }
  ): { success: boolean; nextMatch?: TournamentMatch } {
    try {
      const currentRound = tournament.bracket.rounds[tournament.bracket.currentRound - 1];
      const match = currentRound.matches.find(m => m.id === matchId);

      if (!match) {
        return { success: false };
      }

      // Update match result
      match.winner = winnerId;
      match.status = 'completed';
      match.endTime = new Date();
      if (score) {
        match.score = score;
      }

      // Update participant stats
      const winner = tournament.bracket.participants.find(p => p.playerId === winnerId);
      const loser = tournament.bracket.participants.find(p => 
        p.playerId === (match.player1.playerId === winnerId ? match.player2?.playerId : match.player1.playerId)
      );

      if (winner) {
        winner.matchesWon++;
      }
      if (loser) {
        loser.matchesLost++;
        if (tournament.tournamentType === 'single-elimination') {
          loser.status = 'eliminated';
        }
      }

      // Check if round is complete
      const roundComplete = currentRound.matches.every(m => m.status === 'completed');
      if (roundComplete) {
        currentRound.status = 'completed';
        currentRound.endTime = new Date();

        // Advance to next round if exists
        if (tournament.bracket.currentRound < tournament.bracket.rounds.length) {
          tournament.bracket.currentRound++;
          const nextRound = tournament.bracket.rounds[tournament.bracket.currentRound - 1];
          nextRound.status = 'in-progress';
          nextRound.startTime = new Date();
        } else {
          // Tournament complete
          tournament.status = 'completed';
          tournament.endTime = new Date();
        }
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error processing match result:', error);
      return { success: false };
    }
  }

  /**
   * Get tournament standings/leaderboard
   */
  static getTournamentStandings(tournament: Tournament): TournamentParticipant[] {
    const standings = [...tournament.bracket.participants]
      .filter(p => !p.playerId.startsWith('bye-'))
      .sort((a, b) => {
        // Sort by matches won (descending), then matches lost (ascending)
        if (a.matchesWon !== b.matchesWon) {
          return b.matchesWon - a.matchesWon;
        }
        return a.matchesLost - b.matchesLost;
      });

    return standings;
  }
}
