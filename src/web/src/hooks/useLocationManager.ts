/**
 * Custom React hook for managing location-related operations and state.
 * Provides CRUD operations, validation, and state management for restaurant locations.
 * @version 1.0.0
 */

import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0
import { useState, useCallback, useRef } from 'react'; // ^18.0.0
import { Location, LocationFormData, isValidOperatingHours, isValidCoordinates } from '../../types/location';
import { ApiError, HttpStatusCode } from '../../types/common';
import { 
  locationSlice, 
  selectLocations, 
  selectLocationCount,
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation
} from '../../store/slices/locationSlice';

// Constants
const MAX_LOCATIONS = 3;
const CACHE_DURATION_MS = 300000; // 5 minutes
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Interface for location validation result
 */
interface LocationValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Hook return type definition
 */
interface UseLocationManager {
  locations: Location[];
  loading: boolean;
  error: ApiError | null;
  locationCount: number;
  isCacheValid: boolean;
  createLocation: (data: LocationFormData) => Promise<Location>;
  updateLocation: (id: string, data: LocationFormData) => Promise<Location>;
  deleteLocation: (id: string) => Promise<void>;
  getLocationById: (id: string) => Location | undefined;
  validateLocation: (data: LocationFormData) => LocationValidationResult;
  refreshLocations: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for managing location operations with optimistic updates and validation
 */
export function useLocationManager(): UseLocationManager {
  const dispatch = useDispatch();
  const locations = useSelector(selectLocations);
  const locationCount = useSelector(selectLocationCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Validates location data against business rules
   */
  const validateLocation = useCallback((data: LocationFormData): LocationValidationResult => {
    const errors: string[] = [];

    // Required fields validation
    if (!data.name?.trim()) {
      errors.push('Location name is required');
    }

    if (!data.address?.street1?.trim()) {
      errors.push('Street address is required');
    }

    if (!data.address?.city?.trim()) {
      errors.push('City is required');
    }

    if (!data.address?.postalCode?.trim()) {
      errors.push('Postal code is required');
    }

    // Coordinates validation
    if (!isValidCoordinates(data.coordinates)) {
      errors.push('Invalid coordinates provided');
    }

    // Operating hours validation
    if (!isValidOperatingHours(data.operatingHours)) {
      errors.push('Invalid operating hours format');
    }

    // Contact information validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      errors.push('Invalid email format');
    }

    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    if (data.phone && !phoneRegex.test(data.phone)) {
      errors.push('Invalid phone number format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  /**
   * Creates a new location with validation and optimistic updates
   */
  const create = useCallback(async (data: LocationFormData): Promise<Location> => {
    if (locationCount >= MAX_LOCATIONS) {
      throw new ApiError({
        status: HttpStatusCode.UNPROCESSABLE_ENTITY,
        error: {
          code: 'MAX_LOCATIONS_EXCEEDED',
          message: `Maximum limit of ${MAX_LOCATIONS} locations reached`,
          details: {},
          validationErrors: []
        }
      });
    }

    const validation = validateLocation(data);
    if (!validation.isValid) {
      throw new ApiError({
        status: HttpStatusCode.UNPROCESSABLE_ENTITY,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Location validation failed',
          details: {},
          validationErrors: validation.errors.map(error => ({
            field: 'location',
            message: error,
            code: 'INVALID_INPUT'
          }))
        }
      });
    }

    setLoading(true);
    setError(null);

    try {
      const result = await dispatch(createLocation(data)).unwrap();
      return result;
    } catch (err) {
      setError(err as ApiError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch, locationCount, validateLocation]);

  /**
   * Updates an existing location with validation
   */
  const update = useCallback(async (id: string, data: LocationFormData): Promise<Location> => {
    const validation = validateLocation(data);
    if (!validation.isValid) {
      throw new ApiError({
        status: HttpStatusCode.UNPROCESSABLE_ENTITY,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Location validation failed',
          details: {},
          validationErrors: validation.errors.map(error => ({
            field: 'location',
            message: error,
            code: 'INVALID_INPUT'
          }))
        }
      });
    }

    setLoading(true);
    setError(null);

    try {
      const result = await dispatch(updateLocation({ id, data })).unwrap();
      return result;
    } catch (err) {
      setError(err as ApiError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch, validateLocation]);

  /**
   * Deletes a location with confirmation
   */
  const remove = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await dispatch(deleteLocation(id)).unwrap();
    } catch (err) {
      setError(err as ApiError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Refreshes the location list with cache invalidation
   */
  const refreshLocations = useCallback(async (): Promise<void> => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      await dispatch(fetchLocations()).unwrap();
    } catch (err) {
      setError(err as ApiError);
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [dispatch]);

  /**
   * Gets a location by ID from the current state
   */
  const getLocationById = useCallback((id: string): Location | undefined => {
    return locations.find(location => location.id === id);
  }, [locations]);

  /**
   * Clears the current error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Checks if the location cache is still valid
   */
  const isCacheValid = useCallback((): boolean => {
    const lastUpdated = locations[0]?.updatedAt;
    if (!lastUpdated) return false;
    return Date.now() - new Date(lastUpdated).getTime() < CACHE_DURATION_MS;
  }, [locations]);

  return {
    locations,
    loading,
    error,
    locationCount,
    isCacheValid: isCacheValid(),
    createLocation: create,
    updateLocation: update,
    deleteLocation: remove,
    getLocationById,
    validateLocation,
    refreshLocations,
    clearError
  };
}