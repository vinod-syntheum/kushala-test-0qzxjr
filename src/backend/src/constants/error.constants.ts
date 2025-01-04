/**
 * @fileoverview Error constants used throughout the backend application for consistent error handling
 * and API responses. Implements type-safe, immutable constants that align with REST standards
 * and support monitoring integration.
 * @version 1.0.0
 */

/**
 * Standard HTTP status codes used across the application.
 * Follows REST conventions for consistent API responses.
 * @enum {number}
 */
export enum HTTP_STATUS {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * Error type identifiers used for error categorization and monitoring.
 * Provides specific error types for different error scenarios.
 * @enum {string}
 */
export enum ERROR_TYPES {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_ERROR = 'RESOURCE_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR'
}

/**
 * Standardized error messages for consistent user communication.
 * Provides human-readable error messages for different error scenarios.
 * @const {Object}
 */
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED_ACCESS: 'You are not authorized to perform this action',
  RESOURCE_NOT_FOUND: 'The requested resource was not found',
  VALIDATION_FAILED: 'Validation failed. Please check your input',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later'
} as const;

// Type assertion to ensure ERROR_MESSAGES is readonly
type ErrorMessages = typeof ERROR_MESSAGES;
type ErrorMessageKeys = keyof ErrorMessages;
type ErrorMessageValues = ErrorMessages[ErrorMessageKeys];