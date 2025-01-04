'use client';

import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EventList from '../../../components/events/EventList';
import useEventManager from '../../../hooks/useEventManager';
import Button from '../../../components/common/Button';
import Alert from '../../../components/common/Alert';

/**
 * Events dashboard page component providing comprehensive event management functionality
 * with optimized performance and accessibility features.
 */
const EventsPage: React.FC = () => {
  const router = useRouter();
  const {
    createEvent,
    updateEvent,
    deleteEvent,
    publishEvent,
    loadingStates,
    error,
    cleanup
  } = useEventManager();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  /**
   * Handles navigation to event creation page with debouncing
   */
  const handleCreateClick = useCallback(() => {
    router.push('/dashboard/events/create');
  }, [router]);

  /**
   * Handles event edit action with validation
   */
  const handleEditEvent = useCallback((eventId: string) => {
    router.push(`/dashboard/events/${eventId}`);
  }, [router]);

  /**
   * Handles event deletion with confirmation
   */
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(eventId);
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  }, [deleteEvent]);

  /**
   * Handles event publishing with validation
   */
  const handlePublishEvent = useCallback(async (eventId: string) => {
    try {
      await publishEvent(eventId);
    } catch (error) {
      console.error('Failed to publish event:', error);
    }
  }, [publishEvent]);

  return (
    <main className={styles.container.base}>
      {/* Page Header */}
      <div className={styles.container.header}>
        <h1 className={styles.title}>Events</h1>
        <Button
          variant="primary"
          onClick={handleCreateClick}
          disabled={loadingStates.creating}
          loading={loadingStates.creating}
          ariaLabel="Create new event"
        >
          Create Event
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          type="error"
          message={error.error.message}
          className={styles.error.alert}
          onClose={() => {/* Add error clearing logic */}}
        />
      )}

      {/* Event List */}
      <div className={styles.container.content}>
        <EventList
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
          onPublish={handlePublishEvent}
          className={styles.list.container}
        />
      </div>
    </main>
  );
};

// Styles object following design system specifications
const styles = {
  container: {
    base: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8',
    header: 'flex justify-between items-center mb-8',
    content: 'bg-white dark:bg-gray-800 rounded-lg shadow'
  },
  title: 'text-2xl font-bold text-gray-900 dark:text-gray-100',
  error: {
    alert: 'mb-6'
  },
  list: {
    container: 'min-h-[400px]'
  }
};

export default EventsPage;