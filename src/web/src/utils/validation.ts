/**
 * Enterprise-grade validation utilities implementing secure input handling,
 * comprehensive form validation, and data integrity checks.
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import validator from 'validator'; // v13.11.0
import xss from 'xss'; // v1.0.14
import { ValidationError } from '../types/common';
import { LoginCredentials } from '../types/auth';

// Constants for validation rules
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
const DISPOSABLE_EMAIL_DOMAINS = ['tempmail.com', 'throwaway.com'];

// Zod schemas for validation
const emailSchema = z.string().email().refine(
  (email) => !DISPOSABLE_EMAIL_DOMAINS.some(domain => email.toLowerCase().endsWith(domain)),
  { message: 'Disposable email addresses are not allowed', code: 'DISPOSABLE_EMAIL' }
);

const passwordSchema = z.string()
  .min(PASSWORD_MIN_LENGTH, { message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` })
  .max(PASSWORD_MAX_LENGTH, { message: `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters` })
  .regex(PASSWORD_COMPLEXITY_REGEX, {
    message: 'Password must contain uppercase, lowercase, number and special character'
  });

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(2000),
  startDate: z.date().min(new Date()),
  endDate: z.date(),
  price: z.number().min(0),
  capacity: z.number().int().positive(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  })
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"]
});

/**
 * Sanitizes input string to prevent XSS attacks
 * @param input - String to sanitize
 * @returns Sanitized string
 */
const sanitizeInput = (input: string): string => {
  return xss(validator.trim(input), {
    whiteList: {}, // Disable all HTML tags
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
};

/**
 * Calculates password strength score
 * @param password - Password to evaluate
 * @returns Score from 0-100
 */
const calculatePasswordStrength = (password: string): number => {
  let score = 0;
  
  // Length contribution (up to 25 points)
  score += Math.min(25, (password.length / PASSWORD_MAX_LENGTH) * 25);
  
  // Character variety contribution (up to 25 points each)
  if (/[A-Z]/.test(password)) score += 25;
  if (/[a-z]/.test(password)) score += 25;
  if (/[0-9]/.test(password)) score += 25;
  if (/[^A-Za-z0-9]/.test(password)) score += 25;
  
  return Math.min(100, score);
};

/**
 * Enhanced email validation with disposable email check and format validation
 * @param email - Email to validate
 * @returns Array of validation errors
 */
export const validateEmail = (email: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  const sanitizedEmail = sanitizeInput(email);

  try {
    emailSchema.parse(sanitizedEmail);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push({
          field: 'email',
          message: err.message,
          code: err.code || 'INVALID_EMAIL'
        });
      });
    }
  }

  // Additional email validation using validator
  if (!validator.isEmail(sanitizedEmail)) {
    errors.push({
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_FORMAT'
    });
  }

  return errors;
};

/**
 * Enhanced password validation with complexity scoring and security checks
 * @param password - Password to validate
 * @returns Array of validation errors
 */
export const validatePassword = (password: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  try {
    passwordSchema.parse(password);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push({
          field: 'password',
          message: err.message,
          code: err.code || 'INVALID_PASSWORD'
        });
      });
    }
  }

  const strength = calculatePasswordStrength(password);
  if (strength < 70) {
    errors.push({
      field: 'password',
      message: 'Password is too weak',
      code: 'WEAK_PASSWORD'
    });
  }

  return errors;
};

/**
 * Comprehensive login form validation with enhanced security checks
 * @param formData - Login credentials to validate
 * @returns Array of validation errors
 */
export const validateLoginForm = (formData: LoginCredentials): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Validate email
  const emailErrors = validateEmail(formData.email);
  errors.push(...emailErrors);

  // Validate password
  const passwordErrors = validatePassword(formData.password);
  errors.push(...passwordErrors);

  return errors;
};

/**
 * Comprehensive event validation with enhanced date and price validation
 * @param eventData - Event details to validate
 * @returns Array of validation errors
 */
export const validateEventDetails = (eventData: unknown): ValidationError[] => {
  const errors: ValidationError[] = [];

  try {
    const sanitizedData = {
      ...eventData as Record<string, unknown>,
      title: eventData && typeof eventData === 'object' && 'title' in eventData 
        ? sanitizeInput(String(eventData.title))
        : '',
      description: eventData && typeof eventData === 'object' && 'description' in eventData
        ? sanitizeInput(String(eventData.description))
        : ''
    };

    eventSchema.parse(sanitizedData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push({
          field: err.path.join('.'),
          message: err.message,
          code: 'INVALID_EVENT_DATA'
        });
      });
    }
  }

  return errors;
};

// Type guard for validation errors
export const hasValidationErrors = (errors: ValidationError[]): boolean => {
  return errors.length > 0;
};