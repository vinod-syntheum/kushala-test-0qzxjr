/**
 * @file Defines standardized success and notification messages used throughout the backend application
 * @description Provides type-safe, immutable message constants for consistent API responses and user feedback
 * @version 1.0.0
 */

/**
 * Interface defining the structure for success messages across different domains
 */
interface ISuccessMessages {
  AUTH: Record<string, string>;
  USER: Record<string, string>;
  EVENT: Record<string, string>;
  LOCATION: Record<string, string>;
  WEBSITE: Record<string, string>;
  TICKET: Record<string, string>;
}

/**
 * Interface defining the structure for notification messages across different channels
 */
interface INotificationMessages {
  EMAIL: Record<string, string>;
  SYSTEM: Record<string, string>;
}

/**
 * Immutable success messages for all application operations
 * Used to maintain consistency in API responses and user feedback
 */
export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Successfully logged in',
    REGISTER_SUCCESS: 'Account created successfully',
    LOGOUT_SUCCESS: 'Successfully logged out',
    PASSWORD_RESET_EMAIL: 'Password reset instructions sent to your email',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    MFA_ENABLED: 'Two-factor authentication enabled successfully',
    MFA_DISABLED: 'Two-factor authentication disabled successfully',
  },
  USER: {
    PROFILE_UPDATE: 'Profile updated successfully',
    SETTINGS_UPDATE: 'Settings updated successfully',
    PREFERENCES_UPDATE: 'Preferences saved successfully',
    NOTIFICATION_UPDATE: 'Notification settings updated successfully',
  },
  EVENT: {
    CREATE_SUCCESS: 'Event created successfully',
    UPDATE_SUCCESS: 'Event updated successfully',
    PUBLISH_SUCCESS: 'Event published successfully',
    CANCEL_SUCCESS: 'Event cancelled successfully',
    DELETE_SUCCESS: 'Event deleted successfully',
    TICKET_CONFIG_SUCCESS: 'Ticket configuration updated successfully',
    ATTENDEE_UPDATE: 'Attendee list updated successfully',
  },
  LOCATION: {
    CREATE_SUCCESS: 'Location added successfully',
    UPDATE_SUCCESS: 'Location updated successfully',
    DELETE_SUCCESS: 'Location deleted successfully',
    HOURS_UPDATE: 'Operating hours updated successfully',
    ADDRESS_VERIFY: 'Address verified successfully',
  },
  WEBSITE: {
    CONTENT_UPDATE: 'Website content updated successfully',
    TEMPLATE_APPLY: 'Template applied successfully',
    PUBLISH_SUCCESS: 'Website published successfully',
    MEDIA_UPLOAD: 'Media files uploaded successfully',
    SEO_UPDATE: 'SEO settings updated successfully',
    DOMAIN_CONNECT: 'Domain connected successfully',
  },
  TICKET: {
    PURCHASE_SUCCESS: 'Ticket purchased successfully',
    REFUND_SUCCESS: 'Ticket refunded successfully',
    TRANSFER_SUCCESS: 'Ticket transferred successfully',
    CHECK_IN_SUCCESS: 'Ticket checked in successfully',
    BULK_PURCHASE: 'Bulk ticket purchase completed successfully',
  },
} as const;

/**
 * Immutable notification messages for system communications
 * Used for email notifications and system alerts
 */
export const NOTIFICATION_MESSAGES = {
  EMAIL: {
    WELCOME: 'Welcome to Digital Presence MVP! Get started with your restaurant website.',
    EVENT_REMINDER: 'Reminder: Your event {eventName} starts in 24 hours',
    TICKET_CONFIRMATION: 'Your ticket purchase for {eventName} has been confirmed',
    PASSWORD_RESET: 'You requested a password reset for your account',
    ACCOUNT_UPDATE: 'Your account information has been updated',
    EVENT_PUBLISHED: 'Your event {eventName} is now live',
    WEBSITE_PUBLISHED: 'Your website is now live at {domain}',
    STORAGE_ALERT: "You've used {usage}% of your storage quota",
  },
  SYSTEM: {
    MAINTENANCE_SCHEDULED: 'System maintenance scheduled for {time}',
    VERSION_UPDATE: 'New features available! System will update at {time}',
    BACKUP_COMPLETE: 'System backup completed successfully',
    STORAGE_WARNING: 'Approaching storage limit ({usage}%). Please review your media files',
    SECURITY_ALERT: 'New login detected from {location}',
    PAYMENT_REMINDER: 'Subscription renewal scheduled for {date}',
    API_DEPRECATION: 'API version {version} will be deprecated on {date}',
  },
} as const;

// Type assertions to ensure type safety when accessing messages
type SuccessMessages = typeof SUCCESS_MESSAGES;
type NotificationMessages = typeof NOTIFICATION_MESSAGES;

// Ensure immutability of exported constants
Object.freeze(SUCCESS_MESSAGES);
Object.freeze(NOTIFICATION_MESSAGES);