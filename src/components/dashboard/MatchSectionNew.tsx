'use client';

import React, { useState } from 'react';
import { GameWaitingRoom } from './GameWaitingRoom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';

interface MatchSectionProps {
  gameMode?: string;
  actionType?: 'live' | 'custom';
}

export const MatchSection: React.FC<MatchSectionProps> = ({ 
  gameMode: initialGameMode, 
  actionType: initialActionType 
}) => {
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();
  const [showWaitingRoom, setShowWaitingRoom] = useState(!!initialGameMode && !!initialActionType);
  const [selectedGameMode, setSelectedGameMode] = useState(initialGameMode || 'classic');
  const [selectedActionType, setSelectedActionType] = useState<'live' | 'custom'>(initialActionType || 'live');

  const handleBackFromWaitingRoom = () => {
    setShowWaitingRoom(false);
    setCurrentSection('dashboard'); // Go back to dashboard instead of match section
  };

  // If we should show waiting room, render it
  if (showWaitingRoom) {
    return (
      <GameWaitingRoom 
        gameMode={selectedGameMode}
        actionType={selectedActionType}
        onBack={handleBackFromWaitingRoom}
      />
    );
  }

  // Original match section content (simplified for now)
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Match Center</h1>
        <p className="text-gray-600">Create or join a game match</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Match */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Match</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Jump into a quick game with other players
            </p>
            <Button 
              onClick={() => {
                setSelectedGameMode('classic');
                setSelectedActionType('live');
                setShowWaitingRoom(true);
              }}
              className="w-full"
            >
              Find Match
            </Button>
          </CardContent>
        </Card>

        {/* Custom Game */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Game</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Create a custom game with your own settings
            </p>
            <Button 
              onClick={() => {
                setSelectedGameMode('classic');
                setSelectedActionType('custom');
                setShowWaitingRoom(true);
              }}
              variant="outline" 
              className="w-full"
            >
              Create Game
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
