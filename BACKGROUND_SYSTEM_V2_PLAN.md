# DashDice Background System v2.0 - Implementation Plan

## Current Problems

### 1. Ghost Backgrounds
- **Neon City**: Found in `botMatchingService.ts` line 209 - DOES NOT EXIST
- **All For Glory**: Removed from file system but still referenced in 30+ locations
- Hard-coded fallback backgrounds that don't exist

### 2. Inconsistent Formats
- Old format: `{ name, file, type }`
- New format needed: ID-based with quality-aware loading
- File paths scattered everywhere: `/backgrounds/Name.ext`
- No quality variants despite having the folder structure

### 3. Firebase Storage Issues
- Users have `ownedBackgrounds` as array of names/IDs/mixed formats
- `displayBackgroundEquipped` and `matchBackgroundEquipped` store full objects
- No migration path for users with old backgrounds

## New Structure

```
/backgrounds/
  ├── Images/              [2 backgrounds: Long Road Ahead, Relax]
  │   ├── Best Quality/    [Name.webp]
  │   ├── Medium Quality/  [Name.webp]
  │   └── Low Quality/     [Name.webp]
  │
  ├── Videos/              [5 backgrounds: As They Fall, End Of The Dragon, etc.]
  │   ├── Best Quality/    [Name.mp4]
  │   └── Medium Quality/  [Name.mp4]
  │
  └── Video Images/        [5 static frames from videos]
      ├── Best Quality/    [Name.webp]
      ├── Medium Quality/  [Name.webp]
      └── Low Quality/     [Name.webp]
```

## New System Design

### Core Concepts

1. **Single Source of Truth**: `src/config/backgrounds.new.ts`
   - `BACKGROUNDS` array contains all 7 backgrounds
   - Each has: `id`, `name`, `category` (Images/Videos), `description`, `rarity`

2. **ID-Based References**
   - Firebase stores: `{ displayBackground: 'long-road-ahead', matchBackground: 'underwater' }`
   - Arrays store: `ownedBackgrounds: ['relax', 'new-day', 'underwater']`

3. **Quality-Aware Loading**
   - Context determines quality: dashboard=best, player-card=medium, thumbnail=low
   - Mobile can force low quality
   - Videos can be requested as images (for thumbnails)

4. **Path Resolution**
   ```typescript
   resolveBackground('underwater', 'match-background')
   // Returns: { 
   //   id: 'underwater',
   //   name: 'Underwater',
   //   type: 'video',
   //   path: '/backgrounds/Videos/Best Quality/Underwater.mp4',
   //   thumbnailPath: '/backgrounds/Video Images/Low Quality/Underwater.webp',
   //   quality: 'best'
   // }
   ```

### Migration Strategy

1. **Detect Legacy Formats**
   ```typescript
   migrateLegacyBackground(oldRef)
   ```
   - Handles: name strings, file paths, old objects
   - Returns: new ID or 'relax' as fallback

2. **Remove Ghost References**
   - Delete "All For Glory" from all files
   - Remove "Neon City" from botMatchingService
   - Update defaults to 'relax' or 'long-road-ahead'

## Implementation Steps

### Phase 1: Core System (30 min)
1. ✅ Create `backgrounds.new.ts` with complete system
2. Update `BackgroundContext.tsx` to use new system
3. Create migration utilities

### Phase 2: Service Layer (45 min)
4. Update `userService.ts` - new user defaults, migration on load
5. Update `botMatchingService.ts` - remove ghosts, use new system
6. Update `matchmakingService.ts` - use resolveBackground()
7. Update `backgroundService.ts` - use new resolvers

### Phase 3: Components (60 min)
8. Update `DashboardSectionNew.tsx` - display backgrounds
9. Update `Match.tsx` - match backgrounds (top/bottom split)
10. Update `GameWaitingRoom.tsx` - waiting room backgrounds
11. Update `InventorySectionNew.tsx` - inventory grid
12. Update `FriendCard.tsx` - friend list backgrounds
13. Update player card components

### Phase 4: Firebase Migration (30 min)
14. Create migration script for existing users
15. Update Firebase security rules
16. Test with existing accounts

### Phase 5: Cleanup (20 min)
17. Remove old `backgrounds.ts` file
18. Update all imports to use `backgrounds.new.ts`
19. Delete old background files from `/public/backgrounds/`
20. Test all background usage

## Files That Need Updates

### Configuration (2 files)
- `src/config/backgrounds.ts` → REPLACE with new system
- `src/config/backgrounds.new.ts` → RENAME to backgrounds.ts

### Context (1 file)
- `src/context/BackgroundContext.tsx` - use new resolvers

### Services (4 files)
- `src/services/userService.ts` - remove "All For Glory", use IDs
- `src/services/botMatchingService.ts` - remove "Neon City"/"All For Glory"
- `src/services/matchmakingService.ts` - use resolveBackground()
- `src/services/backgroundService.ts` - use new system

### Components (10+ files)
- Dashboard: `DashboardSectionNew.tsx`
- Match: `Match.tsx`, `GameplayPhase.tsx`
- Waiting Room: `GameWaitingRoom.tsx`
- Inventory: `InventorySectionNew.tsx`, `InventoryReference.tsx`
- Friends: `FriendCard.tsx`
- Player cards and previews

### Utilities (2 files)
- `src/utils/testMatchData.ts` - update test data
- Create: `src/utils/migrateBackgrounds.ts` - migration helper

### Scripts (1 file)
- `create-test-match.js` - update test backgrounds

## Testing Checklist

- [ ] New users get correct default backgrounds
- [ ] Existing users' backgrounds migrate correctly
- [ ] Dashboard displays chosen background
- [ ] Match shows split backgrounds (top/bottom)
- [ ] Waiting room shows split backgrounds
- [ ] Inventory shows all 7 backgrounds with thumbnails
- [ ] Player cards show background previews
- [ ] Friend cards show backgrounds
- [ ] Leaderboard entries show backgrounds
- [ ] Videos autoplay and loop
- [ ] Quality switching works (best/medium/low)
- [ ] Mobile devices load appropriate quality
- [ ] No "ghost" backgrounds appear
- [ ] All Firebase reads/writes use new format

## Expected Outcome

### Before (Current)
```typescript
// Firebase
{
  ownedBackgrounds: ['Relax', 'All For Glory', 'Neon City'],
  displayBackgroundEquipped: { 
    name: 'All For Glory', 
    file: '/backgrounds/All For Glory.jpg',
    type: 'image' 
  }
}
```

### After (New)
```typescript
// Firebase
{
  ownedBackgrounds: ['relax', 'long-road-ahead', 'underwater', 'new-day'],
  displayBackground: 'underwater',
  matchBackground: 'end-of-the-dragon'
}

// Code automatically resolves to:
{
  display: {
    id: 'underwater',
    type: 'video',
    path: '/backgrounds/Videos/Best Quality/Underwater.mp4'
  },
  match: {
    id: 'end-of-the-dragon',
    type: 'video',
    path: '/backgrounds/Videos/Best Quality/End Of The Dragon.mp4'
  }
}
```

## Ready to Proceed?

This plan ensures:
- ✅ All ghost backgrounds removed
- ✅ Consistent ID-based system
- ✅ Quality-aware loading
- ✅ Backward compatibility via migration
- ✅ Clean Firebase structure
- ✅ Easy to add new backgrounds in future

**Estimated Time**: 3 hours total
**Risk Level**: Medium (requires Firebase migration)
**Testing Required**: High (affects all visual elements)
