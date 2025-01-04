/**
 * Redux Toolkit slice for managing event-related state in the web application.
 * Handles event CRUD operations, loading states, error management, and optimistic updates.
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import type { ApiError } from 'axios'; // ^1.4.0
import { Event, EventStatus } from '../../types/event';
import { api } from '../../lib/api';

// API endpoint for events
const EVENTS_API_ENDPOINT = '/api/v1/events';
const REQUEST_TIMEOUT = 30000;

/**
 * Interface for event slice state with granular loading states
 */
interface EventState {
  events: Event[];
  selectedEvent: Event | null;
  loadingStates: {
    fetchLoading: boolean;
    createLoading: boolean;
    updateLoading: boolean;
    deleteLoading: boolean;
  };
  error: ApiError | null;
  optimisticUpdates: Map<string, Event>;
}

// Initial state with type safety
const initialState: EventState = {
  events: [],
  selectedEvent: null,
  loadingStates: {
    fetchLoading: false,
    createLoading: false,
    updateLoading: false,
    deleteLoading: false
  },
  error: null,
  optimisticUpdates: new Map()
};

/**
 * Async thunk for fetching events list with cancellation support
 */
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (_, { rejectWithValue }) => {
    try {
      // Cancel any existing fetch requests
      api.cancelRequest(EVENTS_API_ENDPOINT);
      
      const response = await api.get<Event[]>(EVENTS_API_ENDPOINT, {
        cache: true,
        timeout: REQUEST_TIMEOUT
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for creating new event with optimistic updates
 */
export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (eventData: Partial<Event>, { rejectWithValue }) => {
    try {
      const response = await api.post<Event>(EVENTS_API_ENDPOINT, eventData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for updating event with optimistic updates
 */
export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ id, ...updateData }: Partial<Event> & { id: string }, { rejectWithValue }) => {
    try {
      const response = await api.put<Event>(`${EVENTS_API_ENDPOINT}/${id}`, updateData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for deleting event with optimistic updates
 */
export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete<void>(`${EVENTS_API_ENDPOINT}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Event slice with reducers and actions
 */
const eventSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setSelectedEvent: (state, action: PayloadAction<Event | null>) => {
      state.selectedEvent = action.payload;
    },
    clearEventError: (state) => {
      state.error = null;
    },
    resetEventState: () => initialState
  },
  extraReducers: (builder) => {
    // Fetch events reducers
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loadingStates.fetchLoading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.events = action.payload;
        state.loadingStates.fetchLoading = false;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loadingStates.fetchLoading = false;
        state.error = action.payload as ApiError;
      });

    // Create event reducers
    builder
      .addCase(createEvent.pending, (state) => {
        state.loadingStates.createLoading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.events.push(action.payload);
        state.loadingStates.createLoading = false;
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.loadingStates.createLoading = false;
        state.error = action.payload as ApiError;
      });

    // Update event reducers
    builder
      .addCase(updateEvent.pending, (state, action) => {
        state.loadingStates.updateLoading = true;
        state.error = null;
        // Store original for optimistic update
        const eventToUpdate = action.meta.arg;
        if (eventToUpdate.id) {
          state.optimisticUpdates.set(eventToUpdate.id, 
            state.events.find(e => e.id === eventToUpdate.id) as Event
          );
        }
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
        state.loadingStates.updateLoading = false;
        state.optimisticUpdates.delete(action.payload.id);
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.loadingStates.updateLoading = false;
        state.error = action.payload as ApiError;
        // Revert optimistic update
        const eventId = action.meta.arg.id;
        const originalEvent = state.optimisticUpdates.get(eventId);
        if (originalEvent) {
          const index = state.events.findIndex(e => e.id === eventId);
          if (index !== -1) {
            state.events[index] = originalEvent;
          }
          state.optimisticUpdates.delete(eventId);
        }
      });

    // Delete event reducers
    builder
      .addCase(deleteEvent.pending, (state, action) => {
        state.loadingStates.deleteLoading = true;
        state.error = null;
        // Store for potential rollback
        const eventId = action.meta.arg;
        const eventToDelete = state.events.find(e => e.id === eventId);
        if (eventToDelete) {
          state.optimisticUpdates.set(eventId, eventToDelete);
        }
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(e => e.id !== action.payload);
        state.loadingStates.deleteLoading = false;
        state.optimisticUpdates.delete(action.payload);
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.loadingStates.deleteLoading = false;
        state.error = action.payload as ApiError;
        // Restore deleted event
        const eventId = action.meta.arg;
        const originalEvent = state.optimisticUpdates.get(eventId);
        if (originalEvent) {
          state.events.push(originalEvent);
          state.optimisticUpdates.delete(eventId);
        }
      });
  }
});

// Export actions
export const { setSelectedEvent, clearEventError, resetEventState } = eventSlice.actions;

// Selectors
export const selectEvents = (state: { events: EventState }) => state.events.events;
export const selectSelectedEvent = (state: { events: EventState }) => state.events.selectedEvent;
export const selectEventLoadingStates = (state: { events: EventState }) => state.events.loadingStates;
export const selectEventError = (state: { events: EventState }) => state.events.error;

// Export reducer
export default eventSlice.reducer;