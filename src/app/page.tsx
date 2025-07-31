'use client';

import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export default function Home() {
  return (
    <Layout>
      <style jsx>{`
        @keyframes goldGlow {
          0% { 
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2);
          }
          50% { 
            text-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.6), 0 0 90px rgba(255, 215, 0, 0.4);
          }
          100% { 
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2);
          }
        }
        
        .gold-glow {
          animation: goldGlow 2s infinite;
          color: #ffd700;
        }
        
        .gold-button {
          background: linear-gradient(to right, #fbbf24, #d97706) !important;
          color: #000 !important;
          font-weight: bold !important;
          border: none !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        
        .gold-button:hover {
          background: linear-gradient(to right, #f59e0b, #b45309) !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .white-button {
          background: white;
          color: #000;
          border: 2px solid white;
          font-weight: bold;
        }
        
        .white-button:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: scale(1.05);
        }
      `}</style>
      
      <div className="space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-8 mt-12">
          <h1 className="text-4xl sm:text-6xl font-bold font-orbitron text-white">
            Who will take the <span className="gold-glow" style={{ fontFamily: "Audiowide" }}>crown</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            The ultimate multiplayer dice game experience. Compete with friends, collect items, and customize your gaming experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto gold-button" style={{ fontFamily: "Audiowide" }}>
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto white-button" style={{ fontFamily: "Audiowide" }}>
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
                <span>Vault System</span>
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

        {/* Development Roadmap */}
        <div className="space-y-10">
          <div className="text-center space-y-6">
            <h2 className="text-4xl sm:text-5xl font-bold text-center text-white" style={{ fontFamily: "Audiowide" }}>Building Together - Development Progress</h2>
            <p className="text-lg text-white/80 text-center max-w-3xl mx-auto">
              Join our community as we build Dashdice! Each milestone represents 5 meaningful changes, showing real progress and transparency in our development journey.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Version 3.5.0</span>
                  <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">Completed</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Complete foundation rebuild with enhanced UX, responsive design, professional branding, and optimized user interface consistency across all platforms.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Version 3.5.1</span>
                  <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">Completed</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Comprehensive mobile optimization, PVP matchmaking fixes, and security enhancements with timeout management and player access controls.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Version 3.5.2</span>
                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Current</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Game mode configuration updates with improved balance and automatic win detection for better gameplay experience.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Quickfire mode now targets 50 points (was 100)</li>
                  <li>• Dynamic round objectives in matchmaking service</li>
                  <li>• Auto-win detection when reaching round objective</li>
                  <li>• No banking required for automatic victory</li>
                  <li>• Enhanced game balance for faster matches</li>
                  <li>• New match statistics tracking system</li>
                  <li>• Enhanced game over screen with detailed player stats</li>
                  <li>• Comprehensive user profile stats tracking</li>
                  <li>• Win/loss streak system with automatic updates</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid md:grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Version 3.6.0</span>
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Coming Soon</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Enhanced gameplay features and community building tools for a more engaging multiplayer experience.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Advanced matchmaking system</li>
                  <li>• Real-time player interactions</li>
                  <li>• Enhanced inventory management</li>
                  <li>• Community features and social tools</li>
                  <li>• Performance optimizations</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
