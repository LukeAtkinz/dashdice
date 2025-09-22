/**
 * Matchmaking Debug Test Page
 */

import { Layout } from "@/components/layout/Layout";
import MatchmakingTester from "@/components/MatchmakingTester";

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
