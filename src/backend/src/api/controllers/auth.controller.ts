/**
 * Authentication Controller
 * Version: 1.0.0
 * 
 * Handles authentication-related HTTP requests with comprehensive security features
 * including MFA support, rate limiting, and security monitoring.
 */

import { Injectable } from '@nestjs/common'; // ^10.0.0
import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { RateLimit } from '@nestjs/throttler'; // ^5.0.0
import { RequestSanitizer } from '@nestjs/common'; // ^10.0.0
import { SecurityLogger } from '../../utils/logger.utils';
import { AuthService } from '../../services/auth.service';
import { 
  LoginCredentials,
  MfaVerification,
  TokenResponse,
  RefreshTokenRequest,
  PasswordResetRequest,
  PasswordResetConfirmation
} from '../../interfaces/auth.interface';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../constants/error.constants';

@Injectable()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly securityLogger: SecurityLogger,
    private readonly rateLimit: RateLimit,
    private readonly requestSanitizer: RequestSanitizer
  ) {}

  /**
   * Handles user login requests with MFA support and rate limiting
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  @RateLimit({
    ttl: 300, // 5 minutes
    limit: 5, // 5 attempts
    keyPrefix: 'login'
  })
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = this.securityLogger.logRequest(req, 'login');

    try {
      // Sanitize and validate request body
      const sanitizedBody = this.requestSanitizer.sanitize(req.body);
      const credentials: LoginCredentials = {
        email: sanitizedBody.email?.toLowerCase(),
        password: sanitizedBody.password,
        totpCode: sanitizedBody.totpCode
      };

      // Log authentication attempt (excluding password)
      this.securityLogger.info('Authentication attempt', {
        correlationId,
        email: credentials.email,
        hasTotpCode: !!credentials.totpCode,
        ipAddress: req.ip
      });

      // Attempt authentication
      const result = await this.authService.login(credentials);

      // Handle MFA challenge
      if (result.tokenType === 'MFA_REQUIRED') {
        res.status(HTTP_STATUS.OK).json({
          status: HTTP_STATUS.OK,
          data: {
            requiresMfa: true,
            userId: result.userId
          }
        });
        return;
      }

      // Log successful authentication
      this.securityLogger.info('Authentication successful', {
        correlationId,
        userId: result.userId,
        mfaUsed: !!credentials.totpCode
      });

      res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        data: result
      });
    } catch (error) {
      this.securityLogger.error('Authentication failed', {
        correlationId,
        error: error.message,
        ipAddress: req.ip
      });

      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: HTTP_STATUS.UNAUTHORIZED,
        error: {
          message: ERROR_MESSAGES.INVALID_CREDENTIALS
        }
      });
    }
  }

  /**
   * Handles MFA verification during login process
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  @RateLimit({
    ttl: 300,
    limit: 3,
    keyPrefix: 'mfa'
  })
  async verifyMFA(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = this.securityLogger.logRequest(req, 'verifyMFA');

    try {
      const sanitizedBody = this.requestSanitizer.sanitize(req.body);
      const verification: MfaVerification = {
        userId: sanitizedBody.userId,
        totpCode: sanitizedBody.totpCode
      };

      // Verify MFA code
      const result = await this.authService.verifyMFA(verification);

      this.securityLogger.info('MFA verification successful', {
        correlationId,
        userId: verification.userId
      });

      res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        data: result
      });
    } catch (error) {
      this.securityLogger.error('MFA verification failed', {
        correlationId,
        error: error.message
      });

      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: HTTP_STATUS.UNAUTHORIZED,
        error: {
          message: ERROR_MESSAGES.INVALID_MFA_CODE
        }
      });
    }
  }

  /**
   * Handles token refresh requests
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  @RateLimit({
    ttl: 300,
    limit: 10,
    keyPrefix: 'refresh'
  })
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = this.securityLogger.logRequest(req, 'refreshToken');

    try {
      const sanitizedBody = this.requestSanitizer.sanitize(req.body);
      const refreshRequest: RefreshTokenRequest = {
        refreshToken: sanitizedBody.refreshToken
      };

      const result = await this.authService.refreshToken(refreshRequest);

      this.securityLogger.info('Token refresh successful', {
        correlationId,
        tokenType: result.tokenType
      });

      res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        data: result
      });
    } catch (error) {
      this.securityLogger.error('Token refresh failed', {
        correlationId,
        error: error.message
      });

      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: HTTP_STATUS.UNAUTHORIZED,
        error: {
          message: ERROR_MESSAGES.INVALID_TOKEN
        }
      });
    }
  }

  /**
   * Handles password reset requests
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  @RateLimit({
    ttl: 3600,
    limit: 3,
    keyPrefix: 'reset'
  })
  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = this.securityLogger.logRequest(req, 'requestPasswordReset');

    try {
      const sanitizedBody = this.requestSanitizer.sanitize(req.body);
      const resetRequest: PasswordResetRequest = {
        email: sanitizedBody.email?.toLowerCase()
      };

      await this.authService.requestPasswordReset(resetRequest);

      this.securityLogger.info('Password reset requested', {
        correlationId,
        email: resetRequest.email
      });

      // Always return success to prevent email enumeration
      res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        data: {
          message: 'If the email exists, a reset link will be sent'
        }
      });
    } catch (error) {
      this.securityLogger.error('Password reset request failed', {
        correlationId,
        error: error.message
      });

      // Still return success to prevent email enumeration
      res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        data: {
          message: 'If the email exists, a reset link will be sent'
        }
      });
    }
  }

  /**
   * Handles password reset confirmation
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  @RateLimit({
    ttl: 3600,
    limit: 3,
    keyPrefix: 'resetConfirm'
  })
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = this.securityLogger.logRequest(req, 'resetPassword');

    try {
      const sanitizedBody = this.requestSanitizer.sanitize(req.body);
      const resetConfirmation: PasswordResetConfirmation = {
        token: sanitizedBody.token,
        newPassword: sanitizedBody.newPassword,
        confirmPassword: sanitizedBody.confirmPassword
      };

      if (resetConfirmation.newPassword !== resetConfirmation.confirmPassword) {
        throw new Error(ERROR_MESSAGES.VALIDATION_FAILED);
      }

      await this.authService.resetPassword(resetConfirmation);

      this.securityLogger.info('Password reset successful', {
        correlationId,
        tokenUsed: true
      });

      res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        data: {
          message: 'Password has been reset successfully'
        }
      });
    } catch (error) {
      this.securityLogger.error('Password reset failed', {
        correlationId,
        error: error.message
      });

      res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        error: {
          message: ERROR_MESSAGES.VALIDATION_FAILED
        }
      });
    }
  }
}