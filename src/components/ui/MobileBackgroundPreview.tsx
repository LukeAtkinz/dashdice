'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MatchPreview } from './MatchPreview';

interface MobileBackgroundPreviewProps {
  background: {
    name: string;
    preview: string;
  };
  type: 'match' | 'dashboard';
  onClose: () => void;
}

export const MobileBackgroundPreview: React.FC<MobileBackgroundPreviewProps> = ({
  background,
  type,
  onClose
}) => {
  const renderMatchPreview = () => (
    <MatchPreview 
      background={background}
      size="medium"
      className="border-white/30"
    />
  );

  const renderDashboardPreview = () => (
    <div 
      className="relative w-full h-[140px] md:h-[200px] rounded-[10px] md:rounded-[15px] overflow-hidden border border-white/30 md:border-2"
      style={{
        backgroundImage: background.preview.includes('.') 
          ? `url(${background.preview})`
          : 'none',
        backgroundColor: !background.preview.includes('.') 
          ? background.preview 
          : 'transparent',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Enhanced dashboard overlay */}
      <div className="absolute inset-0 bg-black/20">
        {/* Enhanced navigation bar */}
        <div className="absolute top-1 md:top-4 left-1 md:left-4 right-1 md:right-4 bg-black/60 rounded p-1 md:p-2 backdrop-blur-sm border border-white/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <div className="text-yellow-400 text-xs md:text-sm">👑</div>
              <div className="text-white text-xs md:text-sm font-bold">DashDice</div>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-white/70 text-xs">1,250 💰</div>
              <div className="w-4 h-4 md:w-5 md:h-5 bg-green-500 rounded-full border border-white/40"></div>
            </div>
          </div>
        </div>
        
        {/* Player stats bar */}
        <div className="absolute top-8 md:top-16 left-1 md:left-4 right-1 md:right-4 bg-black/60 rounded p-1 md:p-2 backdrop-blur-sm border border-white/20">
          <div className="flex justify-between items-center text-xs">
            <div className="text-white">Level 15</div>
            <div className="text-white">Rank: Gold</div>
            <div className="text-white">Win Rate: 78%</div>
          </div>
        </div>
        
        {/* Enhanced main dashboard cards */}
        <div className="absolute bottom-6 md:bottom-8 left-1 md:left-4 right-1 md:right-4 grid grid-cols-4 gap-1 md:gap-2">
          <div className="bg-gradient-to-br from-purple-600/80 to-purple-700/80 rounded p-1 md:p-2 backdrop-blur-sm border border-purple-400/50">
            <div className="text-white text-xs font-bold text-center">📦</div>
            <div className="text-white/70 text-xs text-center">Vault</div>
          </div>
          <div className="bg-gradient-to-br from-green-600/80 to-green-700/80 rounded p-1 md:p-2 backdrop-blur-sm border border-green-400/50">
            <div className="text-white text-xs font-bold text-center">👥</div>
            <div className="text-white/70 text-xs text-center">Friends</div>
          </div>
          <div className="bg-gradient-to-br from-blue-600/80 to-blue-700/80 rounded p-1 md:p-2 backdrop-blur-sm border border-blue-400/50">
            <div className="text-white text-xs font-bold text-center">🏆</div>
            <div className="text-white/70 text-xs text-center">Ranked</div>
          </div>
          <div className="bg-gradient-to-br from-orange-600/80 to-orange-700/80 rounded p-1 md:p-2 backdrop-blur-sm border border-orange-400/50">
            <div className="text-white text-xs font-bold text-center">🛍️</div>
            <div className="text-white/70 text-xs text-center">Shop</div>
          </div>
        </div>
        
        {/* Center play button enhanced */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg px-3 md:px-6 py-2 md:py-3 border-2 border-yellow-400 shadow-lg">
          <div className="text-center">
            <div className="text-white font-bold text-sm md:text-lg">⚡ PLAY ⚡</div>
            <div className="text-white/80 text-xs">Quick Match</div>
          </div>
        </div>
        
        {/* Activity feed */}
        <div className="absolute bottom-1 md:bottom-4 left-1 md:left-4 bg-black/60 rounded p-1 md:p-2 backdrop-blur-sm border border-white/20">
          <div className="text-white text-xs">
            <div className="text-green-400">+50 XP</div>
            <div className="text-white/70">Recent Win</div>
          </div>
        </div>
        
        {/* Notification indicator */}
        <div className="absolute bottom-1 md:bottom-4 right-1 md:right-4 bg-red-600/80 rounded p-1 md:p-2 backdrop-blur-sm border border-red-400">
          <div className="text-white text-xs font-bold">3 🔔</div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-[50rem] mb-6 p-2 md:p-4 rounded-[15px] md:rounded-[20px] bg-black/30 backdrop-blur-md border border-white/20"
    >
      <div className="text-center mb-2 md:mb-4 hidden md:block">
        <h3 className="text-xl font-bold text-white/90" style={{ fontFamily: "Audiowide" }}>
          {type === 'match' ? 'Match' : 'Dashboard'} Preview: {background.name}
        </h3>
      </div>
      
      {type === 'match' ? renderMatchPreview() : renderDashboardPreview()}
      
      <div className="text-center mt-1 md:mt-3">
        <button
          onClick={onClose}
          className="px-2 md:px-4 py-1 md:py-2 bg-white/20 rounded text-white/80 hover:bg-white/30 transition-all text-xs md:text-sm"
        >
          Close Preview
        </button>
      </div>
    </motion.div>
  );
};
