/**
 * Matchmaking Debug Test Page
 */

'use client';

import { Layout } from "@/components/layout/Layout";
import dynamic from 'next/dynamic';

// Dynamically import the MatchmakingTester to prevent SSR issues
const MatchmakingTester = dynamic(() => import('@/components/MatchmakingTester'), {
  ssr: false,
  loading: () => <div className="text-white text-center">Loading debug tools...</div>
});

export default function MatchmakingTestPage() {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          Matchmaking System Debug
        </h1>
        <MatchmakingTester />
      </div>
    </Layout>
  );
}
