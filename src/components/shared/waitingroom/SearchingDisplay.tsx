import React, { useState, useEffect } from 'react';

interface SearchingDisplayProps {
  isSearching: boolean;
  searchText?: string;
  showBotCountdown?: boolean;
  botCountdown?: number | null;
  friendInviteReady?: boolean;
  isMobile?: boolean;
}

const SearchingDisplay: React.FC<SearchingDisplayProps> = ({ 
  isSearching, 
  searchText,
  showBotCountdown = false,
  botCountdown = null,
  friendInviteReady = false,
  isMobile = false 
}) => {
  const [animatedText, setAnimatedText] = useState('Searching for Opponent');

  useEffect(() => {
    if (!isSearching) return;

    const baseText = searchText || 'Searching for Opponent';
    const interval = setInterval(() => {
      setAnimatedText(prev => {
        const dots = (prev.match(/\./g) || []).length;
        if (dots >= 3) {
          return baseText;
        }
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isSearching, searchText]);

  if (!isSearching) {
    return null;
  }

  return (
    <div
      style={{
        color: '#E2E2E2',
        textAlign: 'center',
        fontFamily: 'Audiowide',
        fontSize: isMobile ? '20px' : '48px',
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: isMobile ? '24px' : '56px',
        textTransform: 'uppercase',
        flex: isMobile ? 'none' : '1 0 0',
        width: isMobile ? '100%' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '10px',
        order: isMobile ? 2 : 0,
        padding: isMobile ? '20px' : '0',
        borderRadius: isMobile ? '20px' : '0',
        border: isMobile ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        background: 'transparent'
      }}
    >
      {animatedText}
      
      {/* Bot Countdown Timer */}
      {showBotCountdown && botCountdown !== null && (
        <div
          style={{
            color: '#FFB347',
            fontFamily: 'Audiowide',
            fontSize: isMobile ? '16px' : '20px',
            fontWeight: 400,
            textAlign: 'center',
            marginTop: '15px',
            padding: '12px 20px',
            borderRadius: '12px',
            background: 'rgba(255, 179, 71, 0.1)',
            border: '1px solid rgba(255, 179, 71, 0.3)',
            textTransform: 'uppercase',
            animation: 'pulse 1s ease-in-out infinite'
          }}
        >
          AI Opponent in {botCountdown}s
        </div>
      )}
      
      {/* Friend Invitation Auto-Ready Status */}
      {friendInviteReady && (
        <div
          style={{
            color: '#00FF80',
            fontFamily: 'Audiowide',
            fontSize: isMobile ? '14px' : '24px',
            fontWeight: 400,
            textAlign: 'center',
            marginTop: '10px',
            padding: '10px 20px',
            borderRadius: '12px',
            background: 'rgba(0, 255, 128, 0.1)',
            border: '1px solid rgba(0, 255, 128, 0.3)',
            textTransform: 'uppercase',
            animation: 'glow 2s ease-in-out infinite alternate'
          }}
        >
          Both Players Ready - Starting Soon!
        </div>
      )}
    </div>
  );
};

export default SearchingDisplay;