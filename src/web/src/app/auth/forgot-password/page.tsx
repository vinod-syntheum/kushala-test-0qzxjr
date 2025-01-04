'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation'; // v13.0.0
import { useToast } from '@chakra-ui/react'; // v2.0.0
import ForgotPasswordForm from '../../../components/auth/ForgotPasswordForm';

/**
 * Enhanced forgot password page component providing a secure interface for password reset requests
 * with comprehensive validation, rate limiting, and accessibility features.
 * 
 * @version 1.0.0
 */
const ForgotPasswordPage: React.FC = () => {
  const router = useRouter();
  const toast = useToast();

  /**
   * Handles successful password reset request submission
   * Shows success message and redirects to login page
   */
  const handleSuccess = useCallback(async () => {
    try {
      // Show success toast with accessibility considerations
      toast({
        title: 'Reset Instructions Sent',
        description: 'If an account exists with this email, you will receive password reset instructions.',
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
        variant: 'solid',
        containerStyle: {
          maxWidth: '400px'
        },
        // Ensure screen readers announce the message
        'aria-live': 'polite'
      });

      // Redirect to login page with reset requested parameter
      await router.push('/login?reset=requested');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback error handling if navigation fails
      toast({
        title: 'Navigation Error',
        description: 'Please try going back to the login page manually.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top'
      });
    }
  }, [router, toast]);

  /**
   * Handles form submission errors with appropriate user feedback
   */
  const handleError = useCallback((error: Error) => {
    // Determine error type and show appropriate message
    const errorMessage = error.message.includes('rate limit')
      ? 'Too many attempts. Please try again later.'
      : 'An error occurred. Please try again.';

    toast({
      title: 'Error',
      description: errorMessage,
      status: 'error',
      duration: 5000,
      isClosable: true,
      position: 'top',
      variant: 'solid',
      // Ensure error messages are announced immediately
      'aria-live': 'assertive'
    });
  }, [toast]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        {/* Title section with proper heading hierarchy */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email to receive password reset instructions
          </p>
        </div>

        {/* Enhanced form component with security features */}
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <ForgotPasswordForm
            onSuccess={handleSuccess}
            className="space-y-6"
          />
        </div>

        {/* Back to login link with keyboard accessibility */}
        <div className="text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-sm font-medium text-accent-color hover:text-accent-color-dark focus:outline-none focus:underline"
            type="button"
          >
            Back to Login
          </button>
        </div>
      </div>
    </main>
  );
};

// Export with proper metadata for Next.js
export const metadata = {
  title: 'Forgot Password | Restaurant Digital Presence',
  description: 'Reset your password securely to regain access to your account.',
};

export default ForgotPasswordPage;