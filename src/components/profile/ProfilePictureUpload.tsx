'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { ImageModerationService, ModerationResult } from '@/services/imageModerationService';
import { UserService } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';

interface ProfilePictureUploadProps {
  currentImageUrl?: string;
  onUploadSuccess: (imageUrl: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImageUrl,
  onUploadSuccess,
  onUploadError,
  className = ''
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moderationDetails, setModerationDetails] = useState<ModerationResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset previous state
    setError(null);
    setModerationDetails(null);

    // Validate file
    const validation = ImageModerationService.validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Start upload process
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    if (!user?.uid) {
      setError('You must be logged in to upload a profile picture');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      console.log('🔍 Starting secure profile picture upload...');
      
      const result = await ImageModerationService.uploadProfilePicture(file, user.uid);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.profilePictureUrl) {
        console.log('✅ Profile picture uploaded successfully');
        setModerationDetails(result.moderationDetails || null);
        
        // Update user profile in Firebase
        try {
          await UserService.updateProfilePicture(user.uid, result.profilePictureUrl);
          console.log('✅ User profile updated with new picture URL');
        } catch (updateError) {
          console.error('❌ Failed to update user profile:', updateError);
        }
        
        // Small delay to show 100% progress
        setTimeout(() => {
          onUploadSuccess(result.profilePictureUrl!);
          setIsUploading(false);
          setPreviewUrl(null);
          setUploadProgress(0);
        }, 500);
      } else {
        console.error('❌ Upload failed:', result.error);
        setError(result.error || 'Upload failed');
        setModerationDetails(result.moderationDetails || null);
        setIsUploading(false);
        setUploadProgress(0);
        
        if (onUploadError) {
          onUploadError(result.error || 'Upload failed');
        }
      }

    } catch (error) {
      console.error('❌ Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setIsUploading(false);
      setUploadProgress(0);
      
      if (onUploadError) {
        onUploadError(error instanceof Error ? error.message : 'Upload failed');
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      // Manually trigger file selection logic
      setError(null);
      setModerationDetails(null);

      // Validate file
      const validation = ImageModerationService.validateImageFile(file);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Start upload process
      handleUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const clearPreview = () => {
    setPreviewUrl(null);
    setError(null);
    setModerationDetails(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all duration-200
          ${isUploading ? 'border-blue-400 bg-blue-50/10' : 'border-gray-600 hover:border-gray-500'}
          ${error ? 'border-red-400 bg-red-50/10' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <div className="text-center">
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-gray-600"
              />
              {!isUploading && (
                <button
                  onClick={clearPreview}
                  className="absolute top-0 right-1/2 translate-x-16 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt="Current profile"
              className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-gray-600"
            />
          ) : (
            <div className="w-32 h-32 mx-auto rounded-full bg-gray-700 border-4 border-gray-600 flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
          )}

          {isUploading ? (
            <div className="mt-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Loader className="w-5 h-5 animate-spin text-blue-400" />
                <span className="text-blue-400">Processing image...</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-blue-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {uploadProgress < 50 ? 'Uploading...' : 
                 uploadProgress < 90 ? 'Checking for inappropriate content...' : 
                 'Finalizing...'}
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-gray-300 mb-2">
                {previewUrl ? 'Ready to upload' : 'Drop your profile picture here or click to browse'}
              </p>
              <p className="text-sm text-gray-500">
                Supports JPEG, PNG, WebP, and GIF up to 5MB
              </p>
              <p className="text-xs text-gray-600 mt-1">
                🛡️ All images are automatically checked for inappropriate content
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-900/30 border border-red-500 rounded-lg p-4"
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-red-400 font-medium">Upload Failed</h3>
                <p className="text-red-300 text-sm mt-1">{error}</p>
                
                {moderationDetails && !moderationDetails.isAppropriate && (
                  <div className="mt-2 text-xs text-red-200">
                    <p className="font-medium">Content concerns detected:</p>
                    <ul className="list-disc list-inside mt-1">
                      {moderationDetails.reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                    <p className="mt-1 opacity-80">
                      Confidence: {Math.round(moderationDetails.confidence * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success with Moderation Details */}
      <AnimatePresence>
        {moderationDetails && moderationDetails.isAppropriate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-green-900/30 border border-green-500 rounded-lg p-4"
          >
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-green-400 font-medium">Image Approved</h3>
                <p className="text-green-300 text-sm mt-1">
                  Your profile picture passed all content safety checks
                </p>
                <p className="text-xs text-green-200 mt-1 opacity-80">
                  Safety confidence: {Math.round(moderationDetails.confidence * 100)}%
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Guidelines */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Upload Guidelines</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Use a clear photo of yourself or a gaming avatar</li>
          <li>• Avoid inappropriate, offensive, or copyrighted content</li>
          <li>• Images are automatically scanned for safety</li>
          <li>• Rejected images can be appealed through support</li>
        </ul>
      </div>
    </div>
  );
};
