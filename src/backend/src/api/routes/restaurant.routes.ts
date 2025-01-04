/**
 * Restaurant Routes Configuration
 * Version: 1.0.0
 * 
 * Implements secure REST endpoints for restaurant management with comprehensive
 * middleware chains, request validation, and standardized error handling.
 */

import express, { Router } from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import cors from 'cors'; // v2.8.5
import { RestaurantController } from '../controllers/restaurant.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validation.middleware';
import { restaurantCreateSchema, restaurantUpdateSchema } from '../../validators/restaurant.validator';
import logger from '../../utils/logger.utils';
import { UserRole } from '../../interfaces/auth.interface';

// Initialize router with strict routing and case sensitivity
const router: Router = express.Router({
  strict: true,
  caseSensitive: true
});

// Initialize restaurant controller
const restaurantController = new RestaurantController();

/**
 * Apply global middleware for all restaurant routes
 */
router.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: true,
  xssFilter: true
}));

router.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

/**
 * Restaurant Routes Implementation
 */

// Create new restaurant
router.post('/',
  authenticate,
  authorize(UserRole.OWNER),
  validate(restaurantCreateSchema),
  async (req, res) => {
    logger.info('Creating new restaurant', { userId: req.user?.id });
    await restaurantController.createRestaurant(req, res);
  }
);

// Get restaurant by ID
router.get('/:id',
  authenticate,
  async (req, res) => {
    logger.info('Fetching restaurant', { restaurantId: req.params.id });
    await restaurantController.getRestaurant(req, res);
  }
);

// Get restaurants by owner
router.get('/owner/:ownerId',
  authenticate,
  authorize(UserRole.OWNER),
  async (req, res) => {
    logger.info('Fetching owner restaurants', { ownerId: req.params.ownerId });
    await restaurantController.getRestaurantsByOwner(req, res);
  }
);

// Update restaurant
router.put('/:id',
  authenticate,
  authorize(UserRole.OWNER),
  validate(restaurantUpdateSchema),
  async (req, res) => {
    logger.info('Updating restaurant', { 
      restaurantId: req.params.id,
      userId: req.user?.id 
    });
    await restaurantController.updateRestaurant(req, res);
  }
);

// Delete restaurant
router.delete('/:id',
  authenticate,
  authorize(UserRole.OWNER),
  async (req, res) => {
    logger.info('Deleting restaurant', { 
      restaurantId: req.params.id,
      userId: req.user?.id 
    });
    await restaurantController.deleteRestaurant(req, res);
  }
);

/**
 * Error handling middleware
 * Must be registered after all routes
 */
router.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Restaurant route error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    correlationId: req.correlationId
  });

  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      correlationId: req.correlationId
    });
  }
  next(err);
});

export default router;