'use client';

import dynamic from 'next/dynamic';
import { Suspense, ReactNode } from 'react';
import React from 'react';

// Loading component with better styling
const LoadingSpinner = ({ text = 'Loading...' }: { text?: string }) => (
  <div className="flex items-center justify-center min-h-[200px] bg-black/50 rounded-lg">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-yellow-400 text-sm">{text}</p>
    </div>
  </div>
);

// Game components (lazy loaded)
export const LazyGameModeSelector = dynamic(
  () => import('./game/GameModeSelector'),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading game modes..." />,
  }
);

export const LazyVideoTransition = dynamic(
  () => import('./transitions/VideoTransition').then(mod => ({ default: mod.VideoTransition })),
  {
    ssr: false,
    loading: () => <div className="bg-black/50 rounded-lg min-h-[300px]" />,
  }
);

export const LazyMatch = dynamic(
  () => import('./game/Match').then(mod => ({ default: mod.Match })),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading game..." />,
  }
);

// Chat components (lazy loaded)
export const LazyChatWindow = dynamic(
  () => import('./chat/ChatWindow'),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading chat..." />,
  }
);

// Leaderboard components (lazy loaded) 
export const LazySoftRankedLeaderboard = dynamic(
  () => import('./ranked/SoftRankedLeaderboard').then(mod => ({ default: mod.SoftRankedLeaderboard })),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading ranked leaderboard..." />,
  }
);