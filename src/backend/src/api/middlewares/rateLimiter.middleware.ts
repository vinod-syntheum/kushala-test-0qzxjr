/**
 * Enterprise-grade rate limiter middleware implementing tiered rate limiting
 * with sophisticated request tracking, monitoring, and protection mechanisms.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { createRedisClient } from '../../config/redis.config';
import { sendError } from '../../utils/response.utils';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../constants/error.constants';
import { UserService } from '../../services/user.service';
import Logger from '../../utils/logger.utils';

// Rate limiting configuration constants
const DEFAULT_WINDOW_MS = 60000; // 1 minute window
const DEFAULT_TIER_LIMITS = {
  free: 100,    // 100 requests per minute
  pro: 1000,    // 1000 requests per minute
  api: 5000     // 5000 requests per minute
};
const BURST_MULTIPLIER = 1.5;  // Allow 50% burst capacity
const CIRCUIT_BREAKER_THRESHOLD = 0.5; // 50% error rate threshold

/**
 * Configuration interface for rate limiter
 */
interface RateLimitConfig {
  windowMs: number;
  tierLimits: { [tier: string]: number };
  bypassKeys?: string[];
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  skipFailedRequests?: boolean;
}

/**
 * Creates a rate limiter middleware instance with specified configuration
 * @param config Rate limiter configuration
 * @returns Express middleware function
 */
export const createRateLimiter = (config: RateLimitConfig) => {
  const redis = createRedisClient();
  const userService = new UserService(null as any); // Injected by DI in production

  // Default key generator using IP and user ID if available
  const defaultKeyGenerator = (req: Request): string => {
    const userId = (req as any).user?.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `ratelimit:${userId || ip}`;
  };

  const keyGenerator = config.keyGenerator || defaultKeyGenerator;

  // Default rate limit exceeded handler
  const defaultHandler = (req: Request, res: Response) => {
    sendError(
      res,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      'RATE_LIMIT_ERROR',
      [{
        limit: config.tierLimits[(req as any).userTier || 'free'],
        windowMs: config.windowMs,
        remaining: 0
      }]
    );
  };

  const handler = config.handler || defaultHandler;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check bypass keys
      const apiKey = req.headers['x-api-key'];
      if (config.bypassKeys?.includes(apiKey as string)) {
        return next();
      }

      // Determine user tier
      const userTier = await userService.getUserTier((req as any).user?.id) || 'free';
      (req as any).userTier = userTier;

      const key = keyGenerator(req);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Implement sliding window rate limiting
      const multi = redis.multi();
      
      // Remove old requests outside the window
      multi.zremrangebyscore(key, 0, windowStart);
      
      // Count requests in current window
      multi.zcard(key);
      
      // Add current request
      multi.zadd(key, now, `${now}:${req.originalUrl}`);
      
      // Set expiry on the set
      multi.expire(key, Math.ceil(config.windowMs / 1000));

      const [, requestCount] = await multi.exec();
      const currentCount = requestCount?.[1] as number || 0;

      // Calculate limits with burst allowance
      const baseLimit = config.tierLimits[userTier];
      const burstLimit = Math.floor(baseLimit * BURST_MULTIPLIER);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', baseLimit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, baseLimit - currentCount));
      res.setHeader('X-RateLimit-Reset', Math.ceil((windowStart + config.windowMs) / 1000));

      // Check if limit exceeded
      if (currentCount >= burstLimit) {
        // Log rate limit violation
        Logger.warn('Rate limit exceeded', {
          userTier,
          requestCount: currentCount,
          limit: baseLimit,
          burstLimit,
          path: req.path
        });

        return handler(req, res);
      }

      // Circuit breaker implementation
      const errorKey = `${key}:errors`;
      const errorCount = await redis.get(errorKey);
      if (errorCount && (parseInt(errorCount) / currentCount) > CIRCUIT_BREAKER_THRESHOLD) {
        Logger.warn('Circuit breaker triggered', {
          userTier,
          errorRate: parseInt(errorCount) / currentCount,
          path: req.path
        });
        return handler(req, res);
      }

      // Track failed requests if enabled
      if (config.skipFailedRequests) {
        res.on('finish', () => {
          if (res.statusCode >= 400) {
            redis.incr(errorKey);
            redis.expire(errorKey, Math.ceil(config.windowMs / 1000));
          }
        });
      }

      next();
    } catch (error) {
      // Fail open if Redis is unavailable
      Logger.error('Rate limiter error', { error });
      next();
    }
  };
};

/**
 * Default rate limiter middleware instance with standard configuration
 */
export default createRateLimiter({
  windowMs: DEFAULT_WINDOW_MS,
  tierLimits: DEFAULT_TIER_LIMITS,
  skipFailedRequests: true
});