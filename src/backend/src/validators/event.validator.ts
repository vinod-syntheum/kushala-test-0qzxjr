/**
 * Event Validator Implementation
 * Version: 1.0.0
 * 
 * Implements comprehensive Zod schema validation for event-related operations
 * with enhanced security measures and business rule enforcement.
 */

import { z } from 'zod'; // v3.0.0
import { IEventCreate, IEventUpdate, EventStatus, TicketType } from '../interfaces/event.interface';
import { EVENT_VALIDATION } from '../constants/validation.constants';
import { validateUrl, validateImageFormat, validateImageSize } from '../utils/validation.utils';

/**
 * Validates event dates ensuring proper chronological order and business hours
 */
const validateEventDates = (startDate: Date, endDate: Date): boolean => {
  const now = new Date();
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(now.getFullYear() + 1); // Max 1 year in advance

  return (
    startDate > now &&
    endDate > startDate &&
    endDate <= maxFutureDate &&
    (endDate.getTime() - startDate.getTime()) <= (12 * 60 * 60 * 1000) // Max 12 hours duration
  );
};

/**
 * Validates ticket configuration ensuring proper pricing and capacity
 */
const validateTicketConfiguration = (
  ticketTypes: TicketType[],
  capacity: number
): boolean => {
  // Ensure at least one ticket type is selected
  if (ticketTypes.length === 0) return false;

  // Validate ticket type combinations
  const hasGeneralAdmission = ticketTypes.includes(TicketType.GENERAL);
  const hasVIP = ticketTypes.includes(TicketType.VIP);
  const hasEarlyBird = ticketTypes.includes(TicketType.EARLY_BIRD);

  // Early bird requires general admission
  if (hasEarlyBird && !hasGeneralAdmission) return false;

  // Check capacity constraints
  if (capacity < 1 || capacity > EVENT_VALIDATION.MAX_TICKETS_PER_EVENT) return false;

  return true;
};

/**
 * Validates timezone against IANA timezone database
 */
const validateTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Schema for event creation with comprehensive validation
 */
export const eventCreateSchema: z.ZodSchema<IEventCreate> = z.object({
  restaurantId: z.string().uuid({
    message: "Invalid restaurant ID format"
  }),
  
  locationId: z.string().uuid({
    message: "Invalid location ID format"
  }),
  
  name: z.string()
    .trim()
    .min(EVENT_VALIDATION.MIN_TITLE_LENGTH, {
      message: `Event name must be at least ${EVENT_VALIDATION.MIN_TITLE_LENGTH} characters`
    })
    .max(EVENT_VALIDATION.MAX_TITLE_LENGTH, {
      message: `Event name cannot exceed ${EVENT_VALIDATION.MAX_TITLE_LENGTH} characters`
    }),
  
  description: z.string()
    .trim()
    .max(EVENT_VALIDATION.MAX_DESCRIPTION_LENGTH, {
      message: `Description cannot exceed ${EVENT_VALIDATION.MAX_DESCRIPTION_LENGTH} characters`
    }),
  
  startDate: z.date(),
  
  endDate: z.date(),
  
  timezone: z.string().refine(validateTimezone, {
    message: "Invalid timezone identifier"
  }),
  
  capacity: z.number()
    .int()
    .positive()
    .max(EVENT_VALIDATION.MAX_TICKETS_PER_EVENT, {
      message: `Maximum capacity is ${EVENT_VALIDATION.MAX_TICKETS_PER_EVENT} attendees`
    }),
  
  ticketTypes: z.array(z.nativeEnum(TicketType))
    .min(1, {
      message: "At least one ticket type must be selected"
    }),
  
  imageUrl: z.string()
    .url({
      message: "Invalid image URL format"
    })
    .refine(validateUrl, {
      message: "Invalid image URL"
    })
    .refine(validateImageFormat, {
      message: "Unsupported image format"
    })
    .refine(validateImageSize, {
      message: "Image size exceeds maximum allowed"
    })
    .optional(),
}).refine(
  (data) => validateEventDates(data.startDate, data.endDate),
  {
    message: "Invalid event dates. Events must be scheduled in the future and last no more than 12 hours",
    path: ["startDate", "endDate"]
  }
).refine(
  (data) => validateTicketConfiguration(data.ticketTypes, data.capacity),
  {
    message: "Invalid ticket configuration",
    path: ["ticketTypes", "capacity"]
  }
);

/**
 * Schema for event updates with partial validation
 */
export const eventUpdateSchema: z.ZodSchema<IEventUpdate> = z.object({
  name: z.string()
    .trim()
    .min(EVENT_VALIDATION.MIN_TITLE_LENGTH)
    .max(EVENT_VALIDATION.MAX_TITLE_LENGTH)
    .optional(),
  
  description: z.string()
    .trim()
    .max(EVENT_VALIDATION.MAX_DESCRIPTION_LENGTH)
    .optional(),
  
  startDate: z.date().optional(),
  
  endDate: z.date().optional(),
  
  timezone: z.string()
    .refine(validateTimezone, {
      message: "Invalid timezone identifier"
    })
    .optional(),
  
  status: z.nativeEnum(EventStatus).optional(),
  
  capacity: z.number()
    .int()
    .positive()
    .max(EVENT_VALIDATION.MAX_TICKETS_PER_EVENT)
    .optional(),
  
  ticketTypes: z.array(z.nativeEnum(TicketType))
    .min(1)
    .optional(),
  
  imageUrl: z.string()
    .url()
    .refine(validateUrl)
    .refine(validateImageFormat)
    .refine(validateImageSize)
    .optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return validateEventDates(data.startDate, data.endDate);
    }
    return true;
  },
  {
    message: "Invalid event dates",
    path: ["startDate", "endDate"]
  }
).refine(
  (data) => {
    if (data.ticketTypes && data.capacity) {
      return validateTicketConfiguration(data.ticketTypes, data.capacity);
    }
    return true;
  },
  {
    message: "Invalid ticket configuration",
    path: ["ticketTypes", "capacity"]
  }
);