import Redis from 'ioredis'; // v5.3.0
import CircuitBreaker from 'opossum'; // v6.0.0
import { Meter, MeterProvider } from '@opentelemetry/metrics'; // v1.0.0
import crypto from 'crypto';
import { createRedisClient } from '../config/redis.config';
import logger from '../utils/logger.utils';

/**
 * Constants for cache configuration and operation
 */
const CACHE_CONSTANTS = {
  DEFAULT_TTL: 3600,
  MAX_RETRY_ATTEMPTS: 3,
  CIRCUIT_BREAKER_TIMEOUT: 5000,
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32,
  AUTH_TAG_LENGTH: 16,
} as const;

/**
 * Interface for cache operation metrics
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  latency: number[];
}

/**
 * Enhanced service class providing secure Redis caching functionality
 * with monitoring, encryption, and error handling capabilities
 */
export class CacheService {
  private readonly redisClient: Redis;
  private readonly defaultTTL: number;
  private readonly breaker: CircuitBreaker;
  private readonly metrics: CacheMetrics;
  private readonly encryptionKey: Buffer;
  private readonly meterProvider: MeterProvider;
  private readonly meter: Meter;

  constructor() {
    this.redisClient = createRedisClient();
    this.defaultTTL = CACHE_CONSTANTS.DEFAULT_TTL;
    this.metrics = { hits: 0, misses: 0, errors: 0, latency: [] };
    this.encryptionKey = Buffer.from(process.env.CACHE_ENCRYPTION_KEY || crypto.randomBytes(32));

    // Initialize circuit breaker
    this.breaker = new CircuitBreaker(async (operation: Function) => operation(), {
      timeout: CACHE_CONSTANTS.CIRCUIT_BREAKER_TIMEOUT,
      resetTimeout: 10000,
      errorThresholdPercentage: 50,
      volumeThreshold: 10,
    });

    // Setup metrics
    this.meterProvider = new MeterProvider();
    this.meter = this.meterProvider.getMeter('cache-service');
    this.initializeMetrics();
    this.setupEventHandlers();
  }

  /**
   * Sets a value in cache with optional encryption for sensitive data
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds
   * @param encrypt Whether to encrypt the value
   */
  public async set<T>(
    key: string,
    value: T,
    ttl: number = this.defaultTTL,
    encrypt: boolean = false
  ): Promise<boolean> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(key);

    try {
      const valueToCache = encrypt ? this.encrypt(JSON.stringify(value)) : JSON.stringify(value);
      
      const result = await this.breaker.fire(async () => {
        return await this.redisClient.set(cacheKey, valueToCache, 'EX', ttl);
      });

      this.recordMetrics('set', startTime);
      logger.info(`Cache set successful for key: ${cacheKey}`);
      return result === 'OK';
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache set failed', { error, key: cacheKey });
      throw error;
    }
  }

  /**
   * Retrieves and optionally decrypts a value from cache
   * @param key Cache key
   * @param decrypt Whether to decrypt the value
   */
  public async get<T>(key: string, decrypt: boolean = false): Promise<T | null> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(key);

    try {
      const result = await this.breaker.fire(async () => {
        return await this.redisClient.get(cacheKey);
      });

      if (!result) {
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      this.recordMetrics('get', startTime);

      const value = decrypt ? this.decrypt(result) : result;
      return JSON.parse(value);
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache get failed', { error, key: cacheKey });
      throw error;
    }
  }

  /**
   * Retrieves multiple values in a single operation
   * @param keys Array of cache keys
   * @param decrypt Whether to decrypt the values
   */
  public async batchGet<T>(keys: string[], decrypt: boolean = false): Promise<Map<string, T>> {
    const startTime = Date.now();
    const cacheKeys = keys.map(this.generateCacheKey);
    const result = new Map<string, T>();

    try {
      const values = await this.breaker.fire(async () => {
        return await this.redisClient.mget(cacheKeys);
      });

      values.forEach((value, index) => {
        if (value) {
          const parsedValue = decrypt ? this.decrypt(value) : value;
          result.set(keys[index], JSON.parse(parsedValue));
          this.metrics.hits++;
        } else {
          this.metrics.misses++;
        }
      });

      this.recordMetrics('batchGet', startTime);
      return result;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache batch get failed', { error, keys: cacheKeys });
      throw error;
    }
  }

  /**
   * Deletes cache entries matching a pattern
   * @param pattern Pattern to match keys
   */
  public async deletePattern(pattern: string): Promise<number> {
    const startTime = Date.now();
    const cachePattern = this.generateCacheKey(pattern);

    try {
      const keys = await this.redisClient.keys(cachePattern);
      if (keys.length === 0) return 0;

      const deleted = await this.breaker.fire(async () => {
        return await this.redisClient.del(keys);
      });

      this.recordMetrics('delete', startTime);
      logger.info(`Cache pattern deletion successful`, { pattern: cachePattern, deleted });
      return deleted;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache pattern deletion failed', { error, pattern: cachePattern });
      throw error;
    }
  }

  /**
   * Generates a secure cache key with namespace
   */
  private generateCacheKey(key: string): string {
    const namespace = process.env.NODE_ENV || 'development';
    return `${namespace}:${crypto.createHash('sha256').update(key).digest('hex')}`;
  }

  /**
   * Encrypts sensitive cache data
   */
  private encrypt(value: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      CACHE_CONSTANTS.ENCRYPTION_ALGORITHM,
      this.encryptionKey,
      iv
    );
    
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      content: encrypted.toString('hex'),
      tag: tag.toString('hex'),
    });
  }

  /**
   * Decrypts sensitive cache data
   */
  private decrypt(value: string): string {
    const { iv, content, tag } = JSON.parse(value);
    const decipher = crypto.createDecipheriv(
      CACHE_CONSTANTS.ENCRYPTION_ALGORITHM,
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(content, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Initializes OpenTelemetry metrics
   */
  private initializeMetrics(): void {
    this.meter.createHistogram('cache_operation_duration');
    this.meter.createCounter('cache_hits');
    this.meter.createCounter('cache_misses');
    this.meter.createCounter('cache_errors');
  }

  /**
   * Sets up event handlers for monitoring
   */
  private setupEventHandlers(): void {
    this.breaker.on('success', () => {
      logger.info('Circuit breaker: Operation successful');
    });

    this.breaker.on('failure', (error) => {
      logger.error('Circuit breaker: Operation failed', { error });
    });

    this.breaker.on('timeout', () => {
      logger.warn('Circuit breaker: Operation timeout');
    });

    this.breaker.on('reject', () => {
      logger.warn('Circuit breaker: Operation rejected');
    });
  }

  /**
   * Records operation metrics
   */
  private recordMetrics(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.metrics.latency.push(duration);
    
    this.meter.createHistogram('cache_operation_duration').record(duration, {
      operation,
      status: 'success',
    });
  }
}

export default new CacheService();