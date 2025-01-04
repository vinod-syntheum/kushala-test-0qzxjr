import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router'; // v14.x
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.x
import { withErrorBoundary } from 'react-error-boundary'; // v4.x
import { useAnalytics } from '@analytics/react'; // v1.x
import clsx from 'clsx'; // v2.x

import EventCard, { EventCardProps } from './EventCard';
import { useEventManager } from '../../hooks/useEventManager';
import { Event, EventStatus } from '../../types/event';
import { formatDate } from '../../utils/date';

// Constants for virtualization and analytics
const VIRTUALIZATION_THRESHOLD = 50;
const CONTAINER_HEIGHT = 800;
const ITEM_HEIGHT = 200;

/**
 * Interface for event filtering options
 */
export interface EventFilter {
  status: EventStatus[];
  dateRange: {
    start: string;
    end: string;
  };
  searchTerm: string;
}

/**
 * Props interface for the EventList component
 */
export interface EventListProps {
  events: Event[];
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => Promise<void>;
  onPublish: (eventId: string) => Promise<void>;
  className?: string;
  sortBy?: 'date' | 'name' | 'status' | 'tickets';
  filterBy?: EventFilter;
  virtualizeThreshold?: number;
}

/**
 * EventList component that displays a virtualized list of events with filtering and sorting
 */
const EventList: React.FC<EventListProps> = ({
  events,
  onEdit,
  onDelete,
  onPublish,
  className,
  sortBy = 'date',
  filterBy,
  virtualizeThreshold = VIRTUALIZATION_THRESHOLD
}) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const { loadingStates, error } = useEventManager();
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(events);

  // Container ref for virtualization
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Set up virtualization if event count exceeds threshold
  const rowVirtualizer = useVirtualizer({
    count: filteredEvents.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5
  });

  // Apply filters and sorting to events
  useEffect(() => {
    let result = [...events];

    // Apply filters
    if (filterBy) {
      result = result.filter(event => {
        const matchesStatus = filterBy.status.length === 0 || 
          filterBy.status.includes(event.status);
        const matchesDate = (!filterBy.dateRange.start || 
          new Date(event.startDate) >= new Date(filterBy.dateRange.start)) &&
          (!filterBy.dateRange.end || 
          new Date(event.startDate) <= new Date(filterBy.dateRange.end));
        const matchesSearch = !filterBy.searchTerm || 
          event.name.toLowerCase().includes(filterBy.searchTerm.toLowerCase());
        
        return matchesStatus && matchesDate && matchesSearch;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'tickets':
          return (b.ticketsSold || 0) - (a.ticketsSold || 0);
        default:
          return 0;
      }
    });

    setFilteredEvents(result);
  }, [events, filterBy, sortBy]);

  // Handle event actions with analytics tracking
  const handleEventAction = useCallback(async (
    eventId: string,
    action: 'edit' | 'delete' | 'publish'
  ) => {
    try {
      analytics.track(`event_${action}_attempt`, { eventId });

      switch (action) {
        case 'edit':
          onEdit(eventId);
          break;
        case 'delete':
          await onDelete(eventId);
          break;
        case 'publish':
          await onPublish(eventId);
          break;
      }

      analytics.track(`event_${action}_success`, { eventId });
    } catch (error) {
      analytics.track(`event_${action}_error`, { eventId, error });
      throw error;
    }
  }, [onEdit, onDelete, onPublish, analytics]);

  // Render loading state
  if (loadingStates.loading) {
    return (
      <div className={styles.loading.overlay}>
        <div className={styles.loading.spinner} />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={styles.container.error}>
        <p>Error loading events: {error.error.message}</p>
      </div>
    );
  }

  // Render empty state
  if (filteredEvents.length === 0) {
    return (
      <div className={styles.container.empty}>
        <p>No events found</p>
      </div>
    );
  }

  // Render virtualized list
  return (
    <div
      ref={containerRef}
      className={clsx(styles.virtualList.container, className)}
      style={{ height: CONTAINER_HEIGHT }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const event = filteredEvents[virtualRow.index];
          return (
            <div
              key={event.id}
              className={styles.virtualList.item}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <EventCard
                event={event}
                onEdit={() => handleEventAction(event.id, 'edit')}
                onDelete={() => handleEventAction(event.id, 'delete')}
                onPublish={() => handleEventAction(event.id, 'publish')}
                className="h-full"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Styles object
const styles = {
  container: {
    base: 'grid gap-4 md:grid-cols-2 lg:grid-cols-3 relative',
    empty: 'text-center py-8 text-gray-500',
    error: 'text-red-500 p-4 rounded-md bg-red-50'
  },
  loading: {
    overlay: 'absolute inset-0 bg-white/50 flex items-center justify-center z-10',
    spinner: 'animate-spin h-8 w-8 text-blue-600'
  },
  virtualList: {
    container: 'relative w-full h-full overflow-auto',
    item: 'absolute top-0 left-0 w-full'
  }
};

// Wrap component with error boundary
const EventListWithErrorBoundary = withErrorBoundary(EventList, {
  fallback: (
    <div className={styles.container.error}>
      <p>Something went wrong while displaying events</p>
    </div>
  ),
  onError: (error) => {
    console.error('EventList Error:', error);
  }
});

export default EventListWithErrorBoundary;