/**
 * @fileoverview Unit tests for cryptographic utility functions with focus on security validation
 * @version 1.0.0
 */

import { describe, expect, test, jest, beforeAll, afterAll } from '@jest/globals';
import { randomBytes } from 'crypto';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  encryptData,
  decryptData
} from '../../src/utils/crypto.utils';
import { ERROR_MESSAGES } from '../../src/constants/error.constants';

// Extend timeout for memory-intensive tests
jest.setTimeout(30000);

// Test vectors
let testPasswords: string[];
let testData: string[];

beforeAll(() => {
  // Generate diverse test vectors
  testPasswords = [
    'correcthorsebatterystaple',
    'P@ssw0rd123!',
    'a'.repeat(1024), // Test long passwords
    randomBytes(64).toString('base64'), // Random password
    '你好世界' // Unicode password
  ];
  
  testData = [
    'sensitive data',
    'a'.repeat(1024 * 1024), // 1MB data
    randomBytes(1024).toString('base64'),
    JSON.stringify({ key: 'value' }),
    '你好世界' // Unicode data
  ];
});

afterAll(() => {
  // Clean up sensitive test data
  testPasswords = [];
  testData = [];
});

describe('hashPassword', () => {
  test('should generate valid Argon2id hashes with correct parameters', async () => {
    for (const password of testPasswords) {
      const hash = await hashPassword(password);
      expect(hash).toMatch(/^\$argon2id\$/); // Verify Argon2id identifier
      expect(hash.split('$').length).toBe(6); // Verify hash format
    }
  });

  test('should generate unique salts for identical passwords', async () => {
    const password = testPasswords[0];
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });

  test('should maintain consistent timing across different password lengths', async () => {
    const timings: number[] = [];
    for (const password of testPasswords) {
      const start = process.hrtime.bigint();
      await hashPassword(password);
      const end = process.hrtime.bigint();
      timings.push(Number(end - start));
    }
    
    const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
    const maxDeviation = avgTiming * 0.25; // Allow 25% deviation
    
    timings.forEach(timing => {
      expect(Math.abs(timing - avgTiming)).toBeLessThan(maxDeviation);
    });
  });

  test('should reject invalid inputs', async () => {
    const invalidInputs = [null, undefined, '', 123, {}, []];
    for (const input of invalidInputs) {
      await expect(hashPassword(input as any))
        .rejects
        .toThrow(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }
  });
});

describe('verifyPassword', () => {
  test('should correctly verify valid passwords', async () => {
    for (const password of testPasswords) {
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    }
  });

  test('should reject incorrect passwords', async () => {
    const hash = await hashPassword(testPasswords[0]);
    const isValid = await verifyPassword('wrongpassword', hash);
    expect(isValid).toBe(false);
  });

  test('should maintain constant-time verification', async () => {
    const hash = await hashPassword(testPasswords[0]);
    const timings: number[] = [];
    
    // Test with correct and incorrect passwords of varying lengths
    const testCases = [...testPasswords, 'wrong', 'a'.repeat(1000)];
    
    for (const password of testCases) {
      const start = process.hrtime.bigint();
      await verifyPassword(password, hash);
      const end = process.hrtime.bigint();
      timings.push(Number(end - start));
    }
    
    const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
    const maxDeviation = avgTiming * 0.25; // Allow 25% deviation
    
    timings.forEach(timing => {
      expect(Math.abs(timing - avgTiming)).toBeLessThan(maxDeviation);
    });
  });

  test('should reject invalid inputs', async () => {
    const invalidInputs = [null, undefined, '', 123, {}, []];
    const validHash = await hashPassword(testPasswords[0]);
    
    for (const input of invalidInputs) {
      await expect(verifyPassword(input as any, validHash))
        .rejects
        .toThrow(ERROR_MESSAGES.INVALID_CREDENTIALS);
      
      await expect(verifyPassword(testPasswords[0], input as any))
        .rejects
        .toThrow(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }
  });
});

describe('generateSecureToken', () => {
  test('should generate tokens with sufficient entropy', () => {
    const tokens = new Set();
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      const token = generateSecureToken();
      tokens.add(token);
      
      // Verify URL-safe base64
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      
      // Verify minimum length (32 bytes = 43 base64 chars)
      expect(token.length).toBeGreaterThanOrEqual(43);
    }
    
    // Verify uniqueness
    expect(tokens.size).toBe(iterations);
  });

  test('should enforce minimum token length', () => {
    const token = generateSecureToken(16); // Try smaller than minimum
    const decodedLength = Buffer.from(token, 'base64').length;
    expect(decodedLength).toBeGreaterThanOrEqual(32);
  });

  test('should handle large token sizes', () => {
    const token = generateSecureToken(1024);
    expect(token).toBeTruthy();
    expect(Buffer.from(token, 'base64').length).toBe(1024);
  });
});

describe('encryptData', () => {
  test('should encrypt data with unique IVs', async () => {
    const ivs = new Set();
    
    for (const data of testData) {
      const result = await encryptData(data);
      
      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('tag');
      
      // Verify IV uniqueness
      expect(ivs.has(result.iv)).toBe(false);
      ivs.add(result.iv);
      
      // Verify base64 encoding
      expect(result.encryptedData).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(result.iv).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(result.tag).toMatch(/^[A-Za-z0-9+/]+=*$/);
    }
  });

  test('should reject invalid inputs', async () => {
    const invalidInputs = [null, undefined, '', 123, {}, []];
    
    for (const input of invalidInputs) {
      await expect(encryptData(input as any))
        .rejects
        .toThrow(ERROR_MESSAGES.ENCRYPTION_FAILED);
    }
  });
});

describe('decryptData', () => {
  test('should correctly decrypt encrypted data', async () => {
    for (const data of testData) {
      const encrypted = await encryptData(data);
      const decrypted = await decryptData(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.tag
      );
      expect(decrypted).toBe(data);
    }
  });

  test('should detect tampering', async () => {
    const encrypted = await encryptData(testData[0]);
    
    // Tamper with encrypted data
    const tamperedData = encrypted.encryptedData.replace(/A/g, 'B');
    
    await expect(decryptData(
      tamperedData,
      encrypted.iv,
      encrypted.tag
    )).rejects.toThrow(ERROR_MESSAGES.DECRYPTION_FAILED);
  });

  test('should reject invalid inputs', async () => {
    const encrypted = await encryptData(testData[0]);
    const invalidInputs = [null, undefined, '', 123, {}, []];
    
    for (const input of invalidInputs) {
      await expect(decryptData(
        input as any,
        encrypted.iv,
        encrypted.tag
      )).rejects.toThrow(ERROR_MESSAGES.DECRYPTION_FAILED);
      
      await expect(decryptData(
        encrypted.encryptedData,
        input as any,
        encrypted.tag
      )).rejects.toThrow(ERROR_MESSAGES.DECRYPTION_FAILED);
      
      await expect(decryptData(
        encrypted.encryptedData,
        encrypted.iv,
        input as any
      )).rejects.toThrow(ERROR_MESSAGES.DECRYPTION_FAILED);
    }
  });
});