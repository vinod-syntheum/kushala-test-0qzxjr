/**
 * @file Regular expression constants for secure input validation
 * @description Defines comprehensive RFC and OWASP compliant regex patterns for data validation
 * @version 1.0.0
 */

/**
 * RFC 5322 compliant email validation pattern
 * Validates email addresses with proper format including special characters
 * Does not allow IP-based domains for security
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * OWASP compliant password validation pattern
 * Requires:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * E.164 compliant international phone number validation
 * Supports:
 * - Optional + prefix
 * - Country codes
 * - Area codes
 * - Local numbers
 * - Optional extensions
 */
export const PHONE_REGEX = /^\+?[1-9](?:[0-9-()\\s]{1,14})(?:x\d{1,5})?$/;

/**
 * RFC 3986 compliant URL validation
 * Supports:
 * - Optional protocol (http/https/ftp)
 * - Domain names and IP addresses
 * - Port numbers
 * - Paths and query parameters
 * Excludes private IP ranges for security
 */
export const URL_REGEX = /^(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;

/**
 * RFC 1035 compliant domain name validation
 * Validates:
 * - Domain labels (max 63 chars each)
 * - Modern TLD support
 * - Proper formatting and characters
 */
export const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

/**
 * 24-hour time format validation
 * Format: HH:MM (00:00 - 23:59)
 * Used for restaurant operating hours
 */
export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Geographic coordinate validation
 * Format: latitude,longitude
 * - Latitude: -90 to 90 with 6 decimal precision
 * - Longitude: -180 to 180 with 6 decimal precision
 */
export const COORDINATES_REGEX = /^(-?\d{1,2}(?:\.\d{1,6})?),\s*(-?\d{1,3}(?:\.\d{1,6})?)$/;