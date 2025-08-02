/**
 * Content moderation utility for filtering inappropriate content
 */

// Basic profanity word list - this should be expanded in production
const PROFANITY_WORDS = [
  'nigga', 'nigger', 'faggot', 'fag', 'retard', 'rape', 'porn', 'fuck',
  'shit', 'bitch', 'asshole', 'damn', 'hell', 'cunt', 'dick', 'pussy',
  'whore', 'slut', 'bastard', 'piss', 'cock', 'tits', 'nazi', 'hitler',
  'kill', 'die', 'suicide', 'murder', 'terrorist', 'bomb', 'gun', 'weapon',
  'hate', 'racist', 'sexist', 'homophobic', 'transphobic', 'abuse', 'violence'
];

/**
 * Check if a string contains profanity or inappropriate content
 */
export const containsProfanity = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  const cleanText = text.toLowerCase().trim();
  
  // Check for exact matches and partial matches
  return PROFANITY_WORDS.some(word => {
    const pattern = new RegExp(`\\b${word}\\b|${word}`, 'gi');
    return pattern.test(cleanText);
  });
};

/**
 * Validate display name according to game rules
 */
export const validateDisplayName = (displayName: string): { isValid: boolean; error?: string } => {
  // Check if empty
  if (!displayName || displayName.trim().length === 0) {
    return { isValid: false, error: 'Display name is required' };
  }

  // Trim whitespace
  const cleanName = displayName.trim();

  // Check length (minimum 2, maximum 12)
  if (cleanName.length < 2) {
    return { isValid: false, error: 'Display name must be at least 2 characters long' };
  }

  if (cleanName.length > 12) {
    return { isValid: false, error: 'Display name must be 12 characters or less' };
  }

  // Check for profanity
  if (containsProfanity(cleanName)) {
    return { isValid: false, error: 'Display name contains inappropriate content' };
  }

  // Check for valid characters (letters, numbers, spaces, underscores, hyphens)
  const validCharPattern = /^[a-zA-Z0-9\s_-]+$/;
  if (!validCharPattern.test(cleanName)) {
    return { isValid: false, error: 'Display name can only contain letters, numbers, spaces, underscores, and hyphens' };
  }

  // Prevent names that are only spaces/special chars
  const hasLetterOrNumber = /[a-zA-Z0-9]/.test(cleanName);
  if (!hasLetterOrNumber) {
    return { isValid: false, error: 'Display name must contain at least one letter or number' };
  }

  // Prevent reserved/system names
  const reservedNames = ['admin', 'system', 'bot', 'null', 'undefined', 'anonymous', 'guest', 'user'];
  if (reservedNames.includes(cleanName.toLowerCase())) {
    return { isValid: false, error: 'This display name is reserved and cannot be used' };
  }

  return { isValid: true };
};

/**
 * Clean and format display name
 */
export const formatDisplayName = (displayName: string): string => {
  if (!displayName) return '';
  
  return displayName
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .substring(0, 12); // Ensure max length
};

/**
 * Generate a suggested display name from email
 */
export const generateDisplayNameFromEmail = (email: string): string => {
  if (!email) return 'Player';
  
  const username = email.split('@')[0];
  const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '');
  
  // Take first 12 characters and capitalize first letter
  const suggested = cleanUsername.substring(0, 12);
  return suggested.charAt(0).toUpperCase() + suggested.slice(1).toLowerCase();
};

export default {
  containsProfanity,
  validateDisplayName,
  formatDisplayName,
  generateDisplayNameFromEmail
};
