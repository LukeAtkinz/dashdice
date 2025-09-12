'use client';

import React from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { GoBackendAdapter } from '@/services/goBackendAdapter';

interface AlreadyInMatchNotificationProps {
  gameMode: string;
  currentGame: string;
  userId: string;
  onClose: () => void;
  onJoin?: () => void;
}

export const AlreadyInMatchNotification: React.FC<AlreadyInMatchNotificationProps> = ({
  gameMode,
  currentGame,
  userId,
  onClose,
  onJoin
}) => {
  const { setCurrentSection } = useNavigation();

  const handleJoinMatch = () => {
    console.log(`🎮 Rejoining ${gameMode} match: ${currentGame}`);
    
    if (onJoin) {
      onJoin();
    } else {
      // Default action: navigate to the match
      setCurrentSection('match', { matchId: currentGame, gameMode });
    }
    
    onClose();
  };

  const handleLeaveMatch = async () => {
    console.log(`🏃‍♂️ Force leaving ${gameMode} match: ${currentGame}`);
    
    try {
      const result = await GoBackendAdapter.forceLeaveMatch(userId);
      
      if (result.success) {
        console.log('✅ Successfully left match');
      } else {
        console.error('❌ Failed to leave match:', result.message);
      }
    } catch (error) {
      console.error('❌ Error leaving match:', error);
    }
    
    onClose();
  };

  const gameModeName = gameMode.charAt(0).toUpperCase() + gameMode.slice(1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-600">
        <div className="text-center">
          <div className="mb-4">
            <div className="text-4xl mb-2">⚠️</div>
            <h3 className="text-xl font-bold text-white mb-2">
              Already in Match
            </h3>
            <p className="text-gray-300 text-sm">
              You are already in a <span className="font-semibold text-blue-400">{gameModeName}</span> match
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleJoinMatch}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
            >
              JOIN
            </button>
            <button
              onClick={handleLeaveMatch}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
            >
              LEAVE
            </button>
          </div>

          <button
            onClick={onClose}
            className="mt-3 w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
          >
            Cancel
          </button>

          <p className="text-xs text-gray-400 mt-3">
            Leaving will count as a loss and reset your streak
          </p>
        </div>
      </div>
    </div>
  );
};
