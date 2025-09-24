/**
 * Utility functions for handling image paths in the application
 */

/**
 * Encodes image paths to handle spaces and special characters
 * @param path - The image path relative to the public directory
 * @returns URL-encoded path suitable for use in src attributes
 */
export function encodeImagePath(path: string): string {
  // Split the path into segments and encode each segment
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

/**
 * Common image paths used in the application
 */
export const IMAGE_PATHS = {
  // Main branding
  CROWN_LOGO: '/Design Elements/CrownLogo.webp',
  
  // Characters
  DELIVERY_MAN: '/Design Elements/Delivery Man.webp',
  
  // Social
  FRIENDS: '/Design Elements/friends.webp',
  
  // Player Profiles
  VAULT: '/Design Elements/Player Profiles/Vault.webp',
  QUICK_MATCH: '/Design Elements/Player Profiles/QuickMatch.webp',
  RANKED: '/Design Elements/Player Profiles/Ranked.webp',
  GAME_DURATION: '/Design Elements/Player Profiles/Game Duration.webp',
  YOUR_SCORE: '/Design Elements/Player Profiles/Your Score.webp',
  
  // UI Elements
  DISCOUNT_TAG: '/Design Elements/discount tag.webp',
  LOCK: '/Design Elements/lock.png',
  LOST_CONNECTION: '/Design Elements/lost connection.webp',
  
  // Game Elements
  SHIELD: '/Design Elements/Shield.webp',
  CROWN_MODE: '/Design Elements/Crown Mode.webp',
  TIME_OUT: '/Design Elements/time out.webp',
  SKULL: '/Design Elements/skull.webp',
  CASTLE: '/Design Elements/Castle.webp',
} as const;

/**
 * Get a properly encoded image URL
 * @param imagePath - Path from IMAGE_PATHS or custom path
 * @returns Encoded URL ready for use in img src
 */
export function getImageUrl(imagePath: string): string {
  return encodeImagePath(imagePath);
}