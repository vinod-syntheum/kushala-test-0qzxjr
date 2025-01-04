/**
 * Restaurant Controller Implementation
 * Version: 1.0.0
 * 
 * Handles HTTP requests for restaurant-related operations with enhanced security,
 * monitoring, and comprehensive error handling capabilities.
 */

import { Request, Response } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.7.0
import helmet from 'helmet'; // v7.0.0
import { Meter } from '@opentelemetry/api'; // v1.4.0
import { RestaurantService } from '../../services/restaurant.service';
import { IRestaurant } from '../../interfaces/restaurant.interface';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.utils';
import { HTTP_STATUS, ERROR_TYPES, ERROR_MESSAGES } from '../../constants/error.constants';
import Logger from '../../utils/logger.utils';
import { SUCCESS_MESSAGES } from '../../constants/messages.constants';

/**
 * Rate limiting configuration for restaurant endpoints
 */
const rateLimitConfig = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Enhanced controller class for restaurant management with comprehensive
 * security, monitoring, and error handling capabilities
 */
export class RestaurantController {
  private readonly restaurantService: RestaurantService;
  private readonly logger: typeof Logger;
  private readonly meter: Meter;

  constructor(
    restaurantService: RestaurantService,
    logger: typeof Logger,
    meter: Meter
  ) {
    this.restaurantService = restaurantService;
    this.logger = logger;
    this.meter = meter;
    this.initializeMetrics();
  }

  /**
   * Creates a new restaurant with enhanced validation and security
   */
  public createRestaurant = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const correlationId = this.logger.logRequest(req, 'createRestaurant');

    try {
      const restaurantData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
      }

      const restaurant = await this.restaurantService.createRestaurant({
        ...restaurantData,
        ownerId: userId
      });

      this.recordMetric('restaurant_created', 1);
      this.logger.logResponse(res, Date.now() - startTime);

      sendSuccess(
        res,
        HTTP_STATUS.CREATED,
        SUCCESS_MESSAGES.WEBSITE.CONTENT_UPDATE,
        restaurant
      );
    } catch (error) {
      this.handleError(error, res, correlationId);
    }
  };

  /**
   * Retrieves restaurant by ID with security checks
   */
  public getRestaurant = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const correlationId = this.logger.logRequest(req, 'getRestaurant');

    try {
      const { id } = req.params;
      const restaurant = await this.restaurantService.getRestaurantById(id);

      if (!restaurant) {
        throw new Error(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      }

      this.recordMetric('restaurant_retrieved', 1);
      this.logger.logResponse(res, Date.now() - startTime);

      sendSuccess(res, HTTP_STATUS.OK, 'Restaurant retrieved successfully', restaurant);
    } catch (error) {
      this.handleError(error, res, correlationId);
    }
  };

  /**
   * Updates restaurant information with validation
   */
  public updateRestaurant = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const correlationId = this.logger.logRequest(req, 'updateRestaurant');

    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.id;

      const restaurant = await this.restaurantService.getRestaurantById(id);

      if (!restaurant) {
        throw new Error(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      }

      if (restaurant.ownerId !== userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
      }

      const updatedRestaurant = await this.restaurantService.updateRestaurant(
        id,
        updateData
      );

      this.recordMetric('restaurant_updated', 1);
      this.logger.logResponse(res, Date.now() - startTime);

      sendSuccess(
        res,
        HTTP_STATUS.OK,
        SUCCESS_MESSAGES.WEBSITE.CONTENT_UPDATE,
        updatedRestaurant
      );
    } catch (error) {
      this.handleError(error, res, correlationId);
    }
  };

  /**
   * Retrieves restaurants by owner with pagination
   */
  public getRestaurantsByOwner = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const correlationId = this.logger.logRequest(req, 'getRestaurantsByOwner');

    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10 } = req.query;

      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
      }

      const restaurants = await this.restaurantService.getRestaurantsByOwner(
        userId,
        Number(page),
        Number(limit)
      );

      this.recordMetric('restaurants_listed', 1);
      this.logger.logResponse(res, Date.now() - startTime);

      sendSuccess(res, HTTP_STATUS.OK, 'Restaurants retrieved successfully', restaurants);
    } catch (error) {
      this.handleError(error, res, correlationId);
    }
  };

  /**
   * Deletes a restaurant with security checks
   */
  public deleteRestaurant = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const correlationId = this.logger.logRequest(req, 'deleteRestaurant');

    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const restaurant = await this.restaurantService.getRestaurantById(id);

      if (!restaurant) {
        throw new Error(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      }

      if (restaurant.ownerId !== userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
      }

      await this.restaurantService.deleteRestaurant(id);

      this.recordMetric('restaurant_deleted', 1);
      this.logger.logResponse(res, Date.now() - startTime);

      sendSuccess(res, HTTP_STATUS.OK, SUCCESS_MESSAGES.WEBSITE.DELETE_SUCCESS);
    } catch (error) {
      this.handleError(error, res, correlationId);
    }
  };

  /**
   * Initializes OpenTelemetry metrics
   */
  private initializeMetrics(): void {
    this.meter.createCounter('restaurant_operations', {
      description: 'Count of restaurant operations',
    });
  }

  /**
   * Records metric with labels
   */
  private recordMetric(name: string, value: number): void {
    this.meter.createCounter('restaurant_operations').add(value, {
      operation: name,
      status: 'success',
    });
  }

  /**
   * Handles errors with proper logging and response formatting
   */
  private handleError(error: any, res: Response, correlationId: string): void {
    this.logger.logError(error, 'RestaurantController', { correlationId });

    if (error.message === ERROR_MESSAGES.UNAUTHORIZED_ACCESS) {
      sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        error.message,
        ERROR_TYPES.AUTHORIZATION_ERROR
      );
    } else if (error.message === ERROR_MESSAGES.RESOURCE_NOT_FOUND) {
      sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        error.message,
        ERROR_TYPES.RESOURCE_ERROR
      );
    } else if (error.name === 'ValidationError') {
      sendValidationError(res, error.errors);
    } else {
      sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.SERVER_ERROR,
        ERROR_TYPES.SERVER_ERROR
      );
    }
  }
}

// Export singleton instance
export default new RestaurantController(
  new RestaurantService(),
  Logger,
  new MeterProvider().getMeter('restaurant-controller')
);