/**
 * DASHDICE BACKGROUND SYSTEM V2.0
 * 
 * Quality-aware background system with proper video/image separation
 * 
 * Structure: /backgrounds/
 *   - Images/ (Best/Medium/Low Quality) - Static backgrounds [.webp]
 *   - Videos/ (Best/Medium Quality) - Animated backgrounds [.mp4]
 *   - Video Images/ (Best/Medium/Low Quality) - Static frames for previews [.webp]
 */

export type BackgroundType = 'image' | 'video';
export type BackgroundQuality = 'best' | 'medium' | 'low';

export interface Background {
  id: string;
  name: string;
  category: 'Images' | 'Videos';
  description?: string;
  tags?: string[];
  rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

// Context types - determines quality and whether to use video or image
export type BackgroundContext = 
  | 'dashboard-display'    // Vibin tab - USE VIDEO - Best quality
  | 'match-player-card'    // Match player cards with score - USE IMAGE (Video Image) - Best quality
  | 'waiting-room'         // Waiting room split screen - USE VIDEO - Best quality
  | 'friend-card'          // Friend list cards - USE IMAGE (Video Image) - Low quality
  | 'leaderboard-card'     // Leaderboard entries - USE IMAGE (Video Image) - Low quality
  | 'inventory-preview'    // Flexin/Vibin equip cards - USE IMAGE (Video Image) - Medium quality
  | 'profile-viewer';      // View profile cards - USE IMAGE (Video Image) - Medium quality

/**
 * ALL AVAILABLE BACKGROUNDS - Single source of truth
 * Removed: "All For Glory" (deleted from files), "Neon City" (never existed)
 */
export const AVAILABLE_BACKGROUNDS: Background[] = [
  // ==================== IMAGES (2) ====================
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
  
  // ==================== VIDEOS (5) ====================
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
  },
  
  // ==================== TURN DECIDER BACKGROUNDS (7) ====================
  {
    id: 'arcade-assault',
    name: 'Arcade Assult',
    category: 'Videos',
    description: 'Intense arcade action for turn decider',
    tags: ['arcade', 'action', 'intense'],
    rarity: 'RARE'
  },
  {
    id: 'burning-the-wasteland',
    name: 'Burning The Wasteland',
    category: 'Videos',
    description: 'Fiery wasteland for turn decider',
    tags: ['fire', 'wasteland', 'intense'],
    rarity: 'EPIC'
  },
  {
    id: 'crazy-cough',
    name: 'Crazy Cough',
    category: 'Videos',
    description: 'Wild and chaotic turn decider background',
    tags: ['chaotic', 'wild', 'action'],
    rarity: 'RARE'
  },
  {
    id: 'from-the-deep',
    name: 'From The Deep',
    category: 'Videos',
    description: 'Mysterious depths for turn decider',
    tags: ['underwater', 'mysterious', 'deep'],
    rarity: 'RARE'
  },
  {
    id: 'into-inferno',
    name: 'Into Inferno',
    category: 'Videos',
    description: 'Blazing inferno for turn decider',
    tags: ['fire', 'inferno', 'intense'],
    rarity: 'EPIC'
  },
  {
    id: 'ivory-tower',
    name: 'Ivory Tower',
    category: 'Videos',
    description: 'Majestic tower for turn decider',
    tags: ['tower', 'majestic', 'elegant'],
    rarity: 'LEGENDARY'
  },
  {
    id: 'jump',
    name: 'Jump',
    category: 'Videos',
    description: 'Dynamic jumping sequence for turn decider',
    tags: ['action', 'jump', 'dynamic'],
    rarity: 'RARE'
  },
  
  // ==================== VICTORY SCREENS (8) ====================
  {
    id: 'clout-shot',
    name: 'Clout Shot',
    category: 'Videos',
    description: 'Victory celebration with style',
    tags: ['victory', 'celebration', 'style'],
    rarity: 'EPIC'
  },
  {
    id: 'great-white',
    name: 'Great White',
    category: 'Videos',
    description: 'Powerful victory with great white energy',
    tags: ['victory', 'powerful', 'ocean'],
    rarity: 'LEGENDARY'
  },
  {
    id: 'headshot',
    name: 'Headshot',
    category: 'Videos',
    description: 'Precision victory screen',
    tags: ['victory', 'precision', 'skill'],
    rarity: 'EPIC'
  },
  {
    id: 'lab-rat',
    name: 'Lab Rat',
    category: 'Videos',
    description: 'Experimental victory screen',
    tags: ['victory', 'experimental', 'unique'],
    rarity: 'RARE'
  },
  {
    id: 'meow',
    name: 'Meow',
    category: 'Videos',
    description: 'Playful victory celebration',
    tags: ['victory', 'playful', 'fun'],
    rarity: 'RARE'
  },
  {
    id: 'nightfall',
    name: 'Nightfall',
    category: 'Videos',
    description: 'Dark and mysterious victory',
    tags: ['victory', 'dark', 'mysterious'],
    rarity: 'EPIC'
  },
  {
    id: 'shadow-step',
    name: 'Shadow Step',
    category: 'Videos',
    description: 'Stealthy victory screen',
    tags: ['victory', 'stealth', 'shadow'],
    rarity: 'EPIC'
  },
  {
    id: 'wind-blade',
    name: 'Wind Blade',
    category: 'Videos',
    description: 'Swift victory with wind blade',
    tags: ['victory', 'swift', 'blade'],
    rarity: 'LEGENDARY'
  }
];

export const getBackgroundById = (id: string): Background | undefined => {
  return AVAILABLE_BACKGROUNDS.find(bg => bg.id === id);
};

export const getDefaultBackground = (): Background => {
  return AVAILABLE_BACKGROUNDS.find(bg => bg.id === 'relax') || AVAILABLE_BACKGROUNDS[0];
};

/**
 * Quality mapping based on context
 * Cards/previews use LOW quality, main displays use BEST
 */
const CONTEXT_QUALITY_MAP: Record<BackgroundContext, BackgroundQuality> = {
  'dashboard-display': 'best',
  'match-player-card': 'best',  // Uses Video Images at best quality
  'waiting-room': 'best',
  'friend-card': 'low',
  'leaderboard-card': 'low',
  'inventory-preview': 'medium',
  'profile-viewer': 'medium'
};

/**
 * Contexts that should use static images even for video backgrounds
 */
const USE_IMAGE_CONTEXTS: BackgroundContext[] = [
  'match-player-card',
  'friend-card',
  'leaderboard-card',
  'inventory-preview',
  'profile-viewer'
];

/**
 * Build the file path for a background
 */
export const buildBackgroundPath = (
  background: Background,
  quality: BackgroundQuality,
  forceImage = false
): string => {
  // Check if it's a Turn Decider or Victory Screen background
  const turnDeciderIds = ['arcade-assault', 'burning-the-wasteland', 'crazy-cough', 'from-the-deep', 'into-inferno', 'ivory-tower', 'jump'];
  const victoryIds = ['clout-shot', 'great-white', 'headshot', 'lab-rat', 'meow', 'nightfall', 'shadow-step', 'wind-blade'];
  
  const isTurnDecider = turnDeciderIds.includes(background.id);
  const isVictory = victoryIds.includes(background.id);
  
  // Game Backgrounds have typo 'Quailty', regular backgrounds use 'Quality'
  const qualityFolder = 
    quality === 'best' ? 'Best Quality' :
    quality === 'medium' ? (isTurnDecider || isVictory ? 'Medium Quailty' : 'Medium Quality') :
    'Low Quality';
  
  // Determine which folder to use
  let folder: string;
  let extension: string;
  let baseFolder = 'backgrounds';
  
  if (isTurnDecider) {
    baseFolder = 'backgrounds/Game Backgrounds/Turn Decider';
  } else if (isVictory) {
    baseFolder = 'backgrounds/Game Backgrounds/Victory Screens';
  }
  
  if (background.category === 'Videos') {
    if (forceImage) {
      // Use Video Images for static previews - always has folder structure
      folder = 'Video Images';
      extension = 'webp';
    } else {
      // Use actual video - Game Backgrounds don't have a Videos subfolder
      if (isTurnDecider || isVictory) {
        folder = ''; // No Videos subfolder for Game Backgrounds
        extension = 'mp4';
        // Videos don't have Low Quality
        if (quality === 'low') quality = 'medium';
      } else {
        folder = 'Videos';
        extension = 'mp4';
        // Videos don't have Low Quality
        if (quality === 'low') quality = 'medium';
      }
    }
  } else {
    // Images category
    folder = 'Images';
    extension = 'webp';
  }
  
  // Construct path - handle empty folder for Game Background videos only
  if (folder === '' && !forceImage) {
    return `/${baseFolder}/${qualityFolder}/${background.name}.${extension}`;
  } else {
    return `/${baseFolder}/${folder}/${qualityFolder}/${background.name}.${extension}`;
  }
};

/**
 * Resolve a background to its actual path based on context
 */
export const resolveBackgroundPath = (
  backgroundId: string | undefined,
  context: BackgroundContext
): { path: string; type: BackgroundType; name: string } | null => {
  if (!backgroundId) {
    const defaultBg = getDefaultBackground();
    backgroundId = defaultBg.id;
  }
  
  const background = getBackgroundById(backgroundId);
  if (!background) {
    console.warn(`Background not found: ${backgroundId}, using default`);
    const defaultBg = getDefaultBackground();
    const quality = CONTEXT_QUALITY_MAP[context];
    const forceImage = USE_IMAGE_CONTEXTS.includes(context);
    return {
      path: buildBackgroundPath(defaultBg, quality, forceImage),
      type: forceImage || defaultBg.category === 'Images' ? 'image' : 'video',
      name: defaultBg.name
    };
  }
  
  const quality = CONTEXT_QUALITY_MAP[context];
  const forceImage = USE_IMAGE_CONTEXTS.includes(context);
  
  return {
    path: buildBackgroundPath(background, quality, forceImage),
    type: forceImage || background.category === 'Images' ? 'image' : 'video',
    name: background.name
  };
};

/**
 * Legacy format converter for backwards compatibility
 */
export const toLegacyFormat = (backgroundId: string) => {
  const background = getBackgroundById(backgroundId);
  if (!background) return null;
  
  const resolved = resolveBackgroundPath(backgroundId, 'match-player-card');
  if (!resolved) return null;
  
  return {
    name: background.name,
    file: resolved.path,
    type: resolved.type
  };
};

/**
 * Migration helper: Convert legacy background reference to new ID
 * Handles: "All For Glory" (deleted), "Neon City" (never existed), old name-based refs
 */
export const migrateLegacyBackground = (legacyRef: any): string => {
  // Ghost backgrounds that need to be migrated away
  const GHOST_BACKGROUNDS = ['All For Glory', 'all-for-glory', 'Neon City', 'neon-city'];
  
  // Handle string references
  if (typeof legacyRef === 'string') {
    // Check if it's a ghost background
    if (GHOST_BACKGROUNDS.some(ghost => legacyRef.toLowerCase().includes(ghost.toLowerCase()))) {
      console.warn(`Migrating ghost background "${legacyRef}" to default`);
      return getDefaultBackground().id;
    }
    
    // Try to find by ID
    const byId = getBackgroundById(legacyRef);
    if (byId) return byId.id;
    
    // Try to find by name
    const byName = AVAILABLE_BACKGROUNDS.find(bg => 
      bg.name.toLowerCase() === legacyRef.toLowerCase()
    );
    if (byName) return byName.id;
    
    // Try extracting name from file path
    const match = legacyRef.match(/([^\/]+)\.(jpg|png|mp4|webp)$/i);
    if (match) {
      const fileName = match[1];
      const byFileName = AVAILABLE_BACKGROUNDS.find(bg =>
        bg.name.toLowerCase() === fileName.toLowerCase()
      );
      if (byFileName) return byFileName.id;
    }
  }
  
  // Handle object format: { name, file, type }
  if (legacyRef && typeof legacyRef === 'object') {
    if (legacyRef.name) {
      // Check for ghost backgrounds
      if (GHOST_BACKGROUNDS.some(ghost => legacyRef.name.toLowerCase().includes(ghost.toLowerCase()))) {
        console.warn(`Migrating ghost background "${legacyRef.name}" to default`);
        return getDefaultBackground().id;
      }
      
      const byName = AVAILABLE_BACKGROUNDS.find(bg =>
        bg.name.toLowerCase() === legacyRef.name.toLowerCase()
      );
      if (byName) return byName.id;
    }
  }
  
  // Fallback to default
  console.warn('Failed to migrate legacy background, using default:', legacyRef);
  return getDefaultBackground().id;
};

/**
 * Get all background IDs (for inventory ownership)
 */
export const getAllBackgroundIds = (): string[] => {
  return AVAILABLE_BACKGROUNDS.map(bg => bg.id);
};

/**
 * Get backgrounds for Vibin tab (display backgrounds)
 * Explicitly excludes Turn Decider and Victory backgrounds
 */
export const getVibinBackgrounds = (): Background[] => {
  const vibinIds = ['as-they-fall', 'end-of-the-dragon', 'new-day', 'on-a-mission', 'underwater', 'long-road-ahead', 'relax'];
  const turnDeciderIds = ['arcade-assault', 'burning-the-wasteland', 'crazy-cough', 'from-the-deep', 'into-inferno', 'ivory-tower', 'jump'];
  const victoryIds = ['clout-shot', 'great-white', 'headshot', 'lab-rat', 'meow', 'nightfall', 'shadow-step', 'wind-blade'];
  
  return AVAILABLE_BACKGROUNDS.filter(bg => 
    vibinIds.includes(bg.id) && 
    !turnDeciderIds.includes(bg.id) && 
    !victoryIds.includes(bg.id)
  );
};

/**
 * Get backgrounds for Flexin tab (match backgrounds - same as Vibin for now)
 * Explicitly excludes Turn Decider and Victory backgrounds
 */
export const getFlexinBackgrounds = (): Background[] => {
  const flexinIds = ['as-they-fall', 'end-of-the-dragon', 'new-day', 'on-a-mission', 'underwater', 'long-road-ahead', 'relax'];
  const turnDeciderIds = ['arcade-assault', 'burning-the-wasteland', 'crazy-cough', 'from-the-deep', 'into-inferno', 'ivory-tower', 'jump'];
  const victoryIds = ['clout-shot', 'great-white', 'headshot', 'lab-rat', 'meow', 'nightfall', 'shadow-step', 'wind-blade'];
  
  return AVAILABLE_BACKGROUNDS.filter(bg => 
    flexinIds.includes(bg.id) && 
    !turnDeciderIds.includes(bg.id) && 
    !victoryIds.includes(bg.id)
  );
};

/**
 * Get backgrounds for Turn Decider tab
 */
export const getTurnDeciderBackgrounds = (): Background[] => {
  return AVAILABLE_BACKGROUNDS.filter(bg => 
    ['arcade-assault', 'burning-the-wasteland', 'crazy-cough', 'from-the-deep', 'into-inferno', 'ivory-tower', 'jump'].includes(bg.id)
  );
};

/**
 * Get backgrounds for Victory Screen tab
 */
export const getVictoryBackgrounds = (): Background[] => {
  return AVAILABLE_BACKGROUNDS.filter(bg => 
    ['clout-shot', 'great-white', 'headshot', 'lab-rat', 'meow', 'nightfall', 'shadow-step', 'wind-blade'].includes(bg.id)
  );
};

