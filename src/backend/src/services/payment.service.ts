/**
 * @fileoverview Enhanced payment service implementation for secure payment processing
 * using Stripe integration with comprehensive error handling and security measures.
 * @version 1.0.0
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common'; // v9.0.0
import { Repository } from 'typeorm'; // v0.3.x
import Stripe from 'stripe'; // v12.0.0
import retry from 'retry'; // v0.13.0
import { stripeConfig } from '../config/stripe.config';
import { ERROR_MESSAGES, ERROR_TYPES } from '../constants/error.constants';

/**
 * Payment intent creation options
 */
interface PaymentOptions {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

/**
 * Payment confirmation options
 */
interface ConfirmOptions {
  paymentMethodId: string;
  receiptEmail?: string;
}

/**
 * Payment result interface
 */
interface PaymentResult {
  success: boolean;
  paymentIntentId: string;
  status: Stripe.PaymentIntent.Status;
  receiptUrl?: string;
}

@Injectable()
export class PaymentService {
  private readonly stripeClient: Stripe;
  private readonly MAX_RETRIES = 3;
  private readonly PAYMENT_TIMEOUT = 30000; // 30 seconds

  constructor(
    private readonly ticketRepository: Repository<Ticket>,
    private readonly logger: Logger
  ) {
    this.stripeClient = stripeConfig.client;
    this.logger = new Logger(PaymentService.name);
  }

  /**
   * Creates a secure payment intent with retry mechanism and validation
   * @param ticketId - Unique ticket identifier
   * @param options - Payment creation options
   * @returns Promise resolving to validated payment intent
   */
  async createPaymentIntent(
    ticketId: string,
    options: PaymentOptions
  ): Promise<Stripe.PaymentIntent> {
    this.logger.debug(`Creating payment intent for ticket: ${ticketId}`);

    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new HttpException(ERROR_MESSAGES.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const operation = retry.operation({
      retries: this.MAX_RETRIES,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: this.PAYMENT_TIMEOUT,
    });

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        try {
          const paymentIntent = await this.stripeClient.paymentIntents.create({
            amount: options.amount,
            currency: options.currency.toLowerCase(),
            metadata: {
              ticketId,
              ...options.metadata,
            },
            idempotencyKey: `${stripeConfig.idempotencyKeyPrefix}_${ticketId}_${Date.now()}`,
          });

          this.logger.debug(`Payment intent created: ${paymentIntent.id}`);
          resolve(paymentIntent);
        } catch (error) {
          if (operation.retry(error as Error)) {
            this.logger.warn(
              `Retrying payment intent creation. Attempt ${currentAttempt}/${this.MAX_RETRIES}`
            );
            return;
          }
          this.logger.error('Payment intent creation failed', error);
          reject(new HttpException(
            ERROR_MESSAGES.SERVER_ERROR,
            HttpStatus.INTERNAL_SERVER_ERROR
          ));
        }
      });
    });
  }

  /**
   * Confirms payment with comprehensive validation and status tracking
   * @param paymentIntentId - Stripe payment intent ID
   * @param options - Payment confirmation options
   * @returns Promise resolving to payment result
   */
  async confirmPayment(
    paymentIntentId: string,
    options: ConfirmOptions
  ): Promise<PaymentResult> {
    this.logger.debug(`Confirming payment: ${paymentIntentId}`);

    try {
      const paymentIntent = await this.stripeClient.paymentIntents.confirm(
        paymentIntentId,
        {
          payment_method: options.paymentMethodId,
          receipt_email: options.receiptEmail,
        }
      );

      const result: PaymentResult = {
        success: paymentIntent.status === 'succeeded',
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        receiptUrl: paymentIntent.charges.data[0]?.receipt_url,
      };

      if (result.success) {
        await this.ticketRepository.update(
          { paymentIntentId },
          { paymentStatus: 'paid', updatedAt: new Date() }
        );
      }

      this.logger.debug(`Payment confirmation result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error('Payment confirmation failed', error);
      throw new HttpException(
        ERROR_MESSAGES.SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Handles Stripe webhooks with enhanced security validation
   * @param signature - Webhook signature from Stripe
   * @param rawBody - Raw webhook payload
   * @returns Promise resolving to void
   */
  async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
    this.logger.debug('Processing Stripe webhook');

    try {
      const event = this.stripeClient.webhooks.constructEvent(
        rawBody,
        signature,
        stripeConfig.webhookSecret
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          this.logger.debug(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      throw new HttpException(
        'Webhook processing failed',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Handles successful payment webhook events
   * @param paymentIntent - Stripe payment intent object
   * @returns Promise resolving to void
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const ticketId = paymentIntent.metadata.ticketId;
    await this.ticketRepository.update(
      { id: ticketId },
      {
        paymentStatus: 'confirmed',
        paymentConfirmedAt: new Date(),
      }
    );
    this.logger.debug(`Payment success processed for ticket: ${ticketId}`);
  }

  /**
   * Handles failed payment webhook events
   * @param paymentIntent - Stripe payment intent object
   * @returns Promise resolving to void
   */
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const ticketId = paymentIntent.metadata.ticketId;
    await this.ticketRepository.update(
      { id: ticketId },
      {
        paymentStatus: 'failed',
        paymentFailedAt: new Date(),
      }
    );
    this.logger.debug(`Payment failure processed for ticket: ${ticketId}`);
  }
}