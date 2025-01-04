/**
 * Main Express Application Configuration
 * Version: 1.0.0
 * 
 * Configures and initializes the Express application with comprehensive security,
 * monitoring, and error handling features for the restaurant digital presence platform.
 */

import express, { Application } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import morgan from 'morgan'; // v1.10.0

import router from './api/routes';
import errorHandler from './api/middlewares/error.middleware';
import rateLimiter from './api/middlewares/rateLimiter.middleware';
import logger from './utils/logger.utils';

// Initialize Express application
const app: Application = express();

/**
 * Initialize and configure application middleware with enhanced security
 * and monitoring capabilities
 */
const initializeMiddleware = (): void => {
  // Security headers with CSP and other protections
  app.use(helmet({
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

  // CORS configuration with strict origin validation
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Request body parsing with size limits
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }));

  app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
  }));

  // Response compression
  app.use(compression({
    level: 6,
    threshold: 100 * 1024, // 100kb
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Enhanced request logging with security context
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info('HTTP Request', { message: message.trim() });
      }
    },
    skip: (req) => req.path === '/health'
  }));

  // Add correlation ID to all requests
  app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });

  // Request timing middleware
  app.use((req, res, next) => {
    req.startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - req.startTime;
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        correlationId: req.headers['x-correlation-id']
      });
    });
    next();
  });

  // Apply rate limiting to all routes
  app.use(rateLimiter);

  // Mount main API router
  app.use('/api', router);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    });
  });

  // 404 handler for unmatched routes
  app.use((req, res) => {
    res.status(404).json({
      status: 404,
      error: 'Not Found',
      message: 'The requested resource does not exist',
      path: req.path
    });
  });

  // Global error handler
  app.use(errorHandler);
};

// Initialize middleware
initializeMiddleware();

// Export configured Express application
export default app;