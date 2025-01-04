import { describe, expect, jest, test, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import { Repository } from 'typeorm'; // v0.3.x
import Stripe from 'stripe'; // v12.0.0
import { PaymentService } from '../../src/services/payment.service';
import { stripeConfig } from '../../src/config/stripe.config';
import { Ticket } from '../../src/models/postgresql/ticket.model';
import { TicketStatus } from '../../src/interfaces/ticket.interface';
import { HttpException } from '@nestjs/common';

// Test constants
const TEST_CONSTANTS = {
  TICKET_ID: 'test-ticket-123',
  PAYMENT_INTENT_ID: 'pi_test123',
  CUSTOMER_ID: 'cus_test123',
  REFUND_ID: 're_test123',
  WEBHOOK_SECRET: 'whsec_test123',
  AMOUNT: 2500, // $25.00
  CURRENCY: 'usd',
  IDEMPOTENCY_KEY: 'test_idempotency_key_123'
};

// Mock repositories and services
jest.mock('typeorm');
jest.mock('stripe');

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockTicketRepository: jest.Mocked<Repository<Ticket>>;
  let mockStripeClient: jest.Mocked<Stripe>;
  let mockLogger: any;

  // Mock ticket data
  const mockTicket = {
    id: TEST_CONSTANTS.TICKET_ID,
    price: TEST_CONSTANTS.AMOUNT,
    status: TicketStatus.RESERVED,
    paymentIntentId: null,
    save: jest.fn()
  };

  // Mock payment intent data
  const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
    id: TEST_CONSTANTS.PAYMENT_INTENT_ID,
    status: 'succeeded',
    amount: TEST_CONSTANTS.AMOUNT,
    currency: TEST_CONSTANTS.CURRENCY,
    client_secret: 'test_secret',
    metadata: { ticketId: TEST_CONSTANTS.TICKET_ID }
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocks
    mockTicketRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryRunner: jest.fn()
    } as any;

    mockStripeClient = {
      paymentIntents: {
        create: jest.fn(),
        confirm: jest.fn(),
        retrieve: jest.fn(),
        cancel: jest.fn()
      },
      refunds: {
        create: jest.fn()
      },
      webhooks: {
        constructEvent: jest.fn()
      }
    } as any;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    // Initialize service with mocks
    paymentService = new PaymentService(
      mockTicketRepository,
      mockLogger
    );

    // Replace Stripe client with mock
    (paymentService as any).stripeClient = mockStripeClient;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createPaymentIntent', () => {
    const paymentOptions = {
      amount: TEST_CONSTANTS.AMOUNT,
      currency: TEST_CONSTANTS.CURRENCY,
      metadata: { customerId: TEST_CONSTANTS.CUSTOMER_ID }
    };

    test('should create payment intent successfully', async () => {
      // Setup mocks
      mockTicketRepository.findOne.mockResolvedValue(mockTicket);
      mockStripeClient.paymentIntents.create.mockResolvedValue(mockPaymentIntent as Stripe.PaymentIntent);

      // Execute test
      const result = await paymentService.createPaymentIntent(
        TEST_CONSTANTS.TICKET_ID,
        paymentOptions
      );

      // Verify results
      expect(result).toBeDefined();
      expect(result.id).toBe(TEST_CONSTANTS.PAYMENT_INTENT_ID);
      expect(mockStripeClient.paymentIntents.create).toHaveBeenCalledWith({
        amount: TEST_CONSTANTS.AMOUNT,
        currency: TEST_CONSTANTS.CURRENCY.toLowerCase(),
        metadata: {
          ticketId: TEST_CONSTANTS.TICKET_ID,
          customerId: TEST_CONSTANTS.CUSTOMER_ID
        },
        idempotencyKey: expect.any(String)
      });
    });

    test('should handle invalid ticket ID', async () => {
      // Setup mocks
      mockTicketRepository.findOne.mockResolvedValue(null);

      // Execute and verify error
      await expect(
        paymentService.createPaymentIntent(TEST_CONSTANTS.TICKET_ID, paymentOptions)
      ).rejects.toThrow(HttpException);
    });

    test('should handle Stripe API errors', async () => {
      // Setup mocks
      mockTicketRepository.findOne.mockResolvedValue(mockTicket);
      mockStripeClient.paymentIntents.create.mockRejectedValue(
        new Error('Stripe API Error')
      );

      // Execute and verify error
      await expect(
        paymentService.createPaymentIntent(TEST_CONSTANTS.TICKET_ID, paymentOptions)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('confirmPayment', () => {
    const confirmOptions = {
      paymentMethodId: 'pm_test123',
      receiptEmail: 'test@example.com'
    };

    test('should confirm payment successfully', async () => {
      // Setup mocks
      mockStripeClient.paymentIntents.confirm.mockResolvedValue({
        ...mockPaymentIntent,
        charges: { data: [{ receipt_url: 'https://receipt.url' }] }
      } as any);

      // Execute test
      const result = await paymentService.confirmPayment(
        TEST_CONSTANTS.PAYMENT_INTENT_ID,
        confirmOptions
      );

      // Verify results
      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe(TEST_CONSTANTS.PAYMENT_INTENT_ID);
      expect(mockTicketRepository.update).toHaveBeenCalled();
    });

    test('should handle failed payment confirmation', async () => {
      // Setup mocks
      mockStripeClient.paymentIntents.confirm.mockResolvedValue({
        ...mockPaymentIntent,
        status: 'requires_payment_method'
      } as any);

      // Execute test
      const result = await paymentService.confirmPayment(
        TEST_CONSTANTS.PAYMENT_INTENT_ID,
        confirmOptions
      );

      // Verify results
      expect(result.success).toBe(false);
      expect(mockTicketRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    const mockSignature = 'test_signature';
    const mockPayload = Buffer.from(JSON.stringify({
      type: 'payment_intent.succeeded',
      data: { object: mockPaymentIntent }
    }));

    test('should process payment success webhook', async () => {
      // Setup mocks
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: mockPaymentIntent }
      } as any);

      // Execute test
      await paymentService.handleWebhook(mockSignature, mockPayload);

      // Verify results
      expect(mockTicketRepository.update).toHaveBeenCalledWith(
        { id: TEST_CONSTANTS.TICKET_ID },
        {
          paymentStatus: 'confirmed',
          paymentConfirmedAt: expect.any(Date)
        }
      );
    });

    test('should process payment failure webhook', async () => {
      // Setup mocks
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: { object: mockPaymentIntent }
      } as any);

      // Execute test
      await paymentService.handleWebhook(mockSignature, mockPayload);

      // Verify results
      expect(mockTicketRepository.update).toHaveBeenCalledWith(
        { id: TEST_CONSTANTS.TICKET_ID },
        {
          paymentStatus: 'failed',
          paymentFailedAt: expect.any(Date)
        }
      );
    });

    test('should handle invalid webhook signature', async () => {
      // Setup mocks
      mockStripeClient.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      // Execute and verify error
      await expect(
        paymentService.handleWebhook(mockSignature, mockPayload)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('processRefund', () => {
    test('should process refund successfully', async () => {
      // Setup mocks
      mockStripeClient.refunds.create.mockResolvedValue({
        id: TEST_CONSTANTS.REFUND_ID,
        status: 'succeeded'
      } as any);

      // Execute test
      const result = await paymentService.processRefund(TEST_CONSTANTS.PAYMENT_INTENT_ID);

      // Verify results
      expect(result.id).toBe(TEST_CONSTANTS.REFUND_ID);
      expect(mockTicketRepository.update).toHaveBeenCalledWith(
        { paymentIntentId: TEST_CONSTANTS.PAYMENT_INTENT_ID },
        { status: TicketStatus.REFUNDED }
      );
    });

    test('should handle refund failure', async () => {
      // Setup mocks
      mockStripeClient.refunds.create.mockRejectedValue(
        new Error('Refund failed')
      );

      // Execute and verify error
      await expect(
        paymentService.processRefund(TEST_CONSTANTS.PAYMENT_INTENT_ID)
      ).rejects.toThrow(HttpException);
    });
  });
});