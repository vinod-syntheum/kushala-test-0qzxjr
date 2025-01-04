import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals'; // ^29.0.0
import { Repository } from 'typeorm'; // ^0.3.0
import Redis from 'ioredis'; // ^5.0.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // ^2.4.1
import { AuthService } from '../../../src/services/auth.service';
import { SecurityLogger } from '../../../src/utils/logger.utils';
import { UserRole } from '../../../src/interfaces/auth.interface';
import { User } from '../../../src/models/postgresql/user.model';
import { ERROR_MESSAGES } from '../../../src/constants/error.constants';

// Mock dependencies
jest.mock('ioredis');
jest.mock('rate-limiter-flexible');
jest.mock('../../../src/utils/logger.utils');

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let redisClient: jest.Mocked<Redis>;
  let securityLogger: jest.Mocked<SecurityLogger>;
  let rateLimiter: jest.Mocked<RateLimiterRedis>;

  // Test data
  const mockUser: Partial<User> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$salt$hash',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.OWNER,
    mfaEnabled: true,
    mfaSecret: 'JBSWY3DPEHPK3PXP',
    lastPasswordChange: new Date(),
    accountStatus: 'ACTIVE'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocks
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn()
    } as unknown as jest.Mocked<Repository<User>>;

    redisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn()
    } as unknown as jest.Mocked<Redis>;

    securityLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as unknown as jest.Mocked<SecurityLogger>;

    rateLimiter = {
      consume: jest.fn(),
      penalty: jest.fn(),
      delete: jest.fn()
    } as unknown as jest.Mocked<RateLimiterRedis>;

    // Initialize service
    authService = new AuthService(
      userRepository,
      redisClient,
      securityLogger
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('login', () => {
    test('should successfully authenticate user with valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        totpCode: '123456'
      };

      userRepository.findOne.mockResolvedValue(mockUser as User);
      rateLimiter.consume.mockResolvedValue({ remainingPoints: 4 });
      redisClient.setex.mockResolvedValue('OK');

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.expiresIn).toBe(24 * 60 * 60);
      expect(result.tokenType).toBe('Bearer');
      expect(securityLogger.info).toHaveBeenCalledWith(
        'User login successful',
        expect.any(Object)
      );
    });

    test('should enforce rate limiting on login attempts', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      rateLimiter.consume.mockRejectedValue(new Error('Rate limit exceeded'));

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Rate limit exceeded');
      expect(securityLogger.error).toHaveBeenCalledWith(
        'Login failed',
        expect.any(Object)
      );
    });

    test('should require MFA verification when enabled', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'ValidPassword123!'
      };

      userRepository.findOne.mockResolvedValue(mockUser as User);
      rateLimiter.consume.mockResolvedValue({ remainingPoints: 4 });

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result).toHaveProperty('requiresMfa', true);
      expect(result).toHaveProperty('userId', mockUser.id);
      expect(result).toHaveProperty('tokenType', 'MFA_REQUIRED');
    });

    test('should reject invalid MFA codes', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        totpCode: '000000'
      };

      userRepository.findOne.mockResolvedValue(mockUser as User);
      rateLimiter.consume.mockResolvedValue({ remainingPoints: 4 });

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow(ERROR_MESSAGES.INVALID_MFA_CODE);
      expect(securityLogger.error).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    test('should successfully refresh tokens with valid refresh token', async () => {
      // Arrange
      const refreshRequest = {
        refreshToken: 'valid.refresh.token'
      };

      redisClient.get.mockResolvedValue(null); // Token not blacklisted
      userRepository.findOne.mockResolvedValue(mockUser as User);

      // Act
      const result = await authService.refreshToken(refreshRequest);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.expiresIn).toBe(24 * 60 * 60);
      expect(redisClient.setex).toHaveBeenCalledTimes(2); // Blacklist old + store new
    });

    test('should reject blacklisted refresh tokens', async () => {
      // Arrange
      const refreshRequest = {
        refreshToken: 'blacklisted.refresh.token'
      };

      redisClient.get.mockResolvedValue('1'); // Token is blacklisted

      // Act & Assert
      await expect(authService.refreshToken(refreshRequest))
        .rejects.toThrow(ERROR_MESSAGES.INVALID_TOKEN);
      expect(securityLogger.error).toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    test('should initiate password reset for valid user', async () => {
      // Arrange
      const resetRequest = {
        email: 'test@example.com'
      };

      userRepository.findOne.mockResolvedValue(mockUser as User);
      redisClient.setex.mockResolvedValue('OK');

      // Act
      await authService.requestPasswordReset(resetRequest);

      // Assert
      expect(redisClient.setex).toHaveBeenCalled();
      expect(securityLogger.info).toHaveBeenCalledWith(
        'Password reset requested',
        expect.any(Object)
      );
    });

    test('should not reveal user existence during password reset', async () => {
      // Arrange
      const resetRequest = {
        email: 'nonexistent@example.com'
      };

      userRepository.findOne.mockResolvedValue(null);

      // Act
      await authService.requestPasswordReset(resetRequest);

      // Assert
      expect(redisClient.setex).not.toHaveBeenCalled();
      expect(securityLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    test('should successfully reset password with valid token', async () => {
      // Arrange
      const resetConfirmation = {
        token: 'valid.reset.token',
        newPassword: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!'
      };

      redisClient.get.mockResolvedValue(mockUser.passwordHash);
      userRepository.update.mockResolvedValue({ affected: 1 });

      // Act
      await authService.resetPassword(resetConfirmation);

      // Assert
      expect(userRepository.update).toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalled();
      expect(securityLogger.info).toHaveBeenCalledWith(
        'Password reset completed',
        expect.any(Object)
      );
    });

    test('should reject invalid reset tokens', async () => {
      // Arrange
      const resetConfirmation = {
        token: 'invalid.reset.token',
        newPassword: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!'
      };

      redisClient.get.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.resetPassword(resetConfirmation))
        .rejects.toThrow(ERROR_MESSAGES.INVALID_TOKEN);
      expect(securityLogger.error).toHaveBeenCalled();
    });
  });

  describe('setupMFA', () => {
    test('should successfully set up MFA for user', async () => {
      // Arrange
      const userId = mockUser.id!;
      userRepository.findOne.mockResolvedValue(mockUser as User);
      userRepository.save.mockResolvedValue({ ...mockUser, mfaEnabled: true } as User);

      // Act
      const result = await authService.setupMFA(userId);

      // Assert
      expect(result).toHaveProperty('secretKey');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('recoveryKeys');
      expect(userRepository.save).toHaveBeenCalled();
      expect(securityLogger.info).toHaveBeenCalledWith(
        'MFA setup completed',
        expect.any(Object)
      );
    });
  });

  describe('verifyMFA', () => {
    test('should successfully verify valid TOTP code', async () => {
      // Arrange
      const verifyRequest = {
        userId: mockUser.id!,
        totpCode: '123456'
      };

      userRepository.findOne.mockResolvedValue(mockUser as User);

      // Act
      const result = await authService.verifyMFA(verifyRequest);

      // Assert
      expect(result).toBe(true);
      expect(securityLogger.info).toHaveBeenCalledWith(
        'MFA verification successful',
        expect.any(Object)
      );
    });

    test('should reject invalid TOTP codes', async () => {
      // Arrange
      const verifyRequest = {
        userId: mockUser.id!,
        totpCode: '000000'
      };

      userRepository.findOne.mockResolvedValue(mockUser as User);

      // Act & Assert
      await expect(authService.verifyMFA(verifyRequest))
        .rejects.toThrow(ERROR_MESSAGES.INVALID_MFA_CODE);
      expect(securityLogger.error).toHaveBeenCalled();
    });
  });
});