import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Unsubscribe,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export interface MatchHistoryEntry {
  id: string;
  playerUserId: string;
  opponentUserId: string;
  opponentDisplayName: string;
  result: 'won' | 'lost';
  playerScore: number;
  opponentScore: number;
  gameMode: string;
  gameType: string;
  background?: string;
  backgroundFile?: string;
  opponentBackground?: string;
  opponentBackgroundFile?: string;
  completedAt: Timestamp;
  duration?: number; // in milliseconds
  isFriendMatch?: boolean; // Whether this was a friend vs friend match
  matchData?: {
    playerBanks?: number;
    playerDoubles?: number;
    biggestTurn?: number;
    totalTurns?: number;
  };
}

export class MatchHistoryService {
  private static readonly MATCH_HISTORY_COLLECTION = 'matchHistory';
  private static readonly COMPLETED_MATCHES_COLLECTION = 'completedmatches';

  /**
   * Subscribe to a user's match history (last 10 matches)
   * First tries matchHistory collection, then falls back to completedmatches
   */
  static subscribeToMatchHistory(
    userId: string,
    callback: (matches: MatchHistoryEntry[]) => void
  ): Unsubscribe {
    try {
      console.log('🔄 MatchHistoryService: Subscribing to match history for user:', userId);
      
      // First try the dedicated matchHistory collection
      const q = query(
        collection(db, this.MATCH_HISTORY_COLLECTION),
        where('playerUserId', '==', userId),
        orderBy('completedAt', 'desc'),
        limit(10)
      );

      return onSnapshot(q, (snapshot) => {
        const matches: MatchHistoryEntry[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          matches.push({
            id: doc.id,
            ...data
          } as MatchHistoryEntry);
        });

        console.log('📊 MatchHistoryService: Match history from matchHistory collection:', matches.length, 'matches');
        
        // If no matches found in matchHistory, try completedmatches collection
        if (matches.length === 0) {
          console.log('🔄 MatchHistoryService: No matches in matchHistory, trying completedmatches collection...');
          this.queryCompletedMatches(userId, callback);
        } else {
          callback(matches);
        }
      }, (error) => {
        console.error('❌ MatchHistoryService: Error in match history subscription:', error);
        // Fallback to completedmatches collection
        console.log('🔄 MatchHistoryService: Falling back to completedmatches collection...');
        this.queryCompletedMatches(userId, callback);
      });
    } catch (error) {
      console.error('❌ MatchHistoryService: Failed to subscribe to match history:', error);
      // Fallback to completedmatches collection
      console.log('🔄 MatchHistoryService: Falling back to completedmatches collection...');
      this.queryCompletedMatches(userId, callback);
      return () => {}; // Return empty cleanup function
    }
  }

  /**
   * Query completed matches collection and transform to match history format
   */
  private static queryCompletedMatches(userId: string, callback: (matches: MatchHistoryEntry[]) => void): Unsubscribe {
    try {
      // Query completedmatches where user was either host or opponent
      const q = query(
        collection(db, this.COMPLETED_MATCHES_COLLECTION),
        orderBy('completedAt', 'desc'),
        limit(50) // Get more to filter
      );

      return onSnapshot(q, (snapshot) => {
        const matches: MatchHistoryEntry[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Check if user was involved in this match
          const hostId = data.hostData?.playerId;
          const opponentId = data.opponentData?.playerId;
          
          if (hostId === userId || opponentId === userId) {
            // Transform completed match data to match history format
            const isHost = hostId === userId;
            const playerData = isHost ? data.hostData : data.opponentData;
            const opponentData = isHost ? data.opponentData : data.hostData;
            
            // Determine result based on winner
            let result: 'won' | 'lost' = 'lost';
            if (data.winner) {
              if (data.winner.playerId === userId) {
                result = 'won';
              }
            } else if (playerData?.playerScore && opponentData?.playerScore) {
              // Fallback: determine by score
              result = playerData.playerScore > opponentData.playerScore ? 'won' : 'lost';
            }
            
            // Get game mode from multiple possible fields
            const gameMode = data.gameData?.gameMode || data.gameData?.type || data.gameMode || 'classic';
            
            const historyEntry: MatchHistoryEntry = {
              id: doc.id,
              playerUserId: userId,
              opponentUserId: opponentData?.playerId || 'unknown',
              opponentDisplayName: opponentData?.playerDisplayName || 'Unknown Player',
              result: result,
              playerScore: playerData?.playerScore || 0,
              opponentScore: opponentData?.playerScore || 0,
              gameMode: gameMode,
              gameType: gameMode, // Use the same value for both fields for consistency
              background: playerData?.matchBackgroundEquipped?.name || playerData?.displayBackgroundEquipped?.name,
              backgroundFile: playerData?.matchBackgroundEquipped?.file || playerData?.displayBackgroundEquipped?.file,
              opponentBackground: opponentData?.matchBackgroundEquipped?.name || opponentData?.displayBackgroundEquipped?.name,
              opponentBackgroundFile: opponentData?.matchBackgroundEquipped?.file || opponentData?.displayBackgroundEquipped?.file,
              completedAt: data.completedAt || data.endedAt,
              duration: data.duration,
              isFriendMatch: data.isFriendMatch || false,
              matchData: {
                playerBanks: playerData?.banks,
                playerDoubles: playerData?.doubles,
                biggestTurn: playerData?.biggestTurn,
                totalTurns: data.gameData?.totalTurns
              }
            };
            
            // Debug logging for background data
            console.log('🎨 MatchHistoryService: Background debug for match', doc.id, {
              playerData: {
                matchBg: playerData?.matchBackgroundEquipped,
                displayBg: playerData?.displayBackgroundEquipped
              },
              opponentData: {
                matchBg: opponentData?.matchBackgroundEquipped,
                displayBg: opponentData?.displayBackgroundEquipped
              },
              resultingEntry: {
                backgroundFile: historyEntry.backgroundFile,
                opponentBackgroundFile: historyEntry.opponentBackgroundFile
              }
            });
            
            matches.push(historyEntry);
          }
        });

        // Sort by completion date and limit to 10
        matches.sort((a, b) => {
          const aTime = a.completedAt?.toMillis?.() || 0;
          const bTime = b.completedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        
        const limitedMatches = matches.slice(0, 10);
        
        console.log('📊 MatchHistoryService: Match history from completedmatches collection:', limitedMatches.length, 'matches');
        callback(limitedMatches);
      }, (error) => {
        console.error('❌ MatchHistoryService: Error querying completedmatches:', error);
        
        // Handle permission errors gracefully
        if (error?.code === 'permission-denied') {
          console.warn('🔒 MatchHistoryService: Permission denied for completedmatches. User may not be properly authenticated.');
        }
        
        callback([]);
      });
    } catch (error) {
      console.error('❌ MatchHistoryService: Failed to query completedmatches:', error);
      callback([]);
      return () => {};
    }
  }

  /**
   * Get display name for game mode
   */
  static getGameModeDisplayName(gameType: string): string {
    const modeNames: Record<string, string> = {
      'classic': 'Classic Mode',
      'quickfire': 'Quick Fire',
      'zero-hour': 'Zero Hour',
      'last-line': 'Last Line',
      'true-grit': 'True Grit',
      'tag-team': 'Tag Team'
    };
    return modeNames[gameType.toLowerCase()] || gameType.charAt(0).toUpperCase() + gameType.slice(1);
  }

  /**
   * Format match duration
   */
  static formatDuration(duration: number): string {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format date for display
   */
  static formatMatchDate(timestamp: Timestamp): string {
    const date = timestamp.toDate();
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffHours < 168) { // Less than a week
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }
}
