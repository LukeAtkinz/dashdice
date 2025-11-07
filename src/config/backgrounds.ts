export interface Background {
  id: string;
  name: string;
  filename: string;
  type: 'image' | 'video';
  thumbnail?: string;
  description?: string;
  tags?: string[];
}

// Extended background interface with size variants for optimization
export interface BackgroundVariants {
  full: string;      // Desktop full-size (images only)
  mobile: string;    // Mobile optimized (includes desktop videos)
  preview: string;   // Preview/thumbnail for cards and selectors
}

export interface OptimizedBackground extends Background {
  variants: BackgroundVariants;
}

// Context types for background selection
export type BackgroundContext = 
  | 'dashboard-desktop'     // Full-size desktop dashboard
  | 'dashboard-mobile'      // Mobile dashboard
  | 'match-desktop'         // Full-size match background
  | 'match-mobile'          // Mobile match background
  | 'waiting-room-desktop'  // Waiting room desktop
  | 'waiting-room-mobile'   // Waiting room mobile
  | 'preview'               // Preview cards, selectors, player cards
  | 'leaderboard'           // Leaderboard entries
  | 'friend-card'           // Friend list cards
  | 'profile-viewer';       // Profile viewer

export const AVAILABLE_BACKGROUNDS: Background[] = [
  {
    id: 'all-for-glory',
    name: 'All For Glory',
    filename: 'All For Glory.jpg',
    type: 'image',
    description: 'An epic battle scene with dramatic lighting',
    tags: ['epic', 'battle', 'dramatic']
  },
  {
    id: 'long-road-ahead',
    name: 'Long Road Ahead',
    filename: 'Long Road Ahead.jpg',
    type: 'image',
    description: 'A scenic road stretching into the distance',
    tags: ['scenic', 'journey', 'peaceful']
  },
  {
    id: 'relax',
    name: 'Relax',
    filename: 'Relax.png',
    type: 'image',
    description: 'A calming and peaceful environment',
    tags: ['calm', 'peaceful', 'zen']
  },
  {
    id: 'new-day',
    name: 'New Day',
    filename: 'New Day.mp4',
    type: 'video',
    description: 'Animated sunrise bringing hope and new beginnings',
    tags: ['animated', 'sunrise', 'hope']
  },
  {
    id: 'on-a-mission',
    name: 'On A Mission',
    filename: 'On A Mission.mp4',
    type: 'video',
    description: 'Dynamic action sequence for intense gaming',
    tags: ['animated', 'action', 'intense']
  },
  {
    id: 'underwater',
    name: 'Underwater',
    filename: 'Underwater.mp4',
    type: 'video',
    description: 'Serene underwater scene with flowing currents',
    tags: ['animated', 'underwater', 'serene']
  },
  {
    id: 'as-they-fall',
    name: 'As They Fall',
    filename: 'As they fall.mp4',
    type: 'video',
    description: 'Dynamic falling sequence with scenic journey vibes',
    tags: ['animated', 'falling', 'scenic', 'journey']
  },
  {
    id: 'end-of-the-dragon',
    name: 'End Of The Dragon',
    filename: 'End of the Dragon.mp4',
    type: 'video',
    description: 'Epic dragon finale with mystical adventure atmosphere',
    tags: ['animated', 'dragon', 'epic', 'mystical']
  }
];

export const getBackgroundById = (id: string): Background | undefined => {
  return AVAILABLE_BACKGROUNDS.find(bg => bg.id === id);
};

export const getBackgroundUrl = (background: Background): string => {
  return `/backgrounds/${background.filename}`;
};

export const getDefaultBackground = (): Background => {
  return AVAILABLE_BACKGROUNDS[0]; // All For Glory as default
};

// Helper function to convert Background to UserProfile background format
export const toUserBackground = (background: Background) => ({
  name: background.name,
  file: `/backgrounds/${background.filename}`,
  type: background.type as 'image' | 'video'
});

// ============================================================================
// OPTIMIZED BACKGROUNDS WITH SIZE VARIANTS
// ============================================================================

/**
 * Get optimized background variants for a given background
 * Returns paths to FULL, MOBILE, and PREVIEW versions
 */
export const getBackgroundVariants = (background: Background): BackgroundVariants => {
  const baseName = background.filename.replace(/\.(jpg|png|mp4)$/i, '');
  
  // Map to actual file naming conventions in folders
  const mobileVideoMap: Record<string, string> = {
    'New Day': 'New Day - Mobile.webm',
    'On A Mission': 'On A Mission - Mobile.webm',
    'Underwater': 'Underwater - Mobile.webm',
    'As they fall': 'As they fall - Mobile.webm',
    'End of the Dragon': 'End of the Dragon Mobile.webm'
  };
  
  const previewVideoMap: Record<string, string> = {
    'New Day': 'New-Day - Preview.webm',
    'On A Mission': 'On-A-Mission-Preview.webm',
    'Underwater': 'Underwater-Preview.webm',
    'As they fall': 'As-they-fall - Preview.webm',
    'End of the Dragon': 'End-of-the-Dragon - Preview.webm'
  };
  
  // For videos: desktop and mobile use same video, images use different sizes
  if (background.type === 'video') {
    return {
      full: `/backgrounds/Mobile/${mobileVideoMap[baseName] || background.filename}`,      // Videos in Mobile folder (same for desktop)
      mobile: `/backgrounds/Mobile/${mobileVideoMap[baseName] || background.filename}`,    // Same video for mobile
      preview: `/backgrounds/Preview/${previewVideoMap[baseName] || baseName + ' - Preview.webm'}`,  // Preview is always webm for videos
    };
  }
  
  // For images: use different sizes (Full, Mobile, Preview folders)
  return {
    full: `/backgrounds/Full/${baseName} - Full.webp`,          // Full-size for desktop
    mobile: `/backgrounds/Mobile/${baseName} - Mobile.webp`,      // Optimized for mobile
    preview: `/backgrounds/Preview/${baseName} - Preview.webp`,    // Small preview
  };
};

/**
 * Get the appropriate background path based on context
 * This is the main function to use throughout the app
 */
export const getOptimizedBackgroundPath = (
  background: Background | { name: string; file: string; type: 'image' | 'video' },
  context: BackgroundContext
): string => {
  // Handle legacy background format (direct file path)
  if ('file' in background && !('filename' in background)) {
    // Legacy format - return as-is for backwards compatibility
    return background.file;
  }
  
  // Find the background in our config
  const bgConfig = 'id' in background 
    ? background as Background
    : AVAILABLE_BACKGROUNDS.find(bg => bg.name === background.name) || AVAILABLE_BACKGROUNDS[0];
  
  const variants = getBackgroundVariants(bgConfig);
  
  // Determine which variant to use based on context
  switch (context) {
    // Desktop full-size contexts
    case 'dashboard-desktop':
    case 'match-desktop':
    case 'waiting-room-desktop':
      return bgConfig.type === 'video' ? variants.mobile : variants.full;
    
    // Mobile contexts
    case 'dashboard-mobile':
    case 'match-mobile':
    case 'waiting-room-mobile':
      return variants.mobile;
    
    // Preview contexts (always use preview variant)
    case 'preview':
    case 'leaderboard':
    case 'friend-card':
    case 'profile-viewer':
      return variants.preview;
    
    default:
      return variants.mobile; // Safe default
  }
};

/**
 * Detect if user is on mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Get background path with automatic mobile detection
 * Use this when you want automatic device detection
 */
export const getSmartBackgroundPath = (
  background: Background | { name: string; file: string; type: 'image' | 'video' },
  baseContext: 'dashboard' | 'match' | 'waiting-room' | 'preview'
): string => {
  const isMobile = isMobileDevice();
  
  let context: BackgroundContext;
  
  if (baseContext === 'preview') {
    context = 'preview';
  } else {
    context = isMobile 
      ? `${baseContext}-mobile` as BackgroundContext
      : `${baseContext}-desktop` as BackgroundContext;
  }
  
  return getOptimizedBackgroundPath(background, context);
};

/**
 * Convert a background to the optimized format with variants
 */
export const toOptimizedBackground = (background: Background): OptimizedBackground => {
  return {
    ...background,
    variants: getBackgroundVariants(background)
  };
};

/**
 * Get all backgrounds with optimized variants
 */
export const getOptimizedBackgrounds = (): OptimizedBackground[] => {
  return AVAILABLE_BACKGROUNDS.map(toOptimizedBackground);
};

