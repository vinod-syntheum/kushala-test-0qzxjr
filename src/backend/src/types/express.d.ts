// express.d.ts
// External dependencies versions:
// express: ^4.18.0
// zod: ^3.0.0

import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import * as z from 'zod';

/**
 * Enumeration of user roles for authorization
 */
export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}

/**
 * JWT token payload structure with security fields
 */
export interface JwtCustomPayload {
  userId: string;
  email: string;
  role: UserRole;
  restaurantId: string;
  exp: number;  // Expiration timestamp
  iat: number;  // Issued at timestamp
}

/**
 * Validation error structure for detailed error reporting
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Generic API response structure for consistent response formatting
 */
export interface ApiResponse<T = unknown> {
  status: number;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

/**
 * Extended Express Request interface with authentication and validation
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user data from JWT token
       */
      user?: JwtCustomPayload;

      /**
       * Validated request data after Zod schema validation
       */
      validatedData?: z.infer<any>;

      /**
       * Raw request body buffer for webhook processing
       */
      rawBody?: Buffer;
    }

    interface Response {
      /**
       * Send a success response with data
       * @param data Response payload
       * @param status HTTP status code (default: 200)
       */
      success<T>(data: T, status?: number): Response;

      /**
       * Send an error response
       * @param message Error message
       * @param status HTTP status code (default: 500)
       */
      error(message: string, status?: number): Response;

      /**
       * Send a validation error response
       * @param errors Array of validation errors
       * @param status HTTP status code (default: 422)
       */
      validationError(errors: ValidationError[], status?: number): Response;
    }
  }
}

/**
 * Type guard to check if a value is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'field' in error &&
    'message' in error &&
    'code' in error
  );
}

/**
 * Type guard to check if a value is a JwtCustomPayload
 */
export function isJwtCustomPayload(payload: unknown): payload is JwtCustomPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'userId' in payload &&
    'email' in payload &&
    'role' in payload &&
    'restaurantId' in payload &&
    'exp' in payload &&
    'iat' in payload &&
    Object.values(UserRole).includes((payload as JwtCustomPayload).role)
  );
}

// Ensure this file is treated as a module
export {};