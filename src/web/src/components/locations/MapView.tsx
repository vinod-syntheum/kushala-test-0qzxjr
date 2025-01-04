/**
 * Enhanced React component for displaying and managing restaurant locations on Google Maps
 * Supports up to 3 locations with clustering, marker management, and accessibility features
 * @version 1.0.0
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import { MapService } from '../../lib/maps';
import { useLocationManager } from '../../hooks/useLocationManager';
import type { Location } from '../../types/location';

// Map style constants
const DEFAULT_MAP_STYLE = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  mapTypeControl: false,
};

// Custom marker styles
const MARKER_STYLES = {
  default: {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: '#3182CE',
    fillOpacity: 0.9,
    strokeWeight: 2,
    strokeColor: '#2C5282',
    scale: 8,
  },
  selected: {
    fillColor: '#E53E3E',
    strokeColor: '#C53030',
  },
};

// Component props interface
interface MapViewProps {
  onLocationSelect?: (location: Location) => void;
  selectedLocationId?: string | null;
  height?: string;
  width?: string;
  mapStyle?: typeof DEFAULT_MAP_STYLE;
  enableClustering?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Error fallback component for map loading failures
 */
const MapErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <div
    role="alert"
    className="map-error-container"
    aria-label="Map loading error"
  >
    <h3>Unable to load map</h3>
    <pre>{error.message}</pre>
    <button
      onClick={resetErrorBoundary}
      className="retry-button"
      aria-label="Retry loading map"
    >
      Retry
    </button>
  </div>
);

/**
 * MapView Component
 */
const MapView: React.FC<MapViewProps> = ({
  onLocationSelect,
  selectedLocationId = null,
  height = '500px',
  width = '100%',
  mapStyle = DEFAULT_MAP_STYLE,
  enableClustering = true,
  onError,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapServiceRef = useRef<MapService | null>(null);
  const { locations, loading, error } = useLocationManager();

  /**
   * Initialize map service with error handling
   */
  const initializeMap = useCallback(async () => {
    if (!mapContainerRef.current) return;

    try {
      mapServiceRef.current = new MapService(mapContainerRef.current, {
        ...DEFAULT_MAP_STYLE,
        ...mapStyle,
        enableClustering,
        center: { lat: 0, lng: 0 }, // Default center, will be updated with locations
      });
    } catch (error) {
      console.error('Map initialization failed:', error);
      onError?.(error as Error);
    }
  }, [mapStyle, enableClustering, onError]);

  /**
   * Handle marker click events with accessibility support
   */
  const handleMarkerClick = useCallback((location: Location) => {
    if (!mapServiceRef.current) return;

    // Update marker styles
    locations.forEach(loc => {
      const isSelected = loc.id === location.id;
      mapServiceRef.current?.setMapStyle(loc.id, {
        ...MARKER_STYLES.default,
        ...(isSelected ? MARKER_STYLES.selected : {}),
      });
    });

    // Center map on selected location with animation
    mapServiceRef.current.fitBounds([{
      lat: location.coordinates.latitude,
      lng: location.coordinates.longitude,
    }], { padding: 50, animate: true });

    // Trigger selection callback
    onLocationSelect?.(location);

    // Update ARIA live region
    const liveRegion = document.getElementById('map-live-region');
    if (liveRegion) {
      liveRegion.textContent = `Selected location: ${location.name}`;
    }
  }, [locations, onLocationSelect]);

  /**
   * Update map markers when locations change
   */
  const updateMarkers = useCallback(async () => {
    if (!mapServiceRef.current || loading) return;

    try {
      // Remove existing markers
      const markerPromises = locations.map(async location => {
        await mapServiceRef.current?.removeMarker(location.id);
        return mapServiceRef.current?.addMarker(location, {
          ...MARKER_STYLES.default,
          ...(location.id === selectedLocationId ? MARKER_STYLES.selected : {}),
        });
      });

      await Promise.all(markerPromises);

      // Fit bounds to show all markers
      if (locations.length > 0) {
        const bounds = locations.map(location => ({
          lat: location.coordinates.latitude,
          lng: location.coordinates.longitude,
        }));
        mapServiceRef.current.fitBounds(bounds);
      }
    } catch (error) {
      console.error('Error updating markers:', error);
      onError?.(error as Error);
    }
  }, [locations, loading, selectedLocationId, onError]);

  // Initialize map on mount
  useEffect(() => {
    initializeMap();

    return () => {
      // Cleanup map instance
      if (mapServiceRef.current) {
        mapServiceRef.current = null;
      }
    };
  }, [initializeMap]);

  // Update markers when locations or selection changes
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers, locations, selectedLocationId]);

  // Handle loading and error states
  if (error) {
    return <MapErrorFallback error={error} resetErrorBoundary={initializeMap} />;
  }

  return (
    <ErrorBoundary
      FallbackComponent={MapErrorFallback}
      onReset={initializeMap}
      onError={onError}
    >
      <div className="map-container" style={{ position: 'relative' }}>
        {loading && (
          <div
            className="map-loading"
            role="progressbar"
            aria-label="Loading map"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            Loading map...
          </div>
        )}
        <div
          ref={mapContainerRef}
          style={{ height, width }}
          role="application"
          aria-label="Restaurant locations map"
        />
        <div
          id="map-live-region"
          aria-live="polite"
          className="sr-only"
        />
      </div>
    </ErrorBoundary>
  );
};

export default MapView;