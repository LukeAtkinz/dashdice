'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';

// Inline form hook to avoid import issues
const useForm = <T extends Record<string, string>>(initialValues: T) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (onSubmit: (values: T) => Promise<void> | void) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    };
  };

  return { values, errors, isSubmitting, handleChange, handleSubmit };
};

export const MatchSection: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  const createGameForm = useForm({
    gameType: 'casual',
    maxPlayers: '4',
    gameName: `${user?.displayName || 'Player'}'s Game`
  });

  const joinGameForm = useForm({
    gameId: ''
  });

  const handleCreateGame = createGameForm.handleSubmit(async (values) => {
    console.log('Creating game:', values);
    // TODO: Implement game creation logic
    alert('Game created! (Implementation needed)');
  });

  const handleJoinGame = joinGameForm.handleSubmit(async (values) => {
    console.log('Joining game:', values);
    // TODO: Implement game joining logic
    alert('Joining game! (Implementation needed)');
  });

  const activeGames = [
    {
      id: 'game-1',
      name: 'Epic Battle Royale',
      players: '3/4',
      type: 'Ranked',
      status: 'Waiting for players',
      host: 'Player123'
    },
    {
      id: 'game-2',
      name: 'Quick Match',
      players: '2/4',
      type: 'Casual',
      status: 'In progress',
      host: 'DiceKing'
    },
    {
      id: 'game-3',
      name: 'Tournament Finals',
      players: '4/4',
      type: 'Tournament',
      status: 'Full',
      host: 'GameMaster'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-orbitron font-bold text-gray-900 mb-2">
          Game Matches
        </h1>
        <p className="text-gray-600">
          Create a new game or join an existing match
        </p>
      </div>

      {/* Create/Join Tabs */}
      <Card>
        <CardHeader>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={activeTab === 'create' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('create')}
              className="flex-1"
            >
              🎲 Create Game
            </Button>
            <Button
              variant={activeTab === 'join' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('join')}
              className="flex-1"
            >
              🔍 Join Game
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'create' ? (
            <form onSubmit={handleCreateGame} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Game Name
                </label>
                <Input
                  type="text"
                  value={createGameForm.values.gameName}
                  onChange={(e) => createGameForm.handleChange('gameName', e.target.value)}
                  placeholder="Enter game name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Game Type
                  </label>
                  <select
                    value={createGameForm.values.gameType}
                    onChange={(e) => createGameForm.handleChange('gameType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="casual">Casual</option>
                    <option value="ranked">Ranked</option>
                    <option value="tournament">Tournament</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Players
                  </label>
                  <select
                    value={createGameForm.values.maxPlayers}
                    onChange={(e) => createGameForm.handleChange('maxPlayers', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="2">2 Players</option>
                    <option value="3">3 Players</option>
                    <option value="4">4 Players</option>
                    <option value="6">6 Players</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={createGameForm.isSubmitting}
                className="w-full"
              >
                {createGameForm.isSubmitting ? 'Creating...' : 'Create Game'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoinGame} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Game ID
                </label>
                <Input
                  type="text"
                  value={joinGameForm.values.gameId}
                  onChange={(e) => joinGameForm.handleChange('gameId', e.target.value)}
                  placeholder="Enter game ID (e.g., ABC123)"
                />
              </div>

              <Button
                type="submit"
                disabled={joinGameForm.isSubmitting || !joinGameForm.values.gameId}
                className="w-full"
              >
                {joinGameForm.isSubmitting ? 'Joining...' : 'Join Game'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Active Games */}
      <Card>
        <CardHeader>
          <CardTitle>Active Games</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeGames.map((game) => (
              <div
                key={game.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold">{game.name}</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {game.type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Host: {game.host} • Players: {game.players}
                  </div>
                  <div className="text-xs text-gray-500">
                    Status: {game.status}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                  {game.status === 'Waiting for players' && (
                    <Button size="sm">
                      Join
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
