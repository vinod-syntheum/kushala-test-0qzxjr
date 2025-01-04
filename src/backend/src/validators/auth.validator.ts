/**
 * @fileoverview Authentication request validation schemas using Zod
 * Implements comprehensive validation for all authentication-related operations
 * including login, registration, password reset, and token refresh
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.4
import { EMAIL_REGEX, PASSWORD_REGEX } from '../constants/regex.constants';
import { USER_VALIDATION } from '../constants/validation.constants';

const { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } = USER_VALIDATION;

/**
 * Login request validation schema
 * Validates email format and password complexity
 */
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .regex(EMAIL_REGEX, 'Invalid email format')
    .trim(),
  password: z.string()
    .min(1, 'Password is required')
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(MAX_PASSWORD_LENGTH, `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`)
});

/**
 * Registration request validation schema
 * Enforces password complexity requirements and confirmation matching
 */
export const registerSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .regex(EMAIL_REGEX, 'Invalid email format')
    .trim(),
  password: z.string()
    .min(1, 'Password is required')
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(MAX_PASSWORD_LENGTH, `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`)
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  confirmPassword: z.string()
    .min(1, 'Password confirmation is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

/**
 * Refresh token validation schema
 * Ensures refresh token is provided and meets format requirements
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required')
    .trim()
});

/**
 * Password reset request validation schema
 * Validates email format for password reset initiation
 */
export const passwordResetRequestSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .regex(EMAIL_REGEX, 'Invalid email format')
    .trim()
});

/**
 * Password reset confirmation validation schema
 * Validates reset token and new password requirements
 */
export const passwordResetConfirmationSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required')
    .trim(),
  newPassword: z.string()
    .min(1, 'New password is required')
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(MAX_PASSWORD_LENGTH, `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`)
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  confirmNewPassword: z.string()
    .min(1, 'Password confirmation is required')
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"]
});

/**
 * Type definitions for validated request payloads
 */
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmation = z.infer<typeof passwordResetConfirmationSchema>;