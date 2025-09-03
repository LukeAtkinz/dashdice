'use client';

import React from 'react';

interface FriendCardPreviewProps {
  username?: string;
  MatchBackgroundEquip?: {
    name: string;
    file: string;
    type: 'image' | 'video';
  } | null;
  className?: string;
}

export const FriendCardPreview: React.FC<FriendCardPreviewProps> = ({
  username = 'Player',
  MatchBackgroundEquip = null,
  className = ''
}) => {
  // Handle different background types safely
  const getBackgroundStyle = (bg: any) => {
    if (!bg) return { background: '#3533CD' };
    
    // If it's from MatchBackgroundEquip (has file property)
    if ('file' in bg && bg.file) {
      return {
        backgroundImage: `url(${bg.file})`,
        backgroundColor: 'transparent',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    
    return { background: '#3533CD' };
  };

  return (
    <div className={`w-full ${className}`}>
      <div 
        className="relative w-full h-[80px] rounded-[15px] overflow-hidden border border-white/30"
        style={getBackgroundStyle(MatchBackgroundEquip)}
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
  );
};
