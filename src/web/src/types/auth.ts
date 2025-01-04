/**
 * TypeScript type definitions for authentication and authorization in the web application.
 * Includes user roles, authentication states, and API request/response types.
 * @version 1.0.0
 */

import { ApiResponse, ApiError } from './common';

/**
 * Enumeration of user roles for role-based access control (RBAC)
 * Based on the authorization matrix defined in the technical specifications
 */
export enum UserRole {
  OWNER = 'OWNER',     // Full access to all features
  MANAGER = 'MANAGER', // Limited administrative access
  STAFF = 'STAFF'      // Basic operational access
}

/**
 * Interface representing the authentication state in the application
 * Stores the current user's authentication status and tokens
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  accessToken: string | null;  // JWT token with 24h expiry
  refreshToken: string | null; // Refresh token with 7d expiry
}

/**
 * Interface for login request credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string; // Optional MFA verification code
}

/**
 * Interface for user profile information
 * Contains non-sensitive user data for frontend display
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  mfaEnabled?: boolean;
  lastLoginAt?: string;
}

/**
 * Interface for successful authentication response
 * Includes JWT tokens and user profile information
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Token expiration time in seconds
  user: UserProfile;
}

/**
 * Interface for refresh token request payload
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Interface for password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Interface for password reset confirmation
 */
export interface PasswordResetConfirmation {
  token: string;
  newPassword: string;
}

/**
 * Interface for MFA setup response
 */
export interface MfaSetupResponse {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

/**
 * Interface for MFA verification request
 */
export interface MfaVerificationRequest {
  code: string;
  rememberDevice?: boolean;
}

/**
 * Type alias for authentication API responses
 */
export type AuthApiResponse<T> = ApiResponse<T>;

/**
 * Type alias for authentication error responses
 */
export type AuthApiError = ApiError;

/**
 * Type guard to check if a user has required role
 * @param user - The user profile to check
 * @param requiredRole - The required role
 */
export function hasRequiredRole(
  user: UserProfile | null,
  requiredRole: UserRole
): boolean {
  if (!user) return false;
  
  const roleHierarchy = {
    [UserRole.OWNER]: 3,
    [UserRole.MANAGER]: 2,
    [UserRole.STAFF]: 1
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}