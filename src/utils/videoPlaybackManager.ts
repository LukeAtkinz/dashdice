/**
 * Video Playback Manager
 * 
 * Centralized manager for triggering video autoplay across the app.
 * Solves mobile PWA autoplay issues by ensuring user interaction grants permission.
 */

type VideoPlaybackCallback = () => void;

class VideoPlaybackManager {
  private callbacks: Set<VideoPlaybackCallback> = new Set();
  private userInteracted = false;

  /**
   * Register a callback to be called when user grants autoplay permission
   */
  registerCallback(callback: VideoPlaybackCallback) {
    this.callbacks.add(callback);
    
    // If user already interacted, trigger immediately
    if (this.userInteracted) {
      callback();
    }
    
    return () => this.callbacks.delete(callback);
  }

  /**
   * Trigger all registered video playback callbacks
   * Call this on ANY user interaction that should grant autoplay permission
   */
  triggerPlayback() {
    const DEBUG_LOGS = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_DEBUG_LOGS === '1');
    if (DEBUG_LOGS) {
      console.log('🎬 VideoPlaybackManager: User interaction detected, triggering playback for', this.callbacks.size, 'videos');
    }
    this.userInteracted = true;
    
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in video playback callback:', error);
      }
    });
  }

  /**
   * Check if user has interacted
   */
  hasUserInteracted() {
    return this.userInteracted;
  }

  /**
   * Reset interaction state (for testing or session changes)
   */
  reset() {
    this.userInteracted = false;
    this.callbacks.clear();
  }

  /**
   * Play a specific video element with proper mobile settings
   */
  playVideo(video: HTMLVideoElement) {
    if (!video) return;
    
    try {
      video.muted = true;
      video.volume = 0;
      video.defaultMuted = true;
      
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn('Video autoplay prevented:', err);
        });
      }
    } catch (error) {
      console.warn('Error playing video:', error);
    }
  }

  /**
   * Play all videos matching a selector
   */
  playAllVideos(selector: string = 'video') {
    const videos = document.querySelectorAll<HTMLVideoElement>(selector);
    videos.forEach(video => this.playVideo(video));
  }
}

// Export singleton instance
export const videoPlaybackManager = new VideoPlaybackManager();

/**
 * React hook for video playback management
 */
export function useVideoPlayback(callback: VideoPlaybackCallback) {
  if (typeof window === 'undefined') return;
  
  return videoPlaybackManager.registerCallback(callback);
}
