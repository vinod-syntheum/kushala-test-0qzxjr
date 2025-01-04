/**
 * @fileoverview Location validation schemas using Zod
 * Implements comprehensive validation for location-related data structures
 * with support for multiple time slots, map integration, and timezone validation
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import { 
  ILocation, 
  ILocationCreate, 
  ILocationUpdate, 
  LocationStatus 
} from '../interfaces/location.interface';
import { 
  MIN_ADDRESS_LENGTH, 
  MAX_ADDRESS_LENGTH,
  MIN_PHONE_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_LOCATIONS,
  MAX_TIME_SLOTS
} from '../constants/validation.constants';
import {
  PHONE_REGEX,
  EMAIL_REGEX,
  TIME_REGEX,
  COORDINATES_REGEX,
  TIMEZONE_REGEX
} from '../constants/regex.constants';

/**
 * Validates time range format with support for closed status and notes
 */
export const timeRangeSchema = z.object({
  open: z.string().regex(TIME_REGEX, 'Invalid time format. Use HH:MM in 24-hour format'),
  close: z.string().regex(TIME_REGEX, 'Invalid time format. Use HH:MM in 24-hour format'),
  isClosed: z.boolean().optional().default(false),
  note: z.string().optional()
}).refine(
  (data) => {
    if (data.isClosed) return true;
    const [openHour, openMin] = data.open.split(':').map(Number);
    const [closeHour, closeMin] = data.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    return closeTime > openTime;
  },
  { message: 'Closing time must be after opening time' }
);

/**
 * Validates operating hours with support for multiple time slots and special schedules
 */
export const operatingHoursSchema = z.object({
  monday: z.array(timeRangeSchema).max(MAX_TIME_SLOTS),
  tuesday: z.array(timeRangeSchema).max(MAX_TIME_SLOTS),
  wednesday: z.array(timeRangeSchema).max(MAX_TIME_SLOTS),
  thursday: z.array(timeRangeSchema).max(MAX_TIME_SLOTS),
  friday: z.array(timeRangeSchema).max(MAX_TIME_SLOTS),
  saturday: z.array(timeRangeSchema).max(MAX_TIME_SLOTS),
  sunday: z.array(timeRangeSchema).max(MAX_TIME_SLOTS),
  holidays: z.record(z.array(timeRangeSchema)).optional(),
  seasonal: z.record(z.array(timeRangeSchema)).optional()
}).refine(
  (data) => {
    // Ensure at least one time slot per day unless marked as closed
    return Object.values(data).every(slots => 
      Array.isArray(slots) && (slots.length > 0 || slots.some(s => s.isClosed))
    );
  },
  { message: 'Each day must have at least one time slot or be marked as closed' }
);

/**
 * Validates enhanced address structure with unit numbers and formatting
 */
export const addressSchema = z.object({
  street: z.string()
    .min(MIN_ADDRESS_LENGTH, `Street address must be at least ${MIN_ADDRESS_LENGTH} characters`)
    .max(MAX_ADDRESS_LENGTH, `Street address cannot exceed ${MAX_ADDRESS_LENGTH} characters`),
  unit: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  formatted: z.string().optional()
});

/**
 * Validates location creation with enhanced fields and map integration
 */
export const locationCreateSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  name: z.string().min(1, 'Location name is required'),
  address: addressSchema,
  coordinates: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90)
    ])
  }),
  operatingHours: operatingHoursSchema,
  phone: z.string()
    .min(MIN_PHONE_LENGTH, `Phone number must be at least ${MIN_PHONE_LENGTH} characters`)
    .max(MAX_PHONE_LENGTH, `Phone number cannot exceed ${MAX_PHONE_LENGTH} characters`)
    .regex(PHONE_REGEX, 'Invalid phone number format'),
  email: z.string().regex(EMAIL_REGEX, 'Invalid email format'),
  status: z.nativeEnum(LocationStatus),
  isPrimary: z.boolean(),
  timezone: z.string().regex(TIMEZONE_REGEX, 'Invalid timezone format'),
  features: z.array(z.string()).optional()
});

/**
 * Validates location updates with partial field support
 */
export const locationUpdateSchema = locationCreateSchema.partial().omit({
  restaurantId: true
});

/**
 * Validates location creation data with enhanced validation rules
 * @param data - Location creation data to validate
 * @returns Promise<ILocationCreate> - Validated location data
 * @throws ZodError if validation fails
 */
export const validateLocationCreate = async (data: unknown): Promise<ILocationCreate> => {
  const validatedData = await locationCreateSchema.parseAsync(data);
  return validatedData;
};

/**
 * Validates location update data with partial field support
 * @param data - Location update data to validate
 * @returns Promise<ILocationUpdate> - Validated location update data
 * @throws ZodError if validation fails
 */
export const validateLocationUpdate = async (data: unknown): Promise<ILocationUpdate> => {
  const validatedData = await locationUpdateSchema.parseAsync(data);
  return validatedData;
};