import React, { useState, useEffect, useRef } from 'react'

interface OptimizedVideoProps {
  src: string
  alt?: string
  className?: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  playsInline?: boolean
  poster?: string
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
  fallbackImage?: string
}

export function OptimizedVideo({
  src,
  alt = 'Background video',
  className = '',
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  poster,
  priority = false,
  onLoad,
  onError,
  fallbackImage = '/backgrounds/placeholder.jpg'
}: OptimizedVideoProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(priority)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Only load video when it's in viewport (unless priority)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1, rootMargin: '50px' }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Determine if we should load based on priority or visibility
  useEffect(() => {
    if (priority || isVisible) {
      setShouldLoad(true)
    }
  }, [priority, isVisible])

  // Handle video load
  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  // Handle video error
  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // Detect low-end devices for conditional loading
  const isLowEndDevice = () => {
    if (typeof window === 'undefined') return false
    
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true
    }
    
    // Check for slow connection
    const connection = (navigator as any).connection
    if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
      return true
    }
    
    // Check device memory (if available)
    const deviceMemory = (navigator as any).deviceMemory
    if (deviceMemory && deviceMemory < 4) {
      return true
    }
    
    return false
  }

  // Don't load video on low-end devices
  if (!shouldLoad || (isLowEndDevice() && !priority)) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <img
          src={fallbackImage}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    )
  }

  // Show fallback image if video failed to load
  if (hasError) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <img
          src={fallbackImage}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        controls={false}
        preload="none"
        poster={poster}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoadedData={handleLoad}
        onError={handleError}
        webkit-playsinline="true"
        x5-playsinline="true"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate nofullscreen"
        style={{
          pointerEvents: 'none',
          WebkitAppearance: 'none',
          outline: 'none'
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
      
      {/* Show poster/fallback while loading */}
      {!isLoaded && (
        <img
          src={poster || fallbackImage}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}
      
      {/* Loading indicator */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

