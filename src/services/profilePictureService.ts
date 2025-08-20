import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  StorageReference 
} from 'firebase/storage';
import { storage } from './firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface UploadResult {
  success: boolean;
  downloadURL?: string;
  error?: string;
}

export class ProfilePictureService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly IMAGE_QUALITY = 0.8;
  private static readonly MAX_DIMENSIONS = { width: 512, height: 512 };

  /**
   * Validate the uploaded file
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' 
      };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: 'File size too large. Please upload an image smaller than 5MB.' 
      };
    }

    return { valid: true };
  }

  /**
   * Resize and compress image
   */
  static async resizeImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        const { width, height } = this.calculateDimensions(img.width, img.height);
        
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          this.IMAGE_QUALITY
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate new dimensions maintaining aspect ratio
   */
  private static calculateDimensions(originalWidth: number, originalHeight: number) {
    const { width: maxWidth, height: maxHeight } = this.MAX_DIMENSIONS;
    
    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  /**
   * Upload profile picture to Firebase Storage
   */
  static async uploadProfilePicture(
    file: File, 
    userId: string, 
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Resize and compress image
      const compressedImage = await this.resizeImage(file);
      
      // Create storage reference
      const fileName = `profile_pictures/${userId}/${Date.now()}.${file.type.split('/')[1]}`;
      const storageRef = ref(storage, fileName);

      // Upload with progress tracking
      const uploadTask = uploadBytes(storageRef, compressedImage);
      
      // Note: Firebase v9+ uploadBytes doesn't support progress tracking
      // For progress, we'd need to use uploadBytesResumable
      
      const snapshot = await uploadTask;
      const downloadURL = await getDownloadURL(snapshot.ref);

      return { success: true, downloadURL };
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  /**
   * Update user profile with new picture URL
   */
  static async updateUserProfilePicture(userId: string, photoURL: string): Promise<void> {
    try {
      // Update Firebase Auth profile
      const { auth } = await import('./firebase');
      const user = auth.currentUser;
      
      if (user) {
        await updateProfile(user, { photoURL });
      }

      // Update user document in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        photoURL,
        updatedAt: new Date()
      });

    } catch (error) {
      console.error('Error updating user profile picture:', error);
      throw error;
    }
  }

  /**
   * Delete old profile picture from storage
   */
  static async deleteOldProfilePicture(oldPhotoURL: string): Promise<void> {
    try {
      // Only delete if it's a Firebase Storage URL
      if (oldPhotoURL && oldPhotoURL.includes('firebasestorage.googleapis.com')) {
        const storageRef = ref(storage, oldPhotoURL);
        await deleteObject(storageRef);
      }
    } catch (error) {
      // Don't throw error for cleanup failures
      console.warn('Failed to delete old profile picture:', error);
    }
  }

  /**
   * Complete profile picture update process
   */
  static async updateProfilePicture(
    file: File, 
    userId: string,
    currentPhotoURL?: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    try {
      // Upload new picture
      const uploadResult = await this.uploadProfilePicture(file, userId, onProgress);
      
      if (!uploadResult.success || !uploadResult.downloadURL) {
        return uploadResult;
      }

      // Update user profile
      await this.updateUserProfilePicture(userId, uploadResult.downloadURL);

      // Clean up old picture
      if (currentPhotoURL) {
        await this.deleteOldProfilePicture(currentPhotoURL);
      }

      return uploadResult;
    } catch (error) {
      console.error('Error in complete profile picture update:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Profile picture update failed' 
      };
    }
  }
}

export default ProfilePictureService;
