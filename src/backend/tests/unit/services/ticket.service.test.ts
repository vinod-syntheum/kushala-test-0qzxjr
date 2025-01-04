import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { Repository, QueryRunner, EntityManager } from 'typeorm';
import { faker } from '@faker-js/faker';

import { TicketService } from '../../../src/services/ticket.service';
import { PaymentService } from '../../../src/services/payment.service';
import { EventService } from '../../../src/services/event.service';
import { Ticket } from '../../../src/models/postgresql/ticket.model';
import { TicketStatus, TicketType } from '../../../src/interfaces/ticket.interface';
import { Cache } from '@nestjs/cache-manager';

describe('TicketService', () => {
  let ticketService: TicketService;
  let mockTicketRepository: jest.Mocked<Repository<Ticket>>;
  let mockPaymentService: jest.Mocked<PaymentService>;
  let mockEventService: jest.Mocked<EventService>;
  let mockCacheManager: jest.Mocked<Cache>;
  let mockQueryRunner: jest.Mocked<QueryRunner>;
  let mockEntityManager: jest.Mocked<EntityManager>;

  beforeEach(() => {
    // Setup repository mocks
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {} as EntityManager,
    } as unknown as jest.Mocked<QueryRunner>;

    mockEntityManager = {
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    mockTicketRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      manager: {
        connection: {
          createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
        },
        transaction: jest.fn(),
      },
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Ticket>>;

    // Setup service mocks
    mockPaymentService = {
      createPaymentIntent: jest.fn(),
      confirmPayment: jest.fn(),
      processRefund: jest.fn(),
    } as unknown as jest.Mocked<PaymentService>;

    mockEventService = {
      validateEventStatus: jest.fn(),
      checkTicketAvailability: jest.fn(),
    } as unknown as jest.Mocked<EventService>;

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<Cache>;

    // Initialize service
    ticketService = new TicketService(
      mockTicketRepository,
      mockPaymentService,
      mockCacheManager
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Ticket Creation', () => {
    it('should create a batch of tickets successfully', async () => {
      const batchData = {
        eventId: faker.string.uuid(),
        type: TicketType.GENERAL,
        price: 2500,
        quantity: 100,
      };

      const mockTicket = {
        id: faker.string.uuid(),
        eventId: batchData.eventId,
        type: batchData.type,
        price: batchData.price,
        status: TicketStatus.AVAILABLE,
      };

      mockEntityManager.save.mockResolvedValue([mockTicket]);
      mockQueryRunner.manager = mockEntityManager;

      const result = await ticketService.createTicketBatch(batchData);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalled();
      expect(result).toHaveLength(100);
      expect(result[0]).toMatchObject(mockTicket);
    });

    it('should rollback transaction on batch creation failure', async () => {
      const batchData = {
        eventId: faker.string.uuid(),
        type: TicketType.GENERAL,
        price: 2500,
        quantity: 100,
      };

      mockEntityManager.save.mockRejectedValue(new Error('Database error'));
      mockQueryRunner.manager = mockEntityManager;

      await expect(ticketService.createTicketBatch(batchData)).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('Ticket Purchase', () => {
    it('should process ticket purchase successfully', async () => {
      const ticketId = faker.string.uuid();
      const userId = faker.string.uuid();
      
      const mockTicket = {
        id: ticketId,
        status: TicketStatus.AVAILABLE,
        price: 2500,
      };

      const mockPaymentIntent = {
        id: faker.string.uuid(),
        status: 'requires_payment_method',
      };

      mockTicketRepository.findOne.mockResolvedValue(mockTicket as Ticket);
      mockPaymentService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);
      mockEntityManager.save.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.RESERVED,
        userId,
        paymentId: mockPaymentIntent.id,
      });

      const result = await ticketService.purchaseTicket(ticketId, userId);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        ticketId,
        expect.objectContaining({
          amount: mockTicket.price,
          currency: 'usd',
        })
      );
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(result.status).toBe(TicketStatus.RESERVED);
      expect(result.userId).toBe(userId);
    });

    it('should handle concurrent ticket purchases', async () => {
      const ticketId = faker.string.uuid();
      const mockTicket = {
        id: ticketId,
        status: TicketStatus.AVAILABLE,
        price: 2500,
      };

      mockTicketRepository.findOne
        .mockResolvedValueOnce(mockTicket as Ticket)
        .mockResolvedValueOnce({ ...mockTicket, status: TicketStatus.RESERVED } as Ticket);

      await expect(
        Promise.all([
          ticketService.purchaseTicket(ticketId, faker.string.uuid()),
          ticketService.purchaseTicket(ticketId, faker.string.uuid()),
        ])
      ).rejects.toThrow('Ticket is not available for purchase');
    });
  });

  describe('Ticket Validation', () => {
    it('should validate ticket successfully', async () => {
      const ticketId = faker.string.uuid();
      const mockTicket = {
        id: ticketId,
        status: TicketStatus.SOLD,
        event: {
          endDate: new Date(Date.now() + 86400000), // Tomorrow
        },
      };

      mockTicketRepository.findOne.mockResolvedValue(mockTicket as Ticket);
      mockCacheManager.get.mockResolvedValue(null);

      const result = await ticketService.validateTicket(ticketId);

      expect(result).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        true,
        300
      );
    });

    it('should return cached validation result', async () => {
      const ticketId = faker.string.uuid();
      mockCacheManager.get.mockResolvedValue(true);

      const result = await ticketService.validateTicket(ticketId);

      expect(result).toBe(true);
      expect(mockTicketRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Ticket Statistics', () => {
    it('should return event ticket statistics', async () => {
      const eventId = faker.string.uuid();
      const mockStats = {
        totalTickets: '100',
        soldTickets: '75',
        availableTickets: '25',
        revenue: '187500',
      };

      mockTicketRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
      });

      mockCacheManager.get.mockResolvedValue(null);

      const result = await ticketService.getEventTicketStats(eventId);

      expect(result).toEqual({
        totalTickets: 100,
        soldTickets: 75,
        availableTickets: 25,
        revenue: 187500,
        refundedTickets: 0,
        averagePrice: 2500,
      });
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return cached statistics', async () => {
      const eventId = faker.string.uuid();
      const cachedStats = {
        totalTickets: 100,
        soldTickets: 75,
        availableTickets: 25,
        revenue: 187500,
        refundedTickets: 0,
        averagePrice: 2500,
      };

      mockCacheManager.get.mockResolvedValue(cachedStats);

      const result = await ticketService.getEventTicketStats(eventId);

      expect(result).toEqual(cachedStats);
      expect(mockTicketRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});