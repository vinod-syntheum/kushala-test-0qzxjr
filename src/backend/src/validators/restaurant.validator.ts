/**
 * Restaurant Validator Implementation
 * Version: 1.0.0
 * 
 * Implements comprehensive validation schemas for restaurant-related data using Zod.
 * Ensures data integrity, security, and validation for restaurant operations with
 * detailed error messages and type safety.
 */

import { z } from 'zod'; // v3.0.0
import { 
  IRestaurant, 
  IRestaurantCreate, 
  IRestaurantUpdate, 
  RestaurantStatus 
} from '../interfaces/restaurant.interface';
import { validateDomain } from '../utils/validation.utils';
import { RESTAURANT_VALIDATION } from '../constants/validation.constants';

/**
 * Schema for validating restaurant settings
 * Enforces strict validation for configuration parameters
 */
export const restaurantSettingsSchema = z.object({
  timezone: z.string().min(1, { 
    message: 'Timezone is required' 
  }).regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, {
    message: 'Invalid timezone format. Must be a valid IANA timezone identifier'
  }),

  currency: z.string().length(3, { 
    message: 'Invalid currency code. Must be a 3-letter ISO 4217 code' 
  }).regex(/^[A-Z]{3}$/, {
    message: 'Currency code must be uppercase letters only'
  }),

  enableEvents: z.boolean({
    required_error: 'Event management setting is required',
    invalid_type_error: 'Event management setting must be a boolean'
  }),

  enableOnlinePresence: z.boolean({
    required_error: 'Online presence setting is required',
    invalid_type_error: 'Online presence setting must be a boolean'
  }),

  maxLocations: z.number().int().min(1).max(RESTAURANT_VALIDATION.MAX_LOCATIONS, {
    message: `Maximum locations cannot exceed ${RESTAURANT_VALIDATION.MAX_LOCATIONS}`
  })
}).strict();

/**
 * Schema for validating restaurant creation
 * Implements comprehensive validation for new restaurant entities
 */
export const restaurantCreateSchema = z.object({
  ownerId: z.string().uuid({ 
    message: 'Invalid owner ID format' 
  }),

  name: z.string()
    .min(RESTAURANT_VALIDATION.MIN_NAME_LENGTH, {
      message: `Restaurant name must be at least ${RESTAURANT_VALIDATION.MIN_NAME_LENGTH} characters`
    })
    .max(RESTAURANT_VALIDATION.MAX_NAME_LENGTH, {
      message: `Restaurant name cannot exceed ${RESTAURANT_VALIDATION.MAX_NAME_LENGTH} characters`
    })
    .trim()
    .regex(/^[a-zA-Z0-9\s\-'&]+$/, {
      message: 'Restaurant name can only contain letters, numbers, spaces, hyphens, apostrophes, and ampersands'
    }),

  domain: z.string()
    .refine(validateDomain, {
      message: 'Invalid domain format. Must be a valid domain name'
    })
    .refine(async (domain) => {
      // Additional domain availability check would be implemented here
      return true;
    }, {
      message: 'Domain is not available'
    }),

  settings: restaurantSettingsSchema.strict()
}).strict();

/**
 * Schema for validating restaurant updates
 * Supports partial updates with optional fields
 */
export const restaurantUpdateSchema = z.object({
  name: z.string()
    .min(RESTAURANT_VALIDATION.MIN_NAME_LENGTH, {
      message: `Restaurant name must be at least ${RESTAURANT_VALIDATION.MIN_NAME_LENGTH} characters`
    })
    .max(RESTAURANT_VALIDATION.MAX_NAME_LENGTH, {
      message: `Restaurant name cannot exceed ${RESTAURANT_VALIDATION.MAX_NAME_LENGTH} characters`
    })
    .trim()
    .regex(/^[a-zA-Z0-9\s\-'&]+$/, {
      message: 'Restaurant name can only contain letters, numbers, spaces, hyphens, apostrophes, and ampersands'
    })
    .optional(),

  domain: z.string()
    .refine(validateDomain, {
      message: 'Invalid domain format. Must be a valid domain name'
    })
    .refine(async (domain) => {
      // Additional domain availability check would be implemented here
      return true;
    }, {
      message: 'Domain is not available'
    })
    .optional(),

  status: z.nativeEnum(RestaurantStatus, {
    errorMap: () => ({ 
      message: 'Invalid restaurant status' 
    })
  }).optional(),

  settings: restaurantSettingsSchema.partial().optional()
}).strict();

/**
 * Validates restaurant creation data against the schema
 * @param data Restaurant creation payload
 * @returns Validation result with success status and typed data/errors
 */
export const validateRestaurantCreate = async (
  data: IRestaurantCreate
): Promise<z.SafeParseReturnType<IRestaurantCreate, IRestaurantCreate>> => {
  return restaurantCreateSchema.safeParseAsync(data);
};

/**
 * Validates restaurant update data against the schema
 * @param data Partial restaurant update payload
 * @returns Validation result with success status and typed data/errors
 */
export const validateRestaurantUpdate = async (
  data: Partial<IRestaurantUpdate>
): Promise<z.SafeParseReturnType<Partial<IRestaurantUpdate>, Partial<IRestaurantUpdate>>> => {
  return restaurantUpdateSchema.safeParseAsync(data);
};