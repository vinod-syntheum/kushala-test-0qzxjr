/**
 * @fileoverview Unit tests for authentication utility functions
 * @version 1.0.0
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import jwt from 'jsonwebtoken'; // v9.0.0
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken, 
  checkRole 
} from '../../src/utils/auth.utils';
import { JwtPayload, UserRole } from '../../src/interfaces/auth.interface';
import { ERROR_MESSAGES } from '../../src/constants/error.constants';

// Mock environment variables
process.env.JWT_PRIVATE_KEY = 'test-private-key';
process.env.JWT_PUBLIC_KEY = 'test-public-key';
process.env.JWT_ISSUER = 'test-issuer';
process.env.JWT_AUDIENCE = 'test-audience';

// Test data
const mockValidPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
  userId: 'test-user-id',
  email: 'test@example.com',
  role: UserRole.OWNER,
  mfaEnabled: false
};

const mockInvalidPayload = {
  userId: '',
  email: 'invalid-email',
  role: 'INVALID_ROLE' as UserRole,
  mfaEnabled: false
};

describe('generateAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should generate valid access token with correct payload', async () => {
    const token = await generateAccessToken(mockValidPayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    const decoded = jwt.decode(token) as JwtPayload;
    expect(decoded.userId).toBe(mockValidPayload.userId);
    expect(decoded.email).toBe(mockValidPayload.email);
    expect(decoded.role).toBe(mockValidPayload.role);
  });

  test('should set correct token expiration time (24h)', async () => {
    const token = await generateAccessToken(mockValidPayload);
    const decoded = jwt.decode(token) as JwtPayload;
    
    const now = Math.floor(Date.now() / 1000);
    const expectedExp = now + (24 * 60 * 60); // 24 hours in seconds
    expect(decoded.exp).toBeLessThanOrEqual(expectedExp);
    expect(decoded.exp).toBeGreaterThan(now);
  });

  test('should throw error for invalid payload', async () => {
    await expect(generateAccessToken(mockInvalidPayload))
      .rejects
      .toThrow(ERROR_MESSAGES.INVALID_CREDENTIALS);
  });

  test('should include required JWT claims', async () => {
    const token = await generateAccessToken(mockValidPayload);
    const decoded = jwt.decode(token) as JwtPayload & { iss: string; aud: string };
    
    expect(decoded.iss).toBe(process.env.JWT_ISSUER);
    expect(decoded.aud).toBe(process.env.JWT_AUDIENCE);
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });
});

describe('generateRefreshToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should generate valid refresh token', async () => {
    const token = await generateRefreshToken(mockValidPayload.userId);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(86); // Base64 encoded 64 bytes
  });

  test('should throw error for invalid user ID', async () => {
    await expect(generateRefreshToken(''))
      .rejects
      .toThrow(ERROR_MESSAGES.INVALID_CREDENTIALS);
  });

  test('should generate unique tokens for same user', async () => {
    const token1 = await generateRefreshToken(mockValidPayload.userId);
    const token2 = await generateRefreshToken(mockValidPayload.userId);
    expect(token1).not.toBe(token2);
  });
});

describe('verifyAccessToken', () => {
  let validToken: string;

  beforeEach(async () => {
    validToken = await generateAccessToken(mockValidPayload);
    jest.clearAllMocks();
  });

  test('should successfully verify valid token', async () => {
    const payload = await verifyAccessToken(validToken);
    expect(payload.userId).toBe(mockValidPayload.userId);
    expect(payload.email).toBe(mockValidPayload.email);
    expect(payload.role).toBe(mockValidPayload.role);
  });

  test('should throw error for expired token', async () => {
    const expiredToken = jwt.sign(
      { ...mockValidPayload, exp: Math.floor(Date.now() / 1000) - 3600 },
      process.env.JWT_PRIVATE_KEY as string
    );

    await expect(verifyAccessToken(expiredToken))
      .rejects
      .toThrow(ERROR_MESSAGES.TOKEN_EXPIRED);
  });

  test('should throw error for invalid signature', async () => {
    const tamperedToken = validToken.slice(0, -5) + 'xxxxx';
    await expect(verifyAccessToken(tamperedToken))
      .rejects
      .toThrow(ERROR_MESSAGES.INVALID_TOKEN);
  });

  test('should throw error for malformed token', async () => {
    await expect(verifyAccessToken('invalid.token.format'))
      .rejects
      .toThrow(ERROR_MESSAGES.INVALID_TOKEN);
  });

  test('should throw error for empty token', async () => {
    await expect(verifyAccessToken(''))
      .rejects
      .toThrow(ERROR_MESSAGES.INVALID_TOKEN);
  });
});

describe('checkRole', () => {
  test('should allow owner access to all roles', () => {
    expect(checkRole(UserRole.STAFF, UserRole.OWNER)).toBe(true);
    expect(checkRole(UserRole.MANAGER, UserRole.OWNER)).toBe(true);
    expect(checkRole(UserRole.OWNER, UserRole.OWNER)).toBe(true);
  });

  test('should enforce manager role restrictions', () => {
    expect(checkRole(UserRole.STAFF, UserRole.MANAGER)).toBe(true);
    expect(checkRole(UserRole.MANAGER, UserRole.MANAGER)).toBe(true);
    expect(checkRole(UserRole.OWNER, UserRole.MANAGER)).toBe(false);
  });

  test('should enforce staff role limitations', () => {
    expect(checkRole(UserRole.STAFF, UserRole.STAFF)).toBe(true);
    expect(checkRole(UserRole.MANAGER, UserRole.STAFF)).toBe(false);
    expect(checkRole(UserRole.OWNER, UserRole.STAFF)).toBe(false);
  });

  test('should throw error for invalid roles', () => {
    expect(() => checkRole('INVALID' as UserRole, UserRole.STAFF))
      .toThrow(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
    expect(() => checkRole(UserRole.STAFF, 'INVALID' as UserRole))
      .toThrow(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
  });

  test('should handle cross-role access attempts', () => {
    const roles = [UserRole.STAFF, UserRole.MANAGER, UserRole.OWNER];
    
    roles.forEach((requiredRole, reqIndex) => {
      roles.forEach((userRole, userIndex) => {
        const hasAccess = checkRole(requiredRole, userRole);
        expect(hasAccess).toBe(userIndex >= reqIndex);
      });
    });
  });
});