/**
 * Core API client library providing typed HTTP methods and standardized request/response handling
 * with support for caching, retries, and offline capabilities.
 * @module api
 * @version 1.0.0
 */

import axiosInstance from './axios';
import type { AxiosRequestConfig } from 'axios'; // ^1.6.0
import {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  HttpStatusCode,
  PaginationParams,
  ApiResult
} from '../types/common';

// Default request configuration
const DEFAULT_CONFIG: AxiosRequestConfig = {
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  retries: 3
};

// Cache configuration
const CACHE_CONFIG = {
  ttl: 300, // 5 minutes
  maxSize: 100,
  invalidateOnMutation: true
};

// Offline queue for requests when offline
const offlineQueue: Array<{ config: AxiosRequestConfig; resolve: Function; reject: Function }> = [];

/**
 * Type for request options with pagination and cache control
 */
interface RequestOptions {
  pagination?: PaginationParams;
  cache?: boolean;
  forceRefresh?: boolean;
  timeout?: number;
  retries?: number;
}

/**
 * Handles offline request queueing
 */
const addToOfflineQueue = (config: AxiosRequestConfig): Promise<any> => {
  return new Promise((resolve, reject) => {
    offlineQueue.push({ config, resolve, reject });
  });
};

/**
 * Processes offline queue when back online
 */
const processOfflineQueue = async (): Promise<void> => {
  while (offlineQueue.length) {
    const request = offlineQueue.shift();
    if (request) {
      try {
        const response = await axiosInstance(request.config);
        request.resolve(response);
      } catch (error) {
        request.reject(error);
      }
    }
  }
};

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', processOfflineQueue);
}

/**
 * Makes a typed GET request with caching and retry support
 */
async function get<T>(
  url: string,
  options: RequestOptions = {},
  config: AxiosRequestConfig = {}
): Promise<ApiResponse<T>> {
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    params: {
      ...options.pagination,
      ...config.params
    },
    cache: options.cache !== false ? {
      ttl: CACHE_CONFIG.ttl,
      force: options.forceRefresh
    } : false
  };

  try {
    if (!navigator.onLine) {
      return await addToOfflineQueue({ ...finalConfig, url, method: 'GET' });
    }
    return await axiosInstance.get<ApiResponse<T>>(url, finalConfig);
  } catch (error) {
    throw error as ApiError;
  }
}

/**
 * Makes a typed POST request
 */
async function post<T, D = any>(
  url: string,
  data: D,
  config: AxiosRequestConfig = {}
): Promise<ApiResponse<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    if (!navigator.onLine) {
      return await addToOfflineQueue({ ...finalConfig, url, method: 'POST', data });
    }
    return await axiosInstance.post<ApiResponse<T>>(url, data, finalConfig);
  } catch (error) {
    throw error as ApiError;
  }
}

/**
 * Makes a typed PUT request
 */
async function put<T, D = any>(
  url: string,
  data: D,
  config: AxiosRequestConfig = {}
): Promise<ApiResponse<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    if (!navigator.onLine) {
      return await addToOfflineQueue({ ...finalConfig, url, method: 'PUT', data });
    }
    return await axiosInstance.put<ApiResponse<T>>(url, data, finalConfig);
  } catch (error) {
    throw error as ApiError;
  }
}

/**
 * Makes a typed DELETE request
 */
async function del<T>(
  url: string,
  config: AxiosRequestConfig = {}
): Promise<ApiResponse<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    if (!navigator.onLine) {
      return await addToOfflineQueue({ ...finalConfig, url, method: 'DELETE' });
    }
    return await axiosInstance.delete<ApiResponse<T>>(url, finalConfig);
  } catch (error) {
    throw error as ApiError;
  }
}

/**
 * Makes a paginated GET request with automatic type inference
 */
async function getPaginated<T>(
  url: string,
  pagination: PaginationParams,
  config: AxiosRequestConfig = {}
): Promise<PaginatedResponse<T>> {
  const response = await get<PaginatedResponse<T>>(url, { pagination }, config);
  return response.data;
}

/**
 * Clears the request cache for a specific URL or all cached requests
 */
function clearCache(url?: string): void {
  if (url) {
    axiosInstance.cache.delete(url);
  } else {
    axiosInstance.cache.clear();
  }
}

/**
 * Cancels a pending request using its URL
 */
function cancelRequest(url: string): void {
  axiosInstance.abortController?.abort(url);
}

/**
 * Returns the current offline request queue
 */
function getOfflineQueue(): Array<AxiosRequestConfig> {
  return offlineQueue.map(request => request.config);
}

// Export the API client interface
export const api = {
  get,
  post,
  put,
  delete: del,
  getPaginated,
  clearCache,
  cancelRequest,
  getOfflineQueue
};

export type { RequestOptions };