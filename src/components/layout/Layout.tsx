import React from 'react';
import { Navigation } from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative">{/* Removed overflow-hidden to allow scrolling */}
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        webkit-playsinline="true"
        x5-playsinline="true"
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/backgrounds/New Day.mp4" type="video/mp4" />
      </video>
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 z-10" />
      
      {/* Content */}
      <div className="relative z-20 min-h-screen flex flex-col">
        <div className="hidden md:block">
          <Navigation />
        </div>
        <main className="flex-1 max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};
