'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In to DashDice</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
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
            required
          />

          <Button
            type="submit"
            className="w-full"
            loading={isSubmitting}
            disabled={!values.email || !values.password}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
