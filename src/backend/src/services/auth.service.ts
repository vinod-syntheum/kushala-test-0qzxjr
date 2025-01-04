/**
 * Authentication Service
 * Version: 1.0.0
 * 
 * Implements secure user authentication with JWT tokens, MFA support,
 * password management, and comprehensive security controls.
 */

import { Injectable } from '@nestjs/common'; // ^10.0.0
import { Repository } from 'typeorm'; // ^0.3.0
import Redis from 'ioredis'; // ^5.0.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // ^2.4.1
import { User } from '../models/postgresql/user.model';
import { 
  LoginCredentials, 
  JwtPayload, 
  TokenResponse, 
  RefreshTokenRequest,
  PasswordResetRequest,
  PasswordResetConfirmation,
  MfaVerification
} from '../interfaces/auth.interface';
import { 
  hashPassword, 
  verifyPassword, 
  generateSecureToken,
  generateTOTP,
  verifyTOTP
} from '../utils/crypto.utils';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from '../utils/auth.utils';
import { SecurityLogger } from '../utils/logger.utils';
import { ERROR_MESSAGES } from '../constants/error.constants';

@Injectable()
export class AuthService {
  private readonly rateLimiter: RateLimiterRedis;

  constructor(
    private readonly userRepository: Repository<User>,
    private readonly redisClient: Redis,
    private readonly securityLogger: SecurityLogger
  ) {
    // Initialize rate limiter with Redis
    this.rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'login_attempt',
      points: 5, // 5 attempts
      duration: 300, // per 5 minutes
      blockDuration: 900 // 15 minutes block
    });
  }

  /**
   * Authenticates user credentials with MFA support
   * @param credentials User login credentials
   * @returns Token response containing JWT pair
   */
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    try {
      // Rate limiting check
      await this.rateLimiter.consume(credentials.email);

      // Find user and verify credentials
      const user = await this.userRepository.findOne({ 
        where: { email: credentials.email.toLowerCase() } 
      });

      if (!user) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      // Verify password
      const isPasswordValid = await verifyPassword(
        credentials.password, 
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      // Check MFA requirement
      if (user.mfaEnabled) {
        if (!credentials.totpCode) {
          return {
            requiresMfa: true,
            userId: user.id,
            tokenType: 'MFA_REQUIRED'
          } as any;
        }

        const isTotpValid = await verifyTOTP(
          credentials.totpCode,
          user.mfaSecret
        );

        if (!isTotpValid) {
          throw new Error(ERROR_MESSAGES.INVALID_MFA_CODE);
        }
      }

      // Generate tokens
      const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        role: user.role,
        mfaEnabled: user.mfaEnabled
      };

      const accessToken = await generateAccessToken(payload);
      const refreshToken = await generateRefreshToken(user.id);

      // Store refresh token in Redis with expiry
      await this.redisClient.setex(
        `refresh_token:${user.id}`,
        7 * 24 * 60 * 60, // 7 days
        refreshToken
      );

      // Log successful login
      this.securityLogger.info('User login successful', {
        userId: user.id,
        email: user.email,
        mfaUsed: user.mfaEnabled
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: 24 * 60 * 60, // 24 hours
        tokenType: 'Bearer'
      };
    } catch (error) {
      this.securityLogger.error('Login failed', {
        email: credentials.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Refreshes access token using valid refresh token
   * @param request Refresh token request
   * @returns New token response
   */
  async refreshToken(request: RefreshTokenRequest): Promise<TokenResponse> {
    try {
      // Verify refresh token
      const payload = await verifyRefreshToken(request.refreshToken);
      
      // Check if token is blacklisted
      const isBlacklisted = await this.redisClient.get(
        `blacklist:${request.refreshToken}`
      );
      
      if (isBlacklisted) {
        throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
      }

      // Get user
      const user = await this.userRepository.findOne({
        where: { id: payload.userId }
      });

      if (!user) {
        throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
      }

      // Generate new tokens
      const newAccessToken = await generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        mfaEnabled: user.mfaEnabled
      });

      const newRefreshToken = await generateRefreshToken(user.id);

      // Blacklist old refresh token
      await this.redisClient.setex(
        `blacklist:${request.refreshToken}`,
        7 * 24 * 60 * 60,
        '1'
      );

      // Store new refresh token
      await this.redisClient.setex(
        `refresh_token:${user.id}`,
        7 * 24 * 60 * 60,
        newRefreshToken
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 24 * 60 * 60,
        tokenType: 'Bearer'
      };
    } catch (error) {
      this.securityLogger.error('Token refresh failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initiates password reset process
   * @param request Password reset request
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: request.email.toLowerCase() }
      });

      if (!user) {
        // Return void to prevent email enumeration
        return;
      }

      // Generate secure reset token
      const resetToken = generateSecureToken(32);
      const resetTokenHash = await hashPassword(resetToken);

      // Store hashed token with expiry
      await this.redisClient.setex(
        `reset_token:${user.id}`,
        30 * 60, // 30 minutes
        resetTokenHash
      );

      // Log reset request
      this.securityLogger.info('Password reset requested', {
        userId: user.id,
        email: user.email
      });

      // Send reset email (implementation not shown)
    } catch (error) {
      this.securityLogger.error('Password reset request failed', {
        email: request.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Completes password reset process
   * @param confirmation Password reset confirmation
   */
  async resetPassword(confirmation: PasswordResetConfirmation): Promise<void> {
    try {
      // Verify token format
      if (!confirmation.token || !confirmation.newPassword) {
        throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
      }

      // Get stored token hash
      const storedHash = await this.redisClient.get(
        `reset_token:${confirmation.token}`
      );

      if (!storedHash) {
        throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
      }

      // Verify token
      const isValid = await verifyPassword(confirmation.token, storedHash);
      if (!isValid) {
        throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
      }

      // Hash new password
      const newPasswordHash = await hashPassword(confirmation.newPassword);

      // Update user password
      await this.userRepository.update(
        { id: confirmation.token },
        { 
          passwordHash: newPasswordHash,
          lastPasswordChange: new Date()
        }
      );

      // Invalidate all existing tokens
      await this.redisClient.del(`refresh_token:${confirmation.token}`);

      // Log password reset
      this.securityLogger.info('Password reset completed', {
        userId: confirmation.token
      });
    } catch (error) {
      this.securityLogger.error('Password reset failed', {
        error: error.message
      });
      throw error;
    }
  }
}