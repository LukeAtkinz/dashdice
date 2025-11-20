import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  src: string; // Base path without extension (e.g., "/Abilities/Animations/Pan Slap")
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  style?: React.CSSProperties;
  playbackRate?: number;
  poster?: string; // Optional custom poster
}

/**
 * Universal video player component with cross-browser/device compatibility
 * 
 * Automatically handles:
 * - Multiple format fallbacks (MP4 + WebM)
 * - iOS/Safari compatibility
 * - Mobile optimization
 * - Loading states with poster images
 * - Error handling
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <VideoPlayer src="/Abilities/Animations/Pan Slap" autoPlay muted playsInline />
 * 
 * // With custom playback speed
 * <VideoPlayer 
 *   src="/Abilities/Animations/Luck Turner" 
 *   autoPlay 
 *   muted 
 *   playsInline
 *   playbackRate={1.5}
 * />
 * 
 * // With event handlers
 * <VideoPlayer 
 *   src="/Animations/x2multi" 
 *   autoPlay={false}
 *   loop={false}
 *   onEnded={() => console.log('Animation complete')}
 *   onError={(err) => console.error('Video error:', err)}
 * />
 * ```
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  className = '',
  autoPlay = false,
  loop = false,
  muted = true,
  playsInline = true,
  onEnded,
  onError,
  style,
  playbackRate = 1,
  poster
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Remove file extension if accidentally provided
  const baseSrc = src.replace(/\.(mp4|webm|mov)$/i, '');

  // Set playback rate when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !loaded) return;

    if (playbackRate !== 1) {
      video.playbackRate = playbackRate;
    }
  }, [loaded, playbackRate]);

  // Handle autoplay (iOS requires special handling)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay || !loaded) return;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn('Autoplay prevented (likely needs user interaction):', err);
        // Autoplay blocked by browser policy
        // Video will play when user interacts with page
      }
    };

    playVideo();
  }, [autoPlay, loaded]);

  const handleLoadedData = () => {
    setLoaded(true);
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const currentSource = video.currentSrc;
    
    console.error('Video failed to load:', {
      baseSrc,
      currentSource,
      error: video.error,
      networkState: video.networkState,
      readyState: video.readyState
    });

    // Retry logic: try next source or fail gracefully
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
      
      // Force reload to try next source
      setTimeout(() => {
        video.load();
      }, 100);
      
      return;
    }

    setError(true);
    
    if (onError) {
      onError(new Error(`Failed to load video after ${retryCount} attempts: ${baseSrc}`));
    }
  };

  // Poster image fallback order
  const posterSrc = poster || `${baseSrc}-poster.jpg`;

  if (error) {
    return (
      <div 
        className={`${className} bg-gray-800/50 flex items-center justify-center`}
        style={style}
      >
        <span className="text-white/70 text-sm px-4 text-center">
          Video unavailable
        </span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      // @ts-ignore - webkit-playsinline is valid but not in TS types
      webkit-playsinline="true" // Required for older iOS (pre-iOS 10)
      preload="metadata"
      controls={false}
      disablePictureInPicture
      disableRemotePlayback
      poster={posterSrc}
      onLoadedData={handleLoadedData}
      onEnded={onEnded}
      onError={handleError}
      style={{
        ...style,
        pointerEvents: 'none',
        outline: 'none',
        // Hardware acceleration for smooth playback
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'translateZ(0)', // Force GPU rendering
      }}
    >
      {/* 
        MP4 FIRST for maximum compatibility
        - Safari/iOS requires H.264
        - Android WebView prefers MP4
        - Universal fallback
      */}
      <source 
        src={`${baseSrc}.mp4`} 
        type="video/mp4; codecs=avc1.42E01E,mp4a.40.2" 
      />
      
      {/* 
        WebM SECOND for better compression on supporting browsers
        - Chrome/Firefox prefer WebM
        - Better quality at smaller file sizes
        - VP8 codec for wider support than VP9
      */}
      <source 
        src={`${baseSrc}.webm`} 
        type="video/webm; codecs=vp8,vorbis" 
      />
      
      {/* Fallback message for ancient browsers */}
      <div className="text-white/70 text-sm p-4 text-center">
        Your browser does not support video playback. Please update to a modern browser.
      </div>
    </video>
  );
};

/**
 * Lightweight video component for previews/thumbnails
 * Uses only MP4 for maximum compatibility with minimal overhead
 */
export const VideoPlayerPreview: React.FC<Omit<VideoPlayerProps, 'playbackRate'>> = ({
  src,
  className,
  autoPlay = false,
  loop = true,
  muted = true,
  playsInline = true,
  onEnded,
  onError,
  style,
  poster
}) => {
  return (
    <VideoPlayer
      src={src}
      className={className}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      onEnded={onEnded}
      onError={onError}
      style={style}
      poster={poster}
      playbackRate={1}
    />
  );
};
