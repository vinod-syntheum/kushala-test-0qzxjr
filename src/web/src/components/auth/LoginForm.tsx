import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form'; // ^7.0.0
import * as yup from 'yup'; // ^1.0.0
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import Input from '../common/Input';
import { LoginCredentials } from '../../types/auth';
import { HttpStatusCode } from '../../types/common';

// Validation schema with comprehensive security rules
const loginSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email')
    .max(255, 'Email must be less than 255 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
});

export interface LoginFormProps {
  /** Callback function called on successful login */
  onSuccess?: (data: LoginCredentials) => void;
  /** Callback function called on login error */
  onError?: (error: Error) => void;
  /** Optional CSS class name for styling */
  className?: string;
}

/**
 * Secure login form component with comprehensive validation and error handling
 * Implements JWT-based authentication with rate limiting and security best practices
 * @version 1.0.0
 */
const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onError,
  className = ''
}) => {
  // Authentication hook for login functionality
  const { login, isLoading } = useAuth();

  // Local state for rate limiting and error handling
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null);

  // Form handling with validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset
  } = useForm<LoginCredentials>({
    mode: 'onBlur',
    resolver: async (data) => {
      try {
        await loginSchema.validate(data, { abortEarly: false });
        return { values: data, errors: {} };
      } catch (err) {
        const yupError = err as yup.ValidationError;
        const errors = yupError.inner.reduce((acc, error) => {
          if (error.path) {
            acc[error.path] = {
              type: error.type ?? 'validation',
              message: error.message
            };
          }
          return acc;
        }, {} as Record<string, { type: string; message: string; }>);
        return { values: {}, errors };
      }
    }
  });

  // Handle rate limiting
  const checkRateLimit = useCallback(() => {
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

    if (isLocked && lockoutEndTime && new Date() >= lockoutEndTime) {
      setIsLocked(false);
      setAttempts(0);
      setLockoutEndTime(null);
      return false;
    }

    if (attempts >= MAX_ATTEMPTS) {
      setIsLocked(true);
      setLockoutEndTime(new Date(Date.now() + LOCKOUT_DURATION));
      return true;
    }

    return false;
  }, [attempts, isLocked, lockoutEndTime]);

  // Handle form submission
  const onSubmit = useCallback(async (data: LoginCredentials) => {
    if (checkRateLimit()) {
      return;
    }

    try {
      await login(data);
      setAttempts(0);
      reset();
      onSuccess?.(data);
    } catch (error: any) {
      setAttempts((prev) => prev + 1);
      
      if (error.status === HttpStatusCode.UNAUTHORIZED) {
        setError('root', {
          type: 'manual',
          message: 'Invalid email or password'
        });
      } else {
        setError('root', {
          type: 'manual',
          message: 'An error occurred during login. Please try again.'
        });
      }
      
      onError?.(error);
    }
  }, [login, checkRateLimit, setError, reset, onSuccess, onError]);

  // Render lockout message if account is locked
  if (isLocked && lockoutEndTime) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-700">
          Account temporarily locked due to too many failed attempts.
          Please try again after {new Date(lockoutEndTime).toLocaleTimeString()}.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`space-y-6 ${className}`}
      noValidate
    >
      <Input
        id="email"
        type="email"
        label="Email"
        {...register('email')}
        error={errors.email?.message}
        disabled={isLoading}
        required
        aria-label="Email address"
        autoComplete="email"
      />

      <Input
        id="password"
        type="password"
        label="Password"
        {...register('password')}
        error={errors.password?.message}
        disabled={isLoading}
        required
        aria-label="Password"
        autoComplete="current-password"
      />

      {errors.root && (
        <div
          className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded"
          role="alert"
        >
          {errors.root.message}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={isLoading}
        disabled={isLoading || isLocked}
        aria-label="Sign in to your account"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
};

export default LoginForm;