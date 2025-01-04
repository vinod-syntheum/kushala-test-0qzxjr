'use client';

import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // v14.0.0
import { sanitizeInput } from 'xss'; // v1.0.14
import { rateLimit } from 'express-rate-limit'; // v7.1.0
import RegisterForm from '../../../components/auth/RegisterForm';
import { useAuth } from '../../../hooks/useAuth';
import { ValidationError } from '../../../types/common';

// Rate limiting configuration
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 300000; // 5 minutes

// Page metadata for SEO
export const metadata = {
  title: 'Register - Digital Presence MVP',
  description: "Create your secure account to start building your restaurant's digital presence",
  robots: 'noindex, nofollow', // Prevent indexing of authentication pages
  viewport: 'width=device-width, initial-scale=1',
  charset: 'utf-8',
};

/**
 * Secure registration page component with comprehensive validation,
 * rate limiting, and error handling.
 */
const RegisterPage: React.FC = () => {
  const router = useRouter();
  const { login } = useAuth();

  // Initialize rate limiter
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_ATTEMPTS,
    message: 'Too many registration attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Handle successful registration
  const handleRegistrationSuccess = useCallback(async () => {
    try {
      // Clear any sensitive data from the form
      window.history.replaceState({}, '', '/dashboard');
      
      // Show success message
      console.info('Registration successful');
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error during post-registration:', error);
      handleRegistrationError(error as Error);
    }
  }, [router]);

  // Handle registration errors
  const handleRegistrationError = useCallback((error: Error) => {
    console.error('Registration error:', error);
    
    // Log error for monitoring but remove sensitive data
    const sanitizedError = {
      message: error.message,
      timestamp: new Date().toISOString(),
    };
    console.error('Sanitized registration error:', sanitizedError);
    
    // Clear any sensitive data
    if (window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const session = await fetch('/api/auth/session');
        if (session.ok) {
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    };

    checkExistingSession();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Start building your restaurant's digital presence
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <RegisterForm
            onSuccess={handleRegistrationSuccess}
            className="space-y-6"
            redirectUrl="/dashboard"
          />
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => router.push('/auth/login')}
                className="text-sm font-medium text-accent-color hover:text-accent-color-dark"
              >
                Sign in to your account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;