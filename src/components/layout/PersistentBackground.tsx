'use client';

import React, { useEffect, useRef } from 'react';

interface PersistentBackgroundProps {
  children: React.ReactNode;
}

export const PersistentBackground: React.FC<PersistentBackgroundProps> = ({ children }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Ensure video continues playing across page changes
    const video = videoRef.current;
    if (video) {
      video.play().catch(console.error);
    }
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Persistent Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        webkit-playsinline="true"
        className="fixed inset-0 w-full h-full object-cover"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: -2
        }}
      >
        <source src="/backgrounds/New Day.mp4" type="video/mp4" />
      </video>
      
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-black/50" style={{ zIndex: -1 }} />
      
      {/* Content Container */}
      <div className="relative z-0 min-h-screen">
        {children}
      </div>
    </div>
  );
};