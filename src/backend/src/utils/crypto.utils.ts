/**
 * @fileoverview Cryptographic utility functions implementing industry-standard security measures
 * for password hashing, data encryption, and secure token generation.
 * @version 1.0.0
 */

import argon2 from 'argon2'; // v0.30.0
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { ERROR_MESSAGES } from '../constants/error.constants';

// Secure encryption key - should be stored in secure key management service in production
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64');

// Argon2id configuration for memory-hard password hashing
const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
  hashLength: 32
};

// AES configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Hashes passwords using the Argon2id algorithm with memory-hard parameters
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} Base64 encoded password hash with embedded parameters
 * @throws {Error} If password is invalid or hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  try {
    const salt = randomBytes(32);
    const hash = await argon2.hash(password, {
      ...ARGON2_CONFIG,
      salt
    });
    return hash;
  } catch (error) {
    throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }
}

/**
 * Verifies a password against a stored hash using constant-time comparison
 * @param {string} password - The plain text password to verify
 * @param {string} hashedPassword - The stored password hash to verify against
 * @returns {Promise<boolean>} True if password matches, false otherwise
 * @throws {Error} If verification fails or inputs are invalid
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  if (!password || !hashedPassword) {
    throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  try {
    return await argon2.verify(hashedPassword, password, ARGON2_CONFIG);
  } catch (error) {
    throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }
}

/**
 * Generates a cryptographically secure random token
 * @param {number} bytes - Number of random bytes (minimum 32)
 * @returns {string} URL-safe base64 encoded token
 * @throws {Error} If bytes is invalid or entropy is insufficient
 */
export function generateSecureToken(bytes: number = 32): string {
  if (bytes < 32) {
    bytes = 32; // Enforce minimum security
  }

  try {
    const token = randomBytes(bytes);
    return token
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (error) {
    throw new Error(ERROR_MESSAGES.SERVER_ERROR);
  }
}

/**
 * Encrypts data using AES-256-GCM with authentication
 * @param {string} data - Data to encrypt
 * @returns {Promise<{encryptedData: string, iv: string, tag: string}>} Encrypted data bundle
 * @throws {Error} If encryption fails or input is invalid
 */
export async function encryptData(
  data: string
): Promise<{ encryptedData: string; iv: string; tag: string }> {
  if (!data) {
    throw new Error(ERROR_MESSAGES.ENCRYPTION_ERROR);
  }

  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64')
    };
  } catch (error) {
    throw new Error(ERROR_MESSAGES.ENCRYPTION_ERROR);
  }
}

/**
 * Decrypts AES-256-GCM encrypted data with authentication verification
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} iv - Base64 encoded initialization vector
 * @param {string} tag - Base64 encoded authentication tag
 * @returns {Promise<string>} Decrypted data
 * @throws {Error} If decryption fails or inputs are invalid
 */
export async function decryptData(
  encryptedData: string,
  iv: string,
  tag: string
): Promise<string> {
  if (!encryptedData || !iv || !tag) {
    throw new Error(ERROR_MESSAGES.DECRYPTION_ERROR);
  }

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY,
      Buffer.from(iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(ERROR_MESSAGES.DECRYPTION_ERROR);
  }
}