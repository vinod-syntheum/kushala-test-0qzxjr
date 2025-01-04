'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11
import { usePerformance } from '@vercel/performance'; // v1.0.0

import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { useAuth } from '../../hooks/useAuth';

// Props interface for the layout component
interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div role="alert" className="p-4 bg-red-50 border border-red-100 rounded-lg">
    <h2 className="text-lg font-semibold text-red-700 mb-2">Something went wrong:</h2>
    <pre className="text-sm text-red-600 mb-4">{error.message}</pre>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
    >
      Try again
    </button>
  </div>
);

/**
 * Dashboard layout component providing consistent navigation, authentication protection,
 * responsive layout structure, error boundaries, and performance monitoring.
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, className = '' }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, sessionStatus } = useAuth();
  const { trackLoadingTime } = usePerformance();
  
  // Sidebar collapse state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  // Handle sidebar toggle with smooth transitions
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  }, []);

  // Track initial page load performance
  useEffect(() => {
    trackLoadingTime('dashboard-layout-render');
  }, [trackLoadingTime]);

  // Authentication protection
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Handle session timeout
  useEffect(() => {
    if (sessionStatus === 'expired') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  // Early return while checking auth
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse bg-white p-6 rounded-lg shadow-sm">
          <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset error state and retry
        router.refresh();
      }}
    >
      <div className="min-h-screen bg-gray-50 transition-all duration-300">
        <Header
          className="fixed top-0 left-0 right-0 z-50"
          variant="light"
        />

        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={handleSidebarToggle}
          className="fixed left-0 top-16 h-[calc(100vh-64px)]"
        />

        <main 
          className={`
            flex-1 transition-all duration-300 ease-in-out
            pt-16 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} 
            ${className}
          `}
          style={{ minHeight: 'calc(100vh - 64px)' }}
        >
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default DashboardLayout;