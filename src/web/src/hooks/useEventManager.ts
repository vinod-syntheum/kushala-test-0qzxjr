/**
 * Custom React hook for managing event-related operations including CRUD operations,
 * status updates, and ticket management with comprehensive error handling and loading states.
 * @version 1.0.0
 */

import { useState, useCallback, useRef } from 'react'; // ^18.0.0
import { useDispatch } from 'react-redux'; // ^8.0.0
import { Event, EventStatus } from '../../types/event';
import { api } from '../../lib/api';
import { eventSlice } from '../../store/slices/eventSlice';
import type { ApiError } from '../../types/common';

// API endpoint configuration
const EVENTS_API_ENDPOINT = '/api/v1/events';
const REQUEST_TIMEOUT = 30000;

/**
 * Interface for loading states of different event operations
 */
interface EventLoadingStates {
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  publishing: boolean;
}

/**
 * Interface for event creation data with required fields
 */
interface EventCreateData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  locationId: string;
  capacity: number;
  maxTicketsPerPerson: number;
  ticketTypes: string[];
  categories: string[];
}

/**
 * Custom hook for managing event operations
 */
export function useEventManager() {
  // Initialize loading states
  const [loadingStates, setLoadingStates] = useState<EventLoadingStates>({
    creating: false,
    updating: false,
    deleting: false,
    publishing: false
  });

  // Initialize error state
  const [error, setError] = useState<ApiError | null>(null);

  // Get Redux dispatch function
  const dispatch = useDispatch();

  // Request cancellation refs
  const createAbortController = useRef<AbortController | null>(null);
  const updateAbortController = useRef<AbortController | null>(null);
  const deleteAbortController = useRef<AbortController | null>(null);

  /**
   * Creates a new event with optimistic updates
   */
  const createEvent = useCallback(async (eventData: EventCreateData): Promise<Event> => {
    try {
      setLoadingStates(prev => ({ ...prev, creating: true }));
      setError(null);

      // Cancel any existing create request
      createAbortController.current?.abort();
      createAbortController.current = new AbortController();

      const response = await api.post<Event>(EVENTS_API_ENDPOINT, {
        ...eventData,
        status: EventStatus.DRAFT
      }, {
        signal: createAbortController.current.signal,
        timeout: REQUEST_TIMEOUT
      });

      // Dispatch to Redux store
      dispatch(eventSlice.actions.setSelectedEvent(response.data));

      return response.data;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoadingStates(prev => ({ ...prev, creating: false }));
      createAbortController.current = null;
    }
  }, [dispatch]);

  /**
   * Updates an existing event with optimistic updates
   */
  const updateEvent = useCallback(async (eventId: string, updateData: Partial<Event>): Promise<Event> => {
    try {
      setLoadingStates(prev => ({ ...prev, updating: true }));
      setError(null);

      // Cancel any existing update request
      updateAbortController.current?.abort();
      updateAbortController.current = new AbortController();

      const response = await api.put<Event>(`${EVENTS_API_ENDPOINT}/${eventId}`, updateData, {
        signal: updateAbortController.current.signal,
        timeout: REQUEST_TIMEOUT
      });

      // Update Redux store
      dispatch(eventSlice.actions.setSelectedEvent(response.data));

      return response.data;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoadingStates(prev => ({ ...prev, updating: false }));
      updateAbortController.current = null;
    }
  }, [dispatch]);

  /**
   * Deletes an event with proper cleanup
   */
  const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
    try {
      setLoadingStates(prev => ({ ...prev, deleting: true }));
      setError(null);

      // Cancel any existing delete request
      deleteAbortController.current?.abort();
      deleteAbortController.current = new AbortController();

      await api.delete<void>(`${EVENTS_API_ENDPOINT}/${eventId}`, {
        signal: deleteAbortController.current.signal,
        timeout: REQUEST_TIMEOUT
      });

      // Clear selected event if it's the deleted one
      dispatch(eventSlice.actions.setSelectedEvent(null));

    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoadingStates(prev => ({ ...prev, deleting: false }));
      deleteAbortController.current = null;
    }
  }, [dispatch]);

  /**
   * Publishes an event after validation
   */
  const publishEvent = useCallback(async (eventId: string): Promise<Event> => {
    try {
      setLoadingStates(prev => ({ ...prev, publishing: true }));
      setError(null);

      const response = await api.put<Event>(`${EVENTS_API_ENDPOINT}/${eventId}/publish`, {
        status: EventStatus.PUBLISHED
      }, {
        timeout: REQUEST_TIMEOUT
      });

      // Update Redux store with published event
      dispatch(eventSlice.actions.setSelectedEvent(response.data));

      return response.data;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoadingStates(prev => ({ ...prev, publishing: false }));
    }
  }, [dispatch]);

  /**
   * Cleanup function for aborting any pending requests
   */
  const cleanup = useCallback(() => {
    createAbortController.current?.abort();
    updateAbortController.current?.abort();
    deleteAbortController.current?.abort();
  }, []);

  // Return event management interface
  return {
    createEvent,
    updateEvent,
    deleteEvent,
    publishEvent,
    loadingStates,
    error,
    cleanup
  };
}

export type { EventCreateData, EventLoadingStates };