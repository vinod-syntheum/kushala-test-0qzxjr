/**
 * Redux slice for managing authentication state with comprehensive security features
 * Implements JWT token-based authentication with automatic refresh and secure storage
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^2.0.0
import { secureStorage } from '@secure-storage/browser'; // ^1.0.0
import { AuthState, LoginCredentials, UserProfile, AuthResponse, UserRole } from '../../types/auth';
import { api } from '../../lib/api';
import { HttpStatusCode } from '../../types/common';

// Constants for token management
const TOKEN_CONFIG = {
  ACCESS_TOKEN_KEY: 'auth_access_token',
  REFRESH_TOKEN_KEY: 'auth_refresh_token',
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes of inactivity
};

// Initial authentication state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
  lastActivity: Date.now(),
  offlineQueue: [],
  retryCount: 0,
};

/**
 * Async thunk for user login with comprehensive error handling
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      const { accessToken, refreshToken, user } = response.data;

      // Securely store tokens
      await secureStorage.setItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY, accessToken);
      await secureStorage.setItem(TOKEN_CONFIG.REFRESH_TOKEN_KEY, refreshToken);

      // Set auth header for subsequent requests
      api.setAuthHeader(accessToken);

      return { accessToken, refreshToken, user };
    } catch (error: any) {
      return rejectWithValue({
        status: error.status || HttpStatusCode.INTERNAL_SERVER_ERROR,
        message: error.error?.message || 'Login failed',
      });
    }
  }
);

/**
 * Async thunk for token refresh with automatic retry
 */
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const currentRefreshToken = state.auth.refreshToken;

      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post<AuthResponse>('/auth/refresh', {
        refreshToken: currentRefreshToken,
      });

      const { accessToken, refreshToken, user } = response.data;

      // Update stored tokens
      await secureStorage.setItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY, accessToken);
      await secureStorage.setItem(TOKEN_CONFIG.REFRESH_TOKEN_KEY, refreshToken);

      // Update auth header
      api.setAuthHeader(accessToken);

      return { accessToken, refreshToken, user };
    } catch (error: any) {
      return rejectWithValue({
        status: error.status || HttpStatusCode.INTERNAL_SERVER_ERROR,
        message: error.error?.message || 'Token refresh failed',
      });
    }
  }
);

/**
 * Async thunk for user logout with cleanup
 */
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout', {});
      
      // Clear stored tokens
      await secureStorage.removeItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
      await secureStorage.removeItem(TOKEN_CONFIG.REFRESH_TOKEN_KEY);

      // Clear auth header
      api.clearAuthHeader();

      return null;
    } catch (error: any) {
      return rejectWithValue({
        status: error.status || HttpStatusCode.INTERNAL_SERVER_ERROR,
        message: error.error?.message || 'Logout failed',
      });
    }
  }
);

/**
 * Redux slice for authentication state management
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
    },
    checkSession: (state) => {
      const now = Date.now();
      if (state.isAuthenticated && 
          now - state.lastActivity > TOKEN_CONFIG.SESSION_TIMEOUT) {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      }
    },
  },
  extraReducers: (builder) => {
    // Login reducers
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.loading = false;
      state.lastActivity = Date.now();
      state.retryCount = 0;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as Error;
      state.retryCount += 1;
    });

    // Refresh token reducers
    builder.addCase(refreshToken.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(refreshToken.fulfilled, (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.loading = false;
      state.lastActivity = Date.now();
      state.retryCount = 0;
    });
    builder.addCase(refreshToken.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as Error;
      state.retryCount += 1;
    });

    // Logout reducers
    builder.addCase(logout.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(logout.fulfilled, (state) => {
      return { ...initialState, lastActivity: Date.now() };
    });
    builder.addCase(logout.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as Error;
    });
  },
});

// Export actions and reducer
export const { 
  updateLastActivity, 
  clearError, 
  setUser, 
  checkSession 
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectIsAuthenticated = (state: { auth: AuthState }) => 
  state.auth.isAuthenticated;

export const selectUser = (state: { auth: AuthState }) => 
  state.auth.user;

export const selectUserRole = (state: { auth: AuthState }) => 
  state.auth.user?.role;

export const selectIsOwner = (state: { auth: AuthState }) => 
  state.auth.user?.role === UserRole.OWNER;

export const selectIsManager = (state: { auth: AuthState }) => 
  state.auth.user?.role === UserRole.MANAGER;

export const selectAuthLoading = (state: { auth: AuthState }) => 
  state.auth.loading;

export const selectAuthError = (state: { auth: AuthState }) => 
  state.auth.error;