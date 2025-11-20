ok# 🎭 Transparent Video Encoding Guide

## Critical: Transparency Requires Specific Formats

**MP4 does NOT support transparency!** For ability animations and overlays with alpha channel, you MUST use:

1. **WebM with VP8/VP9 alpha** (Chrome, Firefox, Android)
2. **HEVC with alpha in MOV** (Safari, iOS)

---

## ✅ You Already Have These!

Good news - you already have the correct formats:
- `Pan Slap.webm` ✅ (Chrome/Android)
- `Pan Slap.mov` ✅ (Safari/iOS)
- `Luck Turner Animation.webm` ✅ (Chrome/Android)

**No conversion needed for transparent videos!** Just use the VideoPlayer component with `transparent={true}`.

---

## 📋 Corrected Video Strategy

### Background Videos (No Transparency)
Use: **MP4 + WebM**
```tsx
<VideoPlayer 
  src="/backgrounds/New Day" 
  transparent={false}  // Will use MP4 first, WebM fallback
/>
```

### Ability Animations (WITH Transparency)
Use: **WebM + MOV**
```tsx
<VideoPlayer 
  src="/Abilities/Animations/Pan Slap" 
  transparent={true}  // Will use WebM first, MOV for Safari
  autoPlay
  muted
  playsInline
/>
```

---

## 🎬 If You Need to Convert Transparent Videos

### From After Effects / Premiere Pro

**Export Settings:**

#### For Chrome/Android (WebM VP8 with Alpha):
```
Format: WebM
Codec: VP8
Quality: High
☑️ Enable Alpha Channel
Resolution: 720p
Frame Rate: 30fps
```

#### For Safari/iOS (HEVC MOV with Alpha):
```
Format: QuickTime (MOV)
Codec: Apple ProRes 4444 (preserves alpha)
Quality: High
Resolution: 720p
Frame Rate: 30fps
```

### Using FFmpeg

#### Convert existing transparent video to WebM with alpha:
```bash
ffmpeg -i "Pan Slap.mov" \
  -c:v libvpx \
  -pix_fmt yuva420p \
  -auto-alt-ref 0 \
  -b:v 1M \
  -an \
  "Pan Slap.webm"
```

**Key flags for transparency:**
- `-pix_fmt yuva420p` = YUV with alpha channel
- `-auto-alt-ref 0` = Prevents artifacts with alpha

#### Convert to HEVC MOV with alpha (for iOS):
```bash
# Note: macOS only (requires VideoToolbox)
ffmpeg -i "Pan Slap.webm" \
  -c:v hevc_videotoolbox \
  -alpha_quality 1 \
  -allow_sw 1 \
  -pix_fmt yuva420p \
  "Pan Slap.mov"
```

**Windows alternative (ProRes with alpha):**
```bash
ffmpeg -i "Pan Slap.webm" \
  -c:v prores_ks \
  -profile:v 4444 \
  -pix_fmt yuva444p10le \
  "Pan Slap.mov"
```

---

## 🔍 Verify Transparency is Preserved

```bash
# Check if video has alpha channel
ffmpeg -i "Pan Slap.webm" 2>&1 | grep -i "yuva\|alpha"

# Should show: yuva420p (planar YUV 4:2:0 with alpha)
```

---

## 📱 Browser Support

| Format | Chrome | Firefox | Safari | iOS | Android |
|--------|--------|---------|--------|-----|---------|
| WebM VP8 Alpha | ✅ | ✅ | ❌ | ❌ | ✅ |
| WebM VP9 Alpha | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| HEVC MOV Alpha | ❌ | ❌ | ✅ | ✅ | ❌ |
| ProRes MOV Alpha | ⚠️ | ⚠️ | ✅ | ✅ | ❌ |

**Strategy:** Provide BOTH WebM (for Chrome/Android) and MOV (for Safari/iOS)

---

## 🎯 Updated Component Usage

### SlotMachineDice.tsx (Transparent Animations)

```tsx
import { VideoPlayer } from '@/components/shared/VideoPlayer';

// Luck Turner (transparent overlay)
<VideoPlayer
  src="/Abilities/Animations/Luck Turner Animation"
  transparent={true}  // ← KEY: Uses WebM + MOV
  autoPlay
  loop
  muted
  playsInline
  playbackRate={1.5}
  className="w-full h-full object-cover"
  style={{
    borderRadius: '30px',
    transform: isTopDice ? 'none' : 'scaleY(-1)',
  }}
/>

// Pan Slap (transparent overlay)
<VideoPlayer
  src="/Abilities/Animations/Pan Slap"
  transparent={true}  // ← KEY: Uses WebM + MOV
  autoPlay
  loop={false}
  muted
  playsInline
  className="w-full h-full"
  style={{
    borderRadius: '30px',
  }}
  onEnded={() => console.log('Pan Slap complete')}
/>
```

### Match.tsx (Background Videos - No Transparency)

```tsx
// Background video (not transparent)
<VideoPlayer
  src="/backgrounds/New Day"
  transparent={false}  // ← Uses MP4 + WebM
  autoPlay
  loop
  muted
  playsInline
  className="absolute inset-0 w-full h-full object-cover"
/>
```

---

## ⚠️ Common Mistakes

### ❌ WRONG: Using MP4 for transparent animations
```tsx
<video src="/Abilities/Animations/Pan Slap.mp4" />
// NO! MP4 doesn't support transparency
```

### ✅ CORRECT: Using WebM + MOV
```tsx
<VideoPlayer 
  src="/Abilities/Animations/Pan Slap" 
  transparent={true} 
/>
// YES! Will load WebM (Chrome) or MOV (Safari)
```

---

## 📊 File Size Comparison

| File | Format | Size | Transparency | Use Case |
|------|--------|------|--------------|----------|
| Pan Slap.webm | WebM VP8 | 873 KB | ✅ Yes | Chrome/Android |
| Pan Slap.mov | ProRes 4444 | 59.8 MB | ✅ Yes | Safari/iOS |
| Background.mp4 | H.264 | 2.1 MB | ❌ No | All browsers |

**Note:** MOV files are much larger due to ProRes codec, but necessary for Safari alpha support.

---

## 🎨 Alpha Channel Best Practices

1. **Use WebM for web delivery** (smaller, widely supported)
2. **Keep MOV for Safari fallback** (larger but required)
3. **Avoid MP4 entirely** for transparent content
4. **Test transparency** by placing video over colored background
5. **Optimize WebM** using VP8 (better compatibility than VP9)

---

## 🔧 Debugging Transparency Issues

### Video appears solid black on Safari?
- Safari is loading WebM instead of MOV
- Check source order in VideoPlayer component
- Ensure MOV file has HEVC or ProRes codec

### Transparency works on desktop but not mobile?
- Check if MOV file is loading on iOS
- Verify WebM has `yuva420p` pixel format
- Test on actual device (not simulator)

### Video has jagged edges?
- Increase encoding quality
- Use VP8 instead of VP9 for WebM
- Ensure source video has clean alpha channel

---

## Summary

**For Transparent Videos (Abilities):**
- ✅ WebM with VP8 alpha (Chrome/Android)
- ✅ MOV with HEVC/ProRes alpha (Safari/iOS)
- ❌ Never use MP4

**For Background Videos:**
- ✅ MP4 with H.264 (all browsers)
- ✅ WebM for optional better compression

**VideoPlayer Component:**
```tsx
transparent={true}  // Uses WebM + MOV
transparent={false} // Uses MP4 + WebM (default)
```

Your existing files are perfect - no conversion needed! Just use `transparent={true}` prop.
