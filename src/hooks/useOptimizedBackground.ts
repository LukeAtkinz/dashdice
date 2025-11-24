import { useMemo } from 'react';
import { 
  Background, 
  BackgroundContext, 
  resolveBackgroundPath,
  migrateLegacyBackground
} from '@/config/backgrounds';

/**
 * Hook for getting optimized background paths
 * Automatically selects the right background variant based on context and device
 * 
 * @example
 * ```tsx
 * // In a dashboard component
 * const { backgroundPath, isMobile } = useOptimizedBackground(userBackground, 'dashboard');
 * 
 * // In a match component
 * const { backgroundPath } = useOptimizedBackground(playerBackground, 'match');
 * 
 * // For a preview/card
 * const { backgroundPath } = useOptimizedBackground(background, 'preview');
 * ```
 */
export const useOptimizedBackground = (
  background: Background | { name: string; file: string; type: 'image' | 'video' } | null | undefined,
  baseContext: 'dashboard' | 'match' | 'waiting-room' | 'preview'
) => {
  const isMobile = useMemo(() => window.innerWidth < 768, []);
  
  const backgroundData = useMemo(() => {
    if (!background) return null;
    
    // Map base context to actual BackgroundContext
    const contextMap: Record<string, BackgroundContext> = {
      'dashboard': 'dashboard-display',
      'match': 'match-player-card',
      'waiting-room': 'waiting-room',
      'preview': 'inventory-preview'
    };
    
    const context = contextMap[baseContext] || 'match-player-card';
    
    // Handle both new Background type and legacy format
    let backgroundId: string;
    if ('id' in background && background.id) {
      backgroundId = background.id;
    } else if ('name' in background) {
      backgroundId = migrateLegacyBackground(background.name);
    } else {
      return null;
    }
    
    return resolveBackgroundPath(backgroundId, context);
  }, [background, baseContext]);
  
  return {
    backgroundPath: backgroundData?.path || null,
    isMobile,
    context: baseContext,
    isVideo: backgroundData?.type === 'video',
    isImage: backgroundData?.type === 'image'
  };
};

/**
 * Hook for getting optimized background with manual context control
 * Use this when you need fine-grained control over the context
 * 
 * @example
 * ```tsx
 * const { backgroundPath } = useOptimizedBackgroundWithContext(
 *   background, 
 *   'leaderboard'
 * );
 * ```
 */
export const useOptimizedBackgroundWithContext = (
  background: Background | { name: string; file: string; type: 'image' | 'video' } | null | undefined,
  context: BackgroundContext
) => {
  const backgroundData = useMemo(() => {
    if (!background) return null;
    
    // Handle both new Background type and legacy format
    let backgroundId: string;
    if ('id' in background && background.id) {
      backgroundId = background.id;
    } else if ('name' in background) {
      backgroundId = migrateLegacyBackground(background.name);
    } else {
      return null;
    }
    
    return resolveBackgroundPath(backgroundId, context);
  }, [background, context]);
  
  return {
    backgroundPath: backgroundData?.path || null,
    isVideo: backgroundData?.type === 'video',
    isImage: backgroundData?.type === 'image',
    context
  };
};

/**
 * Hook for player card backgrounds (uses friend-card context - low quality images)
 * Optimized specifically for friend cards, profile cards, etc.
 */
export const usePlayerCardBackground = (
  background: Background | { name: string; file: string; type: 'image' | 'video' } | null | undefined
) => {
  return useOptimizedBackgroundWithContext(background, 'friend-card');
};

/**
 * Hook for match backgrounds with automatic device detection
 */
export const useMatchBackground = (
  background: Background | { name: string; file: string; type: 'image' | 'video' } | null | undefined
) => {
  return useOptimizedBackground(background, 'match');
};

/**
 * Hook for dashboard backgrounds with automatic device detection
 */
export const useDashboardBackground = (
  background: Background | { name: string; file: string; type: 'image' | 'video' } | null | undefined
) => {
  return useOptimizedBackground(background, 'dashboard');
};

/**
 * Hook for waiting room backgrounds with automatic device detection
 */
export const useWaitingRoomBackground = (
  background: Background | { name: string; file: string; type: 'image' | 'video' } | null | undefined
) => {
  return useOptimizedBackground(background, 'waiting-room');
};
