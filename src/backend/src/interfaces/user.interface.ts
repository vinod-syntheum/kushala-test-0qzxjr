/**
 * User Interface Definitions
 * Version: 1.0.0
 * 
 * This module defines TypeScript interfaces for user-related data structures,
 * providing comprehensive type definitions for user entities with enhanced
 * security considerations and role-based access control.
 */

import { UserRole } from './auth.interface';

/**
 * Enumeration of possible user account statuses.
 * Used to track and manage the lifecycle of user accounts.
 */
export enum AccountStatus {
  ACTIVE = 'ACTIVE',           // Normal active account
  PENDING = 'PENDING',         // Email verification pending
  SUSPENDED = 'SUSPENDED',     // Temporarily suspended
  DEACTIVATED = 'DEACTIVATED' // Permanently deactivated
}

/**
 * Core user entity interface containing complete user data
 * including sensitive information. Used for internal operations
 * and database interactions.
 */
export interface IUser {
  id: string;                  // Unique identifier (UUID)
  email: string;              // Unique email address
  passwordHash: string;       // Argon2id hashed password
  firstName: string;          // User's first name
  lastName: string;          // User's last name
  role: UserRole;            // User's role for RBAC
  accountStatus: AccountStatus; // Current account status
  mfaEnabled: boolean;       // Multi-factor authentication status
  lastPasswordChange: Date;  // Timestamp of last password update
  createdAt: Date;          // Account creation timestamp
  updatedAt: Date;          // Last update timestamp
}

/**
 * Interface for creating new users with plain text password.
 * Used during user registration and account creation.
 */
export interface IUserCreate {
  email: string;             // Unique email address
  password: string;          // Plain text password (to be hashed)
  firstName: string;         // User's first name
  lastName: string;          // User's last name
  role: UserRole;           // Initial user role
}

/**
 * Interface for updating existing user properties.
 * Excludes sensitive fields that require special handling.
 */
export interface IUserUpdate {
  firstName?: string;        // Updated first name
  lastName?: string;         // Updated last name
  role?: UserRole;          // Updated role
  accountStatus?: AccountStatus; // Updated account status
  mfaEnabled?: boolean;     // Updated MFA status
}

/**
 * Public user profile interface excluding sensitive data.
 * Used for external API responses and public-facing operations.
 */
export interface IUserProfile {
  id: string;               // User identifier
  email: string;           // Email address
  firstName: string;       // First name
  lastName: string;        // Last name
  role: UserRole;         // User role
}

/**
 * Interface for password change requests.
 * Requires both current and new password for security.
 */
export interface IPasswordChange {
  currentPassword: string;  // Current password for verification
  newPassword: string;     // New password to set
}

/**
 * Interface for user search criteria.
 * Used for filtering and querying user records.
 */
export interface IUserSearchCriteria {
  email?: string;          // Search by email
  role?: UserRole;        // Filter by role
  status?: AccountStatus; // Filter by account status
  createdAfter?: Date;   // Filter by creation date
  createdBefore?: Date;  // Filter by creation date
}

/**
 * Interface for user session metadata.
 * Tracks user session information for security monitoring.
 */
export interface IUserSession {
  userId: string;          // Associated user ID
  ipAddress: string;      // Client IP address
  userAgent: string;      // Client user agent
  lastActivity: Date;    // Last activity timestamp
}