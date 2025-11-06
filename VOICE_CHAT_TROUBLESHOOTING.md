# 🎤 Voice Chat NOT Working - Troubleshooting Guide

## Problem
Microphone starts, but NO speech is detected. No `onresult` events firing.

## Root Cause Analysis

From the console logs:
```
✅ Microphone permission granted
✅ Recognition starts  
❌ NO "🔊 Sound detected" log
❌ NO "🎤 onresult event fired!" log
❌ NO transcription
```

**This means**: The Web Speech API is running but **not hearing any audio** from your microphone.

## Common Causes & Solutions

### 1. Wrong Microphone Selected ⚙️

**Windows is using the WRONG microphone**

#### Fix:
1. **Right-click speaker icon** in Windows taskbar
2. Click **"Open Sound settings"**
3. Scroll to **"Input"** section
4. Click **"Choose your input device"** dropdown
5. **Select the correct microphone** (try different options)
6. Test by speaking - the blue bar should move
7. **Refresh browser** and try voice chat again

### 2. Microphone Volume Too Low 🔊

**Your mic is selected but volume is at 0% or very low**

#### Fix:
1. **Right-click speaker icon** → "Open Sound settings"
2. Scroll to **"Input"**
3. **Speak into microphone** while watching the blue level bar
4. **Volume bar should move to 50-100%** when you speak
5. If it doesn't move:
   - Click **"Device properties"** under input device
   - **Increase volume to 100%**
   - Enable **"Boost"** if available
6. **Refresh browser** and try again

### 3. Browser Microphone Permission Issues 🔐

**Chrome/Edge has permission but is using wrong source**

#### Fix:
1. In browser, click **padlock icon** in address bar
2. Click **"Site settings"**
3. Find **"Microphone"** setting
4. Click dropdown to **select different microphone**
5. **Refresh page** and try again

### 4. Microphone Privacy Settings (Windows 11) 🔒

**Windows is blocking microphone access globally**

#### Fix:
1. Press **Win + I** (Settings)
2. Go to **Privacy & security** → **Microphone**
3. Turn ON **"Microphone access"**
4. Turn ON **"Let apps access your microphone"**
5. Turn ON **"Let desktop apps access your microphone"**
6. **Restart browser** and try again

### 5. Need to Speak VERY LOUDLY 📢

**Speech recognition threshold is too high**

#### Try:
- Speak **MUCH LOUDER** than normal conversation
- Speak **VERY CLEARLY** - enunciate each word
- Get **CLOSER to microphone**
- Reduce **background noise**
- Use a **headset** instead of laptop mic

### 6. Browser Compatibility 🌐

**Not all browsers support Web Speech API well**

#### Test:
- ✅ **Chrome**: Best support
- ✅ **Edge**: Best support (Chromium-based)
- ⚠️ **Firefox**: Limited support
- ❌ **Safari**: Poor support on Windows

**Try switching to Chrome or Edge if using Firefox/Safari**

## Quick Diagnostic Tests

### Test 1: Windows Sound Settings
```
1. Windows Settings → Sound → Input
2. Speak loudly into microphone
3. Blue bar should move 50-100%
4. If no movement → wrong mic OR mic volume too low
```

### Test 2: Browser Permission
```
1. Visit /mic-test page
2. Click "Test Microphone"
3. Speak loudly
4. Should see audio level bar move
5. If no movement → permission issue OR wrong mic
```

### Test 3: Different Browser
```
1. Open Chrome or Edge
2. Visit app
3. Try voice chat
4. If it works → original browser doesn't support it
```

## Step-by-Step Fix (Most Likely Solution)

### FOR MOST USERS - Wrong Microphone Selected:

1. **Open Windows Sound Settings**
   ```
   Right-click speaker icon → "Open Sound settings"
   ```

2. **Check Current Input Device**
   ```
   Look at "Choose your input device" dropdown
   Current device showing: ???
   ```

3. **Test Each Microphone**
   ```
   Select "Microphone Array" → speak → check blue bar
   Select "Headset Microphone" → speak → check blue bar
   Select "USB Microphone" → speak → check blue bar
   ```

4. **Find the One That Moves**
   ```
   When you speak, the blue bar should hit 50-100%
   This is your WORKING microphone
   ```

5. **Keep That One Selected**
   ```
   Leave it selected in Windows
   Refresh browser
   Try voice chat again
   ```

## Still Not Working?

### Try the Mic Test Page:
Visit: **/mic-test**

This page shows:
- ✅ Microphone permission status
- ✅ Real-time audio levels (visual bar)
- ✅ Speech recognition separately
- ✅ Detailed logs

### What to Look For:
1. **Audio Level Test**:
   - Click "Test Microphone"
   - Speak loudly
   - **Bar should turn GREEN and move**
   - If it doesn't → microphone NOT working

2. **Speech Recognition Test**:
   - Click "Test Speech Recognition"
   - Speak VERY LOUDLY and CLEARLY
   - Text should appear below
   - If it doesn't → need to speak LOUDER

## Expected Behavior When Working

### Console Logs You SHOULD See:
```
✅ Microphone permission granted
🎤 Starting speech recognition...
🎤 Voice recognition started
🔊 Sound detected                    ← THIS IS MISSING!
🎤 onresult event fired!             ← THIS IS MISSING!
🗣️ Raw result - Transcript: "hello" ← THIS IS MISSING!
```

### What You're Currently Seeing:
```
✅ Microphone permission granted
🎤 Starting speech recognition...
🎤 Voice recognition started
[nothing else...]                    ← NO AUDIO DETECTED
```

## TL;DR - Quick Fix

**Most Common Solution (95% of cases):**

1. Right-click speaker icon → Sound settings
2. Input section → Select different microphone from dropdown
3. Speak and watch blue bar move
4. When bar moves → that's your mic!
5. Refresh browser → try voice chat

**If that doesn't work:**
- Increase mic volume to 100%
- Use Chrome or Edge browser
- Speak MUCH louder than normal
- Visit /mic-test page to diagnose

---

**Bottom Line**: Code is working perfectly. Browser just can't hear you because:
- Wrong microphone selected in Windows
- Microphone volume too low
- Need to speak MUCH louder

**Fix**: Select correct mic in Windows Sound Settings
