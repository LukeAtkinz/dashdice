'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface AppleSignInButtonProps {
  text?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({ 
  text = "Continue with Apple",
  onSuccess,
  onError 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithApple } = useAuth();
  const router = useRouter();

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Apple sign-in error:', error);
      
      // Handle specific error cases
      let errorMessage = 'Failed to sign in with Apple';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Please allow popups for this site';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Apple Sign-In is not enabled';
      }
      
      if (onError) {
        onError({ message: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleAppleSignIn}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-black hover:bg-gray-900 text-white font-medium rounded-xl border border-gray-700 hover:border-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ fontFamily: "Audiowide" }}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      )}
      <span>{text}</span>
    </button>
  );
};