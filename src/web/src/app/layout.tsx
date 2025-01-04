'use client';

import React from 'react';
import { Inter } from 'next/font/google';
import { Provider } from 'react-redux';
import { ErrorBoundary } from 'react-error-boundary';
import { store } from '../store';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

// Import global styles
import '../styles/globals.css';
import '../styles/tailwind.css';

// Configure Inter font with optimization settings
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif']
});

// Metadata configuration
export const metadata = {
  title: 'Digital Presence MVP for Small Restaurants',
  description: 'Empower your restaurant with a professional online presence',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true
  },
  themeColor: '#2D3748',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  },
  security: {
    referrerPolicy: 'strict-origin-when-cross-origin',
    contentSecurityPolicy: {
      'default-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'connect-src': ["'self'", 'https:']
    }
  }
};

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-md">
    <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
    <p className="mt-2 text-sm text-red-700">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
    >
      Try again
    </button>
  </div>
);

// Root layout interface
interface RootLayoutProps {
  children: React.ReactNode;
}

// Root layout component
const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  // Handle error boundary reset
  const handleErrorReset = () => {
    // Clear any error states and reload necessary data
    window.location.reload();
  };

  return (
    <html lang="en" className={inter.className}>
      <body>
        <Provider store={store}>
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={handleErrorReset}
            onError={(error) => {
              // Log errors to monitoring service
              console.error('Application Error:', error);
            }}
          >
            <div className="flex flex-col min-h-screen">
              <Header />
              
              <main className="flex-grow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  {children}
                </div>
              </main>

              <Footer />
            </div>
          </ErrorBoundary>
        </Provider>

        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white p-4 z-50"
        >
          Skip to main content
        </a>
      </body>
    </html>
  );
};

export default RootLayout;