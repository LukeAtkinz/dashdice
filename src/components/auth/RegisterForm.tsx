'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { validateDisplayName } from '@/utils/contentModeration';



interface RegisterFormProps {
  onSuccess?: () => void;
}

// Inline useForm hook to avoid module resolution issues
const useForm = <T extends Record<string, string>>(initialValues: T) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const setError = (field: keyof T, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  };

  const handleSubmit = (onSubmit: (values: T) => Promise<void> | void) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});
      setIsSubmitting(true);
      
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    };
  };

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    setError,
  };
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { signUp } = useAuth();
  const { values, errors, handleChange, handleSubmit, setError, isSubmitting } = useForm({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const onSubmit = handleSubmit(async (formValues) => {
    // Validate display name
    const displayNameValidation = validateDisplayName(formValues.displayName);
    if (!displayNameValidation.isValid) {
      setError('displayName', displayNameValidation.error || 'Invalid display name');
      return;
    }

    // Validate passwords match
    if (formValues.password !== formValues.confirmPassword) {
      setError('confirmPassword', 'Passwords do not match');
      return;
    }

    // Validate password strength
    if (formValues.password.length < 6) {
      setError('password', 'Password must be at least 6 characters long');
      return;
    }

    try {
      await signUp(formValues.email, formValues.password, formValues.displayName);
      onSuccess?.();
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('email', 'An account with this email already exists');
      } else if (error.code === 'auth/invalid-email') {
        setError('email', 'Invalid email address');
      } else if (error.code === 'auth/weak-password') {
        setError('password', 'Password is too weak');
      } else if (error.message && !error.code) {
        // This is a display name validation error
        setError('displayName', error.message);
      } else {
        setError('password', 'Failed to create account. Please try again');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Display Name Input */}
      <div className="space-y-2">
        <label 
          className="block text-white/90 text-sm font-medium"
          style={{ fontFamily: "Audiowide" }}
        >
          DISPLAY NAME
        </label>
        <input
          type="text"
          name="displayName"
          value={values.displayName}
          onChange={(e) => handleChange('displayName', e.target.value)}
          placeholder="Enter your display name"
          maxLength={12}
          required
          className="w-full px-4 py-3 bg-black/40 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-yellow-400 focus:bg-black/60 transition-all backdrop-blur-sm"
        />
        <p className="text-white/60 text-xs">2-12 characters, no inappropriate content</p>
        {errors.displayName && (
          <p className="text-red-400 text-sm">{errors.displayName}</p>
        )}
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <label 
          className="block text-white/90 text-sm font-medium"
          style={{ fontFamily: "Audiowide" }}
        >
          EMAIL
        </label>
        <input
          type="email"
          name="email"
          value={values.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="Enter your email"
          required
          className="w-full px-4 py-3 bg-black/40 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-yellow-400 focus:bg-black/60 transition-all backdrop-blur-sm"
        />
        {errors.email && (
          <p className="text-red-400 text-sm">{errors.email}</p>
        )}
      </div>
      
      {/* Password Input */}
      <div className="space-y-2">
        <label 
          className="block text-white/90 text-sm font-medium"
          style={{ fontFamily: "Audiowide" }}
        >
          PASSWORD
        </label>
        <input
          type="password"
          name="password"
          value={values.password}
          onChange={(e) => handleChange('password', e.target.value)}
          placeholder="Enter your password"
          required
          className="w-full px-4 py-3 bg-black/40 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-yellow-400 focus:bg-black/60 transition-all backdrop-blur-sm"
        />
        <p className="text-white/60 text-xs">Must be at least 6 characters long</p>
        {errors.password && (
          <p className="text-red-400 text-sm">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password Input */}
      <div className="space-y-2">
        <label 
          className="block text-white/90 text-sm font-medium"
          style={{ fontFamily: "Audiowide" }}
        >
          CONFIRM PASSWORD
        </label>
        <input
          type="password"
          name="confirmPassword"
          value={values.confirmPassword}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          placeholder="Confirm your password"
          required
          className="w-full px-4 py-3 bg-black/40 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-yellow-400 focus:bg-black/60 transition-all backdrop-blur-sm"
        />
        {errors.confirmPassword && (
          <p className="text-red-400 text-sm">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!values.email || !values.password || !values.displayName || !values.confirmPassword || isSubmitting}
        className="w-full py-3 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-600 disabled:to-gray-700 text-black font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:cursor-not-allowed disabled:transform-none backdrop-blur-sm"
        style={{ fontFamily: "Audiowide" }}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
            CREATING ACCOUNT...
          </div>
        ) : (
          'CREATE ACCOUNT'
        )}
      </button>
    </form>
  );
};
