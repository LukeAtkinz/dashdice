# 🎒 DashDice Inventory System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Overview](#architecture-overview)
3. [Inventory Data Structure](#inventory-data-structure)
4. [Background Integration](#background-integration)
5. [Item Categories](#item-categories)
6. [Inventory Context & State Management](#inventory-context--state-management)
7. [User Interface Components](#user-interface-components)
8. [Firebase Integration](#firebase-integration)
9. [Service Layer](#service-layer)
10. [Equipping System](#equipping-system)
11. [Inventory Operations](#inventory-operations)
12. [Error Handling & Performance](#error-handling--performance)
13. [Future Expansion](#future-expansion)

## System Overview

The DashDice Inventory System is a comprehensive item management framework that allows players to collect, organize, and equip cosmetic items. The system is tightly integrated with the background customization system and provides a foundation for future cosmetic features like dice skins, avatars, and visual effects.

### Core Features
- **Multi-Category Item Management**: Backgrounds, dice, avatars, and effects
- **Dual Background System**: Separate display and match backgrounds
- **Real-time Synchronization**: Firebase-powered state management
- **Rarity System**: Common, rare, epic, and legendary items
- **Equipment Management**: Single-item equipping per category
- **Visual Inventory Grid**: Responsive item browsing interface

### Key Relationships
- **Background System**: Direct integration with display and match backgrounds
- **User Profiles**: Inventory data stored in user documents
- **Match System**: Background items applied during gameplay
- **Statistics Tracking**: Future integration with achievement systems

## Architecture Overview

The inventory system follows a layered architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                            │
│  InventoryGrid • BackgroundSelector • Item Cards           │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                  React Context Layer                       │
│  InventoryContext • BackgroundContext • State Management   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                           │
│  InventoryService • BackgroundService • Item Operations    │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Firebase Firestore                       │
│    User Documents • Real-time Listeners • Transactions     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction**: Player interacts with inventory UI
2. **Context Update**: React context processes the action
3. **Service Layer**: Business logic validates and processes
4. **Firebase Sync**: Data persists to Firestore database
5. **Real-time Update**: All connected components receive updates
6. **UI Refresh**: Interface reflects the new state

## Inventory Data Structure

### Core InventoryItem Interface

```typescript
interface InventoryItem {
  id: string;                                    // Unique item identifier
  type: 'background' | 'dice' | 'avatar' | 'effect'; // Item category
  name: string;                                  // Display name
  description?: string;                          // Optional description
  imageUrl: string;                             // Preview image URL
  rarity: 'common' | 'rare' | 'epic' | 'legendary'; // Rarity level
  acquiredAt: Date;                             // When item was obtained
  equipped?: boolean;                           // Currently equipped status
}
```

### Extended Background Item

```typescript
interface BackgroundInventoryItem extends InventoryItem {
  type: 'background';
  background: {
    name: string;                               // Background name
    file: string;                              // File path or URL
    type: 'image' | 'video' | 'gradient';     // Background type
  };
  category: 'display' | 'match' | 'both';     // Usage category
}
```

### Rarity System

```typescript
const RARITY_CONFIG = {
  common: {
    color: '#9CA3AF',           // Gray
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    dropRate: 60               // 60% chance
  },
  rare: {
    color: '#3B82F6',           // Blue
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    dropRate: 25               // 25% chance
  },
  epic: {
    color: '#8B5CF6',           // Purple
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    dropRate: 12               // 12% chance
  },
  legendary: {
    color: '#F59E0B',           // Gold
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    dropRate: 3                // 3% chance
  }
};
```

### User Inventory Storage

```typescript
// Firebase user document structure
interface UserDocument {
  uid: string;
  inventory: InventoryItem[];                   // All owned items
  
  // Background-specific storage
  inventory: {
    displayBackgroundEquipped: Background;      // Currently equipped display background
    matchBackgroundEquipped: Background;        // Currently equipped match background
    ownedBackgrounds: string[];                // Array of owned background IDs
  };
  
  // Legacy support
  equippedBackground?: string;                  // Deprecated single background
  ownedBackgrounds?: string[];                  // Deprecated background array
}
```

## Background Integration

The inventory system has deep integration with the background system, providing dual equipping capabilities:

### Dual Background Architecture

```typescript
// Background Context Integration
const BackgroundContext = {
  // Display backgrounds (dashboard, menus, profiles)
  DisplayBackgroundEquip: Background | null;
  setDisplayBackgroundEquip: (bg: Background | null) => Promise<void>;
  
  // Match backgrounds (in-game, waiting rooms)
  MatchBackgroundEquip: Background | null;
  setMatchBackgroundEquip: (bg: Background | null) => Promise<void>;
  
  // Available backgrounds
  availableBackgrounds: Background[];
};
```

### Background Data Structure

```typescript
interface Background {
  name: string;                                 // Display name
  file: string;                                // File path (image/video)
  type: 'image' | 'video' | 'gradient';       // Background type
}
```

### Background-Inventory Integration Flow

1. **Background Selection**: User selects background in inventory
2. **Category Choice**: User chooses display or match application
3. **Context Update**: BackgroundContext updates with new selection
4. **Firebase Persistence**: Background data saves to user document
5. **Real-time Sync**: All components receive updated background
6. **Visual Application**: Background applies to appropriate areas

### Background Rendering System

```typescript
// Image Background Rendering
const renderImageBackground = (background: Background) => {
  if (background.type === 'image') {
    return {
      background: `url('${background.file}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }
};

// Video Background Rendering
const renderVideoBackground = (background: Background) => {
  if (background.type === 'video') {
    return (
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
        <source src={background.file} type="video/mp4" />
      </video>
    );
  }
};
```

## Item Categories

The inventory system supports multiple item categories with extensible architecture:

### Current Categories

#### 1. Backgrounds
- **Purpose**: Visual customization for dashboard and matches
- **Types**: Image, video, gradient backgrounds
- **Dual Equipping**: Separate display and match backgrounds
- **Implementation Status**: Fully implemented

```typescript
const backgroundItem: InventoryItem = {
  id: 'bg_underwater_001',
  type: 'background',
  name: 'Underwater Serenity',
  description: 'Peaceful underwater scene with flowing kelp',
  imageUrl: '/backgrounds/Underwater.mp4',
  rarity: 'epic',
  acquiredAt: new Date(),
  equipped: false
};
```

#### 2. Dice (Planned)
- **Purpose**: Custom dice skins and animations
- **Types**: Material skins, particle effects, animation styles
- **Features**: Sound effects, trail animations, special rolling patterns

```typescript
const diceItem: InventoryItem = {
  id: 'dice_crystal_001',
  type: 'dice',
  name: 'Crystal Dice',
  description: 'Sparkling crystal dice with rainbow reflections',
  imageUrl: '/dice-skins/crystal-preview.png',
  rarity: 'legendary',
  acquiredAt: new Date(),
  equipped: false
};
```

#### 3. Avatars (Planned)
- **Purpose**: Player profile representations
- **Types**: Static images, animated avatars, 3D models
- **Features**: Customizable accessories, expressions, poses

```typescript
const avatarItem: InventoryItem = {
  id: 'avatar_knight_001',
  type: 'avatar',
  name: 'Noble Knight',
  description: 'Heroic knight with gleaming armor',
  imageUrl: '/avatars/knight-preview.png',
  rarity: 'rare',
  acquiredAt: new Date(),
  equipped: false
};
```

#### 4. Effects (Planned)
- **Purpose**: Special visual effects and animations
- **Types**: Victory celebrations, dice roll effects, UI animations
- **Features**: Particle systems, screen effects, sound integration

```typescript
const effectItem: InventoryItem = {
  id: 'effect_fireworks_001',
  type: 'effect',
  name: 'Victory Fireworks',
  description: 'Spectacular fireworks display on match victory',
  imageUrl: '/effects/fireworks-preview.gif',
  rarity: 'epic',
  acquiredAt: new Date(),
  equipped: false
};
```

## Inventory Context & State Management

### InventoryContext Implementation

```typescript
interface InventoryContextType {
  inventory: InventoryItem[];                   // All user items
  loading: boolean;                            // Loading state
  error: string | null;                        // Error state
  addItem: (item: Omit<InventoryItem, 'id' | 'acquiredAt'>) => Promise<void>;
  equipItem: (itemId: string) => Promise<void>;
  unequipItem: (itemId: string) => Promise<void>;
  refreshInventory: () => Promise<void>;
}

const InventoryProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Real-time inventory synchronization
  useEffect(() => {
    if (!user) {
      setInventory([]);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setInventory(userData.inventory || []);
      }
    }, (error) => {
      console.error('Inventory sync error:', error);
      setError('Failed to sync inventory');
    });

    return unsubscribe;
  }, [user]);

  // Context value and provider return...
};
```

### State Management Features

1. **Real-time Synchronization**: Firebase listeners update state automatically
2. **Optimistic Updates**: Immediate UI feedback with Firebase sync
3. **Error Recovery**: Graceful handling of network issues
4. **Loading States**: User feedback during operations
5. **Context Isolation**: Separated concerns for different item types

### State Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Action   │───▶│  Context Update │───▶│ Firebase Sync   │
│  (Equip Item)   │    │  (Optimistic)   │    │  (Persistent)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲                       │
┌─────────────────┐              │                       ▼
│   UI Refresh    │◀─────────────┼───────────────────────┘
│ (State Update)  │              │
└─────────────────┘              │
                                 │
┌─────────────────┐              │
│ Real-time Sync  │──────────────┘
│ (Other Clients) │
└─────────────────┘
```

## User Interface Components

### InventoryGrid Component

The main inventory browsing interface with filtering and item management:

```typescript
interface InventoryGridProps {
  filter: 'all' | 'background' | 'dice' | 'avatar' | 'effect';
}

export const InventoryGrid: React.FC<InventoryGridProps> = ({ filter }) => {
  const { inventory, loading, equipItem, unequipItem } = useInventory();

  const filteredInventory = filter === 'all' 
    ? inventory 
    : inventory.filter(item => item.type === filter);

  const handleToggleEquip = async (item: InventoryItem) => {
    try {
      if (item.equipped) {
        await unequipItem(item.id);
      } else {
        await equipItem(item.id);
      }
    } catch (error) {
      console.error('Error toggling item equip status:', error);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'epic': return 'border-purple-300 bg-purple-50';
      case 'legendary': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  if (loading) {
    return <InventoryGridSkeleton />;
  }

  if (filteredInventory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-2">No items found</div>
        <div className="text-gray-400 text-sm">
          {filter === 'all' 
            ? 'Your inventory is empty. Play games to earn items!' 
            : `No ${filter} items in your inventory.`
          }
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredInventory.map((item) => (
        <Card 
          key={item.id} 
          className={`transition-all duration-200 hover:shadow-md ${getRarityColor(item.rarity)} ${
            item.equipped ? 'ring-2 ring-blue-500' : ''
          }`}
          padding="sm"
        >
          <CardContent>
            <div className="relative">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-24 object-cover rounded mb-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-item.svg';
                }}
              />
              {item.equipped && (
                <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  Equipped
                </div>
              )}
            </div>
            
            <h3 className="font-medium text-sm text-gray-900 mb-1 truncate">
              {item.name}
            </h3>
            
            <p className="text-xs text-gray-500 mb-2 capitalize">
              {item.rarity} {item.type}
            </p>
            
            {item.description && (
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                {item.description}
              </p>
            )}

            <Button
              size="sm"
              variant={item.equipped ? 'secondary' : 'primary'}
              className="w-full text-xs"
              onClick={() => handleToggleEquip(item)}
            >
              {item.equipped ? 'Unequip' : 'Equip'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

### Background Selector Integration

Specialized component for background inventory management:

```typescript
export const BackgroundInventorySection: React.FC = () => {
  const { availableBackgrounds, DisplayBackgroundEquip, MatchBackgroundEquip } = useBackground();
  const [activeTab, setActiveTab] = useState<'display' | 'match'>('display');
  const [selectedBackground, setSelectedBackground] = useState<Background | null>(null);

  // Convert backgrounds to inventory format
  const backgroundItems = availableBackgrounds.map((bg, index) => ({
    id: `bg_${bg.name.toLowerCase().replace(/\s+/g, '_')}_${index}`,
    type: 'background' as const,
    name: bg.name,
    imageUrl: bg.type === 'image' ? bg.file : '/placeholder-video.png',
    rarity: determineRarity(index),
    background: bg,
    acquiredAt: new Date(),
    equipped: isBackgroundEquipped(bg)
  }));

  const isBackgroundEquipped = (bg: Background) => {
    if (activeTab === 'display') {
      return DisplayBackgroundEquip?.file === bg.file;
    } else {
      return MatchBackgroundEquip?.file === bg.file;
    }
  };

  const handleEquipBackground = async (item: BackgroundInventoryItem) => {
    if (activeTab === 'display') {
      await setDisplayBackgroundEquip(item.background);
    } else {
      await setMatchBackgroundEquip(item.background);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setActiveTab('display')}
          className={`px-8 py-4 rounded-xl font-bold transition-all ${
            activeTab === 'display' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Display Backgrounds
        </button>
        <button
          onClick={() => setActiveTab('match')}
          className={`px-8 py-4 rounded-xl font-bold transition-all ${
            activeTab === 'match' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Match Backgrounds
        </button>
      </div>

      {/* Background Preview */}
      {selectedBackground && (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">{selectedBackground.name}</h3>
          <div className="relative w-full h-64 rounded-lg overflow-hidden">
            {selectedBackground.type === 'video' ? (
              <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                <source src={selectedBackground.file} type="video/mp4" />
              </video>
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `url('${selectedBackground.file}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            )}
          </div>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => handleEquipBackground(selectedBackground)}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
            >
              Equip for {activeTab === 'display' ? 'Display' : 'Match'}
            </button>
          </div>
        </div>
      )}

      {/* Background Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {backgroundItems.map((item) => (
          <BackgroundInventoryCard
            key={item.id}
            item={item}
            isSelected={selectedBackground?.name === item.name}
            isEquipped={item.equipped}
            onSelect={() => setSelectedBackground(item.background)}
            onEquip={() => handleEquipBackground(item)}
            category={activeTab}
          />
        ))}
      </div>
    </div>
  );
};
```

### Inventory Filter System

```typescript
type FilterType = 'all' | 'background' | 'dice' | 'avatar' | 'effect';

const InventoryFilters: React.FC = () => {
  const { inventory } = useInventory();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const getFilterCount = (filterType: FilterType) => {
    if (filterType === 'all') return inventory.length;
    return inventory.filter(item => item.type === filterType).length;
  };

  const filters: Array<{key: FilterType, label: string, icon: string}> = [
    { key: 'all', label: 'All Items', icon: '📦' },
    { key: 'background', label: 'Backgrounds', icon: '🎨' },
    { key: 'dice', label: 'Dice', icon: '🎲' },
    { key: 'avatar', label: 'Avatars', icon: '👤' },
    { key: 'effect', label: 'Effects', icon: '✨' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map(filter => (
        <button
          key={filter.key}
          onClick={() => setActiveFilter(filter.key)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeFilter === filter.key
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <span>{filter.icon}</span>
          <span>{filter.label}</span>
          <span className={`px-2 py-1 rounded-full text-xs ${
            activeFilter === filter.key
              ? 'bg-white/20 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {getFilterCount(filter.key)}
          </span>
        </button>
      ))}
    </div>
  );
};
```

## Firebase Integration

### Database Schema

```typescript
// Firestore user document structure
interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  
  // Inventory storage
  inventory: InventoryItem[];                   // All owned items
  
  // Background-specific storage (nested structure)
  inventory: {
    displayBackgroundEquipped: Background;      // Current display background
    matchBackgroundEquipped: Background;        // Current match background
    ownedBackgrounds: string[];                // Array of owned background IDs
  };
  
  // User statistics
  stats: {
    bestStreak: number;
    currentStreak: number;
    gamesPlayed: number;
    matchWins: number;
  };
  
  // User settings
  settings: {
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    theme: string;
  };
  
  updatedAt: Timestamp;
}
```

### Real-time Listeners

```typescript
// Inventory synchronization
useEffect(() => {
  if (!user) {
    setInventory([]);
    return;
  }

  const userRef = doc(db, 'users', user.uid);
  const unsubscribe = onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const userData = doc.data();
      
      // Update inventory state
      setInventory(userData.inventory || []);
      
      // Handle background data
      const displayBg = userData.inventory?.displayBackgroundEquipped;
      const matchBg = userData.inventory?.matchBackgroundEquipped;
      
      if (displayBg && typeof displayBg === 'object') {
        setDisplayBackgroundEquip(displayBg);
      }
      
      if (matchBg && typeof matchBg === 'object') {
        setMatchBackgroundEquip(matchBg);
      }
    }
  }, (error) => {
    console.error('Inventory subscription error:', error);
    setError('Failed to sync inventory');
  });

  return unsubscribe;
}, [user]);
```

### Data Migration Strategy

```typescript
// Handle legacy data formats
const migrateLegacyInventoryData = (userData: any): InventoryItem[] => {
  const inventory: InventoryItem[] = [];
  
  // Handle legacy background storage
  if (userData.ownedBackgrounds && Array.isArray(userData.ownedBackgrounds)) {
    userData.ownedBackgrounds.forEach((bgId: string, index: number) => {
      const background = getBackgroundById(bgId);
      if (background) {
        inventory.push({
          id: `bg_legacy_${bgId}_${index}`,
          type: 'background',
          name: background.name,
          imageUrl: background.file,
          rarity: 'common',
          acquiredAt: userData.createdAt?.toDate() || new Date(),
          equipped: bgId === userData.equippedBackground
        });
      }
    });
  }
  
  // Merge with new inventory structure
  const newInventory = userData.inventory || [];
  return [...inventory, ...newInventory];
};
```

## Service Layer

### InventoryService

Comprehensive service for inventory operations:

```typescript
export class InventoryService {
  private static readonly COLLECTION_NAME = 'inventory';

  /**
   * Get all inventory items for a user
   */
  static async getUserInventory(userId: string): Promise<InventoryItem[]> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return migrateLegacyInventoryData(userData);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching user inventory:', error);
      throw error;
    }
  }

  /**
   * Add an item to user's inventory
   */
  static async addItemToInventory(
    userId: string, 
    item: Omit<InventoryItem, 'id' | 'acquiredAt'>
  ): Promise<string> {
    try {
      const newItem: InventoryItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        acquiredAt: new Date(),
        equipped: false
      };

      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        inventory: arrayUnion(newItem),
        updatedAt: serverTimestamp()
      });

      return newItem.id;
    } catch (error) {
      console.error('Error adding item to inventory:', error);
      throw error;
    }
  }

  /**
   * Equip an item (and unequip others of the same type)
   */
  static async equipItem(userId: string, itemId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        
        const userData = userDoc.data();
        const inventory = userData.inventory || [];
        
        // Find the item to equip
        const itemToEquip = inventory.find((item: InventoryItem) => item.id === itemId);
        if (!itemToEquip) {
          throw new Error('Item not found in inventory');
        }
        
        // Update inventory: unequip same type items, equip target item
        const updatedInventory = inventory.map((item: InventoryItem) => ({
          ...item,
          equipped: item.type === itemToEquip.type ? item.id === itemId : item.equipped
        }));
        
        // Special handling for background items
        if (itemToEquip.type === 'background') {
          const backgroundData = itemToEquip.background || 
            getBackgroundByItemId(itemToEquip.id);
          
          transaction.update(userRef, {
            inventory: updatedInventory,
            'inventory.displayBackgroundEquipped': backgroundData,
            updatedAt: serverTimestamp()
          });
        } else {
          transaction.update(userRef, {
            inventory: updatedInventory,
            updatedAt: serverTimestamp()
          });
        }
      });
    } catch (error) {
      console.error('Error equipping item:', error);
      throw error;
    }
  }

  /**
   * Unequip an item
   */
  static async unequipItem(userId: string, itemId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        
        const userData = userDoc.data();
        const inventory = userData.inventory || [];
        
        // Update inventory: unequip the specific item
        const updatedInventory = inventory.map((item: InventoryItem) => ({
          ...item,
          equipped: item.id === itemId ? false : item.equipped
        }));
        
        transaction.update(userRef, {
          inventory: updatedInventory,
          updatedAt: serverTimestamp()
        });
      });
    } catch (error) {
      console.error('Error unequipping item:', error);
      throw error;
    }
  }

  /**
   * Delete an inventory item
   */
  static async deleteInventoryItem(userId: string, itemId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        
        const userData = userDoc.data();
        const inventory = userData.inventory || [];
        
        // Remove the item from inventory
        const updatedInventory = inventory.filter((item: InventoryItem) => item.id !== itemId);
        
        transaction.update(userRef, {
          inventory: updatedInventory,
          updatedAt: serverTimestamp()
        });
      });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  }

  /**
   * Get equipped items for a user
   */
  static async getEquippedItems(userId: string): Promise<InventoryItem[]> {
    try {
      const inventory = await this.getUserInventory(userId);
      return inventory.filter(item => item.equipped);
    } catch (error) {
      console.error('Error fetching equipped items:', error);
      throw error;
    }
  }

  /**
   * Grant items to user (rewards, purchases, etc.)
   */
  static async grantItems(
    userId: string, 
    items: Array<Omit<InventoryItem, 'id' | 'acquiredAt'>>
  ): Promise<string[]> {
    const itemIds: string[] = [];
    
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        
        const userData = userDoc.data();
        const inventory = userData.inventory || [];
        
        // Create new items with IDs
        const newItems: InventoryItem[] = items.map(item => {
          const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          itemIds.push(id);
          
          return {
            ...item,
            id,
            acquiredAt: new Date(),
            equipped: false
          };
        });
        
        transaction.update(userRef, {
          inventory: [...inventory, ...newItems],
          updatedAt: serverTimestamp()
        });
      });
      
      return itemIds;
    } catch (error) {
      console.error('Error granting items:', error);
      throw error;
    }
  }
}
```

### BackgroundService Integration

```typescript
export class BackgroundService {
  /**
   * Convert background to inventory item format
   */
  static backgroundToInventoryItem(
    background: Background, 
    rarity: InventoryItem['rarity'] = 'common'
  ): Omit<InventoryItem, 'id' | 'acquiredAt'> {
    return {
      type: 'background',
      name: background.name,
      description: `${background.type} background`,
      imageUrl: background.type === 'image' ? background.file : '/placeholder-video.png',
      rarity,
      equipped: false
    };
  }

  /**
   * Grant all backgrounds to new user
   */
  static async grantAllBackgroundsToUser(userId: string): Promise<void> {
    try {
      const backgroundItems = AVAILABLE_BACKGROUNDS.map((bg, index) => 
        this.backgroundToInventoryItem(bg, determineRarityByIndex(index))
      );

      await InventoryService.grantItems(userId, backgroundItems);
      
      // Set default background
      const defaultBackground = AVAILABLE_BACKGROUNDS[0];
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        'inventory.displayBackgroundEquipped': defaultBackground,
        'inventory.matchBackgroundEquipped': defaultBackground
      });
    } catch (error) {
      console.error('Error granting backgrounds to user:', error);
      throw error;
    }
  }

  /**
   * Check if user owns a specific background
   */
  static async userOwnsBackground(userId: string, backgroundName: string): Promise<boolean> {
    try {
      const inventory = await InventoryService.getUserInventory(userId);
      return inventory.some(item => 
        item.type === 'background' && item.name === backgroundName
      );
    } catch (error) {
      console.error('Error checking background ownership:', error);
      return false;
    }
  }
}
```

## Equipping System

### Single-Item Equipping Logic

The inventory system enforces single-item equipping per category:

```typescript
const equipItem = async (itemId: string) => {
  if (!user) {
    throw new Error('User must be logged in to equip items');
  }

  try {
    setLoading(true);
    setError(null);

    const item = inventory.find(item => item.id === itemId);
    if (!item) {
      throw new Error('Item not found in inventory');
    }

    // Optimistic update: unequip same type items, equip target item
    const updatedInventory = inventory.map(invItem => ({
      ...invItem,
      equipped: invItem.type === item.type ? invItem.id === itemId : invItem.equipped,
    }));

    setInventory(updatedInventory);

    // Persist to Firestore
    const userRef = doc(db, 'users', user.uid);
    
    // Special handling for background items
    if (item.type === 'background') {
      await updateDoc(userRef, {
        inventory: updatedInventory,
        'inventory.displayBackgroundEquipped': item.background || getBackgroundByItemId(itemId),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(userRef, {
        inventory: updatedInventory,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error('Error equipping item:', err);
    setError('Failed to equip item');
    
    // Revert optimistic update on error
    await refreshInventory();
    throw err;
  } finally {
    setLoading(false);
  }
};
```

### Background Dual-Equipping

Special logic for background items supporting dual equipping:

```typescript
const equipBackgroundForCategory = async (
  background: Background, 
  category: 'display' | 'match'
) => {
  if (!user) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    
    if (category === 'display') {
      await updateDoc(userRef, {
        'inventory.displayBackgroundEquipped': {
          name: background.name,
          file: background.file,
          type: background.type
        },
        updatedAt: serverTimestamp()
      });
      
      setDisplayBackgroundEquip(background);
    } else {
      await updateDoc(userRef, {
        'inventory.matchBackgroundEquipped': {
          name: background.name,
          file: background.file,
          type: background.type
        },
        updatedAt: serverTimestamp()
      });
      
      setMatchBackgroundEquip(background);
    }
  } catch (error) {
    console.error(`Error equipping ${category} background:`, error);
    throw error;
  }
};
```

### Equipment Validation

```typescript
const validateEquipment = (item: InventoryItem, user: User): boolean => {
  // Check if user owns the item
  if (!user.inventory.some(invItem => invItem.id === item.id)) {
    throw new Error('Item not found in user inventory');
  }

  // Check item-specific requirements
  switch (item.type) {
    case 'background':
      // Backgrounds have no special requirements
      return true;
      
    case 'dice':
      // Future: Check if user has unlocked dice customization
      return true;
      
    case 'avatar':
      // Future: Check if user has reached required level
      return true;
      
    case 'effect':
      // Future: Check if user has specific achievements
      return true;
      
    default:
      return false;
  }
};
```

## Inventory Operations

### Item Acquisition System

```typescript
// Reward system for match completion
const grantMatchRewards = async (userId: string, matchResult: MatchResult) => {
  const rewards: Array<Omit<InventoryItem, 'id' | 'acquiredAt'>> = [];
  
  // Base reward for participation
  if (Math.random() < 0.3) { // 30% chance
    rewards.push({
      type: 'background',
      name: getRandomBackground().name,
      description: 'Earned from match participation',
      imageUrl: '/rewards/participation-bg.png',
      rarity: 'common',
      equipped: false
    });
  }
  
  // Win bonus
  if (matchResult.won) {
    if (Math.random() < 0.5) { // 50% chance for winners
      rewards.push({
        type: 'effect',
        name: 'Victory Glow',
        description: 'Earned from match victory',
        imageUrl: '/rewards/victory-effect.png',
        rarity: 'rare',
        equipped: false
      });
    }
  }
  
  // Streak bonuses
  if (matchResult.streak >= 5) {
    rewards.push({
      type: 'dice',
      name: 'Streak Dice',
      description: `Earned from ${matchResult.streak} win streak`,
      imageUrl: '/rewards/streak-dice.png',
      rarity: 'epic',
      equipped: false
    });
  }
  
  if (rewards.length > 0) {
    const itemIds = await InventoryService.grantItems(userId, rewards);
    
    // Notify user of rewards
    await NotificationService.sendRewardNotification(userId, rewards);
    
    return itemIds;
  }
  
  return [];
};
```

### Item Sorting and Organization

```typescript
// Advanced inventory sorting options
type SortOption = 'name' | 'rarity' | 'type' | 'acquired' | 'equipped';
type SortDirection = 'asc' | 'desc';

const sortInventory = (
  inventory: InventoryItem[], 
  sortBy: SortOption, 
  direction: SortDirection = 'asc'
): InventoryItem[] => {
  const rarityOrder = { 'common': 1, 'rare': 2, 'epic': 3, 'legendary': 4 };
  const typeOrder = { 'background': 1, 'dice': 2, 'avatar': 3, 'effect': 4 };
  
  return [...inventory].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'rarity':
        comparison = rarityOrder[a.rarity] - rarityOrder[b.rarity];
        break;
      case 'type':
        comparison = typeOrder[a.type] - typeOrder[b.type];
        break;
      case 'acquired':
        comparison = a.acquiredAt.getTime() - b.acquiredAt.getTime();
        break;
      case 'equipped':
        comparison = (b.equipped ? 1 : 0) - (a.equipped ? 1 : 0);
        break;
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
};
```

### Inventory Search and Filtering

```typescript
// Advanced search capabilities
interface SearchCriteria {
  query?: string;
  type?: InventoryItem['type'];
  rarity?: InventoryItem['rarity'];
  equipped?: boolean;
  acquiredAfter?: Date;
  acquiredBefore?: Date;
}

const searchInventory = (
  inventory: InventoryItem[], 
  criteria: SearchCriteria
): InventoryItem[] => {
  return inventory.filter(item => {
    // Text search
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      const matchesName = item.name.toLowerCase().includes(query);
      const matchesDescription = item.description?.toLowerCase().includes(query);
      if (!matchesName && !matchesDescription) return false;
    }
    
    // Type filter
    if (criteria.type && item.type !== criteria.type) return false;
    
    // Rarity filter
    if (criteria.rarity && item.rarity !== criteria.rarity) return false;
    
    // Equipped filter
    if (criteria.equipped !== undefined && item.equipped !== criteria.equipped) return false;
    
    // Date range filters
    if (criteria.acquiredAfter && item.acquiredAt < criteria.acquiredAfter) return false;
    if (criteria.acquiredBefore && item.acquiredAt > criteria.acquiredBefore) return false;
    
    return true;
  });
};
```

## Error Handling & Performance

### Error Handling Strategy

```typescript
// Comprehensive error handling
class InventoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'InventoryError';
  }
}

const handleInventoryError = (error: any, operation: string) => {
  console.error(`❌ Inventory ${operation} failed:`, error);
  
  // Firebase-specific errors
  if (error.code === 'permission-denied') {
    throw new InventoryError(
      'You do not have permission to perform this action',
      'PERMISSION_DENIED',
      { operation }
    );
  }
  
  if (error.code === 'not-found') {
    throw new InventoryError(
      'The requested item was not found',
      'ITEM_NOT_FOUND',
      { operation }
    );
  }
  
  if (error.code === 'unavailable') {
    throw new InventoryError(
      'Inventory service is temporarily unavailable',
      'SERVICE_UNAVAILABLE',
      { operation }
    );
  }
  
  // Generic error
  throw new InventoryError(
    `Failed to ${operation}. Please try again.`,
    'UNKNOWN_ERROR',
    { operation, originalError: error }
  );
};

// Usage in service methods
static async equipItem(userId: string, itemId: string): Promise<void> {
  try {
    // ... equipment logic
  } catch (error) {
    handleInventoryError(error, 'equip item');
  }
}
```

### Performance Optimization

```typescript
// Optimized inventory loading with pagination
interface InventoryLoadOptions {
  limit?: number;
  offset?: number;
  includeEquipped?: boolean;
  types?: InventoryItem['type'][];
}

class OptimizedInventoryService {
  private static cache = new Map<string, InventoryItem[]>();
  private static cacheExpiry = new Map<string, number>();
  
  static async getUserInventory(
    userId: string, 
    options: InventoryLoadOptions = {}
  ): Promise<InventoryItem[]> {
    const cacheKey = `${userId}_${JSON.stringify(options)}`;
    const now = Date.now();
    
    // Check cache
    if (this.cache.has(cacheKey) && 
        this.cacheExpiry.get(cacheKey)! > now) {
      return this.cache.get(cacheKey)!;
    }
    
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return [];
      }
      
      let inventory = userSnap.data().inventory || [];
      
      // Apply filters
      if (options.types) {
        inventory = inventory.filter((item: InventoryItem) => 
          options.types!.includes(item.type)
        );
      }
      
      if (options.includeEquipped === false) {
        inventory = inventory.filter((item: InventoryItem) => !item.equipped);
      }
      
      // Apply pagination
      if (options.offset) {
        inventory = inventory.slice(options.offset);
      }
      
      if (options.limit) {
        inventory = inventory.slice(0, options.limit);
      }
      
      // Cache results for 5 minutes
      this.cache.set(cacheKey, inventory);
      this.cacheExpiry.set(cacheKey, now + 5 * 60 * 1000);
      
      return inventory;
    } catch (error) {
      console.error('Error loading inventory:', error);
      throw error;
    }
  }
  
  static invalidateCache(userId: string) {
    const keysToDelete = Array.from(this.cache.keys())
      .filter(key => key.startsWith(userId));
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    });
  }
}
```

### Memory Management

```typescript
// Cleanup for large inventories
const useInventoryCleanup = () => {
  const { inventory } = useInventory();
  
  useEffect(() => {
    // Clean up image URLs when component unmounts
    return () => {
      inventory.forEach(item => {
        if (item.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.imageUrl);
        }
      });
    };
  }, [inventory]);
};

// Lazy loading for inventory images
const LazyInventoryImage: React.FC<{item: InventoryItem}> = ({ item }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className="w-full h-24 bg-gray-200 rounded">
      {inView && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className={`w-full h-full object-cover rounded transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-item.svg';
          }}
        />
      )}
    </div>
  );
};
```

## Future Expansion

### Planned Categories

#### Dice Customization System
```typescript
interface DiceItem extends InventoryItem {
  type: 'dice';
  diceData: {
    material: 'wood' | 'metal' | 'crystal' | 'digital';
    animation: 'standard' | 'bounce' | 'spin' | 'fade';
    particles: boolean;
    sound: string;                              // Sound effect ID
    trail: {
      enabled: boolean;
      color: string;
      duration: number;
    };
  };
}
```

#### Avatar System
```typescript
interface AvatarItem extends InventoryItem {
  type: 'avatar';
  avatarData: {
    imageUrl: string;
    animatedUrl?: string;                       // GIF or video URL
    accessories: string[];                      // Array of accessory IDs
    expressions: {
      neutral: string;
      happy: string;
      focused: string;
      victory: string;
    };
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  };
}
```

#### Effect System
```typescript
interface EffectItem extends InventoryItem {
  type: 'effect';
  effectData: {
    trigger: 'victory' | 'dice_roll' | 'banking' | 'turn_start';
    duration: number;                           // Effect duration in milliseconds
    particles: {
      count: number;
      type: 'confetti' | 'stars' | 'sparks' | 'custom';
      colors: string[];
    };
    sound?: string;                            // Optional sound effect
    screen_effect?: 'flash' | 'glow' | 'shake' | 'zoom';
  };
}
```

### Trading System Architecture

```typescript
interface TradeOffer {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  
  offeredItems: {
    itemId: string;
    quantity: number;                           // For stackable items
  }[];
  
  requestedItems: {
    itemId: string;
    quantity: number;
  }[];
  
  message?: string;                            // Optional trade message
}

class TradingService {
  static async createTradeOffer(
    fromUserId: string,
    toUserId: string,
    offeredItems: string[],
    requestedItems: string[],
    message?: string
  ): Promise<string> {
    // Implementation for creating trade offers
  }
  
  static async acceptTradeOffer(offerId: string, userId: string): Promise<void> {
    // Implementation for accepting trades
  }
  
  static async getUserTradeOffers(userId: string): Promise<TradeOffer[]> {
    // Implementation for fetching user trade offers
  }
}
```

### Achievement Integration

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'inventory' | 'gameplay' | 'social' | 'collection';
  requirements: {
    type: 'collect_items' | 'equip_rarity' | 'trade_items';
    target: number;
    criteria?: any;
  };
  rewards: {
    items: Array<Omit<InventoryItem, 'id' | 'acquiredAt'>>;
    experience?: number;
    title?: string;
  };
}

// Example achievements
const INVENTORY_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'collector_novice',
    name: 'Novice Collector',
    description: 'Collect your first 10 items',
    category: 'inventory',
    requirements: {
      type: 'collect_items',
      target: 10
    },
    rewards: {
      items: [{
        type: 'background',
        name: 'Collector\'s Pride',
        description: 'A special background for dedicated collectors',
        imageUrl: '/achievements/collector-bg.jpg',
        rarity: 'rare'
      }]
    }
  },
  
  {
    id: 'legendary_equipped',
    name: 'Legendary Style',
    description: 'Equip a legendary item',
    category: 'inventory',
    requirements: {
      type: 'equip_rarity',
      target: 1,
      criteria: { rarity: 'legendary' }
    },
    rewards: {
      items: [{
        type: 'effect',
        name: 'Legendary Aura',
        description: 'A golden aura effect for legendary collectors',
        imageUrl: '/achievements/legendary-aura.gif',
        rarity: 'epic'
      }],
      title: 'Legendary Collector'
    }
  }
];
```

### Shop System Integration

```typescript
interface ShopItem {
  id: string;
  item: Omit<InventoryItem, 'id' | 'acquiredAt'>;
  price: {
    currency: 'coins' | 'gems' | 'premium';
    amount: number;
  };
  availability: {
    type: 'permanent' | 'limited' | 'seasonal';
    startDate?: Date;
    endDate?: Date;
    stock?: number;                            // For limited items
  };
  requirements?: {
    level?: number;
    achievements?: string[];
    items?: string[];                          // Required owned items
  };
}

class ShopService {
  static async getShopItems(): Promise<ShopItem[]> {
    // Implementation for fetching shop items
  }
  
  static async purchaseItem(
    userId: string, 
    shopItemId: string, 
    paymentMethod: 'coins' | 'gems' | 'premium'
  ): Promise<string> {
    // Implementation for purchasing items
  }
  
  static async checkPurchaseRequirements(
    userId: string, 
    shopItem: ShopItem
  ): Promise<boolean> {
    // Implementation for validating purchase requirements
  }
}
```

---

## Conclusion

The DashDice Inventory System provides a robust, scalable foundation for player item management with deep integration into the game's customization systems. The architecture supports real-time synchronization, complex equipping logic, and future expansion into comprehensive cosmetic and trading systems.

### Key Strengths:
- **Flexible Architecture**: Easily extensible for new item categories
- **Real-time Synchronization**: Firebase-powered state management
- **Background Integration**: Sophisticated dual-background system
- **Performance Optimized**: Caching, lazy loading, and memory management
- **Error Resilient**: Comprehensive error handling and recovery
- **Future-Ready**: Designed for trading, achievements, and shop integration

The system is production-ready and positioned for seamless expansion as new cosmetic features and social systems are added to the platform.
