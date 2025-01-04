/**
 * @fileoverview Advanced logging utility providing secure, environment-aware logging
 * with rotation, encryption, and monitoring integration capabilities.
 * @version 1.0.0
 */

import winston from 'winston'; // ^3.11.0
import DailyRotateFile from 'winston-daily-rotate-file'; // ^4.7.1
import { HTTP_STATUS } from '../constants/error.constants';
import crypto from 'crypto';
import { Request, Response } from 'express';

/**
 * Defined log levels with numeric priorities
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

/**
 * Color configuration for console output
 */
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
} as const;

/**
 * Headers that should be redacted in logs for security
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
] as const;

/**
 * Log retention configuration
 */
const LOG_RETENTION = {
  maxFiles: '30d',
  maxSize: '100m',
} as const;

/**
 * Encryption key for secure logging - should be set via environment variable
 */
const LOG_ENCRYPTION_KEY = process.env.LOG_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Creates a secure format for log messages
 */
const createSecureFormat = () => {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format((info) => {
      if (info.meta?.headers) {
        const sanitizedHeaders = { ...info.meta.headers };
        SENSITIVE_HEADERS.forEach(header => {
          if (sanitizedHeaders[header]) {
            sanitizedHeaders[header] = '[REDACTED]';
          }
        });
        info.meta.headers = sanitizedHeaders;
      }
      return info;
    })(),
    winston.format.json()
  );
};

/**
 * Creates and configures the Winston logger instance
 */
const createLogger = () => {
  const logger = winston.createLogger({
    levels: LOG_LEVELS,
    level: process.env.LOG_LEVEL || 'info',
    format: createSecureFormat(),
  });

  // Console transport for development
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ colors: LOG_COLORS }),
        winston.format.simple()
      ),
    }));
  }

  // Secure file transport for production
  if (process.env.NODE_ENV === 'production') {
    const fileTransport = new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: LOG_RETENTION.maxFiles,
      maxSize: LOG_RETENTION.maxSize,
      format: winston.format.combine(
        winston.format((info) => {
          // Encrypt sensitive log data
          const encrypted = crypto.createCipher('aes-256-cbc', LOG_ENCRYPTION_KEY);
          let encryptedMessage = encrypted.update(JSON.stringify(info), 'utf8', 'hex');
          encryptedMessage += encrypted.final('hex');
          info.message = encryptedMessage;
          return info;
        })(),
        winston.format.json()
      ),
    });

    logger.add(fileTransport);
  }

  return logger;
};

// Create singleton logger instance
const logger = createLogger();

/**
 * Enhanced error logging with secure stack traces and context preservation
 */
export const logError = (error: Error, context: string, metadata: Record<string, any> = {}) => {
  const errorInfo = {
    correlationId: crypto.randomUUID(),
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ...metadata,
  };

  logger.error(errorInfo);

  // Integration with monitoring services if configured
  if (process.env.MONITORING_ENABLED === 'true') {
    // Implement monitoring service integration
  }
};

/**
 * Secure request logging with header sanitization
 */
export const logRequest = (req: Request, context: string) => {
  const correlationId = crypto.randomUUID();
  req.headers['x-correlation-id'] = correlationId;

  const requestInfo = {
    correlationId,
    method: req.method,
    url: req.url,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString(),
    headers: { ...req.headers },
    context,
  };

  // Sanitize sensitive data
  SENSITIVE_HEADERS.forEach(header => {
    if (requestInfo.headers[header]) {
      requestInfo.headers[header] = '[REDACTED]';
    }
  });

  logger.info({ type: 'request', ...requestInfo });
  return correlationId;
};

/**
 * Response logging with performance metrics
 */
export const logResponse = (res: Response, duration: number) => {
  const correlationId = res.req.headers['x-correlation-id'];
  
  const responseInfo = {
    correlationId,
    statusCode: res.statusCode,
    duration,
    timestamp: new Date().toISOString(),
    headers: { ...res.getHeaders() },
  };

  // Log based on response status
  if (res.statusCode >= 400) {
    logger.error({ type: 'response', ...responseInfo });
  } else {
    logger.info({ type: 'response', ...responseInfo });
  }
};

// Export configured logger instance
export default logger;