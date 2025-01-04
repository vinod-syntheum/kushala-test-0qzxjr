import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router'; // v14.0.0
import { useConfirm } from '@chakra-ui/react'; // v2.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import LocationCard, { LocationCardProps } from './LocationCard';
import Loading from '../common/Loading';
import { useLocationManager } from '../../hooks/useLocationManager';
import type { Location } from '../../types/location';

/**
 * Props interface for the LocationList component
 */
interface LocationListProps {
  /** Optional custom CSS classes */
  className?: string;
  /** Callback for location updates */
  onLocationUpdate?: () => void;
  /** Maximum allowed locations (default: 3) */
  maxLocations?: number;
}

/**
 * Error fallback component for graceful error handling
 */
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary
}) => (
  <div 
    role="alert" 
    className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg"
  >
    <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
      Error Loading Locations
    </h3>
    <p className="mt-2 text-sm text-red-700 dark:text-red-300">
      {error.message}
    </p>
    <button
      onClick={resetErrorBoundary}
      className="mt-3 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 
                 bg-red-100 dark:bg-red-900/20 rounded-md hover:bg-red-200 
                 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 
                 focus:ring-red-500 focus:ring-offset-2"
    >
      Try Again
    </button>
  </div>
);

/**
 * LocationList component for displaying and managing restaurant locations
 * with comprehensive state handling and accessibility features.
 */
const LocationList = React.memo<LocationListProps>(({
  className = '',
  onLocationUpdate,
  maxLocations = 3
}) => {
  const router = useRouter();
  const confirm = useConfirm();
  const {
    locations,
    loading,
    error,
    deleteLocation,
    retryFetch
  } = useLocationManager();

  /**
   * Handles navigation to location edit page
   */
  const handleEdit = useCallback((locationId: string) => {
    router.push(`/dashboard/locations/${locationId}`);
  }, [router]);

  /**
   * Handles location deletion with confirmation
   */
  const handleDelete = useCallback(async (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    if (!location) return;

    const isConfirmed = await confirm({
      title: 'Delete Location',
      message: `Are you sure you want to delete ${location.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        await deleteLocation(locationId);
        onLocationUpdate?.();
      } catch (error) {
        console.error('Failed to delete location:', error);
      }
    }
  }, [locations, confirm, deleteLocation, onLocationUpdate]);

  /**
   * Memoized empty state message
   */
  const emptyStateMessage = useMemo(() => (
    <div className="text-center py-8">
      <p className="text-gray-600 dark:text-gray-400">
        No locations added yet.
      </p>
      {locations.length < maxLocations && (
        <button
          onClick={() => router.push('/dashboard/locations/new')}
          className="mt-4 px-4 py-2 text-sm font-medium text-primary-600 
                     bg-primary-100 rounded-md hover:bg-primary-200 
                     focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Add Your First Location
        </button>
      )}
    </div>
  ), [locations.length, maxLocations, router]);

  /**
   * Renders location list content based on state
   */
  const renderContent = () => {
    if (loading) {
      return <Loading size="large" text="Loading locations..." />;
    }

    if (error) {
      throw error;
    }

    if (!locations.length) {
      return emptyStateMessage;
    }

    return (
      <>
        {locations.length >= maxLocations && (
          <div 
            role="alert" 
            className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg"
          >
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Maximum limit of {maxLocations} locations reached.
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          {locations.map((location: Location) => (
            <LocationCard
              key={location.id}
              location={location}
              onEdit={handleEdit}
              onDelete={handleDelete}
              testId={`location-card-${location.id}`}
              className="transition-all duration-200 hover:shadow-md"
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <div 
      className={`w-full ${className}`}
      aria-busy={loading}
      aria-live="polite"
    >
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={retryFetch}
        resetKeys={[locations]}
      >
        {renderContent()}
      </ErrorBoundary>
    </div>
  );
});

LocationList.displayName = 'LocationList';

export default LocationList;