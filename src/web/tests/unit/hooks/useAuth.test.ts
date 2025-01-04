import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { waitFor } from '@testing-library/react';
import useAuth from '../../../src/hooks/useAuth';
import authReducer, {
  login,
  logout,
  refreshToken,
  updateLastActivity,
  checkSession
} from '../../../src/store/slices/authSlice';
import { AuthState, UserRole } from '../../../src/types/auth';
import { HttpStatusCode } from '../../../src/types/common';

// Mock secure storage
jest.mock('@secure-storage/browser', () => ({
  secureStorage: {
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getItem: jest.fn()
  }
}));

// Mock API client
jest.mock('../../../src/lib/api', () => ({
  api: {
    post: jest.fn(),
    setAuthHeader: jest.fn(),
    clearAuthHeader: jest.fn()
  }
}));

// Test constants
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.OWNER,
  mfaEnabled: false
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 86400
};

const mockCredentials = {
  email: 'test@example.com',
  password: 'password123'
};

// Setup test environment
const setupTest = (initialState?: Partial<AuthState>) => {
  const store = configureStore({
    reducer: {
      auth: authReducer
    },
    preloadedState: {
      auth: {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: null,
        lastActivity: Date.now(),
        ...initialState
      }
    }
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return {
    store,
    wrapper
  };
};

describe('useAuth hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Authentication Flow', () => {
    it('should initialize with unauthenticated state', () => {
      const { wrapper } = setupTest();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle successful login', async () => {
      const { wrapper } = setupTest();
      const { result } = renderHook(() => useAuth(), { wrapper });

      const mockResponse = {
        data: { ...mockTokens, user: mockUser },
        status: HttpStatusCode.OK
      };

      (require('../../../src/lib/api').api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
    });

    it('should handle login failure', async () => {
      const { wrapper } = setupTest();
      const { result } = renderHook(() => useAuth(), { wrapper });

      const mockError = {
        status: HttpStatusCode.UNAUTHORIZED,
        error: {
          message: 'Invalid credentials'
        }
      };

      (require('../../../src/lib/api').api.post as jest.Mock).mockRejectedValueOnce(mockError);

      await act(async () => {
        try {
          await result.current.login(mockCredentials);
        } catch (error) {
          expect(error).toEqual(mockError);
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeTruthy();
    });

    it('should handle logout', async () => {
      const { wrapper } = setupTest({
        isAuthenticated: true,
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should handle token refresh', async () => {
      const { wrapper } = setupTest({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'old-access-token',
        refreshToken: mockTokens.refreshToken
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      const mockRefreshResponse = {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          user: mockUser
        },
        status: HttpStatusCode.OK
      };

      (require('../../../src/lib/api').api.post as jest.Mock).mockResolvedValueOnce(mockRefreshResponse);

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('Role-based Access', () => {
    it('should verify owner permissions', () => {
      const { wrapper } = setupTest({
        isAuthenticated: true,
        user: { ...mockUser, role: UserRole.OWNER }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.hasPermission(UserRole.OWNER)).toBe(true);
      expect(result.current.hasPermission(UserRole.MANAGER)).toBe(true);
      expect(result.current.hasPermission(UserRole.STAFF)).toBe(true);
    });

    it('should verify manager permissions', () => {
      const { wrapper } = setupTest({
        isAuthenticated: true,
        user: { ...mockUser, role: UserRole.MANAGER }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.hasPermission(UserRole.OWNER)).toBe(false);
      expect(result.current.hasPermission(UserRole.MANAGER)).toBe(true);
      expect(result.current.hasPermission(UserRole.STAFF)).toBe(true);
    });

    it('should verify staff permissions', () => {
      const { wrapper } = setupTest({
        isAuthenticated: true,
        user: { ...mockUser, role: UserRole.STAFF }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.hasPermission(UserRole.OWNER)).toBe(false);
      expect(result.current.hasPermission(UserRole.MANAGER)).toBe(false);
      expect(result.current.hasPermission(UserRole.STAFF)).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should update last activity on user interaction', async () => {
      const { wrapper } = setupTest({
        isAuthenticated: true,
        user: mockUser
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate user activity
      await act(async () => {
        window.dispatchEvent(new MouseEvent('mousedown'));
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should handle session timeout', async () => {
      const { wrapper } = setupTest({
        isAuthenticated: true,
        user: mockUser,
        lastActivity: Date.now() - 31 * 60 * 1000 // 31 minutes ago
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        result.current.checkAuth();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should setup automatic token refresh', () => {
      const { wrapper } = setupTest({
        isAuthenticated: true,
        user: mockUser
      });

      renderHook(() => useAuth(), { wrapper });

      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      expect(require('../../../src/lib/api').api.post).toHaveBeenCalledWith(
        '/auth/refresh',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during login', async () => {
      const { wrapper } = setupTest();
      const { result } = renderHook(() => useAuth(), { wrapper });

      const networkError = new Error('Network Error');
      (require('../../../src/lib/api').api.post as jest.Mock).mockRejectedValueOnce(networkError);

      await act(async () => {
        try {
          await result.current.login(mockCredentials);
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('should handle token refresh failures', async () => {
      const { wrapper } = setupTest({
        isAuthenticated: true,
        user: mockUser,
        refreshToken: mockTokens.refreshToken
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      const refreshError = {
        status: HttpStatusCode.UNAUTHORIZED,
        error: {
          message: 'Invalid refresh token'
        }
      };

      (require('../../../src/lib/api').api.post as jest.Mock).mockRejectedValueOnce(refreshError);

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });
});