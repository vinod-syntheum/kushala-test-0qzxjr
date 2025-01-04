/**
 * @fileoverview Email service implementation using SendGrid for transactional emails
 * with comprehensive retry mechanisms and monitoring
 * @version 1.0.0
 */

import sgMail from '@sendgrid/mail'; // ^7.7.0
import Queue from 'bull'; // ^4.12.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // ^2.4.1
import { emailConfig } from '../config/email.config';
import logger from '../utils/logger.utils';
import { NOTIFICATION_MESSAGES } from '../constants/messages.constants';
import crypto from 'crypto';

/**
 * Email priority levels for queue processing
 */
enum EmailPriority {
  HIGH = 1,
  NORMAL = 2,
  LOW = 3
}

/**
 * Interface for email attachments
 */
interface EmailAttachment {
  content: string;
  filename: string;
  type: string;
  size: number;
}

/**
 * Interface for email sending options
 */
interface EmailOptions {
  to: string;
  templateId: string;
  dynamicData?: Record<string, any>;
  attachments?: EmailAttachment[];
  priority?: EmailPriority;
}

/**
 * Service class for handling email operations with comprehensive retry mechanism
 */
export class EmailService {
  private emailQueue: Queue.Queue;
  private rateLimiter: RateLimiterRedis;
  private readonly maxRetries: number;
  private readonly correlationPrefix = 'email_';

  constructor() {
    // Initialize SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    // Initialize email queue
    this.emailQueue = new Queue('email-queue', {
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      },
      defaultJobOptions: {
        attempts: emailConfig.options.maxRetries,
        backoff: {
          type: 'exponential',
          delay: emailConfig.options.retryDelay
        },
        removeOnComplete: true,
        timeout: emailConfig.options.timeout
      }
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.emailQueue.client,
      points: emailConfig.options.rateLimit.maxPerMinute,
      duration: 60,
      blockDuration: 60
    });

    this.maxRetries = emailConfig.options.maxRetries;

    // Setup queue event handlers
    this.setupQueueHandlers();
  }

  /**
   * Sets up queue event handlers for monitoring and logging
   */
  private setupQueueHandlers(): void {
    this.emailQueue.on('completed', (job) => {
      logger.info('Email sent successfully', {
        correlationId: job.data.correlationId,
        template: job.data.templateId,
        recipient: job.data.to
      });
    });

    this.emailQueue.on('failed', (job, error) => {
      logger.error('Email sending failed', {
        correlationId: job.data.correlationId,
        template: job.data.templateId,
        recipient: job.data.to,
        error: error.message,
        attempt: job.attemptsMade
      });

      // Move to dead letter queue if max retries reached
      if (job.attemptsMade >= this.maxRetries) {
        this.handleDeadLetter(job.data);
      }
    });
  }

  /**
   * Handles failed emails by moving them to dead letter queue
   */
  private async handleDeadLetter(emailData: any): Promise<void> {
    try {
      await this.emailQueue.add('dead-letter', emailData, {
        attempts: 1,
        removeOnComplete: true
      });

      logger.warn('Email moved to dead letter queue', {
        correlationId: emailData.correlationId,
        template: emailData.templateId,
        recipient: emailData.to
      });
    } catch (error) {
      logger.error('Failed to move email to dead letter queue', {
        error: error instanceof Error ? error.message : 'Unknown error',
        emailData
      });
    }
  }

  /**
   * Validates email options before sending
   */
  private validateEmailOptions(options: EmailOptions): void {
    if (!options.to || !options.to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Invalid recipient email address');
    }

    if (!options.templateId || !options.templateId.startsWith('d-')) {
      throw new Error('Invalid template ID format');
    }

    if (options.attachments) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      for (const attachment of options.attachments) {
        if (attachment.size > maxSize) {
          throw new Error(`Attachment ${attachment.filename} exceeds size limit`);
        }
      }
    }
  }

  /**
   * Sends an email with comprehensive error handling and retry mechanism
   */
  public async sendEmail(options: EmailOptions): Promise<void> {
    const correlationId = `${this.correlationPrefix}${crypto.randomUUID()}`;

    try {
      // Validate email options
      this.validateEmailOptions(options);

      // Check rate limit
      await this.rateLimiter.consume(options.to);

      // Prepare email data
      const emailData = {
        to: options.to,
        from: {
          email: emailConfig.sender.email,
          name: emailConfig.sender.name
        },
        templateId: options.templateId,
        dynamicTemplateData: options.dynamicData,
        attachments: options.attachments,
        correlationId
      };

      // Add to queue with priority
      await this.emailQueue.add('send-email', emailData, {
        priority: options.priority || EmailPriority.NORMAL
      });

      logger.info('Email queued successfully', {
        correlationId,
        template: options.templateId,
        recipient: options.to
      });
    } catch (error) {
      logger.error('Failed to queue email', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        template: options.templateId,
        recipient: options.to
      });
      throw error;
    }
  }

  /**
   * Sends a welcome email to new users
   */
  public async sendWelcomeEmail(to: string, userData: Record<string, any>): Promise<void> {
    await this.sendEmail({
      to,
      templateId: emailConfig.templates.welcome,
      dynamicData: userData,
      priority: EmailPriority.HIGH
    });
  }

  /**
   * Sends event confirmation email
   */
  public async sendEventConfirmation(to: string, eventData: Record<string, any>): Promise<void> {
    await this.sendEmail({
      to,
      templateId: emailConfig.templates.eventConfirmation,
      dynamicData: {
        ...eventData,
        message: NOTIFICATION_MESSAGES.EMAIL.EVENT_REMINDER.replace(
          '{eventName}',
          eventData.eventName
        )
      }
    });
  }

  /**
   * Sends password reset email
   */
  public async sendPasswordReset(to: string, resetData: Record<string, any>): Promise<void> {
    await this.sendEmail({
      to,
      templateId: emailConfig.templates.passwordReset,
      dynamicData: resetData,
      priority: EmailPriority.HIGH
    });
  }
}

// Export singleton instance
export default new EmailService();