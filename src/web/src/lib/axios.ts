/**
 * Configures and exports an Axios instance with comprehensive interceptors for handling API requests,
 * authentication, error handling, request deduplication, and caching across the application.
 * @module axios
 * @version 1.0.0
 */

import axios, { 
  AxiosError, 
  AxiosInstance, 
  AxiosRequestConfig,
  InternalAxiosRequestConfig 
} from 'axios'; // ^1.6.0
import { setupCache, buildMemoryStorage } from 'axios-cache-interceptor'; // ^1.0.0
import axiosRetry, { 
  isNetworkOrIdempotentRequestError, 
  exponentialDelay 
} from 'axios-retry'; // ^3.8.0
import { 
  ApiResponse, 
  ApiError, 
  HttpStatusCode 
} from '../types/common';

// Environment configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const REQUEST_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT || 30000);
const MAX_RETRIES = Number(process.env.NEXT_PUBLIC_API_MAX_RETRIES || 3);

// In-memory request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Creates a unique hash for request deduplication
 */
const createRequestHash = (config: InternalAxiosRequestConfig): string => {
  const { method, url, params, data } = config;
  return `${method}-${url}-${JSON.stringify(params)}-${JSON.stringify(data)}`;
};

/**
 * Configures retry behavior for failed requests
 */
const setupRetryConfig = (axiosInstance: AxiosInstance): void => {
  axiosRetry(axiosInstance, {
    retries: MAX_RETRIES,
    retryDelay: exponentialDelay,
    retryCondition: (error: AxiosError) => {
      // Only retry network errors and idempotent requests
      return isNetworkOrIdempotentRequestError(error) && 
             error.response?.status !== HttpStatusCode.UNAUTHORIZED;
    },
    onRetry: (retryCount, error, requestConfig) => {
      console.warn(
        `Retrying request (${retryCount}/${MAX_RETRIES}):`,
        error.message,
        requestConfig.url
      );
    }
  });
};

/**
 * Configures comprehensive request and response interceptors
 */
const setupInterceptors = (axiosInstance: AxiosInstance): void => {
  // Request interceptors
  axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Request deduplication
      const hash = createRequestHash(config);
      if (pendingRequests.has(hash)) {
        return pendingRequests.get(hash);
      }

      // Auth token injection
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // CSRF token
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }

      return config;
    },
    (error: AxiosError) => Promise.reject(error)
  );

  // Response interceptors
  axiosInstance.interceptors.response.use(
    (response) => {
      // Transform successful responses to ApiResponse format
      const apiResponse: ApiResponse<any> = {
        status: response.status,
        data: response.data
      };
      return apiResponse;
    },
    async (error: AxiosError) => {
      // Handle unauthorized errors (token refresh)
      if (error.response?.status === HttpStatusCode.UNAUTHORIZED) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken
            });
            localStorage.setItem('auth_token', response.data.token);
            // Retry original request
            const config = error.config as AxiosRequestConfig;
            if (config) {
              return axiosInstance(config);
            }
          } catch (refreshError) {
            // Clear tokens on refresh failure
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
          }
        }
      }

      // Transform error responses to ApiError format
      const apiError: ApiError = {
        status: error.response?.status || HttpStatusCode.INTERNAL_SERVER_ERROR,
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message || 'An unexpected error occurred',
          details: error.response?.data || {},
          validationErrors: error.response?.data?.validationErrors || []
        }
      };

      return Promise.reject(apiError);
    }
  );
};

// Create and configure Axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Setup caching for GET requests
const cachedAxiosInstance = setupCache(axiosInstance, {
  storage: buildMemoryStorage(),
  ttl: 5 * 60 * 1000, // 5 minutes cache
  cachePredicate: {
    // Only cache GET requests
    method: (method) => method === 'get',
    // Don't cache if Authorization header is present
    header: (headers) => !headers.Authorization
  }
});

// Configure interceptors and retry behavior
setupInterceptors(cachedAxiosInstance);
setupRetryConfig(cachedAxiosInstance);

// Export configured instance
export default cachedAxiosInstance;