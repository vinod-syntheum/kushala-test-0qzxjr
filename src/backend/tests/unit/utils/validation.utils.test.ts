/**
 * @fileoverview Comprehensive test suite for validation utilities
 * @version 1.0.0
 */

import {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateUrl,
  validateDomain,
  validateTimeFormat,
  validateCoordinates
} from '../../src/utils/validation.utils';

import {
  EMAIL_REGEX,
  PASSWORD_REGEX,
  PHONE_REGEX,
  URL_REGEX,
  DOMAIN_REGEX,
  TIME_REGEX,
  COORDINATES_REGEX
} from '../../src/constants/regex.constants';

describe('Validation Utilities', () => {
  describe('Email Validation', () => {
    const validEmails = [
      'user@domain.com',
      'user.name@domain.com',
      'user+tag@domain.com',
      'user123@sub.domain.com',
      'user@domain.co.uk'
    ];

    const invalidEmails = [
      '',                              // Empty string
      'invalid.email',                 // Missing @
      '@domain.com',                   // Missing local part
      'user@',                         // Missing domain
      'user@domain',                   // Missing TLD
      'user@@domain.com',              // Multiple @
      'user@domain..com',              // Consecutive dots
      'user@-domain.com',              // Domain starts with hyphen
      'user@domain-.com',              // Domain ends with hyphen
      'a'.repeat(65) + '@domain.com',  // Local part too long
      'user@' + 'a'.repeat(256)        // Domain too long
    ];

    test.each(validEmails)('should validate correct email format: %s', async (email) => {
      const result = await validateEmail(email);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(email.trim());
    });

    test.each(invalidEmails)('should reject invalid email format: %s', async (email) => {
      const result = await validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    test('should handle DNS validation when enabled', async () => {
      const result = await validateEmail('user@example.com', true);
      expect(result.isValid).toBeDefined();
    });

    test('should sanitize email input', async () => {
      const result = await validateEmail('  user@domain.com  ');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('user@domain.com');
    });
  });

  describe('Password Validation', () => {
    const validPasswords = [
      'Password123!',
      'Complex@Pass1word',
      'Sup3r$ecure2023',
      'P@ssw0rd' + 'a'.repeat(56),  // Max length
      'Ab1!defgh'                    // Min length
    ];

    const invalidPasswords = [
      '',                     // Empty string
      'short1!',             // Too short
      'a'.repeat(65),        // Too long
      'password123!',        // No uppercase
      'PASSWORD123!',        // No lowercase
      'Password!!!!',        // No numbers
      'Password123',         // No special chars
      'Pass word1!',         // Contains space
      '12345678!',           // No letters
      'aaaaaaA1!'           // Repeated chars
    ];

    test.each(validPasswords)('should validate correct password format: %s', (password) => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(password);
    });

    test.each(invalidPasswords)('should reject invalid password format: %s', (password) => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should check password strength', () => {
      const weakPassword = validatePassword('Password1!');
      expect(weakPassword.errors).toContain('Password meets minimum requirements but is considered weak');

      const strongPassword = validatePassword('Str0ng!P@ssw0rd2023');
      expect(strongPassword.errors).toBeUndefined();
    });
  });

  describe('Time Format Validation', () => {
    const validTimes = [
      '00:00',
      '23:59',
      '09:30',
      '14:45',
      '19:15'
    ];

    const invalidTimes = [
      '',           // Empty string
      '24:00',      // Hour too high
      '23:60',      // Minute too high
      '9:30',       // Missing leading zero
      '09:3',       // Invalid minute format
      '09:300',     // Too many digits
      '09-30',      // Wrong separator
      'invalid',    // Invalid format
      '99:99'      // Out of range
    ];

    test.each(validTimes)('should validate correct time format: %s', (time) => {
      expect(TIME_REGEX.test(time)).toBe(true);
    });

    test.each(invalidTimes)('should reject invalid time format: %s', (time) => {
      expect(TIME_REGEX.test(time)).toBe(false);
    });
  });

  describe('Coordinate Validation', () => {
    const validCoordinates = [
      { lat: 0, lng: 0 },
      { lat: 90, lng: 180 },
      { lat: -90, lng: -180 },
      { lat: 40.7128, lng: -74.0060 },  // NYC
      { lat: 51.5074, lng: -0.1278 }    // London
    ];

    const invalidCoordinates = [
      { lat: 91, lng: 0 },      // Latitude too high
      { lat: -91, lng: 0 },     // Latitude too low
      { lat: 0, lng: 181 },     // Longitude too high
      { lat: 0, lng: -181 },    // Longitude too low
      { lat: NaN, lng: 0 },     // Invalid latitude
      { lat: 0, lng: NaN }      // Invalid longitude
    ];

    test.each(validCoordinates)('should validate correct coordinates: %p', ({ lat, lng }) => {
      const result = validateCoordinates(lat, lng);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ lat, lng });
    });

    test.each(invalidCoordinates)('should reject invalid coordinates: %p', ({ lat, lng }) => {
      const result = validateCoordinates(lat, lng);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('URL Validation', () => {
    const validUrls = [
      'https://example.com',
      'http://sub.example.com',
      'https://example.com/path',
      'https://example.com/path?query=1',
      'https://example.com:8080',
      'http://localhost:3000'
    ];

    const invalidUrls = [
      '',                                 // Empty string
      'not-a-url',                       // Missing protocol and domain
      'http://',                         // Missing domain
      'https://invalid@domain',          // Invalid format
      'http://10.0.0.0',                // Private IP
      'javascript:alert(1)',            // JavaScript protocol
      'data:text/plain;base64,SGVsbG8', // Data protocol
      'file:///etc/passwd'              // File protocol
    ];

    test.each(validUrls)('should validate correct URL format: %s', (url) => {
      expect(URL_REGEX.test(url)).toBe(true);
    });

    test.each(invalidUrls)('should reject invalid URL format: %s', (url) => {
      expect(URL_REGEX.test(url)).toBe(false);
    });
  });

  // Helper function to test regex patterns directly
  const testRegexPattern = (pattern: RegExp, value: string): boolean => {
    return pattern.test(value);
  };

  describe('Regex Pattern Tests', () => {
    test('EMAIL_REGEX should match valid email patterns', () => {
      expect(testRegexPattern(EMAIL_REGEX, 'user@domain.com')).toBe(true);
      expect(testRegexPattern(EMAIL_REGEX, 'invalid@email')).toBe(false);
    });

    test('PASSWORD_REGEX should match valid password patterns', () => {
      expect(testRegexPattern(PASSWORD_REGEX, 'Password123!')).toBe(true);
      expect(testRegexPattern(PASSWORD_REGEX, 'weakpass')).toBe(false);
    });

    test('DOMAIN_REGEX should match valid domain patterns', () => {
      expect(testRegexPattern(DOMAIN_REGEX, 'example.com')).toBe(true);
      expect(testRegexPattern(DOMAIN_REGEX, 'invalid@domain')).toBe(false);
    });
  });
});