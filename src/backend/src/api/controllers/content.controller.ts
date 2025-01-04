/**
 * @fileoverview Content controller implementing website content management operations
 * with comprehensive security, validation, and monitoring capabilities.
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // v4.18.2
import * as Sentry from '@sentry/node'; // v7.x
import * as newrelic from 'newrelic'; // v10.x
import { StatusCodes } from 'http-status-codes'; // v2.x
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.x

import ContentService from '../../services/content.service';
import { IWebsiteContent } from '../../interfaces/content.interface';
import { validateInput } from '../../utils/validation.utils';
import { websiteContentSchema } from '../../validators/content.validator';
import { ERROR_MESSAGES, ERROR_TYPES } from '../../constants/error.constants';

/**
 * Rate limiter configuration for content operations
 */
const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per minute
  blockDuration: 300 // 5 minutes block duration
});

/**
 * Controller class handling website content management operations
 * Implements comprehensive validation, security, and monitoring
 */
export class ContentController {
  private readonly contentService: typeof ContentService;
  private readonly CACHE_CONTROL = 'public, max-age=300'; // 5 minutes cache

  constructor() {
    this.contentService = ContentService;
  }

  /**
   * Retrieves website content for a restaurant with caching
   * @param req Express request object
   * @param res Express response object
   */
  public getContent = async (req: Request, res: Response): Promise<void> => {
    const transaction = newrelic.startSegment('getContent');
    try {
      // Rate limiting check
      await rateLimiter.consume(req.ip);

      const { restaurantId } = req.params;
      
      // Input validation
      if (!restaurantId) {
        res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          error: ERROR_MESSAGES.VALIDATION_FAILED,
          details: 'Restaurant ID is required'
        });
        return;
      }

      // Retrieve content
      const content = await this.contentService.getContentByRestaurantId(restaurantId);
      
      // Set cache headers
      res.setHeader('Cache-Control', this.CACHE_CONTROL);
      
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: content
      });
    } catch (error) {
      this.handleError(error, req, res);
    } finally {
      transaction.end();
    }
  };

  /**
   * Creates new website content with validation
   * @param req Express request object
   * @param res Express response object
   */
  public createContent = async (req: Request, res: Response): Promise<void> => {
    const transaction = newrelic.startSegment('createContent');
    try {
      // Rate limiting check
      await rateLimiter.consume(req.ip);

      // Validate request body size
      const contentSize = JSON.stringify(req.body).length;
      if (contentSize > 5242880) { // 5MB limit
        res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          error: ERROR_MESSAGES.VALIDATION_FAILED,
          details: 'Request body too large'
        });
        return;
      }

      // Validate content structure
      const validationResult = await validateInput<IWebsiteContent>(
        req.body,
        websiteContentSchema
      );

      if (!validationResult.isValid) {
        res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
          status: StatusCodes.UNPROCESSABLE_ENTITY,
          error: ERROR_MESSAGES.VALIDATION_FAILED,
          details: validationResult.errors
        });
        return;
      }

      // Create content
      const content = await this.contentService.createContent(validationResult.data!);

      res.status(StatusCodes.CREATED).json({
        status: StatusCodes.CREATED,
        data: content
      });
    } catch (error) {
      this.handleError(error, req, res);
    } finally {
      transaction.end();
    }
  };

  /**
   * Updates existing website content with version tracking
   * @param req Express request object
   * @param res Express response object
   */
  public updateContent = async (req: Request, res: Response): Promise<void> => {
    const transaction = newrelic.startSegment('updateContent');
    try {
      // Rate limiting check
      await rateLimiter.consume(req.ip);

      const { restaurantId } = req.params;
      
      // Validate request body
      const validationResult = await validateInput<Partial<IWebsiteContent>>(
        req.body,
        websiteContentSchema.partial()
      );

      if (!validationResult.isValid) {
        res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
          status: StatusCodes.UNPROCESSABLE_ENTITY,
          error: ERROR_MESSAGES.VALIDATION_FAILED,
          details: validationResult.errors
        });
        return;
      }

      // Update content
      const content = await this.contentService.updateContent(
        restaurantId,
        validationResult.data!
      );

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: content
      });
    } catch (error) {
      this.handleError(error, req, res);
    } finally {
      transaction.end();
    }
  };

  /**
   * Publishes or unpublishes website content
   * @param req Express request object
   * @param res Express response object
   */
  public publishContent = async (req: Request, res: Response): Promise<void> => {
    const transaction = newrelic.startSegment('publishContent');
    try {
      // Rate limiting check
      await rateLimiter.consume(req.ip);

      const { restaurantId } = req.params;
      const { publish } = req.body;

      if (typeof publish !== 'boolean') {
        res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          error: ERROR_MESSAGES.VALIDATION_FAILED,
          details: 'Publish flag must be a boolean'
        });
        return;
      }

      const content = await this.contentService.publishContent(restaurantId, publish);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: content
      });
    } catch (error) {
      this.handleError(error, req, res);
    } finally {
      transaction.end();
    }
  };

  /**
   * Retrieves specific version of website content
   * @param req Express request object
   * @param res Express response object
   */
  public getContentVersion = async (req: Request, res: Response): Promise<void> => {
    const transaction = newrelic.startSegment('getContentVersion');
    try {
      // Rate limiting check
      await rateLimiter.consume(req.ip);

      const { restaurantId, version } = req.params;
      const versionNumber = parseInt(version, 10);

      if (isNaN(versionNumber) || versionNumber < 1) {
        res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          error: ERROR_MESSAGES.VALIDATION_FAILED,
          details: 'Invalid version number'
        });
        return;
      }

      const content = await this.contentService.getContentVersion(restaurantId, versionNumber);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: content
      });
    } catch (error) {
      this.handleError(error, req, res);
    } finally {
      transaction.end();
    }
  };

  /**
   * Standardized error handling with monitoring
   * @private
   */
  private handleError(error: unknown, req: Request, res: Response): void {
    // Log error to monitoring services
    Sentry.captureException(error);
    newrelic.noticeError(error);

    console.error('Content Controller Error:', error);

    if (error instanceof Error) {
      switch (error.message) {
        case ERROR_MESSAGES.RESOURCE_NOT_FOUND:
          res.status(StatusCodes.NOT_FOUND).json({
            status: StatusCodes.NOT_FOUND,
            error: ERROR_TYPES.RESOURCE_ERROR,
            message: error.message
          });
          break;

        case ERROR_MESSAGES.VALIDATION_FAILED:
          res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
            status: StatusCodes.UNPROCESSABLE_ENTITY,
            error: ERROR_TYPES.VALIDATION_ERROR,
            message: error.message
          });
          break;

        default:
          res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            error: ERROR_TYPES.SERVER_ERROR,
            message: ERROR_MESSAGES.SERVER_ERROR
          });
      }
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        error: ERROR_TYPES.SERVER_ERROR,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
}

export default new ContentController();