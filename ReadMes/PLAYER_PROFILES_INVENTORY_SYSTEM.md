# Player Profiles & Inventory System

## Table of Contents
1. [Overview](#overview)
2. [Player Profile Structure](#player-profile-structure)
3. [Inventory System Architecture](#inventory-system-architecture)
4. [Background System](#background-system)
5. [Stats System](#stats-system)
6. [User Interface Components](#user-interface-components)
7. [Database Schema](#database-schema)
8. [State Management](#state-management)
9. [Service Layer](#service-layer)
10. [Integration Flow](#integration-flow)

---

## Overview

The Player Profiles & Inventory System in DashDice manages player identities, statistics, cosmetic items, and customization options. It provides a comprehensive framework for player progression, personalization, and visual customization across the gaming platform.

### Key Features
- **Player Profiles**: Display names, statistics, achievements
- **Inventory Management**: Item ownership, equipping, and organization
- **Background System**: Display and match backgrounds with dual equipping
- **Statistics Tracking**: Win/loss records, streaks, games played
- **Real-time Updates**: Live synchronization across Firebase
- **Visual Customization**: Rich UI for browsing and equipping items

---

## Player Profile Structure

### UserProfile Interface
```typescript
interface UserProfile {
  uid: string;                    // Firebase Auth UID
  email: string;                  // User email
  displayName: string | null;     // Player display name
  createdAt: any;                 // Account creation timestamp
  lastLoginAt: any;               // Last login timestamp
  userTag: string;                // Display name or email prefix
  
  inventory: {
    displayBackgroundEquipped: string;        // Dashboard background
    matchBackgroundEquipped: string;          // Game background
    ownedBackgrounds: string[];               // All owned backgrounds
  };
  
  stats: {
    bestStreak: number;           // Highest win streak
    currentStreak: number;        // Current win streak
    gamesPlayed: number;          // Total games played
    matchWins: number;            // Total match wins
  };
  
  settings: {
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    theme: string;
  };
  
  updatedAt: any;                 // Last update timestamp
}
```

### Player Data Format for Matchmaking
```typescript
interface PlayerData {
  playerDisplayName: string;
  playerId: string;
  displayBackgroundEquipped: string;
  matchBackgroundEquipped: string;
  playerStats: UserStats;
}
```

---

## Inventory System Architecture

### InventoryItem Interface
```typescript
interface InventoryItem {
  id: string;
  type: 'background' | 'dice' | 'avatar' | 'effect';
  name: string;
  description?: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  acquiredAt: Date;
  equipped?: boolean;
}
```

### Current Implementation Status

#### Backgrounds System (Fully Implemented)
- **Types**: Image, Video, Gradient
- **Categories**: Display (dashboard) and Match (in-game)
- **File Support**: JPG, PNG, MP4
- **Dual Equipping**: Separate backgrounds for dashboard and matches

#### Future Inventory Categories
- **Dice**: Custom dice skins and effects
- **Avatars**: Player profile pictures and representations
- **Effects**: Special visual effects and animations

---

## Background System

### Background Interface
```typescript
interface Background {
  name: string;
  file: string;        // File path or URL
  type: 'image' | 'video' | 'gradient';
}
```

### Available Backgrounds
```typescript
const availableBackgrounds = [
  { name: "All For Glory", file: "/backgrounds/All For Glory.jpg", type: "image" },
  { name: "New Day", file: "/backgrounds/New Day.mp4", type: "video" },
  { name: "On A Mission", file: "/backgrounds/On A Mission.mp4", type: "video" },
  { name: "Relax", file: "/backgrounds/Relax.png", type: "image" },
  { name: "Underwater", file: "/backgrounds/Underwater.mp4", type: "video" },
  { name: "Long Road Ahead", file: "/backgrounds/Long Road Ahead.jpg", type: "image" }
];
```

### Dual Background System

#### Display Background (Dashboard)
- **Purpose**: Shown on dashboard, lobby areas, and profile screens
- **Context**: `DisplayBackgroundEquip` from BackgroundContext
- **Storage**: `inventory.displayBackgroundEquipped` in Firebase
- **Usage**: Personal customization for non-game areas

#### Match Background (In-Game)
- **Purpose**: Shown during active matches and waiting rooms
- **Context**: `MatchBackgroundEquip` from BackgroundContext
- **Storage**: `inventory.matchBackgroundEquipped` in Firebase
- **Usage**: Competitive appearance during gameplay

### Background Rendering Logic

#### Video Backgrounds
```typescript
if (background.type === 'video') {
  return (
    <video autoPlay loop muted playsInline>
      <source src={background.file} type="video/mp4" />
    </video>
  );
}
```

#### Image Backgrounds
```typescript
if (background.type === 'image') {
  return {
    background: `url('${background.file}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };
}
```

---

## Stats System

### Stats Interface
```typescript
interface UserStats {
  bestStreak: number;     // Highest consecutive wins
  currentStreak: number;  // Current consecutive wins
  gamesPlayed: number;    // Total games played (all outcomes)
  matchWins: number;      // Total matches won
}
```

### Statistics Tracking

#### Game Completion
```typescript
// Updates gamesPlayed regardless of outcome
await UserService.updateGamePlayed(userId);
```

#### Match Win
```typescript
// Updates matchWins, currentStreak, and potentially bestStreak
await UserService.updateMatchWin(userId);
```

#### Match Loss
```typescript
// Resets currentStreak to 0, keeps bestStreak
await UserService.updateMatchLoss(userId);
```

#### Streak Logic
- **Current Streak**: Increments on wins, resets to 0 on losses
- **Best Streak**: Only updated when current streak exceeds previous best
- **Games Played**: Increments on all game completions

---

## User Interface Components

### Inventory Section Structure
```
InventorySection/
├── Filter Tabs (All, Backgrounds, Dice, Avatars, Effects)
├── Background Selector
│   ├── Display Tab
│   ├── Match Tab
│   └── Background Grid
├── Inventory Grid
└── Empty State UI
```

### Inventory Grid Features
- **Rarity Color Coding**: Visual distinction by item rarity
- **Equipped Indicators**: Clear marking of equipped items
- **Loading States**: Skeleton components during data fetch
- **Responsive Grid**: Adapts to screen size (2-4 columns)
- **Item Actions**: Equip/Unequip buttons with state feedback

### Background Selector UI
- **Dual Tabs**: Separate sections for Display and Match backgrounds
- **Preview Panel**: Large preview area showing selected background
- **Scroll Lists**: Organized background options with visual previews
- **Equip Status**: Visual indicators for currently equipped items
- **Action Buttons**: Prominent equip/equipped state buttons

### Rarity System
```typescript
const rarityColors = {
  common: 'border-gray-300 bg-gray-50',
  rare: 'border-blue-300 bg-blue-50',
  epic: 'border-purple-300 bg-purple-50',
  legendary: 'border-yellow-300 bg-yellow-50'
};
```

---

## Database Schema

### User Document Structure (Firestore)
```json
{
  "uid": "user_123",
  "email": "player@example.com",
  "displayName": "PlayerName",
  "createdAt": "timestamp",
  "lastLoginAt": "timestamp",
  "userTag": "PlayerName",
  
  "inventory": {
    "displayBackgroundEquipped": {
      "name": "Relax",
      "file": "/backgrounds/Relax.png",
      "type": "image"
    },
    "matchBackgroundEquipped": {
      "name": "Underwater",
      "file": "/backgrounds/Underwater.mp4",
      "type": "video"
    },
    "ownedBackgrounds": ["Relax", "Underwater", "New Day"]
  },
  
  "stats": {
    "bestStreak": 5,
    "currentStreak": 2,
    "gamesPlayed": 47,
    "matchWins": 23
  },
  
  "settings": {
    "notificationsEnabled": true,
    "soundEnabled": true,
    "theme": "auto"
  },
  
  "updatedAt": "timestamp"
}
```

### Background Data Storage Formats

#### Complete Background Object (Preferred)
```json
{
  "name": "Background Name",
  "file": "/path/to/background.mp4",
  "type": "video"
}
```

#### Legacy String Format (Supported)
```json
"Background Name"
```

---

## State Management

### React Context Architecture

#### InventoryContext
```typescript
interface InventoryContextType {
  inventory: InventoryItem[];
  loading: boolean;
  error: string | null;
  equipItem: (itemId: string) => Promise<void>;
  unequipItem: (itemId: string) => Promise<void>;
  refreshInventory: () => Promise<void>;
}
```

#### BackgroundContext
```typescript
interface BackgroundContextType {
  availableBackgrounds: Background[];
  DisplayBackgroundEquip: Background | null;
  MatchBackgroundEquip: Background | null;
  setDisplayBackgroundEquip: (bg: Background | null) => Promise<void>;
  setMatchBackgroundEquip: (bg: Background | null) => Promise<void>;
}
```

### Real-time Synchronization
- **Firebase Listeners**: Real-time updates using `onSnapshot`
- **Context Updates**: Automatic state updates across components
- **Error Handling**: Graceful degradation and retry logic
- **Optimistic Updates**: Immediate UI feedback with Firebase sync

---

## Service Layer

### UserService
```typescript
class UserService {
  // Profile management
  static getUserProfile(uid: string): Promise<UserProfile | null>
  static convertToPlayerData(profile: UserProfile): PlayerData
  
  // Statistics updates
  static updateGamePlayed(uid: string): Promise<void>
  static updateMatchWin(uid: string): Promise<void>
  static updateMatchLoss(uid: string): Promise<void>
  
  // Debug utilities
  static debugUserStats(uid: string): Promise<void>
}
```

### BackgroundService
```typescript
class BackgroundService {
  // Background management
  static updateEquippedBackground(userId: string, backgroundId: string): Promise<void>
  static getUserOwnedBackgrounds(ownedBackgroundIds: string[]): Background[]
  static getBackgroundSafely(backgroundId?: string): Background
  static getAllBackgrounds(): Background[]
  
  // Utility functions
  static getBackgroundUrl(background: Background): string
  static userOwnsBackground(ownedBackgrounds: string[], backgroundId: string): boolean
}
```

---

## Integration Flow

### Player Profile Loading
1. **Authentication**: User logs in via Firebase Auth
2. **Profile Fetch**: UserService loads complete profile from Firestore
3. **Context Update**: Profile data populates React contexts
4. **UI Render**: Components receive data and display current state

### Background Equipping Flow
1. **Selection**: User selects background in inventory UI
2. **Category Choice**: User chooses Display or Match category
3. **Context Update**: Background context updates with new selection
4. **Firebase Sync**: Background data saves to Firestore
5. **Real-time Update**: All connected components receive update
6. **Visual Feedback**: UI shows equipped status immediately

### Match Integration
1. **Profile Retrieval**: Game systems fetch player profile data
2. **Background Application**: Match backgrounds apply to game areas
3. **Stats Display**: Player statistics show in waiting rooms
4. **Real-time Updates**: Stats update based on match outcomes

### Statistics Update Flow
1. **Game Completion**: Match ends with defined outcome
2. **Stats Calculation**: Service layer calculates stat changes
3. **Firebase Update**: Atomic updates to user stats
4. **Context Refresh**: Stats contexts receive updated data
5. **UI Update**: Statistics display refreshes across all components

---

## Future Enhancements

### Planned Features
- **Item Shop**: Purchase system for new cosmetics
- **Achievement System**: Unlock rewards for milestones
- **Seasonal Content**: Limited-time items and themes
- **Trading System**: Player-to-player item exchange
- **Customization Editor**: User-created content tools

### Technical Improvements
- **Caching Layer**: Optimize frequently accessed data
- **Compression**: Efficient background file delivery
- **CDN Integration**: Global content distribution
- **Offline Support**: Local inventory for connectivity issues
- **Performance Monitoring**: Track system performance metrics

---

## Best Practices

### Development Guidelines
1. **Type Safety**: Use TypeScript interfaces for all data structures
2. **Error Handling**: Implement comprehensive error boundaries
3. **Performance**: Optimize image/video loading and rendering
4. **Accessibility**: Ensure keyboard navigation and screen reader support
5. **Testing**: Unit tests for all service layer functions

### Data Management
1. **Validation**: Validate all incoming data formats
2. **Migration**: Support legacy data format transitions
3. **Backup**: Regular profile data backups
4. **Privacy**: Secure handling of user information
5. **Consistency**: Maintain data integrity across updates

### User Experience
1. **Loading States**: Provide feedback during data operations
2. **Visual Feedback**: Clear indication of equipped items
3. **Responsive Design**: Optimize for all screen sizes
4. **Performance**: Smooth animations and transitions
5. **Accessibility**: Support for assistive technologies

---

*This system provides a robust foundation for player identity and customization within the DashDice gaming platform, supporting both current functionality and future expansion.*
