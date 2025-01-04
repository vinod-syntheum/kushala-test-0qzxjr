/**
 * Event Routes Configuration
 * Version: 1.0.0
 * 
 * Implements secure, rate-limited routes for event lifecycle management
 * with comprehensive middleware chain for authentication, authorization,
 * validation and rate limiting.
 */

import { Router } from 'express'; // v4.18.2
import { EventController } from '../controllers/event.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validation.middleware';
import { eventCreateSchema, eventUpdateSchema } from '../../validators/event.validator';
import { rateLimiter } from '../middlewares/rateLimiter.middleware';
import { UserRole } from '../../interfaces/auth.interface';
import logger from '../../utils/logger.utils';

// Initialize router
const eventRouter = Router();

// Initialize controller
const eventController = new EventController();

/**
 * POST /events
 * Create new event with validation and rate limiting
 */
eventRouter.post('/',
  rateLimiter,
  authenticate,
  authorize(UserRole.OWNER),
  validate(eventCreateSchema),
  async (req, res, next) => {
    try {
      const correlationId = logger.logRequest(req, 'createEvent');
      const event = await eventController.createEvent(req.body, req.params.restaurantId);
      logger.logResponse(res, Date.now() - req.startTime);
      res.status(201).json({ 
        success: true,
        data: event,
        correlationId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /events/:eventId
 * Update existing event with validation
 */
eventRouter.put('/:eventId',
  rateLimiter,
  authenticate,
  authorize(UserRole.OWNER),
  validate(eventUpdateSchema),
  async (req, res, next) => {
    try {
      const correlationId = logger.logRequest(req, 'updateEvent');
      const event = await eventController.updateEvent(req.params.eventId, req.body);
      logger.logResponse(res, Date.now() - req.startTime);
      res.json({ 
        success: true,
        data: event,
        correlationId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /events/:eventId/publish
 * Publish event with owner-only authorization
 */
eventRouter.put('/:eventId/publish',
  rateLimiter,
  authenticate,
  authorize(UserRole.OWNER),
  async (req, res, next) => {
    try {
      const correlationId = logger.logRequest(req, 'publishEvent');
      const event = await eventController.publishEvent(req.params.eventId);
      logger.logResponse(res, Date.now() - req.startTime);
      res.json({ 
        success: true,
        data: event,
        correlationId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /events/:eventId/cancel
 * Cancel event with owner-only authorization
 */
eventRouter.put('/:eventId/cancel',
  rateLimiter,
  authenticate,
  authorize(UserRole.OWNER),
  async (req, res, next) => {
    try {
      const correlationId = logger.logRequest(req, 'cancelEvent');
      const event = await eventController.cancelEvent(req.params.eventId, req.body.reason);
      logger.logResponse(res, Date.now() - req.startTime);
      res.json({ 
        success: true,
        data: event,
        correlationId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /events/:eventId
 * Retrieve event details with authentication
 */
eventRouter.get('/:eventId',
  rateLimiter,
  authenticate,
  async (req, res, next) => {
    try {
      const correlationId = logger.logRequest(req, 'getEventById');
      const event = await eventController.getEventById(req.params.eventId);
      logger.logResponse(res, Date.now() - req.startTime);
      res.json({ 
        success: true,
        data: event,
        correlationId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /events/restaurant/:restaurantId
 * List all events for a restaurant with authentication
 */
eventRouter.get('/restaurant/:restaurantId',
  rateLimiter,
  authenticate,
  async (req, res, next) => {
    try {
      const correlationId = logger.logRequest(req, 'getEventsByRestaurant');
      const events = await eventController.getEventsByRestaurant(
        req.params.restaurantId,
        req.query
      );
      logger.logResponse(res, Date.now() - req.startTime);
      res.json({ 
        success: true,
        data: events,
        correlationId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /events/location/:locationId
 * List all events for a location with authentication
 */
eventRouter.get('/location/:locationId',
  rateLimiter,
  authenticate,
  async (req, res, next) => {
    try {
      const correlationId = logger.logRequest(req, 'getEventsByLocation');
      const events = await eventController.getEventsByLocation(
        req.params.locationId,
        req.query
      );
      logger.logResponse(res, Date.now() - req.startTime);
      res.json({ 
        success: true,
        data: events,
        correlationId
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add request timing middleware
eventRouter.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Add error handling middleware
eventRouter.use((error: Error, req: any, res: any, next: any) => {
  logger.error('Event route error', { 
    error,
    path: req.path,
    method: req.method,
    correlationId: req.correlationId
  });
  res.status(500).json({ 
    success: false,
    error: error.message,
    correlationId: req.correlationId
  });
});

export default eventRouter;