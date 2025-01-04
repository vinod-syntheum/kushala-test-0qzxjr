/**
 * Authentication Routes Configuration
 * Version: 1.0.0
 * 
 * Implements secure JWT-based authentication routes with MFA support,
 * rate limiting, request sanitization, and comprehensive validation.
 */

import express from 'express'; // ^4.18.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import expressSanitizer from 'express-sanitizer'; // ^1.0.6
import winston from 'winston'; // ^3.8.2
import { AuthController } from '../controllers/auth.controller';
import validate from '../middlewares/validation.middleware';
import {
  loginSchema,
  mfaVerificationSchema,
  refreshTokenSchema,
  passwordResetRequestSchema,
  passwordResetConfirmationSchema
} from '../../validators/auth.validator';

// Initialize router
const router = express.Router();

// Initialize security logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'auth-routes' },
  transports: [
    new winston.transports.File({ filename: 'logs/auth.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Initialize controller
const authController = new AuthController();

// Request sanitization middleware
router.use(expressSanitizer());

/**
 * @route POST /api/auth/login
 * @description Authenticates user and initiates MFA if enabled
 * Rate limit: 5 attempts per 15 minutes
 */
router.post(
  '/login',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }),
  validate(loginSchema),
  authController.login
);

/**
 * @route POST /api/auth/verify-mfa
 * @description Verifies MFA code and returns JWT tokens
 * Rate limit: 3 attempts per 15 minutes
 */
router.post(
  '/verify-mfa',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 attempts
    message: 'Too many MFA attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }),
  validate(mfaVerificationSchema),
  authController.verifyMFA
);

/**
 * @route POST /api/auth/refresh-token
 * @description Refreshes expired access token using valid refresh token
 * Rate limit: 10 attempts per 15 minutes
 */
router.post(
  '/refresh-token',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts
    message: 'Too many refresh attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }),
  validate(refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route POST /api/auth/request-password-reset
 * @description Initiates password reset process with security checks
 * Rate limit: 3 attempts per 60 minutes
 */
router.post(
  '/request-password-reset',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 60 minutes
    max: 3, // 3 attempts
    message: 'Too many password reset requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }),
  validate(passwordResetRequestSchema),
  authController.requestPasswordReset
);

/**
 * @route POST /api/auth/reset-password
 * @description Completes password reset with token verification
 * Rate limit: 3 attempts per 60 minutes
 */
router.post(
  '/reset-password',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 60 minutes
    max: 3, // 3 attempts
    message: 'Too many password reset attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }),
  validate(passwordResetConfirmationSchema),
  authController.resetPassword
);

// Error handling middleware
router.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Authentication error:', {
    error: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    status: 500,
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

export default router;