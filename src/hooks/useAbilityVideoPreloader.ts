'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * Preload ability animation videos for instant playback
 * Loads videos into memory when component mounts
 */

interface AbilityVideo {
  id: string;
  webmPath: string;
  mp4Path?: string;
  movPath?: string;
}

const ABILITY_VIDEOS: AbilityVideo[] = [
  {
    id: 'luck_turner',
    webmPath: '/Abilities/Animations/Luck Turner/Luck Turner Animation.webm',
    mp4Path: '/Abilities/Animations/Luck Turner/Luck Turner Animation.mp4'
  },
  {
    id: 'pan_slap',
    webmPath: '/Abilities/Animations/Pan Slap.webm',
    mp4Path: '/Abilities/Animations/Pan Slap.mp4'
  },
  {
    id: 'hard_hat_initial',
    webmPath: '/Abilities/Animations/Hard Hat/Hard Hat Initial.webm',
    mp4Path: '/Abilities/Animations/Hard Hat/Hard Hat Initial.mp4'
  },
  {
    id: 'hard_hat_used',
    webmPath: '/Abilities/Animations/Hard Hat/Hard Hat Used.webm',
    mp4Path: '/Abilities/Animations/Hard Hat/Hard Hat Used.mp4'
  },
  {
    id: 'vital_rush_top',
    webmPath: '/Abilities/Animations/Vital Rush/Vital Rush Top Dice Container.webm',
    mp4Path: '/Abilities/Animations/Vital Rush/Vital Rush Top Dice Container.mp4'
  },
  {
    id: 'vital_rush_bottom',
    webmPath: '/Abilities/Animations/Vital Rush/Vital Rush Bottom Dice Container.webm',
    mp4Path: '/Abilities/Animations/Vital Rush/Vital Rush Bottom Dice Container.mp4'
  },
  {
    id: 'aura_forge_turn',
    webmPath: '/Abilities/Animations/Aura Forge/Aura Forge Turn Score.webm',
    mp4Path: '/Abilities/Animations/Aura Forge/Aura Forge Turn Score.mp4'
  },
  {
    id: 'aura_forge_aura',
    webmPath: '/Abilities/Animations/Aura Forge/Aura Forge Aura.webm',
    mp4Path: '/Abilities/Animations/Aura Forge/Aura Forge Aura.mp4'
  },
  {
    id: 'aura_forge_bottom',
    webmPath: '/Abilities/Animations/Aura Forge/Aura Forge Bottom.webm',
    mp4Path: '/Abilities/Animations/Aura Forge/Aura Forge Bottom.mp4'
  }
];

export const useAbilityVideoPreloader = () => {
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const videoCacheRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    const preloadVideo = (video: AbilityVideo): Promise<string> => {
      return new Promise((resolve) => {
        const videoElement = document.createElement('video');
        videoElement.preload = 'auto';
        videoElement.muted = true;
        videoElement.playsInline = true;
        
        // Detect browser support
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                         /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        // Try WebM first (best compression and alpha channel support)
        const primarySource = video.webmPath;
        const fallbackSource = isSafari && video.movPath ? video.movPath : video.mp4Path;
        
        let loadAttempted = false;
        
        const handleCanPlayThrough = () => {
          console.log(`✅ Preloaded ability video: ${video.id}`);
          videoCacheRef.current.set(video.id, videoElement);
          setLoadedVideos(prev => new Set([...prev, video.id]));
          resolve(video.id);
        };
        
        const handleError = () => {
          if (!loadAttempted && fallbackSource) {
            console.log(`⚠️ WebM failed for ${video.id}, trying fallback...`);
            loadAttempted = true;
            videoElement.src = fallbackSource;
            videoElement.load();
          } else {
            console.error(`❌ Failed to preload video: ${video.id}`);
            resolve(video.id); // Resolve anyway to not block other videos
          }
        };
        
        videoElement.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
        videoElement.addEventListener('error', handleError);
        
        // Start loading
        videoElement.src = primarySource;
        videoElement.load();
        
        // Timeout fallback
        setTimeout(() => {
          if (!videoCacheRef.current.has(video.id)) {
            console.warn(`⏱️ Timeout preloading ${video.id}, continuing anyway`);
            resolve(video.id);
          }
        }, 10000); // 10 second timeout per video
      });
    };

    const preloadAllVideos = async () => {
      console.log('🎬 Starting ability video preload...');
      setIsLoading(true);
      
      // Preload all videos in parallel
      await Promise.all(ABILITY_VIDEOS.map(preloadVideo));
      
      console.log('✅ All ability videos preloaded');
      setIsLoading(false);
    };

    preloadAllVideos();

    // Cleanup
    return () => {
      videoCacheRef.current.forEach(video => {
        video.src = '';
        video.load();
      });
      videoCacheRef.current.clear();
    };
  }, []);

  const getVideoSrc = (abilityId: string): string | null => {
    const video = ABILITY_VIDEOS.find(v => v.id === abilityId);
    if (!video) return null;
    
    // Detect Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                     /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Return appropriate format
    if (isSafari && video.movPath) return video.movPath;
    if (isSafari && video.mp4Path) return video.mp4Path;
    return video.webmPath;
  };

  const isVideoLoaded = (abilityId: string): boolean => {
    return loadedVideos.has(abilityId);
  };

  return {
    isLoading,
    loadedVideos,
    getVideoSrc,
    isVideoLoaded,
    videoCache: videoCacheRef.current,
  };
};
