'use client';

import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { GameLobby } from '@/components/game/GameLobby';

export default function MatchPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Multiplayer Match</h1>
            <p className="text-gray-600 mt-2">
              Create or join a game to play with friends!
            </p>
          </div>

          <GameLobby />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
