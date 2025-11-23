# GameWaitingRoom New Split-Screen Layout Plan

## Structure:
1. Add video state hooks (topVideo, bottomVideo) after line 149
2. Replace main content container starting at line 2747
3. Keep all the existing logic/state/effects intact
4. Only change the JSX return structure

## New Return Structure:
```tsx
<motion.div> // Keep existing
  <MatchTransition /> // Keep
  <MatchAbandonmentNotification /> // Keep
  <style jsx> // Keep
  
  {/* NEW SPLIT SCREEN */}
  <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#FFF' }}>
    {/* Top - Opponent */}
    <div style={{ flex: '0 0 50%', position: 'relative' }}>
      <video src={topVideo} />
      {opponentData ? <PlayerCard swipe-in /> : <SearchingText />}
    </div>
    
    {/* Center - VS */}
    <div style={{ position: 'absolute', top: '50%', zIndex: 100 }}>
      <motion.div layoutId="vs-morph-text">VS</motion.div>
    </div>
    
    {/* Bottom - User */}
    <div style={{ flex: '0 0 50%', position: 'relative' }}>
      <video src={bottomVideo} />
      <PlayerCard user />
    </div>
    
    {/* Leave Button Overlay */}
    <div style={{ position: 'absolute', bottom: '40px', zIndex: 200 }}>
      <button onClick={handleLeave}>Leave</button>
    </div>
  </div>
</motion.div>
```

## Key Points:
- Remove all old game mode title, profile sections
- Remove all old layout divs
- Keep Leave button logic but move to overlay
- Videos auto-play, loop, muted
- Opponent card swipes in from right when joins
- User card always visible
