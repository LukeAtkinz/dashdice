# 🚀 Quick Start: Video Compatibility Fix

This guide gets you from broken videos to working videos in **30 minutes**.

## ⚡ Immediate Fix (Critical Videos Only)

### Step 1: Install FFmpeg (if not installed)

**Windows:**
```powershell
# Using Chocolatey (recommended)
choco install ffmpeg

# OR download from: https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

### Step 2: Convert Critical Videos

Run the conversion script:

**Windows (PowerShell):**
```powershell
cd C:\Users\david\Documents\dashdice
.\scripts\convert-videos.ps1
```

**macOS/Linux (Bash):**
```bash
cd ~/Documents/dashdice
chmod +x scripts/convert-videos.sh
./scripts/convert-videos.sh
```

This will convert:
- ✅ Pan Slap.webm → Pan Slap.mp4
- ✅ Luck Turner Animation.webm → Luck Turner Animation.mp4
- ✅ x2/x3/x4multi.webm → .mp4 versions
- ✅ Generate poster images for all

**Expected Output:**
```
🎥 DashDice Video Converter
✅ ffmpeg found

🎯 Converting Ability Animations (CRITICAL)
Converting: Abilities/Animations/Pan Slap.webm
✅ Converted: Abilities/Animations/Pan Slap.mp4
   Size: 1.2MB → 580KB
✅ Poster created: Abilities/Animations/Pan Slap-poster.jpg

Converting: Abilities/Animations/Luck Turner Animation.webm
✅ Converted: Abilities/Animations/Luck Turner Animation.mp4
   Size: 890KB → 420KB
✅ Poster created: Abilities/Animations/Luck Turner Animation-poster.jpg

🎉 Conversion Complete!
```

### Step 3: Update SlotMachineDice Component

Replace video tags with VideoPlayer component:

```tsx
// src/components/dashboard/SlotMachineDice.tsx

// Add import at top
import { VideoPlayer } from '@/components/shared/VideoPlayer';

// Replace Luck Turner video (around line 570)
// BEFORE:
<video
  src="/Abilities/Animations/Luck Turner Animation.webm"
  autoPlay
  loop
  muted
  playsInline
  // ... rest of props
>
  <source src="/Abilities/Animations/Luck Turner Animation.webm" type="video/webm" />
</video>

// AFTER:
<VideoPlayer
  src="/Abilities/Animations/Luck Turner Animation"
  transparent={true}  // CRITICAL: Ability animations have transparency!
  autoPlay
  loop
  muted
  playsInline
  playbackRate={1.5}
  className="w-full h-full object-cover"
  style={{
    borderRadius: '30px',
    overflow: 'hidden',
    transform: isTopDice ? 'none' : 'scaleY(-1)',
  }}
/>

// Replace Pan Slap video (around line 608)
// BEFORE:
<video
  src="/Abilities/Animations/Pan Slap.webm"
  autoPlay
  loop={false}
  muted
  playsInline
  // ... rest of props
/>

// AFTER:
<VideoPlayer
  src="/Abilities/Animations/Pan Slap"
  transparent={true}  // CRITICAL: Ability animations have transparency!
  autoPlay
  loop={false}
  muted
  playsInline
  className="w-full h-full"
  style={{
    borderRadius: '30px',
    overflow: 'hidden',
  }}
  onEnded={() => {
    console.log('🍳 Pan Slap video finished playing');
  }}
  onError={(e) => {
    console.error('🍳 Pan Slap video failed to load:', e);
  }}
/>
```

### Step 4: Test Locally

```bash
npm run dev
```

Open in browser:
1. **Chrome DevTools**: F12 → Network tab → Throttle: "Slow 3G"
2. **Test ability animations**: Use Pan Slap or Luck Turner in a match
3. **Check console**: Look for video loading messages

### Step 5: Deploy

```powershell
git add public/Abilities public/Animations src/components
git commit -m "Add MP4 video support for mobile compatibility"
git push origin main
npx vercel --prod
```

### Step 6: Test on Real Devices

**iOS (Safari):**
1. Open DashDice on iPhone/iPad
2. Start a match
3. Activate Pan Slap ability
4. Video should play smoothly

**Android (Chrome):**
1. Open DashDice on Android phone
2. Start a match  
3. Activate Luck Turner ability
4. Video should play smoothly

---

## 🔍 Troubleshooting

### Videos still not playing on mobile?

**Check 1: File exists**
```bash
ls public/Abilities/Animations/*.mp4
```
Should show:
- Pan Slap.mp4
- Luck Turner Animation.mp4

**Check 2: Network tab**
- Open DevTools → Network
- Filter: "mp4"
- Reload page
- Status should be "200" not "404"

**Check 3: Console errors**
```
Look for:
✅ "Video loaded successfully"
❌ "Failed to load video"
```

**Check 4: Video codec**
```bash
ffmpeg -i "public/Abilities/Animations/Pan Slap.mp4"
```
Should show:
```
Video: h264 (Baseline)
Audio: aac
```

### iOS Safari specific issues?

**Solution 1: Check playsInline**
```tsx
<VideoPlayer
  playsInline  // ✅ Must be true
  muted        // ✅ Must be true for autoplay
  autoPlay     // ⚠️ Requires user interaction on iOS
/>
```

**Solution 2: Add webkit-playsinline**
Already included in VideoPlayer component, but verify:
```tsx
<video webkit-playsinline="true" />
```

**Solution 3: Baseline profile**
Re-convert video with explicit baseline:
```bash
ffmpeg -i input.webm \
  -c:v libx264 \
  -profile:v baseline \  # ← Critical for iOS
  -level 3.0 \
  -pix_fmt yuv420p \     # ← Required for Safari
  output.mp4
```

### Videos causing performance issues?

**Solution: Reduce resolution**
```bash
# Lower quality for mobile
ffmpeg -i input.mp4 \
  -vf "scale=480:-2" \  # Smaller resolution
  -crf 28 \             # Higher compression
  output-mobile.mp4
```

### Videos not autoplaying on iOS?

This is **EXPECTED** behavior. iOS requires user interaction before playing videos.

**Workaround**: Add a "Tap to Start" screen:
```tsx
const [userInteracted, setUserInteracted] = useState(false);

{!userInteracted ? (
  <button onClick={() => setUserInteracted(true)}>
    Tap to Start
  </button>
) : (
  <VideoPlayer autoPlay ... />
)}
```

---

## 📊 Success Criteria

After completing these steps, you should see:

### ✅ Desktop (Chrome/Firefox)
- Videos load instantly
- Smooth playback
- No console errors

### ✅ Mobile (iOS Safari)
- Videos load within 2 seconds
- Smooth playback (30fps)
- No console errors
- Works on 4G connection

### ✅ Mobile (Android Chrome)
- Videos load instantly
- Smooth playback
- No console errors
- Works on 3G connection

### ✅ Capacitor App (iOS/Android)
- Videos load without errors
- Autoplay works after user interaction
- No memory leaks

---

## 🎯 Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Load Time | <2s | Network tab |
| File Size | <500KB | `ls -lh` |
| FPS | 30fps | DevTools Performance |
| Memory | <50MB | Task Manager |

---

## 📞 Still Having Issues?

1. **Check VIDEO_COMPATIBILITY_PLAN.md** for full details
2. **Review console logs** for specific error messages
3. **Test with sample video**:
   ```tsx
   <VideoPlayer src="/test-video" autoPlay muted playsInline />
   ```
4. **Verify FFmpeg installation**: `ffmpeg -version`
5. **Check file permissions**: Videos must be readable

---

## 🎉 What's Next?

Once critical videos work:

1. **Phase 2**: Convert background videos
2. **Phase 3**: Add lazy loading
3. **Phase 4**: Implement bandwidth detection
4. **Phase 5**: Add quality settings

See `VIDEO_COMPATIBILITY_PLAN.md` for full roadmap.
