/**
 * DASHDICE BACKGROUND SYSTEM v2.0
 * 
 * Complete rewrite of background management system
 * Unified structure with quality-aware loading
 * 
 * Structure:
 * /backgrounds/
 *   ├── Images/           [Static image backgrounds - 2 backgrounds]
 *   │   ├── Best Quality/
 *   │   ├── Medium Quality/
 *   │   └── Low Quality/
 *   ├── Videos/           [Animated video backgrounds - 5 backgrounds]
 *   │   ├── Best Quality/
 *   │   └── Medium Quality/
 *   └── Video Images/     [Static frames from videos for previews/thumbnails]
 *       ├── Best Quality/
 *       ├── Medium Quality/
 *       └── Low Quality/
 */

export type BackgroundType = 'image' | 'video';
export type BackgroundQuality = 'best' | 'medium' | 'low';
export type BackgroundCategory = 'Images' | 'Videos' | 'Video Images';

/**
 * Core background definition - single source of truth
 */
export interface BackgroundDefinition {
  id: string;                    // Unique identifier (e.g., 'long-road-ahead')
  name: string;                  // Display name (e.g., 'Long Road Ahead')
  category: 'Images' | 'Videos'; // Whether it's an image or video background
  description?: string;
  tags?: string[];
  rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

/**
 * Runtime background object with resolved paths
 */
export interface ResolvedBackground {
  id: string;
  name: string;
  type: BackgroundType;
  path: string;           // Resolved path based on context and quality
  thumbnailPath?: string; // For video backgrounds, path to static image
  quality: BackgroundQuality;
}

/**
 * Context where background is being used
 * Determines which quality to load
 */
export type BackgroundContext =
  | 'dashboard-display'    // Dashboard background behind user
  | 'match-background'     // Match background (split-screen top/bottom)
  | 'waiting-room'         // Waiting room split-screen
  | 'player-card'          // Player card preview
  | 'inventory-preview'    // Inventory grid thumbnail
  | 'friend-card'          // Friend list card
  | 'leaderboard-entry';   // Leaderboard entry

/**
 * ALL AVAILABLE BACKGROUNDS
 * This is the single source of truth
 */
export const BACKGROUNDS: BackgroundDefinition[] = [
  // ==================== IMAGES ====================
  {
    id: 'long-road-ahead',
    name: 'Long Road Ahead',
    category: 'Images',
    description: 'A scenic road stretching into the distance',
    tags: ['scenic', 'journey', 'peaceful'],
    rarity: 'COMMON'
  },
  {
    id: 'relax',
    name: 'Relax',
    category: 'Images',
    description: 'A calming and peaceful environment',
    tags: ['calm', 'peaceful', 'zen'],
    rarity: 'COMMON'
  },
  
  // ==================== VIDEOS ====================
  {
    id: 'as-they-fall',
    name: 'As They Fall',
    category: 'Videos',
    description: 'Dynamic falling sequence with scenic journey vibes',
    tags: ['animated', 'falling', 'scenic'],
    rarity: 'RARE'
  },
  {
    id: 'end-of-the-dragon',
    name: 'End Of The Dragon',
    category: 'Videos',
    description: 'Epic dragon finale with mystical adventure atmosphere',
    tags: ['animated', 'dragon', 'epic'],
    rarity: 'EPIC'
  },
  {
    id: 'new-day',
    name: 'New Day',
    category: 'Videos',
    description: 'Animated sunrise bringing hope and new beginnings',
    tags: ['animated', 'sunrise', 'hope'],
    rarity: 'RARE'
  },
  {
    id: 'on-a-mission',
    name: 'On A Mission',
    category: 'Videos',
    description: 'Dynamic action sequence for intense gaming',
    tags: ['animated', 'action', 'intense'],
    rarity: 'EPIC'
  },
  {
    id: 'underwater',
    name: 'Underwater',
    category: 'Videos',
    description: 'Serene underwater scene with flowing currents',
    tags: ['animated', 'underwater', 'serene'],
    rarity: 'RARE'
  }
];

/**
 * Quality mapping based on context and device
 */
const CONTEXT_QUALITY_MAP: Record<BackgroundContext, BackgroundQuality> = {
  'dashboard-display': 'best',      // Dashboard gets best quality
  'match-background': 'best',       // Match backgrounds get best quality
  'waiting-room': 'best',           // Waiting room gets best quality
  'player-card': 'medium',          // Player cards get medium (smaller display)
  'inventory-preview': 'low',       // Inventory thumbnails get low (very small)
  'friend-card': 'low',             // Friend cards get low (small display)
  'leaderboard-entry': 'low'        // Leaderboard entries get low (tiny display)
};

/**
 * Get quality for a given context
 * Can be overridden for mobile/slow connections
 */
export const getQualityForContext = (
  context: BackgroundContext,
  forceLowQuality = false
): BackgroundQuality => {
  if (forceLowQuality) return 'low';
  return CONTEXT_QUALITY_MAP[context];
};

/**
 * Build file path for a background
 */
export const buildBackgroundPath = (
  background: BackgroundDefinition,
  quality: BackgroundQuality,
  asVideoImage = false
): string => {
  const qualityFolder = 
    quality === 'best' ? 'Best Quality' :
    quality === 'medium' ? 'Medium Quality' :
    'Low Quality';
  
  const category = asVideoImage && background.category === 'Videos' 
    ? 'Video Images' 
    : background.category;
  
  const extension = category === 'Videos' ? 'mp4' : 'webp';
  
  // Build path: /backgrounds/[Category]/[Quality]/[Name].[ext]
  return `/backgrounds/${category}/${qualityFolder}/${background.name}.${extension}`;
};

/**
 * Resolve a background to a usable path
 */
export const resolveBackground = (
  backgroundId: string,
  context: BackgroundContext,
  options: {
    forceLowQuality?: boolean;
    asVideoImage?: boolean; // For video backgrounds, get static image instead
  } = {}
): ResolvedBackground | null => {
  const background = BACKGROUNDS.find(bg => bg.id === backgroundId);
  if (!background) {
    console.warn(`Background not found: ${backgroundId}`);
    return null;
  }
  
  const quality = getQualityForContext(context, options.forceLowQuality);
  const useVideoImage = options.asVideoImage && background.category === 'Videos';
  
  const path = buildBackgroundPath(background, quality, useVideoImage);
  const type: BackgroundType = useVideoImage ? 'image' : 
    background.category === 'Videos' ? 'video' : 'image';
  
  // For video backgrounds, also include thumbnail path
  const thumbnailPath = background.category === 'Videos'
    ? buildBackgroundPath(background, 'low', true)
    : undefined;
  
  return {
    id: background.id,
    name: background.name,
    type,
    path,
    thumbnailPath,
    quality
  };
};

/**
 * Get all backgrounds (for inventory, etc.)
 */
export const getAllBackgrounds = (): BackgroundDefinition[] => {
  return [...BACKGROUNDS];
};

/**
 * Get background by ID
 */
export const getBackgroundById = (id: string): BackgroundDefinition | null => {
  return BACKGROUNDS.find(bg => bg.id === id) || null;
};

/**
 * Get background by name (legacy support)
 */
export const getBackgroundByName = (name: string): BackgroundDefinition | null => {
  return BACKGROUNDS.find(bg => 
    bg.name.toLowerCase() === name.toLowerCase()
  ) || null;
};

/**
 * Get default background
 */
export const getDefaultBackground = (): BackgroundDefinition => {
  return BACKGROUNDS.find(bg => bg.id === 'relax') || BACKGROUNDS[0];
};

/**
 * Convert to legacy format for backwards compatibility
 */
export const toLegacyFormat = (background: BackgroundDefinition, context: BackgroundContext = 'match-background') => {
  const resolved = resolveBackground(background.id, context);
  if (!resolved) return null;
  
  return {
    name: background.name,
    file: resolved.path,
    type: resolved.type
  };
};

/**
 * Migration helper: Convert legacy background reference to new ID
 */
export const migrateLegacyBackground = (legacyRef: any): string | null => {
  // Handle various legacy formats
  if (typeof legacyRef === 'string') {
    // Could be ID, name, or file path
    const byId = BACKGROUNDS.find(bg => bg.id === legacyRef);
    if (byId) return byId.id;
    
    const byName = getBackgroundByName(legacyRef);
    if (byName) return byName.id;
    
    // Try extracting name from file path
    const match = legacyRef.match(/\/([^\/]+)\.(jpg|png|mp4|webp)$/i);
    if (match) {
      const fileName = match[1];
      const byFileName = getBackgroundByName(fileName);
      if (byFileName) return byFileName.id;
    }
  } else if (legacyRef && typeof legacyRef === 'object') {
    // Object format: { name, file, type }
    if (legacyRef.name) {
      const byName = getBackgroundByName(legacyRef.name);
      if (byName) return byName.id;
    }
  }
  
  // Fallback to default
  console.warn('Failed to migrate legacy background, using default:', legacyRef);
  return getDefaultBackground().id;
};

/**
 * Get all background IDs (for user inventory)
 */
export const getAllBackgroundIds = (): string[] => {
  return BACKGROUNDS.map(bg => bg.id);
};
