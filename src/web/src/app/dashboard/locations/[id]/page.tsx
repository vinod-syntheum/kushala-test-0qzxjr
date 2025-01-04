'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import toast from 'react-hot-toast';
import LocationForm from '@/components/locations/LocationForm';
import { useLocationManager } from '@/hooks/useLocationManager';
import type { Location, LocationFormData } from '@/types/location';

// Error messages for user feedback
const ERROR_MESSAGES = {
  LOCATION_NOT_FOUND: 'Location not found. Please check the URL and try again.',
  UPDATE_FAILED: 'Failed to update location. Please try again later.',
  VALIDATION_ERROR: 'Please check the form for errors and try again.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  PERMISSION_ERROR: "You don't have permission to edit this location."
} as const;

// Retry configuration for data fetching
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  BACKOFF_FACTOR: 2
} as const;

// Error Fallback component for ErrorBoundary
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary
}) => (
  <div className="p-6 bg-red-50 rounded-lg" role="alert">
    <h2 className="text-lg font-semibold text-red-800">Error Loading Location</h2>
    <p className="mt-2 text-red-700">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      Try Again
    </button>
  </div>
);

// Loading skeleton component
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </div>
  </div>
);

const LocationPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const {
    getLocationById,
    updateLocation,
    validateLocation,
    error: locationError,
    clearError
  } = useLocationManager();

  // Fetch location data with retry logic
  const fetchLocationData = useCallback(async () => {
    if (!params.id || typeof params.id !== 'string') {
      throw new Error(ERROR_MESSAGES.LOCATION_NOT_FOUND);
    }

    let retries = 0;
    while (retries < RETRY_CONFIG.MAX_RETRIES) {
      try {
        const locationData = getLocationById(params.id);
        if (!locationData) {
          throw new Error(ERROR_MESSAGES.LOCATION_NOT_FOUND);
        }
        setLocation(locationData);
        return;
      } catch (error) {
        retries++;
        if (retries === RETRY_CONFIG.MAX_RETRIES) {
          throw error;
        }
        await new Promise(resolve => 
          setTimeout(resolve, RETRY_CONFIG.RETRY_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, retries))
        );
      }
    }
  }, [params.id, getLocationById]);

  // Initialize location data
  useEffect(() => {
    fetchLocationData()
      .catch(error => {
        console.error('Failed to fetch location:', error);
        toast.error(ERROR_MESSAGES.LOCATION_NOT_FOUND);
      })
      .finally(() => setIsLoading(false));
  }, [fetchLocationData]);

  // Handle beforeunload event for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle location update
  const handleLocationUpdate = async (formData: LocationFormData) => {
    if (!location?.id) {
      toast.error(ERROR_MESSAGES.LOCATION_NOT_FOUND);
      return;
    }

    try {
      // Validate form data
      const validationResult = validateLocation(formData);
      if (!validationResult.isValid) {
        toast.error(ERROR_MESSAGES.VALIDATION_ERROR);
        return;
      }

      // Optimistic update
      const previousLocation = { ...location };
      setLocation({ ...location, ...formData });

      // Attempt update
      await updateLocation(location.id, formData);
      
      toast.success('Location updated successfully');
      setHasUnsavedChanges(false);
      router.push('/dashboard/locations');
    } catch (error) {
      // Rollback optimistic update
      setLocation(previousLocation);
      
      console.error('Failed to update location:', error);
      toast.error(ERROR_MESSAGES.UPDATE_FAILED);
      
      // Clear any existing errors
      clearError();
    }
  };

  // Handle form cancellation
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    router.push('/dashboard/locations');
  }, [hasUnsavedChanges, router]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={fetchLocationData}
      resetKeys={[params.id]}
    >
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            {location ? `Edit ${location.name}` : 'Location Not Found'}
          </h1>
        </div>

        {locationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-red-700">{locationError.error.message}</p>
          </div>
        )}

        {location && (
          <LocationForm
            location={location}
            onSubmit={handleLocationUpdate}
            onCancel={handleCancel}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default LocationPage;