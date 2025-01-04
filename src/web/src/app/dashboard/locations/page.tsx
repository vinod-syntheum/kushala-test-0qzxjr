'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Analytics } from '@vercel/analytics'; // v1.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import { Skeleton } from '@mui/material'; // v5.0.0
import LocationList, { LocationListProps } from '../../../components/locations/LocationList';
import MapView from '../../../components/locations/MapView';
import { useLocationManager } from '../../../hooks/useLocationManager';
import type { Location } from '../../../types/location';

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
      Error Loading Locations Dashboard
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
 * Enhanced locations dashboard page component with map and list views
 */
const LocationsPage: React.FC = () => {
  // Location management state and handlers
  const {
    locations,
    loading,
    error,
    locationCount,
    refreshLocations
  } = useLocationManager();

  // Selected location state
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Analytics tracking
  useEffect(() => {
    Analytics.track('page_view', {
      page: 'locations_dashboard',
      locationCount
    });
  }, [locationCount]);

  /**
   * Handle location selection with analytics
   */
  const handleLocationSelect = useCallback((location: Location) => {
    setSelectedLocationId(location.id);
    Analytics.track('location_selected', {
      locationId: location.id,
      locationName: location.name
    });
  }, []);

  /**
   * Handle location updates
   */
  const handleLocationUpdate = useCallback(() => {
    refreshLocations();
    Analytics.track('locations_refreshed');
  }, [refreshLocations]);

  /**
   * Handle map errors
   */
  const handleMapError = useCallback((error: Error) => {
    console.error('Map error:', error);
    Analytics.track('map_error', {
      error: error.message
    });
  }, []);

  // Loading state
  if (loading && !locations.length) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rectangular" height={400} />
        <Skeleton variant="rectangular" height={100} />
        <Skeleton variant="rectangular" height={100} />
      </div>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={refreshLocations}
      onError={(error) => {
        console.error('Dashboard error:', error);
        Analytics.track('dashboard_error', {
          error: error.message
        });
      }}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Location Management
          </h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {locationCount}/3 Locations Used
          </div>
        </div>

        {/* Map View */}
        <div className="rounded-lg overflow-hidden shadow-lg">
          <MapView
            selectedLocationId={selectedLocationId}
            onLocationSelect={handleLocationSelect}
            height="500px"
            enableClustering={true}
            onError={handleMapError}
          />
        </div>

        {/* Location List */}
        <LocationList
          className="mt-6"
          onLocationUpdate={handleLocationUpdate}
          maxLocations={3}
        />

        {/* Analytics Integration */}
        <Analytics />
      </div>
    </ErrorBoundary>
  );
};

export default LocationsPage;