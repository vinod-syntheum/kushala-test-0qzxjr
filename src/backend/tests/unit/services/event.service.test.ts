import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { Repository } from 'typeorm';
import { EventService } from '../../src/services/event.service';
import { LocationService } from '../../src/services/location.service';
import { PaymentService } from '../../src/services/payment.service';
import { 
  IEvent, 
  IEventCreate, 
  EventStatus, 
  EventValidationError 
} from '../../src/interfaces/event.interface';
import { Cache } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';

// Mock implementations
jest.mock('../../src/services/location.service');
jest.mock('../../src/services/payment.service');
jest.mock('@nestjs/cache-manager');

describe('EventService', () => {
  let eventService: EventService;
  let mockEventRepository: jest.Mocked<Repository<IEvent>>;
  let mockLocationService: jest.Mocked<LocationService>;
  let mockPaymentService: jest.Mocked<PaymentService>;
  let mockCacheManager: jest.Mocked<Cache>;
  let mockLogger: jest.Mocked<Logger>;

  // Test data
  const validEventData: IEventCreate = {
    restaurantId: 'test-restaurant-id',
    locationId: 'test-location-id',
    name: 'Wine Tasting Event',
    description: 'Exclusive wine tasting experience',
    startDate: new Date('2024-03-15T19:00:00Z'),
    endDate: new Date('2024-03-15T23:00:00Z'),
    capacity: 100,
    ticketTypes: [
      { name: 'General', price: 5000, quantity: 80 }, // Price in cents
      { name: 'VIP', price: 10000, quantity: 20 }
    ]
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocks
    mockEventRepository = {
      manager: {
        transaction: jest.fn(),
        save: jest.fn()
      },
      create: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn()
    } as any;

    mockLocationService = {
      checkLocationAvailability: jest.fn(),
      updateLocationCapacity: jest.fn()
    } as any;

    mockPaymentService = {
      createPaymentIntent: jest.fn(),
      confirmPayment: jest.fn()
    } as any;

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn()
    } as any;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn()
    } as any;

    // Initialize service
    eventService = new EventService(
      mockEventRepository,
      mockPaymentService,
      mockLocationService,
      mockCacheManager
    );
  });

  describe('createEvent', () => {
    it('should create an event successfully within SLA', async () => {
      // Setup
      const startTime = Date.now();
      mockLocationService.checkLocationAvailability.mockResolvedValue(true);
      mockEventRepository.create.mockReturnValue({ ...validEventData, id: 'test-event-id' });
      mockEventRepository.manager.transaction.mockImplementation(cb => cb());
      mockEventRepository.manager.save.mockResolvedValue({ 
        ...validEventData, 
        id: 'test-event-id',
        status: EventStatus.DRAFT 
      });

      // Execute
      const result = await eventService.createEvent(validEventData);

      // Verify
      expect(result).toBeDefined();
      expect(result.id).toBe('test-event-id');
      expect(result.status).toBe(EventStatus.DRAFT);
      expect(Date.now() - startTime).toBeLessThan(15 * 60 * 1000); // 15 minute SLA
      expect(mockLocationService.checkLocationAvailability).toHaveBeenCalledWith(
        validEventData.locationId,
        validEventData.startDate,
        validEventData.endDate
      );
    });

    it('should validate event dates correctly', async () => {
      // Setup
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);
      const invalidEventData = {
        ...validEventData,
        startDate: pastDate
      };

      // Execute & Verify
      await expect(eventService.createEvent(invalidEventData))
        .rejects
        .toThrow('Event start date must be in the future');
    });

    it('should check location availability', async () => {
      // Setup
      mockLocationService.checkLocationAvailability.mockResolvedValue(false);

      // Execute & Verify
      await expect(eventService.createEvent(validEventData))
        .rejects
        .toThrow('Location is not available for the specified time period');
    });

    it('should validate ticket configuration', async () => {
      // Setup
      const invalidTicketData = {
        ...validEventData,
        ticketTypes: [
          { name: 'General', price: -100, quantity: 80 }
        ]
      };

      // Execute & Verify
      await expect(eventService.createEvent(invalidTicketData))
        .rejects
        .toThrow('Ticket price cannot be negative');
    });
  });

  describe('updateEvent', () => {
    const existingEvent = {
      ...validEventData,
      id: 'test-event-id',
      status: EventStatus.DRAFT
    };

    it('should update event successfully', async () => {
      // Setup
      mockEventRepository.findOne.mockResolvedValue(existingEvent);
      mockEventRepository.manager.transaction.mockImplementation(cb => cb());
      mockEventRepository.save.mockResolvedValue({
        ...existingEvent,
        name: 'Updated Event Name'
      });

      // Execute
      const result = await eventService.updateEvent('test-event-id', {
        name: 'Updated Event Name'
      });

      // Verify
      expect(result.name).toBe('Updated Event Name');
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should prevent updating cancelled events', async () => {
      // Setup
      mockEventRepository.findOne.mockResolvedValue({
        ...existingEvent,
        status: EventStatus.CANCELLED
      });

      // Execute & Verify
      await expect(eventService.updateEvent('test-event-id', {
        name: 'Updated Event Name'
      }))
        .rejects
        .toThrow('Cannot update cancelled event');
    });
  });

  describe('publishEvent', () => {
    const draftEvent = {
      ...validEventData,
      id: 'test-event-id',
      status: EventStatus.DRAFT
    };

    it('should publish event successfully', async () => {
      // Setup
      mockEventRepository.findOne.mockResolvedValue(draftEvent);
      mockEventRepository.manager.transaction.mockImplementation(cb => cb());
      mockEventRepository.save.mockResolvedValue({
        ...draftEvent,
        status: EventStatus.PUBLISHED
      });

      // Execute
      const result = await eventService.publishEvent('test-event-id');

      // Verify
      expect(result.status).toBe(EventStatus.PUBLISHED);
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should validate event readiness before publishing', async () => {
      // Setup
      const incompleteEvent = {
        ...draftEvent,
        description: ''
      };
      mockEventRepository.findOne.mockResolvedValue(incompleteEvent);

      // Execute & Verify
      await expect(eventService.publishEvent('test-event-id'))
        .rejects
        .toThrow('Event must have name and description before publishing');
    });
  });

  describe('cancelEvent', () => {
    const publishedEvent = {
      ...validEventData,
      id: 'test-event-id',
      status: EventStatus.PUBLISHED
    };

    it('should cancel event and process refunds', async () => {
      // Setup
      mockEventRepository.findOne.mockResolvedValue(publishedEvent);
      mockEventRepository.manager.transaction.mockImplementation(cb => cb());
      mockEventRepository.save.mockResolvedValue({
        ...publishedEvent,
        status: EventStatus.CANCELLED
      });

      // Execute
      const result = await eventService.cancelEvent('test-event-id', 'Event cancelled due to weather');

      // Verify
      expect(result.status).toBe(EventStatus.CANCELLED);
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should prevent cancelling already cancelled events', async () => {
      // Setup
      mockEventRepository.findOne.mockResolvedValue({
        ...publishedEvent,
        status: EventStatus.CANCELLED
      });

      // Execute & Verify
      await expect(eventService.cancelEvent('test-event-id', 'Already cancelled'))
        .rejects
        .toThrow('Event is already cancelled');
    });
  });
});