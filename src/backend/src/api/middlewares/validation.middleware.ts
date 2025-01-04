/**
 * @fileoverview Express middleware for request validation using Zod schemas
 * Implements comprehensive input validation with detailed error reporting and schema caching
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { z, AnyZodObject } from 'zod'; // v3.0.0
import { HTTP_STATUS, ERROR_TYPES, ERROR_MESSAGES } from '../../constants/error.constants';
import { sendValidationError } from '../../utils/response.utils';

/**
 * Interface for structured validation error details
 */
interface ValidationError {
  field: string;
  message: string;
  code: string;
  context?: Record<string, any>;
}

// Cache for compiled schemas to improve performance
const schemaCache = new WeakMap<AnyZodObject, z.ZodType>();

/**
 * Maximum request body size in bytes (10MB)
 */
const MAX_REQUEST_SIZE = 10 * 1024 * 1024;

/**
 * Transforms Zod validation errors into a structured format
 * @param error - Zod validation error
 * @returns Array of ValidationError objects
 */
const transformValidationErrors = (error: z.ZodError): ValidationError[] => {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: `INVALID_${err.code}`,
    context: {
      received: err.received,
      expected: err.expected,
      path: err.path
    }
  }));
};

/**
 * Creates a validation middleware for the provided Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
const validate = (schema: AnyZodObject) => {
  // Get or compile schema from cache
  let compiledSchema = schemaCache.get(schema);
  if (!compiledSchema) {
    compiledSchema = schema.strict();
    schemaCache.set(schema, compiledSchema);
  }

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check request body size
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > MAX_REQUEST_SIZE) {
        throw new Error('Request body too large');
      }

      // Parse request against schema
      const validData = await compiledSchema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Update request with validated data
      req.body = validData.body;
      req.query = validData.query;
      req.params = validData.params;

      // Clean up large requests from memory
      if (contentLength > 1024 * 1024) {
        global.gc?.();
      }

      return next();
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        const validationErrors = transformValidationErrors(error);
        
        // Log validation failure for monitoring
        console.warn({
          level: 'warn',
          message: ERROR_MESSAGES.VALIDATION_FAILED,
          path: req.path,
          errors: validationErrors,
          requestId: req.headers['x-request-id']
        });

        return sendValidationError(res, validationErrors);
      }

      // Handle other errors
      console.error({
        level: 'error',
        message: 'Validation middleware error',
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        requestId: req.headers['x-request-id']
      });

      return sendValidationError(res, [{
        field: 'request',
        message: 'Invalid request format',
        code: 'INVALID_REQUEST',
        context: { error: error instanceof Error ? error.message : 'Unknown error' }
      }]);
    }
  };
};

export default validate;