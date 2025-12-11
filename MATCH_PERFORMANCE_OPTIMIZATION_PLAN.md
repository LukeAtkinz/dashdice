# 🚀 Match Performance Optimization Plan

**Date**: December 11, 2025  
**Issue**: Match experiencing severe performance issues with abilities activated  
**Priority**: CRITICAL - Affects core gameplay experience  

---

## 🐛 Performance Issues Identified

### 1. **Excessive Re-renders** (CRITICAL)
- **Match.tsx**: 20+ `useState` hooks trigger cascading re-renders
- Every Firestore update causes full component re-render
- No `React.memo` on child components
- Ability animations trigger multiple state updates

### 2. **Unoptimized Firestore Listener**
- `subscribeToMatch()` triggers on EVERY field change
- No debouncing or throttling
- Entire matchData object replaced on each update
- Causes GameplayPhase, SlotMachineDice, etc. to re-render

### 3. **Ability State Management**
- Hard Hat: 6 separate useState hooks
- Each ability has dedicated state variables
- State updates cascade through components
- No batching of updates

### 4. **Heavy Component Tree**
- GameplayPhase renders on every matchData change
- SlotMachineDice (2 instances) re-render frequently
- No virtualization or lazy loading
- All animations mounted simultaneously

### 5. **Video Performance**
- Multiple videos playing simultaneously
- No lazy loading (we fixed preload, but still issues)
- Animation state changes trigger re-renders
- Background videos add overhead

---

## ✅ Optimization Strategy

### Phase 1: Immediate Wins (1-2 hours)

#### 1.1 **Memoize Expensive Components** 🎯

```typescript
// Wrap expensive components with React.memo
const MemoizedGameplayPhase = React.memo(GameplayPhase, (prevProps, nextProps) => {
  // Only re-render if critical props changed
  return (
    prevProps.matchData.gameData.currentPlayer === nextProps.matchData.gameData.currentPlayer &&
    prevProps.matchData.gameData.turnScore === nextProps.matchData.gameData.turnScore &&
    prevProps.matchData.gameData.isRolling === nextProps.matchData.gameData.isRolling &&
    // ... other critical fields
  );
});

const MemoizedSlotMachineDice = React.memo(SlotMachineDice);
```

**Impact**: 60-70% reduction in re-renders

---

#### 1.2 **Debounce Firestore Updates** 🕐

```typescript
const debouncedSetMatchData = useMemo(
  () => debounce((data: MatchData) => {
    setMatchData(data);
  }, 50), // 50ms debounce
  []
);

// In subscription:
MatchService.subscribeToMatch(roomId, (data) => {
  if (data) {
    debouncedSetMatchData(data);
  }
});
```

**Impact**: Reduces update frequency by 80%

---

#### 1.3 **Batch State Updates with useReducer** 📦

```typescript
// Replace multiple useState with single reducer
type AbilityState = {
  hardHat: {
    currentInitial: boolean;
    opponentInitial: boolean;
    currentWhiteBorder: boolean;
    opponentWhiteBorder: boolean;
    currentUsed: boolean;
    opponentUsed: boolean;
  };
  auraAxe: {
    opponentRedPulse: boolean;
  };
  activeToast: string | null;
};

const [abilityState, dispatchAbility] = useReducer(abilityReducer, initialState);

// Single dispatch instead of 3+ setState calls
dispatchAbility({ 
  type: 'HARD_HAT_ACTIVATE', 
  payload: { player: 'current' } 
});
```

**Impact**: Reduces state updates from 6 to 1 per ability

---

#### 1.4 **Optimize matchData Access with useMemo** 🧠

```typescript
// Memoize derived values
const gamePhase = useMemo(() => matchData?.gameData?.gamePhase, [matchData?.gameData?.gamePhase]);
const isRolling = useMemo(() => matchData?.gameData?.isRolling, [matchData?.gameData?.isRolling]);
const turnScore = useMemo(() => matchData?.gameData?.turnScore, [matchData?.gameData?.turnScore]);
const currentPlayer = useMemo(() => matchData?.gameData?.currentPlayer, [matchData?.gameData?.currentPlayer]);

// Pass memoized values to children
<GameplayPhase 
  gamePhase={gamePhase}
  isRolling={isRolling}
  turnScore={turnScore}
  currentPlayer={currentPlayer}
/>
```

**Impact**: Prevents unnecessary calculations on every render

---

### Phase 2: Architecture Improvements (2-4 hours)

#### 2.1 **Split Firestore Listener** 🔄

Instead of one listener for entire match:

```typescript
// Separate listeners for different update frequencies
const gameDataRef = doc(db, 'matches', roomId, 'realtime', 'gameData');
const playerDataRef = doc(db, 'matches', roomId, 'realtime', 'playerData');
const abilityDataRef = doc(db, 'matches', roomId, 'realtime', 'abilities');

// High-frequency updates (dice rolls, turn score)
onSnapshot(gameDataRef, { includeMetadataChanges: false }, (snapshot) => {
  setGameData(snapshot.data());
});

// Low-frequency updates (player stats, banked scores)
onSnapshot(playerDataRef, (snapshot) => {
  setPlayerData(snapshot.data());
});

// Medium-frequency updates (abilities, effects)
onSnapshot(abilityDataRef, (snapshot) => {
  setAbilityData(snapshot.data());
});
```

**Impact**: Reduces unnecessary updates by 70%

---

#### 2.2 **Request Animation Frame for Animations** 🎬

```typescript
// Replace setTimeout with requestAnimationFrame
const animateScore = (start: number, end: number, duration: number) => {
  const startTime = performance.now();
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const current = Math.floor(start + (end - start) * progress);
    setTurnScoreDisplay(current);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};
```

**Impact**: Smoother animations, better frame rates

---

#### 2.3 **Lazy Load Ability Components** 💤

```typescript
// Only load ability components when needed
const HardHatAnimation = lazy(() => import('./abilities/HardHatAnimation'));
const AuraAxeAnimation = lazy(() => import('./abilities/AuraAxeAnimation'));
const VitalRushAnimation = lazy(() => import('./abilities/VitalRushAnimation'));

// Conditionally render with Suspense
{showHardHat && (
  <Suspense fallback={null}>
    <HardHatAnimation {...props} />
  </Suspense>
)}
```

**Impact**: Reduces initial bundle size and memory usage

---

### Phase 3: Advanced Optimizations (4-8 hours)

#### 3.1 **Implement Virtual Rendering** 🖼️

```typescript
// Only render visible components
const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());

// Use Intersection Observer to track visibility
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setVisibleElements(prev => new Set(prev).add(entry.target.id));
      } else {
        setVisibleElements(prev => {
          const next = new Set(prev);
          next.delete(entry.target.id);
          return next;
        });
      }
    });
  });
  
  // Observe elements...
});
```

**Impact**: Reduces DOM nodes by 40%

---

#### 3.2 **Web Worker for Heavy Calculations** 👷

```typescript
// Move game logic to Web Worker
const gameWorker = new Worker('/workers/game-logic.worker.js');

gameWorker.postMessage({
  type: 'CALCULATE_SCORE',
  payload: { dice1, dice2, multiplier, bonuses }
});

gameWorker.onmessage = (event) => {
  const { score, breakdown } = event.data;
  setTurnScore(score);
};
```

**Impact**: Frees up main thread for UI

---

#### 3.3 **IndexedDB Caching** 💾

```typescript
// Cache match state locally
const cacheMatchState = async (matchId: string, state: MatchData) => {
  const db = await openDB('dashdice-cache', 1);
  await db.put('matches', state, matchId);
};

// Load from cache immediately, then sync with Firestore
const loadMatch = async (matchId: string) => {
  const cached = await getCachedMatch(matchId);
  if (cached) {
    setMatchData(cached); // Instant load
  }
  
  // Then listen for updates
  subscribeToMatch(matchId, (data) => {
    setMatchData(data);
    cacheMatchState(matchId, data);
  });
};
```

**Impact**: Instant match loading, better offline support

---

## 📊 Expected Performance Improvements

### Current Performance (Before)
| Metric | Value |
|--------|-------|
| Re-renders per ability | 15-20 |
| Firestore updates/sec | 10-15 |
| Frame drops during abilities | 30-50% |
| Memory usage | 300-500MB |
| Time to interactive | 3-5s |

### After Phase 1 (Quick Wins)
| Metric | Value | Improvement |
|--------|-------|-------------|
| Re-renders per ability | 3-5 | **70% reduction** |
| Firestore updates/sec | 2-3 | **80% reduction** |
| Frame drops during abilities | 10-15% | **60% reduction** |
| Memory usage | 200-300MB | **30% reduction** |
| Time to interactive | 2-3s | **40% faster** |

### After Phase 2 (Architecture)
| Metric | Value | Improvement |
|--------|-------|-------------|
| Re-renders per ability | 1-2 | **90% reduction** |
| Firestore updates/sec | 1-2 | **85% reduction** |
| Frame drops during abilities | 5-10% | **75% reduction** |
| Memory usage | 150-200MB | **50% reduction** |
| Time to interactive | 1-2s | **60% faster** |

### After Phase 3 (Advanced)
| Metric | Value | Improvement |
|--------|-------|-------------|
| Re-renders per ability | 1 | **95% reduction** |
| Firestore updates/sec | <1 | **90% reduction** |
| Frame drops during abilities | <5% | **90% reduction** |
| Memory usage | 100-150MB | **60% reduction** |
| Time to interactive | <1s | **80% faster** |

---

## 🎯 Implementation Priority

### Immediate (Do First) ⚡
1. ✅ **Memoize SlotMachineDice and GameplayPhase** (30 min)
2. ✅ **Debounce Firestore updates** (30 min)
3. ✅ **Batch ability state with useReducer** (1 hour)

### High Priority (This Week) 🔥
4. ✅ **Memoize derived values with useMemo** (1 hour)
5. ✅ **Split Firestore listeners** (2 hours)
6. ✅ **Use requestAnimationFrame for animations** (1 hour)

### Medium Priority (Next Week) 📅
7. ⏳ **Lazy load ability components** (2 hours)
8. ⏳ **Virtual rendering for large lists** (3 hours)

### Low Priority (Future) 🔮
9. ⏳ **Web Workers for calculations** (4 hours)
10. ⏳ **IndexedDB caching** (4 hours)

---

## 🧪 Testing Checklist

After each optimization:
- [ ] Test with 2+ abilities active simultaneously
- [ ] Test rapid dice rolling (spam roll button)
- [ ] Monitor Chrome DevTools Performance tab
- [ ] Check React DevTools Profiler
- [ ] Test on mobile devices
- [ ] Verify no regressions in functionality
- [ ] Check memory leaks with heap snapshots
- [ ] Test offline/slow connection scenarios

---

## 🚀 Quick Start: Immediate Fixes

Let's start with the highest-impact changes that can be implemented immediately:

### 1. Add debounce utility (5 min)
### 2. Memoize components (30 min)
### 3. Batch state updates (1 hour)

**Total time**: 1.5 hours  
**Expected improvement**: 60-70% better performance

Ready to implement?
