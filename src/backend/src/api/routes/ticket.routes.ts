/**
 * @fileoverview Express router configuration for ticket-related endpoints
 * Implements secure, performant, and monitored routes for ticket management
 * @version 1.0.0
 */

import express, { Router } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.7.0
import winston from 'winston'; // v3.8.2
import { TicketController } from '../controllers/ticket.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validation.middleware';
import { 
  createTicketSchema, 
  updateTicketSchema, 
  ticketStatusSchema, 
  bulkTicketSchema 
} from '../../validators/ticket.validator';
import { UserRole } from '../../interfaces/auth.interface';
import { SUCCESS_MESSAGES } from '../../constants/messages.constants';

// Configure logger for ticket operations
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ticket-routes' },
  transports: [
    new winston.transports.File({ filename: 'logs/ticket-operations.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Configure rate limiters
const purchaseRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 purchases per window
  message: 'Too many ticket purchases, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const ticketRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  message: 'Too many ticket operations, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Configures and returns the ticket management router
 * @returns {Router} Configured Express router
 */
const configureTicketRoutes = (): Router => {
  const router = express.Router();
  const ticketController = new TicketController();

  // Create new ticket(s)
  router.post('/tickets',
    authenticate,
    authorize(UserRole.MANAGER),
    validate(createTicketSchema),
    async (req, res) => {
      logger.info('Creating new ticket', { userId: req.user?.userId });
      const ticket = await ticketController.createTicket(req.body);
      res.status(201).json({
        message: SUCCESS_MESSAGES.TICKET.PURCHASE_SUCCESS,
        data: ticket
      });
    }
  );

  // Purchase ticket
  router.post('/tickets/:ticketId/purchase',
    authenticate,
    purchaseRateLimit,
    validate(updateTicketSchema),
    async (req, res) => {
      logger.info('Processing ticket purchase', { 
        ticketId: req.params.ticketId,
        userId: req.user?.userId 
      });
      const ticket = await ticketController.purchaseTicket(
        req.params.ticketId,
        req.user?.userId
      );
      res.json({
        message: SUCCESS_MESSAGES.TICKET.PURCHASE_SUCCESS,
        data: ticket
      });
    }
  );

  // Confirm ticket purchase
  router.post('/tickets/confirm-purchase',
    authenticate,
    validate(updateTicketSchema),
    async (req, res) => {
      logger.info('Confirming ticket purchase', { 
        paymentId: req.body.paymentId,
        userId: req.user?.userId 
      });
      const ticket = await ticketController.confirmPurchase(
        req.body.ticketId,
        req.body.paymentId
      );
      res.json({
        message: SUCCESS_MESSAGES.TICKET.PURCHASE_SUCCESS,
        data: ticket
      });
    }
  );

  // Cancel ticket
  router.delete('/tickets/:ticketId',
    authenticate,
    authorize(UserRole.MANAGER),
    validate(ticketStatusSchema),
    async (req, res) => {
      logger.info('Cancelling ticket', { 
        ticketId: req.params.ticketId,
        userId: req.user?.userId 
      });
      await ticketController.cancelTicket(req.params.ticketId);
      res.json({
        message: SUCCESS_MESSAGES.TICKET.REFUND_SUCCESS
      });
    }
  );

  // Get ticket by ID
  router.get('/tickets/:ticketId',
    authenticate,
    ticketRateLimit,
    async (req, res) => {
      logger.info('Retrieving ticket', { ticketId: req.params.ticketId });
      const ticket = await ticketController.getTicketById(req.params.ticketId);
      res.json({ data: ticket });
    }
  );

  // Get tickets by event
  router.get('/tickets/event/:eventId',
    authenticate,
    ticketRateLimit,
    async (req, res) => {
      logger.info('Retrieving event tickets', { eventId: req.params.eventId });
      const tickets = await ticketController.getTicketsByEvent(req.params.eventId);
      res.json({ data: tickets });
    }
  );

  // Get ticket statistics
  router.get('/tickets/event/:eventId/stats',
    authenticate,
    authorize(UserRole.MANAGER),
    ticketRateLimit,
    async (req, res) => {
      logger.info('Retrieving ticket statistics', { eventId: req.params.eventId });
      const stats = await ticketController.getTicketStats(req.params.eventId);
      res.json({ data: stats });
    }
  );

  return router;
};

// Export configured router
export const ticketRouter = configureTicketRoutes();