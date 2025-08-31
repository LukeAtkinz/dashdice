import { 
  collection, 
  doc, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  runTransaction,
  onSnapshot,
  Timestamp,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { UserService } from './userService';
import { GameSessionService } from './gameSessionService';

// Tournament interfaces
export type TournamentStatus = 'upcoming' | 'registration-open' | 'registration-closed' | 'active' | 'completed' | 'cancelled';
export type BracketFormat = 'single-elimination' | 'double-elimination';

export interface TournamentParticipant {
  playerId: string;
  playerDisplayName: string;
  registeredAt: Date;
  skillLevel?: number;
  seed?: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  player1?: TournamentParticipant;
  player2?: TournamentParticipant;
  winner?: string;
  sessionId?: string;
  status: 'pending' | 'active' | 'completed';
  scheduledTime?: Date;
  completedAt?: Date;
}

export interface TournamentBracket {
  round1: TournamentMatch[];
  semifinals: TournamentMatch[];
  finals: TournamentMatch[];
  winner?: string;
}

export interface TournamentRewards {
  winner: {
    backgroundId: string;
    title: string;
    goldReward?: number;
  };
  finalist: {
    backgroundId: string;
    goldReward?: number;
  };
  semifinalist?: {
    goldReward?: number;
  };
  participant: {
    experience: number;
    goldReward?: number;
  };
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  
  // Schedule
  scheduledDate: Date;
  registrationOpens: Date;
  registrationCloses: Date;
  tournamentStarts: Date;
  tournamentEnds: Date;
  
  // Configuration
  maxParticipants: number;
  gameMode: string;
  bracketFormat: BracketFormat;
  
  // Status
  status: TournamentStatus;
  
  // Participants
  participants: TournamentParticipant[];
  
  // Bracket
  bracket?: TournamentBracket;
  
  // Rewards
  rewards: TournamentRewards;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tournament Service - Manages weekly tournaments and special events
 */
export class TournamentService {
  private static readonly COLLECTION_NAME = 'tournaments';
  private static readonly MAX_PARTICIPANTS = 8;
  
  // Default tournament schedule (EST/EDT)
  private static readonly WEEKLY_SCHEDULE = [
    { day: 5, time: '19:00', gameMode: 'classic', name: 'Weekly Classic' }, // Friday
    { day: 6, time: '19:00', gameMode: 'quickfire', name: 'Speed Tournament' }, // Saturday  
    { day: 0, time: '19:00', gameMode: 'zerohour', name: 'Precision Cup' } // Sunday
  ];

  /**
   * Create a new tournament
   */
  static async createTournament(tournamentData: {
    name: string;
    description: string;
    gameMode: string;
    scheduledDate: Date;
    registrationOpens?: Date;
    rewards: TournamentRewards;
    maxParticipants?: number;
    bracketFormat?: BracketFormat;
  }): Promise<string> {
    try {
      console.log(`🏆 Creating tournament: ${tournamentData.name}`);
      
      const registrationOpens = tournamentData.registrationOpens || 
        new Date(tournamentData.scheduledDate.getTime() - (4 * 24 * 60 * 60 * 1000)); // 4 days before
      
      const registrationCloses = new Date(tournamentData.scheduledDate.getTime() - (30 * 60 * 1000)); // 30 min before
      const tournamentStarts = tournamentData.scheduledDate;
      const tournamentEnds = new Date(tournamentData.scheduledDate.getTime() + (60 * 60 * 1000)); // 1 hour duration
      
      const tournament: Omit<Tournament, 'id'> = {
        name: tournamentData.name,
        description: tournamentData.description,
        scheduledDate: tournamentData.scheduledDate,
        registrationOpens,
        registrationCloses,
        tournamentStarts,
        tournamentEnds,
        maxParticipants: tournamentData.maxParticipants || this.MAX_PARTICIPANTS,
        gameMode: tournamentData.gameMode,
        bracketFormat: tournamentData.bracketFormat || 'single-elimination',
        status: 'upcoming',
        participants: [],
        rewards: tournamentData.rewards,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const tournamentRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...tournament,
        scheduledDate: Timestamp.fromDate(tournament.scheduledDate),
        registrationOpens: Timestamp.fromDate(tournament.registrationOpens),
        registrationCloses: Timestamp.fromDate(tournament.registrationCloses),
        tournamentStarts: Timestamp.fromDate(tournament.tournamentStarts),
        tournamentEnds: Timestamp.fromDate(tournament.tournamentEnds),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Created tournament ${tournamentRef.id}: ${tournamentData.name}`);
      
      // Schedule status updates
      this.scheduleTournamentStatusUpdates(tournamentRef.id, tournament);
      
      return tournamentRef.id;
    } catch (error) {
      console.error('❌ Error creating tournament:', error);
      throw error;
    }
  }

  /**
   * Register player for tournament
   */
  static async registerPlayer(tournamentId: string, playerId: string): Promise<void> {
    try {
      console.log(`📝 Registering player ${playerId} for tournament ${tournamentId}`);
      
      return await runTransaction(db, async (transaction) => {
        const tournamentRef = doc(db, this.COLLECTION_NAME, tournamentId);
        const tournamentDoc = await transaction.get(tournamentRef);
        
        if (!tournamentDoc.exists()) {
          throw new Error('Tournament not found');
        }
        
        const tournament = { id: tournamentId, ...this.convertTournamentData(tournamentDoc.data()) };
        
        // Validation checks
        this.validateTournamentRegistration(tournament, playerId);
        
        // Get player data
        const userProfile = await UserService.getUserProfile(playerId);
        if (!userProfile) {
          throw new Error('User profile not found');
        }
        
        // Check if already registered
        if (tournament.participants.some(p => p.playerId === playerId)) {
          throw new Error('Player already registered for this tournament');
        }
        
        // Check capacity
        if (tournament.participants.length >= tournament.maxParticipants) {
          throw new Error('Tournament is full');
        }
        
        // Add participant
        const participant: TournamentParticipant = {
          playerId,
          playerDisplayName: userProfile.displayName || 'Anonymous',
          registeredAt: new Date(),
          skillLevel: this.calculatePlayerSkillLevel(userProfile)
        };
        
        const updatedParticipants = [...tournament.participants, participant];
        
        transaction.update(tournamentRef, {
          participants: updatedParticipants,
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Player ${playerId} registered for tournament ${tournamentId}`);
      });
    } catch (error) {
      console.error('❌ Error registering for tournament:', error);
      throw error;
    }
  }

  /**
   * Unregister player from tournament
   */
  static async unregisterPlayer(tournamentId: string, playerId: string): Promise<void> {
    try {
      console.log(`🚫 Unregistering player ${playerId} from tournament ${tournamentId}`);
      
      return await runTransaction(db, async (transaction) => {
        const tournamentRef = doc(db, this.COLLECTION_NAME, tournamentId);
        const tournamentDoc = await transaction.get(tournamentRef);
        
        if (!tournamentDoc.exists()) {
          throw new Error('Tournament not found');
        }
        
        const tournament = this.convertTournamentData(tournamentDoc.data());
        
        // Check if tournament has started
        if (tournament.status === 'active') {
          throw new Error('Cannot unregister from an active tournament');
        }
        
        // Remove participant
        const updatedParticipants = tournament.participants.filter(p => p.playerId !== playerId);
        
        transaction.update(tournamentRef, {
          participants: updatedParticipants,
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Player ${playerId} unregistered from tournament ${tournamentId}`);
      });
    } catch (error) {
      console.error('❌ Error unregistering from tournament:', error);
      throw error;
    }
  }

  /**
   * Generate tournament bracket
   */
  static async generateBracket(tournamentId: string): Promise<void> {
    try {
      console.log(`🎯 Generating bracket for tournament ${tournamentId}`);
      
      return await runTransaction(db, async (transaction) => {
        const tournamentRef = doc(db, this.COLLECTION_NAME, tournamentId);
        const tournamentDoc = await transaction.get(tournamentRef);
        
        if (!tournamentDoc.exists()) {
          throw new Error('Tournament not found');
        }
        
        const tournament = this.convertTournamentData(tournamentDoc.data());
        
        if (tournament.participants.length < 2) {
          throw new Error('Need at least 2 participants to generate bracket');
        }
        
        // Seed participants based on skill level
        const seededParticipants = this.seedParticipants(tournament.participants);
        
        // Generate bracket structure
        const bracket = this.createBracketStructure(seededParticipants);
        
        transaction.update(tournamentRef, {
          bracket,
          status: 'active',
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Generated bracket for tournament ${tournamentId}`);
        
        // Start first round matches
        await this.startTournamentRound(tournamentId, 1);
      });
    } catch (error) {
      console.error('❌ Error generating bracket:', error);
      throw error;
    }
  }

  /**
   * Start matches for a tournament round
   */
  static async startTournamentRound(tournamentId: string, round: number): Promise<void> {
    try {
      console.log(`⚡ Starting round ${round} for tournament ${tournamentId}`);
      
      const tournament = await this.getTournament(tournamentId);
      if (!tournament || !tournament.bracket) {
        throw new Error('Tournament or bracket not found');
      }
      
      let matches: TournamentMatch[] = [];
      switch (round) {
        case 1:
          matches = tournament.bracket.round1;
          break;
        case 2:
          matches = tournament.bracket.semifinals;
          break;
        case 3:
          matches = tournament.bracket.finals;
          break;
        default:
          throw new Error('Invalid round number');
      }
      
      // Create game sessions for each match
      for (const match of matches) {
        if (match.player1 && match.player2 && match.status === 'pending') {
          try {
            // Create tournament session
            const sessionId = await GameSessionService.createSession(
              'tournament',
              tournament.gameMode,
              {
                playerId: match.player1.playerId,
                playerDisplayName: match.player1.playerDisplayName,
                playerStats: { bestStreak: 0, currentStreak: 0, gamesPlayed: 0, matchWins: 0 }, // Will be loaded from user profile
                displayBackgroundEquipped: null,
                matchBackgroundEquipped: null,
                ready: false
              },
              {
                maxPlayers: 2,
                allowedPlayerIds: [match.player1.playerId, match.player2.playerId],
                requireActiveRanked: true,
                expirationTime: 60 // 1 hour for tournament matches
              },
              {
                tournamentId,
                bracket: 'single-elimination',
                round,
                position: match.position,
                matchNumber: matches.indexOf(match) + 1
              }
            );
            
            // Update match with session ID
            match.sessionId = sessionId;
            match.status = 'active';
            match.scheduledTime = new Date();
          } catch (error) {
            console.error(`❌ Error creating session for match ${match.id}:`, error);
          }
        }
      }
      
      // Update tournament with match information
      await updateDoc(doc(db, this.COLLECTION_NAME, tournamentId), {
        bracket: tournament.bracket,
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Started ${matches.length} matches for round ${round}`);
    } catch (error) {
      console.error('❌ Error starting tournament round:', error);
      throw error;
    }
  }

  /**
   * Process tournament match completion
   */
  static async processMatchCompletion(
    tournamentId: string,
    matchId: string,
    winnerId: string
  ): Promise<void> {
    try {
      console.log(`🏁 Processing match completion: ${matchId}, winner: ${winnerId}`);
      
      return await runTransaction(db, async (transaction) => {
        const tournamentRef = doc(db, this.COLLECTION_NAME, tournamentId);
        const tournamentDoc = await transaction.get(tournamentRef);
        
        if (!tournamentDoc.exists()) {
          throw new Error('Tournament not found');
        }
        
        const tournament = { id: tournamentId, ...this.convertTournamentData(tournamentDoc.data()) };
        
        if (!tournament.bracket) {
          throw new Error('Tournament bracket not found');
        }
        
        // Find and update the completed match
        const match = this.findMatchInBracket(tournament.bracket, matchId);
        if (!match) {
          throw new Error('Match not found in bracket');
        }
        
        match.winner = winnerId;
        match.status = 'completed';
        match.completedAt = new Date();
        
        // Advance winner to next round if applicable
        this.advanceWinnerToNextRound(tournament.bracket, match, winnerId);
        
        // Check if tournament is complete
        if (tournament.bracket.finals[0].status === 'completed') {
          tournament.status = 'completed';
          tournament.bracket.winner = winnerId;
          
          // Award tournament rewards
          await this.awardTournamentRewards(tournamentId, tournament);
        }
        
        transaction.update(tournamentRef, {
          bracket: tournament.bracket,
          status: tournament.status,
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Match ${matchId} completed, winner: ${winnerId}`);
      });
    } catch (error) {
      console.error('❌ Error processing match completion:', error);
      throw error;
    }
  }

  /**
   * Get tournament by ID
   */
  static async getTournament(tournamentId: string): Promise<Tournament | null> {
    try {
      const tournamentRef = doc(db, this.COLLECTION_NAME, tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        return null;
      }
      
      return {
        id: tournamentDoc.id,
        ...this.convertTournamentData(tournamentDoc.data())
      };
    } catch (error) {
      console.error('❌ Error getting tournament:', error);
      return null;
    }
  }

  /**
   * Get upcoming tournaments
   */
  static async getUpcomingTournaments(limit: number = 10): Promise<Tournament[]> {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('scheduledDate', '>', Timestamp.fromDate(now)),
        orderBy('scheduledDate', 'asc'),
        firestoreLimit(limit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertTournamentData(doc.data())
      }));
    } catch (error) {
      console.error('❌ Error getting upcoming tournaments:', error);
      return [];
    }
  }

  /**
   * Create weekly tournaments for the next period
   */
  static async createWeeklyTournaments(weeksAhead: number = 4): Promise<void> {
    try {
      console.log(`📅 Creating weekly tournaments for the next ${weeksAhead} weeks`);
      
      const now = new Date();
      const tournaments: Array<Parameters<typeof this.createTournament>[0]> = [];
      
      for (let week = 0; week < weeksAhead; week++) {
        for (const schedule of this.WEEKLY_SCHEDULE) {
          const tournamentDate = this.getNextWeekday(now, schedule.day, week);
          tournamentDate.setHours(19, 0, 0, 0); // 7:00 PM
          
          tournaments.push({
            name: `${schedule.name} - Week ${week + 1}`,
            description: `Weekly ${schedule.gameMode} tournament`,
            gameMode: schedule.gameMode,
            scheduledDate: tournamentDate,
            rewards: this.generateWeeklyRewards(schedule.gameMode, week + 1)
          });
        }
      }
      
      // Create tournaments
      for (const tournament of tournaments) {
        await this.createTournament(tournament);
      }
      
      console.log(`✅ Created ${tournaments.length} weekly tournaments`);
    } catch (error) {
      console.error('❌ Error creating weekly tournaments:', error);
      throw error;
    }
  }

  /**
   * Subscribe to tournament updates
   */
  static subscribeTournamentUpdates(
    tournamentId: string,
    callback: (tournament: Tournament | null) => void
  ): Unsubscribe {
    const tournamentRef = doc(db, this.COLLECTION_NAME, tournamentId);
    
    return onSnapshot(tournamentRef, (doc) => {
      if (doc.exists()) {
        const tournament: Tournament = {
          id: doc.id,
          ...this.convertTournamentData(doc.data())
        };
        callback(tournament);
      } else {
        callback(null);
      }
    });
  }

  // Private helper methods

  private static validateTournamentRegistration(tournament: Tournament, playerId: string): void {
    if (tournament.status !== 'registration-open' && tournament.status !== 'upcoming') {
      throw new Error('Registration is not open for this tournament');
    }
    
    const now = new Date();
    if (now < tournament.registrationOpens) {
      throw new Error('Registration has not opened yet');
    }
    
    if (now > tournament.registrationCloses) {
      throw new Error('Registration has closed');
    }
  }

  private static calculatePlayerSkillLevel(userProfile: any): number {
    // Calculate skill level based on user stats
    if (userProfile.rankedStats) {
      return userProfile.rankedStats.currentSeason.level;
    }
    
    // Fallback to basic stats calculation
    const winRate = userProfile.stats.gamesPlayed > 0 
      ? (userProfile.stats.matchWins / userProfile.stats.gamesPlayed) * 100 
      : 50;
    
    return Math.min(10, Math.max(1, Math.floor(winRate / 10) + 1));
  }

  private static seedParticipants(participants: TournamentParticipant[]): TournamentParticipant[] {
    // Sort by skill level (highest first) and assign seeds
    const sorted = [...participants].sort((a, b) => (b.skillLevel || 0) - (a.skillLevel || 0));
    return sorted.map((participant, index) => ({
      ...participant,
      seed: index + 1
    }));
  }

  private static createBracketStructure(participants: TournamentParticipant[]): TournamentBracket {
    // Create single elimination bracket for up to 8 players
    const round1: TournamentMatch[] = [];
    const semifinals: TournamentMatch[] = [];
    const finals: TournamentMatch[] = [];
    
    // Round 1 - Quarterfinals (if 8 players) or directly to semifinals
    if (participants.length === 8) {
      for (let i = 0; i < 4; i++) {
        round1.push({
          id: `r1-m${i + 1}`,
          round: 1,
          position: i,
          player1: participants[i * 2],
          player2: participants[i * 2 + 1],
          status: 'pending'
        });
      }
      
      // Semifinals
      for (let i = 0; i < 2; i++) {
        semifinals.push({
          id: `sf-m${i + 1}`,
          round: 2,
          position: i,
          status: 'pending'
        });
      }
    } else {
      // Fewer than 8 players - start at semifinals
      const pairsNeeded = Math.ceil(participants.length / 2);
      for (let i = 0; i < pairsNeeded; i++) {
        semifinals.push({
          id: `sf-m${i + 1}`,
          round: 2,
          position: i,
          player1: participants[i * 2],
          player2: participants[i * 2 + 1] || undefined, // Bye if odd number
          status: 'pending'
        });
      }
    }
    
    // Finals
    finals.push({
      id: 'final',
      round: 3,
      position: 0,
      status: 'pending'
    });
    
    return { round1, semifinals, finals };
  }

  private static findMatchInBracket(bracket: TournamentBracket, matchId: string): TournamentMatch | null {
    const allMatches = [...bracket.round1, ...bracket.semifinals, ...bracket.finals];
    return allMatches.find(match => match.id === matchId) || null;
  }

  private static advanceWinnerToNextRound(bracket: TournamentBracket, completedMatch: TournamentMatch, winnerId: string): void {
    const winner = completedMatch.player1?.playerId === winnerId ? completedMatch.player1 : completedMatch.player2;
    if (!winner) return;
    
    if (completedMatch.round === 1) {
      // Advance to semifinals
      const semiFinalIndex = Math.floor(completedMatch.position / 2);
      const semifinalMatch = bracket.semifinals[semiFinalIndex];
      if (semifinalMatch) {
        if (completedMatch.position % 2 === 0) {
          semifinalMatch.player1 = winner;
        } else {
          semifinalMatch.player2 = winner;
        }
      }
    } else if (completedMatch.round === 2) {
      // Advance to finals
      const finalMatch = bracket.finals[0];
      if (finalMatch) {
        if (completedMatch.position === 0) {
          finalMatch.player1 = winner;
        } else {
          finalMatch.player2 = winner;
        }
      }
    }
  }

  private static async awardTournamentRewards(tournamentId: string, tournament: Tournament): Promise<void> {
    try {
      console.log(`🏆 Awarding rewards for tournament ${tournamentId}`);
      
      if (!tournament.bracket?.winner) return;
      
      const winnerId = tournament.bracket.winner;
      
      // Award winner rewards
      await this.awardPlayerReward(winnerId, tournament.rewards.winner, 'winner');
      
      // Find finalist (loser of finals)
      const finalMatch = tournament.bracket.finals[0];
      if (finalMatch.player1 && finalMatch.player2) {
        const finalistId = finalMatch.player1.playerId === winnerId 
          ? finalMatch.player2.playerId 
          : finalMatch.player1.playerId;
        
        await this.awardPlayerReward(finalistId, tournament.rewards.finalist, 'finalist');
      }
      
      // Award participant rewards to all participants
      for (const participant of tournament.participants) {
        if (participant.playerId !== winnerId) { // Winner already got better reward
          await this.awardPlayerReward(participant.playerId, tournament.rewards.participant, 'participant');
        }
      }
      
      console.log(`✅ Tournament rewards awarded for ${tournamentId}`);
    } catch (error) {
      console.error('❌ Error awarding tournament rewards:', error);
    }
  }

  private static async awardPlayerReward(playerId: string, reward: any, rewardType: string): Promise<void> {
    try {
      // This would integrate with the user's inventory and reward system
      console.log(`🎁 Awarding ${rewardType} reward to player ${playerId}:`, reward);
      
      // Update user's tournament history
      const userRef = doc(db, 'users', playerId);
      const updateData: any = {
        updatedAt: new Date()
      };
      
      if (reward.backgroundId) {
        // Add background to inventory
        updateData['inventory.ownedBackgrounds'] = arrayUnion(reward.backgroundId);
      }
      
      if (reward.goldReward) {
        updateData.gold = increment(reward.goldReward);
      }
      
      if (reward.experience) {
        updateData.experience = increment(reward.experience);
      }
      
      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error(`❌ Error awarding reward to player ${playerId}:`, error);
    }
  }

  private static generateWeeklyRewards(gameMode: string, week: number): TournamentRewards {
    const baseBackgroundPrefix = `tournament_${gameMode}_week${week}`;
    
    return {
      winner: {
        backgroundId: `${baseBackgroundPrefix}_champion`,
        title: `${gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} Champion`,
        goldReward: 1000
      },
      finalist: {
        backgroundId: `${baseBackgroundPrefix}_finalist`,
        goldReward: 500
      },
      semifinalist: {
        goldReward: 250
      },
      participant: {
        experience: 100,
        goldReward: 50
      }
    };
  }

  private static getNextWeekday(date: Date, targetDay: number, weeksAhead: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + (weeksAhead * 7));
    
    const currentDay = result.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    result.setDate(result.getDate() + daysUntilTarget);
    
    return result;
  }

  private static convertTournamentData(data: any): Omit<Tournament, 'id'> {
    return {
      ...data,
      scheduledDate: data.scheduledDate.toDate(),
      registrationOpens: data.registrationOpens.toDate(),
      registrationCloses: data.registrationCloses.toDate(),
      tournamentStarts: data.tournamentStarts.toDate(),
      tournamentEnds: data.tournamentEnds.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      participants: data.participants.map((p: any) => ({
        ...p,
        registeredAt: p.registeredAt.toDate()
      }))
    };
  }

  private static scheduleTournamentStatusUpdates(tournamentId: string, tournament: Omit<Tournament, 'id'>): void {
    // Schedule registration opening
    const timeToRegOpen = tournament.registrationOpens.getTime() - Date.now();
    if (timeToRegOpen > 0) {
      setTimeout(async () => {
        try {
          await updateDoc(doc(db, this.COLLECTION_NAME, tournamentId), {
            status: 'registration-open',
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Error updating tournament status to registration-open:', error);
        }
      }, timeToRegOpen);
    }
    
    // Schedule registration closing
    const timeToRegClose = tournament.registrationCloses.getTime() - Date.now();
    if (timeToRegClose > 0) {
      setTimeout(async () => {
        try {
          await updateDoc(doc(db, this.COLLECTION_NAME, tournamentId), {
            status: 'registration-closed',
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Error updating tournament status to registration-closed:', error);
        }
      }, timeToRegClose);
    }
    
    // Schedule tournament start (bracket generation)
    const timeToStart = tournament.tournamentStarts.getTime() - Date.now();
    if (timeToStart > 0) {
      setTimeout(async () => {
        try {
          await this.generateBracket(tournamentId);
        } catch (error) {
          console.error('Error starting tournament:', error);
        }
      }, timeToStart);
    }
  }
}

// Import missing functions
import { arrayUnion, increment } from 'firebase/firestore';

// Export singleton instance
export const tournamentService = TournamentService;
