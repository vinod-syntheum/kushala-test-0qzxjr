/**
 * Root Redux store configuration with comprehensive TypeScript typing and performance optimizations.
 * Combines all feature slices and configures middleware for development and production environments.
 * @version 1.0.0
 */

import { configureStore, combineReducers, Middleware } from '@reduxjs/toolkit'; // ^2.0.0
import authReducer, { AuthState } from './slices/authSlice';
import websiteReducer, { WebsiteState } from './slices/websiteSlice';
import eventReducer, { EventState } from './slices/eventSlice';
import locationReducer, { LocationState } from './slices/locationSlice';

// Root state type definition combining all slice states
export interface RootState {
  auth: AuthState;
  website: WebsiteState;
  events: EventState;
  location: LocationState;
}

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  website: websiteReducer,
  events: eventReducer,
  location: locationReducer
});

/**
 * Configure Redux store with environment-specific enhancements
 */
const makeStore = () => {
  // Development-only middleware
  const developmentMiddleware: Middleware[] = [];
  
  if (process.env.NODE_ENV === 'development') {
    // Enable Redux DevTools in development
    const { createLogger } = require('redux-logger');
    developmentMiddleware.push(
      createLogger({
        collapsed: true,
        duration: true,
        timestamp: false
      })
    );
  }

  // Create store with proper configuration
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // Performance optimizations
        serializableCheck: {
          // Ignore specific action types that may contain non-serializable data
          ignoredActions: ['website/setBlocks'],
          // Ignore specific paths in the state
          ignoredPaths: ['website.undoStack', 'website.redoStack']
        },
        // Enable immutability checks except in production
        immutableCheck: process.env.NODE_ENV !== 'production',
        // Enable thunk middleware for async actions
        thunk: true
      }).concat(developmentMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
    // Enable hot module replacement in development
    enhancers: (defaultEnhancers) => {
      if (process.env.NODE_ENV === 'development' && module.hot) {
        module.hot.accept('./rootReducer', () => {
          store.replaceReducer(rootReducer);
        });
      }
      return defaultEnhancers;
    }
  });
};

// Create store instance
export const store = makeStore();

// Export dispatch type for proper typing in components
export type AppDispatch = typeof store.dispatch;

// Export useful store methods
export const { dispatch, getState, subscribe } = store;

// Type-safe hooks for use in components
declare module 'react-redux' {
  interface DefaultRootState extends RootState {}
  export function useDispatch<TDispatch = AppDispatch>(): TDispatch;
  export function useSelector<TState = RootState, TSelected = unknown>(
    selector: (state: TState) => TSelected
  ): TSelected;
}