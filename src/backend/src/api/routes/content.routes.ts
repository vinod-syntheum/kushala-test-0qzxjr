/**
 * @fileoverview Express router configuration for website content management endpoints
 * Implements secure, validated, and monitored routes for content operations
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.7.0
import winston from 'winston'; // v3.8.2

import ContentController from '../controllers/content.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validation.middleware';
import { websiteContentSchema } from '../../validators/content.validator';
import { SUCCESS_MESSAGES } from '../../constants/messages.constants';
import { UserRole } from '../../interfaces/auth.interface';

// Configure logger for content operations
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'content-routes' },
  transports: [
    new winston.transports.File({ filename: 'content-operations.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Rate limiting configurations
const getContentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many content requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const mutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  message: 'Too many content modifications, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const publishLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 publish requests per minute
  message: 'Too many publish requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const deleteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 delete requests per minute
  message: 'Too many delete requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Initialize and configure content management routes
 * @returns {Router} Configured Express router
 */
const initializeContentRoutes = (): Router => {
  const router = Router();
  const contentController = ContentController;

  // Log route initialization
  logger.info('Initializing content routes');

  // GET /:restaurantId - Retrieve website content
  router.get(
    '/:restaurantId',
    authenticate,
    authorize(UserRole.OWNER),
    getContentLimiter,
    async (req, res) => {
      logger.info('Content retrieval request', {
        restaurantId: req.params.restaurantId,
        userId: req.user?.userId,
      });
      await contentController.getContent(req, res);
    }
  );

  // POST / - Create new website content
  router.post(
    '/',
    authenticate,
    authorize(UserRole.OWNER),
    validate(websiteContentSchema),
    mutationLimiter,
    async (req, res) => {
      logger.info('Content creation request', {
        userId: req.user?.userId,
        contentType: req.body.type,
      });
      await contentController.createContent(req, res);
    }
  );

  // PUT /:restaurantId - Update website content
  router.put(
    '/:restaurantId',
    authenticate,
    authorize(UserRole.OWNER),
    validate(websiteContentSchema),
    mutationLimiter,
    async (req, res) => {
      logger.info('Content update request', {
        restaurantId: req.params.restaurantId,
        userId: req.user?.userId,
      });
      await contentController.updateContent(req, res);
    }
  );

  // PATCH /:restaurantId/publish - Publish/unpublish content
  router.patch(
    '/:restaurantId/publish',
    authenticate,
    authorize(UserRole.OWNER),
    publishLimiter,
    async (req, res) => {
      logger.info('Content publish request', {
        restaurantId: req.params.restaurantId,
        userId: req.user?.userId,
        publishState: req.body.publish,
      });
      await contentController.publishContent(req, res);
    }
  );

  // DELETE /:restaurantId - Delete website content
  router.delete(
    '/:restaurantId',
    authenticate,
    authorize(UserRole.OWNER),
    deleteLimiter,
    async (req, res) => {
      logger.info('Content deletion request', {
        restaurantId: req.params.restaurantId,
        userId: req.user?.userId,
      });
      await contentController.deleteContent(req, res);
    }
  );

  // GET /:restaurantId/versions - Retrieve content version history
  router.get(
    '/:restaurantId/versions',
    authenticate,
    authorize(UserRole.OWNER),
    getContentLimiter,
    async (req, res) => {
      logger.info('Content versions request', {
        restaurantId: req.params.restaurantId,
        userId: req.user?.userId,
      });
      await contentController.getContentVersion(req, res);
    }
  );

  // Log route initialization completion
  logger.info('Content routes initialized successfully');

  return router;
};

// Create and export the configured router
const contentRouter = initializeContentRoutes();
export default contentRouter;