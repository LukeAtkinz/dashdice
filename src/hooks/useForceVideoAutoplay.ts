'use client';

import { useEffect } from 'react';

/**
 * Global hook to force video autoplay on mobile devices
 * This adds multiple fallback mechanisms to ensure videos play
 * even on strict mobile browsers like Chrome Android
 */
export const useForceVideoAutoplay = () => {
  useEffect(() => {
    // Function to attempt playing a video with multiple retry strategies
    const attemptPlay = (video: HTMLVideoElement, retries = 3) => {
      if (!video) return;
      
      // Ensure video is always muted
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x5-playsinline', 'true');
      
      // Remove controls if present
      video.removeAttribute('controls');
      
      // Try to play
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log(`Video autoplay blocked (attempt ${4 - retries}/3):`, error.message);
          
          // Retry with exponential backoff
          if (retries > 0) {
            setTimeout(() => attemptPlay(video, retries - 1), 500 * (4 - retries));
          }
        });
      }
    };
    
    // Find all background videos
    const processVideos = () => {
      const videos = document.querySelectorAll<HTMLVideoElement>('video');
      
      videos.forEach((video) => {
        // Set attributes directly on DOM element
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x5-playsinline', 'true');
        video.removeAttribute('controls');
        
        // Attempt play immediately
        attemptPlay(video);
        
        // Add event listeners to force play
        video.addEventListener('loadedmetadata', () => attemptPlay(video));
        video.addEventListener('loadeddata', () => attemptPlay(video));
        video.addEventListener('canplay', () => attemptPlay(video));
        video.addEventListener('pause', () => {
          setTimeout(() => attemptPlay(video), 100);
        });
        video.addEventListener('suspend', () => {
          setTimeout(() => attemptPlay(video), 100);
        });
      });
    };
    
    // Process videos immediately
    processVideos();
    
    // Process videos after DOM is fully loaded
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', processVideos);
    } else {
      // DOM already loaded, but wait a tiny bit for React to render
      setTimeout(processVideos, 100);
    }
    
    // Process videos on route change (Next.js)
    setTimeout(processVideos, 500);
    setTimeout(processVideos, 1000);
    setTimeout(processVideos, 2000);
    
    // Add click/touch handler as ultimate fallback
    const handleInteraction = () => {
      console.log('User interaction detected - forcing video play');
      const videos = document.querySelectorAll<HTMLVideoElement>('video');
      videos.forEach(video => attemptPlay(video));
    };
    
    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });
    
    // Observe DOM for new videos (for dynamic content)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLVideoElement) {
            attemptPlay(node);
          } else if (node instanceof HTMLElement) {
            const videos = node.querySelectorAll<HTMLVideoElement>('video');
            videos.forEach(video => attemptPlay(video));
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Cleanup
    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('DOMContentLoaded', processVideos);
    };
  }, []);
};
