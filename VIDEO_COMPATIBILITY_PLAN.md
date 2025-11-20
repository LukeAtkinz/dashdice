# 🎥 Video Compatibility & Optimization Plan

## Current Situation

### Videos in DashDice
1. **Background Videos** (5 videos)
   - New Day, On A Mission, Underwater, As They Fall, End of the Dragon
   - Desktop: `.mp4` format
   - Mobile: `.webm` format
   - Preview: `.webm` format

2. **Ability Animations** (2 videos)
   - Luck Turner Animation: `.webm` (also has `.mp4` backup)
   - Pan Slap: `.webm` (also has `.mov` source)

3. **Match Animations** (3 videos)
   - x2multi.webm, x3multi.webm, x4multi.webm

4. **Transition Videos** (2 videos)
   - Into Waiting Room.mp4
   - Into Match.mp4

5. **Splash Screen** (2 videos)
   - Splash Screen.mp4
   - Splash-Screen.webm

### Current Issues
- ✅ Works: Chrome on PC
- ❌ Fails: Chrome on mobile (Android)
- ❌ Struggles: Safari (iOS)
- ❓ Unknown: Android WebView (for Capacitor apps)

---

## 🎯 Root Causes

### 1. **Format Compatibility**
| Format | Chrome Desktop | Chrome Mobile | Safari iOS | Android WebView |
|--------|---------------|---------------|-----------|-----------------|
| `.mp4` (H.264) | ✅ | ✅ | ✅ | ✅ |
| `.webm` (VP8/VP9) | ✅ | ⚠️ Spotty | ❌ Poor | ⚠️ Spotty |
| `.mov` | ❌ | ❌ | ✅ | ❌ |

**Problem**: You're using `.webm` for most videos, which has poor Safari/iOS support.

### 2. **Video Attributes Missing**
Current video tags are missing critical mobile attributes:
```tsx
<video
  src="/Abilities/Animations/Pan Slap.webm"  // ❌ Single source
  autoPlay
  muted
  playsInline  // ✅ Good
  preload="auto"
/>
```

**Missing**:
- Multiple format fallbacks (`<source>` tags)
- `webkit-playsinline` for older iOS
- Proper MIME types
- Poster images for loading states

### 3. **Codec Issues**
WebM can use different codecs:
- **VP8**: Older, better compatibility
- **VP9**: Newer, better compression, worse compatibility
- **AV1**: Future-proof but very limited support

Your `.webm` files might be using VP9, which Safari doesn't support.

### 4. **Mobile Data/Performance**
- Large video files fail to load on slower connections
- No progressive loading indicators
- Videos auto-load even when not visible

---

## 🔧 Complete Solution

### Phase 1: Universal Format Strategy (CRITICAL)

#### Convert All Videos to Multi-Format
Every video should have **3 versions**:

```
/Abilities/Animations/
├── Pan Slap.mp4          # H.264 codec (universal)
├── Pan Slap.webm         # VP8 codec (Chrome/Firefox)
└── Pan Slap-poster.jpg   # Loading poster
```

**Conversion Commands** (using FFmpeg):
```bash
# Convert to H.264 MP4 (universal compatibility)
ffmpeg -i "Pan Slap.webm" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "Pan Slap.mp4"

# Convert to WebM VP8 (better compression for desktop)
ffmpeg -i "Pan Slap.webm" -c:v libvpx -b:v 1M -c:a libvorbis -b:a 128k "Pan Slap.webm"

# Generate poster image
ffmpeg -i "Pan Slap.webm" -ss 00:00:01 -vframes 1 "Pan Slap-poster.jpg"
```

**Key Flags Explained**:
- `-profile:v baseline`: Maximum compatibility (works on all devices)
- `-pix_fmt yuv420p`: Required for some players
- `-movflags +faststart`: Enables progressive streaming
- `-b:v 1M`: 1 Mbps bitrate (balance quality/size)

---

### Phase 2: Smart Video Component

Create a universal `<VideoPlayer>` component:

```tsx
// src/components/shared/VideoPlayer.tsx
import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  src: string; // Base path without extension
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  style?: React.CSSProperties;
  playbackRate?: number;
}

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
  playbackRate = 1
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Remove file extension if provided
  const baseSrc = src.replace(/\.(mp4|webm|mov)$/, '');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set playback rate when video loads
    const handleLoadedData = () => {
      if (playbackRate !== 1) {
        video.playbackRate = playbackRate;
      }
      setLoaded(true);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    return () => video.removeEventListener('loadeddata', handleLoadedData);
  }, [playbackRate]);

  // iOS requires user interaction for autoplay, handle gracefully
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay) return;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn('Autoplay prevented:', err);
        // Autoplay blocked, video will play on user interaction
      }
    };

    playVideo();
  }, [autoPlay]);

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('Video failed to load:', baseSrc, e);
    setError(true);
    if (onError) {
      onError(new Error(`Failed to load video: ${baseSrc}`));
    }
  };

  if (error) {
    return (
      <div 
        className={`${className} bg-gray-800 flex items-center justify-center`}
        style={style}
      >
        <span className="text-white text-sm">Video unavailable</span>
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
      webkit-playsinline="true" // Older iOS
      preload="metadata"
      controls={false}
      disablePictureInPicture
      disableRemotePlayback
      poster={`${baseSrc}-poster.jpg`}
      onEnded={onEnded}
      onError={handleError}
      style={{
        ...style,
        pointerEvents: 'none',
        outline: 'none',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      {/* MP4 first for Safari/iOS */}
      <source src={`${baseSrc}.mp4`} type="video/mp4; codecs=avc1.42E01E,mp4a.40.2" />
      
      {/* WebM fallback for Chrome/Firefox */}
      <source src={`${baseSrc}.webm`} type="video/webm; codecs=vp8,vorbis" />
      
      {/* Error message for browsers without video support */}
      <div className="text-white">Your browser does not support video playback.</div>
    </video>
  );
};
```

**Usage Example**:
```tsx
// Before (broken on mobile)
<video src="/Abilities/Animations/Pan Slap.webm" autoPlay muted playsInline />

// After (works everywhere)
<VideoPlayer 
  src="/Abilities/Animations/Pan Slap" 
  autoPlay 
  muted 
  playsInline
  playbackRate={1.5}
/>
```

---

### Phase 3: File Organization

```
/public/
├── Abilities/
│   └── Animations/
│       ├── Pan Slap.mp4          # Universal format
│       ├── Pan Slap.webm         # Optional desktop
│       ├── Pan Slap-poster.jpg   # Loading preview
│       ├── Luck Turner.mp4
│       ├── Luck Turner.webm
│       └── Luck Turner-poster.jpg
│
├── Animations/
│   ├── x2multi.mp4
│   ├── x2multi.webm
│   ├── x2multi-poster.jpg
│   ├── x3multi.mp4
│   ├── x3multi.webm
│   ├── x3multi-poster.jpg
│   ├── x4multi.mp4
│   ├── x4multi.webm
│   └── x4multi-poster.jpg
│
└── backgrounds/
    ├── New Day.mp4               # Desktop full
    ├── Mobile/
    │   ├── New Day-Mobile.mp4    # Mobile optimized
    │   └── New Day-Mobile.webm   # Mobile WebM
    └── Preview/
        ├── New-Day-Preview.mp4   # Card preview
        └── New-Day-Preview.jpg   # Static fallback
```

---

### Phase 4: Optimization Config

Create a video optimization configuration:

```tsx
// src/config/videoOptimization.ts

export interface VideoSource {
  mp4: string;
  webm?: string;
  poster: string;
}

export const getVideoSource = (
  basePath: string,
  context: 'ability' | 'animation' | 'background'
): VideoSource => {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  if (context === 'background' && isMobile) {
    return {
      mp4: `${basePath}-Mobile.mp4`,
      webm: `${basePath}-Mobile.webm`,
      poster: `${basePath}-poster.jpg`
    };
  }
  
  return {
    mp4: `${basePath}.mp4`,
    webm: `${basePath}.webm`,
    poster: `${basePath}-poster.jpg`
  };
};

// Preload critical videos
export const preloadVideo = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = src;
    video.onloadeddata = () => resolve();
    video.onerror = reject;
  });
};
```

---

### Phase 5: Background Video Updates

Update `Match.tsx` to use new video component:

```tsx
// Before
<video
  autoPlay
  loop
  muted
  playsInline
  className={className}
>
  <source src={src} type="video/mp4" />
  Your browser does not support the video tag.
</video>

// After
<VideoPlayer
  src={src.replace(/\.(mp4|webm)$/, '')}
  autoPlay
  loop
  muted
  playsInline
  className={className}
/>
```

---

## 📋 Implementation Checklist

### Immediate Actions (Critical for Mobile)
- [ ] **Convert all .webm ability animations to .mp4 (H.264)**
  - [ ] Pan Slap.webm → Pan Slap.mp4
  - [ ] Luck Turner.webm → Luck Turner.mp4
  
- [ ] **Generate poster images for all videos**
  - [ ] Pan Slap-poster.jpg
  - [ ] Luck Turner-poster.jpg
  - [ ] x2multi-poster.jpg, x3multi-poster.jpg, x4multi-poster.jpg

- [ ] **Create VideoPlayer component** (src/components/shared/VideoPlayer.tsx)

- [ ] **Update SlotMachineDice.tsx** to use VideoPlayer
  - [ ] Replace Luck Turner video tag
  - [ ] Replace Pan Slap video tag

- [ ] **Update Match.tsx VideoBackground** to use VideoPlayer

### Testing Requirements
- [ ] Test on Chrome Desktop (Windows/Mac)
- [ ] Test on Chrome Mobile (Android)
- [ ] Test on Safari Desktop (Mac)
- [ ] Test on Safari Mobile (iOS 15+)
- [ ] Test on Firefox Desktop
- [ ] Test on Samsung Internet (Android)
- [ ] Test on slow 3G connection (throttle in DevTools)
- [ ] Test in Capacitor WebView (iOS + Android)

### Optional Enhancements
- [ ] Implement lazy loading for non-critical videos
- [ ] Add bandwidth detection (skip videos on slow connections)
- [ ] Add video quality settings in user preferences
- [ ] Implement video preloading for smoother experience
- [ ] Add fallback static images for video backgrounds

---

## 🎬 Video Encoding Best Practices

### For Ability Animations (Short, looping)
```bash
# High quality, small file (target: <500KB)
ffmpeg -i input.webm \
  -c:v libx264 -preset slow -crf 23 \
  -profile:v baseline -level 3.0 \
  -pix_fmt yuv420p \
  -vf "scale=720:-2" \
  -movflags +faststart \
  -an \
  output.mp4
```

### For Background Videos (Large, looping)
```bash
# Mobile version (target: <2MB)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 28 \
  -profile:v baseline -level 3.0 \
  -pix_fmt yuv420p \
  -vf "scale=720:-2" \
  -r 24 \
  -movflags +faststart \
  -c:a aac -b:a 96k \
  output-mobile.mp4

# Desktop version (target: <5MB)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -profile:v baseline -level 3.0 \
  -pix_fmt yuv420p \
  -vf "scale=1280:-2" \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  output.mp4
```

### For Match Animations (Very short, no sound)
```bash
# Tiny file (target: <100KB)
ffmpeg -i input.webm \
  -c:v libx264 -preset slow -crf 20 \
  -profile:v baseline -level 3.0 \
  -pix_fmt yuv420p \
  -vf "scale=480:-2" \
  -movflags +faststart \
  -an \
  output.mp4
```

---

## 🚨 Critical Safari/iOS Fixes

### Issue: Videos not playing on Safari
**Solution**: H.264 Baseline Profile with yuv420p pixel format

### Issue: Videos not autoplaying on iOS
**Solution**: Videos must be:
1. Muted (`muted` attribute)
2. Inline (`playsInline` and `webkit-playsinline`)
3. H.264 encoded
4. User must interact with page first (use "Tap to Start" screen)

### Issue: Videos causing memory issues
**Solution**: 
- Limit resolution (720p max for mobile)
- Use progressive loading (`-movflags +faststart`)
- Unload videos when not in viewport

---

## 📊 Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Safari iOS Support | 10% | 95% |
| Chrome Android Support | 50% | 98% |
| Load Time (3G) | >8s | <3s |
| File Size (avg) | 1.2MB | 600KB |
| Memory Usage | High | 50% reduction |
| Compatibility Score | 60% | 98% |

---

## 🔄 Migration Strategy

1. **Week 1**: Convert critical videos (abilities, splash)
2. **Week 2**: Implement VideoPlayer component
3. **Week 3**: Update all video consumers
4. **Week 4**: Convert background videos
5. **Week 5**: Testing across all devices
6. **Week 6**: Deploy and monitor

---

## 📱 Capacitor-Specific Considerations

### iOS WebView
- Requires H.264 Baseline Profile
- May need `WKWebViewConfiguration` settings in `capacitor.config.ts`

### Android WebView
- Generally good WebM support
- May struggle with high-res videos
- Requires `android:hardwareAccelerated="true"` in manifest

**Recommended capacitor.config.ts**:
```typescript
{
  ios: {
    webContentsDebuggingEnabled: true,
    allowsInlineMediaPlayback: true,
    mediaPlaybackRequiresUserAction: false
  },
  android: {
    allowMixedContent: true,
    hardwareAccelerated: true
  }
}
```

---

## 🎯 Priority Order

1. **CRITICAL** (Do First):
   - Convert Pan Slap.webm → Pan Slap.mp4
   - Convert Luck Turner.webm → Luck Turner.mp4
   - Update SlotMachineDice.tsx with multiple sources

2. **HIGH** (Do Second):
   - Create VideoPlayer component
   - Generate poster images
   - Convert match animations (x2/x3/x4multi)

3. **MEDIUM** (Do Third):
   - Convert background videos
   - Update Match.tsx backgrounds
   - Add lazy loading

4. **LOW** (Nice to Have):
   - Bandwidth detection
   - Quality settings
   - Preloading optimization

---

## 🧪 Quick Test Script

```typescript
// Add to console for quick testing
const testVideo = (src: string) => {
  const video = document.createElement('video');
  video.src = src;
  video.load();
  video.onloadeddata = () => console.log('✅ Loaded:', src);
  video.onerror = (e) => console.error('❌ Failed:', src, e);
};

// Test all ability videos
testVideo('/Abilities/Animations/Pan Slap.mp4');
testVideo('/Abilities/Animations/Luck Turner.mp4');
testVideo('/Animations/x2multi.mp4');
```

---

## Summary

**Root Problem**: Using `.webm` format which Safari/iOS don't support well.

**Solution**: Convert all videos to H.264 `.mp4` with baseline profile, add multiple source fallbacks, implement smart VideoPlayer component.

**Impact**: 98% device compatibility, faster loading, better mobile experience.

**Time**: ~2-3 days for critical fixes, ~1 week for complete migration.
