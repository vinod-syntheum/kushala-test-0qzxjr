import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns'; // v2.x
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import Card from '../common/Card';
import Badge from '../common/Badge';
import type { ApiResponse } from '../../types/common';

// Activity type definition with status and metadata
export interface Activity {
  id: string;
  type: 'website' | 'event' | 'location' | 'ticket';
  description: string;
  timestamp: Date;
  metadata: Record<string, any>;
  status: 'success' | 'warning' | 'error' | 'info';
}

// Component props with enhanced configuration options
export interface RecentActivityProps {
  limit?: number;
  className?: string;
  onActivityClick?: (activity: Activity) => void;
  pollingInterval?: number;
  retryAttempts?: number;
  showLoadingState?: boolean;
}

// Custom hook for activity polling with error handling
const useActivityPolling = (
  interval: number = 30000,
  retryAttempts: number = 3
) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const retryCount = useRef(0);
  const mounted = useRef(true);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/activities');
      const data: ApiResponse<Activity[]> = await response.json();
      
      if (mounted.current) {
        setActivities(data.data);
        setError(null);
        retryCount.current = 0;
      }
    } catch (err) {
      if (retryCount.current < retryAttempts) {
        retryCount.current += 1;
        setTimeout(fetchActivities, 1000 * retryCount.current);
      } else {
        setError(err as Error);
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [retryAttempts]);

  useEffect(() => {
    fetchActivities();
    const pollInterval = setInterval(fetchActivities, interval);

    return () => {
      mounted.current = false;
      clearInterval(pollInterval);
    };
  }, [fetchActivities, interval]);

  return { activities, loading, error, retry: fetchActivities };
};

// Helper function to determine badge variant based on activity
const getActivityBadgeVariant = (activity: Activity): string => {
  if (activity.status === 'error') return 'error';
  if (activity.status === 'warning') return 'warning';
  
  switch (activity.type) {
    case 'website':
      return 'info';
    case 'event':
      return 'primary';
    case 'ticket':
      return 'success';
    case 'location':
      return 'secondary';
    default:
      return 'info';
  }
};

// Format activity description with metadata
const formatActivityDescription = (activity: Activity): string => {
  const { type, description, metadata } = activity;
  let formattedDescription = description;

  if (metadata.name) {
    formattedDescription = formattedDescription.replace('{name}', metadata.name);
  }

  if (metadata.amount) {
    formattedDescription = formattedDescription.replace(
      '{amount}',
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
        .format(metadata.amount)
    );
  }

  return formattedDescription;
};

// Error fallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary
}) => (
  <Card variant="outlined" className="text-center p-4">
    <Badge variant="error">Error</Badge>
    <p className="mt-2 text-gray-600">Failed to load activities</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-2 text-blue-600 hover:text-blue-800"
    >
      Retry
    </button>
  </Card>
);

// Main RecentActivity component
export const RecentActivity: React.FC<RecentActivityProps> = memo(({
  limit = 5,
  className,
  onActivityClick,
  pollingInterval = 30000,
  retryAttempts = 3,
  showLoadingState = true
}) => {
  const { activities, loading, error, retry } = useActivityPolling(
    pollingInterval,
    retryAttempts
  );
  const [focusedActivityId, setFocusedActivityId] = useState<string | null>(null);

  // Handle keyboard navigation
  const handleKeyDown = (
    event: React.KeyboardEvent,
    activity: Activity
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivityClick?.(activity);
    }
  };

  // Render individual activity item
  const renderActivity = (activity: Activity): JSX.Element => {
    const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
      addSuffix: true
    });

    return (
      <div
        key={activity.id}
        className={`
          p-3 hover:bg-gray-50 dark:hover:bg-gray-800
          transition-colors duration-200
          ${focusedActivityId === activity.id ? 'bg-gray-50 dark:bg-gray-800' : ''}
        `}
        onClick={() => onActivityClick?.(activity)}
        onKeyDown={(e) => handleKeyDown(e, activity)}
        tabIndex={0}
        role="button"
        aria-label={`${formatActivityDescription(activity)} - ${timeAgo}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge
              variant={getActivityBadgeVariant(activity)}
              size="sm"
              rounded
            >
              {activity.type}
            </Badge>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {formatActivityDescription(activity)}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {timeAgo}
          </span>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={retry}
    >
      <Card
        className={className}
        header={
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            {loading && showLoadingState && (
              <Badge variant="info" size="sm">Updating...</Badge>
            )}
          </div>
        }
      >
        <div
          className="divide-y divide-gray-200 dark:divide-gray-700"
          role="log"
          aria-live="polite"
          aria-label="Recent activities"
        >
          {activities.slice(0, limit).map(renderActivity)}
          {activities.length === 0 && !loading && (
            <p className="text-center py-4 text-gray-500">
              No recent activities
            </p>
          )}
        </div>
      </Card>
    </ErrorBoundary>
  );
});

RecentActivity.displayName = 'RecentActivity';

export default RecentActivity;