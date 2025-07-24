import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FirebaseConnectionTest } from "@/components/ui/FirebaseConnectionTest";
import { FontDemo } from "@/components/ui/FontDemo";

export default function Home() {
  return (
    <Layout>
      <div className="space-y-12">
        {/* Firebase Connection Test */}
        <FirebaseConnectionTest />
        
        {/* Font and Background Demo */}
        <FontDemo />

        {/* Hero Section */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl sm:text-6xl font-bold font-orbitron text-gray-900">
            Welcome to <span className="text-blue-600">DashDice</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The ultimate multiplayer dice game experience. Compete with friends, collect items, and customize your gaming experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-2xl">🎲</span>
                <span>Multiplayer Gaming</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Challenge friends or play with players worldwide in real-time multiplayer matches.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-2xl">🎒</span>
                <span>Inventory System</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Collect dice, backgrounds, and special effects. Customize your gaming experience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-2xl">🏆</span>
                <span>Competitive Play</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Climb the leaderboards in ranked matches and tournament modes.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Game Modes */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center text-gray-900">Game Modes</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ranked Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Compete in competitive matches to climb the global leaderboard and earn exclusive rewards.
                </p>
                <Button variant="outline" size="sm">
                  Learn More
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Casual Play</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Relax with friends in casual matches. Perfect for learning the game or having fun.
                </p>
                <Button variant="outline" size="sm">
                  Learn More
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
