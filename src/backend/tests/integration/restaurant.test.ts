/**
 * Restaurant Integration Tests
 * Version: 1.0.0
 * 
 * Comprehensive integration tests for restaurant management functionality including
 * CRUD operations, domain validation, location management, and content relationships.
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals'; // ^29.0.0
import { getRepository, Repository, Connection, QueryRunner } from 'typeorm'; // ^0.3.0
import { faker } from '@faker-js/faker'; // ^8.0.0
import { RestaurantService } from '../../src/services/restaurant.service';
import { RestaurantModel } from '../../src/models/postgresql/restaurant.model';
import { IRestaurant, RestaurantStatus } from '../../src/interfaces/restaurant.interface';
import CacheService from '../../src/services/cache.service';
import logger from '../../src/utils/logger.utils';

// Test configuration constants
const TEST_TIMEOUT = 30000;
const MAX_LOCATIONS = 3;

describe('Restaurant Integration Tests', () => {
  let restaurantService: RestaurantService;
  let restaurantRepository: Repository<RestaurantModel>;
  let queryRunner: QueryRunner;
  let connection: Connection;
  let cacheService: CacheService;

  beforeEach(async () => {
    // Initialize test database connection
    connection = await getRepository(RestaurantModel).manager.connection;
    queryRunner = connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Initialize repositories and services
    restaurantRepository = queryRunner.manager.getRepository(RestaurantModel);
    cacheService = new CacheService();
    restaurantService = new RestaurantService(cacheService);

    // Clear test data
    await cacheService.deletePattern('restaurant:*');
  }, TEST_TIMEOUT);

  afterEach(async () => {
    // Rollback transaction and release resources
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  describe('Restaurant CRUD Operations', () => {
    it('should create a new restaurant with valid data', async () => {
      const testData = {
        ownerId: faker.string.uuid(),
        name: faker.company.name(),
        domain: `${faker.internet.domainWord()}.com`,
        settings: {
          maxLocations: 3,
          enableOnlinePresence: true,
          timezone: 'UTC',
          currency: 'USD',
          enableEvents: true
        }
      };

      const restaurant = await restaurantService.createRestaurant(
        queryRunner.manager,
        testData
      );

      expect(restaurant).toBeDefined();
      expect(restaurant.id).toBeDefined();
      expect(restaurant.name).toBe(testData.name);
      expect(restaurant.domain).toBe(testData.domain.toLowerCase());
      expect(restaurant.status).toBe(RestaurantStatus.ACTIVE);
    }, TEST_TIMEOUT);

    it('should fail to create restaurant with invalid domain', async () => {
      const testData = {
        ownerId: faker.string.uuid(),
        name: faker.company.name(),
        domain: 'invalid-domain',
        settings: {
          maxLocations: 3,
          enableOnlinePresence: true,
          timezone: 'UTC',
          currency: 'USD',
          enableEvents: true
        }
      };

      await expect(
        restaurantService.createRestaurant(queryRunner.manager, testData)
      ).rejects.toThrow();
    });

    it('should retrieve restaurant by ID with cache integration', async () => {
      // Create test restaurant
      const testRestaurant = await createTestRestaurant();
      
      // First fetch - should hit database
      const restaurant1 = await restaurantService.getRestaurantById(testRestaurant.id);
      expect(restaurant1).toBeDefined();
      
      // Second fetch - should hit cache
      const restaurant2 = await restaurantService.getRestaurantById(testRestaurant.id);
      expect(restaurant2).toEqual(restaurant1);
    });

    it('should update restaurant with valid changes', async () => {
      const testRestaurant = await createTestRestaurant();
      const updateData = {
        name: faker.company.name(),
        settings: {
          ...testRestaurant.settings,
          enableEvents: false
        }
      };

      const updated = await restaurantService.updateRestaurant(
        queryRunner.manager,
        testRestaurant.id,
        updateData
      );

      expect(updated.name).toBe(updateData.name);
      expect(updated.settings.enableEvents).toBe(false);
    });

    it('should soft delete restaurant and maintain referential integrity', async () => {
      const testRestaurant = await createTestRestaurant();
      
      const deleted = await restaurantService.deleteRestaurant(
        queryRunner.manager,
        testRestaurant.id
      );

      expect(deleted).toBe(true);

      // Verify soft delete
      const found = await restaurantRepository.findOne({
        where: { id: testRestaurant.id },
        withDeleted: true
      });
      expect(found?.deletedAt).toBeDefined();
    });
  });

  describe('Location Management', () => {
    it('should enforce maximum location limit', async () => {
      const testRestaurant = await createTestRestaurant();
      
      // Attempt to exceed location limit
      const locations = Array(MAX_LOCATIONS + 1).fill(null).map(() => ({
        name: faker.company.name(),
        address: {
          street: faker.location.street(),
          city: faker.location.city(),
          state: faker.location.state(),
          country: faker.location.country(),
          postalCode: faker.location.zipCode()
        }
      }));

      await expect(
        restaurantRepository.save({
          ...testRestaurant,
          locations
        })
      ).rejects.toThrow();
    });

    it('should validate location data integrity', async () => {
      const testRestaurant = await createTestRestaurant();
      const invalidLocation = {
        name: '', // Invalid empty name
        address: {
          street: faker.location.street(),
          city: faker.location.city(),
          state: faker.location.state(),
          country: faker.location.country(),
          postalCode: faker.location.zipCode()
        }
      };

      await expect(
        restaurantRepository.save({
          ...testRestaurant,
          locations: [invalidLocation]
        })
      ).rejects.toThrow();
    });
  });

  describe('Domain and Content Integration', () => {
    it('should validate domain uniqueness', async () => {
      const testRestaurant = await createTestRestaurant();
      const duplicateData = {
        ownerId: faker.string.uuid(),
        name: faker.company.name(),
        domain: testRestaurant.domain,
        settings: {
          maxLocations: 3,
          enableOnlinePresence: true,
          timezone: 'UTC',
          currency: 'USD',
          enableEvents: true
        }
      };

      await expect(
        restaurantService.createRestaurant(queryRunner.manager, duplicateData)
      ).rejects.toThrow('Domain is already in use');
    });

    it('should handle domain updates with DNS validation', async () => {
      const testRestaurant = await createTestRestaurant();
      const newDomain = `${faker.internet.domainWord()}.com`;

      const updated = await restaurantService.updateRestaurant(
        queryRunner.manager,
        testRestaurant.id,
        { domain: newDomain }
      );

      expect(updated.domain).toBe(newDomain.toLowerCase());
    });
  });

  // Helper function to create test restaurant
  async function createTestRestaurant(): Promise<IRestaurant> {
    const testData = {
      ownerId: faker.string.uuid(),
      name: faker.company.name(),
      domain: `${faker.internet.domainWord()}.com`,
      settings: {
        maxLocations: 3,
        enableOnlinePresence: true,
        timezone: 'UTC',
        currency: 'USD',
        enableEvents: true
      }
    };

    return await restaurantService.createRestaurant(queryRunner.manager, testData);
  }
});