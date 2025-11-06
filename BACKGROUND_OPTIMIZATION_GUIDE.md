# Background Optimization System

## Overview

This system automatically serves optimized background images and videos based on the viewing context (desktop vs mobile) and usage (full display vs preview/card). This improves performance, reduces bandwidth, and provides better user experience.

## Folder Structure

```
/public/backgrounds/
├── FULL/           # Desktop full-size images only
│   ├── All For Glory.jpg
│   ├── Long Road Ahead.jpg
│   └── Relax.png
├── MOBILE/         # Mobile-optimized images + ALL videos
│   ├── All For Glory.jpg
│   ├── Long Road Ahead.jpg
│   ├── Relax.png
│   ├── New Day.mp4
│   ├── On A Mission.mp4
│   ├── Underwater.mp4
│   ├── As they fall.mp4
│   └── End of the Dragon.mp4
├── PREVIEW/        # Small thumbnails for cards/selectors
│   ├── All For Glory.png      # Always PNG for previews
│   ├── Long Road Ahead.png
│   ├── Relax.png
│   ├── New Day.png            # Video thumbnail
│   ├── On A Mission.png
│   ├── Underwater.png
│   ├── As they fall.png
│   └── End of the Dragon.png
└── [old files...]  # Legacy files (can be removed later)
```

## How It Works

### Automatic Selection Logic

**Images:**
- **Desktop Full Display** → `/backgrounds/FULL/` (high resolution)
- **Mobile Display** → `/backgrounds/MOBILE/` (optimized smaller size)
- **Preview/Cards** → `/backgrounds/PREVIEW/` (thumbnail)

**Videos:**
- **Desktop Full Display** → `/backgrounds/MOBILE/` (videos are the same for both)
- **Mobile Display** → `/backgrounds/MOBILE/` (same video)
- **Preview/Cards** → `/backgrounds/PREVIEW/` (PNG thumbnail, NOT video)

## Usage Examples

### Option 1: Using the Hook (Recommended)

The easiest way to use optimized backgrounds in React components:

```tsx
import { useOptimizedBackground } from '@/hooks/useOptimizedBackground';

function MatchComponent({ playerBackground }) {
  // Automatically selects FULL/MOBILE based on device
  const { backgroundPath, isVideo } = useOptimizedBackground(
    playerBackground, 
    'match'
  );
  
  return (
    <div>
      {isVideo ? (
        <video src={backgroundPath} autoPlay loop muted />
      ) : (
        <img src={backgroundPath} alt="Background" />
      )}
    </div>
  );
}
```

### Option 2: Using Helper Functions

For more control or non-React contexts:

```typescript
import { getSmartBackgroundPath } from '@/config/backgrounds';

// Automatic device detection
const bgPath = getSmartBackgroundPath(background, 'dashboard');

// Or with manual context
import { getOptimizedBackgroundPath } from '@/config/backgrounds';
const bgPath = getOptimizedBackgroundPath(background, 'match-mobile');
```

## Available Hooks

### `useOptimizedBackground(background, context)`

Main hook with automatic device detection.

**Contexts:**
- `'dashboard'` - Dashboard backgrounds
- `'match'` - In-match backgrounds  
- `'waiting-room'` - Waiting room backgrounds
- `'preview'` - Preview/card thumbnails

```tsx
const { backgroundPath, isMobile, isVideo, context } = useOptimizedBackground(
  userBackground,
  'dashboard'
);
```

### `useMatchBackground(background)`

Specialized hook for match backgrounds.

```tsx
const { backgroundPath, isVideo } = useMatchBackground(playerBackground);
```

### `useDashboardBackground(background)`

Specialized hook for dashboard backgrounds.

```tsx
const { backgroundPath } = useDashboardBackground(DisplayBackgroundEquip);
```

### `usePlayerCardBackground(background)`

Specialized hook for cards (always uses PREVIEW variant).

```tsx
const { backgroundPath } = usePlayerCardBackground(friendBackground);
```

## Context Types

The system supports these contexts for fine-grained control:

- `'dashboard-desktop'` - Full desktop dashboard
- `'dashboard-mobile'` - Mobile dashboard
- `'match-desktop'` - Full match view (desktop)
- `'match-mobile'` - Mobile match view
- `'waiting-room-desktop'` - Waiting room (desktop)
- `'waiting-room-mobile'` - Waiting room (mobile)
- `'preview'` - Preview cards/thumbnails
- `'leaderboard'` - Leaderboard entries
- `'friend-card'` - Friend list cards
- `'profile-viewer'` - Profile viewer

## Migration Guide

### Before (Legacy Code)

```tsx
// Old way - always uses same file
<img src={background.file} alt="Background" />

// Old way in video
<video src={background.file} autoPlay loop muted />
```

### After (Optimized)

```tsx
// New way - automatic optimization
import { useOptimizedBackground } from '@/hooks/useOptimizedBackground';

const { backgroundPath, isVideo } = useOptimizedBackground(background, 'match');

{isVideo ? (
  <video src={backgroundPath} autoPlay loop muted />
) : (
  <img src={backgroundPath} alt="Background" />
)}
```

## Where to Apply

### High Priority (Large Impact)

1. **Match Component** (`src/components/dashboard/Match.tsx`)
   - Player backgrounds (2 videos/images per match)
   - Use `'match'` context

2. **Dashboard** (`src/components/layout/SinglePageDashboard.tsx`)
   - Main background
   - Use `'dashboard'` context

3. **Waiting Room** (`src/components/dashboard/GameWaitingRoom.tsx`)
   - Opponent background preview
   - Use `'waiting-room'` context for full view
   - Use `'preview'` context for opponent card

### Medium Priority (Good Impact)

4. **Friend Cards** (`src/components/friends/FriendCard.tsx`)
   - Use `'friend-card'` or `'preview'` context

5. **Leaderboard** (`src/components/ranked/Leaderboard.tsx`)
   - Use `'leaderboard'` or `'preview'` context

6. **Profile Viewer** (`src/components/profile/UserProfileViewer.tsx`)
   - Use `'profile-viewer'` or `'preview'` context

### Low Priority (Small Impact but Good for Consistency)

7. **Inventory/Background Selector**
   - Use `'preview'` context for thumbnails

8. **Match History**
   - Use `'preview'` context

## Implementation Checklist

- [ ] Update Match.tsx to use `useMatchBackground`
- [ ] Update SinglePageDashboard.tsx to use `useDashboardBackground`
- [ ] Update GameWaitingRoom.tsx to use `useWaitingRoomBackground` and `usePlayerCardBackground`
- [ ] Update FriendCard.tsx to use `usePlayerCardBackground`
- [ ] Update Leaderboard.tsx to use `usePlayerCardBackground`
- [ ] Update ProfileViewer.tsx to use `usePlayerCardBackground`
- [ ] Update InventoryReference.tsx for preview context
- [ ] Test on both desktop and mobile devices
- [ ] Verify all three folders (FULL/MOBILE/PREVIEW) have correct files
- [ ] Remove old background files once migration is complete

## Testing

### Quick Test Checklist

1. **Desktop:**
   - [ ] Dashboard loads FULL size images
   - [ ] Match loads FULL size images
   - [ ] Videos play from MOBILE folder
   - [ ] Friend cards show PREVIEW thumbnails

2. **Mobile:**
   - [ ] Dashboard loads MOBILE size images
   - [ ] Match loads MOBILE size images  
   - [ ] Videos play from MOBILE folder
   - [ ] Cards show PREVIEW thumbnails

3. **Performance:**
   - [ ] Page load times improved
   - [ ] Network tab shows smaller image sizes on mobile
   - [ ] Preview images load quickly

## Performance Benefits

### Before
- Desktop loading 4K images on mobile: **~3-5MB** per background
- Friend cards loading full videos: **~10-20MB** per card
- Leaderboard with 10 entries: **~50MB** of backgrounds

### After  
- Mobile loading optimized images: **~300-800KB** per background
- Friend cards loading PNG thumbnails: **~50-100KB** per card
- Leaderboard with 10 entries: **~1MB** of backgrounds

**Result: ~50-80% reduction in background-related bandwidth** 📉

## Troubleshooting

### Images not loading?

Check that files exist in the correct folders:
```bash
# Check FULL folder (desktop images only)
ls public/backgrounds/FULL/

# Check MOBILE folder (mobile images + ALL videos)
ls public/backgrounds/MOBILE/

# Check PREVIEW folder (thumbnails only, all PNG)
ls public/backgrounds/PREVIEW/
```

### Videos still using old paths?

Make sure you're using the hook or helper functions, not direct `background.file`.

### Preview showing video instead of thumbnail?

Preview context always returns the PNG thumbnail from PREVIEW folder. If you see a video, you're not using the preview context correctly.

## Notes

- **Videos are NOT duplicated** - they only exist in `/MOBILE/` folder
- **Preview thumbnails are ALWAYS PNG** - even for videos
- **Old files can stay** until you confirm everything works
- **Backwards compatible** - works with legacy background format too

## Support

If you encounter issues:
1. Check that all three folders have the correct files
2. Verify you're using the hooks or helper functions
3. Check browser console for 404 errors on background paths
4. Test on both desktop and mobile devices
