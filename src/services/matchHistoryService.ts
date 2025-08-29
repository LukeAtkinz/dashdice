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
  completedAt: Timestamp;
  duration?: number; // in milliseconds
}

export class MatchHistoryService {
  private static readonly MATCH_HISTORY_COLLECTION = 'matchHistory';

  /**
   * Subscribe to a user's match history (last 10 matches)
   */
  static subscribeToMatchHistory(
    userId: string,
    callback: (matches: MatchHistoryEntry[]) => void
  ): Unsubscribe {
    try {
      console.log('🔄 MatchHistoryService: Subscribing to match history for user:', userId);
      
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

        console.log('📊 MatchHistoryService: Match history updated:', matches.length, 'matches');
        callback(matches);
      }, (error) => {
        console.error('❌ MatchHistoryService: Error in match history subscription:', error);
        callback([]);
      });
    } catch (error) {
      console.error('❌ MatchHistoryService: Failed to subscribe to match history:', error);
      return () => {}; // Return empty cleanup function
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
