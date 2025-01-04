'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAnalytics } from '@vercel/analytics';
import { toast } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';

import EventForm from '../../../../components/events/EventForm';
import TicketList from '../../../../components/events/TicketList';
import { useEventManager } from '../../../../hooks/useEventManager';
import { Event, EventStatus } from '../../../../types/event';
import { ValidationError } from '../../../../types/common';

// Constants for analytics and error handling
const PAGE_TITLE = 'Event Details | Dashboard';
const MAX_RETRIES = 3;
const ANALYTICS_CATEGORY = 'event_management';

/**
 * Error boundary fallback component
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <h2 className="text-lg font-semibold text-red-700">Error Loading Event</h2>
    <p className="text-red-600">{error.message}</p>
    <button 
      onClick={() => window.location.reload()}
      className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Retry
    </button>
  </div>
);

/**
 * Event details page component with comprehensive management capabilities
 */
const EventDetailsPage: React.FC = () => {
  // Hooks initialization
  const params = useParams();
  const analytics = useAnalytics();
  const { updateEvent, deleteEvent, publishEvent, loadingStates } = useEventManager();
  
  // Local state
  const [event, setEvent] = useState<Event | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  /**
   * Fetches event details with retry mechanism
   */
  const fetchEventDetails = useCallback(async (retries = MAX_RETRIES) => {
    try {
      const response = await fetch(`/api/v1/events/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch event details');
      
      const data = await response.json();
      setEvent(data);
      
      // Track page view
      analytics.track('event_details_view', {
        eventId: params.id,
        eventName: data.name
      });
    } catch (error) {
      if (retries > 0) {
        setTimeout(() => fetchEventDetails(retries - 1), 1000);
      } else {
        toast.error('Failed to load event details');
        setErrors([{ field: 'fetch', message: 'Failed to load event details', code: 'FETCH_ERROR' }]);
      }
    }
  }, [params.id, analytics]);

  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  /**
   * Handles event updates with optimistic UI updates
   */
  const handleEventUpdate = useCallback(async (updatedEvent: Partial<Event>) => {
    if (!event?.id) return;

    // Optimistic update
    const previousEvent = { ...event };
    setEvent(prev => prev ? { ...prev, ...updatedEvent } : null);

    try {
      const result = await updateEvent(event.id, updatedEvent);
      
      analytics.track('event_updated', {
        eventId: event.id,
        updates: Object.keys(updatedEvent)
      });

      toast.success('Event updated successfully');
      setEvent(result);
    } catch (error) {
      // Rollback optimistic update
      setEvent(previousEvent);
      toast.error('Failed to update event');
      
      analytics.track('event_update_failed', {
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [event, updateEvent, analytics]);

  /**
   * Handles event publishing with validation
   */
  const handlePublishEvent = useCallback(async () => {
    if (!event?.id) return;

    try {
      const publishedEvent = await publishEvent(event.id);
      
      analytics.track('event_published', {
        eventId: event.id,
        eventName: event.name
      });

      toast.success('Event published successfully');
      setEvent(publishedEvent);
    } catch (error) {
      toast.error('Failed to publish event');
      
      analytics.track('event_publish_failed', {
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [event, publishEvent, analytics]);

  /**
   * Handles event deletion with confirmation
   */
  const handleDeleteEvent = useCallback(async () => {
    if (!event?.id || !window.confirm('Are you sure you want to delete this event?')) return;

    try {
      await deleteEvent(event.id);
      
      analytics.track('event_deleted', {
        eventId: event.id,
        eventName: event.name
      });

      toast.success('Event deleted successfully');
      window.location.href = '/dashboard/events';
    } catch (error) {
      toast.error('Failed to delete event');
      
      analytics.track('event_delete_failed', {
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [event, deleteEvent, analytics]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {event?.name || 'Event Details'}
          </h1>
          <div className="space-x-4">
            {event?.status === EventStatus.DRAFT && (
              <button
                onClick={handlePublishEvent}
                disabled={loadingStates.publishing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loadingStates.publishing ? 'Publishing...' : 'Publish Event'}
              </button>
            )}
            <button
              onClick={handleDeleteEvent}
              disabled={loadingStates.deleting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loadingStates.deleting ? 'Deleting...' : 'Delete Event'}
            </button>
          </div>
        </div>

        {event && (
          <>
            <EventForm
              initialValues={event}
              onSubmit={handleEventUpdate}
              isEdit
              isSubmitting={loadingStates.updating}
            />

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Ticket Management
              </h2>
              <TicketList
                event={event}
                onEdit={async (ticketId) => {
                  // Ticket editing logic
                }}
                onDelete={async (ticketId) => {
                  // Ticket deletion logic
                }}
                loading={loadingStates.updating}
              />
            </div>
          </>
        )}

        {errors.length > 0 && (
          <div className="bg-red-50 p-4 rounded-lg">
            {errors.map((error, index) => (
              <p key={index} className="text-red-600">
                {error.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default EventDetailsPage;