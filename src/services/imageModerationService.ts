import { ref, uploadBytes, deleteObject, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export interface ModerationResult {
  isAppropriate: boolean;
  confidence: number;
  reasons: string[];
  details?: any;
}

export class ImageModerationService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private static readonly MODERATION_API_URL = '/api/moderate-image';

  /**
   * Validate image file before upload
   */
  static validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return { isValid: false, error: 'File size must be less than 5MB' };
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { isValid: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
    }

    // Basic file name validation
    if (file.name.length > 100) {
      return { isValid: false, error: 'Filename is too long' };
    }

    return { isValid: true };
  }

  /**
   * Upload image to temporary location for moderation
   */
  static async uploadForModeration(file: File, userId: string): Promise<string> {
    const validation = this.validateImageFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const tempRef = ref(storage, `temp-uploads/${userId}/${fileName}`);

    try {
      const snapshot = await uploadBytes(tempRef, file);
      return snapshot.ref.fullPath;
    } catch (error) {
      console.error('Error uploading file for moderation:', error);
      throw new Error('Failed to upload image for processing');
    }
  }

  /**
   * Moderate image using multiple detection methods
   */
  static async moderateImage(imagePath: string): Promise<ModerationResult> {
    try {
      // Get download URL for the temp image
      const imageRef = ref(storage, imagePath);
      const downloadURL = await getDownloadURL(imageRef);

      // Send to moderation API
      const response = await fetch(this.MODERATION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: downloadURL,
          imagePath: imagePath
        }),
      });

      if (!response.ok) {
        throw new Error(`Moderation API error: ${response.status}`);
      }

      const result: ModerationResult = await response.json();
      
      // Clean up temp file
      await this.cleanupTempImage(imagePath);

      return result;
    } catch (error) {
      console.error('Error moderating image:', error);
      
      // Clean up temp file on error
      await this.cleanupTempImage(imagePath);
      
      // Return conservative result on error
      return {
        isAppropriate: false,
        confidence: 0,
        reasons: ['Moderation service unavailable'],
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Move approved image to final profile pictures location
   */
  static async moveToProfilePictures(tempPath: string, userId: string): Promise<string> {
    try {
      // Get the temp file
      const tempRef = ref(storage, tempPath);
      const downloadURL = await getDownloadURL(tempRef);
      
      // Download the file data
      const response = await fetch(downloadURL);
      const blob = await response.blob();
      
      // Create new file in profile-pictures
      const fileName = `profile_${Date.now()}.${blob.type.split('/')[1]}`;
      const finalRef = ref(storage, `profile-pictures/${userId}/${fileName}`);
      
      // Upload to final location
      await uploadBytes(finalRef, blob);
      
      // Clean up temp file
      await deleteObject(tempRef);
      
      // Return final download URL
      return await getDownloadURL(finalRef);
    } catch (error) {
      console.error('Error moving image to profile pictures:', error);
      throw new Error('Failed to finalize profile picture upload');
    }
  }

  /**
   * Clean up temporary image
   */
  static async cleanupTempImage(imagePath: string): Promise<void> {
    try {
      const tempRef = ref(storage, imagePath);
      await deleteObject(tempRef);
    } catch (error) {
      console.error('Error cleaning up temp image:', error);
      // Don't throw - cleanup errors shouldn't break the flow
    }
  }

  /**
   * Complete profile picture upload with moderation
   */
  static async uploadProfilePicture(file: File, userId: string): Promise<{
    success: boolean;
    profilePictureUrl?: string;
    error?: string;
    moderationDetails?: ModerationResult;
  }> {
    try {
      console.log('🔍 Starting profile picture upload with moderation for user:', userId);

      // Step 1: Upload to temp location
      const tempPath = await this.uploadForModeration(file, userId);
      console.log('📤 Image uploaded to temp location:', tempPath);

      // Step 2: Moderate the image
      const moderationResult = await this.moderateImage(tempPath);
      console.log('🛡️ Moderation result:', moderationResult);

      // Step 3: Check if appropriate
      if (!moderationResult.isAppropriate) {
        return {
          success: false,
          error: `Image rejected: ${moderationResult.reasons.join(', ')}`,
          moderationDetails: moderationResult
        };
      }

      // Step 4: Move to final location
      const profilePictureUrl = await this.moveToProfilePictures(tempPath, userId);
      console.log('✅ Profile picture uploaded successfully:', profilePictureUrl);

      return {
        success: true,
        profilePictureUrl,
        moderationDetails: moderationResult
      };

    } catch (error) {
      console.error('❌ Profile picture upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }
}
