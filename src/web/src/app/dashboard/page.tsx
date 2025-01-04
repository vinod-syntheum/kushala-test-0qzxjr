'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import AnalyticsCard, { AnalyticsCardProps } from '../../components/dashboard/AnalyticsCard';
import QuickActions from '../../components/dashboard/QuickActions';
import RecentActivity from '../../components/dashboard/RecentActivity';
import { useAuth } from '../../hooks/useAuth';
import { useWebsiteBuilder } from '../../hooks/useWebsiteBuilder';
import { useEventManager } from '../../hooks/useEventManager';
import { useLocationManager } from '../../hooks/useLocationManager';
import { useToast } from '../../hooks/useToast';

/**
 * Interface for analytics data with trend information
 */
interface AnalyticsData {
  websiteViews: {
    value: number;
    trend: number;
    period: 'daily' | 'weekly' | 'monthly';
  };
  activeEvents: {
    value: number;
    trend: number;
    period: 'daily' | 'weekly' | 'monthly';
  };
  ticketSales: {
    value: number;
    trend: number;
    period: 'daily' | 'weekly' | 'monthly';
  };
  revenue: {
    value: number;
    trend: number;
    period: 'daily' | 'weekly' | 'monthly';
  };
}

/**
 * Error boundary fallback component for graceful error handling
 */
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary
}) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <h3 className="text-lg font-medium text-red-800">Something went wrong</h3>
    <p className="mt-2 text-sm text-red-600">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
    >
      Try again
    </button>
  </div>
);

/**
 * Main dashboard page component with enhanced error handling and performance optimization
 */
const DashboardPage = memo(() => {
  const { user } = useAuth();
  const { blocks } = useWebsiteBuilder();
  const { locations } = useLocationManager();
  const { show: showToast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches analytics data with error handling and caching
   */
  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/analytics/dashboard');
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      showToast({
        variant: 'error',
        message: 'Failed to load analytics data',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalytics();
    // Set up polling interval for real-time updates
    const interval = setInterval(fetchAnalytics, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  /**
   * Handles quick action completion events
   */
  const handleActionComplete = useCallback((actionType: string, success: boolean) => {
    showToast({
      variant: success ? 'success' : 'error',
      message: success 
        ? `Successfully completed ${actionType} action`
        : `Failed to complete ${actionType} action`,
      duration: 5000
    });
  }, [showToast]);

  /**
   * Renders analytics cards grid with loading states
   */
  const renderAnalyticsCards = () => {
    const cards: AnalyticsCardProps[] = [
      {
        title: 'Website Views',
        value: analyticsData?.websiteViews.value || 0,
        trend: analyticsData?.websiteViews.trend || 0,
        trendPeriod: analyticsData?.websiteViews.period || 'daily',
        icon: <span className="material-icons">visibility</span>,
        loading: isLoading
      },
      {
        title: 'Active Events',
        value: analyticsData?.activeEvents.value || 0,
        trend: analyticsData?.activeEvents.trend || 0,
        trendPeriod: analyticsData?.activeEvents.period || 'daily',
        icon: <span className="material-icons">event</span>,
        loading: isLoading
      },
      {
        title: 'Ticket Sales',
        value: analyticsData?.ticketSales.value || 0,
        trend: analyticsData?.ticketSales.trend || 0,
        trendPeriod: analyticsData?.ticketSales.period || 'daily',
        icon: <span className="material-icons">local_activity</span>,
        loading: isLoading
      },
      {
        title: 'Revenue',
        value: analyticsData?.revenue.value || 0,
        trend: analyticsData?.revenue.trend || 0,
        trendPeriod: analyticsData?.revenue.period || 'daily',
        icon: <span className="material-icons">payments</span>,
        loading: isLoading
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <AnalyticsCard key={index} {...card} />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Welcome back, {user?.firstName || 'Restaurant Owner'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here's what's happening with your restaurant
        </p>
      </div>

      {/* Analytics Section */}
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={fetchAnalytics}
      >
        <section className="mb-8" aria-label="Analytics overview">
          {renderAnalyticsCards()}
        </section>
      </ErrorBoundary>

      {/* Quick Actions Section */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <section className="mb-8" aria-label="Quick actions">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Quick Actions
          </h2>
          <QuickActions
            className="mb-6"
            onActionComplete={handleActionComplete}
          />
        </section>
      </ErrorBoundary>

      {/* Recent Activity Section */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <section aria-label="Recent activity">
          <RecentActivity
            limit={5}
            pollingInterval={30000}
            retryAttempts={3}
            showLoadingState={true}
          />
        </section>
      </ErrorBoundary>
    </div>
  );
});

// Display name for debugging
DashboardPage.displayName = 'DashboardPage';

export default DashboardPage;