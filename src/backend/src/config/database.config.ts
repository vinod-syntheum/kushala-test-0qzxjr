import { DataSource } from 'typeorm'; // v0.3.0
import { connect, Connection } from 'mongoose'; // v6.0.0
import { createClient, RedisClientType } from 'redis'; // v4.0.0
import { createLogger, format, transports, Logger } from 'winston'; // v3.8.0

// Create database logger instance
const dbLogger: Logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/database.log' })
  ]
});

// Database monitoring metrics
const metrics = {
  operations: {
    success: 0,
    failed: 0,
  },
  connectionAttempts: 0,
  lastReconnectTimestamp: null as number | null,
};

/**
 * Creates and configures PostgreSQL connection using TypeORM DataSource
 * with advanced pooling, monitoring, and environment-specific optimizations
 */
export async function createPostgresConnection(): Promise<DataSource> {
  metrics.connectionAttempts++;
  
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['src/entities/**/*.ts'],
    migrations: ['src/migrations/**/*.ts'],
    synchronize: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true,
      ca: process.env.SSL_CERT
    } : false,
    poolSize: process.env.NODE_ENV === 'production' ? 10 : 5,
    connectTimeoutMS: 10000,
    extra: {
      max: 10,
      min: 2,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
    },
    logging: process.env.NODE_ENV === 'development',
    logger: 'advanced-console'
  });

  try {
    await dataSource.initialize();
    metrics.lastReconnectTimestamp = Date.now();
    metrics.operations.success++;
    
    dbLogger.info('PostgreSQL connection established successfully', {
      metrics,
      poolSize: dataSource.driver.pool?.size
    });

    // Set up connection monitoring
    dataSource.driver.pool?.on('error', (err: Error) => {
      metrics.operations.failed++;
      dbLogger.error('PostgreSQL pool error', { error: err.message, metrics });
    });

    return dataSource;
  } catch (error) {
    metrics.operations.failed++;
    dbLogger.error('PostgreSQL connection failed', {
      error: (error as Error).message,
      metrics,
      retryAttempt: metrics.connectionAttempts
    });
    throw error;
  }
}

/**
 * Establishes connection to MongoDB with replica set support,
 * connection pooling, and comprehensive monitoring
 */
export async function createMongoConnection(): Promise<Connection> {
  metrics.connectionAttempts++;

  const options = {
    autoIndex: process.env.NODE_ENV !== 'production',
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    maxPoolSize: process.env.NODE_ENV === 'production' ? 10 : 5,
    minPoolSize: 2,
    heartbeatFrequencyMS: 30000,
    retryWrites: true,
    retryReads: true,
  };

  try {
    const connection = await connect(process.env.MONGODB_URI!, options);
    metrics.lastReconnectTimestamp = Date.now();
    metrics.operations.success++;

    dbLogger.info('MongoDB connection established successfully', {
      metrics,
      poolSize: connection.connection.client.topology?.connections?.size
    });

    // Monitor connection events
    connection.connection.on('disconnected', () => {
      metrics.operations.failed++;
      dbLogger.warn('MongoDB disconnected', { metrics });
    });

    connection.connection.on('reconnected', () => {
      metrics.operations.success++;
      metrics.lastReconnectTimestamp = Date.now();
      dbLogger.info('MongoDB reconnected', { metrics });
    });

    return connection;
  } catch (error) {
    metrics.operations.failed++;
    dbLogger.error('MongoDB connection failed', {
      error: (error as Error).message,
      metrics,
      retryAttempt: metrics.connectionAttempts
    });
    throw error;
  }
}

/**
 * Creates and configures Redis client with cluster support,
 * connection monitoring, and environment-specific optimizations
 */
export async function createRedisConnection(): Promise<RedisClientType> {
  metrics.connectionAttempts++;

  const client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          dbLogger.error('Redis max retries exceeded', { metrics });
          return new Error('Redis max retries exceeded');
        }
        return Math.min(retries * 100, 3000);
      },
      connectTimeout: 10000,
    },
    database: process.env.NODE_ENV === 'test' ? 1 : 0,
    keyPrefix: `${process.env.NODE_ENV}:`,
  });

  // Monitor Redis events
  client.on('error', (err: Error) => {
    metrics.operations.failed++;
    dbLogger.error('Redis client error', { error: err.message, metrics });
  });

  client.on('connect', () => {
    metrics.operations.success++;
    metrics.lastReconnectTimestamp = Date.now();
    dbLogger.info('Redis client connected', { metrics });
  });

  client.on('reconnecting', () => {
    dbLogger.warn('Redis client reconnecting', { metrics });
  });

  try {
    await client.connect();
    return client;
  } catch (error) {
    metrics.operations.failed++;
    dbLogger.error('Redis connection failed', {
      error: (error as Error).message,
      metrics,
      retryAttempt: metrics.connectionAttempts
    });
    throw error;
  }
}