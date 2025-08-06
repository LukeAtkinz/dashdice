'use client';

import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { GameLobby } from '@/components/game/GameLobby';
import { Match } from '@/components/dashboard/Match';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function MatchContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');

  // If there's a roomId in the URL, show the Match component for an active game
  if (roomId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Game Match</h1>
          <p className="text-gray-600 mt-2">
            Playing in match: {roomId}
          </p>
        </div>
        <Match roomId={roomId} />
      </div>
    );
  }

  // Otherwise show the lobby for creating/joining games
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Multiplayer Match</h1>
        <p className="text-gray-600 mt-2">
          Create or join a game to play with friends!
        </p>
      </div>
      <GameLobby />
    </div>
  );
}

export default function MatchPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Suspense fallback={<div className="text-center py-8">Loading match...</div>}>
          <MatchContent />
        </Suspense>
      </Layout>
    </ProtectedRoute>
  );
}
