/**
 * User Validator Implementation
 * Version: 1.0.0
 * 
 * Implements comprehensive Zod schema validation for user-related operations
 * with strict type safety, security rules, and detailed error messages.
 */

import { z } from 'zod'; // v3.0.0
import { 
  IUser, 
  IUserCreate, 
  IUserUpdate, 
  IUserProfile 
} from '../interfaces/user.interface';
import { 
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH 
} from '../constants/validation.constants';
import { 
  EMAIL_REGEX, 
  PASSWORD_REGEX 
} from '../constants/regex.constants';

/**
 * Schema for validating new user creation
 * Enforces strict validation rules for all required fields
 */
export const createUserSchema = z.object({
  email: z.string()
    .trim()
    .email('Invalid email format')
    .regex(EMAIL_REGEX, 'Email format not allowed')
    .min(5, 'Email too short')
    .max(255, 'Email too long'),
  password: z.string()
    .min(MIN_PASSWORD_LENGTH, 'Password too short')
    .max(MAX_PASSWORD_LENGTH, 'Password too long')
    .regex(PASSWORD_REGEX, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  firstName: z.string()
    .trim()
    .min(MIN_NAME_LENGTH, 'First name too short')
    .max(MAX_NAME_LENGTH, 'First name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'First name contains invalid characters'),
  lastName: z.string()
    .trim()
    .min(MIN_NAME_LENGTH, 'Last name too short')
    .max(MAX_NAME_LENGTH, 'Last name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters'),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF'], {
    errorMap: () => ({ message: 'Invalid role' })
  })
}).strict();

/**
 * Schema for validating user updates
 * Allows partial updates with optional fields
 */
export const updateUserSchema = z.object({
  firstName: z.string()
    .trim()
    .min(MIN_NAME_LENGTH, 'First name too short')
    .max(MAX_NAME_LENGTH, 'First name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'First name contains invalid characters')
    .optional(),
  lastName: z.string()
    .trim()
    .min(MIN_NAME_LENGTH, 'Last name too short')
    .max(MAX_NAME_LENGTH, 'Last name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters')
    .optional(),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF'], {
    errorMap: () => ({ message: 'Invalid role' })
  }).optional()
}).strict()
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  });

/**
 * Schema for validating user profile data
 * Includes read-only fields and UUID validation
 */
export const userProfileSchema = z.object({
  id: z.string()
    .uuid('Invalid user ID'),
  email: z.string()
    .email('Invalid email format')
    .regex(EMAIL_REGEX, 'Email format not allowed'),
  firstName: z.string()
    .min(MIN_NAME_LENGTH, 'First name too short')
    .max(MAX_NAME_LENGTH, 'First name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'First name contains invalid characters'),
  lastName: z.string()
    .min(MIN_NAME_LENGTH, 'Last name too short')
    .max(MAX_NAME_LENGTH, 'Last name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters'),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF'], {
    errorMap: () => ({ message: 'Invalid role' })
  })
}).strict();

/**
 * Validates user creation data with detailed error handling
 * @param data User creation data to validate
 * @returns Validation result with type-safe data or errors
 */
export const validateUserCreate = async (
  data: IUserCreate
): Promise<z.SafeParseReturnType<IUserCreate, IUserCreate>> => {
  return createUserSchema.safeParseAsync(data);
};

/**
 * Validates partial user updates with refinement checks
 * @param data Partial user update data to validate
 * @returns Validation result with type-safe data or errors
 */
export const validateUserUpdate = async (
  data: Partial<IUserUpdate>
): Promise<z.SafeParseReturnType<Partial<IUserUpdate>, Partial<IUserUpdate>>> => {
  return updateUserSchema.safeParseAsync(data);
};

/**
 * Validates user profile data with UUID and role validation
 * @param data User profile data to validate
 * @returns Validation result with type-safe data or errors
 */
export const validateUserProfile = async (
  data: IUserProfile
): Promise<z.SafeParseReturnType<IUserProfile, IUserProfile>> => {
  return userProfileSchema.safeParseAsync(data);
};