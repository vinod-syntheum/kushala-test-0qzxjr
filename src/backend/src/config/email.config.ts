/**
 * @fileoverview Email service configuration using SendGrid with secure validation and retry mechanisms
 * @version 1.0.0
 */

import { MailService } from '@sendgrid/mail'; // ^7.7.0
import { z } from 'zod'; // ^3.0.0
import { NOTIFICATION_MESSAGES } from '../constants/messages.constants';
import logger from '../utils/logger.utils';

/**
 * Interface defining the comprehensive email configuration structure
 */
interface EmailConfig {
  sender: {
    email: string;
    name: string;
  };
  templates: {
    welcome: string;
    passwordReset: string;
    eventConfirmation: string;
    ticketPurchase: string;
  };
  options: {
    maxRetries: number;
    retryDelay: number;
    timeout: number;
    rateLimit: {
      maxPerMinute: number;
      maxBurst: number;
    };
  };
}

/**
 * Zod schema for validating email configuration
 */
const emailConfigSchema = z.object({
  sender: z.object({
    email: z.string().email(),
    name: z.string().min(1)
  }),
  templates: z.object({
    welcome: z.string().regex(/^d-/),
    passwordReset: z.string().regex(/^d-/),
    eventConfirmation: z.string().regex(/^d-/),
    ticketPurchase: z.string().regex(/^d-/)
  }),
  options: z.object({
    maxRetries: z.number().min(1).max(5),
    retryDelay: z.number().min(1000).max(5000),
    timeout: z.number().min(3000).max(10000),
    rateLimit: z.object({
      maxPerMinute: z.number().positive(),
      maxBurst: z.number().positive()
    })
  })
});

/**
 * Secure SendGrid email service configuration
 */
export const EMAIL_CONFIG: EmailConfig = {
  sender: {
    email: process.env.SENDGRID_SENDER_EMAIL!,
    name: 'Digital Presence MVP'
  },
  templates: {
    welcome: 'd-welcome-template-id',
    passwordReset: 'd-password-reset-template-id',
    eventConfirmation: 'd-event-confirmation-template-id',
    ticketPurchase: 'd-ticket-purchase-template-id'
  },
  options: {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 5000,
    rateLimit: {
      maxPerMinute: 100,
      maxBurst: 150
    }
  }
};

/**
 * Validates email configuration and environment variables with security checks
 * @throws {Error} If configuration is invalid
 */
export const validateConfig = (): void => {
  try {
    // Validate SendGrid API key presence and format
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }
    
    if (!process.env.SENDGRID_API_KEY.startsWith('SG.')) {
      throw new Error('Invalid SENDGRID_API_KEY format');
    }

    // Validate sender email presence
    if (!process.env.SENDGRID_SENDER_EMAIL) {
      throw new Error('SENDGRID_SENDER_EMAIL environment variable is required');
    }

    // Validate configuration against schema
    const validationResult = emailConfigSchema.safeParse(EMAIL_CONFIG);
    
    if (!validationResult.success) {
      throw new Error(`Email configuration validation failed: ${validationResult.error.message}`);
    }

    // Initialize SendGrid client
    const sendgrid = new MailService();
    sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

    // Verify template IDs exist in configuration
    const templateIds = Object.values(EMAIL_CONFIG.templates);
    if (templateIds.some(id => !id.startsWith('d-'))) {
      throw new Error('Invalid template ID format detected');
    }

    logger.info('Email configuration validated successfully', {
      sender: EMAIL_CONFIG.sender.email,
      templates: Object.keys(EMAIL_CONFIG.templates).length,
      rateLimit: EMAIL_CONFIG.options.rateLimit
    });

  } catch (error) {
    logger.error('Email configuration validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        sender: EMAIL_CONFIG.sender.email,
        templates: Object.keys(EMAIL_CONFIG.templates)
      }
    });
    throw error;
  }
};

// Export validated configuration
export const emailConfig = Object.freeze({
  sender: EMAIL_CONFIG.sender,
  templates: EMAIL_CONFIG.templates,
  options: EMAIL_CONFIG.options
});

// Initialize configuration on module load
validateConfig();