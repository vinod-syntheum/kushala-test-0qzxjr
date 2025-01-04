/**
 * Main Router Configuration
 * Version: 1.0.0
 * 
 * Aggregates and exports all API routes with comprehensive security,
 * monitoring, and error handling capabilities.
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import route modules
import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';
import { eventRouter } from './event.routes';
import { locationRouter } from './location.routes';

// Import middleware
import { errorHandler } from '../middlewares/error.middleware';
import logger from '../../utils/logger.utils';

// Initialize router
const router: Router = express.Router();

/**
 * Configure base middleware chain with security features
 */
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Configure CORS
router.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Enable compression
router.use(compression());

/**
 * Configure rate limiting for different route categories
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many API requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Request logging middleware
 */
router.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  req.headers['x-correlation-id'] = correlationId;
  
  logger.logRequest(req, 'API Request');
  
  res.on('finish', () => {
    logger.logResponse(res, Date.now() - (req as any).startTime);
  });
  
  next();
});

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

/**
 * API Documentation endpoint
 */
router.get('/docs', (req: Request, res: Response) => {
  res.status(200).json({
    openapi: '3.0.0',
    info: {
      title: 'Restaurant Digital Presence API',
      version: '1.0.0',
      description: 'API documentation for the Restaurant Digital Presence platform'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'API Server'
      }
    ]
  });
});

/**
 * Mount route modules with appropriate middleware
 */
router.use('/auth', authRateLimit, authRouter);
router.use('/users', apiRateLimit, userRouter);
router.use('/events', apiRateLimit, eventRouter);
router.use('/locations', apiRateLimit, locationRouter);

/**
 * 404 handler for unmatched routes
 */
router.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: 'The requested resource does not exist',
    path: req.path
  });
});

/**
 * Global error handler
 */
router.use(errorHandler);

export default router;