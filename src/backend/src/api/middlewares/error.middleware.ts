/**
 * @fileoverview Enhanced Express error handling middleware with monitoring and security features
 * Implements standardized error responses and logging across the application
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { HTTP_STATUS, ERROR_TYPES } from '../../constants/error.constants';
import { sendError } from '../../utils/response.utils';
import { logError } from '../../utils/logger.utils';

/**
 * Error severity levels for monitoring and alerting
 */
enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Enhanced error interface for application-specific error handling
 */
interface AppError extends Error {
  status?: number;
  type?: string;
  errors?: any[];
  correlationId?: string;
  timestamp?: Date;
  context?: Record<string, unknown>;
  severity?: ErrorSeverity;
}

/**
 * Maps error types to their corresponding HTTP status codes and severity levels
 */
const ERROR_MAP = {
  [ERROR_TYPES.VALIDATION_ERROR]: {
    status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    severity: ErrorSeverity.LOW
  },
  [ERROR_TYPES.AUTHENTICATION_ERROR]: {
    status: HTTP_STATUS.UNAUTHORIZED,
    severity: ErrorSeverity.MEDIUM
  },
  [ERROR_TYPES.AUTHORIZATION_ERROR]: {
    status: HTTP_STATUS.FORBIDDEN,
    severity: ErrorSeverity.MEDIUM
  },
  [ERROR_TYPES.RESOURCE_ERROR]: {
    status: HTTP_STATUS.NOT_FOUND,
    severity: ErrorSeverity.LOW
  },
  [ERROR_TYPES.SERVER_ERROR]: {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    severity: ErrorSeverity.HIGH
  }
};

/**
 * Sanitizes error messages to remove sensitive information
 */
const sanitizeError = (error: AppError): AppError => {
  const sanitized = { ...error };
  
  // Remove sensitive stack trace in production
  if (process.env.NODE_ENV === 'production') {
    delete sanitized.stack;
  }

  // Sanitize error message
  if (sanitized.message) {
    sanitized.message = sanitized.message
      .replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, '[EMAIL]')
      .replace(/\b\d{4}[-]?\d{4}[-]?\d{4}[-]?\d{4}\b/g, '[CARD]');
  }

  return sanitized;
};

/**
 * Determines error type and severity based on error instance
 */
const determineErrorType = (error: AppError): { type: ERROR_TYPES; severity: ErrorSeverity } => {
  if (error.type && Object.values(ERROR_TYPES).includes(error.type as ERROR_TYPES)) {
    return {
      type: error.type as ERROR_TYPES,
      severity: ERROR_MAP[error.type as ERROR_TYPES].severity
    };
  }

  // Default to server error for unknown error types
  return {
    type: ERROR_TYPES.SERVER_ERROR,
    severity: ErrorSeverity.HIGH
  };
};

/**
 * Enhanced Express error handling middleware
 * Processes and responds to errors with improved monitoring and security features
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Ensure error has basic properties
  error.timestamp = error.timestamp || new Date();
  error.correlationId = error.correlationId || req.headers['x-correlation-id'] as string;

  // Determine error type and severity
  const { type, severity } = determineErrorType(error);
  error.type = type;
  error.severity = severity;

  // Set HTTP status code
  const status = error.status || ERROR_MAP[type].status;

  // Sanitize error for security
  const sanitizedError = sanitizeError(error);

  // Preserve error context for debugging
  const errorContext = {
    path: req.path,
    method: req.method,
    correlationId: error.correlationId,
    timestamp: error.timestamp,
    type,
    severity,
    context: error.context || {}
  };

  // Log error with context
  logError(sanitizedError, 'API Error Handler', errorContext);

  // Track error metrics if monitoring is enabled
  if (process.env.MONITORING_ENABLED === 'true') {
    // Implement error metric tracking
    // This would integrate with your monitoring service
  }

  // Format error response based on environment
  const errorResponse = {
    message: sanitizedError.message,
    type,
    errors: sanitizedError.errors || [],
    ...(process.env.NODE_ENV !== 'production' && { stack: sanitizedError.stack })
  };

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Correlation-ID', error.correlationId);

  // Send error response
  sendError(
    res,
    status,
    errorResponse.message,
    type as ERROR_TYPES,
    errorResponse.errors
  );

  // Trigger notifications for high severity errors
  if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
    // Implement error notification system
    // This would integrate with your alerting service
  }
};

export default errorHandler;