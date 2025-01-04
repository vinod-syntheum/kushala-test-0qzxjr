/**
 * User Service Implementation
 * Version: 1.0.0
 * 
 * Implements secure user management operations with comprehensive validation,
 * encryption, and audit logging capabilities.
 */

import { Repository } from 'typeorm'; // ^0.3.0
import { injectable } from 'tsyringe'; // ^4.7.0
import { validate } from 'class-validator'; // ^0.14.0
import winston from 'winston'; // ^3.8.0

import { User } from '../models/postgresql/user.model';
import { 
  IUser, 
  IUserCreate, 
  IUserUpdate, 
  IUserProfile,
  AccountStatus 
} from '../interfaces/user.interface';
import { UserRole } from '../interfaces/auth.interface';
import { 
  hashPassword, 
  encryptData, 
  decryptData 
} from '../utils/crypto.utils';

/**
 * Service class handling user-related business logic with enhanced security
 * and audit logging capabilities.
 */
@injectable()
export class UserService {
  private readonly logger: winston.Logger;

  constructor(
    private readonly userRepository: Repository<User>
  ) {
    // Initialize Winston logger with secure audit configuration
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'user-service' },
      transports: [
        new winston.transports.File({ filename: 'audit-user.log' })
      ]
    });
  }

  /**
   * Creates a new user with enhanced security measures
   * @param userData User creation data
   * @returns Created user profile
   */
  async createUser(userData: IUserCreate): Promise<IUserProfile> {
    // Validate input data
    const validationErrors = await validate(userData);
    if (validationErrors.length > 0) {
      this.logger.error('User creation validation failed', { errors: validationErrors });
      throw new Error('Invalid user data provided');
    }

    // Check email uniqueness
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email.toLowerCase() }
    });
    if (existingUser) {
      this.logger.warn('Attempted duplicate email registration', { email: userData.email });
      throw new Error('Email already registered');
    }

    try {
      // Hash password using Argon2id
      const passwordHash = await hashPassword(userData.password);

      // Encrypt sensitive data
      const encryptedData = await this.encryptSensitiveData({
        firstName: userData.firstName,
        lastName: userData.lastName
      });

      // Create new user entity
      const user = this.userRepository.create({
        email: userData.email.toLowerCase(),
        passwordHash,
        firstName: encryptedData.firstName,
        lastName: encryptedData.lastName,
        role: userData.role || UserRole.OWNER,
        accountStatus: AccountStatus.PENDING,
        mfaEnabled: false,
        lastPasswordChange: new Date()
      });

      // Save user to database
      const savedUser = await this.userRepository.save(user);

      this.logger.info('User created successfully', {
        userId: savedUser.id,
        role: savedUser.role
      });

      // Return sanitized user profile
      return this.mapToUserProfile(savedUser);
    } catch (error) {
      this.logger.error('User creation failed', { error });
      throw new Error('Failed to create user');
    }
  }

  /**
   * Updates user information with security checks and audit logging
   * @param userId User identifier
   * @param updateData Update data
   * @returns Updated user profile
   */
  async updateUser(userId: string, updateData: IUserUpdate): Promise<IUserProfile> {
    // Validate update data
    const validationErrors = await validate(updateData);
    if (validationErrors.length > 0) {
      this.logger.error('User update validation failed', { userId, errors: validationErrors });
      throw new Error('Invalid update data');
    }

    try {
      // Find existing user
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      // Handle role updates with validation
      if (updateData.role && updateData.role !== user.role) {
        await this.validateUserRole(user.role, updateData.role, userId);
      }

      // Encrypt updated sensitive data if provided
      if (updateData.firstName || updateData.lastName) {
        const encryptedData = await this.encryptSensitiveData({
          firstName: updateData.firstName || user.firstName,
          lastName: updateData.lastName || user.lastName
        });
        updateData.firstName = encryptedData.firstName;
        updateData.lastName = encryptedData.lastName;
      }

      // Update user properties
      Object.assign(user, updateData);

      // Save changes
      const updatedUser = await this.userRepository.save(user);

      this.logger.info('User updated successfully', {
        userId,
        updatedFields: Object.keys(updateData)
      });

      return this.mapToUserProfile(updatedUser);
    } catch (error) {
      this.logger.error('User update failed', { userId, error });
      throw error;
    }
  }

  /**
   * Validates user role changes against authorization matrix
   * @param currentRole Current user role
   * @param newRole New role to assign
   * @param requesterId ID of the user requesting the change
   * @returns Validation result
   */
  async validateUserRole(
    currentRole: string,
    newRole: string,
    requesterId: string
  ): Promise<boolean> {
    const requester = await this.userRepository.findOne({ where: { id: requesterId } });
    
    if (!requester || requester.role !== UserRole.OWNER) {
      this.logger.warn('Unauthorized role change attempt', {
        requesterId,
        currentRole,
        newRole
      });
      throw new Error('Unauthorized role change');
    }

    // Validate role transition rules
    const validTransitions = {
      [UserRole.OWNER]: [UserRole.MANAGER, UserRole.STAFF],
      [UserRole.MANAGER]: [UserRole.STAFF],
      [UserRole.STAFF]: []
    };

    const isValidTransition = validTransitions[currentRole as UserRole]
      ?.includes(newRole as UserRole);

    if (!isValidTransition) {
      this.logger.warn('Invalid role transition attempted', {
        currentRole,
        newRole,
        requesterId
      });
      throw new Error('Invalid role transition');
    }

    return true;
  }

  /**
   * Encrypts sensitive user data fields
   * @param userData User data containing sensitive fields
   * @returns Encrypted user data
   */
  private async encryptSensitiveData(userData: Partial<IUser>): Promise<Partial<IUser>> {
    const encryptedData: Partial<IUser> = {};

    if (userData.firstName) {
      const { encryptedData: encrypted, iv, tag } = await encryptData(userData.firstName);
      encryptedData.firstName = `${encrypted}.${iv}.${tag}`;
    }

    if (userData.lastName) {
      const { encryptedData: encrypted, iv, tag } = await encryptData(userData.lastName);
      encryptedData.lastName = `${encrypted}.${iv}.${tag}`;
    }

    return encryptedData;
  }

  /**
   * Maps user entity to public profile interface
   * @param user User entity
   * @returns Sanitized user profile
   */
  private mapToUserProfile(user: User): IUserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    };
  }
}