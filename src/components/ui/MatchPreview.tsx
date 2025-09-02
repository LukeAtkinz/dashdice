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
}

export const MatchPreview: React.FC<MatchPreviewProps> = ({
  background,
  className = '',
  size = 'medium'
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      container: 'w-full h-[120px]',
      playerCard: 'h-[80px]',
      score: 'text-4xl',
      name: 'text-sm',
      rarity: 'w-[120px] h-[28px] text-xs',
      dice: 'w-4 h-4 text-xs',
      diceContainer: 'min-w-[80px] w-[80px]'
    },
    medium: {
      container: 'w-full h-[200px]',
      playerCard: 'h-[140px]',
      score: 'text-6xl',
      name: 'text-lg',
      rarity: 'w-[150px] h-[35px] text-sm',
      dice: 'w-6 h-6 text-sm',
      diceContainer: 'min-w-[120px] w-[120px]'
    },
    large: {
      container: 'w-full h-[300px]',
      playerCard: 'h-[220px]',
      score: 'text-8xl',
      name: 'text-2xl',
      rarity: 'w-[180px] h-[42px] text-base',
      dice: 'w-8 h-8 text-base',
      diceContainer: 'min-w-[160px] w-[160px]'
    }
  };

  const config = sizeConfig[size];

  return (
    <div 
      className={`relative ${config.container} rounded-[15px] overflow-hidden border-2 ${className}`}
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
            You
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
                background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
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
              fontSize: config.rarity.includes('text-xs') ? '10px' : config.rarity.includes('text-sm') ? '12px' : '14px',
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
            Opponent
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
              fontSize: config.rarity.includes('text-xs') ? '10px' : config.rarity.includes('text-sm') ? '12px' : '14px',
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
  );
};
