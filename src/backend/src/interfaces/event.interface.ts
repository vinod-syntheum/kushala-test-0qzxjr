/**
 * Event Interface Definitions
 * Version: 1.0.0
 * 
 * This module defines TypeScript interfaces for event-related data structures,
 * providing comprehensive type definitions for events with support for
 * multi-location management and ticket sales tracking.
 */

import { ILocation } from './location.interface';
import { TicketType } from './ticket.interface';

/**
 * Enumeration of possible event statuses.
 * Tracks the lifecycle state of events.
 */
export enum EventStatus {
  DRAFT = 'DRAFT',           // Event is being created/edited
  PUBLISHED = 'PUBLISHED',   // Event is live and visible
  CANCELLED = 'CANCELLED',   // Event has been cancelled
  COMPLETED = 'COMPLETED'    // Event has finished
}

/**
 * Primary interface representing an event entity.
 * Supports comprehensive event management with location integration
 * and ticket type configuration.
 */
export interface IEvent {
  /** Unique identifier for the event */
  id: string;

  /** Reference to the parent restaurant */
  restaurantId: string;

  /** Reference to the hosting location */
  locationId: string;

  /** Event name/title */
  name: string;

  /** Detailed event description */
  description: string;

  /** Event start date and time */
  startDate: Date;

  /** Event end date and time */
  endDate: Date;

  /** Current event status */
  status: EventStatus;

  /** Maximum number of attendees */
  capacity: number;

  /** Available ticket types for this event */
  ticketTypes: TicketType[];

  /** URL to event promotional image */
  imageUrl: string;

  /** IANA timezone identifier */
  timezone: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Interface for tracking comprehensive event statistics.
 * Provides detailed metrics for ticket sales and revenue analysis.
 */
export interface IEventStats {
  /** Total number of tickets across all types */
  totalTickets: number;

  /** Number of tickets sold */
  soldTickets: number;

  /** Number of tickets still available */
  availableTickets: number;

  /** Total revenue from ticket sales in cents */
  revenue: number;

  /** Breakdown of tickets sold by type */
  ticketsSoldByType: Record<TicketType, number>;

  /** Revenue breakdown by ticket type in cents */
  revenueByType: Record<TicketType, number>;
}