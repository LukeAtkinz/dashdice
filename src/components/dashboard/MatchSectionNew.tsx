'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-transition to waiting room if we have initial params
  useEffect(() => {
    if (initialGameMode && initialActionType && !showWaitingRoom) {
      setIsTransitioning(true);
      // Add a delay for smooth transition effect
      setTimeout(() => {
        setShowWaitingRoom(true);
        setIsTransitioning(false);
      }, 1200);
    }
  }, [initialGameMode, initialActionType]); // Removed showWaitingRoom from dependencies to prevent retrigger

  const handleBackFromWaitingRoom = () => {
    console.log('🔙 MatchSectionNew: Handling back from waiting room');
    setIsTransitioning(true);
    
    // Clear the state to prevent re-triggering
    setSelectedGameMode('classic');
    setSelectedActionType('live');
    
    setTimeout(() => {
      setShowWaitingRoom(false);
      setIsTransitioning(false);
      console.log('✅ MatchSectionNew: Returned to dashboard with smooth animation');
      setCurrentSection('dashboard', {}); // Explicitly clear params
    }, 300); // Reduced from 800ms to 300ms for quicker transition
  };

  const handleStartGame = (gameMode: string, actionType: 'live' | 'custom') => {
    setSelectedGameMode(gameMode);
    setSelectedActionType(actionType);
    setIsTransitioning(true);
    setTimeout(() => {
      setShowWaitingRoom(true);
      setIsTransitioning(false);
    }, 1200);
  };

  // Simple fade transition animation matching SinglePageDashboard
  const fadeVariants = {
    enter: {
      opacity: 0,
      y: 20
    },
    center: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3
      }
    }
  };

  const overlayVariants = {
    enter: {
      opacity: 0
    },
    center: {
      opacity: 1,
      transition: {
        duration: 0.4
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.4
      }
    }
  };

  // Simple transition overlay
  if (isTransitioning) {
    return (
      <motion.div 
        className="w-full h-full flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: "rgba(0, 0, 0, 0.8)"
        }}
      >
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-2xl text-white font-audiowide">
            Transitioning...
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // If we should show waiting room, render it with animation
  if (showWaitingRoom) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="waiting-room"
          variants={fadeVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="w-full h-full relative"
          style={{ 
            perspective: "1200px",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 25
          }}
        >
          <motion.div
            variants={overlayVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-transparent to-blue-900/30 z-0"
          />
          <div className="relative z-10 w-full h-full">
            <GameWaitingRoom 
              gameMode={selectedGameMode}
              actionType={selectedActionType}
              onBack={handleBackFromWaitingRoom}
            />
          </div>
        </motion.div>
      </AnimatePresence>
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
