import { useMemo } from 'react';
import { 
  Background, 
  BackgroundContext, 
  getOptimizedBackgroundPath,
  getSmartBackgroundPath,
  isMobileDevice
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
  // Always call useMemo hooks regardless of input to maintain hook order
  const isMobile = useMemo(() => isMobileDevice(), []);
  
  // Stable default for when background is null/undefined
  const backgroundPath = useMemo(() => {
    if (!background) {
      // Return default path instead of null to prevent downstream issues
      return '/backgrounds/Preview/Relax - Preview.webp';
    }
    
    return getSmartBackgroundPath(background, baseContext);
  }, [background, baseContext]);
  
  const context: BackgroundContext = useMemo(() => {
    if (baseContext === 'preview') return 'preview';
    
    return isMobile 
      ? `${baseContext}-mobile` as BackgroundContext
      : `${baseContext}-desktop` as BackgroundContext;
  }, [baseContext, isMobile]);
  
  return {
    backgroundPath,
    isMobile,
    context,
    isVideo: background?.type === 'video',
    isImage: background?.type === 'image'
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
  const backgroundPath = useMemo(() => {
    if (!background) return null;
    
    return getOptimizedBackgroundPath(background, context);
  }, [background, context]);
  
  return {
    backgroundPath,
    isVideo: background?.type === 'video',
    isImage: background?.type === 'image',
    context
  };
};

/**
 * Hook for player card backgrounds (always uses preview)
 * Optimized specifically for friend cards, profile cards, etc.
 */
export const usePlayerCardBackground = (
  background: Background | { name: string; file: string; type: 'image' | 'video' } | null | undefined
) => {
  return useOptimizedBackgroundWithContext(background, 'preview');
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
