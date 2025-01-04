/**
 * Authentication Integration Tests
 * Version: 1.0.0
 * 
 * Comprehensive integration tests for authentication functionality including
 * JWT token authentication, MFA verification, password management, and security controls.
 */

import { describe, it, beforeEach, afterEach, expect, jest } from 'jest'; // ^29.0.0
import { Repository, getRepository } from 'typeorm'; // ^0.3.0
import { AuthService } from '../../src/services/auth.service';
import { User } from '../../src/models/postgresql/user.model';
import {
  LoginCredentials,
  JwtPayload,
  TokenResponse,
  RefreshTokenRequest,
  PasswordResetRequest,
  PasswordResetConfirmation,
  UserRole
} from '../../src/interfaces/auth.interface';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../src/constants/error.constants';
import Redis from 'ioredis';

describe('Authentication Integration Tests', () => {
  let authService: AuthService;
  let userRepository: Repository<User>;
  let redisClient: Redis;
  let testUser: User;

  // Test data
  const validCredentials: LoginCredentials = {
    email: 'test@example.com',
    password: 'Test123!@#',
    totpCode: '123456'
  };

  const invalidCredentials: LoginCredentials = {
    email: 'test@example.com',
    password: 'wrongpassword'
  };

  beforeEach(async () => {
    // Initialize test database and dependencies
    userRepository = getRepository(User);
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 1 // Use separate DB for tests
    });

    authService = new AuthService(userRepository, redisClient);

    // Create test user
    testUser = await userRepository.save({
      email: validCredentials.email,
      passwordHash: await authService['hashPassword'](validCredentials.password),
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.OWNER,
      mfaEnabled: true,
      accountStatus: 'ACTIVE'
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await userRepository.delete({ email: validCredentials.email });
    await redisClient.flushdb();
  });

  describe('Login Authentication', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const response = await authService.login(validCredentials);

      expect(response).toBeDefined();
      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.tokenType).toBe('Bearer');
      expect(response.expiresIn).toBe(24 * 60 * 60); // 24 hours
    });

    it('should require MFA when enabled', async () => {
      const credentials = { ...validCredentials };
      delete credentials.totpCode;

      const response = await authService.login(credentials);

      expect(response.requiresMfa).toBe(true);
      expect(response.tokenType).toBe('MFA_REQUIRED');
      expect(response.userId).toBe(testUser.id);
    });

    it('should reject invalid credentials', async () => {
      await expect(authService.login(invalidCredentials))
        .rejects
        .toThrow(ERROR_MESSAGES.INVALID_CREDENTIALS);
    });

    it('should enforce rate limiting on failed attempts', async () => {
      // Attempt multiple failed logins
      const attempts = 6; // Exceeds rate limit
      const promises = Array(attempts).fill(null).map(() => 
        authService.login(invalidCredentials).catch(() => {})
      );

      await Promise.all(promises);

      // Next attempt should be rate limited
      await expect(authService.login(invalidCredentials))
        .rejects
        .toThrow(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
    });
  });

  describe('Token Management', () => {
    let validTokens: TokenResponse;

    beforeEach(async () => {
      validTokens = await authService.login(validCredentials);
    });

    it('should refresh tokens with valid refresh token', async () => {
      const refreshRequest: RefreshTokenRequest = {
        refreshToken: validTokens.refreshToken
      };

      const newTokens = await authService.refreshToken(refreshRequest);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(validTokens.accessToken);
      expect(newTokens.refreshToken).not.toBe(validTokens.refreshToken);
    });

    it('should reject blacklisted refresh tokens', async () => {
      // Blacklist the refresh token
      await redisClient.setex(
        `blacklist:${validTokens.refreshToken}`,
        300,
        '1'
      );

      const refreshRequest: RefreshTokenRequest = {
        refreshToken: validTokens.refreshToken
      };

      await expect(authService.refreshToken(refreshRequest))
        .rejects
        .toThrow(ERROR_MESSAGES.INVALID_TOKEN);
    });

    it('should handle concurrent token refresh attempts', async () => {
      const refreshRequest: RefreshTokenRequest = {
        refreshToken: validTokens.refreshToken
      };

      // Attempt concurrent refreshes
      const [firstRefresh, secondRefresh] = await Promise.allSettled([
        authService.refreshToken(refreshRequest),
        authService.refreshToken(refreshRequest)
      ]);

      expect(firstRefresh.status).toBe('fulfilled');
      expect(secondRefresh.status).toBe('rejected');
    });
  });

  describe('Password Management', () => {
    it('should initiate password reset process', async () => {
      const resetRequest: PasswordResetRequest = {
        email: validCredentials.email
      };

      await expect(authService.requestPasswordReset(resetRequest))
        .resolves
        .not
        .toThrow();

      // Verify reset token was stored
      const resetToken = await redisClient.get(`reset_token:${testUser.id}`);
      expect(resetToken).toBeDefined();
    });

    it('should complete password reset with valid token', async () => {
      // Request password reset
      await authService.requestPasswordReset({
        email: validCredentials.email
      });

      // Get stored reset token
      const resetToken = await redisClient.get(`reset_token:${testUser.id}`);

      const resetConfirmation: PasswordResetConfirmation = {
        token: resetToken!,
        newPassword: 'NewTest123!@#',
        confirmPassword: 'NewTest123!@#'
      };

      await expect(authService.resetPassword(resetConfirmation))
        .resolves
        .not
        .toThrow();

      // Verify old tokens are invalidated
      const oldTokens = await redisClient.get(`refresh_token:${testUser.id}`);
      expect(oldTokens).toBeNull();
    });

    it('should reject expired reset tokens', async () => {
      // Create expired reset token
      await redisClient.setex(
        `reset_token:${testUser.id}`,
        1, // 1 second expiry
        'expired_token'
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1500));

      const resetConfirmation: PasswordResetConfirmation = {
        token: 'expired_token',
        newPassword: 'NewTest123!@#',
        confirmPassword: 'NewTest123!@#'
      };

      await expect(authService.resetPassword(resetConfirmation))
        .rejects
        .toThrow(ERROR_MESSAGES.INVALID_TOKEN);
    });
  });

  describe('Security Controls', () => {
    it('should maintain audit logs for security events', async () => {
      const logSpy = jest.spyOn(authService['securityLogger'], 'info');

      await authService.login(validCredentials);

      expect(logSpy).toHaveBeenCalledWith(
        'User login successful',
        expect.objectContaining({
          userId: testUser.id,
          email: testUser.email,
          mfaUsed: true
        })
      );
    });

    it('should handle suspicious login patterns', async () => {
      // Simulate login attempts from different IPs
      const suspiciousAttempts = Array(3).fill(null).map((_, index) => 
        authService.login({
          ...invalidCredentials,
          metadata: { ip: `192.168.1.${index}` }
        }).catch(() => {})
      );

      await Promise.all(suspiciousAttempts);

      // Verify security logging
      const logSpy = jest.spyOn(authService['securityLogger'], 'warn');
      expect(logSpy).toHaveBeenCalledWith(
        'Suspicious login pattern detected',
        expect.any(Object)
      );
    });

    it('should enforce session limits', async () => {
      // Create multiple sessions
      const sessions = Array(5).fill(null).map(() => 
        authService.login(validCredentials)
      );

      const results = await Promise.all(sessions);
      const uniqueTokens = new Set(results.map(r => r.refreshToken));

      // Verify session limit enforcement
      expect(uniqueTokens.size).toBeLessThanOrEqual(3); // Max 3 active sessions
    });
  });
});