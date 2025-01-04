'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ResetPasswordForm from '../../../components/auth/ResetPasswordForm';
import type { PasswordResetConfirmation } from '../../../types/auth';
import type { ValidationError } from '../../../types/common';

// Rate limiting configuration
const RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 3600000, // 1 hour
  blockDuration: 7200000 // 2 hours
};

/**
 * Password reset page component with comprehensive security features
 * Implements token validation, rate limiting, and accessibility
 * @version 1.0.0
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string>('');
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string>('');

  // Initialize rate limiting state
  const [attempts, setAttempts] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockExpiry, setBlockExpiry] = useState<number>(0);

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (!resetToken) {
      setError('Missing password reset token');
      setIsValidating(false);
      return;
    }

    validateToken(resetToken)
      .then((isValid) => {
        if (isValid) {
          setToken(resetToken);
        } else {
          setError('Invalid or expired reset token');
        }
      })
      .catch(() => {
        setError('Error validating reset token');
      })
      .finally(() => {
        setIsValidating(false);
      });

    // Check for existing rate limit block
    const storedBlock = localStorage.getItem('passwordResetBlock');
    if (storedBlock) {
      const { expiry } = JSON.parse(storedBlock);
      if (Date.now() < expiry) {
        setIsBlocked(true);
        setBlockExpiry(expiry);
      } else {
        localStorage.removeItem('passwordResetBlock');
      }
    }
  }, [searchParams]);

  /**
   * Validates the reset token format and expiration
   * @param token - The reset token to validate
   */
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      // Token format validation
      if (!/^[A-Za-z0-9-_]{64,}$/.test(token)) {
        return false;
      }

      // Call API to validate token
      const response = await fetch('/api/auth/validate-reset-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(), // Implement CSRF protection
        },
        body: JSON.stringify({ token }),
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  /**
   * Handles password reset form submission with security measures
   * @param values - Form values containing new password
   */
  const handlePasswordReset = async (values: { password: string; confirmPassword: string }) => {
    try {
      if (isBlocked) {
        throw new Error(`Too many attempts. Please try again after ${new Date(blockExpiry).toLocaleTimeString()}`);
      }

      // Construct secure payload
      const resetPayload: PasswordResetConfirmation = {
        token,
        newPassword: values.password,
      };

      // Send reset request with security headers
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify(resetPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset failed');
      }

      // Reset successful
      router.push('/auth/login?reset=success');
    } catch (error) {
      // Update rate limiting
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= RATE_LIMIT.maxAttempts) {
        const expiry = Date.now() + RATE_LIMIT.blockDuration;
        setIsBlocked(true);
        setBlockExpiry(expiry);
        localStorage.setItem('passwordResetBlock', JSON.stringify({ expiry }));
        throw new Error(`Too many attempts. Please try again after ${new Date(expiry).toLocaleTimeString()}`);
      }

      throw error;
    }
  };

  /**
   * Handles rate limit block expiration
   */
  const handleMaxAttemptsReached = () => {
    const expiry = Date.now() + RATE_LIMIT.blockDuration;
    setIsBlocked(true);
    setBlockExpiry(expiry);
    localStorage.setItem('passwordResetBlock', JSON.stringify({ expiry }));
  };

  /**
   * Retrieves CSRF token for request security
   */
  const getCsrfToken = (): string => {
    // Implement CSRF token retrieval
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
  };

  if (isValidating) {
    return (
      <div className="flex justify-center items-center min-h-screen" role="status">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Validating reset token...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        role="alert" 
        className="text-center p-4 bg-red-50 text-red-700 rounded-md"
      >
        <h1 className="text-xl font-semibold mb-2">Password Reset Error</h1>
        <p>{error}</p>
        <button
          onClick={() => router.push('/auth/forgot-password')}
          className="mt-4 text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 px-4 py-2 rounded-md"
        >
          Request New Reset Link
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Reset Your Password</h1>
      <ResetPasswordForm
        token={token}
        onSubmit={handlePasswordReset}
        maxAttempts={RATE_LIMIT.maxAttempts}
        onMaxAttemptsReached={handleMaxAttemptsReached}
      />
      {isBlocked && (
        <div 
          role="alert" 
          className="mt-4 p-4 bg-red-50 text-red-700 rounded-md"
        >
          <p>Account temporarily locked. Please try again after {new Date(blockExpiry).toLocaleTimeString()}</p>
        </div>
      )}
    </div>
  );
}