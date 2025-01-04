/**
 * Main Server Entry Point
 * Version: 1.0.0
 * 
 * Initializes and starts the Express application server with comprehensive error handling,
 * security monitoring, and graceful shutdown capabilities.
 */

import http from 'http';
import helmet from 'helmet';
import { Registry, collectDefaultMetrics } from 'prom-client';
import app from './app';
import logger from './utils/logger.utils';

// Initialize Prometheus metrics
const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

// Environment variables with defaults
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVER_TIMEOUT = parseInt(process.env.SERVER_TIMEOUT || '60000', 10);
const KEEP_ALIVE_TIMEOUT = parseInt(process.env.KEEP_ALIVE_TIMEOUT || '65000', 10);
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT || '30000', 10);

/**
 * Normalizes port into a number, string, or false with validation
 * @param val Port value to normalize
 * @returns Normalized port value
 */
const normalizePort = (val: string | number): number | string | boolean => {
  const port = parseInt(val as string, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
};

// Create HTTP server
const server = http.createServer(app);

// Set server timeouts
server.timeout = SERVER_TIMEOUT;
server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;

// Track active connections for graceful shutdown
let connections = new Set<any>();
server.on('connection', connection => {
  connections.add(connection);
  connection.on('close', () => connections.delete(connection));
});

/**
 * Enhanced error event handler for HTTP server with security logging
 * @param error Error object
 */
const onError = (error: NodeJS.ErrnoException): void => {
  const correlationId = crypto.randomUUID();

  if (error.syscall !== 'listen') {
    logger.error('Server error', {
      correlationId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error('Port requires elevated privileges', {
        correlationId,
        port: PORT
      });
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error('Port is already in use', {
        correlationId,
        port: PORT
      });
      process.exit(1);
      break;
    default:
      throw error;
  }
};

/**
 * Success handler when server starts listening with metrics recording
 */
const onListening = (): void => {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? `pipe ${addr}`
    : `port ${addr?.port}`;

  logger.info('Server started', {
    environment: NODE_ENV,
    binding: bind,
    nodeVersion: process.version,
    pid: process.pid
  });

  // Record server start in metrics
  metricsRegistry.setToCurrentTime('server_start_timestamp');
};

/**
 * Enhanced graceful server shutdown with connection draining
 */
const gracefulShutdown = async (): Promise<void> => {
  logger.info('Initiating graceful shutdown');

  // Stop accepting new connections
  server.close(() => {
    logger.info('Server closed');
  });

  // Set shutdown timeout
  const shutdownTimer = setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  try {
    // Close all existing connections
    for (const connection of connections) {
      connection.end();
    }
    connections.clear();

    // Record shutdown metrics
    metricsRegistry.setToCurrentTime('server_shutdown_timestamp');

    logger.info('Graceful shutdown completed');
    clearTimeout(shutdownTimer);
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    clearTimeout(shutdownTimer);
    process.exit(1);
  }
};

/**
 * Health check implementation
 * @returns Server health status
 */
const healthCheck = async (): Promise<boolean> => {
  try {
    // Basic health checks
    const memoryUsage = process.memoryUsage();
    const healthStatus = {
      uptime: process.uptime(),
      memoryUsage: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed
      },
      activeConnections: connections.size
    };

    // Record health metrics
    metricsRegistry.setToCurrentTime('health_check_timestamp');
    metricsRegistry.getMetric('process_memory_usage_bytes')?.set(memoryUsage.heapUsed);

    logger.debug('Health check completed', healthStatus);
    return true;
  } catch (error) {
    logger.error('Health check failed', { error });
    return false;
  }
};

// Start server
const port = normalizePort(PORT);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Process handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Uncaught error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error });
  gracefulShutdown();
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection', { reason });
  gracefulShutdown();
});

// Export server for testing
export default server;