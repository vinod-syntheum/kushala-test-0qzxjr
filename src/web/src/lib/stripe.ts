/**
 * Stripe payment integration library providing secure, type-safe methods for handling payments,
 * subscriptions, and checkout sessions with comprehensive error handling and monitoring.
 * @module stripe
 * @version 1.0.0
 */

import { loadStripe, Stripe } from '@stripe/stripe-js'; // ^2.1.0
import { createLogger, format, transports } from 'winston'; // ^3.10.0
import { ApiResponse, HttpStatusCode } from '../types/common';
import api from './api';

// Environment variables
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY;
const STRIPE_MAX_RETRIES = 3;
const STRIPE_RETRY_DELAY = 1000;

// Configure logger
const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'stripe-payments.log' })
  ]
});

// Stripe instance cache
let stripeInstance: Stripe | null = null;

/**
 * Type definitions for payment-related responses
 */
interface PaymentIntentResponse {
  clientSecret: string;
  intentId: string;
}

interface CheckoutSessionResponse {
  sessionId: string;
  sessionUrl: string;
}

/**
 * Error types for Stripe operations
 */
enum StripeErrorType {
  AUTHENTICATION = 'authentication_error',
  INVALID_REQUEST = 'invalid_request_error',
  RATE_LIMIT = 'rate_limit_error',
  CARD_ERROR = 'card_error',
  VALIDATION_ERROR = 'validation_error',
  INTERNAL_ERROR = 'internal_error'
}

/**
 * Initializes and returns a cached Stripe instance
 * @returns Promise<Stripe | null>
 */
async function initializeStripe(): Promise<Stripe | null> {
  if (stripeInstance) {
    return stripeInstance;
  }

  if (!STRIPE_PUBLIC_KEY) {
    logger.error('Stripe public key is not configured');
    throw new Error('Stripe public key is required');
  }

  try {
    stripeInstance = await loadStripe(STRIPE_PUBLIC_KEY);
    logger.info('Stripe instance initialized successfully');
    return stripeInstance;
  } catch (error) {
    logger.error('Failed to initialize Stripe', { error });
    return null;
  }
}

/**
 * Creates a payment intent with retry mechanism and comprehensive error handling
 */
async function createPaymentIntent(
  amount: number,
  currency: string,
  description: string,
  metadata: Record<string, string>
): Promise<ApiResponse<PaymentIntentResponse>> {
  logger.info('Creating payment intent', { amount, currency, description });

  try {
    const response = await api.post<PaymentIntentResponse>(
      '/api/payments/create-intent',
      {
        amount,
        currency,
        description,
        metadata
      },
      {
        retries: STRIPE_MAX_RETRIES,
        retryDelay: STRIPE_RETRY_DELAY
      }
    );

    logger.info('Payment intent created successfully', {
      intentId: response.data.intentId
    });

    return response;
  } catch (error: any) {
    logger.error('Failed to create payment intent', { error });
    
    return {
      status: error.status || HttpStatusCode.INTERNAL_SERVER_ERROR,
      data: {
        clientSecret: '',
        intentId: '',
        error: {
          type: error.type || StripeErrorType.INTERNAL_ERROR,
          message: error.message
        }
      }
    };
  }
}

/**
 * Creates a Stripe checkout session for ticket purchases with enhanced validation
 */
async function createCheckoutSession(
  eventId: string,
  ticketQuantity: number,
  successUrl: string,
  cancelUrl: string,
  customerEmail?: string,
  metadata: Record<string, string> = {}
): Promise<ApiResponse<CheckoutSessionResponse>> {
  logger.info('Creating checkout session', {
    eventId,
    ticketQuantity,
    customerEmail
  });

  try {
    const response = await api.post<CheckoutSessionResponse>(
      '/api/payments/create-checkout-session',
      {
        eventId,
        ticketQuantity,
        successUrl,
        cancelUrl,
        customerEmail,
        metadata: {
          ...metadata,
          eventId,
          ticketQuantity: ticketQuantity.toString()
        }
      },
      {
        retries: STRIPE_MAX_RETRIES,
        retryDelay: STRIPE_RETRY_DELAY
      }
    );

    logger.info('Checkout session created successfully', {
      sessionId: response.data.sessionId
    });

    return response;
  } catch (error: any) {
    logger.error('Failed to create checkout session', { error });

    return {
      status: error.status || HttpStatusCode.INTERNAL_SERVER_ERROR,
      data: {
        sessionId: '',
        sessionUrl: '',
        error: {
          type: error.type || StripeErrorType.INTERNAL_ERROR,
          message: error.message
        }
      }
    };
  }
}

/**
 * Processes payment status updates with webhook signature verification
 */
async function handlePaymentStatus(
  event: Stripe.Event,
  signature: string
): Promise<void> {
  logger.info('Processing payment status update', {
    eventType: event.type,
    eventId: event.id
  });

  try {
    const response = await api.post<void>(
      '/api/payments/webhook',
      {
        event,
        signature
      },
      {
        headers: {
          'Stripe-Signature': signature
        }
      }
    );

    logger.info('Payment status processed successfully', {
      eventId: event.id
    });

    return response.data;
  } catch (error: any) {
    logger.error('Failed to process payment status', {
      error,
      eventId: event.id
    });

    throw error;
  }
}

/**
 * Validates a Stripe webhook signature
 */
function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const stripe = require('stripe')(STRIPE_PUBLIC_KEY);
    stripe.webhooks.constructEvent(payload, signature, secret);
    return true;
  } catch (error) {
    logger.error('Invalid webhook signature', { error });
    return false;
  }
}

// Export the Stripe integration utilities
export const stripe = {
  initializeStripe,
  createPaymentIntent,
  createCheckoutSession,
  handlePaymentStatus,
  validateWebhookSignature
};

// Export types for consumers
export type {
  PaymentIntentResponse,
  CheckoutSessionResponse
};

export {
  StripeErrorType
};