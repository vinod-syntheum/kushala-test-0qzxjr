import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  validateEmail,
  validatePassword,
  validateLoginForm,
  validateEventDetails
} from '../../src/utils/validation';
import { ValidationError } from '../../src/types/common';
import { LoginCredentials } from '../../src/types/auth';

// Test constants
const TEST_VALID_EMAIL = 'test@example.com';
const TEST_INVALID_EMAIL = 'invalid.email';
const TEST_DISPOSABLE_EMAIL = 'test@tempmail.com';
const TEST_VALID_PASSWORD = 'Password123!@#';
const TEST_WEAK_PASSWORD = 'weak';
const TEST_COMMON_PASSWORD = 'password123';
const TEST_XSS_ATTEMPT = "<script>alert('xss')</script>";
const TEST_VALID_EVENT_DETAILS = {
  title: 'Test Event',
  description: 'Test Description',
  startDate: new Date(Date.now() + 86400000), // Tomorrow
  endDate: new Date(Date.now() + 172800000), // Day after tomorrow
  price: 10.0,
  capacity: 100,
  location: {
    latitude: 40.7128,
    longitude: -74.006
  }
};

describe('validateEmail', () => {
  test('should validate correct email format', () => {
    const errors = validateEmail(TEST_VALID_EMAIL);
    expect(errors).toHaveLength(0);
  });

  test('should reject invalid email format', () => {
    const errors = validateEmail(TEST_INVALID_EMAIL);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_FORMAT'
    });
  });

  test('should reject disposable email domains', () => {
    const errors = validateEmail(TEST_DISPOSABLE_EMAIL);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('DISPOSABLE_EMAIL');
  });

  test('should sanitize XSS attempts in email', () => {
    const errors = validateEmail(`${TEST_XSS_ATTEMPT}@example.com`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('INVALID_EMAIL');
  });

  test('should validate email length limits', () => {
    const longEmail = 'a'.repeat(256) + '@example.com';
    const errors = validateEmail(longEmail);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validatePassword', () => {
  test('should validate correct password format', () => {
    const errors = validatePassword(TEST_VALID_PASSWORD);
    expect(errors).toHaveLength(0);
  });

  test('should enforce minimum length requirement', () => {
    const errors = validatePassword(TEST_WEAK_PASSWORD);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe('INVALID_PASSWORD');
  });

  test('should enforce password complexity', () => {
    const errors = validatePassword('onlylowercase');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('complexity'))).toBeTruthy();
  });

  test('should detect weak passwords', () => {
    const errors = validatePassword(TEST_COMMON_PASSWORD);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.code === 'WEAK_PASSWORD')).toBeTruthy();
  });

  test('should enforce maximum length', () => {
    const longPassword = 'A1!a'.repeat(20); // 80 characters
    const errors = validatePassword(longPassword);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('should require mixed case characters', () => {
    const errors = validatePassword('password123!');
    expect(errors.length).toBeGreaterThan(0);
  });

  test('should require special characters', () => {
    const errors = validatePassword('Password123');
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validateLoginForm', () => {
  let validCredentials: LoginCredentials;

  beforeEach(() => {
    validCredentials = {
      email: TEST_VALID_EMAIL,
      password: TEST_VALID_PASSWORD
    };
  });

  test('should validate correct login credentials', () => {
    const errors = validateLoginForm(validCredentials);
    expect(errors).toHaveLength(0);
  });

  test('should reject invalid email in form', () => {
    const errors = validateLoginForm({
      ...validCredentials,
      email: TEST_INVALID_EMAIL
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('email');
  });

  test('should reject invalid password in form', () => {
    const errors = validateLoginForm({
      ...validCredentials,
      password: TEST_WEAK_PASSWORD
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('password');
  });

  test('should sanitize XSS attempts in form fields', () => {
    const errors = validateLoginForm({
      email: `${TEST_XSS_ATTEMPT}@example.com`,
      password: TEST_VALID_PASSWORD
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validateEventDetails', () => {
  test('should validate correct event details', () => {
    const errors = validateEventDetails(TEST_VALID_EVENT_DETAILS);
    expect(errors).toHaveLength(0);
  });

  test('should validate date ranges', () => {
    const invalidDates = {
      ...TEST_VALID_EVENT_DETAILS,
      startDate: new Date(Date.now() + 172800000), // Day after tomorrow
      endDate: new Date(Date.now() + 86400000) // Tomorrow
    };
    const errors = validateEventDetails(invalidDates);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('End date must be after start date');
  });

  test('should validate geographic coordinates', () => {
    const invalidCoordinates = {
      ...TEST_VALID_EVENT_DETAILS,
      location: {
        latitude: 100,
        longitude: 200
      }
    };
    const errors = validateEventDetails(invalidCoordinates);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('should validate capacity limits', () => {
    const invalidCapacity = {
      ...TEST_VALID_EVENT_DETAILS,
      capacity: -1
    };
    const errors = validateEventDetails(invalidCapacity);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('should sanitize XSS attempts in text fields', () => {
    const xssAttempt = {
      ...TEST_VALID_EVENT_DETAILS,
      title: TEST_XSS_ATTEMPT,
      description: TEST_XSS_ATTEMPT
    };
    const errors = validateEventDetails(xssAttempt);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('should validate description length', () => {
    const longDescription = {
      ...TEST_VALID_EVENT_DETAILS,
      description: 'a'.repeat(2001)
    };
    const errors = validateEventDetails(longDescription);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('should validate price range', () => {
    const invalidPrice = {
      ...TEST_VALID_EVENT_DETAILS,
      price: -10
    };
    const errors = validateEventDetails(invalidPrice);
    expect(errors.length).toBeGreaterThan(0);
  });
});