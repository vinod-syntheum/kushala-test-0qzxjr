/**
 * User Integration Tests
 * Version: 1.0.0
 * 
 * Comprehensive integration tests for user management functionality including
 * security features, role-based access control, and data protection.
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from 'jest'; // ^29.0.0
import { container } from 'tsyringe'; // ^4.7.0
import { createTestDatabase, closeTestDatabase, cleanTestData } from '@test/utils'; // ^1.0.0

import { UserService } from '../../src/services/user.service';
import { CryptoUtils } from '../../src/utils/crypto.utils';
import { UserRole } from '../../src/interfaces/auth.interface';
import { AccountStatus, IUserProfile } from '../../src/interfaces/user.interface';

// Test data for different user roles
const mockUserData = {
  owner: {
    email: 'owner@test.com',
    password: 'OwnerPass123!@#',
    firstName: 'Test',
    lastName: 'Owner',
    role: UserRole.OWNER,
    mfaEnabled: true
  },
  manager: {
    email: 'manager@test.com',
    password: 'ManagerPass123!@#',
    firstName: 'Test',
    lastName: 'Manager',
    role: UserRole.MANAGER,
    mfaEnabled: true
  },
  staff: {
    email: 'staff@test.com',
    password: 'StaffPass123!@#',
    firstName: 'Test',
    lastName: 'Staff',
    role: UserRole.STAFF,
    mfaEnabled: false
  }
};

describe('User Security Integration Tests', () => {
  let userService: UserService;
  let cryptoUtils: CryptoUtils;
  let testUsers: Map<UserRole, IUserProfile>;

  beforeAll(async () => {
    // Initialize test database and dependencies
    await createTestDatabase();
    userService = container.resolve(UserService);
    cryptoUtils = container.resolve(CryptoUtils);
    testUsers = new Map();
  });

  afterAll(async () => {
    // Cleanup test data and close connections
    await cleanTestData();
    await closeTestDatabase();
    container.clearInstances();
  });

  beforeEach(async () => {
    // Create test users before each test
    for (const [role, userData] of Object.entries(mockUserData)) {
      const user = await userService.createUser({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role
      });
      testUsers.set(userData.role, user);
    }
  });

  afterEach(async () => {
    // Clean up test users after each test
    await cleanTestData();
    testUsers.clear();
  });

  describe('Password Security', () => {
    it('should hash password using Argon2id with correct parameters', async () => {
      const ownerUser = testUsers.get(UserRole.OWNER);
      const user = await userService.getUserById(ownerUser!.id);
      
      // Verify password hash format and parameters
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      expect(user.passwordHash).toMatch(/m=65536,t=3,p=4/);
    });

    it('should prevent password reuse during updates', async () => {
      const ownerUser = testUsers.get(UserRole.OWNER);
      const oldPassword = mockUserData.owner.password;
      const newPassword = 'NewOwnerPass456!@#';

      await expect(userService.updateUser(ownerUser!.id, {
        password: oldPassword
      })).rejects.toThrow('Password has been previously used');
    });

    it('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        'short', // Too short
        'nouppercaseornumbers', // Missing complexity
        'NoSpecialChars123', // Missing special characters
        'No@Numbers', // Missing numbers
      ];

      for (const password of weakPasswords) {
        await expect(userService.createUser({
          ...mockUserData.staff,
          email: 'test@weak.com',
          password
        })).rejects.toThrow('Password does not meet complexity requirements');
      }
    });

    it('should rate limit failed password attempts', async () => {
      const ownerUser = testUsers.get(UserRole.OWNER);
      const wrongPassword = 'WrongPass123!@#';

      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await expect(userService.validateCredentials(ownerUser!.email, wrongPassword))
          .rejects.toThrow('Invalid credentials');
      }

      // Verify account is temporarily locked
      await expect(userService.validateCredentials(ownerUser!.email, mockUserData.owner.password))
        .rejects.toThrow('Account temporarily locked');
    });
  });

  describe('MFA Management', () => {
    it('should generate valid TOTP secret', async () => {
      const staffUser = testUsers.get(UserRole.STAFF);
      const mfaSetup = await userService.setupMFA(staffUser!.id);

      expect(mfaSetup.secretKey).toMatch(/^[A-Z2-7]{32}$/);
      expect(mfaSetup.qrCodeUrl).toContain('otpauth://totp/');
      expect(mfaSetup.recoveryKeys).toHaveLength(10);
    });

    it('should validate TOTP tokens correctly', async () => {
      const managerUser = testUsers.get(UserRole.MANAGER);
      const mfaSetup = await userService.setupMFA(managerUser!.id);

      // Generate and validate a TOTP token
      const token = await cryptoUtils.generateTOTP(mfaSetup.secretKey);
      const isValid = await userService.validateMFA(managerUser!.id, token);

      expect(isValid).toBe(true);
    });

    it('should enforce MFA setup for sensitive roles', async () => {
      const ownerUser = testUsers.get(UserRole.OWNER);
      const managerUser = testUsers.get(UserRole.MANAGER);

      // Verify MFA is required for owner and manager roles
      expect(ownerUser!.mfaEnabled).toBe(true);
      expect(managerUser!.mfaEnabled).toBe(true);

      // Verify MFA is optional for staff
      const staffUser = testUsers.get(UserRole.STAFF);
      expect(staffUser!.mfaEnabled).toBe(false);
    });

    it('should handle backup codes securely', async () => {
      const ownerUser = testUsers.get(UserRole.OWNER);
      const mfaSetup = await userService.setupMFA(ownerUser!.id);

      // Verify backup code format and usage
      const backupCode = mfaSetup.recoveryKeys[0];
      const isValid = await userService.validateMFABackupCode(ownerUser!.id, backupCode);
      expect(isValid).toBe(true);

      // Verify backup code is invalidated after use
      await expect(userService.validateMFABackupCode(ownerUser!.id, backupCode))
        .rejects.toThrow('Invalid backup code');
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt sensitive user data with AES-256-GCM', async () => {
      const ownerUser = testUsers.get(UserRole.OWNER);
      const user = await userService.getUserById(ownerUser!.id);

      // Verify encrypted data format
      expect(user.firstName).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
      expect(user.lastName).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
    });

    it('should validate data integrity with HMAC', async () => {
      const managerUser = testUsers.get(UserRole.MANAGER);
      const user = await userService.getUserById(managerUser!.id);

      // Attempt to tamper with encrypted data
      const [encrypted, iv, tag] = user.firstName.split('.');
      const tamperedData = `${encrypted}x.${iv}.${tag}`;

      await expect(cryptoUtils.decryptData(tamperedData))
        .rejects.toThrow('Data integrity check failed');
    });

    it('should handle encryption errors gracefully', async () => {
      const invalidData = {
        email: 'test@error.com',
        password: 'TestPass123!@#',
        firstName: null,
        lastName: 'Test',
        role: UserRole.STAFF
      };

      await expect(userService.createUser(invalidData))
        .rejects.toThrow('Encryption error');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce role hierarchy', async () => {
      const ownerUser = testUsers.get(UserRole.OWNER);
      const staffUser = testUsers.get(UserRole.STAFF);

      // Staff cannot modify owner
      await expect(userService.updateUser(ownerUser!.id, { role: UserRole.STAFF }, staffUser!.id))
        .rejects.toThrow('Unauthorized role change');

      // Owner can modify staff
      const result = await userService.updateUser(staffUser!.id, { role: UserRole.MANAGER }, ownerUser!.id);
      expect(result.role).toBe(UserRole.MANAGER);
    });

    it('should validate role transitions', async () => {
      const ownerUser = testUsers.get(UserRole.OWNER);
      const managerUser = testUsers.get(UserRole.MANAGER);

      // Valid transition: manager to staff
      await expect(userService.updateUser(managerUser!.id, { role: UserRole.STAFF }, ownerUser!.id))
        .resolves.toBeDefined();

      // Invalid transition: staff to owner
      await expect(userService.updateUser(managerUser!.id, { role: UserRole.OWNER }, ownerUser!.id))
        .rejects.toThrow('Invalid role transition');
    });

    it('should handle permission inheritance', async () => {
      const ownerUser = testUsers.get(UserRole.OWNER);
      const managerUser = testUsers.get(UserRole.MANAGER);

      // Manager inherits base permissions
      const result = await userService.getUserPermissions(managerUser!.id);
      expect(result).toContain('READ_USERS');
      expect(result).toContain('MANAGE_EVENTS');

      // But cannot access owner-only permissions
      expect(result).not.toContain('MANAGE_ROLES');
    });
  });
});