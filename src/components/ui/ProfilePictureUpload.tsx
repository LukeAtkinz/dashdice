'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import ProfilePictureService from '@/services/profilePictureService';

interface ProfilePictureUploadProps {
  onSuccess?: (photoURL: string) => void;
  onError?: (error: string) => void;
}

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  onSuccess,
  onError
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File) => {
    const validation = ProfilePictureService.validateFile(file);
    if (!validation.valid) {
      onError?.(validation.error || 'Invalid file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    if (!user) {
      onError?.('User not authenticated');
      return;
    }

    setIsUploading(true);
    
    try {
      const result = await ProfilePictureService.updateProfilePicture(
        file,
        user.uid,
        user.photoURL || undefined
      );

      if (result.success && result.downloadURL) {
        onSuccess?.(result.downloadURL);
        setPreview(null);
      } else {
        onError?.(result.error || 'Upload failed');
        setPreview(null);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Upload failed');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const currentPhotoURL = preview || user?.photoURL;

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Current Avatar */}
      <div className="relative">
        <motion.div
          className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-300 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openFileDialog}
        >
          {currentPhotoURL ? (
            <img 
              src={currentPhotoURL} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl text-white font-bold">
              {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
        </motion.div>

        {/* Upload Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Upload Icon */}
        <motion.button
          className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={openFileDialog}
          disabled={isUploading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </motion.button>
      </div>

      {/* Drag and Drop Area */}
      <motion.div
        className={`w-full max-w-md p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="space-y-2">
          <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-gray-600">
            <span className="font-medium text-blue-500 hover:text-blue-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-sm text-gray-500">
            JPEG, PNG, or WebP (max 5MB)
          </p>
        </div>
      </motion.div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Status */}
      {isUploading && (
        <div className="text-center">
          <p className="text-sm text-gray-600">Uploading your profile picture...</p>
        </div>
      )}
    </div>
  );
};

export default ProfilePictureUpload;
