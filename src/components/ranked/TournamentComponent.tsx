'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Calendar, Clock, Target, Medal, Star, Play, Check, X } from 'lucide-react';
import { Tournament, TournamentParticipant } from '../../services/enhancedTournamentService';
import { TournamentBracketManager } from '../../services/tournamentBracketManager';

interface TournamentComponentProps {
  userId: string;
  compactMode?: boolean;
}

export function TournamentComponent({ userId, compactMode = false }: TournamentComponentProps) {
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [userTournaments, setUserTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);

  // Mock tournament data for demo (in real app, this would come from Firebase)
  useEffect(() => {
    const mockTournaments: Tournament[] = [
      {
        id: 'tournament-1',
        name: 'Weekly Champions Cup',
        description: 'Compete against the best players for exclusive rewards!',
        gameMode: 'classic',
        tournamentType: 'single-elimination',
        status: 'registration',
        maxParticipants: 16,
        currentParticipants: 8,
        entryFee: 100,
        prizePool: [
          { position: 1, reward: { type: 'currency', amount: 1000 } },
          { position: 2, reward: { type: 'currency', amount: 500 } },
          { position: 3, reward: { type: 'currency', amount: 250 } }
        ],
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        registrationDeadline: new Date(Date.now() + 1.5 * 60 * 60 * 1000), // 1.5 hours from now
        bracket: {
          rounds: [],
          currentRound: 0,
          participants: []
        },
        rules: {
          matchFormat: 'best-of-3',
          timeLimit: 30,
          allowSpectators: true,
          tiebreaker: 'sudden-death',
          forfeitTime: 5
        },
        organizer: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'tournament-2',
        name: 'Daily Quick Fire',
        description: 'Fast-paced tournament for quick rewards',
        gameMode: 'quickfire',
        tournamentType: 'round-robin',
        status: 'in-progress',
        maxParticipants: 8,
        currentParticipants: 8,
        startTime: new Date(Date.now() - 30 * 60 * 1000), // Started 30 minutes ago
        registrationDeadline: new Date(Date.now() - 60 * 60 * 1000), // Registration closed
        bracket: {
          rounds: [],
          currentRound: 1,
          participants: []
        },
        rules: {
          matchFormat: 'best-of-1',
          timeLimit: 15,
          allowSpectators: true,
          tiebreaker: 'coin-flip',
          forfeitTime: 3
        },
        organizer: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    setActiveTournaments(mockTournaments);
    setLoading(false);
  }, []);

  const handleRegister = async (tournamentId: string) => {
    setRegistering(tournamentId);
    
    // Simulate registration delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real app, call: await EnhancedTournamentService.registerPlayer(tournamentId, userId, playerData)
    console.log(`Registered for tournament ${tournamentId}`);
    
    setRegistering(null);
  };

  const getStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'registration': return 'text-green-400';
      case 'in-progress': return 'text-yellow-400';
      case 'completed': return 'text-blue-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: Tournament['status']) => {
    switch (status) {
      case 'registration': return <Clock className="w-4 h-4" />;
      case 'in-progress': return <Play className="w-4 h-4" />;
      case 'completed': return <Check className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const formatTimeRemaining = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (compactMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold text-yellow-400">Tournaments</h3>
        </div>
        
        {activeTournaments.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No active tournaments</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTournaments.slice(0, 3).map((tournament) => (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">{tournament.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      {getStatusIcon(tournament.status)}
                      <span className={getStatusColor(tournament.status)}>
                        {tournament.status}
                      </span>
                      <Users className="w-3 h-3 ml-2" />
                      <span>{tournament.currentParticipants}/{tournament.maxParticipants}</span>
                    </div>
                  </div>
                  {tournament.status === 'registration' && (
                    <button
                      onClick={() => handleRegister(tournament.id)}
                      disabled={registering === tournament.id}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-black rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {registering === tournament.id ? 'Joining...' : 'Join'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <h2 className="text-2xl font-bold text-yellow-400">Tournaments</h2>
      </div>

      {activeTournaments.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-24 h-24 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-bold text-gray-400 mb-2">No Active Tournaments</h3>
          <p className="text-gray-500">Check back later for upcoming tournaments!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {activeTournaments.map((tournament) => (
            <motion.div
              key={tournament.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/50 rounded-xl p-6 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{tournament.name}</h3>
                  <p className="text-gray-300 text-sm">{tournament.description}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(tournament.status)}`}>
                  {getStatusIcon(tournament.status)}
                  <span>{tournament.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Users className="w-4 h-4" />
                    <span>{tournament.currentParticipants}/{tournament.maxParticipants} Players</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Target className="w-4 h-4" />
                    <span>{tournament.tournamentType}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span>{formatTimeRemaining(tournament.startTime)}</span>
                  </div>
                  {tournament.entryFee && (
                    <div className="flex items-center gap-2 text-sm text-yellow-400">
                      <Medal className="w-4 h-4" />
                      <span>{tournament.entryFee} coins</span>
                    </div>
                  )}
                </div>
              </div>

              {tournament.prizePool && tournament.prizePool.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-300 mb-2">Prize Pool</h4>
                  <div className="flex gap-2">
                    {tournament.prizePool.slice(0, 3).map((prize) => (
                      <div key={prize.position} className="flex items-center gap-1 text-xs bg-yellow-900/30 px-2 py-1 rounded">
                        <span className="text-yellow-400">#{prize.position}</span>
                        <span className="text-white">{prize.reward.amount} coins</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {tournament.status === 'registration' && (
                  <button
                    onClick={() => handleRegister(tournament.id)}
                    disabled={registering === tournament.id || tournament.currentParticipants >= tournament.maxParticipants}
                    className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registering === tournament.id ? 'Joining...' : 
                     tournament.currentParticipants >= tournament.maxParticipants ? 'Full' : 'Join Tournament'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedTournament(tournament)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tournament Details Modal */}
      <AnimatePresence>
        {selectedTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTournament(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-purple-500/50 rounded-xl p-6 max-w-2xl w-full max-h-96 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{selectedTournament.name}</h3>
                <button
                  onClick={() => setSelectedTournament(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4 text-gray-300">
                <p>{selectedTournament.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-white mb-2">Tournament Info</h4>
                    <ul className="space-y-1 text-sm">
                      <li>Format: {selectedTournament.tournamentType}</li>
                      <li>Game Mode: {selectedTournament.gameMode}</li>
                      <li>Match Format: {selectedTournament.rules.matchFormat}</li>
                      <li>Time Limit: {selectedTournament.rules.timeLimit} minutes</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">Participants</h4>
                    <p className="text-sm">{selectedTournament.currentParticipants} / {selectedTournament.maxParticipants} players</p>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full" 
                        style={{ width: `${(selectedTournament.currentParticipants / selectedTournament.maxParticipants) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
