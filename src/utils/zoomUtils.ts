/**
 * Global zoom utility for the application
 * Applies 80% scaling to content while keeping backgrounds full size
 * 
 * This creates the effect of Chrome's 80% zoom but with precise control
 * over what gets scaled and what stays full size
 */

export const ZOOM_SCALE = 0.8;

/**
 * Calculate compensated dimensions for zoom scaling
 */
const calculateCompensation = (scale: number) => ({
  width: `${100 / scale}%`,
  minHeight: `${100 / scale}vh`,
  scale: scale
});

/**
 * CSS classes for zoom scaling using Tailwind
 */
export const zoomClasses = {
  // Main content container with zoom scaling
  zoomedContent: `scale-[0.8] origin-top w-[125%] min-h-[125vh] mx-auto`,
  
  // Container to prevent content overflow when scaled
  zoomContainer: `overflow-hidden min-h-screen w-screen`,
  
  // Backgrounds that should stay full size
  fullSizeBackground: `!transform-none !w-screen !h-screen`
};

/**
 * Inline styles for more precise control
 * This is the recommended approach for consistent cross-browser behavior
 */
export const zoomStyles = {
  // Main zoom transform - applies to all content
  zoomedContent: {
    transform: `scale(${ZOOM_SCALE})`,
    transformOrigin: 'top center', // Center horizontally, top vertically
    width: `${100 / ZOOM_SCALE}%`, // 125% to compensate for 80% scale
    minHeight: `${100 / ZOOM_SCALE}vh`, // 125vh to compensate for height
    marginLeft: `${-((100 / ZOOM_SCALE) - 100) / 2}%`, // Center the wider content
    position: 'relative' as const,
  },
  
  // Container adjustments to prevent overflow
  zoomContainer: {
    overflow: 'hidden',
    minHeight: '100vh',
    width: '100vw', // Ensure full width
    position: 'relative' as const
  },
  
  // Backgrounds that should ignore scaling
  fullSizeBackground: {
    transform: 'none !important',
    width: '100vw !important',
    height: '100vh !important',
    position: 'absolute' as const,
    top: 0,
    left: 0
  }
};

/**
 * Alternative zoom scales for easy adjustment
 * Change ZOOM_SCALE above to one of these values for different scaling
 */
export const ZOOM_PRESETS = {
  tiny: 0.7,        // 70% - Very small
  small: 0.8,       // 80% - Current setting (Chrome 80% zoom equivalent)
  compact: 0.85,    // 85% - Slightly smaller
  normal: 1.0,      // 100% - No scaling
  large: 1.1,       // 110% - Slightly larger
  xlarge: 1.2       // 120% - Much larger
};

/**
 * Get zoom styles for a specific scale
 */
export const getZoomStyles = (scale: number = ZOOM_SCALE) => ({
  zoomedContent: {
    transform: `scale(${scale})`,
    transformOrigin: 'top center',
    width: `${100 / scale}%`,
    minHeight: `${100 / scale}vh`,
  },
  zoomContainer: {
    overflow: 'hidden',
    minHeight: '100vh',
    position: 'relative' as const
  },
  fullSizeBackground: {
    transform: 'none !important',
    width: '100vw !important',
    height: '100vh !important',
    position: 'absolute' as const,
    top: 0,
    left: 0
  }
});

export default {
  ZOOM_SCALE,
  ZOOM_PRESETS,
  zoomClasses,
  zoomStyles,
  getZoomStyles
};
