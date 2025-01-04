import Redis from 'ioredis'; // v5.3.0
import type { ProcessEnv } from '../types/environment';

/**
 * Constants for Redis configuration
 */
const REDIS_CONSTANTS = {
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_INITIAL_DELAY: 1000,
  POOL_MIN_SIZE: 5,
  POOL_MAX_SIZE: 20,
  HEALTH_CHECK_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 10000,
} as const;

/**
 * Interface for Redis connection pool metrics
 */
interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
}

/**
 * Redis configuration object with enterprise-grade features
 */
export const redisConfig = {
  retryStrategy: (times: number) => {
    if (times > REDIS_CONSTANTS.RETRY_MAX_ATTEMPTS) {
      return null; // Stop retrying
    }
    return Math.min(
      times * REDIS_CONSTANTS.RETRY_INITIAL_DELAY,
      REDIS_CONSTANTS.CONNECTION_TIMEOUT
    );
  },
  
  maxRetriesPerRequest: REDIS_CONSTANTS.RETRY_MAX_ATTEMPTS,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  
  connectionPool: {
    min: REDIS_CONSTANTS.POOL_MIN_SIZE,
    max: REDIS_CONSTANTS.POOL_MAX_SIZE,
    acquireTimeoutMillis: REDIS_CONSTANTS.CONNECTION_TIMEOUT,
  },
  
  tls: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  } : undefined,
  
  monitoring: {
    healthCheckInterval: REDIS_CONSTANTS.HEALTH_CHECK_INTERVAL,
    collectMetrics: true,
  },
  
  commandTimeout: REDIS_CONSTANTS.CONNECTION_TIMEOUT,
  disconnectTimeout: REDIS_CONSTANTS.CONNECTION_TIMEOUT,
  lazyConnect: true,
  showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
};

/**
 * Creates and returns a configured Redis client instance with advanced features
 * including connection pooling, health checks, and monitoring
 */
export const createRedisClient = (): Redis => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not defined');
  }

  const client = new Redis(redisUrl, {
    ...redisConfig,
    connectionName: `restaurant-platform-${process.env.NODE_ENV}`,
  });

  // Connection event handlers
  client.on('connect', () => {
    console.info('Redis client connected successfully');
  });

  client.on('error', (error: Error) => {
    console.error('Redis client error:', error);
  });

  client.on('close', () => {
    console.warn('Redis connection closed');
  });

  client.on('reconnecting', (timeToReconnect: number) => {
    console.info(`Redis client reconnecting in ${timeToReconnect}ms`);
  });

  // Monitor connection pool metrics
  let poolMetrics: ConnectionPoolMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
  };

  client.on('ready', () => {
    setInterval(() => {
      client.info('clients').then((info) => {
        const metrics = parseRedisInfo(info);
        poolMetrics = {
          ...poolMetrics,
          ...metrics,
        };
      });
    }, REDIS_CONSTANTS.HEALTH_CHECK_INTERVAL);
  });

  return client;
};

/**
 * Performs comprehensive health check on Redis connection and connection pool
 */
export const healthCheck = async (client: Redis): Promise<boolean> => {
  try {
    // Check basic connectivity
    const pingResponse = await client.ping();
    if (pingResponse !== 'PONG') {
      return false;
    }

    // Check memory usage
    const info = await client.info('memory');
    const usedMemory = parseRedisMemoryInfo(info);
    if (usedMemory > 0.9) { // Alert if memory usage > 90%
      console.warn('Redis memory usage critical:', usedMemory);
    }

    // Verify command processing
    const testKey = `health_check_${Date.now()}`;
    await client.set(testKey, '1', 'EX', 10);
    const testValue = await client.get(testKey);
    if (testValue !== '1') {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
};

/**
 * Helper function to parse Redis INFO command output for connection metrics
 */
const parseRedisInfo = (info: string): Partial<ConnectionPoolMetrics> => {
  const metrics: Partial<ConnectionPoolMetrics> = {};
  const lines = info.split('\n');

  for (const line of lines) {
    if (line.includes('connected_clients')) {
      metrics.activeConnections = parseInt(line.split(':')[1], 10);
    }
    if (line.includes('blocked_clients')) {
      metrics.waitingRequests = parseInt(line.split(':')[1], 10);
    }
  }

  return metrics;
};

/**
 * Helper function to parse Redis memory usage information
 */
const parseRedisMemoryInfo = (info: string): number => {
  const lines = info.split('\n');
  let usedMemory = 0;
  let totalMemory = 0;

  for (const line of lines) {
    if (line.includes('used_memory:')) {
      usedMemory = parseInt(line.split(':')[1], 10);
    }
    if (line.includes('total_system_memory:')) {
      totalMemory = parseInt(line.split(':')[1], 10);
    }
  }

  return totalMemory ? usedMemory / totalMemory : 0;
};