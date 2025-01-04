import { Client, GeocodeResponse } from '@googlemaps/google-maps-services-js'; // v3.3.0
import { Point } from 'geojson'; // v2.0.0
import CircuitBreaker from 'opossum'; // v6.0.0
import RateLimiter from 'bottleneck'; // v2.19.5
import { injectable } from 'tsyringe'; // v3.0.0
import { mapsConfig } from '../config/maps.config';
import { IAddress } from '../interfaces/location.interface';
import { CacheService } from '../services/cache.service';
import logger from '../utils/logger.utils';

/**
 * Constants for Maps service configuration
 */
const MAPS_CONSTANTS = {
  CACHE_TTL: 86400, // 24 hours
  RATE_LIMIT: {
    REQUESTS_PER_SECOND: 50,
    MAX_CONCURRENT: 10
  },
  CIRCUIT_BREAKER: {
    TIMEOUT: 5000,
    ERROR_THRESHOLD: 50,
    RESET_TIMEOUT: 30000
  },
  CACHE_KEYS: {
    GEOCODE: 'geocode:',
    REVERSE: 'reverse:'
  }
} as const;

/**
 * Enhanced Maps service providing geocoding and location validation with caching,
 * rate limiting, and monitoring capabilities
 */
@injectable()
export class MapsService {
  private readonly mapsClient: Client;
  private readonly rateLimiter: RateLimiter;
  private readonly apiBreaker: CircuitBreaker;

  constructor(
    private readonly cacheService: CacheService
  ) {
    // Initialize Google Maps client
    this.mapsClient = new Client({
      config: {
        timeout: mapsConfig.timeout,
        retry_timeout: 3000,
        language: 'en',
        region: mapsConfig.region
      }
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      reservoir: MAPS_CONSTANTS.RATE_LIMIT.REQUESTS_PER_SECOND,
      reservoirRefreshAmount: MAPS_CONSTANTS.RATE_LIMIT.REQUESTS_PER_SECOND,
      reservoirRefreshInterval: 1000,
      maxConcurrent: MAPS_CONSTANTS.RATE_LIMIT.MAX_CONCURRENT
    });

    // Initialize circuit breaker
    this.apiBreaker = new CircuitBreaker(
      async (operation: Function) => operation(),
      {
        timeout: MAPS_CONSTANTS.CIRCUIT_BREAKER.TIMEOUT,
        errorThresholdPercentage: MAPS_CONSTANTS.CIRCUIT_BREAKER.ERROR_THRESHOLD,
        resetTimeout: MAPS_CONSTANTS.CIRCUIT_BREAKER.RESET_TIMEOUT
      }
    );

    this.setupCircuitBreakerEvents();
  }

  /**
   * Geocodes an address to coordinates with caching and error handling
   * @param address Address to geocode
   * @returns GeoJSON Point containing coordinates
   */
  public async geocodeAddress(address: IAddress): Promise<Point> {
    const cacheKey = `${MAPS_CONSTANTS.CACHE_KEYS.GEOCODE}${this.generateAddressKey(address)}`;
    
    try {
      // Check cache first
      const cachedResult = await this.cacheService.get<Point>(cacheKey);
      if (cachedResult) {
        logger.info('Geocoding cache hit', { address });
        return cachedResult;
      }

      // Rate limited geocoding request
      const geocodeOperation = async () => {
        const response = await this.mapsClient.geocode({
          params: {
            address: this.formatAddress(address),
            key: mapsConfig.apiKey
          }
        });

        if (!response.data.results.length) {
          throw new Error('No geocoding results found');
        }

        const { lat, lng } = response.data.results[0].geometry.location;
        const point: Point = {
          type: 'Point',
          coordinates: [lng, lat]
        };

        // Cache successful result
        await this.cacheService.set(cacheKey, point, MAPS_CONSTANTS.CACHE_TTL);
        return point;
      };

      // Execute with rate limiting and circuit breaker
      return await this.rateLimiter.schedule(() => 
        this.apiBreaker.fire(() => geocodeOperation())
      );

    } catch (error) {
      logger.error('Geocoding failed', { error, address });
      throw error;
    }
  }

  /**
   * Reverse geocodes coordinates to address with caching
   * @param coordinates GeoJSON Point to reverse geocode
   * @returns Formatted address object
   */
  public async reverseGeocode(coordinates: Point): Promise<IAddress> {
    const cacheKey = `${MAPS_CONSTANTS.CACHE_KEYS.REVERSE}${coordinates.coordinates.join(',')}`;
    
    try {
      // Check cache first
      const cachedResult = await this.cacheService.get<IAddress>(cacheKey);
      if (cachedResult) {
        logger.info('Reverse geocoding cache hit', { coordinates });
        return cachedResult;
      }

      // Rate limited reverse geocoding request
      const reverseGeocodeOperation = async () => {
        const response = await this.mapsClient.reverseGeocode({
          params: {
            latlng: {
              lat: coordinates.coordinates[1],
              lng: coordinates.coordinates[0]
            },
            key: mapsConfig.apiKey
          }
        });

        if (!response.data.results.length) {
          throw new Error('No reverse geocoding results found');
        }

        const result = response.data.results[0];
        const address = this.parseGoogleAddress(result.address_components);

        // Cache successful result
        await this.cacheService.set(cacheKey, address, MAPS_CONSTANTS.CACHE_TTL);
        return address;
      };

      // Execute with rate limiting and circuit breaker
      return await this.rateLimiter.schedule(() => 
        this.apiBreaker.fire(() => reverseGeocodeOperation())
      );

    } catch (error) {
      logger.error('Reverse geocoding failed', { error, coordinates });
      throw error;
    }
  }

  /**
   * Validates an address using Google Maps API
   * @param address Address to validate
   * @returns Boolean indicating if address is valid
   */
  public async validateAddress(address: IAddress): Promise<boolean> {
    try {
      const validationOperation = async () => {
        const response = await this.mapsClient.placeAutocomplete({
          params: {
            input: this.formatAddress(address),
            key: mapsConfig.apiKey,
            types: ['address']
          }
        });

        return response.data.predictions.length > 0;
      };

      // Execute with rate limiting and circuit breaker
      return await this.rateLimiter.schedule(() => 
        this.apiBreaker.fire(() => validationOperation())
      );

    } catch (error) {
      logger.error('Address validation failed', { error, address });
      throw error;
    }
  }

  /**
   * Formats address object into string for API requests
   */
  private formatAddress(address: IAddress): string {
    return `${address.street}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;
  }

  /**
   * Generates cache key from address object
   */
  private generateAddressKey(address: IAddress): string {
    return `${address.street}:${address.city}:${address.state}:${address.country}:${address.postalCode}`;
  }

  /**
   * Parses Google Maps address components into IAddress format
   */
  private parseGoogleAddress(components: any[]): IAddress {
    const address: Partial<IAddress> = {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      unit: '',
      formatted: ''
    };

    components.forEach(component => {
      const type = component.types[0];
      switch (type) {
        case 'street_number':
          address.street = component.long_name;
          break;
        case 'route':
          address.street = `${address.street} ${component.long_name}`.trim();
          break;
        case 'locality':
          address.city = component.long_name;
          break;
        case 'administrative_area_level_1':
          address.state = component.short_name;
          break;
        case 'country':
          address.country = component.long_name;
          break;
        case 'postal_code':
          address.postalCode = component.long_name;
          break;
        case 'subpremise':
          address.unit = component.long_name;
          break;
      }
    });

    address.formatted = this.formatAddress(address as IAddress);
    return address as IAddress;
  }

  /**
   * Sets up circuit breaker event handlers
   */
  private setupCircuitBreakerEvents(): void {
    this.apiBreaker.on('open', () => {
      logger.warn('Maps API circuit breaker opened');
    });

    this.apiBreaker.on('close', () => {
      logger.info('Maps API circuit breaker closed');
    });

    this.apiBreaker.on('halfOpen', () => {
      logger.info('Maps API circuit breaker half-open');
    });

    this.apiBreaker.on('fallback', () => {
      logger.warn('Maps API circuit breaker fallback triggered');
    });
  }
}

export default MapsService;