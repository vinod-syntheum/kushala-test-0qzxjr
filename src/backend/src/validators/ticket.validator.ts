/**
 * Ticket Validator Module
 * Version: 1.0.0
 * 
 * Implements comprehensive Zod schema validation for ticket-related operations
 * including creation, updates, and status changes. Ensures data integrity and
 * type safety with detailed error handling.
 */

import { z } from 'zod'; // v3.0.0
import { TicketType, TicketStatus } from '../interfaces/ticket.interface';
import { EVENT_VALIDATION } from '../constants/validation.constants';

/**
 * Schema for validating ticket creation requests.
 * Enforces strict type checking and business rules for new tickets.
 */
export const createTicketSchema = z.object({
  eventId: z.string().uuid({
    message: 'Event ID must be a valid UUID'
  }),
  userId: z.string().uuid({
    message: 'User ID must be a valid UUID'
  }),
  type: z.nativeEnum(TicketType, {
    errorMap: () => ({
      message: 'Invalid ticket type. Must be one of: GENERAL, VIP, or EARLY_BIRD'
    })
  }),
  price: z.number()
    .int({
      message: 'Price must be an integer value in cents'
    })
    .min(EVENT_VALIDATION.MIN_TICKET_PRICE, {
      message: `Ticket price must be at least ${EVENT_VALIDATION.MIN_TICKET_PRICE} cents`
    })
    .max(EVENT_VALIDATION.MAX_TICKET_PRICE, {
      message: `Ticket price cannot exceed ${EVENT_VALIDATION.MAX_TICKET_PRICE} cents`
    })
}).strict({
  message: 'Additional properties are not allowed on ticket creation'
});

/**
 * Schema for validating ticket updates.
 * Handles status changes and payment information updates.
 */
export const updateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus, {
    errorMap: () => ({
      message: 'Invalid ticket status. Must be one of: AVAILABLE, RESERVED, SOLD, CANCELLED, or REFUNDED'
    })
  }),
  paymentId: z.string()
    .uuid({
      message: 'Payment ID must be a valid UUID'
    })
    .optional(),
  refundId: z.string()
    .uuid({
      message: 'Refund ID must be a valid UUID'
    })
    .optional(),
  cancellationReason: z.string()
    .min(10, {
      message: 'Cancellation reason must be at least 10 characters long'
    })
    .max(500, {
      message: 'Cancellation reason cannot exceed 500 characters'
    })
    .optional(),
  updatedPrice: z.number()
    .int({
      message: 'Updated price must be an integer value in cents'
    })
    .min(EVENT_VALIDATION.MIN_TICKET_PRICE, {
      message: `Updated price must be at least ${EVENT_VALIDATION.MIN_TICKET_PRICE} cents`
    })
    .max(EVENT_VALIDATION.MAX_TICKET_PRICE, {
      message: `Updated price cannot exceed ${EVENT_VALIDATION.MAX_TICKET_PRICE} cents`
    })
    .optional()
}).strict({
  message: 'Additional properties are not allowed on ticket updates'
}).refine(
  (data) => {
    // Require paymentId when status is SOLD
    if (data.status === TicketStatus.SOLD && !data.paymentId) {
      return false;
    }
    // Require refundId when status is REFUNDED
    if (data.status === TicketStatus.REFUNDED && !data.refundId) {
      return false;
    }
    // Require cancellationReason when status is CANCELLED
    if (data.status === TicketStatus.CANCELLED && !data.cancellationReason) {
      return false;
    }
    return true;
  },
  {
    message: 'Missing required fields for the specified status change',
    path: ['status']
  }
);

/**
 * Schema for validating ticket status changes.
 * Ensures valid status transitions with enum validation.
 */
export const ticketStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus, {
    errorMap: () => ({
      message: 'Invalid ticket status. Must be one of: AVAILABLE, RESERVED, SOLD, CANCELLED, or REFUNDED'
    })
  })
}).strict({
  message: 'Additional properties are not allowed for status updates'
});

/**
 * Schema for validating bulk ticket operations.
 * Ensures array of ticket IDs are valid UUIDs.
 */
export const bulkTicketSchema = z.object({
  ticketIds: z.array(
    z.string().uuid({
      message: 'Each ticket ID must be a valid UUID'
    })
  )
  .min(1, {
    message: 'At least one ticket ID is required'
  })
  .max(100, {
    message: 'Cannot process more than 100 tickets at once'
  })
}).strict({
  message: 'Additional properties are not allowed for bulk operations'
});