# Step-by-Step Rebuild Plan

**Goal:** Restore ability animations and turn decider enhancements without React error #321

**Current State:** Reset to `700195a` (before ability animations)

---

## Phase 1: Foundation - Hook Import Standardization

**Why First:** Ensure consistent hook usage across entire codebase before adding complex features

### Step 1.1: Fix Hook Imports in Core Components
- [ ] GameplayPhase.tsx
- [ ] Match.tsx  
- [ ] SlotMachineDice.tsx
- [ ] TurnDeciderPhase.tsx

**Pattern:**
```typescript
// Change from:
import React from 'react';
const [state, setState] = React.useState();

// To:
import React, { useState, useRef, useEffect, useMemo } from 'react';
const [state, setState] = useState();
```

**Test:** After each file, verify `npm run dev` compiles without errors

### Step 1.2: Verify Hook Order
Check each component ensures:
1. All hooks at top of component function
2. Before any computed values
3. Before any conditional logic
4. Before any early returns

**Test:** Load match, verify no errors

---

## Phase 2: Video Infrastructure

### Step 2.1: Create VideoPlayer Component

**File:** `src/components/shared/VideoPlayer.tsx`

**Code:**
```typescript
import React, { useRef, useEffect, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  fallbackSrc?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onEnded?: () => void;
  onCanPlay?: () => void;
  style?: React.CSSProperties;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  fallbackSrc,
  className = '',
  autoPlay = true,
  loop = false,
  muted = true,
  playsInline = true,
  onEnded,
  onCanPlay,
  style
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
    setError(false);
  }, [src]);

  const handleError = () => {
    console.warn(`Video error for ${currentSrc}`);
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      console.log(`Trying fallback: ${fallbackSrc}`);
      setCurrentSrc(fallbackSrc);
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleCanPlay = () => {
    if (videoRef.current && autoPlay) {
      videoRef.current.play().catch(err => {
        console.warn('Video play failed:', err);
      });
    }
    onCanPlay?.();
  };

  if (error) {
    return <div className={className} style={style} />;
  }

  return (
    <video
      ref={videoRef}
      src={currentSrc}
      className={className}
      style={style}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      preload="auto"
      onError={handleError}
      onCanPlay={handleCanPlay}
      onEnded={onEnded}
    />
  );
};
```

**Test:**
1. Create component
2. Add to a test page with sample video
3. Verify plays without errors
4. Verify fallback works

---

## Phase 3: Ability Animations (ONE AT A TIME)

### Step 3.1: Add Video Assets

Copy all ability animation WebM files to:
```
public/Abilities/Animations/Aura Forge/
public/Abilities/Animations/Hard Hat/
public/Abilities/Animations/Luck Turner/
public/Abilities/Animations/Pan Slap/
public/Abilities/Animations/Vital Rush/
```

**Test:** Verify files exist and paths are correct

### Step 3.2: Update Match.tsx - State Management

Add ability animation state:

```typescript
// At top of Match component, with other useState declarations
const [activeAbilityAnimation, setActiveAbilityAnimation] = useState<{
  abilityId: string;
  phase: 'initial' | 'execution' | 'complete';
  targetPlayer?: 'top' | 'bottom';
} | null>(null);
```

**CRITICAL:** Ensure this is added at TOP of component, before any computed values

**Test:** 
1. Build with `npm run dev`
2. Load match
3. Verify no errors

### Step 3.3: Add Animation Trigger Logic to Match.tsx

```typescript
// Add effect to detect ability usage
useEffect(() => {
  if (!matchData?.gameData?.activeEffects) return;
  
  const effects = matchData.gameData.activeEffects;
  const newEffect = effects.find(effect => {
    // Check if this is a new ability activation
    const abilityIds = ['vital_rush', 'luck_turner', 'aura_forge', 'hard_hat', 'pan_slap'];
    return abilityIds.includes(effect.abilityId) && !effect.processed;
  });
  
  if (newEffect && !activeAbilityAnimation) {
    setActiveAbilityAnimation({
      abilityId: newEffect.abilityId,
      phase: 'initial',
      targetPlayer: newEffect.targetPlayerId === matchData.player1Id ? 'top' : 'bottom'
    });
  }
}, [matchData?.gameData?.activeEffects, activeAbilityAnimation]);
```

**Test:** Match loads, no errors

### Step 3.4: Pass Animation State to GameplayPhase

```typescript
<GameplayPhase
  // ... existing props
  activeAbilityAnimation={activeAbilityAnimation}
  onAnimationComplete={() => setActiveAbilityAnimation(null)}
/>
```

**Test:** Match loads, no errors

### Step 3.5: Update GameplayPhase - Add Vital Rush ONLY

Add interface:
```typescript
interface GameplayPhaseProps {
  // ... existing props
  activeAbilityAnimation?: {
    abilityId: string;
    phase: 'initial' | 'execution' | 'complete';
    targetPlayer?: 'top' | 'bottom';
  } | null;
  onAnimationComplete?: () => void;
}
```

Add animation rendering (ONE ability first):
```typescript
{/* Vital Rush Animation */}
{activeAbilityAnimation?.abilityId === 'vital_rush' && (
  <>
    {activeAbilityAnimation.phase === 'initial' && (
      <div className="absolute inset-0 pointer-events-none z-[60]">
        <VideoPlayer
          src="/Abilities/Animations/Vital Rush/Vital Rush Initial.webm"
          className="w-full h-full object-cover"
          onEnded={() => {
            // Move to execution phase
            if (onAnimationComplete) {
              setTimeout(onAnimationComplete, 100);
            }
          }}
        />
      </div>
    )}
  </>
)}
```

**Test:**
1. Build and run
2. Activate Vital Rush in match
3. Verify animation plays
4. Verify no errors before/during/after
5. Verify match continues normally

### Step 3.6: Add Remaining Abilities ONE AT A TIME

Repeat Step 3.5 for:
- [ ] Luck Turner
- [ ] Aura Forge
- [ ] Hard Hat
- [ ] Pan Slap

**Test after EACH ability:**
1. Clear cache
2. Build
3. Load match
4. Activate ability
5. Verify animation
6. Verify no errors
7. **COMMIT** if successful

---

## Phase 4: Turn Decider Enhancements (CAREFUL APPROACH)

### Strategy: Use Context Instead of Component Hooks

### Step 4.1: Create Video Background Context

**File:** `src/context/VideoBackgroundContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface VideoBackgroundContextType {
  topVideo: string;
  bottomVideo: string;
  refreshVideos: () => void;
}

const VideoBackgroundContext = createContext<VideoBackgroundContextType>({
  topVideo: '',
  bottomVideo: '',
  refreshVideos: () => {}
});

export const useVideoBackground = () => useContext(VideoBackgroundContext);

const worldVideos = [
  '/World/Awaken/Awakened.mp4',
  '/World/Lead the way/Lead the way.mp4',
  '/World/Little Critters/Little Critters.mp4',
  '/World/Parkour/Parkour.mp4',
  '/World/Web Climber/Web Climber.mp4'
];

export const VideoBackgroundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [topVideo, setTopVideo] = useState('');
  const [bottomVideo, setBottomVideo] = useState('');
  const initialized = useRef(false);

  const refreshVideos = () => {
    const shuffled = [...worldVideos].sort(() => Math.random() - 0.5);
    setTopVideo(shuffled[0]);
    setBottomVideo(shuffled[1]);
  };

  useEffect(() => {
    if (!initialized.current) {
      refreshVideos();
      initialized.current = true;
    }
  }, []);

  return (
    <VideoBackgroundContext.Provider value={{ topVideo, bottomVideo, refreshVideos }}>
      {children}
    </VideoBackgroundContext.Provider>
  );
};
```

**Test:** Create context, wrap Match component, verify no errors

### Step 4.2: Update TurnDeciderPhase to USE Context (Not Create Hooks)

```typescript
// At top of TurnDeciderPhase component
import { useVideoBackground } from '@/context/VideoBackgroundContext';

// Inside component (NO new hooks, just use existing context)
const { topVideo, bottomVideo } = useVideoBackground();

// In render, add video backgrounds to containers
<div className="relative w-full h-full">
  {topVideo && (
    <video
      src={topVideo}
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    />
  )}
  {/* Existing content */}
</div>
```

**CRITICAL:** Do NOT add useState, useRef, or useEffect to TurnDeciderPhase itself

**Test:**
1. Clear cache
2. Build
3. Load match
4. Verify turn decider shows video backgrounds
5. Verify transition to gameplay works
6. **THIS IS THE CRITICAL TEST** - Does match load after turn decider?

### Step 4.3: Replace PulseDice with SlotMachineDice (If Step 4.2 Works)

Find PulseDice usage in TurnDeciderPhase:
```typescript
// OLD:
<PulseDice size={120} />

// NEW:
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

**Test:** Turn decider dice animates correctly, match loads after

### Step 4.4: Add Swipe Transition (If Step 4.3 Works)

Wrap TurnDeciderPhase return in motion.div:
```typescript
return (
  <motion.div
    initial={{ x: '100%' }}
    animate={{ x: 0 }}
    exit={{ x: '-100%' }}
    transition={{ type: 'tween', duration: 0.5 }}
    className="absolute inset-0"
  >
    {/* Existing content */}
  </motion.div>
);
```

**Test:** Smooth swipe transition, no errors

---

## Testing Protocol

### After Each Step:

1. **Clear Cache:**
   ```powershell
   Remove-Item -Path ".next" -Recurse -Force
   ```

2. **Run Dev Build:**
   ```powershell
   npm run dev
   ```

3. **Test Sequence:**
   - Load dashboard
   - Create/join match
   - Go through turn decider
   - Load into gameplay
   - Use abilities (if that phase)
   - Complete full turn
   - Check console for errors

4. **If Errors Occur:**
   - Note exact error message and stack trace
   - Note which step caused it
   - Revert that specific step
   - Document in REBUILD_REFERENCE.md
   - Try alternative approach

5. **If Success:**
   - Commit with descriptive message
   - Move to next step

### Before Production Deploy:

- [ ] All local tests pass
- [ ] No errors in console
- [ ] No warnings in console (except known safe ones)
- [ ] Test on multiple browsers (Chrome, Safari, Firefox)
- [ ] Test on mobile device
- [ ] Full production build: `npm run build`
- [ ] Test production build locally
- [ ] Deploy: `npx vercel --prod`
- [ ] Test deployed version thoroughly

---

## Rollback Plan

If any step fails:

```powershell
# Revert specific file
git checkout HEAD -- path/to/file.tsx

# Revert last commit
git reset --soft HEAD~1

# Revert to specific commit
git reset --hard <commit-hash>

# Clear cache always after revert
Remove-Item -Path ".next" -Recurse -Force
```

---

## Success Checklist

- [ ] Phase 1: Hook imports standardized
- [ ] Phase 2: VideoPlayer component working
- [ ] Phase 3: All 5 ability animations working
  - [ ] Vital Rush
  - [ ] Luck Turner
  - [ ] Aura Forge
  - [ ] Hard Hat
  - [ ] Pan Slap
- [ ] Phase 4: Turn decider enhancements
  - [ ] Video backgrounds
  - [ ] SlotMachineDice integration
  - [ ] Swipe transition
- [ ] No React errors
- [ ] No hydration warnings
- [ ] Match loads correctly
- [ ] Deployed to production

---

**Current Status:** Ready to begin Phase 1

**Next Action:** Fix hook imports in GameplayPhase.tsx
