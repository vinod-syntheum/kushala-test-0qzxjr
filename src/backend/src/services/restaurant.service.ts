/**
 * Restaurant Service Implementation
 * Version: 1.0.0
 * 
 * Provides comprehensive business logic for restaurant management with enhanced
 * security, caching, and audit logging capabilities.
 */

import { Repository, getRepository, Transaction, TransactionManager, EntityManager } from 'typeorm'; // ^0.3.0
import { promises as dns } from 'dns'; // ^18.0.0
import winston from 'winston'; // ^3.8.0
import { z } from 'zod'; // For validation
import { RestaurantModel } from '../models/postgresql/restaurant.model';
import { IRestaurant, IRestaurantCreate, RestaurantStatus } from '../interfaces/restaurant.interface';
import CacheService from '../services/cache.service';
import logger from '../utils/logger.utils';
import { ERROR_TYPES, ERROR_MESSAGES } from '../constants/error.constants';

/**
 * Validation schema for restaurant creation
 */
const restaurantCreateSchema = z.object({
  ownerId: z.string().uuid(),
  name: z.string().min(1).max(255),
  domain: z.string().regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i),
  settings: z.object({
    maxLocations: z.number().min(1).max(3),
    enableOnlinePresence: z.boolean(),
    timezone: z.string(),
    currency: z.string().length(3),
    enableEvents: z.boolean()
  })
});

/**
 * Enhanced service class for restaurant management with comprehensive
 * security, caching, and audit features
 */
export class RestaurantService {
  private readonly restaurantRepository: Repository<RestaurantModel>;
  private readonly cacheService: CacheService;
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'restaurant:';

  constructor(cacheService: CacheService) {
    this.restaurantRepository = getRepository(RestaurantModel);
    this.cacheService = cacheService;
  }

  /**
   * Creates a new restaurant with enhanced validation and security
   * @param restaurantData Restaurant creation data
   * @returns Created restaurant entity
   */
  @Transaction()
  public async createRestaurant(
    @TransactionManager() manager: EntityManager,
    restaurantData: IRestaurantCreate
  ): Promise<IRestaurant> {
    try {
      // Validate input data
      const validatedData = restaurantCreateSchema.parse(restaurantData);

      // Verify domain availability and DNS
      await this.validateDomain(validatedData.domain);

      // Create restaurant entity
      const restaurant = manager.create(RestaurantModel, {
        ...validatedData,
        status: RestaurantStatus.ACTIVE
      });

      // Save with transaction
      const savedRestaurant = await manager.save(restaurant);

      // Invalidate relevant caches
      await this.cacheService.deletePattern(`${this.CACHE_PREFIX}owner:${validatedData.ownerId}:*`);

      // Audit logging
      logger.info('Restaurant created successfully', {
        restaurantId: savedRestaurant.id,
        ownerId: validatedData.ownerId
      });

      return savedRestaurant;
    } catch (error) {
      logger.error('Restaurant creation failed', { error, data: restaurantData });
      throw error;
    }
  }

  /**
   * Retrieves restaurant by ID with caching
   * @param id Restaurant ID
   * @returns Restaurant entity
   */
  public async getRestaurantById(id: string): Promise<IRestaurant | null> {
    const cacheKey = `${this.CACHE_PREFIX}id:${id}`;

    try {
      // Check cache first
      const cached = await this.cacheService.get<IRestaurant>(cacheKey);
      if (cached) return cached;

      // Fetch from database
      const restaurant = await this.restaurantRepository.findOne({
        where: { id },
        relations: ['locations']
      });

      if (restaurant) {
        // Cache the result
        await this.cacheService.set(cacheKey, restaurant, this.CACHE_TTL);
      }

      return restaurant || null;
    } catch (error) {
      logger.error('Error fetching restaurant by ID', { error, restaurantId: id });
      throw error;
    }
  }

  /**
   * Updates restaurant information with validation
   * @param id Restaurant ID
   * @param updateData Update data
   * @returns Updated restaurant entity
   */
  @Transaction()
  public async updateRestaurant(
    @TransactionManager() manager: EntityManager,
    id: string,
    updateData: Partial<IRestaurant>
  ): Promise<IRestaurant> {
    try {
      const restaurant = await manager.findOne(RestaurantModel, {
        where: { id }
      });

      if (!restaurant) {
        throw new Error(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      }

      // If domain is being updated, validate it
      if (updateData.domain && updateData.domain !== restaurant.domain) {
        await this.validateDomain(updateData.domain);
      }

      // Update and save
      const updatedRestaurant = await manager.save(RestaurantModel, {
        ...restaurant,
        ...updateData,
        updatedAt: new Date()
      });

      // Invalidate caches
      await this.cacheService.deletePattern(`${this.CACHE_PREFIX}*${id}*`);

      // Audit logging
      logger.info('Restaurant updated successfully', {
        restaurantId: id,
        updates: Object.keys(updateData)
      });

      return updatedRestaurant;
    } catch (error) {
      logger.error('Restaurant update failed', { error, restaurantId: id });
      throw error;
    }
  }

  /**
   * Validates domain availability and DNS configuration
   * @param domain Domain to validate
   * @throws Error if domain is invalid or unavailable
   */
  private async validateDomain(domain: string): Promise<void> {
    try {
      // Check DNS records
      await dns.lookup(domain);

      // Check domain availability in database
      const existing = await this.restaurantRepository.findOne({
        where: { domain }
      });

      if (existing) {
        throw new Error('Domain is already in use');
      }
    } catch (error) {
      logger.error('Domain validation failed', { error, domain });
      throw error;
    }
  }

  /**
   * Retrieves restaurants by owner ID with pagination
   * @param ownerId Owner ID
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated restaurant list
   */
  public async getRestaurantsByOwner(
    ownerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ restaurants: IRestaurant[]; total: number }> {
    const cacheKey = `${this.CACHE_PREFIX}owner:${ownerId}:page:${page}:limit:${limit}`;

    try {
      // Check cache
      const cached = await this.cacheService.get<{ restaurants: IRestaurant[]; total: number }>(cacheKey);
      if (cached) return cached;

      // Calculate offset
      const offset = (page - 1) * limit;

      // Fetch from database
      const [restaurants, total] = await this.restaurantRepository.findAndCount({
        where: { ownerId },
        relations: ['locations'],
        skip: offset,
        take: limit,
        order: { createdAt: 'DESC' }
      });

      const result = { restaurants, total };

      // Cache results
      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      logger.error('Error fetching restaurants by owner', { error, ownerId });
      throw error;
    }
  }

  /**
   * Deletes a restaurant with all related data
   * @param id Restaurant ID
   * @returns boolean indicating success
   */
  @Transaction()
  public async deleteRestaurant(
    @TransactionManager() manager: EntityManager,
    id: string
  ): Promise<boolean> {
    try {
      const restaurant = await manager.findOne(RestaurantModel, {
        where: { id }
      });

      if (!restaurant) {
        throw new Error(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      }

      // Soft delete the restaurant
      await manager.softDelete(RestaurantModel, id);

      // Invalidate caches
      await this.cacheService.deletePattern(`${this.CACHE_PREFIX}*${id}*`);

      // Audit logging
      logger.info('Restaurant deleted successfully', { restaurantId: id });

      return true;
    } catch (error) {
      logger.error('Restaurant deletion failed', { error, restaurantId: id });
      throw error;
    }
  }
}

export default new RestaurantService(CacheService);