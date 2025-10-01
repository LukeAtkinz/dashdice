import React from 'react';

export interface PlayerBackground {
  type: 'image' | 'video';
  file: string;
}

interface BackgroundDisplayProps {
  playerName: string;
  background?: PlayerBackground;
  isMobile?: boolean;
}

const BackgroundDisplay: React.FC<BackgroundDisplayProps> = ({ 
  playerName, 
  background, 
  isMobile = false 
}) => {
  return (
    <div
      style={{
        display: 'flex',
        padding: isMobile ? '15px' : '20px',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flex: isMobile ? '0 0 55%' : '0 0 60%',
        alignSelf: 'stretch',
        borderRadius: '15px',
        position: 'relative',
        overflow: 'hidden',
        background: background?.type !== 'video' && background?.file 
          ? `url('${background.file}') center/cover no-repeat` 
          : '#332A63'
      }}
    >
      {/* Render video background if it's a video */}
      {background?.type === 'video' && (
        <video
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          webkit-playsinline="true"
          x5-playsinline="true"
          preload="metadata"
          disablePictureInPicture
          controlsList="nodownload noplaybackrate nofullscreen"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            pointerEvents: 'none',
            WebkitAppearance: 'none',
            outline: 'none'
          }}
        >
          <source src={background.file} type="video/mp4" />
        </video>
      )}
      
      {/* Bottom-left to transparent gradient overlay for readability */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '40%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />
      
      {/* Player Name in bottom left with better readability */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          color: '#FFF',
          fontFamily: 'Audiowide',
          fontSize: isMobile ? '18px' : '28px',
          fontWeight: 400,
          textTransform: 'uppercase',
          textShadow: '2px 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)',
          zIndex: 2
        }}
      >
        {playerName}
      </div>
    </div>
  );
};

export default BackgroundDisplay;