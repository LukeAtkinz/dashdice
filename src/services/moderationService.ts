import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export class ModerationService {
  // Basic profanity list - in production, use external service like Google Perspective API
  private static profanityList = [
    // Strong profanity
    'fuck', 'shit', 'damn', 'bitch', 'ass', 'bastard', 'crap',
    'piss', 'cock', 'dick', 'pussy', 'whore', 'slut', 'cunt',
    'faggot', 'nigger', 'retard', 'spic', 'chink', 'kike',
    // Gaming-specific toxic terms
    'noob', 'scrub', 'trash', 'garbage', 'ez', 'rekt', 'pwned',
    'git gud', 'uninstall', 'rage quit', 'hacker', 'cheater'
  ];

  private static moderateWords = [
    // Mild inappropriate language
    'stupid', 'dumb', 'idiot', 'moron', 'loser', 'suck', 'sucks',
    'hate', 'kill', 'die', 'gay', 'lame', 'weird', 'ugly'
  ];

  // Spam detection patterns
  private static spamPatterns = [
    /(.)\1{4,}/g, // Repeated characters (5+ times)
    /[A-Z]{5,}/g, // ALL CAPS (5+ characters)
    /(https?:\/\/[^\s]+)/g, // URLs
    /(\b\w+\b)(\s+\1){2,}/g, // Repeated words (3+ times)
  ];

  static moderateContent(content: string, filterLevel: 'strict' | 'moderate' | 'off' = 'moderate'): {
    moderatedContent: string;
    isModerated: boolean;
    flags: string[];
  } {
    if (filterLevel === 'off') {
      return { moderatedContent: content, isModerated: false, flags: [] };
    }

    let moderatedContent = content;
    const flags: string[] = [];
    let isModerated = false;

    // Check for profanity
    const profanityToCheck = filterLevel === 'strict' 
      ? [...this.profanityList, ...this.moderateWords]
      : this.profanityList;

    for (const word of profanityToCheck) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(moderatedContent)) {
        moderatedContent = moderatedContent.replace(regex, '*'.repeat(word.length));
        flags.push('profanity');
        isModerated = true;
      }
    }

    // Check for spam patterns
    for (const pattern of this.spamPatterns) {
      if (pattern.test(content)) {
        flags.push('spam');
        isModerated = true;
      }
    }

    // Check message length
    if (content.length > 500) {
      flags.push('too_long');
      moderatedContent = content.substring(0, 500) + '...';
      isModerated = true;
    }

    // Check for excessive repetition
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hasExcessiveRepetition = Object.values(wordCount).some(count => count > 3);
    if (hasExcessiveRepetition) {
      flags.push('repetitive');
      isModerated = true;
    }

    return { moderatedContent, isModerated, flags };
  }

  static async logModerationAction(
    messageId: string,
    roomId: string,
    userId: string,
    action: 'flagged' | 'edited' | 'deleted' | 'user_muted' | 'user_banned',
    reason: string,
    originalContent?: string,
    moderatedContent?: string,
    moderatorId?: string
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'moderationLogs'), {
        messageId,
        roomId,
        userId,
        moderatorId,
        action,
        reason,
        originalContent,
        moderatedContent,
        timestamp: serverTimestamp(),
        autoModerated: !moderatorId
      });
    } catch (error) {
      console.error('Error logging moderation action:', error);
    }
  }

  // Check if user should be auto-muted based on moderation history
  static async shouldAutoMute(userId: string, roomId: string): Promise<boolean> {
    // In a real implementation, query moderation logs to check recent violations
    // For now, return false (no auto-muting)
    return false;
  }

  // Advanced moderation using external service (placeholder)
  static async moderateWithAI(content: string): Promise<{
    isApproved: boolean;
    confidence: number;
    categories: string[];
    moderatedContent?: string;
  }> {
    // In production, integrate with services like:
    // - OpenAI Moderation API
    // - Google Cloud AI Platform
    // - Microsoft Content Moderator
    // - Perspective API by Jigsaw
    
    const result = this.moderateContent(content);
    
    return {
      isApproved: !result.isModerated,
      confidence: result.isModerated ? 0.8 : 0.9,
      categories: result.flags,
      moderatedContent: result.moderatedContent
    };
  }

  // Real-time content filtering for live chat
  static filterRealTimeContent(content: string): {
    shouldBlock: boolean;
    reason?: string;
  } {
    // Immediate blocking criteria
    const immediateBlockPatterns = [
      /discord\.gg\/\w+/i, // Discord invite links
      /t\.me\/\w+/i, // Telegram links
      /bit\.ly\/\w+/i, // Shortened URLs
      /tinyurl\.com\/\w+/i, // Shortened URLs
    ];

    for (const pattern of immediateBlockPatterns) {
      if (pattern.test(content)) {
        return { shouldBlock: true, reason: 'suspicious_link' };
      }
    }

    // Check for excessive caps (>70% caps)
    const capsPercentage = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsPercentage > 0.7 && content.length > 10) {
      return { shouldBlock: true, reason: 'excessive_caps' };
    }

    // Check for rapid fire messaging (would need to be tracked externally)
    return { shouldBlock: false };
  }

  // Generate moderation report
  static generateModerationReport(content: string): {
    score: number; // 0-100, higher = more problematic
    issues: string[];
    suggestions: string[];
  } {
    const result = this.moderateContent(content, 'strict');
    let score = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (result.flags.includes('profanity')) {
      score += 40;
      issues.push('Contains inappropriate language');
      suggestions.push('Consider rephrasing without offensive terms');
    }

    if (result.flags.includes('spam')) {
      score += 30;
      issues.push('Appears to be spam or repetitive content');
      suggestions.push('Make your message more meaningful and less repetitive');
    }

    if (result.flags.includes('too_long')) {
      score += 10;
      issues.push('Message is too long');
      suggestions.push('Break your message into smaller parts');
    }

    // Check for all caps
    const capsPercentage = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsPercentage > 0.5 && content.length > 5) {
      score += 15;
      issues.push('Excessive use of capital letters');
      suggestions.push('Use normal capitalization for better readability');
    }

    return { score, issues, suggestions };
  }
}
