/**
 * @fileoverview AWS services configuration module with enhanced security and error handling
 * @version 1.0.0
 */

import { S3Client } from '@aws-sdk/client-s3'; // ^3.0.0
import { KMSClient } from '@aws-sdk/client-kms'; // ^3.0.0
import { defaultRetryStrategy } from '@aws-sdk/middleware-retry'; // ^3.0.0
import { error, info } from '../utils/logger.utils';

// Global configuration constants
const AWS_MAX_RETRIES = 3;
const AWS_RETRY_DELAY_MS = 1000;

// Required AWS configuration keys
const REQUIRED_CONFIG_KEYS = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET',
  'AWS_KMS_KEY_ID'
] as const;

/**
 * AWS configuration interface
 */
interface AWSConfig {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  maxAttempts: number;
}

/**
 * S3 specific configuration interface
 */
interface S3Config extends AWSConfig {
  bucketName: string;
  versioning: boolean;
}

/**
 * KMS specific configuration interface
 */
interface KMSConfig extends AWSConfig {
  keyId: string;
  keyRotationEnabled: boolean;
}

/**
 * Validates required AWS configuration environment variables
 * @param config - Configuration object to validate
 * @returns boolean indicating if configuration is valid
 * @throws Error if configuration is invalid
 */
const validateAWSConfig = (config: Record<string, string | undefined>): boolean => {
  const missingKeys = REQUIRED_CONFIG_KEYS.filter(key => !config[key]);

  if (missingKeys.length > 0) {
    const error = new Error(`Missing required AWS configuration: ${missingKeys.join(', ')}`);
    error.name = 'ConfigurationError';
    throw error;
  }

  // Validate AWS region format
  const regionRegex = /^[a-z]{2}-[a-z]+-\d{1}$/;
  if (!regionRegex.test(config.AWS_REGION!)) {
    throw new Error('Invalid AWS region format');
  }

  info('AWS configuration validated successfully');
  return true;
};

/**
 * Creates base AWS configuration with retry strategy
 * @returns Base AWS configuration object
 */
const createBaseConfig = (): AWSConfig => {
  return {
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    },
    maxAttempts: AWS_MAX_RETRIES
  };
};

// Singleton instances
let s3ClientInstance: S3Client | null = null;
let kmsClientInstance: KMSClient | null = null;

/**
 * Creates and configures an S3 client instance with retry mechanism
 * @returns Configured S3 client instance
 */
const createS3Client = (): S3Client => {
  if (s3ClientInstance) {
    return s3ClientInstance;
  }

  try {
    validateAWSConfig(process.env);
    const baseConfig = createBaseConfig();

    s3ClientInstance = new S3Client({
      ...baseConfig,
      retryStrategy: defaultRetryStrategy(AWS_MAX_RETRIES, AWS_RETRY_DELAY_MS),
      requestTimeout: 5000
    });

    info('S3 client initialized successfully');
    return s3ClientInstance;
  } catch (err) {
    error(err as Error, 'S3Client initialization failed');
    throw err;
  }
};

/**
 * Creates and configures a KMS client instance with enhanced security
 * @returns Configured KMS client instance
 */
const createKMSClient = (): KMSClient => {
  if (kmsClientInstance) {
    return kmsClientInstance;
  }

  try {
    validateAWSConfig(process.env);
    const baseConfig = createBaseConfig();

    kmsClientInstance = new KMSClient({
      ...baseConfig,
      retryStrategy: defaultRetryStrategy(AWS_MAX_RETRIES, AWS_RETRY_DELAY_MS),
      requestTimeout: 3000
    });

    info('KMS client initialized successfully');
    return kmsClientInstance;
  } catch (err) {
    error(err as Error, 'KMSClient initialization failed');
    throw err;
  }
};

// Export validated AWS configuration
export const AWS_CONFIG = {
  s3Config: {
    ...createBaseConfig(),
    bucketName: process.env.AWS_S3_BUCKET!,
    versioning: true
  } as S3Config,
  kmsConfig: {
    ...createBaseConfig(),
    keyId: process.env.AWS_KMS_KEY_ID!,
    keyRotationEnabled: true
  } as KMSConfig
};

// Initialize and export client instances
export const s3Client = createS3Client();
export const kmsClient = createKMSClient();

// Export configuration validation utility
export { validateAWSConfig };