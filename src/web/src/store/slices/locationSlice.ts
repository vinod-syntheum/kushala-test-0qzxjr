/**
 * Redux Toolkit slice for managing location state in the application.
 * Handles location CRUD operations with comprehensive error handling and business rules.
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { Location, LocationFormData } from '../../types/location';
import { ApiError } from '../../types/common';
import api from '../../lib/api';

// Constants
const MAX_LOCATIONS = 3;
const CACHE_DURATION = 300000; // 5 minutes in milliseconds

// State interface
interface LocationState {
  locations: Location[];
  selectedLocation: Location | null;
  loading: boolean;
  error: ApiError | null;
  locationCount: number;
  lastUpdated: number | null;
  validationErrors: string[];
  pendingRequests: Record<string, AbortController>;
}

// Initial state
const INITIAL_STATE: LocationState = {
  locations: [],
  selectedLocation: null,
  loading: false,
  error: null,
  locationCount: 0,
  lastUpdated: null,
  validationErrors: [],
  pendingRequests: {}
};

/**
 * Async thunk for fetching all locations with caching
 */
export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { location: LocationState };
      const now = Date.now();

      // Check cache validity
      if (
        state.location.lastUpdated &&
        now - state.location.lastUpdated < CACHE_DURATION &&
        state.location.locations.length > 0
      ) {
        return state.location.locations;
      }

      const response = await api.get<Location[]>('/locations');
      return response.data;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

/**
 * Async thunk for creating a new location with validation
 */
export const createLocation = createAsyncThunk(
  'locations/createLocation',
  async (locationData: LocationFormData, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { location: LocationState };
      
      // Validate location limit
      if (state.location.locationCount >= MAX_LOCATIONS) {
        throw new Error(`Maximum limit of ${MAX_LOCATIONS} locations reached`);
      }

      const response = await api.post<Location>('/locations', locationData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

/**
 * Async thunk for updating an existing location
 */
export const updateLocation = createAsyncThunk(
  'locations/updateLocation',
  async ({ id, data }: { id: string; data: LocationFormData }, { rejectWithValue }) => {
    try {
      const response = await api.put<Location>(`/locations/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

/**
 * Async thunk for deleting a location
 */
export const deleteLocation = createAsyncThunk(
  'locations/deleteLocation',
  async (locationId: string, { rejectWithValue }) => {
    try {
      await api.delete<void>(`/locations/${locationId}`);
      return locationId;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

// Create the location slice
const locationSlice = createSlice({
  name: 'location',
  initialState: INITIAL_STATE,
  reducers: {
    setSelectedLocation: (state, action: PayloadAction<Location | null>) => {
      state.selectedLocation = action.payload;
    },
    clearError: (state) => {
      state.error = null;
      state.validationErrors = [];
    },
    clearCache: (state) => {
      state.lastUpdated = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch locations reducers
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload;
        state.locationCount = action.payload.length;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ApiError;
      })

      // Create location reducers
      .addCase(createLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations.push(action.payload);
        state.locationCount += 1;
        state.lastUpdated = Date.now();
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ApiError;
      })

      // Update location reducers
      .addCase(updateLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLocation.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.locations.findIndex(loc => loc.id === action.payload.id);
        if (index !== -1) {
          state.locations[index] = action.payload;
        }
        if (state.selectedLocation?.id === action.payload.id) {
          state.selectedLocation = action.payload;
        }
        state.lastUpdated = Date.now();
      })
      .addCase(updateLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ApiError;
      })

      // Delete location reducers
      .addCase(deleteLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = state.locations.filter(loc => loc.id !== action.payload);
        state.locationCount -= 1;
        if (state.selectedLocation?.id === action.payload) {
          state.selectedLocation = null;
        }
        state.lastUpdated = Date.now();
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ApiError;
      });
  }
});

// Export actions
export const { setSelectedLocation, clearError, clearCache } = locationSlice.actions;

// Selectors
export const selectLocations = (state: { location: LocationState }) => state.location.locations;
export const selectLocationCount = (state: { location: LocationState }) => state.location.locationCount;
export const selectSelectedLocation = (state: { location: LocationState }) => state.location.selectedLocation;
export const selectLocationError = (state: { location: LocationState }) => state.location.error;
export const selectLocationLoading = (state: { location: LocationState }) => state.location.loading;
export const selectCanAddLocation = (state: { location: LocationState }) => 
  state.location.locationCount < MAX_LOCATIONS;

// Export reducer
export default locationSlice.reducer;