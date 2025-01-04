/**
 * Core TypeScript type definitions and interfaces used across the web application.
 * Provides standardized types for API responses, error handling, pagination, and location data structures.
 * @version 1.0.0
 */

/**
 * Enum representing standard HTTP status codes used throughout the application
 */
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * Generic interface for successful API responses with type-safe data payload
 * @template T - The type of the data payload
 */
export interface ApiResponse<T> {
  status: HttpStatusCode;
  data: T;
}

/**
 * Detailed field-level validation error information for form handling
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Comprehensive error response structure with support for validation errors and additional context
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details: Record<string, unknown>;
  validationErrors: ValidationError[];
}

/**
 * Interface for standardized API error responses with detailed error information
 */
export interface ApiError {
  status: HttpStatusCode;
  error: ErrorResponse;
}

/**
 * Generic interface for paginated API responses with comprehensive pagination metadata
 * @template T - The type of items in the data array
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Geographic coordinate system interface for location management
 * Supports precise location tracking with accuracy measurement
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Type guard to check if a response is an API error
 * @param response - The response to check
 */
export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'status' in response &&
    'error' in response
  );
}

/**
 * Type guard to check if a response is paginated
 * @param response - The response to check
 */
export function isPaginatedResponse<T>(
  response: unknown
): response is PaginatedResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    'total' in response &&
    'page' in response &&
    'limit' in response &&
    'hasMore' in response
  );
}

/**
 * Type alias for API response that could be either successful or error
 * @template T - The type of the success response data
 */
export type ApiResult<T> = ApiResponse<T> | ApiError;

/**
 * Type alias for optional validation errors in form fields
 */
export type FormValidationErrors = Record<string, ValidationError>;

/**
 * Type alias for pagination parameters used in API requests
 */
export type PaginationParams = {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/**
 * Type alias for coordinate bounds used in location queries
 */
export type CoordinateBounds = {
  northeast: Coordinates;
  southwest: Coordinates;
};