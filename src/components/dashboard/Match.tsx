'use client';

import React from 'react';

interface MatchProps {
  gameMode?: string;
  roomId?: string;
}

export const Match: React.FC<MatchProps> = ({ gameMode, roomId }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">Hello World</h1>
        {gameMode && (
          <p className="text-xl text-gray-300 mb-2">Game Mode: {gameMode}</p>
        )}
        {roomId && (
          <p className="text-lg text-gray-400">Room ID: {roomId}</p>
        )}
        <div className="mt-8 text-gray-300">
          <p>Match component is working!</p>
          <p>Ready for game logic implementation.</p>
        </div>
      </div>
    </div>
  );
};
