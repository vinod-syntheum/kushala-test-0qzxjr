/**
 * Event Management Integration Tests
 * Version: 1.0.0
 * 
 * Comprehensive integration tests for event management functionality covering
 * API endpoints, service operations, and database interactions.
 */

import { describe, it, beforeEach, afterEach, jest } from 'jest';
import request from 'supertest';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Point } from 'geojson';
import { 
  IEvent, 
  IEventCreate, 
  IEventUpdate, 
  EventStatus 
} from '../../src/interfaces/event.interface';
import { EventService } from '../../src/services/event.service';
import { LocationStatus } from '../../src/interfaces/location.interface';
import { RestaurantStatus } from '../../src/interfaces/restaurant.interface';
import { UserRole } from '../../src/interfaces/auth.interface';
import logger from '../../src/utils/logger.utils';

/**
 * Test data interface for managing test state
 */
interface TestData {
  restaurant: {
    id: string;
    name: string;
    status: RestaurantStatus;
  };
  location: {
    id: string;
    name: string;
    coordinates: Point;
    status: LocationStatus;
  };
  event: {
    id: string;
    name: string;
    status: EventStatus;
  };
  users: {
    owner: { id: string; role: UserRole };
    manager: { id: string; role: UserRole };
  };
}

describe('Event Management Integration Tests', () => {
  let dataSource: DataSource;
  let eventService: EventService;
  let queryRunner: QueryRunner;
  let testData: TestData;

  // Setup test environment
  beforeEach(async () => {
    // Initialize database connection
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.TEST_DATABASE_URL,
      synchronize: true,
      logging: false
    });
    await dataSource.initialize();

    // Create transaction for test isolation
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Initialize services
    eventService = new EventService(
      dataSource.getRepository('Event'),
      dataSource.getRepository('Location'),
      dataSource.getRepository('Restaurant')
    );

    // Setup test data
    testData = await setupTestData(queryRunner);
  });

  // Cleanup after each test
  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
    await dataSource.destroy();
  });

  describe('Event Creation', () => {
    it('should create an event within 15 minutes time limit', async () => {
      const startTime = Date.now();

      const eventData: IEventCreate = {
        restaurantId: testData.restaurant.id,
        locationId: testData.location.id,
        name: 'Wine Tasting Event',
        description: 'An evening of fine wines and cheese pairings',
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        endDate: new Date(Date.now() + 90000000),
        capacity: 50,
        ticketTypes: [
          { type: 'GENERAL', price: 4999, quantity: 40 },
          { type: 'VIP', price: 9999, quantity: 10 }
        ],
        timezone: 'America/New_York'
      };

      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${testData.users.owner.token}`)
        .send(eventData)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe(EventStatus.DRAFT);
      expect(response.body.name).toBe(eventData.name);

      // Verify database state
      const savedEvent = await queryRunner.manager.findOne('Event', {
        where: { id: response.body.id }
      });
      expect(savedEvent).toBeDefined();
      expect(savedEvent.ticketTypes).toHaveLength(2);

      // Verify creation time
      const endTime = Date.now();
      const creationTime = endTime - startTime;
      expect(creationTime).toBeLessThan(900000); // 15 minutes in milliseconds
    });

    it('should validate event data and prevent conflicts', async () => {
      // Create conflicting event
      const existingEvent = await eventService.createEvent({
        ...testData.event,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000)
      });

      // Attempt to create conflicting event
      const conflictingEventData: IEventCreate = {
        ...testData.event,
        startDate: existingEvent.startDate,
        endDate: existingEvent.endDate
      };

      await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${testData.users.owner.token}`)
        .send(conflictingEventData)
        .expect(409);
    });
  });

  describe('Event Updates', () => {
    it('should update event details with validation', async () => {
      const updateData: IEventUpdate = {
        name: 'Updated Wine Tasting',
        description: 'Updated description',
        capacity: 60
      };

      const response = await request(app)
        .patch(`/api/v1/events/${testData.event.id}`)
        .set('Authorization', `Bearer ${testData.users.manager.token}`)
        .send(updateData)
        .expect(200);

      // Verify response
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.capacity).toBe(updateData.capacity);

      // Verify audit trail
      const auditLog = await queryRunner.manager.find('EventAuditLog', {
        where: { eventId: testData.event.id }
      });
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].changes).toContain('name');
    });

    it('should prevent updates to cancelled events', async () => {
      // Cancel event first
      await eventService.cancelEvent(testData.event.id, 'Test cancellation');

      await request(app)
        .patch(`/api/v1/events/${testData.event.id}`)
        .set('Authorization', `Bearer ${testData.users.owner.token}`)
        .send({ name: 'Should Not Update' })
        .expect(400);
    });
  });

  describe('Event Publishing', () => {
    it('should publish event with complete data', async () => {
      const response = await request(app)
        .post(`/api/v1/events/${testData.event.id}/publish`)
        .set('Authorization', `Bearer ${testData.users.owner.token}`)
        .expect(200);

      expect(response.body.status).toBe(EventStatus.PUBLISHED);

      // Verify visibility
      const publicEvent = await request(app)
        .get(`/api/v1/public/events/${testData.event.id}`)
        .expect(200);

      expect(publicEvent.body).toBeDefined();
    });

    it('should prevent publishing incomplete events', async () => {
      const incompleteEvent = await eventService.createEvent({
        ...testData.event,
        description: '', // Missing required field
      });

      await request(app)
        .post(`/api/v1/events/${incompleteEvent.id}/publish`)
        .set('Authorization', `Bearer ${testData.users.owner.token}`)
        .expect(400);
    });
  });

  describe('Event Cancellation', () => {
    it('should cancel event and process refunds', async () => {
      // Create test tickets
      await createTestTickets(testData.event.id, 5);

      const response = await request(app)
        .post(`/api/v1/events/${testData.event.id}/cancel`)
        .set('Authorization', `Bearer ${testData.users.owner.token}`)
        .send({ reason: 'Venue unavailable' })
        .expect(200);

      expect(response.body.status).toBe(EventStatus.CANCELLED);

      // Verify refund processing
      const tickets = await queryRunner.manager.find('Ticket', {
        where: { eventId: testData.event.id }
      });
      expect(tickets.every(ticket => ticket.status === 'REFUNDED')).toBe(true);
    });
  });
});

/**
 * Helper function to setup test data with transaction support
 */
async function setupTestData(queryRunner: QueryRunner): Promise<TestData> {
  // Create test restaurant
  const restaurant = await queryRunner.manager.save('Restaurant', {
    name: 'Test Restaurant',
    status: RestaurantStatus.ACTIVE,
    settings: {
      maxLocations: 3,
      timezone: 'America/New_York'
    }
  });

  // Create test location
  const location = await queryRunner.manager.save('Location', {
    restaurantId: restaurant.id,
    name: 'Test Location',
    coordinates: {
      type: 'Point',
      coordinates: [-73.935242, 40.730610]
    },
    status: LocationStatus.ACTIVE
  });

  // Create test event
  const event = await queryRunner.manager.save('Event', {
    restaurantId: restaurant.id,
    locationId: location.id,
    name: 'Test Event',
    description: 'Test Description',
    status: EventStatus.DRAFT
  });

  // Create test users
  const owner = await queryRunner.manager.save('User', {
    email: 'owner@test.com',
    role: UserRole.OWNER
  });

  const manager = await queryRunner.manager.save('User', {
    email: 'manager@test.com',
    role: UserRole.MANAGER
  });

  return {
    restaurant,
    location,
    event,
    users: { owner, manager }
  };
}

/**
 * Helper function to create test tickets
 */
async function createTestTickets(eventId: string, count: number): Promise<void> {
  const tickets = Array(count).fill(null).map(() => ({
    eventId,
    status: 'SOLD',
    price: 4999,
    type: 'GENERAL'
  }));

  await queryRunner.manager.save('Ticket', tickets);
}