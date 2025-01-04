/**
 * TypeScript type definitions and interfaces for event-related functionality.
 * Provides comprehensive types for event management, ticket configurations, and API responses.
 * @version 1.0.0
 */

import type { Dayjs } from 'dayjs'; // ^1.11.10
import { ApiResponse, PaginatedResponse } from './common';
import { Location } from './location';

/**
 * Enum representing possible states of an event
 */
export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

/**
 * Enum representing available ticket types for events
 */
export enum TicketType {
  GENERAL = 'GENERAL',
  VIP = 'VIP',
  EARLY_BIRD = 'EARLY_BIRD'
}

/**
 * Interface for ticket pricing configuration
 */
interface TicketPricing {
  type: TicketType;
  price: number;
  quantity: number;
  description: string;
  salesStartDate: string;
  salesEndDate: string;
  maxPerOrder: number;
}

/**
 * Main interface for event data in the frontend
 */
export interface Event {
  id: string;
  restaurantId: string;
  locationId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  timezone: string;
  status: EventStatus;
  capacity: number;
  maxTicketsPerPerson: number;
  ticketTypes: TicketType[];
  categories: string[];
  isRefundable: boolean;
  refundCutoffDate: string;
  imageUrl: string;
  location: Location;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for event creation/update form data
 */
export interface EventFormData {
  name: string;
  description: string;
  locationId: string;
  startDate: string | Dayjs;
  endDate: string | Dayjs;
  timezone: string;
  capacity: number;
  maxTicketsPerPerson: number;
  ticketPricing: TicketPricing[];
  categories: string[];
  isRefundable: boolean;
  refundCutoffDate: string | Dayjs;
  imageUrl?: string;
}

/**
 * Interface for comprehensive event statistics with enhanced tracking
 */
export interface EventStats {
  totalTickets: number;
  soldTickets: number;
  availableTickets: number;
  ticketsSoldByType: Record<TicketType, number>;
  refundedTickets: number;
  revenue: number;
  netRevenue: number;
}

/**
 * Interface for event search/filter parameters
 */
export interface EventSearchParams {
  query?: string;
  locationId?: string;
  status?: EventStatus;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  includeCompleted?: boolean;
}

/**
 * Interface for event list item with essential information
 */
export interface EventListItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  location: Pick<Location, 'id' | 'name'>;
  soldTickets: number;
  totalTickets: number;
}

/**
 * Type for single event API response
 */
export type EventResponse = ApiResponse<Event>;

/**
 * Type for paginated event list API response
 */
export type EventListResponse = PaginatedResponse<EventListItem>;

/**
 * Type guard to check if event dates are valid
 */
export function isValidEventDates(startDate: string | Dayjs, endDate: string | Dayjs): boolean {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate.toDate();
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate.toDate();
  return start < end;
}

/**
 * Type guard to check if ticket pricing is valid
 */
export function isValidTicketPricing(pricing: TicketPricing[]): boolean {
  return pricing.every(ticket => 
    ticket.price >= 0 &&
    ticket.quantity > 0 &&
    ticket.maxPerOrder <= ticket.quantity &&
    isValidEventDates(ticket.salesStartDate, ticket.salesEndDate)
  );
}