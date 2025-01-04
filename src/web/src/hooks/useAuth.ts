/**
 * Custom React hook for managing secure authentication state and operations
 * Implements JWT token-based authentication with automatic refresh and role-based access control
 * @version 1.0.0
 */

import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0
import { useCallback, useEffect } from 'react'; // ^18.0.0
import {
  AuthState,
  UserProfile,
  LoginCredentials,
  UserRole,
  hasRequiredRole
} from '../../types/auth';
import {
  login,
  logout,
  refreshToken,
  updateLastActivity,
  checkSession,
  selectIsAuthenticated,
  selectUser,
  selectAuthLoading,
  selectAuthError
} from '../../store/slices/authSlice';

// Constants for token and session management
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];

/**
 * Custom hook for comprehensive authentication state and operations management
 */
export function useAuth() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  /**
   * Handles secure user login with comprehensive error handling
   */
  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      await dispatch(login(credentials)).unwrap();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles secure user logout with cleanup
   */
  const handleLogout = useCallback(async () => {
    try {
      await dispatch(logout()).unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles automatic token refresh
   */
  const handleTokenRefresh = useCallback(async () => {
    try {
      await dispatch(refreshToken()).unwrap();
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Force logout on refresh failure
      await handleLogout();
    }
  }, [dispatch, handleLogout]);

  /**
   * Checks if user has specific permission based on role
   */
  const hasPermission = useCallback((requiredRole: UserRole): boolean => {
    return hasRequiredRole(user, requiredRole);
  }, [user]);

  /**
   * Updates last activity timestamp
   */
  const updateActivity = useCallback(() => {
    dispatch(updateLastActivity());
  }, [dispatch]);

  /**
   * Checks session validity
   */
  const checkSessionValidity = useCallback(() => {
    dispatch(checkSession());
  }, [dispatch]);

  // Set up automatic token refresh
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    if (isAuthenticated) {
      refreshInterval = setInterval(handleTokenRefresh, TOKEN_REFRESH_INTERVAL);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated, handleTokenRefresh]);

  // Set up session monitoring
  useEffect(() => {
    if (isAuthenticated) {
      // Set up activity listeners
      ACTIVITY_EVENTS.forEach(event => {
        window.addEventListener(event, updateActivity);
      });

      // Set up session check interval
      const sessionInterval = setInterval(checkSessionValidity, 60000); // Check every minute

      return () => {
        // Cleanup listeners
        ACTIVITY_EVENTS.forEach(event => {
          window.removeEventListener(event, updateActivity);
        });
        clearInterval(sessionInterval);
      };
    }
  }, [isAuthenticated, updateActivity, checkSessionValidity]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login: handleLogin,
    logout: handleLogout,
    refreshToken: handleTokenRefresh,
    hasPermission,
    checkAuth: checkSessionValidity
  };
}