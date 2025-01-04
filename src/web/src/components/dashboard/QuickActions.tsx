import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router'; // v14.0.0
import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useWebsiteBuilder } from '../../hooks/useWebsiteBuilder';
import { useEventManager } from '../../hooks/useEventManager';
import { useLocationManager } from '../../hooks/useLocationManager';
import { useToast } from '../../hooks/useToast';

// Constants
const MAX_LOCATIONS = 3;

export interface QuickActionsProps {
  className?: string;
  onActionStart?: (actionType: 'website' | 'event' | 'location') => void;
  onActionComplete?: (actionType: 'website' | 'event' | 'location', success: boolean) => void;
}

/**
 * A dashboard component that provides quick access buttons for primary actions
 * with loading states, validation, and analytics tracking.
 */
const QuickActions: React.FC<QuickActionsProps> = ({
  className = '',
  onActionStart,
  onActionComplete
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const { isLoading: websiteLoading } = useWebsiteBuilder();
  const { isLoading: eventLoading } = useEventManager();
  const { locations, isLoading: locationLoading } = useLocationManager();
  const { show: showToast } = useToast();

  // Local loading states for each action
  const [loading, setLoading] = useState({
    website: false,
    event: false,
    location: false
  });

  /**
   * Handles navigation to website builder with loading state
   */
  const handleWebsiteEdit = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, website: true }));
      onActionStart?.('website');

      if (!user) {
        throw new Error('Authentication required');
      }

      await router.push('/dashboard/website/builder');
      onActionComplete?.('website', true);
    } catch (error) {
      showToast({
        variant: 'error',
        message: 'Failed to access website builder',
        duration: 5000
      });
      onActionComplete?.('website', false);
    } finally {
      setLoading(prev => ({ ...prev, website: false }));
    }
  }, [router, user, onActionStart, onActionComplete, showToast]);

  /**
   * Handles navigation to event creation with validation
   */
  const handleEventCreate = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, event: true }));
      onActionStart?.('event');

      if (!user) {
        throw new Error('Authentication required');
      }

      await router.push('/dashboard/events/create');
      onActionComplete?.('event', true);
    } catch (error) {
      showToast({
        variant: 'error',
        message: 'Failed to access event creation',
        duration: 5000
      });
      onActionComplete?.('event', false);
    } finally {
      setLoading(prev => ({ ...prev, event: false }));
    }
  }, [router, user, onActionStart, onActionComplete, showToast]);

  /**
   * Handles navigation to location creation with limit validation
   */
  const handleLocationCreate = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, location: true }));
      onActionStart?.('location');

      if (!user) {
        throw new Error('Authentication required');
      }

      if (locations.length >= MAX_LOCATIONS) {
        showToast({
          variant: 'warning',
          message: `Maximum limit of ${MAX_LOCATIONS} locations reached`,
          duration: 5000
        });
        onActionComplete?.('location', false);
        return;
      }

      await router.push('/dashboard/locations/create');
      onActionComplete?.('location', true);
    } catch (error) {
      showToast({
        variant: 'error',
        message: 'Failed to access location creation',
        duration: 5000
      });
      onActionComplete?.('location', false);
    } finally {
      setLoading(prev => ({ ...prev, location: false }));
    }
  }, [router, user, locations, onActionStart, onActionComplete, showToast]);

  return (
    <div 
      className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}
      data-testid="quick-actions"
    >
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={loading.website || websiteLoading}
        onClick={handleWebsiteEdit}
        ariaLabel="Edit website"
      >
        <span className="flex items-center justify-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Edit Website
        </span>
      </Button>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={loading.event || eventLoading}
        onClick={handleEventCreate}
        ariaLabel="Create event"
      >
        <span className="flex items-center justify-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Create Event
        </span>
      </Button>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={loading.location || locationLoading}
        onClick={handleLocationCreate}
        disabled={locations.length >= MAX_LOCATIONS}
        ariaLabel="Add location"
      >
        <span className="flex items-center justify-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Add Location
        </span>
      </Button>
    </div>
  );
};

export default QuickActions;