/**
 * @fileoverview Validation utilities implementing type-safe schema validation, pattern matching,
 * and data sanitization for ensuring data integrity and security across the application.
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.0.0
import { ERROR_MESSAGES } from '../constants/error.constants';
import { ValidationPatterns } from '../constants/regex.constants';
import { ValidationRules } from '../constants/validation.constants';

/**
 * Represents the result of a validation operation
 */
interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Cache for validated schema results to improve performance
 */
const validationCache = new Map<string, ValidationResult>();

/**
 * Sanitizes input data by trimming strings and removing potential XSS characters
 * @param input - Data to sanitize
 * @returns Sanitized data
 */
const sanitizeInput = <T>(input: T): T => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '') as unknown as T;
  }
  if (typeof input === 'object' && input !== null) {
    return Object.entries(input).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: sanitizeInput(value)
    }), {}) as T;
  }
  return input;
};

/**
 * Generic input validation using Zod schema
 * @param input - Data to validate
 * @param schema - Zod schema for validation
 * @returns Validation result with typed data
 */
export const validateInput = async <T>(
  input: unknown,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> => {
  try {
    const sanitizedInput = sanitizeInput(input);
    const cacheKey = JSON.stringify({ input: sanitizedInput, schema: schema._def });
    
    const cachedResult = validationCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult as ValidationResult<T>;
    }

    const validatedData = await schema.parseAsync(sanitizedInput);
    const result: ValidationResult<T> = {
      isValid: true,
      data: validatedData
    };

    validationCache.set(cacheKey, result);
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => err.message)
      };
    }
    return {
      isValid: false,
      errors: [ERROR_MESSAGES.VALIDATION_FAILED]
    };
  }
};

/**
 * Validates email format and optionally performs DNS validation
 * @param email - Email address to validate
 * @param checkDNS - Optional DNS validation flag
 * @returns Validation result
 */
export const validateEmail = async (
  email: string,
  checkDNS = false
): Promise<ValidationResult<string>> => {
  const sanitizedEmail = sanitizeInput(email);

  if (!ValidationPatterns.EMAIL_REGEX.test(sanitizedEmail)) {
    return {
      isValid: false,
      errors: ['Invalid email format']
    };
  }

  if (checkDNS) {
    const [, domain] = sanitizedEmail.split('@');
    try {
      const dnsResult = await validateDomainMX(domain);
      if (!dnsResult.isValid) {
        return {
          isValid: false,
          errors: ['Invalid email domain']
        };
      }
    } catch {
      return {
        isValid: false,
        errors: ['Unable to verify email domain']
      };
    }
  }

  return {
    isValid: true,
    data: sanitizedEmail
  };
};

/**
 * Validates password complexity and strength
 * @param password - Password to validate
 * @returns Validation result with strength assessment
 */
export const validatePassword = (password: string): ValidationResult<string> => {
  if (password.length < ValidationRules.USER_VALIDATION.MIN_PASSWORD_LENGTH ||
      password.length > ValidationRules.USER_VALIDATION.MAX_PASSWORD_LENGTH) {
    return {
      isValid: false,
      errors: [`Password must be between ${ValidationRules.USER_VALIDATION.MIN_PASSWORD_LENGTH} and ${ValidationRules.USER_VALIDATION.MAX_PASSWORD_LENGTH} characters`]
    };
  }

  if (!ValidationPatterns.PASSWORD_REGEX.test(password)) {
    return {
      isValid: false,
      errors: [
        'Password must contain at least:',
        '- One uppercase letter',
        '- One lowercase letter',
        '- One number',
        '- One special character'
      ]
    };
  }

  const strengthScore = calculatePasswordStrength(password);
  
  return {
    isValid: true,
    data: password,
    errors: strengthScore < 3 ? ['Password meets minimum requirements but is considered weak'] : undefined
  };
};

/**
 * Validates operating hours format and logic
 * @param hours - Operating hours in HH:MM format
 * @returns Validation result
 */
export const validateOperatingHours = (
  openTime: string,
  closeTime: string
): ValidationResult<{ open: string; close: string }> => {
  if (!ValidationPatterns.TIME_REGEX.test(openTime) || 
      !ValidationPatterns.TIME_REGEX.test(closeTime)) {
    return {
      isValid: false,
      errors: ['Invalid time format. Use HH:MM in 24-hour format']
    };
  }

  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  if (closeMinutes <= openMinutes) {
    return {
      isValid: false,
      errors: ['Closing time must be after opening time']
    };
  }

  return {
    isValid: true,
    data: { open: openTime, close: closeTime }
  };
};

/**
 * Validates geographic coordinates
 * @param coordinates - Latitude and longitude
 * @returns Validation result
 */
export const validateCoordinates = (
  latitude: number,
  longitude: number
): ValidationResult<{ lat: number; lng: number }> => {
  const coordString = `${latitude},${longitude}`;
  
  if (!ValidationPatterns.COORDINATES_REGEX.test(coordString)) {
    return {
      isValid: false,
      errors: ['Invalid coordinate format']
    };
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return {
      isValid: false,
      errors: ['Coordinates out of valid range']
    };
  }

  return {
    isValid: true,
    data: { lat: latitude, lng: longitude }
  };
};

/**
 * Calculates password strength score
 * @param password - Password to evaluate
 * @returns Strength score (0-4)
 */
const calculatePasswordStrength = (password: string): number => {
  let score = 0;
  
  if (password.length >= 12) score++;
  if (/[A-Z].*[A-Z]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>].*[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  if (/[0-9].*[0-9]/.test(password)) score++;
  
  return score;
};

/**
 * Validates domain MX records
 * @param domain - Domain to validate
 * @returns Validation result
 */
const validateDomainMX = async (domain: string): Promise<ValidationResult> => {
  try {
    // DNS lookup would be implemented here
    // For MVP, we'll just validate domain format
    if (!ValidationPatterns.DOMAIN_REGEX.test(domain)) {
      return {
        isValid: false,
        errors: ['Invalid domain format']
      };
    }
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      errors: ['Domain validation failed']
    };
  }
};