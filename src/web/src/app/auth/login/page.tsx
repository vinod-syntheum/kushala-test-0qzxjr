'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import { Analytics } from '@segment/analytics-next'; // ^1.51.0
import LoginForm from '../../../components/auth/LoginForm';
import Header from '../../../components/layout/Header';
import { useAuth } from '../../../hooks/useAuth';

// Initialize analytics
const analytics = new Analytics({
  writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY || ''
});

/**
 * Error fallback component for authentication failures
 */
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary
}) => (
  <div 
    role="alert" 
    className="p-4 bg-red-50 border border-red-200 rounded-md"
  >
    <h2 className="text-lg font-semibold text-red-700">Authentication Error</h2>
    <p className="mt-2 text-red-600">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
    >
      Try Again
    </button>
  </div>
);

/**
 * Enhanced login page component with comprehensive security features
 * Implements JWT-based authentication with session monitoring and security controls
 */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Security monitoring state
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Check for existing lockout
  useEffect(() => {
    const storedLockout = localStorage.getItem('auth_lockout');
    if (storedLockout) {
      const lockoutTime = new Date(storedLockout);
      if (lockoutTime > new Date()) {
        setLockoutEndTime(lockoutTime);
      } else {
        localStorage.removeItem('auth_lockout');
      }
    }
  }, []);

  // Handle rate limiting
  const checkRateLimit = useCallback(() => {
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

    if (lockoutEndTime && new Date() < lockoutEndTime) {
      return true;
    }

    if (loginAttempts >= MAX_ATTEMPTS) {
      const newLockoutEnd = new Date(Date.now() + LOCKOUT_DURATION);
      setLockoutEndTime(newLockoutEnd);
      localStorage.setItem('auth_lockout', newLockoutEnd.toISOString());
      return true;
    }

    return false;
  }, [loginAttempts, lockoutEndTime]);

  // Handle successful login
  const handleLoginSuccess = useCallback(async (data: any) => {
    try {
      await analytics.track('Login Success', {
        timestamp: new Date().toISOString()
      });

      // Reset security counters
      setLoginAttempts(0);
      localStorage.removeItem('auth_lockout');

      // Redirect to dashboard
      router.replace('/dashboard');
    } catch (error) {
      console.error('Login success handling failed:', error);
    }
  }, [router]);

  // Handle login error
  const handleLoginError = useCallback((error: Error) => {
    setError(error.message);
    setLoginAttempts(prev => prev + 1);
    setIsLoading(false);

    analytics.track('Login Failed', {
      error: error.message,
      attempts: loginAttempts + 1,
      timestamp: new Date().toISOString()
    });
  }, [loginAttempts]);

  // Render lockout message if account is locked
  if (lockoutEndTime && new Date() < lockoutEndTime) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto mt-8 p-4 bg-red-50 border border-red-200 rounded-md">
            <h2 className="text-lg font-semibold text-red-700">Account Temporarily Locked</h2>
            <p className="mt-2 text-red-600">
              Too many failed login attempts. Please try again after{' '}
              {lockoutEndTime.toLocaleTimeString()}.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto mt-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Sign in to your account
          </h1>

          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => {
              setError(null);
              setIsLoading(false);
            }}
          >
            <LoginForm
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
              className="bg-white shadow-sm rounded-lg p-6"
            />
          </ErrorBoundary>

          {error && (
            <div 
              role="alert"
              className="mt-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded"
            >
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Configure page metadata and security headers
export const metadata = {
  title: 'Login - Restaurant Website Builder',
  description: 'Secure login to manage your restaurant website',
};

// Configure page security options
export const dynamic = 'force-dynamic';
export const runtime = 'edge';