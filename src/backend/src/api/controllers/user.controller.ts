/**
 * User Controller Implementation
 * Version: 1.0.0
 * 
 * Handles HTTP requests for user-related operations with comprehensive security,
 * validation, and monitoring features.
 */

import { Request, Response } from 'express'; // v4.18.2
import { injectable } from 'tsyringe'; // ^4.7.0
import { rateLimit } from 'express-rate-limit'; // ^6.7.0
import winston from 'winston'; // ^3.8.0

import { UserService } from '../../services/user.service';
import {
  IUserCreate,
  IUserUpdate,
  IUserProfile,
  AccountStatus
} from '../../interfaces/user.interface';
import {
  sendSuccess,
  sendError,
  sendValidationError
} from '../../utils/response.utils';
import {
  HTTP_STATUS,
  ERROR_TYPES,
  ERROR_MESSAGES
} from '../../constants/error.constants';
import {
  validateInput,
  validateEmail,
  validatePassword
} from '../../utils/validation.utils';

/**
 * Controller handling user-related HTTP requests with enhanced security
 * and comprehensive validation.
 */
@injectable()
export class UserController {
  private readonly logger: winston.Logger;

  constructor(
    private readonly userService: UserService
  ) {
    // Initialize Winston logger with secure audit configuration
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'user-controller' },
      transports: [
        new winston.transports.File({ filename: 'audit-user-controller.log' })
      ]
    });
  }

  /**
   * Creates a new user with comprehensive validation and security checks
   * @param req Express request object containing user creation data
   * @param res Express response object
   */
  @rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // 5 requests per window
  })
  public async createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: IUserCreate = req.body;

      // Validate email format
      const emailValidation = await validateEmail(userData.email, true);
      if (!emailValidation.isValid) {
        return sendValidationError(res, [{
          field: 'email',
          message: emailValidation.errors![0],
          code: 'INVALID_EMAIL',
          value: userData.email
        }]);
      }

      // Validate password strength
      const passwordValidation = validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        return sendValidationError(res, [{
          field: 'password',
          message: passwordValidation.errors![0],
          code: 'WEAK_PASSWORD',
          value: '[REDACTED]'
        }]);
      }

      // Create user through service
      const createdUser = await this.userService.createUser(userData);

      this.logger.info('User created successfully', {
        userId: createdUser.id,
        email: createdUser.email
      });

      return sendSuccess(
        res,
        HTTP_STATUS.CREATED,
        'User created successfully',
        createdUser
      );
    } catch (error) {
      this.logger.error('User creation failed', { error });
      return sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.SERVER_ERROR,
        ERROR_TYPES.SERVER_ERROR
      );
    }
  };

  /**
   * Updates an existing user with role-based validation
   * @param req Express request object containing update data
   * @param res Express response object
   */
  public async updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const updateData: IUserUpdate = req.body;
      const requestingUserId = req.user?.id;

      // Validate update permissions
      if (userId !== requestingUserId && req.user?.role !== 'OWNER') {
        return sendError(
          res,
          HTTP_STATUS.FORBIDDEN,
          ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
          ERROR_TYPES.AUTHORIZATION_ERROR
        );
      }

      // Update user through service
      const updatedUser = await this.userService.updateUser(userId, updateData);

      this.logger.info('User updated successfully', {
        userId,
        updatedFields: Object.keys(updateData)
      });

      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        'User updated successfully',
        updatedUser
      );
    } catch (error) {
      this.logger.error('User update failed', { error });
      return sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.SERVER_ERROR,
        ERROR_TYPES.SERVER_ERROR
      );
    }
  };

  /**
   * Retrieves user profile with role-based data filtering
   * @param req Express request object
   * @param res Express response object
   */
  public async getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const requestingUserId = req.user?.id;

      // Validate access permissions
      if (userId !== requestingUserId && req.user?.role !== 'OWNER') {
        return sendError(
          res,
          HTTP_STATUS.FORBIDDEN,
          ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
          ERROR_TYPES.AUTHORIZATION_ERROR
        );
      }

      const userProfile = await this.userService.getUserById(userId);
      if (!userProfile) {
        return sendError(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.RESOURCE_NOT_FOUND,
          ERROR_TYPES.RESOURCE_ERROR
        );
      }

      this.logger.info('User profile retrieved', { userId });

      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        'User profile retrieved successfully',
        userProfile
      );
    } catch (error) {
      this.logger.error('User profile retrieval failed', { error });
      return sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.SERVER_ERROR,
        ERROR_TYPES.SERVER_ERROR
      );
    }
  };

  /**
   * Deletes a user account with security validation
   * @param req Express request object
   * @param res Express response object
   */
  public async deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const requestingUserId = req.user?.id;

      // Validate deletion permissions
      if (userId !== requestingUserId && req.user?.role !== 'OWNER') {
        return sendError(
          res,
          HTTP_STATUS.FORBIDDEN,
          ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
          ERROR_TYPES.AUTHORIZATION_ERROR
        );
      }

      await this.userService.deleteUser(userId);

      this.logger.info('User deleted successfully', { userId });

      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        'User deleted successfully'
      );
    } catch (error) {
      this.logger.error('User deletion failed', { error });
      return sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.SERVER_ERROR,
        ERROR_TYPES.SERVER_ERROR
      );
    }
  };
}