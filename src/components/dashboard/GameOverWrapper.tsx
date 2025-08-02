import React, { useState, useEffect } from 'react';
import { MatchData } from '@/types/match';
import { MatchService } from '@/services/matchService';
import { MatchSummaryScreen } from './MatchSummaryScreen';

interface GameOverWrapperProps {
  matchId: string;
  onLeaveMatch: () => void;
  onRematch?: (newMatchId: string) => void;
}

export const GameOverWrapper: React.FC<GameOverWrapperProps> = ({
  matchId,
  onLeaveMatch,
  onRematch
}) => {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getAndArchiveMatch = async () => {
      try {
        console.log('🎯 GameOverWrapper: Getting and archiving completed match...');
        setLoading(true);
        
        // Get match data and immediately archive it
        const archivedMatchData = await MatchService.getAndArchiveCompletedMatch(matchId);
        
        if (!archivedMatchData) {
          setError('Match not found or not completed');
          return;
        }
        
        setMatchData(archivedMatchData);
        console.log('✅ GameOverWrapper: Match data retrieved and archived successfully');
        
      } catch (error) {
        console.error('❌ GameOverWrapper: Error handling completed match:', error);
        setError('Failed to load match data');
      } finally {
        setLoading(false);
      }
    };

    getAndArchiveMatch();
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white text-xl" style={{ fontFamily: "Audiowide" }}>
            Loading match results...
          </p>
        </div>
      </div>
    );
  }

  if (error || !matchData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-red-400" style={{ fontFamily: "Audiowide" }}>
            Error Loading Match
          </h2>
          <p className="text-white text-xl">
            {error || 'Match data not available'}
          </p>
          <button
            onClick={onLeaveMatch}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105"
            style={{ fontFamily: "Audiowide" }}
          >
            BACK TO DASHBOARD
          </button>
        </div>
      </div>
    );
  }

  return (
    <MatchSummaryScreen
      matchData={matchData}
      onLeaveMatch={onLeaveMatch}
      onRematch={onRematch}
    />
  );
};

export default GameOverWrapper;
