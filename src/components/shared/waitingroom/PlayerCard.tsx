import React from 'react';

export interface PlayerStats {
  matchWins: number;
  gamesPlayed: number;
  bestStreak: number;
  currentStreak: number;
}

interface PlayerCardProps {
  stats: PlayerStats;
  isOpponent?: boolean;
  isMobile?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ 
  stats, 
  isOpponent = false, 
  isMobile = false 
}) => {
  return (
    <div
      style={{
        display: 'grid',
        rowGap: isMobile ? '8px' : '10px',
        columnGap: isMobile ? '8px' : '10px',
        maxWidth: isMobile ? '95vw' : '500px',
        flex: '1 0 0',
        alignSelf: 'stretch',
        gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
      }}
    >
      {/* Match Wins */}
      <div style={{ 
        display: 'flex', 
        padding: isMobile ? '2px 10px' : '4px 20px', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '10px', 
        flex: '1 0 0', 
        alignSelf: 'stretch', 
        gridRow: '1 / span 1', 
        gridColumn: '1 / span 1', 
        borderRadius: '18px', 
        background: 'rgba(87, 78, 120, 0.3)', 
        backdropFilter: 'blur(20px)' 
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: isMobile ? '4px' : '8px' }}>
          <div style={{ 
            color: '#E2E2E2', 
            textAlign: 'center', 
            fontFamily: 'Audiowide', 
            fontSize: isMobile ? '24px' : '48px', 
            fontStyle: 'normal', 
            fontWeight: 400, 
            lineHeight: isMobile ? '24px' : '48px', 
            textTransform: 'uppercase' 
          }}>
            {stats.matchWins}
          </div>
          <div style={{ 
            color: '#E2E2E2', 
            textAlign: 'center', 
            fontFamily: 'Audiowide', 
            fontSize: isMobile ? '8px' : '11px', 
            fontStyle: 'normal', 
            fontWeight: 400, 
            lineHeight: isMobile ? '12px' : '16px', 
            textTransform: 'uppercase',
            opacity: 0.8
          }}>
            Match Wins
          </div>
        </div>
      </div>

      {/* Games Played */}
      <div style={{ 
        display: 'flex', 
        padding: isMobile ? '2px 10px' : '4px 20px', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '10px', 
        flex: '1 0 0', 
        alignSelf: 'stretch', 
        gridRow: '1 / span 1', 
        gridColumn: '2 / span 1', 
        borderRadius: '18px', 
        background: 'rgba(100, 151, 200, 0.3)', 
        backdropFilter: 'blur(20px)' 
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: isMobile ? '4px' : '8px' }}>
          <div style={{ 
            color: '#E2E2E2', 
            textAlign: 'center', 
            fontFamily: 'Audiowide', 
            fontSize: isMobile ? '24px' : '48px', 
            fontStyle: 'normal', 
            fontWeight: 400, 
            lineHeight: isMobile ? '24px' : '48px', 
            textTransform: 'uppercase' 
          }}>
            {stats.gamesPlayed}
          </div>
          <div style={{ 
            color: '#E2E2E2', 
            textAlign: 'center', 
            fontFamily: 'Audiowide', 
            fontSize: isMobile ? '8px' : '11px', 
            fontStyle: 'normal', 
            fontWeight: 400, 
            lineHeight: isMobile ? '12px' : '16px', 
            textTransform: 'uppercase',
            opacity: 0.8
          }}>
            Games Played
          </div>
        </div>
      </div>

      {/* Best Streak */}
      <div style={{ 
        display: 'flex', 
        padding: isMobile ? '2px 10px' : '4px 20px', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '10px', 
        flex: '1 0 0', 
        alignSelf: 'stretch', 
        gridRow: '2 / span 1', 
        gridColumn: '1 / span 1', 
        borderRadius: '18px', 
        background: 'rgba(58, 87, 165, 0.3)', 
        backdropFilter: 'blur(20px)' 
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: isMobile ? '4px' : '8px' }}>
          <div style={{ 
            color: '#E2E2E2', 
            textAlign: 'center', 
            fontFamily: 'Audiowide', 
            fontSize: isMobile ? '24px' : '48px', 
            fontStyle: 'normal', 
            fontWeight: 400, 
            lineHeight: isMobile ? '24px' : '48px', 
            textTransform: 'uppercase' 
          }}>
            {stats.bestStreak}
          </div>
          <div style={{ 
            color: '#E2E2E2', 
            textAlign: 'center', 
            fontFamily: 'Audiowide', 
            fontSize: isMobile ? '8px' : '11px', 
            fontStyle: 'normal', 
            fontWeight: 400, 
            lineHeight: isMobile ? '12px' : '16px', 
            textTransform: 'uppercase',
            opacity: 0.8
          }}>
            Best Streak
          </div>
        </div>
      </div>

      {/* Current Streak */}
      <div style={{ 
        display: 'flex', 
        padding: isMobile ? '2px 10px' : '4px 20px', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '10px', 
        flex: '1 0 0', 
        alignSelf: 'stretch', 
        gridRow: '2 / span 1', 
        gridColumn: '2 / span 1', 
        borderRadius: '18px', 
        background: 'rgba(171, 112, 118, 0.3)', 
        backdropFilter: 'blur(20px)' 
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: isMobile ? '4px' : '8px' }}>
          <div style={{ 
            color: '#E2E2E2', 
            textAlign: 'center', 
            fontFamily: 'Audiowide', 
            fontSize: isMobile ? '24px' : '48px', 
            fontStyle: 'normal', 
            fontWeight: 400, 
            lineHeight: isMobile ? '24px' : '48px', 
            textTransform: 'uppercase' 
          }}>
            {stats.currentStreak}
          </div>
          <div style={{ 
            color: '#E2E2E2', 
            textAlign: 'center', 
            fontFamily: 'Audiowide', 
            fontSize: isMobile ? '8px' : '11px', 
            fontStyle: 'normal', 
            fontWeight: 400, 
            lineHeight: isMobile ? '12px' : '16px', 
            textTransform: 'uppercase',
            opacity: 0.8
          }}>
            Current Streak
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;