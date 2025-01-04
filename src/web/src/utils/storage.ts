/**
 * Secure browser storage utility module with encryption, type safety, and error handling
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import { AES, enc } from 'crypto-js'; // v4.1.1
import { ApiError } from '../types/common';

// Storage configuration constants
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_STORAGE_ENCRYPTION_KEY || 'default-dev-key';
const STORAGE_PREFIX = 'restaurant-app';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

/**
 * Options for storage operations
 */
interface StorageOptions<T> {
  sensitive?: boolean; // Whether to encrypt the data
  schema?: z.ZodType<T>; // Optional runtime type validation
  expiry?: number; // Expiration time in milliseconds
  storageType?: 'local' | 'session';
}

/**
 * Custom error class for storage operations
 */
export class StorageError extends Error {
  public readonly errorCode: string;
  public readonly originalError?: Error;
  public readonly storageType: 'local' | 'session';

  constructor(
    message: string,
    errorCode: string,
    originalError?: Error,
    storageType: 'local' | 'session' = 'local'
  ) {
    super(message);
    this.name = 'StorageError';
    this.errorCode = errorCode;
    this.originalError = originalError;
    this.storageType = storageType;
    Error.captureStackTrace(this, StorageError);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      storageType: this.storageType,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * Wrapper for stored data with metadata
 */
interface StorageWrapper<T> {
  data: T;
  timestamp: number;
  expiry?: number;
  encrypted: boolean;
  version: string;
}

/**
 * Validates storage quota availability
 */
function checkStorageQuota(size: number): void {
  if (size > MAX_STORAGE_SIZE) {
    throw new StorageError(
      'Storage quota exceeded',
      'STORAGE_QUOTA_EXCEEDED',
      undefined
    );
  }
}

/**
 * Encrypts sensitive data
 */
function encryptData(data: string): string {
  try {
    return AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    throw new StorageError(
      'Encryption failed',
      'ENCRYPTION_ERROR',
      error as Error
    );
  }
}

/**
 * Decrypts sensitive data
 */
function decryptData(encryptedData: string): string {
  try {
    const bytes = AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(enc.Utf8);
  } catch (error) {
    throw new StorageError(
      'Decryption failed',
      'DECRYPTION_ERROR',
      error as Error
    );
  }
}

/**
 * Securely stores data in browser storage with optional encryption
 */
export function setLocalStorage<T>(
  key: string,
  value: T,
  options: StorageOptions<T> = {}
): void {
  try {
    const {
      sensitive = false,
      schema,
      expiry,
      storageType = 'local'
    } = options;

    // Validate key
    if (!key || typeof key !== 'string') {
      throw new StorageError(
        'Invalid storage key',
        'INVALID_KEY',
        undefined,
        storageType
      );
    }

    // Validate value with schema if provided
    if (schema) {
      schema.parse(value);
    }

    // Prepare storage wrapper
    const wrapper: StorageWrapper<T> = {
      data: value,
      timestamp: Date.now(),
      expiry: expiry ? Date.now() + expiry : undefined,
      encrypted: sensitive,
      version: '1.0'
    };

    // Serialize and optionally encrypt
    let serializedData = JSON.stringify(wrapper);
    if (sensitive) {
      serializedData = encryptData(serializedData);
    }

    // Check storage quota
    checkStorageQuota(serializedData.length);

    // Store with prefix
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    const prefixedKey = `${STORAGE_PREFIX}:${key}`;
    storage.setItem(prefixedKey, serializedData);

  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      'Storage operation failed',
      'STORAGE_ERROR',
      error as Error
    );
  }
}

/**
 * Retrieves and optionally decrypts data from browser storage
 */
export function getLocalStorage<T>(
  key: string,
  options: StorageOptions<T> = {}
): T | null {
  try {
    const {
      schema,
      storageType = 'local'
    } = options;

    // Validate key
    if (!key || typeof key !== 'string') {
      throw new StorageError(
        'Invalid storage key',
        'INVALID_KEY',
        undefined,
        storageType
      );
    }

    // Retrieve from storage
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    const prefixedKey = `${STORAGE_PREFIX}:${key}`;
    const rawData = storage.getItem(prefixedKey);

    if (!rawData) {
      return null;
    }

    // Parse wrapper
    let wrapper: StorageWrapper<T>;
    try {
      // Attempt to parse as unencrypted first
      wrapper = JSON.parse(rawData);
      
      // If encrypted, decrypt and parse again
      if (wrapper.encrypted) {
        const decrypted = decryptData(rawData);
        wrapper = JSON.parse(decrypted);
      }
    } catch (error) {
      throw new StorageError(
        'Failed to parse stored data',
        'PARSE_ERROR',
        error as Error,
        storageType
      );
    }

    // Check expiry
    if (wrapper.expiry && wrapper.expiry < Date.now()) {
      storage.removeItem(prefixedKey);
      return null;
    }

    // Validate with schema if provided
    if (schema) {
      wrapper.data = schema.parse(wrapper.data);
    }

    return wrapper.data;

  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      'Storage retrieval failed',
      'RETRIEVAL_ERROR',
      error as Error
    );
  }
}

/**
 * Removes item from storage
 */
export function removeLocalStorage(
  key: string,
  options: Pick<StorageOptions<unknown>, 'storageType'> = {}
): void {
  try {
    const { storageType = 'local' } = options;
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    const prefixedKey = `${STORAGE_PREFIX}:${key}`;
    storage.removeItem(prefixedKey);
  } catch (error) {
    throw new StorageError(
      'Failed to remove item from storage',
      'REMOVE_ERROR',
      error as Error
    );
  }
}

/**
 * Clears all application storage items
 */
export function clearLocalStorage(
  options: Pick<StorageOptions<unknown>, 'storageType'> = {}
): void {
  try {
    const { storageType = 'local' } = options;
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    
    // Only clear items with our prefix
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        storage.removeItem(key);
      }
    }
  } catch (error) {
    throw new StorageError(
      'Failed to clear storage',
      'CLEAR_ERROR',
      error as Error
    );
  }
}