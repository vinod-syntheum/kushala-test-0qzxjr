/**
 * @fileoverview Authentication utility functions implementing secure JWT operations
 * and role-based access control with comprehensive security measures.
 * @version 1.0.0
 */

import jwt from 'jsonwebtoken'; // v9.0.0
import ms from 'ms'; // v2.1.3
import winston from 'winston'; // v3.8.2
import { JwtPayload, UserRole } from '../interfaces/auth.interface';
import { ERROR_MESSAGES } from '../constants/error.constants';
import { generateSecureToken } from './crypto.utils';

// Configure secure JWT options
const JWT_OPTIONS = {
  algorithm: 'RS256',
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
} as const;

// Configure logger for security events
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'auth-utils' },
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

/**
 * Generates a JWT access token with enhanced security measures
 * @param {JwtPayload} payload - User information to encode in token
 * @returns {Promise<string>} Signed JWT access token
 * @throws {Error} If payload is invalid or signing fails
 */
export async function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  try {
    // Validate required payload fields
    if (!payload.userId || !payload.email || !payload.role) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = ms('24h') / 1000; // Convert to seconds

    const tokenPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_PRIVATE_KEY as string,
      {
        ...JWT_OPTIONS,
        expiresIn: '24h',
      }
    );

    logger.info('Access token generated', {
      userId: payload.userId,
      role: payload.role,
      tokenExp: tokenPayload.exp,
    });

    return token;
  } catch (error) {
    logger.error('Access token generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: payload.userId,
    });
    throw new Error(ERROR_MESSAGES.SERVER_ERROR);
  }
}

/**
 * Generates a cryptographically secure refresh token
 * @param {string} userId - User identifier for token association
 * @returns {Promise<string>} Secure refresh token
 * @throws {Error} If token generation fails
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  try {
    if (!userId) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const token = generateSecureToken(64); // Use 64 bytes for refresh tokens
    const expiresIn = ms('7d');

    logger.info('Refresh token generated', {
      userId,
      expiresIn,
    });

    return token;
  } catch (error) {
    logger.error('Refresh token generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    throw new Error(ERROR_MESSAGES.SERVER_ERROR);
  }
}

/**
 * Verifies JWT access token with comprehensive security checks
 * @param {string} token - JWT token to verify
 * @returns {Promise<JwtPayload>} Decoded and validated token payload
 * @throws {Error} If token is invalid, expired, or verification fails
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  try {
    if (!token) {
      throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_PUBLIC_KEY as string,
      {
        ...JWT_OPTIONS,
        complete: true,
      }
    ) as { payload: JwtPayload };

    // Additional payload validation
    if (!decoded.payload.userId || !decoded.payload.email || !decoded.payload.role) {
      throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.payload.exp <= now) {
      throw new Error(ERROR_MESSAGES.TOKEN_EXPIRED);
    }

    logger.info('Token verified successfully', {
      userId: decoded.payload.userId,
      role: decoded.payload.role,
    });

    return decoded.payload;
  } catch (error) {
    logger.error('Token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      token: token.substring(0, 10) + '...', // Log only token prefix
    });

    if (error instanceof jwt.TokenExpiredError) {
      throw new Error(ERROR_MESSAGES.TOKEN_EXPIRED);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
    }
    throw new Error(ERROR_MESSAGES.SERVER_ERROR);
  }
}

/**
 * Performs strict role-based access control checks
 * @param {UserRole} requiredRole - Minimum role level required
 * @param {UserRole} userRole - User's actual role
 * @returns {boolean} Whether user has sufficient permissions
 * @throws {Error} If role validation fails
 */
export function checkRole(requiredRole: UserRole, userRole: UserRole): boolean {
  try {
    // Validate role enum values
    if (!Object.values(UserRole).includes(requiredRole) || 
        !Object.values(UserRole).includes(userRole)) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Define role hierarchy (higher index = higher privileges)
    const roleHierarchy = [UserRole.STAFF, UserRole.MANAGER, UserRole.OWNER];
    
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    const userRoleIndex = roleHierarchy.indexOf(userRole);

    const hasPermission = userRoleIndex >= requiredRoleIndex;

    logger.info('Role check performed', {
      requiredRole,
      userRole,
      hasPermission,
    });

    return hasPermission;
  } catch (error) {
    logger.error('Role check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requiredRole,
      userRole,
    });
    throw new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
  }
}