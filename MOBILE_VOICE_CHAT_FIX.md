# Mobile Voice Chat Fix - Auto-Restart on Android

## Problem
On mobile devices (especially Android), when users press the microphone button, the voice recognition starts but immediately stops after ~0.2 seconds, appearing to crash or close.

## Root Cause
Mobile browsers (particularly Chrome on Android) have a limitation with the Web Speech API:

1. **Android Chrome Auto-Stop Behavior**: When `continuous: true` is set, Android Chrome often automatically stops recognition after:
   - Brief period of silence (0.2-1 seconds)
   - No speech detected immediately
   - Background app switching
   - Screen locking
   - Battery optimization

2. **onend Event Fires**: When recognition stops, the `onend` event fires, setting `isListening = false`

3. **No Auto-Restart**: Previous implementation had no mechanism to restart recognition after unexpected stops

4. **User Experience**: User presses microphone → recognition starts → immediately ends → microphone appears to crash

## Solution Implemented

### 1. Added Auto-Restart Mechanism
```typescript
private shouldBeListening: boolean = false; // Track if we WANT to be listening
private autoRestartOnMobile: boolean = true; // Auto-restart on mobile
```

### 2. Modified onend Handler
```typescript
this.recognition.onend = () => {
  const wasListening = this.isListening;
  this.isListening = false;
  this.callbacks.onEnd?.();
  
  // MOBILE FIX: Auto-restart if we should still be listening
  if (this.shouldBeListening && this.isMobile() && this.autoRestartOnMobile && wasListening) {
    setTimeout(() => {
      if (this.shouldBeListening && !this.isListening) {
        this.recognition.start();
      }
    }, 100);
  }
};
```

### 3. Set shouldBeListening Flag
```typescript
public async startListening(): Promise<boolean> {
  // Set flag that we WANT to be listening (for auto-restart)
  this.shouldBeListening = true;
  this.recognition.start();
}

public stopListening() {
  // Clear flag to prevent auto-restart
  this.shouldBeListening = false;
  this.recognition.stop();
}
```

### 4. Android-Specific Optimizations
```typescript
if (this.isAndroid()) {
  this.recognition.continuous = true;
  this.recognition.interimResults = true;
  this.autoRestartOnMobile = true; // Enable auto-restart
}
```

## How It Works

1. **User presses microphone**:
   - `startListening()` called
   - `shouldBeListening = true` set
   - Recognition starts

2. **Android auto-stops recognition** (after 0.2s):
   - `onend` event fires
   - Handler checks: `shouldBeListening === true` && `isMobile()` && `wasListening`
   - Auto-restart triggered after 100ms delay

3. **Recognition restarts automatically**:
   - User doesn't notice the interruption
   - Continuous listening maintained
   - User can speak anytime

4. **User manually stops**:
   - `stopListening()` called
   - `shouldBeListening = false` set
   - `onend` fires but auto-restart skipped
   - Recognition properly stops

## Benefits

✅ **Seamless mobile experience**: Voice chat stays active even when browser auto-stops  
✅ **No user intervention**: Auto-restart happens transparently in 100ms  
✅ **Continuous listening**: User can speak anytime without re-pressing button  
✅ **Smart detection**: Only restarts when user wants to be listening  
✅ **Platform-aware**: Only applies to mobile devices where needed  
✅ **Clean shutdown**: Properly stops when user clicks microphone again  

## Testing on Mobile

### Expected Behavior
1. Press microphone button
2. Recording starts (button shows "Recording...")
3. Speak immediately or wait a few seconds
4. Recognition stays active (no immediate crash)
5. As you speak, text appears in real-time
6. Press microphone again to stop
7. Recording properly stops (no auto-restart)

### Console Logs to Verify
```
🎤 Voice recognition started
🎤 Voice recognition ended { shouldBeListening: true, wasListening: true }
📱 Mobile auto-restart: Recognition ended unexpectedly, restarting in 100ms...
📱 Mobile auto-restart: Restarting recognition now
🎤 Voice recognition started
[User speaks]
🎤 onresult event fired!
```

### If Still Having Issues

1. **Check browser compatibility**:
   - Android Chrome: ✅ Supported
   - Android Firefox: ❌ No Web Speech API
   - iOS Safari: ⚠️ Limited support (non-continuous only)

2. **Check microphone permissions**:
   - Go to site settings → Microphone → Allow
   - Restart browser after granting permission

3. **Check audio input**:
   - Ensure phone microphone is not muted
   - Ensure no headphones are blocking input
   - Speak clearly and at normal volume

4. **Check network**:
   - Web Speech API requires internet connection
   - Google's speech recognition service must be reachable

## Technical Details

### Files Modified
- `src/services/speechRecognitionService.ts`
  - Added `shouldBeListening` flag
  - Added `autoRestartOnMobile` flag
  - Modified `onend` event handler with auto-restart logic
  - Updated `startListening()` to set flag
  - Updated `stopListening()` to clear flag
  - Updated `abort()` to clear flag
  - Enhanced Android-specific optimizations

### Why 100ms Delay?
The 100ms delay before restart prevents:
- Rapid restart loops if start fails
- Browser throttling from too-frequent API calls
- Conflicts with browser's own auto-stop logic
- User confusion from immediate restart during manual stop

### Platform Detection
```typescript
private isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

private isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}
```

## Alternative Solutions Considered

### ❌ Increase silence threshold
- Cannot configure Chrome's auto-stop behavior
- Not exposed in Web Speech API

### ❌ Use non-continuous mode
- Loses real-time transcription
- User must speak immediately after start
- Worse UX than auto-restart

### ❌ Polling/heartbeat
- Wastes resources
- Doesn't prevent auto-stop
- Adds complexity

### ✅ Auto-restart on onend (CHOSEN)
- Transparent to user
- Maintains continuous listening
- Simple implementation
- Platform-aware
- Clean shutdown

## Deployment

```bash
# Commit changes
git add src/services/speechRecognitionService.ts
git commit -m "fix: Add auto-restart for mobile voice recognition"
git push origin main

# Deploy to production
vercel --prod
```

## Verification

After deployment:
1. Open app on Android phone
2. Go to game match with chat
3. Click microphone button
4. Wait 1-2 seconds (don't speak immediately)
5. Verify microphone stays active (doesn't close)
6. Speak and verify text appears
7. Click microphone again
8. Verify it properly stops (no restart)

Success criteria: ✅ Microphone stays active for >2 seconds without manual interaction

---

**Status**: ✅ IMPLEMENTED  
**Date**: 2025-11-06  
**Issue**: Mobile voice recognition closing after 0.2 seconds  
**Solution**: Auto-restart mechanism with shouldBeListening flag  
**Impact**: Mobile voice chat now works reliably on Android devices
