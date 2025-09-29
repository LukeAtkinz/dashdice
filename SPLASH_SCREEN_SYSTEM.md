# Splash Screen System

## Overview

The DashDice application now includes a comprehensive splash screen system that displays MP4 videos on application load with smooth animations and device-specific content.

## Features

- **Device Detection**: Automatically detects mobile vs desktop devices and serves appropriate video content
- **Smooth Animations**: Uses Framer Motion for elegant fade-out and scale transitions
- **Fallback Support**: Multiple fallback layers to ensure splash screen always works
- **Session Management**: Only shows splash screen on first load per session
- **Skip Option**: Users can skip the splash screen after 3 seconds
- **Error Handling**: Graceful handling of video loading errors with fallback videos
- **Performance Optimized**: Efficient video loading and memory management

## File Structure

```
public/
├── Splash Screens/
│   ├── mobile.mp4      # Video for mobile devices
│   ├── desktop.mp4     # Video for desktop devices
│   └── splashscreen.mp4 # Fallback video (original)

src/
├── components/layout/
│   ├── SplashScreen.tsx    # Main splash screen component
│   └── ClientLayout.tsx    # Layout wrapper with splash integration
├── hooks/
│   └── useSplashScreen.ts  # Hook for splash screen state management
└── app/
    └── layout.tsx          # Updated root layout
```

## Usage

### Basic Implementation

The splash screen is automatically integrated into the app's root layout. No additional setup is required for basic functionality.

### Customization

#### Replace Videos

1. Replace the video files in `/public/Splash Screens/`:
   - `mobile.mp4` - Video shown on mobile devices
   - `desktop.mp4` - Video shown on desktop devices
   - `splashscreen.mp4` - Fallback video

#### Video Requirements

- **Format**: MP4 (H.264 codec recommended)
- **Duration**: Recommended 2-8 seconds for optimal user experience
- **Mobile Resolution**: 720p or lower for faster loading
- **Desktop Resolution**: 1080p or higher for quality
- **Audio**: Videos should be designed for mute playback (audio is muted)

#### Timing Customization

Modify timing in `SplashScreen.tsx`:

```typescript
// Video end delay before fade out
setTimeout(() => {
  setIsLoading(false);
  setTimeout(() => {
    onComplete();
  }, 1200); // Fade out duration
}, 300); // Delay before fade out starts
```

#### Skip Button Timing

```typescript
// Skip button appears after 3 seconds
<motion.button
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 3 }} // Change this value
  onClick={handleVideoEnd}
  // ...
>
```

### Device Detection Logic

The system detects mobile devices using:

1. **User Agent Detection**: Checks for mobile device strings
2. **Screen Size**: Considers screens ≤768px as mobile
3. **Responsive Updates**: Reacts to window resize events

### Fallback Strategy

1. **Primary**: Device-specific video (mobile.mp4 or desktop.mp4)
2. **Fallback**: Original splash video (splashscreen.mp4)
3. **Final**: Skip splash screen if all videos fail

### Session Management

- Splash screen shows only on first load per browser session
- Uses `sessionStorage` to track splash display status
- Resets when browser session ends or is manually cleared

## API Reference

### SplashScreen Component

```typescript
interface SplashScreenProps {
  onComplete: () => void; // Callback when splash completes
}
```

### useSplashScreen Hook

```typescript
const {
  showSplash,     // boolean: Should splash be shown
  isFirstLoad,    // boolean: Is this the first app load
  completeSplash, // function: Manually complete splash
  resetSplash     // function: Reset splash for testing
} = useSplashScreen();
```

### ClientLayout Component

Wraps the application content and manages splash screen overlay:

```typescript
interface ClientLayoutProps {
  children: React.ReactNode;
}
```

## Testing

### Test Splash Screen

1. **First Load**: Open application in new browser tab/window
2. **Mobile Testing**: Use browser dev tools to simulate mobile device
3. **Error Testing**: Temporarily rename video files to test fallbacks
4. **Skip Testing**: Wait 3+ seconds and click skip button

### Reset Splash for Testing

```javascript
// In browser console:
sessionStorage.removeItem('splash-shown');
location.reload();
```

## Performance Considerations

- Videos use `preload="metadata"` for faster initial load
- Splash screen is hidden from DOM after completion to free memory
- Device detection runs once and caches result
- Session storage prevents unnecessary replays

## Browser Compatibility

- **Modern Browsers**: Full support with all features
- **Older Browsers**: Graceful fallback to skip splash screen
- **Mobile Safari**: Uses `playsInline` and `webkit-playsinline` for autoplay
- **Video Codecs**: Supports any codec supported by HTML5 video element

## Troubleshooting

### Video Not Playing

1. Check video file format (MP4 recommended)
2. Verify file paths are correct
3. Check browser autoplay policies
4. Ensure videos are optimized for web

### Splash Screen Not Showing

1. Clear browser session storage
2. Check console for JavaScript errors
3. Verify video files exist in correct directory

### Performance Issues

1. Optimize video file sizes
2. Use lower resolution for mobile videos
3. Check network connection speed
4. Consider using video compression tools

## Future Enhancements

Potential future improvements:

- **Adaptive Quality**: Serve different video quality based on connection speed
- **Progressive Loading**: Show image placeholder while video loads
- **Custom Animations**: More animation options for transitions
- **Analytics**: Track splash screen completion rates
- **A/B Testing**: Support for multiple splash screen variations