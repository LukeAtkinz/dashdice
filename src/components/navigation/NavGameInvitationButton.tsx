'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameInvitation } from '@/types/friends';
import { useFriends } from '@/context/FriendsContext';
import { useNavigation } from '@/context/NavigationContext';

interface NavGameInvitationButtonProps {
  invitation: GameInvitation;
  onAccept: (invitationId: string) => Promise<void>;
  onDecline: (invitationId: string) => Promise<void>;
  isProcessing: boolean;
}

export const NavGameInvitationButton: React.FC<NavGameInvitationButtonProps> = ({
  invitation,
  onAccept,
  onDecline,
  isProcessing
}) => {
  const [buttonsClickable, setButtonsClickable] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Enable buttons after 0.5s delay to prevent misclicks
  useEffect(() => {
    const timer = setTimeout(() => {
      setButtonsClickable(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Update time remaining
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expiry = invitation.expiresAt.toDate();
      const diffMs = expiry.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      if (diffMs <= 0) {
        setTimeRemaining('Expired');
        return;
      }
      if (diffMinutes > 0) {
        setTimeRemaining(`${diffMinutes}m ${diffSeconds}s`);
      } else {
        setTimeRemaining(`${diffSeconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [invitation.expiresAt]);

  const getGameModeIcon = (gameMode: string) => {
    switch (gameMode) {
      case 'classic':
        return '/Design Elements/Match/Dice/DiceAnimationFrames/Dice-1-1.webp';
      case 'zero-hour':
        return '/Design Elements/Match/Dice/DiceAnimationFrames/Dice-6-6.webp';
      case 'true-grit':
        return '/Design Elements/Match/Dice/DiceAnimationFrames/Dice-2-2.webp';
      case 'last-line':
        return '/Design Elements/Match/Dice/DiceAnimationFrames/Dice-3-3.webp';
      default:
        return '/Design Elements/Match/Dice/DiceAnimationFrames/Dice-1-1.webp';
    }
  };

  const getGameModeDisplayName = (gameMode: string) => {
    switch (gameMode) {
      case 'classic': return 'Classic';
      case 'zero-hour': return 'Zero Hour';
      case 'true-grit': return 'True Grit';
      case 'last-line': return 'Last Line';
      default: return gameMode;
    }
  };

  const handleAccept = async () => {
    if (!buttonsClickable || isProcessing) return;
    await onAccept(invitation.id);
  };

  const handleDecline = async () => {
    if (!buttonsClickable || isProcessing) return;
    await onDecline(invitation.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center gap-4 px-6 py-4"
    >
      {/* Invitation Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-center"
      >
        <p 
          className="text-white text-lg md:text-xl font-bold mb-2"
          style={{ fontFamily: "Audiowide" }}
        >
          {invitation.fromDisplayName} wants to play
        </p>
        <div className="flex items-center justify-center gap-3">
          <img
            src={getGameModeIcon(invitation.gameMode)}
            alt={invitation.gameMode}
            className="w-8 h-8"
          />
          <span 
            className="text-yellow-400 text-lg font-bold"
            style={{ fontFamily: "Audiowide" }}
          >
            {getGameModeDisplayName(invitation.gameMode)}
          </span>
        </div>
        <p className="text-gray-300 text-sm mt-1">
          Expires in: {timeRemaining}
        </p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="flex gap-4"
      >
        {/* Accept Button */}
        <button
          onClick={handleAccept}
          disabled={!buttonsClickable || isProcessing}
          className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
            buttonsClickable && !isProcessing
              ? 'text-white hover:scale-105 active:scale-95 cursor-pointer'
              : 'opacity-50 cursor-not-allowed'
          }`}
          style={{
            fontFamily: "Audiowide",
            background: buttonsClickable && !isProcessing
              ? "transparent"
              : "#666666",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            backdropFilter: "blur(6px)",
            boxShadow: buttonsClickable && !isProcessing 
              ? "0 4px 8px rgba(255, 215, 0, 0.3)" 
              : "none"
          }}
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>ACCEPT</span>
          )}
        </button>

        {/* Decline Button */}
        <button
          onClick={handleDecline}
          disabled={!buttonsClickable || isProcessing}
          className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
            buttonsClickable && !isProcessing
              ? 'text-white hover:scale-105 active:scale-95 cursor-pointer'
              : 'opacity-50 cursor-not-allowed'
          }`}
          style={{
            fontFamily: "Audiowide",
            background: buttonsClickable && !isProcessing
              ? "transparent"
              : "#666666",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            backdropFilter: "blur(6px)",
            boxShadow: buttonsClickable && !isProcessing 
              ? "0 4px 8px rgba(255, 215, 0, 0.3)" 
              : "none"
          }}
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>DECLINE</span>
          )}
        </button>
      </motion.div>

      {/* Safety indicator */}
      {!buttonsClickable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-xs text-gray-400 text-center"
        >
          Buttons available in {Math.ceil((500) / 1000)}s...
        </motion.div>
      )}
    </motion.div>
  );
};