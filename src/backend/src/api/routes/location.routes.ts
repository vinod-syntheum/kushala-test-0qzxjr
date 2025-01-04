/**
 * Location Routes Configuration
 * Version: 1.0.0
 * 
 * Express router configuration for location management endpoints with comprehensive
 * authentication, authorization, and request validation for restaurant locations.
 */

import express, { Router } from 'express'; // v4.18.2
import { LocationController } from '../controllers/location.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validation.middleware';
import { 
  locationCreateSchema, 
  locationUpdateSchema 
} from '../../validators/location.validator';
import { UserRole } from '../../interfaces/auth.interface';
import rateLimit from 'express-rate-limit';

/**
 * Rate limiting configuration for location endpoints
 */
const locationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many location requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Initialize location routes with security middleware and validation
 */
const locationRouter: Router = express.Router();

// Initialize controller
const locationController = new LocationController();

// Apply rate limiting to all location routes
locationRouter.use(locationRateLimit);

// Apply authentication to all routes
locationRouter.use(authenticate);

/**
 * Create new location
 * @route POST /api/locations
 * @security JWT
 * @requires owner role
 */
locationRouter.post(
  '/',
  authorize(UserRole.OWNER),
  validate(locationCreateSchema),
  locationController.createLocation
);

/**
 * Get location by ID
 * @route GET /api/locations/:id
 * @security JWT
 */
locationRouter.get(
  '/:id',
  locationController.getLocation
);

/**
 * Get all locations for a restaurant
 * @route GET /api/locations/restaurant/:restaurantId
 * @security JWT
 */
locationRouter.get(
  '/restaurant/:restaurantId',
  locationController.getRestaurantLocations
);

/**
 * Update location
 * @route PUT /api/locations/:id
 * @security JWT
 * @requires owner role
 */
locationRouter.put(
  '/:id',
  authorize(UserRole.OWNER),
  validate(locationUpdateSchema),
  locationController.updateLocation
);

/**
 * Delete location
 * @route DELETE /api/locations/:id
 * @security JWT
 * @requires owner role
 */
locationRouter.delete(
  '/:id',
  authorize(UserRole.OWNER),
  locationController.deleteLocation
);

// Security headers middleware
locationRouter.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Error handling middleware
locationRouter.use((err, req, res, next) => {
  console.error('Location route error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    requestId: req.headers['x-request-id']
  });
});

export default locationRouter;