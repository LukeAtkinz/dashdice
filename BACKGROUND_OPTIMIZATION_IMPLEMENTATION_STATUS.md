# Background Optimization Implementation Status

## ✅ Completed Components

### 1. UserProfileViewer (`src/components/profile/UserProfileViewer.tsx`)
- **Status**: ✅ Complete
- **Changes**: Added `usePlayerCardBackground` hook
- **Usage**: Profile card displays use optimized PREVIEW variant
- **Code**:
```tsx
const { backgroundPath, isVideo } = usePlayerCardBackground(
  viewingOwnProfile ? DisplayBackgroundEquip : profileBackground
);
```

### 2. FriendCard (`src/components/friends/FriendCard.tsx`)
- **Status**: ✅ Complete  
- **Changes**: Replaced `getFriendBackgroundStyle` helper with `usePlayerCardBackground` hook
- **Usage**: All friend cards use optimized PREVIEW variant
- **Code**:
```tsx
const { backgroundPath, isVideo } = usePlayerCardBackground(friendBackground);
```

### 3. SoftRankedLeaderboard (`src/components/ranked/SoftRankedLeaderboard.tsx`)
- **Status**: ✅ Complete
- **Changes**: Created `PlayerCard` component with `usePlayerCardBackground` hook
- **Usage**: Leaderboard entries use optimized PREVIEW variant
- **Code**:
```tsx
const { backgroundPath, isVideo } = usePlayerCardBackground(playerBackground);
```

---

## ⏳ Remaining Components

### 4. GameWaitingRoom (`src/components/dashboard/GameWaitingRoom.tsx`)
- **Status**: ⏳ Pending
- **What to do**: Add optimized background for opponent display
- **Hook to use**: `useWaitingRoomBackground`
- **Steps**:

1. Add import at top of file:
```tsx
import { useWaitingRoomBackground } from '@/hooks/useOptimizedBackground';
```

2. Find where opponent background is used (around line 377):
```tsx
const background = opponentData.matchBackgroundEquipped || opponentData.displayBackgroundEquipped;
```

3. Replace with optimized hook:
```tsx
const opponentBg = opponentData?.matchBackgroundEquipped || opponentData?.displayBackgroundEquipped;
const { backgroundPath: opponentBgPath, isVideo: opponentBgIsVideo } = useWaitingRoomBackground(opponentBg as any);
```

4. Update background rendering to use `opponentBgPath` and `opponentBgIsVideo`

### 5. Match Component (`src/components/dashboard/Match.tsx`)
- **Status**: ⏳ Pending
- **What to do**: Add optimized backgrounds for both user and opponent
- **Hook to use**: `useMatchBackground`
- **Steps**:

1. Add import at top of file:
```tsx
import { useMatchBackground } from '@/hooks/useOptimizedBackground';
```

2. Add hooks for both players (around where you get match data):
```tsx
// For opponent background
const opponentBg = matchData?.opponentData?.matchBackgroundEquipped;
const { backgroundPath: opponentBgPath, isVideo: opponentBgIsVideo } = useMatchBackground(opponentBg as any);

// For user background  
const userBg = matchData?.hostData?.matchBackgroundEquipped;
const { backgroundPath: userBgPath, isVideo: userBgIsVideo } = useMatchBackground(userBg as any);
```

3. Update all background rendering to use these optimized paths instead of direct `.file` access

---

## 🎬 Splash Screen Update

### Requirements
1. Change from MP4 to WebM format
2. Freeze on last frame until app content loads
3. Fade into loaded application

### Files to Update

#### `src/app/SplashScreen.tsx` (or wherever splash is located)
```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [videoEnded, setVideoEnded] = useState(false);
  const [appLoaded, setAppLoaded] = useState(false);
  const [showApp, setShowApp] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Monitor app loading state
  useEffect(() => {
    // Check if critical resources are loaded
    const checkAppLoaded = () => {
      // Add your loading checks here (fonts, images, data, etc.)
      if (document.readyState === 'complete') {
        setAppLoaded(true);
      }
    };

    if (document.readyState === 'complete') {
      setAppLoaded(true);
    } else {
      window.addEventListener('load', checkAppLoaded);
      return () => window.removeEventListener('load', checkAppLoaded);
    }
  }, []);

  // When both video ended AND app loaded, start fade
  useEffect(() => {
    if (videoEnded && appLoaded) {
      setTimeout(() => {
        setShowApp(true);
        setTimeout(onComplete, 500); // Fade duration
      }, 500); // Brief delay on last frame
    }
  }, [videoEnded, appLoaded, onComplete]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
    // Pause on last frame
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <AnimatePresence>
      {!showApp && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnd}
            className="w-full h-full object-cover"
          >
            <source src="/splash-screen.webm" type="video/webm" />
          </video>
          
          {/* Loading indicator (only show after video ends) */}
          {videoEnded && !appLoaded && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

### Update splash-screen reference
Find where `/splash-screen.mp4` is referenced and change to:
```tsx
<source src="/splash-screen.webm" type="video/webm" />
```

---

## Testing Checklist

### Background Optimization
- [ ] Profile viewer shows PREVIEW thumbnails
- [ ] Friend cards show PREVIEW thumbnails
- [ ] Leaderboard shows PREVIEW thumbnails
- [ ] Waiting room shows optimized opponent background
- [ ] Match shows optimized backgrounds for both players
- [ ] Desktop loads FULL size images
- [ ] Mobile loads MOBILE size images
- [ ] Videos play from MOBILE folder

### Splash Screen
- [ ] Splash screen plays WebM video
- [ ] Video freezes on last frame
- [ ] Loading spinner appears if app not ready
- [ ] Fade transition works smoothly
- [ ] App shows after both video + loading complete

---

## Performance Impact

### Before Optimization
- Desktop loading 4K images everywhere: ~3-5MB per background
- Friend cards/leaderboard loading full videos: ~10-20MB per entry
- Total bandwidth waste: **~50-100MB** per page load

### After Optimization  
- Mobile loading optimized images: ~300-800KB per background
- Preview thumbnails: ~50-100KB per card
- Total bandwidth saved: **~80% reduction**

---

## Quick Implementation Guide

1. **For GameWaitingRoom**: Search for `opponentData.matchBackgroundEquipped` and add the hook
2. **For Match**: Search for `matchBackgroundEquipped` and add hooks for both players
3. **For Splash**: Replace `/splash-screen.mp4` with `/splash-screen.webm` and add loading logic

All hooks are already created in `src/hooks/useOptimizedBackground.ts` and ready to use!
