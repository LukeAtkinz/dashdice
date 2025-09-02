'use client';

import React from 'react';
import { User } from 'lucide-react';

interface ProfilePictureProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  fallbackInitials?: string;
  onClick?: () => void;
}

export const ProfilePicture: React.FC<ProfilePictureProps> = ({
  src,
  alt = 'Profile',
  size = 'md',
  className = '',
  fallbackInitials,
  onClick
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // Reset error state when src changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [src]);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-32 h-32'
  };

  const iconSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
    '2xl': 'w-16 h-16'
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-3xl'
  };

  const baseClasses = `
    ${sizeClasses[size]} 
    rounded-full 
    object-cover 
    border-2 
    border-gray-600 
    ${onClick ? 'cursor-pointer hover:border-gray-500 transition-colors' : ''}
    ${className}
  `.trim();

  // Show fallback if no src, error loading, or empty src
  const shouldShowFallback = !src || src.trim() === '' || imageError;

  if (!shouldShowFallback) {
    return (
      <div className="relative">
        <img
          src={src}
          alt={alt}
          className={baseClasses}
          onClick={onClick}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            console.log('ProfilePicture: Failed to load image:', src);
            setImageError(true);
          }}
          style={{ display: imageError ? 'none' : 'block' }}
        />
        {!imageLoaded && !imageError && (
          <div
            className={`
              ${sizeClasses[size]}
              rounded-full
              bg-gradient-to-br from-gray-700 to-gray-800
              border-2 border-gray-600
              flex items-center justify-center
              absolute inset-0
              ${onClick ? 'cursor-pointer hover:border-gray-500 transition-colors' : ''}
            `}
          >
            <div className="animate-pulse">
              <User className={`${iconSizeClasses[size]} text-gray-400`} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback display
  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full
        bg-gradient-to-br from-gray-700 to-gray-800
        border-2 border-gray-600
        flex items-center justify-center
        ${onClick ? 'cursor-pointer hover:border-gray-500 transition-colors' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {fallbackInitials ? (
        <span 
          className={`
            ${textSizeClasses[size]} 
            font-semibold 
            text-gray-300 
            uppercase
          `}
        >
          {fallbackInitials.substring(0, 2)}
        </span>
      ) : (
        <User className={`${iconSizeClasses[size]} text-gray-400`} />
      )}
    </div>
  );
};
