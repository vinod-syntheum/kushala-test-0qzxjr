/**
 * Ticket Interface Definitions
 * Version: 1.0.0
 * 
 * This module defines TypeScript interfaces for ticket-related data structures,
 * providing comprehensive type definitions for ticket entities with enhanced
 * tracking and management capabilities.
 */

import { User } from './user.interface';

/**
 * Enumeration of available ticket types.
 * Defines the different categories of tickets that can be sold for events.
 */
export enum TicketType {
  GENERAL = 'GENERAL',       // Standard admission ticket
  VIP = 'VIP',              // Premium ticket with additional benefits
  EARLY_BIRD = 'EARLY_BIRD' // Discounted early purchase ticket
}

/**
 * Enumeration of possible ticket statuses.
 * Tracks the lifecycle state of each ticket.
 */
export enum TicketStatus {
  AVAILABLE = 'AVAILABLE',   // Ticket is available for purchase
  RESERVED = 'RESERVED',     // Temporarily held during checkout
  SOLD = 'SOLD',            // Successfully purchased ticket
  CANCELLED = 'CANCELLED',   // Cancelled before use
  REFUNDED = 'REFUNDED'     // Refunded after purchase
}

/**
 * Core ticket entity interface containing complete ticket data.
 * Used for internal operations and database interactions.
 */
export interface ITicket {
  id: string;               // Unique identifier (UUID)
  eventId: string;         // Associated event identifier
  userId: string;          // Ticket owner's user identifier
  type: TicketType;       // Type of ticket
  status: TicketStatus;   // Current ticket status
  price: number;          // Ticket price in cents
  purchaseDate: Date;     // Date of purchase
  paymentId: string;      // Associated payment transaction ID
  createdAt: Date;        // Ticket creation timestamp
  updatedAt: Date;        // Last update timestamp
}

/**
 * Interface for creating new tickets.
 * Used during initial ticket purchase process.
 */
export interface ITicketCreate {
  eventId: string;        // Event identifier
  userId: string;         // Purchasing user's identifier
  type: TicketType;      // Selected ticket type
  price: number;         // Purchase price in cents
}

/**
 * Interface for updating ticket properties.
 * Handles status changes, payment updates, and modifications.
 */
export interface ITicketUpdate {
  status?: TicketStatus;           // Updated ticket status
  paymentId?: string;             // Payment transaction reference
  refundId?: string;              // Refund transaction reference
  cancellationReason?: string;    // Reason for cancellation
  updatedPrice?: number;          // Modified price in cents
}

/**
 * Interface for tracking comprehensive ticket statistics.
 * Provides detailed metrics for event and ticket analysis.
 */
export interface ITicketStats {
  totalTickets: number;           // Total tickets created
  soldTickets: number;           // Number of sold tickets
  availableTickets: number;      // Number of available tickets
  reservedTickets: number;       // Number of reserved tickets
  cancelledTickets: number;      // Number of cancelled tickets
  refundedTickets: number;       // Number of refunded tickets
  revenue: number;               // Total revenue in cents
  averagePrice: number;          // Average ticket price
  refundedAmount: number;        // Total refunded amount
}