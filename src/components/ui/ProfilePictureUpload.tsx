'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, User, X, Check, Image, Move } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { ProfilePicturePositioner, ImagePositioning } from '@/components/profile/ProfilePicturePositioner';

interface ProfilePictureUploadProps {
  currentPhotoURL?: string;
  onUploadComplete?: (newPhotoURL: string) => void;
  className?: string;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentPhotoURL,
  onUploadComplete,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPositioner, setShowPositioner] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(currentPhotoURL || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Update currentImageUrl when currentPhotoURL prop changes
  React.useEffect(() => {
    setCurrentImageUrl(currentPhotoURL || null);
  }, [currentPhotoURL]);

  const isValidImageFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    
    return validTypes.includes(file.type) && file.size <= maxSizeInBytes;
  };

  const resizeImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');
      
      img.onload = () => {
        const maxSize = 400; // Max width/height
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, { type: file.type });
            resolve(resizedFile);
          } else {
            resolve(file);
          }
        }, file.type, 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!isValidImageFile(file)) {
      alert('Please select a valid image file (JPEG, PNG, or WebP) under 5MB.');
      return;
    }

    try {
      // Resize image for better performance
      const resizedFile = await resizeImage(file);
      
      // Create preview URL and store file for positioning
      const objectUrl = URL.createObjectURL(resizedFile);
      setPreviewImage(objectUrl);
      setSelectedFile(resizedFile);
      setShowPositioner(true);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const cancelPreview = () => {
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File, positioning?: ImagePositioning) => {
    if (!user) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `profile-pictures/${user.uid}/${Date.now()}`);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          return newProgress >= 95 ? 95 : newProgress;
        });
      }, 200);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Update user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        profilePicture: downloadURL,
        photoURL: downloadURL, // Keep for backward compatibility
        updatedAt: new Date()
      });

      // Update local state immediately for instant UI update
      setCurrentImageUrl(downloadURL);
      
      // Show success state
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setPreviewImage(null);
        setSelectedFile(null);
      }, 2000);

      // Callback to parent component
      onUploadComplete?.(downloadURL);
      
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture. Please try again.');
      setPreviewImage(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePositioningSave = (positioning: ImagePositioning) => {
    if (selectedFile) {
      uploadImage(selectedFile, positioning);
    }
    setShowPositioner(false);
  };

  const handlePositioningCancel = () => {
    setShowPositioner(false);
    setPreviewImage(null);
    setSelectedFile(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMoveExisting = () => {
    if (currentImageUrl || currentPhotoURL) {
      setPreviewImage(currentImageUrl || currentPhotoURL || '');
      setShowPositioner(true);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      
      <motion.div
        className="relative group"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {/* Main Profile Picture Container */}
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg">
          {/* Profile Image */}
          <div className="w-full h-full relative">
            {previewImage || currentImageUrl || currentPhotoURL ? (
              <motion.img
                src={previewImage || currentImageUrl || currentPhotoURL}
                alt="Profile"
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                <User className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Upload Progress Overlay */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full border-4 border-white border-t-transparent animate-spin mb-2" />
                <div className="text-white text-sm font-semibold">{Math.round(uploadProgress)}%</div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Success Overlay */}
          <AnimatePresence>
            {uploadSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 bg-green-500 bg-opacity-90 flex items-center justify-center"
              >
                <Check className="w-12 h-12 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Hover Overlay */}
          <AnimatePresence>
            {isHovered && !isUploading && !uploadSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center cursor-pointer"
                onClick={handleUploadClick}
              >
                <div className="text-center">
                  <Camera className="w-8 h-8 text-white mx-auto mb-1" />
                  <span className="text-white text-xs font-medium">Change Photo</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Camera Icon Button */}
        <AnimatePresence>
          {!isUploading && !uploadSuccess && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUploadClick}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-3 border-white transition-colors"
            >
              <Camera className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </AnimatePresence>
        
        {/* Preview Cancel Button */}
        <AnimatePresence>
          {previewImage && !isUploading && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={cancelPreview}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </motion.button>
          )}
        </AnimatePresence>
        
        {/* Move/Position Button for existing images */}
        <AnimatePresence>
          {!isUploading && !uploadSuccess && !previewImage && (currentImageUrl || currentPhotoURL) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMoveExisting}
              className="absolute -bottom-2 -left-2 w-10 h-10 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center shadow-lg border-3 border-white transition-colors"
            >
              <Move className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Profile Picture Positioning Modal */}
      <AnimatePresence>
        {showPositioner && previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          >
            <ProfilePicturePositioner
              imageUrl={previewImage}
              onSave={handlePositioningSave}
              onCancel={handlePositioningCancel}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Upload Instructions */}
    </div>
  );
};

export default ProfilePictureUpload;
