/**
 * Location Controller Implementation
 * Version: 1.0.0
 * 
 * Handles HTTP requests for location management operations with enhanced validation,
 * security, and error handling for restaurant locations.
 */

import { Request, Response } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v7.1.0
import { LocationService } from '../../services/location.service';
import { 
  ILocation, 
  ILocationCreate, 
  ILocationUpdate, 
  LocationStatus 
} from '../../interfaces/location.interface';
import { 
  validateLocationCreate, 
  validateLocationUpdate, 
} from '../../validators/location.validator';
import { 
  sendSuccess, 
  sendError, 
  sendValidationError, 
  sendRateLimitError 
} from '../../utils/response.utils';
import { ERROR_TYPES } from '../../constants/error.constants';
import { SUCCESS_MESSAGES } from '../../constants/messages.constants';
import logger from '../../utils/logger.utils';

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
 * Controller class handling location-related HTTP requests with enhanced
 * validation, security, and error handling capabilities
 */
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Creates a new restaurant location with enhanced validation
   * @param req Express request object
   * @param res Express response object
   */
  public async createLocation(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    logger.info('Creating new location', { correlationId });

    try {
      // Validate request data
      const locationData = await validateLocationCreate(req.body);

      // Check location limit for restaurant
      await this.locationService.validateLocationLimit(locationData.restaurantId);

      // Create location
      const createdLocation = await this.locationService.createLocation(locationData);

      logger.info('Location created successfully', { 
        correlationId, 
        locationId: createdLocation.id 
      });

      sendSuccess(
        res,
        201,
        SUCCESS_MESSAGES.LOCATION.CREATE_SUCCESS,
        createdLocation
      );
    } catch (error) {
      logger.error('Location creation failed', { correlationId, error });
      
      if (error.name === 'ValidationError') {
        sendValidationError(res, error.errors);
      } else {
        sendError(
          res,
          500,
          error.message,
          ERROR_TYPES.SERVER_ERROR,
          [error]
        );
      }
    }
  }

  /**
   * Updates an existing location with validation
   * @param req Express request object
   * @param res Express response object
   */
  public async updateLocation(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    const locationId = req.params.id;

    logger.info('Updating location', { correlationId, locationId });

    try {
      // Validate update data
      const updateData = await validateLocationUpdate(req.body);

      // Update location
      const updatedLocation = await this.locationService.updateLocation(
        locationId,
        updateData
      );

      logger.info('Location updated successfully', { 
        correlationId, 
        locationId 
      });

      sendSuccess(
        res,
        200,
        SUCCESS_MESSAGES.LOCATION.UPDATE_SUCCESS,
        updatedLocation
      );
    } catch (error) {
      logger.error('Location update failed', { correlationId, locationId, error });

      if (error.name === 'ValidationError') {
        sendValidationError(res, error.errors);
      } else {
        sendError(
          res,
          500,
          error.message,
          ERROR_TYPES.SERVER_ERROR,
          [error]
        );
      }
    }
  }

  /**
   * Retrieves a specific location by ID
   * @param req Express request object
   * @param res Express response object
   */
  public async getLocation(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    const locationId = req.params.id;

    logger.info('Retrieving location', { correlationId, locationId });

    try {
      const location = await this.locationService.getLocation(locationId);

      if (!location) {
        sendError(
          res,
          404,
          'Location not found',
          ERROR_TYPES.RESOURCE_ERROR
        );
        return;
      }

      sendSuccess(res, 200, 'Location retrieved successfully', location);
    } catch (error) {
      logger.error('Location retrieval failed', { correlationId, locationId, error });
      
      sendError(
        res,
        500,
        error.message,
        ERROR_TYPES.SERVER_ERROR,
        [error]
      );
    }
  }

  /**
   * Retrieves all locations for a restaurant
   * @param req Express request object
   * @param res Express response object
   */
  public async getRestaurantLocations(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    const restaurantId = req.params.restaurantId;

    logger.info('Retrieving restaurant locations', { 
      correlationId, 
      restaurantId 
    });

    try {
      const locations = await this.locationService.getRestaurantLocations(
        restaurantId
      );

      sendSuccess(
        res,
        200,
        'Restaurant locations retrieved successfully',
        locations
      );
    } catch (error) {
      logger.error('Restaurant locations retrieval failed', { 
        correlationId, 
        restaurantId, 
        error 
      });

      sendError(
        res,
        500,
        error.message,
        ERROR_TYPES.SERVER_ERROR,
        [error]
      );
    }
  }

  /**
   * Deletes a location
   * @param req Express request object
   * @param res Express response object
   */
  public async deleteLocation(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    const locationId = req.params.id;

    logger.info('Deleting location', { correlationId, locationId });

    try {
      await this.locationService.deleteLocation(locationId);

      logger.info('Location deleted successfully', { 
        correlationId, 
        locationId 
      });

      sendSuccess(
        res,
        200,
        SUCCESS_MESSAGES.LOCATION.DELETE_SUCCESS
      );
    } catch (error) {
      logger.error('Location deletion failed', { correlationId, locationId, error });

      sendError(
        res,
        500,
        error.message,
        ERROR_TYPES.SERVER_ERROR,
        [error]
      );
    }
  }
}

// Apply rate limiting to the controller
export const locationController = new LocationController(new LocationService());
export const locationRateLimiter = locationRateLimit;