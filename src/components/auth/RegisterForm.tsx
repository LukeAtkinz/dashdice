'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Your DashDice Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Display Name"
            type="text"
            name="displayName"
            value={values.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
            error={errors.displayName}
            placeholder="Enter your display name"
            helperText="2-12 characters, no inappropriate content"
            maxLength={12}
            required
          />

          <Input
            label="Email"
            type="email"
            name="email"
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            placeholder="Enter your email"
            required
          />
          
          <Input
            label="Password"
            type="password"
            name="password"
            value={values.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={errors.password}
            placeholder="Enter your password"
            helperText="Must be at least 6 characters long"
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={values.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            placeholder="Confirm your password"
            required
          />

          <Button
            type="submit"
            className="w-full"
            loading={isSubmitting}
            disabled={!values.email || !values.password || !values.displayName || !values.confirmPassword}
          >
            {isSubmitting ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
