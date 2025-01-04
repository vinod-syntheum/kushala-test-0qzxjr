'use client';

import React, { useEffect } from 'react';
import Alert from '../components/common/Alert';
import Button from '../components/common/Button';

// Error page props interface with enhanced error handling capabilities
interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

/**
 * Enhanced error page component that provides a user-friendly interface for
 * handling and displaying runtime errors with accessibility support
 */
const ErrorPage: React.FC<ErrorPageProps> = ({ error, reset }) => {
  // Log error to monitoring system on mount
  useEffect(() => {
    // Log detailed error information for monitoring
    console.error('Application error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  // Rate-limited reset handler to prevent spam
  const handleReset = () => {
    // Disable button temporarily after click
    const button = document.querySelector('[data-testid="reset-button"]');
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
      setTimeout(() => {
        button.disabled = false;
      }, 2000);
    }
    reset();
  };

  // Sanitize error message for display
  const getDisplayMessage = (error: Error): string => {
    // Provide user-friendly messages for known error types
    switch (error.name) {
      case 'NetworkError':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'TimeoutError':
        return 'The request took too long to complete. Please try again.';
      default:
        return 'An unexpected error occurred. Our team has been notified.';
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 bg-gray-50"
      role="main"
      aria-labelledby="error-title"
    >
      <div className="max-w-lg w-full space-y-6 text-center bg-white rounded-lg shadow-sm p-8">
        <h1
          id="error-title"
          className="text-2xl font-semibold text-gray-900 mb-4"
          tabIndex={-1}
        >
          Something went wrong
        </h1>

        <Alert
          type="error"
          message={getDisplayMessage(error)}
          role="alert"
          testId="error-alert"
        />

        <div className="text-gray-600 text-base leading-relaxed">
          <p>
            We apologize for the inconvenience. You can try refreshing the page or
            contact support if the problem persists.
          </p>
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          <Button
            variant="primary"
            onClick={handleReset}
            ariaLabel="Try again"
            data-testid="reset-button"
          >
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            ariaLabel="Return to homepage"
          >
            Return home
          </Button>
        </div>

        {/* Error details for development environment */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded text-left">
            <details className="text-sm text-gray-700">
              <summary className="cursor-pointer font-medium">
                Error Details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {error.stack || error.message}
              </pre>
            </details>
          </div>
        )}
      </div>
    </main>
  );
};

export default ErrorPage;