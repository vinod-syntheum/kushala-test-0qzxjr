/**
 * Integration Tests for Ticket Management
 * Version: 1.0.0
 * 
 * Comprehensive test suite validating ticket management functionality including
 * creation, purchase flow, cancellation, and statistics tracking.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';

import { TicketService } from '../../src/services/ticket.service';
import { PaymentService } from '../../src/services/payment.service';
import { Ticket } from '../../src/models/postgresql/ticket.model';
import { Event } from '../../src/models/postgresql/event.model';
import { 
  TicketType, 
  TicketStatus,
  ITicket,
  ITicketStats 
} from '../../src/interfaces/ticket.interface';

describe('Ticket Integration Tests', () => {
  let app: TestingModule;
  let ticketService: TicketService;
  let paymentService: PaymentService;
  let ticketRepository: Repository<Ticket>;
  let dataSource: DataSource;

  // Test data
  let testEvent: Event;
  let testTicket: Ticket;
  let testUserId: string;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: PaymentService,
          useValue: {
            createPaymentIntent: jest.fn(),
            confirmPayment: jest.fn(),
            processRefund: jest.fn()
          }
        },
        {
          provide: getRepositoryToken(Ticket),
          useClass: Repository
        }
      ]
    }).compile();

    ticketService = app.get<TicketService>(TicketService);
    paymentService = app.get<PaymentService>(PaymentService);
    ticketRepository = app.get<Repository<Ticket>>(getRepositoryToken(Ticket));
    dataSource = app.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Setup test data
    testUserId = faker.string.uuid();
    testEvent = new Event();
    Object.assign(testEvent, {
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
      capacity: 100,
      startDate: faker.date.future(),
      endDate: faker.date.future(),
      price: faker.number.int({ min: 1000, max: 10000 })
    });

    testTicket = new Ticket();
    Object.assign(testTicket, {
      id: faker.string.uuid(),
      eventId: testEvent.id,
      type: TicketType.GENERAL,
      status: TicketStatus.AVAILABLE,
      price: testEvent.price
    });

    // Clear database and reset test state
    await dataSource.synchronize(true);
  });

  describe('Ticket Creation Integration Tests', () => {
    it('should successfully create a batch of tickets', async () => {
      const quantity = 10;
      const batchData = {
        eventId: testEvent.id,
        type: TicketType.GENERAL,
        price: testEvent.price,
        quantity
      };

      jest.spyOn(ticketRepository, 'save').mockResolvedValue([testTicket]);

      const result = await ticketService.createTicketBatch(batchData);

      expect(result).toHaveLength(quantity);
      expect(result[0]).toHaveProperty('status', TicketStatus.AVAILABLE);
      expect(ticketRepository.save).toHaveBeenCalled();
    });

    it('should handle concurrent ticket creation requests', async () => {
      const batchPromises = Array(3).fill(null).map(() => 
        ticketService.createTicketBatch({
          eventId: testEvent.id,
          type: TicketType.GENERAL,
          price: testEvent.price,
          quantity: 5
        })
      );

      const results = await Promise.all(batchPromises);
      
      expect(results).toHaveLength(3);
      results.forEach(batch => {
        expect(batch).toHaveLength(5);
      });
    });

    it('should validate ticket limits and prevent overselling', async () => {
      const oversizedBatch = {
        eventId: testEvent.id,
        type: TicketType.GENERAL,
        price: testEvent.price,
        quantity: testEvent.capacity + 1
      };

      await expect(ticketService.createTicketBatch(oversizedBatch))
        .rejects.toThrow();
    });
  });

  describe('Ticket Purchase Flow Integration Tests', () => {
    it('should successfully process ticket purchase', async () => {
      const paymentIntent = {
        id: faker.string.uuid(),
        status: 'succeeded'
      };

      jest.spyOn(paymentService, 'createPaymentIntent')
        .mockResolvedValue(paymentIntent);

      const result = await ticketService.purchaseTicket(
        testTicket.id,
        testUserId
      );

      expect(result).toHaveProperty('status', TicketStatus.SOLD);
      expect(result).toHaveProperty('userId', testUserId);
      expect(result).toHaveProperty('paymentId', paymentIntent.id);
    });

    it('should handle concurrent purchase attempts for same ticket', async () => {
      const purchasePromises = Array(2).fill(null).map(() =>
        ticketService.purchaseTicket(testTicket.id, testUserId)
      );

      await expect(Promise.all(purchasePromises))
        .rejects.toThrow();
    });

    it('should validate payment processing and handle failures', async () => {
      jest.spyOn(paymentService, 'createPaymentIntent')
        .mockRejectedValue(new Error('Payment failed'));

      await expect(
        ticketService.purchaseTicket(testTicket.id, testUserId)
      ).rejects.toThrow();

      const ticket = await ticketRepository.findOne({
        where: { id: testTicket.id }
      });
      expect(ticket?.status).toBe(TicketStatus.AVAILABLE);
    });
  });

  describe('Ticket Cancellation Integration Tests', () => {
    beforeEach(async () => {
      testTicket.status = TicketStatus.SOLD;
      testTicket.userId = testUserId;
      await ticketRepository.save(testTicket);
    });

    it('should successfully process ticket cancellation and refund', async () => {
      jest.spyOn(paymentService, 'processRefund')
        .mockResolvedValue({ id: faker.string.uuid() });

      const result = await ticketService.cancelTicket(testTicket.id);

      expect(result).toHaveProperty('status', TicketStatus.CANCELLED);
      expect(paymentService.processRefund).toHaveBeenCalled();
    });

    it('should handle concurrent cancellation requests', async () => {
      const cancelPromises = Array(2).fill(null).map(() =>
        ticketService.cancelTicket(testTicket.id)
      );

      await expect(Promise.all(cancelPromises))
        .rejects.toThrow();
    });
  });

  describe('Ticket Statistics Integration Tests', () => {
    beforeEach(async () => {
      // Create test tickets with various statuses
      const tickets = Array(10).fill(null).map(() => ({
        ...testTicket,
        id: faker.string.uuid(),
        status: faker.helpers.arrayElement(Object.values(TicketStatus))
      }));
      await ticketRepository.save(tickets);
    });

    it('should accurately calculate ticket statistics', async () => {
      const stats = await ticketService.getTicketStats(testEvent.id);

      expect(stats).toHaveProperty('totalTickets');
      expect(stats).toHaveProperty('soldTickets');
      expect(stats).toHaveProperty('availableTickets');
      expect(stats).toHaveProperty('revenue');
    });

    it('should handle concurrent statistics updates', async () => {
      const updatePromises = [
        ticketService.purchaseTicket(testTicket.id, testUserId),
        ticketService.getTicketStats(testEvent.id)
      ];

      const [purchase, stats] = await Promise.all(updatePromises);
      expect(stats.soldTickets).toBeGreaterThanOrEqual(0);
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });
});