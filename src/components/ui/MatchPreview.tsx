'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MatchPreviewProps {
  background: {
    name: string;
    preview: string;
    type?: 'image' | 'video';
  };
  className?: string;
  size?: 'small' | 'medium' | 'large';
  username?: string;
  DisplayBackgroundEquip?: {
    name: string;
    file: string;
    type: 'image' | 'video';
  } | null;
  MatchBackgroundEquip?: {
    name: string;
    file: string;
    type: 'image' | 'video';
  } | null;
  showFriendCard?: boolean;
  isDesktop?: boolean;
}

export const MatchPreview: React.FC<MatchPreviewProps> = ({
  background,
  className = '',
  size = 'medium',
  username = 'Player',
  DisplayBackgroundEquip = null,
  MatchBackgroundEquip = null,
  showFriendCard = true,
  isDesktop = false
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      container: 'w-full h-[120px]',
      playerCard: 'h-[80px]',
      score: 'text-4xl',
      name: 'text-sm',
      rarity: 'w-[100px] h-[20px] text-xs',
      dice: 'w-4 h-4 text-xs',
      diceContainer: 'min-w-[80px] w-[80px]'
    },
    medium: {
      container: 'w-full h-[200px]',
      playerCard: 'h-[140px]',
      score: 'text-6xl',
      name: 'text-lg',
      rarity: 'w-[120px] h-[24px] text-xs',
      dice: 'w-6 h-6 text-sm',
      diceContainer: 'min-w-[120px] w-[120px]'
    },
    large: {
      container: 'w-full h-[300px]',
      playerCard: 'h-[220px]',
      score: 'text-8xl',
      name: 'text-2xl',
      rarity: 'w-[140px] h-[28px] text-sm',
      dice: 'w-8 h-8 text-base',
      diceContainer: 'min-w-[160px] w-[160px]'
    }
  };

  const config = sizeConfig[size];

  // Use DisplayBackgroundEquip for container background if available, otherwise fallback to the background prop
  const containerBackground = DisplayBackgroundEquip || background;
  
  // Handle different background types safely
  const getBackgroundStyle = (bg: any) => {
    if (!bg) return {};
    
    // If it's from DisplayBackgroundEquip (has file property)
    if ('file' in bg && bg.file) {
      return {
        backgroundImage: `url(${bg.file})`,
        backgroundColor: 'transparent',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    
    // If it's from the background prop (has preview property)
    if ('preview' in bg && bg.preview) {
      return {
        backgroundImage: bg.preview.includes('.') ? `url(${bg.preview})` : 'none',
        backgroundColor: !bg.preview.includes('.') ? bg.preview : 'transparent',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    
    return {};
  };
  
  return (
    <div className={isDesktop ? "space-y-4" : ""}>
      {/* Match Preview */}
      <div 
        className={`relative ${config.container} rounded-[15px] overflow-hidden border-2 ${className}`}
        style={getBackgroundStyle(containerBackground)}
      >
        {/* Match Layout - Copying Match.tsx styling */}
        <div className="absolute inset-0 p-2 flex items-center justify-center gap-4">
          
          {/* Player 1 (Left Side) - Scaled down from Match.tsx */}
          <div className="flex-1 max-w-[35%]">
            {/* Player Name */}
            <h3 
              className={`${config.name} font-bold text-white mb-1 text-left`}
              style={{ 
                fontFamily: 'Audiowide',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
              }}
            >
              {username}
            </h3>
            
            {/* Player Card - Copying exact styling from Match.tsx */}
            <div
              className={`relative rounded-2xl overflow-hidden shadow-xl border-2 ${config.playerCard}`}
              style={{ 
                borderColor: '#00ff00', // Active player styling
              }}
            >
              {/* Player Background */}
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: MatchBackgroundEquip?.file ? `url(${MatchBackgroundEquip.file})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  background: !MatchBackgroundEquip?.file ? "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 50%, rgba(30, 41, 59, 0.9) 100%)" : undefined
                }}
              />
              
              {/* Player Score - Centered */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className={`${config.score} font-bold text-white`}
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                  }}
                >
                  15
                </div>
              </div>
            </div>
            
            {/* Background Rarity Display - Copying from Match.tsx */}
            <div 
              className={`mt-1 text-left ${config.rarity}`}
              style={{
                display: 'flex',
                height: config.rarity.split(' ')[1],
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.09)',
                backdropFilter: 'blur(5.5px)'
              }}
            >
              <span style={{
                alignSelf: 'stretch',
                color: '#FFF',
                textAlign: 'center',
                fontFamily: 'Orbitron',
                fontSize: config.rarity.includes('text-xs') ? '8px' : config.rarity.includes('text-sm') ? '10px' : '12px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '1.2',
                textTransform: 'uppercase'
              }}>
                {background.name.includes('Rare') ? 'RARE' : 
                 background.name.includes('Epic') ? 'EPIC' : 
                 background.name.includes('Legendary') ? 'LEGENDARY' : 'COMMON'}
              </span>
            </div>
          </div>

          {/* Center Dice Area - Scaled down */}
          <div className={`flex flex-col items-center justify-center relative ${config.diceContainer}`}>
            {/* Dice Display */}
            <div className="flex gap-1 mb-2">
              <div 
                className={`${config.dice} bg-gradient-to-br from-white to-gray-300 rounded border-2 border-white/40 flex items-center justify-center text-black font-bold shadow-lg`}
              >
                4
              </div>
              <div 
                className={`${config.dice} bg-gradient-to-br from-white to-gray-300 rounded border-2 border-white/40 flex items-center justify-center text-black font-bold shadow-lg`}
              >
                6
              </div>
            </div>
            
            {/* Turn Indicator */}
            <div 
              className="bg-yellow-500 text-black px-2 py-1 rounded-full font-bold animate-pulse"
              style={{ fontSize: size === 'small' ? '8px' : size === 'medium' ? '10px' : '12px' }}
            >
              YOUR TURN
            </div>
          </div>

          {/* Player 2 (Right Side) - Opponent */}
          <div className="flex-1 max-w-[35%]">
            {/* Player Name */}
            <h3 
              className={`${config.name} font-bold text-white mb-1 text-right`}
              style={{ 
                fontFamily: 'Audiowide',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
              }}
            >
              Gary
            </h3>
            
            {/* Player Card */}
            <div
              className={`relative rounded-2xl overflow-hidden shadow-xl border-2 ${config.playerCard}`}
              style={{ 
                borderColor: '#ffffff', // Inactive player styling
              }}
            >
              {/* Player Background */}
              <div 
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #CD3533 0%, #B70909 100%)"
                }}
              />
              
              {/* Player Score */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className={`${config.score} font-bold text-white`}
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                  }}
                >
                  12
                </div>
              </div>
            </div>
            
            {/* Background Rarity Display */}
            <div 
              className={`mt-1 text-left ${config.rarity}`}
              style={{
                display: 'flex',
                height: config.rarity.split(' ')[1],
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.09)',
                backdropFilter: 'blur(5.5px)'
              }}
            >
              <span style={{
                alignSelf: 'stretch',
                color: '#FFF',
                textAlign: 'center',
                fontFamily: 'Orbitron',
                fontSize: config.rarity.includes('text-xs') ? '8px' : config.rarity.includes('text-sm') ? '10px' : '12px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '1.2',
                textTransform: 'uppercase'
              }}>
                COMMON
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Friend Card Preview - Only show if enabled and not desktop */}
      {showFriendCard && !isDesktop && (
        <div className="mt-4">
          <div 
            className="relative w-full h-[80px] rounded-[15px] overflow-hidden border border-white/30"
            style={getBackgroundStyle(MatchBackgroundEquip || { preview: '#3533CD' })}
          >
            {/* Dark overlay for text readability */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)',
                borderRadius: '15px',
                zIndex: 1
              }}
            ></div>
            
            <div className="relative z-10 p-4 flex items-center gap-3 h-full">
              {/* Profile Picture */}
              <div className="relative">
                <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center text-black font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-800"></div>
              </div>
              
              {/* Friend Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold font-audiowide truncate text-sm">
                  {username}
                </h3>
                <p className="text-white/80 text-xs font-montserrat">Online</p>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-pink-600 hover:bg-pink-700"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textTransform: 'uppercase'
                  }}
                >
                  INVITE
                </button>
                <button
                  className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-pink-600 hover:bg-pink-700"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textTransform: 'uppercase'
                  }}
                >
                  CHAT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
