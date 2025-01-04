/**
 * Location Service Implementation
 * Version: 1.0.0
 * 
 * Service module for managing restaurant location operations with integrated maps functionality,
 * caching, and comprehensive error handling.
 */

import { Injectable, UseInterceptors } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Point } from 'geojson';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { LocationModel } from '../../models/postgresql/location.model';
import { ILocation, ILocationCreate, ILocationUpdate, LocationStatus, IAddress } from '../../interfaces/location.interface';
import { MapsService } from '../maps.service';
import { CacheService } from '../cache.service';
import logger from '../../utils/logger.utils';

/**
 * Constants for location service configuration
 */
const LOCATION_CONSTANTS = {
  CACHE_TTL: 86400, // 24 hours
  MAX_LOCATIONS: 3,
  RATE_LIMIT: {
    POINTS: 50,
    DURATION: 3600 // 1 hour
  },
  CACHE_KEYS: {
    LOCATION: 'location:',
    GEOCODE: 'geocode:'
  }
} as const;

/**
 * Service class for managing restaurant location operations with enhanced validation,
 * caching, and error handling capabilities
 */
@Injectable()
@UseInterceptors(CacheInterceptor)
export class LocationService {
  constructor(
    private readonly locationRepository: Repository<LocationModel>,
    private readonly mapsService: MapsService,
    private readonly cacheService: CacheService,
    private readonly logger: typeof logger,
    private readonly rateLimiter: RateLimiterRedis
  ) {}

  /**
   * Creates a new restaurant location with validation and geocoding
   * @param locationData Location creation data
   * @returns Created location
   */
  public async createLocation(locationData: ILocationCreate): Promise<ILocation> {
    const correlationId = crypto.randomUUID();
    this.logger.info('Creating new location', { correlationId, restaurantId: locationData.restaurantId });

    try {
      // Start transaction
      const queryRunner = this.locationRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Validate location limit
        await this.validateLocationLimit(locationData.restaurantId);

        // Check address in cache
        const cacheKey = `${LOCATION_CONSTANTS.CACHE_KEYS.GEOCODE}${this.generateAddressKey(locationData.address)}`;
        let coordinates = await this.cacheService.get<Point>(cacheKey);

        if (!coordinates) {
          // Rate limit check for maps API
          await this.rateLimiter.consume(locationData.restaurantId);

          // Validate and geocode address
          await this.mapsService.validateAddress(locationData.address);
          coordinates = await this.mapsService.geocodeAddress(locationData.address);

          // Cache geocoding results
          await this.cacheService.set(cacheKey, coordinates, LOCATION_CONSTANTS.CACHE_TTL);
        }

        // Create location entity
        const location = this.locationRepository.create({
          ...locationData,
          coordinates,
          status: LocationStatus.ACTIVE
        });

        // Validate operating hours and timezone
        await location.validateOperatingHours();

        // Save location
        const savedLocation = await queryRunner.manager.save(location);
        await queryRunner.commitTransaction();

        this.logger.info('Location created successfully', { 
          correlationId, 
          locationId: savedLocation.id 
        });

        return savedLocation;

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

    } catch (error) {
      this.logger.error('Location creation failed', { 
        correlationId, 
        error,
        restaurantId: locationData.restaurantId 
      });
      throw error;
    }
  }

  /**
   * Updates an existing location with validation
   * @param locationId Location ID
   * @param updateData Location update data
   * @returns Updated location
   */
  public async updateLocation(
    locationId: string,
    updateData: ILocationUpdate
  ): Promise<ILocation> {
    const correlationId = crypto.randomUUID();
    this.logger.info('Updating location', { correlationId, locationId });

    try {
      const location = await this.locationRepository.findOne({ 
        where: { id: locationId } 
      });

      if (!location) {
        throw new Error('Location not found');
      }

      // If address is being updated, revalidate and geocode
      if (updateData.address) {
        await this.rateLimiter.consume(location.restaurantId);
        await this.mapsService.validateAddress(updateData.address);
        const coordinates = await this.mapsService.geocodeAddress(updateData.address);
        updateData.coordinates = coordinates;
      }

      // Update and validate
      Object.assign(location, updateData);
      await location.validateOperatingHours();

      const updatedLocation = await this.locationRepository.save(location);

      // Clear cache
      const cacheKey = `${LOCATION_CONSTANTS.CACHE_KEYS.LOCATION}${locationId}`;
      await this.cacheService.deletePattern(cacheKey);

      this.logger.info('Location updated successfully', { 
        correlationId, 
        locationId 
      });

      return updatedLocation;

    } catch (error) {
      this.logger.error('Location update failed', { 
        correlationId, 
        error,
        locationId 
      });
      throw error;
    }
  }

  /**
   * Retrieves a location by ID with caching
   * @param locationId Location ID
   * @returns Location data
   */
  public async getLocation(locationId: string): Promise<ILocation> {
    const cacheKey = `${LOCATION_CONSTANTS.CACHE_KEYS.LOCATION}${locationId}`;

    try {
      // Check cache
      const cachedLocation = await this.cacheService.get<ILocation>(cacheKey);
      if (cachedLocation) {
        return cachedLocation;
      }

      // Fetch from database
      const location = await this.locationRepository.findOne({ 
        where: { id: locationId } 
      });

      if (!location) {
        throw new Error('Location not found');
      }

      // Cache result
      await this.cacheService.set(cacheKey, location, LOCATION_CONSTANTS.CACHE_TTL);

      return location;

    } catch (error) {
      this.logger.error('Location retrieval failed', { error, locationId });
      throw error;
    }
  }

  /**
   * Retrieves all locations for a restaurant
   * @param restaurantId Restaurant ID
   * @returns Array of locations
   */
  public async getRestaurantLocations(restaurantId: string): Promise<ILocation[]> {
    try {
      return await this.locationRepository.find({
        where: { restaurantId },
        order: { createdAt: 'ASC' }
      });
    } catch (error) {
      this.logger.error('Restaurant locations retrieval failed', { 
        error, 
        restaurantId 
      });
      throw error;
    }
  }

  /**
   * Validates that restaurant has not exceeded location limit
   * @param restaurantId Restaurant ID
   */
  private async validateLocationLimit(restaurantId: string): Promise<void> {
    const activeLocations = await this.locationRepository.count({
      where: { 
        restaurantId,
        status: LocationStatus.ACTIVE
      }
    });

    if (activeLocations >= LOCATION_CONSTANTS.MAX_LOCATIONS) {
      throw new Error(`Maximum location limit of ${LOCATION_CONSTANTS.MAX_LOCATIONS} reached`);
    }
  }

  /**
   * Generates cache key from address
   * @param address Location address
   */
  private generateAddressKey(address: IAddress): string {
    return `${address.street}:${address.city}:${address.state}:${address.country}:${address.postalCode}`;
  }
}