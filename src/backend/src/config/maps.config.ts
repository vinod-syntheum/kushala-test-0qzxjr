/**
 * @fileoverview Google Maps API configuration module providing centralized management
 * of Maps API credentials and regional settings for location-based features.
 * @version 1.0.0
 */

import { ProcessEnv } from '../types/environment';

/**
 * Interface defining the structure of Maps API configuration
 * @interface MapsConfig
 */
interface MapsConfig {
  /** Google Maps API key from environment variables */
  apiKey: string;
  /** Geographic region for Maps API requests */
  region: string;
  /** Language preference for Maps API responses */
  language: string;
  /** Timeout duration for API requests in milliseconds */
  timeout: number;
  /** Number of retry attempts for failed requests */
  retries: number;
}

/**
 * Default timeout for Maps API requests in milliseconds
 * @constant {number}
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * Default number of retry attempts for failed requests
 * @constant {number}
 */
const DEFAULT_RETRIES = 3;

/**
 * Default region for Maps API requests
 * @constant {string}
 */
const DEFAULT_REGION = 'us';

/**
 * Default language for Maps API responses
 * @constant {string}
 */
const DEFAULT_LANGUAGE = 'en';

/**
 * Validates the Maps API configuration and environment variables
 * @param {MapsConfig} config - Configuration object to validate
 * @returns {boolean} True if configuration is valid
 * @throws {Error} If configuration is invalid
 */
const validateConfig = (config: MapsConfig): boolean => {
  // Check if API key is present
  if (!config.apiKey) {
    throw new Error('Google Maps API key is required');
  }

  // Validate API key format (basic check for non-empty string)
  if (typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
    throw new Error('Invalid Google Maps API key format');
  }

  // Verify required configuration fields
  if (!config.region || !config.language) {
    throw new Error('Region and language settings are required');
  }

  // Validate timeout value
  if (config.timeout < 1000 || config.timeout > 60000) {
    throw new Error('Timeout must be between 1000ms and 60000ms');
  }

  // Validate retry count
  if (config.retries < 0 || config.retries > 5) {
    throw new Error('Retry count must be between 0 and 5');
  }

  return true;
};

/**
 * Maps API configuration object with validated settings
 * @const {MapsConfig}
 */
const mapsConfig: MapsConfig = {
  apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  region: process.env.MAPS_REGION || DEFAULT_REGION,
  language: process.env.MAPS_LANGUAGE || DEFAULT_LANGUAGE,
  timeout: Number(process.env.MAPS_TIMEOUT) || DEFAULT_TIMEOUT,
  retries: Number(process.env.MAPS_RETRIES) || DEFAULT_RETRIES,
};

// Validate configuration on module initialization
validateConfig(mapsConfig);

// Freeze configuration object to prevent runtime modifications
Object.freeze(mapsConfig);

export {
  mapsConfig,
  MapsConfig,
  validateConfig,
  DEFAULT_TIMEOUT,
  DEFAULT_RETRIES,
  DEFAULT_REGION,
  DEFAULT_LANGUAGE,
};