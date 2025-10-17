'use client';

import { useState, useEffect } from 'react';

export interface BackgroundPosition {
  objectPosition: string;
  className: string;
}

export const useBackgroundPositioning = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [backgroundPosition, setBackgroundPosition] = useState<string>('center');

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const getBackgroundPosition = (backgroundName: string): BackgroundPosition => {
    if (!isMobile) {
      return {
        objectPosition: 'center center',
        className: ''
      };
    }

    const name = backgroundName.toLowerCase();
    
    // Define mobile positioning based on background content
    if (name.includes('underwater')) {
      return {
        objectPosition: '30% center',
        className: 'mobile-bg-underwater'
      };
    }
    
    if (name.includes('mission')) {
      return {
        objectPosition: '90% center', // Right side positioning for mobile
        className: 'mobile-bg-mission'
      };
    }
    
    if (name.includes('long road ahead')) {
      return {
        objectPosition: '90% center', // Right side positioning for mobile
        className: 'mobile-bg-longroad'
      };
    }

    if (name.includes('as they fall')) {
      return {
        objectPosition: 'center center', // Center positioning for mobile
        className: 'mobile-bg-astheyfall'
      };
    }

    if (name.includes('end of the dragon')) {
      return {
        objectPosition: 'center center', // Center positioning for mobile
        className: 'mobile-bg-endofdragon'
      };
    }
    
    if (name.includes('new day')) {
      return {
        objectPosition: 'center center',
        className: 'mobile-bg-newday'
      };
    }

    // Default mobile positioning - shift left to show content area
    return {
      objectPosition: backgroundPosition === 'left' ? '10% center' : 
                     backgroundPosition === 'right' ? '90% center' :
                     '25% center',
      className: backgroundPosition === 'left' ? 'mobile-bg-left' :
                backgroundPosition === 'right' ? 'mobile-bg-right' :
                'mobile-background-video'
    };
  };

  const setMobilePosition = (position: 'left' | 'center' | 'right') => {
    setBackgroundPosition(position);
  };

  return {
    isMobile,
    getBackgroundPosition,
    setMobilePosition,
    currentPosition: backgroundPosition
  };
};
