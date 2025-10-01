'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface LoginFormProps {
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

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { signIn } = useAuth();
  const { values, errors, handleChange, handleSubmit, setError, isSubmitting } = useForm({
    email: '',
    password: '',
  });

  const onSubmit = handleSubmit(async (formValues) => {
    try {
      await signIn(formValues.email, formValues.password);
      onSuccess?.();
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setError('email', 'No account found with this email address');
      } else if (error.code === 'auth/wrong-password') {
        setError('password', 'Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        setError('email', 'Invalid email address');
      } else if (error.code === 'auth/too-many-requests') {
        setError('password', 'Too many failed attempts. Please try again later');
      } else {
        setError('password', 'Failed to sign in. Please try again');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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
        {errors.password && (
          <p className="text-red-400 text-sm">{errors.password}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!values.email || !values.password || isSubmitting}
        className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:cursor-not-allowed disabled:transform-none backdrop-blur-sm"
        style={{ fontFamily: "Audiowide" }}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            SIGNING IN...
          </div>
        ) : (
          'SIGN IN'
        )}
      </button>
    </form>
  );
};
