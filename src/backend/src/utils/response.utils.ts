/**
 * @fileoverview Utility functions for generating standardized API responses and error handling
 * Implements RFC-compliant HTTP status codes and consistent error handling patterns
 * @version 1.0.0
 */

import { Response } from 'express'; // v4.18.2
import { HTTP_STATUS, ERROR_TYPES } from '../constants/error.constants';
import { SUCCESS_MESSAGES } from '../constants/messages.constants';
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

/**
 * Interface for standardized success response structure
 */
interface SuccessResponse {
  status: number;
  message: string;
  data?: any;
  timestamp: string;
  requestId: string;
}

/**
 * Interface for standardized error response structure
 */
interface ErrorResponse {
  status: number;
  error: string;
  type: ERROR_TYPES;
  errors: any[];
  timestamp: string;
  requestId: string;
  path: string;
}

/**
 * Interface for validation error structure
 */
interface ValidationError {
  field: string;
  message: string;
  code: string;
  value: any;
}

/**
 * Sends a standardized success response with optional data payload
 * @param res - Express response object
 * @param status - HTTP status code
 * @param message - Success message
 * @param data - Optional data payload
 */
export const sendSuccess = (
  res: Response,
  status: number = HTTP_STATUS.OK,
  message: string,
  data?: any
): void => {
  const response: SuccessResponse = {
    status,
    message,
    timestamp: new Date().toISOString(),
    requestId: uuidv4()
  };

  if (data !== undefined) {
    response.data = data;
  }

  res.setHeader('X-Request-ID', response.requestId);
  res.status(status).json(response);
};

/**
 * Sends a standardized error response with detailed error information
 * @param res - Express response object
 * @param status - HTTP status code
 * @param message - Error message
 * @param errorType - Type of error from ERROR_TYPES enum
 * @param errors - Optional array of detailed errors
 */
export const sendError = (
  res: Response,
  status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  message: string,
  errorType: ERROR_TYPES,
  errors: any[] = []
): void => {
  const requestId = uuidv4();
  const path = (res.req?.originalUrl || '/') as string;

  const response: ErrorResponse = {
    status,
    error: message,
    type: errorType,
    errors,
    timestamp: new Date().toISOString(),
    requestId,
    path
  };

  // Set security headers for error responses
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Log error for monitoring
  console.error({
    level: 'error',
    message: `API Error: ${message}`,
    errorType,
    status,
    path,
    requestId,
    errors
  });

  res.status(status).json(response);
};

/**
 * Sends a standardized validation error response with field-level errors
 * @param res - Express response object
 * @param errors - Array of validation errors
 */
export const sendValidationError = (
  res: Response,
  errors: ValidationError[]
): void => {
  const formattedErrors = errors.map(error => ({
    field: error.field,
    message: error.message,
    code: error.code,
    value: error.value
  }));

  sendError(
    res,
    HTTP_STATUS.UNPROCESSABLE_ENTITY,
    'Validation failed. Please check your input.',
    ERROR_TYPES.VALIDATION_ERROR,
    formattedErrors
  );
};

/**
 * Helper function to create a validation error object
 * @param field - Field name that failed validation
 * @param message - Validation error message
 * @param code - Error code
 * @param value - Invalid value
 */
export const createValidationError = (
  field: string,
  message: string,
  code: string,
  value: any
): ValidationError => ({
  field,
  message,
  code,
  value
});

/**
 * Helper function to check if HTTP status code is valid
 * @param status - HTTP status code to validate
 */
const isValidHttpStatus = (status: number): boolean => {
  return Object.values(HTTP_STATUS).includes(status);
};

/**
 * Helper function to sanitize error messages for security
 * @param message - Error message to sanitize
 */
const sanitizeErrorMessage = (message: string): string => {
  // Remove sensitive information patterns
  return message
    .replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, '[EMAIL]')
    .replace(/\b\d{4}[-]?\d{4}[-]?\d{4}[-]?\d{4}\b/g, '[CARD]')
    .replace(/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g, '[CARD]');
};

// Pre-compile error type check for performance
const validErrorTypes = new Set(Object.values(ERROR_TYPES));

/**
 * Helper function to validate error type
 * @param errorType - Error type to validate
 */
const isValidErrorType = (errorType: ERROR_TYPES): boolean => {
  return validErrorTypes.has(errorType);
};

// Export types for external use
export type { SuccessResponse, ErrorResponse, ValidationError };