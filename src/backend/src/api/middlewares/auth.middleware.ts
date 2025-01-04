/**
 * @fileoverview Enhanced authentication and authorization middleware with comprehensive
 * security features, audit logging, and role-based access control.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import winston from 'winston'; // v3.8.0
import { TokenBlacklist } from '@app/token-blacklist'; // v1.0.0

import { verifyAccessToken, checkRole } from '../../utils/auth.utils';
import { AuthenticatedRequest, UserRole, JwtPayload } from '../../interfaces/auth.interface';
import { ERROR_MESSAGES } from '../../constants/error.constants';

// Configure security event logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'auth-middleware' },
  transports: [
    new winston.transports.File({ filename: 'security-events.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Initialize token blacklist service
const tokenBlacklist = new TokenBlacklist();

/**
 * Enhanced authentication middleware with comprehensive security features
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Generate correlation ID for request tracking
  const correlationId = uuidv4();
  req.correlationId = correlationId;

  try {
    // Extract authorization header (case-insensitive)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader || typeof authHeader !== 'string') {
      throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
    }

    // Extract token from Bearer scheme
    const [scheme, token] = authHeader.split(' ');
    
    if (scheme.toLowerCase() !== 'bearer' || !token) {
      throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
    }

    // Verify and decode token
    const decodedToken = await verifyAccessToken(token);

    // Attach user information to request
    (req as AuthenticatedRequest).user = decodedToken;

    // Log successful authentication
    logger.info('Authentication successful', {
      correlationId,
      userId: decodedToken.userId,
      role: decodedToken.role,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    next();
  } catch (error) {
    // Log authentication failure
    logger.error('Authentication failed', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
    });

    res.status(401).json({
      error: ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
      correlationId,
    });
  }
}

/**
 * Enhanced authorization middleware factory with role-based access control
 * @param {UserRole} requiredRole - Minimum role level required for access
 * @returns {Function} Middleware function for role-based authorization
 */
export function authorize(requiredRole: UserRole) {
  return async function authorizeMiddleware(
    req: Request & AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const correlationId = req.correlationId || uuidv4();

    try {
      if (!req.user || !req.user.role) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
      }

      const hasPermission = checkRole(requiredRole, req.user.role);

      if (!hasPermission) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
      }

      // Log successful authorization
      logger.info('Authorization successful', {
        correlationId,
        userId: req.user.userId,
        requiredRole,
        userRole: req.user.role,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      // Log authorization failure
      logger.error('Authorization failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        requiredRole,
        userRole: req.user?.role,
        path: req.path,
        method: req.method,
      });

      res.status(403).json({
        error: ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        correlationId,
      });
    }
  };
}

// Extend Express Request interface to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}