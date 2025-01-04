// @ts-check
/// <reference types="node" />

declare namespace NodeJS {
  /**
   * Extended ProcessEnv interface providing comprehensive type definitions
   * for the restaurant digital presence platform's environment variables
   * @extends NodeJS.ProcessEnv
   */
  interface ProcessEnv {
    /**
     * Application environment mode
     * @required
     */
    NODE_ENV: 'development' | 'staging' | 'production' | 'test';

    /**
     * Server port number
     * @required
     */
    PORT: string;

    /**
     * PostgreSQL connection string for primary database
     * @required
     */
    DATABASE_URL: string;

    /**
     * MongoDB connection string for content storage
     * @required
     */
    MONGODB_URI: string;

    /**
     * Redis connection string for caching and sessions
     * @required
     */
    REDIS_URL: string;

    /**
     * Secret key for JWT token signing and verification
     * @required
     */
    JWT_SECRET: string;

    /**
     * JWT access token expiration time
     * @required
     * @example '24h'
     */
    JWT_ACCESS_EXPIRES_IN: string;

    /**
     * JWT refresh token expiration time
     * @required
     * @example '7d'
     */
    JWT_REFRESH_EXPIRES_IN: string;

    /**
     * AWS region for service deployment
     * @required
     */
    AWS_REGION: string;

    /**
     * AWS IAM access key ID
     * @required
     */
    AWS_ACCESS_KEY_ID: string;

    /**
     * AWS IAM secret access key
     * @required
     */
    AWS_SECRET_ACCESS_KEY: string;

    /**
     * AWS S3 bucket name for media storage
     * @required
     */
    AWS_S3_BUCKET: string;

    /**
     * AWS CloudFront domain for CDN distribution
     * @required
     */
    AWS_CLOUDFRONT_DOMAIN: string;

    /**
     * Stripe publishable key for client-side integration
     * @required
     */
    STRIPE_PUBLIC_KEY: string;

    /**
     * Stripe secret key for server-side operations
     * @required
     */
    STRIPE_SECRET_KEY: string;

    /**
     * Stripe webhook signing secret for event verification
     * @required
     */
    STRIPE_WEBHOOK_SECRET: string;

    /**
     * SendGrid API key for email service integration
     * @required
     */
    SENDGRID_API_KEY: string;

    /**
     * SendGrid verified sender email address
     * @required
     */
    SENDGRID_FROM_EMAIL: string;

    /**
     * Google Maps API key for location services
     * @required
     */
    GOOGLE_MAPS_API_KEY: string;

    /**
     * Rate limiting window in milliseconds
     * @required
     */
    RATE_LIMIT_WINDOW_MS: string;

    /**
     * Maximum requests allowed per rate limit window
     * @required
     */
    RATE_LIMIT_MAX_REQUESTS: string;

    /**
     * Secret key for session encryption
     * @required
     */
    SESSION_SECRET: string;

    /**
     * Allowed CORS origins (comma-separated)
     * @required
     */
    CORS_ORIGIN: string;
  }
}