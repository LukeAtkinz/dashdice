'use client';

import React, { useState } from 'react';

interface VideoPlayerProps {
  src: string; // Base path without extension (e.g., '/backgrounds/New Day')
  transparent?: boolean; // true = WebM+MOV (alpha), false = MP4+WebM (opaque)
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  transparent = false,
  autoPlay = false,
  loop = false,
  muted = true,
  playsInline = true,
  className = '',
  style = {},
  onEnded
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Handle video errors - ignore false network loading states
  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const error = video.error;
    
    // Ignore network loading state errors (code 2)
    if (error && error.code === 2) {
      console.log('⏳ Video loading in progress (ignoring error code 2)');
      return;
    }
    
    console.error('❌ Video error:', {
      code: error?.code,
      message: error?.message,
      src: video.currentSrc
    });
    setHasError(true);
  };

  // Handle when video can start playing
  const handleCanPlay = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  if (hasError) {
    return null; // Silent fail - don't show broken video
  }

  return (
    <video
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        ...style
      }}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      preload="auto"
      onError={handleError}
      onCanPlay={handleCanPlay}
      onEnded={onEnded}
    >
      {transparent ? (
        <>
          {/* Transparent video formats - WebM VP8 alpha (all modern browsers support) */}
          <source src={`${src}.webm`} type="video/webm" />
        </>
      ) : (
        <>
          {/* Opaque video formats - MP4 H.264 first (Safari), WebM VP8 second (Chrome/Firefox) */}
          <source src={`${src}.mp4`} type="video/mp4" />
          <source src={`${src}.webm`} type="video/webm" />
        </>
      )}
    </video>
  );
};
