'use client';

import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // ^14.0.0
import EventForm from '../../../../components/events/EventForm';
import { useEventManager } from '../../../../hooks/useEventManager';
import type { Event } from '../../../../types/event';

/**
 * Page component for creating new events with optimized form completion within 15 minutes
 * Implements comprehensive validation, error handling, and success feedback
 */
const CreateEventPage: React.FC = () => {
  // Initialize router for navigation
  const router = useRouter();

  // Get event management functions and loading states
  const {
    createEvent,
    loadingStates: { creating: isSubmitting },
    error,
    cleanup
  } = useEventManager();

  // Handle form submission with validation and error handling
  const handleSubmit = useCallback(async (eventData: Partial<Event>) => {
    try {
      // Create event with validated data
      const createdEvent = await createEvent({
        name: eventData.name || '',
        description: eventData.description || '',
        startDate: eventData.startDate || '',
        endDate: eventData.endDate || '',
        locationId: eventData.locationId || '',
        capacity: eventData.capacity || 0,
        maxTicketsPerPerson: eventData.maxTicketsPerPerson || 1,
        ticketTypes: eventData.ticketTypes || [],
        categories: eventData.categories || []
      });

      // Navigate to event details on success
      router.push(`/dashboard/events/${createdEvent.id}`);
    } catch (err) {
      // Error handling is managed by useEventManager hook
      console.error('Failed to create event:', err);
    }
  }, [createEvent, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create and publish your event in minutes with our optimized form.
        </p>
      </div>

      {error && (
        <div 
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-red-600">
            {error.error.message}
          </p>
        </div>
      )}

      <EventForm
        initialValues={{
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          locationId: '',
          capacity: 0,
          maxTicketsPerPerson: 1,
          ticketTypes: [],
          categories: [],
          imageUrl: ''
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        onCancel={() => router.push('/dashboard/events')}
      />
    </div>
  );
};

export default CreateEventPage;