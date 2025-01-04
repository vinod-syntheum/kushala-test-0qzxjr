import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { Provider } from 'react-redux'; // ^8.1.0
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.0
import { jest, beforeEach, afterEach, describe, it, expect } from '@jest/globals'; // ^29.0.0

import LoginForm from '../../src/components/auth/LoginForm';
import { useAuth } from '../../src/hooks/useAuth';
import { setAuth, clearAuth } from '../../src/store/slices/authSlice';
import { HttpStatusCode } from '../../types/common';

// Mock API responses
const mockAuthAPI = {
  login: jest.fn(),
  logout: jest.fn(),
  refresh: jest.fn(),
};

// Mock API module
jest.mock('../../lib/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

// Test data
const validCredentials = {
  email: 'test@example.com',
  password: 'Password123!',
};

const mockTokens = {
  accessToken: 'mock.access.token',
  refreshToken: 'mock.refresh.token',
  expiresIn: 86400,
};

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'OWNER',
};

/**
 * Sets up test environment with Redux store and providers
 */
const setupTestEnvironment = (initialState = {}) => {
  const store = configureStore({
    reducer: {
      auth: (state = initialState, action) => state,
    },
    preloadedState: {
      auth: {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: null,
        ...initialState,
      },
    },
  });

  const user = userEvent.setup();
  const utils = render(
    <Provider store={store}>
      <LoginForm />
    </Provider>
  );

  return {
    store,
    user,
    ...utils,
  };
};

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should handle successful login flow', async () => {
    // Mock successful login response
    mockAuthAPI.login.mockResolvedValueOnce({
      data: { ...mockTokens, user: mockUser },
      status: HttpStatusCode.OK,
    });

    const { user, store } = setupTestEnvironment();

    // Get form elements
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill form
    await user.type(emailInput, validCredentials.email);
    await user.type(passwordInput, validCredentials.password);
    await user.click(submitButton);

    // Verify loading state
    expect(submitButton).toHaveTextContent(/signing in/i);
    expect(submitButton).toBeDisabled();

    // Wait for login completion
    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(store.getState().auth.user).toEqual(mockUser);
      expect(localStorage.getItem('auth_access_token')).toBe(mockTokens.accessToken);
      expect(localStorage.getItem('auth_refresh_token')).toBe(mockTokens.refreshToken);
    });
  });

  it('should handle login validation errors', async () => {
    const { user } = setupTestEnvironment();

    // Get form elements
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Test empty fields
    await user.click(submitButton);
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();

    // Test invalid email
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();

    // Test password requirements
    await user.type(passwordInput, 'weak');
    await user.click(submitButton);
    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('should handle token refresh mechanism', async () => {
    // Setup initial authenticated state
    const initialState = {
      isAuthenticated: true,
      user: mockUser,
      accessToken: 'expired.token',
      refreshToken: mockTokens.refreshToken,
    };

    mockAuthAPI.refresh.mockResolvedValueOnce({
      data: { ...mockTokens, user: mockUser },
      status: HttpStatusCode.OK,
    });

    const { store } = setupTestEnvironment(initialState);

    // Trigger an authenticated action
    await store.dispatch(setAuth({ ...mockTokens, user: mockUser }));

    // Verify token refresh
    await waitFor(() => {
      expect(mockAuthAPI.refresh).toHaveBeenCalledWith({
        refreshToken: mockTokens.refreshToken,
      });
      expect(store.getState().auth.accessToken).toBe(mockTokens.accessToken);
      expect(localStorage.getItem('auth_access_token')).toBe(mockTokens.accessToken);
    });
  });

  it('should handle logout functionality', async () => {
    // Setup initial authenticated state
    const initialState = {
      isAuthenticated: true,
      user: mockUser,
      accessToken: mockTokens.accessToken,
      refreshToken: mockTokens.refreshToken,
    };

    mockAuthAPI.logout.mockResolvedValueOnce({
      status: HttpStatusCode.OK,
    });

    const { store } = setupTestEnvironment(initialState);

    // Trigger logout
    await store.dispatch(clearAuth());

    // Verify logout effects
    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(store.getState().auth.user).toBeNull();
      expect(localStorage.getItem('auth_access_token')).toBeNull();
      expect(localStorage.getItem('auth_refresh_token')).toBeNull();
    });
  });

  it('should handle rate limiting and account lockout', async () => {
    const { user } = setupTestEnvironment();

    // Mock failed login attempts
    mockAuthAPI.login.mockRejectedValue({
      status: HttpStatusCode.UNAUTHORIZED,
      error: { message: 'Invalid credentials' },
    });

    // Get form elements
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Attempt multiple failed logins
    for (let i = 0; i < 5; i++) {
      await user.type(emailInput, validCredentials.email);
      await user.type(passwordInput, 'wrong-password');
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
      await user.clear(emailInput);
      await user.clear(passwordInput);
    }

    // Verify account lockout
    await waitFor(() => {
      expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });
});