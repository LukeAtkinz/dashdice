# REBUILD REFERENCE - Ability Animations & Turn Decider

**Date:** November 21, 2025  
**Issue:** React error #321 (Invalid hook call) occurring on match load  
**Error Location:** `common-f0beea6a5557ceeb.js:1:663903`

## Overview

This document preserves all working code from recent features that need to be rebuilt step-by-step to avoid React hooks errors.

---

## Part 1: Ability Animations Implementation

**Commit Reference:** `154fdb3` - "Implement all 5 ability animations with WebM format only"

### Affected Files
- `src/components/dashboard/GameplayPhase.tsx` (653 additions)
- `src/components/dashboard/Match.tsx` (214 additions)
- `src/components/dashboard/SlotMachineDice.tsx` (44 changes)
- `src/components/shared/VideoPlayer.tsx` (new file, 92 lines)

### Video Assets Added
```
public/Abilities/Animations/Aura Forge/
  - Aura Forge Aura.webm (3.2MB)
  - Aura Forge Bottom.webm (1.2MB)
  - Aura Forge Turn Score.webm (5.8MB)

public/Abilities/Animations/Hard Hat/
  - Hard Hat Initial.webm (399KB)
  - Hard Hat Used.webm (1.3MB)

public/Abilities/Animations/Luck Turner/
  - Luck Turner Animation.webm (1.2MB)

public/Abilities/Animations/Pan Slap/
  - Pan Slap.webm

public/Abilities/Animations/Vital Rush/
  - Vital Rush Initial.webm (864KB)
  - Vital Rush Top Dice Container.webm (7.9MB)
  - Vital Rush Bottom Dice Container.webm (7.9MB)
```

### VideoPlayer Component
**File:** `src/components/shared/VideoPlayer.tsx`

**Purpose:** Cross-browser video playback with fallback support

**Key Features:**
- WebM + MP4 format fallback
- Transparent video support (alpha channel)
- Safari/iOS compatibility
- Error handling with graceful degradation

**Implementation Notes:**
1. Use `preload="auto"` for immediate playback
2. Implement `onCanPlay` handler for ready state
3. Ignore false error events (Safari quirk)
4. Support both background videos (MP4) and transparent abilities (WebM)

---

## Part 2: Turn Decider Enhancements

**Commit Reference:** `77f5241` - "WIP: Add slot machine dice to turn decider and setup for video backgrounds"

**Status:** ❌ CAUSED REACT ERROR #321 - DO NOT USE AS-IS

### What Was Attempted

1. **Video Backgrounds:** Random World video selection for top/bottom containers
2. **Dice Animation:** Replace PulseDice with SlotMachineDice component
3. **Visual Cleanup:** Remove odd/even choice icons
4. **Transition Effect:** Framer-motion swipe from right to left

### Code That FAILED (TurnDeciderPhase.tsx)

```typescript
// ❌ THIS CAUSED ERROR - DO NOT COPY DIRECTLY
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SlotMachineDice } from './SlotMachineDice';

// Video backgrounds state (lines 44-48)
const [topVideo, setTopVideo] = useState<string>('');
const [bottomVideo, setBottomVideo] = useState<string>('');
const videoInitialized = useRef(false);

// Available world videos (lines 50-57)
const worldVideos = useMemo(() => [
  '/World/Awaken/Awakened.mp4',
  '/World/Lead the way/Lead the way.mp4',
  '/World/Little Critters/Little Critters.mp4',
  '/World/Parkour/Parkour.mp4',
  '/World/Web Climber/Web Climber.mp4'
], []);

// Initialize random videos on mount (lines 59-67)
useEffect(() => {
  if (!videoInitialized.current && worldVideos.length > 0) {
    const shuffled = [...worldVideos].sort(() => Math.random() - 0.5);
    setTopVideo(shuffled[0]);
    setBottomVideo(shuffled[1]);
    videoInitialized.current = true;
  }
}, [worldVideos]);

// Dice display replacement (around line 400+)
<SlotMachineDice
  diceNumber={diceAnimation.currentNumber}
  animationState={diceAnimation.isSpinning ? 'spinning' : 'idle'}
  matchRollPhase="rolling"
  actualValue={diceAnimation.finalNumber || diceAnimation.currentNumber}
  isGameRolling={diceAnimation.isSpinning}
  isTurnDecider={true}
  matchData={matchData}
/>
```

### Why It Failed

**React Error #321 Analysis:**
- Hooks added to TurnDeciderPhase component (useState, useRef, useMemo, useEffect)
- Error occurs at bundle position 663903 calling `useRef`
- Match loads successfully through turnDecider phase
- Crashes when transitioning to gameplay phase
- Likely cause: Hook order violation or conditional hook call not visible in code review

**Component Complexity:**
- TurnDeciderPhase is 857 lines
- Complex animation state management
- Multiple transition phases
- Deep nesting of conditional renders

---

## Part 3: Hook-Related Fixes

**Commits:** `8958b38`, `b7d84d6`, `24e2945` - "Fix React hooks imports"

### What Was Fixed
Changed all React hook imports from:
```typescript
// ❌ OLD
import React from 'react';
const [state, setState] = React.useState();
const ref = React.useRef();
```

To:
```typescript
// ✅ NEW
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
const [state, setState] = useState();
const ref = useRef();
```

### Files Modified
- GameplayPhase.tsx
- SlotMachineDice.tsx
- Match.tsx
- InventorySectionNew.tsx
- And others across the codebase

---

## Part 4: Other Fixes (Working)

### SplashScreen Hydration Fix
**Commit:** `cc9ea20`

```typescript
// Added client-side check
const [isClient, setIsClient] = useState(false);
useEffect(() => { setIsClient(true); }, []);

// Fixed video element
<video
  preload="metadata" // Changed from "auto"
  suppressHydrationWarning // Prevent mismatch
  className={`object-cover ${isClient && isMobile ? 'w-[85%] h-[75%]' : 'w-[95%] h-[90%]'} max-w-none`}
/>
```

### useOptimizedBackground SSR Fix
**Commit:** `b4c62b5`

```typescript
// Calculate context first
const context: BackgroundContext = useMemo(() => {
  if (baseContext === 'preview') return 'preview';
  return isMobile 
    ? `${baseContext}-mobile` as BackgroundContext
    : `${baseContext}-desktop` as BackgroundContext;
}, [baseContext, isMobile]);

// Then get path (not calling isMobileDevice during render)
const backgroundPath = useMemo(() => {
  if (!background) return null;
  return getOptimizedBackgroundPath(background, context);
}, [background, context]);
```

### topDiceWidth RAF Optimization
**Commit:** `3087f8d`

```typescript
useEffect(() => {
  if (!topDiceRef.current) return;
  const rafId = requestAnimationFrame(() => {
    if (topDiceRef.current) {
      const width = topDiceRef.current.offsetWidth;
      if (width > 0 && width !== topDiceWidth) {
        setTopDiceWidth(width);
      }
    }
  });
  return () => cancelAnimationFrame(rafId);
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

---

## Rebuild Strategy

### Step 1: Reset to Known Good State
```bash
# Reset to before ability animations
git reset --hard 700195a

# Or reset to before turn decider changes
git reset --hard 3087f8d
```

### Step 2: Rebuild Ability Animations (Incrementally)

1. **Add VideoPlayer Component First**
   - Create `src/components/shared/VideoPlayer.tsx`
   - Test independently with sample video
   - Verify no hooks errors

2. **Add Video Assets**
   - Copy all ability animation WebM files
   - Verify file paths are correct

3. **Update Match.tsx**
   - Add ability animation state management
   - Test match loading works
   - Verify no errors

4. **Update GameplayPhase.tsx**
   - Add animation triggers for each ability
   - Test one ability at a time
   - Verify hooks order is correct

5. **Update SlotMachineDice.tsx**
   - Add any necessary changes
   - Test dice animations work

### Step 3: Rebuild Turn Decider (Alternative Approach)

**Option A: Context-Based Videos (Safer)**
```typescript
// Instead of hooks in component, use props or context
interface TurnDeciderPhaseProps {
  matchData: MatchData;
  backgroundVideo?: string; // Pass from parent
  // ... other props
}
```

**Option B: Extract Sub-Components**
```typescript
// Break 857-line component into smaller pieces
<TurnDeciderChoiceSelection />
<TurnDeciderWaitingDisplay />
<TurnDeciderResultDisplay />
```

**Option C: Use Existing PulseDice**
```typescript
// Keep PulseDice, don't replace with SlotMachineDice
// Add video backgrounds via parent component
```

### Step 4: Testing Checklist

After each change:
- [ ] Clear `.next` cache: `Remove-Item -Path ".next" -Recurse -Force`
- [ ] Run dev build: `npm run dev`
- [ ] Test match loading from dashboard
- [ ] Test ability activations
- [ ] Test turn decider phase
- [ ] Check browser console for errors
- [ ] Test on production build: `npm run build`

### Step 5: Deployment

Only after all local testing passes:
```bash
git add -A
git commit -m "Rebuild: [specific feature]"
git push
npx vercel --prod
```

---

## Error Debugging Guide

### React Error #321 Checklist

If you encounter "Invalid hook call":

1. **Check Hook Order**
   - All hooks must be at the top of the component
   - Before any computed values or conditional logic
   - Before any early returns

2. **Check Conditional Hooks**
   ```typescript
   // ❌ BAD
   if (condition) {
     const [state, setState] = useState();
   }
   
   // ✅ GOOD
   const [state, setState] = useState();
   if (condition) {
     setState(value);
   }
   ```

3. **Check Hook Dependencies**
   - Use eslint-disable comments sparingly
   - Verify all dependencies are listed
   - Check for circular dependencies

4. **Check Import Statements**
   ```typescript
   // ✅ CORRECT
   import React, { useState, useRef, useEffect } from 'react';
   
   // ❌ WRONG
   import React from 'react';
   React.useState(); // Can cause issues in production
   ```

5. **Check Component Nesting**
   - Hooks cannot be in loops
   - Hooks cannot be in callbacks
   - Hooks cannot be in event handlers

### Production Bundle Debugging

When error shows minified bundle position:
```
at common-f0beea6a5557ceeb.js:1:663903
```

1. Build locally without minification:
   ```bash
   # In next.config.js temporarily:
   swcMinify: false,
   ```

2. Check the specific component mentioned in stack trace

3. Use React DevTools to see component tree when error occurs

4. Add console.logs before suspected hook calls

---

## Success Criteria

Before considering rebuild complete:

1. ✅ Match loads without errors
2. ✅ All 5 ability animations play correctly
3. ✅ Turn decider phase works smoothly
4. ✅ No React errors in console
5. ✅ No hydration warnings
6. ✅ Works on both desktop and mobile
7. ✅ Production build deploys successfully
8. ✅ All existing features still work (dashboard, inventory, etc.)

---

## Notes

- **Current HEAD:** `77f5241` (broken, has hooks error)
- **Last Known Good:** `3087f8d` (before turn decider changes)
- **Safe Reset Point:** `700195a` (before ability animations)
- **Production URL:** https://dashdice-f48sn6fyr-dash-dice.vercel.app

## Related Files to Review

When rebuilding, check these files for conflicts:
- `src/components/dashboard/GameplayPhase.tsx`
- `src/components/dashboard/Match.tsx`
- `src/components/dashboard/TurnDeciderPhase.tsx`
- `src/components/dashboard/SlotMachineDice.tsx`
- `src/components/shared/VideoPlayer.tsx`
- `src/hooks/useOptimizedBackground.ts`
- `src/config/backgrounds.ts`

---

**Last Updated:** November 21, 2025 by GitHub Copilot
