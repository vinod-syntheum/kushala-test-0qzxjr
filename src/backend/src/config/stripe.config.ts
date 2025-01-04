/**
 * @fileoverview Stripe payment integration configuration module providing a secure,
 * type-safe client instance and webhook handling capabilities.
 * @version 1.0.0
 * @module config/stripe
 */

import Stripe from 'stripe'; // v12.0.0
import winston from 'winston'; // v3.11.0
import { ERROR_MESSAGES } from '../constants/error.constants';
import type { ProcessEnv } from '../types/environment';

/**
 * Stripe API configuration constants
 * @constant {Object}
 */
const STRIPE_CONFIG = {
  API_VERSION: '2023-10-16' as const,
  MAX_RETRIES: 3,
  TIMEOUT: 30000, // 30 seconds
  KEY_PATTERN: /^sk_(?:test|live)_[0-9a-zA-Z]{24,}$/,
  WEBHOOK_PATTERN: /^whsec_[0-9a-zA-Z]{24,}$/
} as const;

/**
 * Logger instance for Stripe-related operations
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'stripe-config' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/stripe-error.log', level: 'error' })
  ]
});

/**
 * Validates Stripe configuration parameters
 * @param {string} secretKey - Stripe secret key
 * @param {string} webhookSecret - Stripe webhook secret
 * @returns {boolean} Validation result
 * @throws {Error} If validation fails
 */
const validateStripeConfig = (secretKey: string, webhookSecret: string): boolean => {
  logger.debug('Validating Stripe configuration parameters');

  if (!STRIPE_CONFIG.KEY_PATTERN.test(secretKey)) {
    logger.error('Invalid Stripe secret key format');
    throw new Error(ERROR_MESSAGES.STRIPE_CONFIG_ERROR);
  }

  if (!STRIPE_CONFIG.WEBHOOK_PATTERN.test(webhookSecret)) {
    logger.error('Invalid Stripe webhook secret format');
    throw new Error(ERROR_MESSAGES.STRIPE_CONFIG_ERROR);
  }

  logger.info('Stripe configuration validation successful');
  return true;
};

/**
 * Initializes and configures the Stripe client instance
 * @returns {Stripe} Configured Stripe client instance
 * @throws {Error} If initialization fails
 */
const initializeStripeClient = (): Stripe => {
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env as ProcessEnv;

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    logger.error('Missing required Stripe environment variables');
    throw new Error(ERROR_MESSAGES.STRIPE_CONFIG_ERROR);
  }

  try {
    logger.info('Initializing Stripe client');
    validateStripeConfig(STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET);

    const stripeClient = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_CONFIG.API_VERSION,
      typescript: true,
      maxNetworkRetries: STRIPE_CONFIG.MAX_RETRIES,
      timeout: STRIPE_CONFIG.TIMEOUT,
      telemetry: false // Disable telemetry for production environments
    });

    // Verify client connection
    stripeClient.balance.retrieve()
      .then(() => logger.info('Stripe client connection verified'))
      .catch(error => {
        logger.error('Stripe client connection verification failed', { error });
        throw error;
      });

    return stripeClient;
  } catch (error) {
    logger.error('Stripe client initialization failed', { error });
    throw new Error(ERROR_MESSAGES.SERVER_ERROR);
  }
};

/**
 * Stripe configuration object with client instance and related settings
 * @const {Object}
 */
export const stripeConfig = {
  client: initializeStripeClient(),
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET as string,
  apiVersion: STRIPE_CONFIG.API_VERSION,
  maxRetries: STRIPE_CONFIG.MAX_RETRIES,
  timeout: STRIPE_CONFIG.TIMEOUT
} as const;

/**
 * Type guard to check if an error is a Stripe error
 * @param {unknown} error - Error to check
 * @returns {boolean} Whether the error is a Stripe error
 */
export const isStripeError = (error: unknown): error is Stripe.StripeError => {
  return error instanceof Error && 'type' in error && typeof (error as any).type === 'string';
};

/**
 * Handles Stripe errors with proper logging and type safety
 * @param {unknown} error - Error to handle
 * @returns {Error} Processed error
 */
export const handleStripeError = (error: unknown): Error => {
  if (isStripeError(error)) {
    logger.error('Stripe operation failed', {
      type: error.type,
      code: error.code,
      message: error.message
    });
    return new Error(`Payment processing error: ${error.message}`);
  }
  logger.error('Unknown error during Stripe operation', { error });
  return new Error(ERROR_MESSAGES.SERVER_ERROR);
};

export default stripeConfig;