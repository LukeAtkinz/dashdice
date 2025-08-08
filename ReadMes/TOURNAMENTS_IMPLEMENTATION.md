# Tournament System Implementation Guide

## Overview
Implementation of competitive tournaments for DashDice where players can enter and compete in structured bracket-style competitions.

## Core Features
- **Tournament Creation**: Automated bracket generation with different formats
- **Entry System**: Registration with entry fees and requirements
- **Bracket Management**: Single/double elimination, round-robin formats
- **Real-time Updates**: Live tournament progress and results
- **Rewards System**: Prize distribution for winners
- **Scheduling**: Automated match scheduling and notifications

## Database Schema

### Tournaments Collection
```typescript
interface Tournament {
  id: string;
  name: string;
  description: string;
  format: 'single_elimination' | 'double_elimination' | 'round_robin';
  status: 'upcoming' | 'registration' | 'active' | 'completed' | 'cancelled';
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number; // In gems or points
  prizePool: {
    first: number;
    second: number;
    third: number;
    participation?: number;
  };
  schedule: {
    registrationStart: Timestamp;
    registrationEnd: Timestamp;
    tournamentStart: Timestamp;
    tournamentEnd?: Timestamp;
  };
  rules: {
    gameMode: string;
    roundDuration: number; // minutes
    advancementRules: string;
  };
  createdBy: string; // Admin user ID
  createdAt: Timestamp;
}
```

### Tournament Participants Collection
```typescript
interface TournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string;
  username: string;
  registeredAt: Timestamp;
  seed: number; // Bracket seeding
  status: 'registered' | 'active' | 'eliminated' | 'winner';
  stats: {
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    totalScore: number;
  };
  currentRound?: number;
  bracketPosition?: string;
}
```

### Tournament Matches Collection
```typescript
interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'forfeit';
  gameId?: string; // Reference to actual game session
  scheduledTime: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  scores: {
    player1Score: number;
    player2Score: number;
  };
  nextMatchId?: string; // For bracket progression
}
```

### Tournament Brackets Collection
```typescript
interface TournamentBracket {
  id: string;
  tournamentId: string;
  format: string;
  structure: {
    rounds: number;
    matchesPerRound: number[];
  };
  matches: {
    [round: number]: string[]; // Match IDs
  };
  advancement: {
    [matchId: string]: {
      winnerAdvancesTo?: string;
      loserAdvancesTo?: string; // For double elimination
    };
  };
}
```

## Services Implementation

### Tournament Service
```typescript
// src/services/tournamentService.ts
export class TournamentService {
  // Get active tournaments
  static async getActiveTournaments(): Promise<Tournament[]> {
    const q = query(
      collection(db, 'tournaments'),
      where('status', 'in', ['upcoming', 'registration', 'active']),
      orderBy('schedule.registrationStart', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tournament[];
  }

  // Register for tournament
  static async registerForTournament(tournamentId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if tournament exists and is accepting registrations
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

      // Check if user already registered
      const existingParticipant = await this.getParticipant(tournamentId, userId);
      if (existingParticipant) {
        return { success: false, error: 'Already registered' };
      }

      // Check entry fee and deduct from user
      const canAfford = await this.checkAndDeductEntryFee(userId, tournament.entryFee);
      if (!canAfford) {
        return { success: false, error: 'Insufficient funds' };
      }

      // Register participant
      await addDoc(collection(db, 'tournamentParticipants'), {
        tournamentId,
        userId,
        username: 'Player', // Get from user service
        registeredAt: serverTimestamp(),
        seed: tournament.currentParticipants + 1,
        status: 'registered',
        stats: {
          matchesPlayed: 0,
          matchesWon: 0,
          matchesLost: 0,
          totalScore: 0
        }
      });

      // Update tournament participant count
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        currentParticipants: tournament.currentParticipants + 1
      });

      return { success: true };
    } catch (error) {
      console.error('Error registering for tournament:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  // Generate tournament bracket
  static async generateBracket(tournamentId: string): Promise<boolean> {
    try {
      const tournament = await this.getTournament(tournamentId);
      if (!tournament) return false;

      const participants = await this.getTournamentParticipants(tournamentId);
      
      let bracket: TournamentBracket;
      switch (tournament.format) {
        case 'single_elimination':
          bracket = this.generateSingleEliminationBracket(tournament, participants);
          break;
        case 'double_elimination':
          bracket = this.generateDoubleEliminationBracket(tournament, participants);
          break;
        case 'round_robin':
          bracket = this.generateRoundRobinBracket(tournament, participants);
          break;
        default:
          return false;
      }

      // Save bracket
      await addDoc(collection(db, 'tournamentBrackets'), bracket);

      // Generate initial matches
      await this.generateMatches(bracket);

      // Update tournament status
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        status: 'active'
      });

      return true;
    } catch (error) {
      console.error('Error generating bracket:', error);
      return false;
    }
  }

  // Advance player in bracket
  static async advancePlayer(matchId: string, winnerId: string): Promise<boolean> {
    try {
      const match = await this.getMatch(matchId);
      if (!match) return false;

      // Update match result
      await updateDoc(doc(db, 'tournamentMatches', matchId), {
        winnerId,
        status: 'completed',
        completedAt: serverTimestamp()
      });

      // Update participant stats
      await this.updateParticipantStats(match.tournamentId, winnerId, true);
      const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      await this.updateParticipantStats(match.tournamentId, loserId, false);

      // Advance to next round if applicable
      const bracket = await this.getTournamentBracket(match.tournamentId);
      if (bracket?.advancement[matchId]?.winnerAdvancesTo) {
        await this.scheduleNextMatch(bracket.advancement[matchId].winnerAdvancesTo!, winnerId);
      }

      // Check if tournament is complete
      await this.checkTournamentCompletion(match.tournamentId);

      return true;
    } catch (error) {
      console.error('Error advancing player:', error);
      return false;
    }
  }

  // Get tournament standings
  static async getTournamentStandings(tournamentId: string): Promise<TournamentParticipant[]> {
    const q = query(
      collection(db, 'tournamentParticipants'),
      where('tournamentId', '==', tournamentId),
      orderBy('stats.matchesWon', 'desc'),
      orderBy('stats.totalScore', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TournamentParticipant[];
  }

  private static generateSingleEliminationBracket(tournament: Tournament, participants: TournamentParticipant[]): TournamentBracket {
    const participantCount = participants.length;
    const rounds = Math.ceil(Math.log2(participantCount));
    
    return {
      id: '',
      tournamentId: tournament.id,
      format: 'single_elimination',
      structure: {
        rounds,
        matchesPerRound: Array.from({ length: rounds }, (_, i) => Math.ceil(participantCount / Math.pow(2, i + 1)))
      },
      matches: {},
      advancement: {}
    };
  }

  private static async generateMatches(bracket: TournamentBracket): Promise<void> {
    // Implementation for generating actual match documents
    // This would create TournamentMatch documents based on the bracket structure
  }

  private static async checkAndDeductEntryFee(userId: string, amount: number): Promise<boolean> {
    // Implementation to check user's currency and deduct entry fee
    return true;
  }

  private static async getTournament(tournamentId: string): Promise<Tournament | null> {
    const doc = await getDocs(query(collection(db, 'tournaments'), where('__name__', '==', tournamentId)));
    return doc.empty ? null : { id: doc.docs[0].id, ...doc.docs[0].data() } as Tournament;
  }

  private static async getParticipant(tournamentId: string, userId: string): Promise<TournamentParticipant | null> {
    const q = query(
      collection(db, 'tournamentParticipants'),
      where('tournamentId', '==', tournamentId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TournamentParticipant;
  }

  private static async getTournamentParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
    const q = query(
      collection(db, 'tournamentParticipants'),
      where('tournamentId', '==', tournamentId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TournamentParticipant[];
  }
}
```

### Tournament Management Service
```typescript
// src/services/tournamentManagementService.ts
export class TournamentManagementService {
  // Create new tournament (admin only)
  static async createTournament(tournamentData: Partial<Tournament>): Promise<string> {
    const tournament: Partial<Tournament> = {
      ...tournamentData,
      status: 'upcoming',
      currentParticipants: 0,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'tournaments'), tournament);
    return docRef.id;
  }

  // Start registration period
  static async startRegistration(tournamentId: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        status: 'registration'
      });
      return true;
    } catch (error) {
      console.error('Error starting registration:', error);
      return false;
    }
  }

  // Auto-advance on forfeit
  static async handleForfeit(matchId: string, forfeitingUserId: string): Promise<boolean> {
    const match = await TournamentService.getMatch(matchId);
    if (!match) return false;

    const winnerId = match.player1Id === forfeitingUserId ? match.player2Id : match.player1Id;
    
    await updateDoc(doc(db, 'tournamentMatches', matchId), {
      winnerId,
      status: 'forfeit',
      completedAt: serverTimestamp()
    });

    return await TournamentService.advancePlayer(matchId, winnerId);
  }

  // Distribute prizes
  static async distributePrizes(tournamentId: string): Promise<boolean> {
    try {
      const tournament = await TournamentService.getTournament(tournamentId);
      const standings = await TournamentService.getTournamentStandings(tournamentId);
      
      if (!tournament || standings.length === 0) return false;

      // Award prizes to top finishers
      if (standings[0]) {
        await this.awardPrize(standings[0].userId, tournament.prizePool.first);
      }
      if (standings[1]) {
        await this.awardPrize(standings[1].userId, tournament.prizePool.second);
      }
      if (standings[2]) {
        await this.awardPrize(standings[2].userId, tournament.prizePool.third);
      }

      // Participation rewards
      if (tournament.prizePool.participation) {
        for (const participant of standings.slice(3)) {
          await this.awardPrize(participant.userId, tournament.prizePool.participation);
        }
      }

      return true;
    } catch (error) {
      console.error('Error distributing prizes:', error);
      return false;
    }
  }

  private static async awardPrize(userId: string, amount: number): Promise<void> {
    // Implementation to add currency/rewards to user account
  }
}
```

## Frontend Components

### Tournament Context
```typescript
// src/context/TournamentContext.tsx
interface TournamentContextType {
  tournaments: Tournament[];
  userTournaments: TournamentParticipant[];
  isLoading: boolean;
  registerForTournament: (tournamentId: string) => Promise<boolean>;
  getTournamentBracket: (tournamentId: string) => Promise<TournamentBracket | null>;
  getTournamentMatches: (tournamentId: string) => Promise<TournamentMatch[]>;
}

export function TournamentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userTournaments, setUserTournaments] = useState<TournamentParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
    if (user) {
      loadUserTournaments();
    }
  }, [user]);

  const loadTournaments = async () => {
    const activeTournaments = await TournamentService.getActiveTournaments();
    setTournaments(activeTournaments);
    setIsLoading(false);
  };

  const registerForTournament = async (tournamentId: string): Promise<boolean> => {
    if (!user) return false;
    const result = await TournamentService.registerForTournament(tournamentId, user.uid);
    if (result.success) {
      await loadTournaments();
      await loadUserTournaments();
    }
    return result.success;
  };

  // ... other methods
}
```

### Tournament List Component
```typescript
// src/components/tournaments/TournamentList.tsx
export default function TournamentList() {
  const { tournaments, registerForTournament } = useTournament();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredTournaments = tournaments.filter(tournament => 
    selectedStatus === 'all' || tournament.status === selectedStatus
  );

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Tournaments</h2>
        
        {/* Status Filter */}
        <select 
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-gray-700 text-white px-3 py-2 rounded-lg"
        >
          <option value="all">All Tournaments</option>
          <option value="registration">Open Registration</option>
          <option value="active">In Progress</option>
          <option value="upcoming">Upcoming</option>
        </select>
      </div>

      <div className="grid gap-4">
        {filteredTournaments.map(tournament => (
          <TournamentCard 
            key={tournament.id} 
            tournament={tournament}
            onRegister={registerForTournament}
          />
        ))}
      </div>
    </div>
  );
}
```

### Tournament Card Component
```typescript
// src/components/tournaments/TournamentCard.tsx
interface TournamentCardProps {
  tournament: Tournament;
  onRegister: (tournamentId: string) => Promise<boolean>;
}

export default function TournamentCard({ tournament, onRegister }: TournamentCardProps) {
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    setIsRegistering(true);
    await onRegister(tournament.id);
    setIsRegistering(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'bg-green-600';
      case 'active': return 'bg-blue-600';
      case 'upcoming': return 'bg-yellow-600';
      case 'completed': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const formatPrize = (amount: number) => `${amount.toLocaleString()} gems`;

  return (
    <div className="bg-gray-700 rounded-lg p-6 hover:bg-gray-650 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">{tournament.name}</h3>
          <p className="text-gray-300">{tournament.description}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(tournament.status)}`}>
          {tournament.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-gray-400 text-sm">Format</p>
          <p className="text-white font-medium">{tournament.format.replace('_', ' ')}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Participants</p>
          <p className="text-white font-medium">{tournament.currentParticipants}/{tournament.maxParticipants}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Entry Fee</p>
          <p className="text-white font-medium">{tournament.entryFee} gems</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">First Prize</p>
          <p className="text-green-400 font-medium">{formatPrize(tournament.prizePool.first)}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          Registration: {tournament.schedule.registrationStart.toDate().toLocaleDateString()} - {tournament.schedule.registrationEnd.toDate().toLocaleDateString()}
        </div>
        
        {tournament.status === 'registration' && (
          <button
            onClick={handleRegister}
            disabled={isRegistering || tournament.currentParticipants >= tournament.maxParticipants}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {isRegistering ? 'Registering...' : 'Register'}
          </button>
        )}
      </div>
    </div>
  );
}
```

### Tournament Bracket Component
```typescript
// src/components/tournaments/TournamentBracket.tsx
interface TournamentBracketProps {
  tournamentId: string;
}

export default function TournamentBracket({ tournamentId }: TournamentBracketProps) {
  const [bracket, setBracket] = useState<TournamentBracket | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);

  useEffect(() => {
    loadBracketData();
  }, [tournamentId]);

  const loadBracketData = async () => {
    const [bracketData, matchData, participantData] = await Promise.all([
      TournamentService.getTournamentBracket(tournamentId),
      TournamentService.getTournamentMatches(tournamentId),
      TournamentService.getTournamentParticipants(tournamentId)
    ]);
    
    setBracket(bracketData);
    setMatches(matchData);
    setParticipants(participantData);
  };

  const getParticipantName = (userId: string) => {
    return participants.find(p => p.userId === userId)?.username || 'TBD';
  };

  const renderMatch = (match: TournamentMatch) => (
    <div key={match.id} className="bg-gray-700 rounded p-3 mb-2">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className={`p-2 rounded ${match.winnerId === match.player1Id ? 'bg-green-900' : 'bg-gray-800'}`}>
            {getParticipantName(match.player1Id)}
          </div>
          <div className={`p-2 rounded mt-1 ${match.winnerId === match.player2Id ? 'bg-green-900' : 'bg-gray-800'}`}>
            {getParticipantName(match.player2Id)}
          </div>
        </div>
        <div className="ml-4 text-center">
          <div className="text-sm text-gray-400">Round {match.round}</div>
          <div className="text-xs text-gray-500">
            {match.status === 'completed' ? 'Final' : 
             match.status === 'in_progress' ? 'Live' : 
             'Scheduled'}
          </div>
        </div>
      </div>
    </div>
  );

  if (!bracket || !matches.length) {
    return <div className="text-center py-8 text-gray-400">Loading bracket...</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-6">Tournament Bracket</h3>
      
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${bracket.structure.rounds}, 1fr)` }}>
        {Array.from({ length: bracket.structure.rounds }, (_, round) => (
          <div key={round} className="space-y-4">
            <h4 className="text-center text-white font-medium">
              {round === bracket.structure.rounds - 1 ? 'Final' : `Round ${round + 1}`}
            </h4>
            {matches
              .filter(match => match.round === round + 1)
              .map(renderMatch)
            }
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Core Setup (Week 1)
- Database schema and tournament creation
- Basic registration system
- Tournament listing and details

### Phase 2: Bracket System (Week 2)
- Bracket generation algorithms
- Match scheduling and management
- Player advancement logic

### Phase 3: Competition Flow (Week 3)
- Real-time match updates
- Forfeit and substitution handling
- Live tournament tracking

### Phase 4: Advanced Features (Week 4)
- Prize distribution system
- Tournament analytics and history
- Admin management tools

This tournament system provides structured competitive play that encourages regular engagement and creates exciting community events for DashDice players.
