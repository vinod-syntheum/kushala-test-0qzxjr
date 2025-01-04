/**
 * @fileoverview Validation constants used throughout the application for input validation,
 * data constraints, and form validation. These constants ensure consistent validation
 * across user inputs, API requests, and data processing while implementing security best practices.
 */

/**
 * User validation constants for credentials and personal information
 * Implements security best practices for password strength and input validation
 */
export const USER_VALIDATION = {
  /** Minimum password length - security best practice for strong passwords */
  MIN_PASSWORD_LENGTH: 8,
  /** Maximum password length to prevent excessive storage and DOS attacks */
  MAX_PASSWORD_LENGTH: 64,
  /** Minimum name length for user profiles */
  MIN_NAME_LENGTH: 2,
  /** Maximum name length for user profiles */
  MAX_NAME_LENGTH: 50,
  /** RFC 5322 compliant email validation pattern */
  EMAIL_PATTERN: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  /** Strong password pattern requiring uppercase, lowercase, number, and special character */
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
} as const;

/**
 * Restaurant validation constants for profile and configuration data
 * Ensures consistent data quality across restaurant profiles
 */
export const RESTAURANT_VALIDATION = {
  /** Minimum restaurant name length */
  MIN_NAME_LENGTH: 2,
  /** Maximum restaurant name length */
  MAX_NAME_LENGTH: 100,
  /** Maximum restaurant description length */
  MAX_DESCRIPTION_LENGTH: 1000,
  /** Maximum number of locations per restaurant */
  MAX_LOCATIONS: 3,
  /** Domain name validation pattern following RFC 1035 */
  DOMAIN_PATTERN: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
} as const;

/**
 * Event validation constants for event management and ticket sales
 * Defines boundaries for event creation and ticket pricing
 */
export const EVENT_VALIDATION = {
  /** Minimum event title length */
  MIN_TITLE_LENGTH: 5,
  /** Maximum event title length */
  MAX_TITLE_LENGTH: 100,
  /** Maximum event description length */
  MAX_DESCRIPTION_LENGTH: 2000,
  /** Minimum ticket price in currency units */
  MIN_TICKET_PRICE: 0,
  /** Maximum ticket price in currency units */
  MAX_TICKET_PRICE: 10000,
  /** Maximum number of tickets per event */
  MAX_TICKETS_PER_EVENT: 1000
} as const;

/**
 * Location validation constants for address and contact information
 * Ensures standardized location data across the platform
 */
export const LOCATION_VALIDATION = {
  /** Minimum address length */
  MIN_ADDRESS_LENGTH: 10,
  /** Maximum address length */
  MAX_ADDRESS_LENGTH: 200,
  /** Minimum phone number length */
  MIN_PHONE_LENGTH: 10,
  /** Maximum phone number length */
  MAX_PHONE_LENGTH: 15,
  /** E.164 compliant phone number validation pattern */
  PHONE_PATTERN: /^\+?[1-9]\d{1,14}$/,
  /** Geographic coordinates validation pattern (lat/long) */
  COORDINATES_PATTERN: /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,6}/,
  /** IANA timezone identifier pattern */
  TIMEZONE_PATTERN: /^[A-Za-z_]+\/[A-Za-z_]+$/
} as const;