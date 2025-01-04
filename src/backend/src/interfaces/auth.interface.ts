/**
 * Authentication and Authorization Interfaces
 * Version: 1.0.0
 * 
 * This module defines TypeScript interfaces for the authentication and authorization system,
 * including JWT tokens, role-based access control, MFA, and password management.
 */

/**
 * Enumeration of user roles for role-based access control.
 * Used to determine permission levels across the application.
 */
export enum UserRole {
  OWNER = 'OWNER',     // Full system access
  MANAGER = 'MANAGER', // Limited administrative access
  STAFF = 'STAFF'      // Basic operational access
}

/**
 * Interface for login request credentials.
 * Supports both standard and MFA-enabled login flows.
 */
export interface LoginCredentials {
  email: string;           // User's email address
  password: string;        // User's password (will be hashed)
  totpCode?: string;      // Optional TOTP code for MFA
}

/**
 * Interface defining the structure of JWT token payload.
 * Contains essential user information and security metadata.
 */
export interface JwtPayload {
  userId: string;         // Unique user identifier
  email: string;         // User's email address
  role: UserRole;        // User's role for RBAC
  mfaEnabled: boolean;   // MFA status flag
  iat: number;          // Token issued at timestamp
  exp: number;          // Token expiration timestamp
}

/**
 * Interface for authentication token response.
 * Provides JWT token pair with associated metadata.
 */
export interface TokenResponse {
  accessToken: string;    // Short-lived JWT access token
  refreshToken: string;   // Long-lived JWT refresh token
  expiresIn: number;     // Access token expiration time in seconds
  tokenType: string;     // Token type (typically "Bearer")
}

/**
 * Interface for refresh token request.
 * Used to obtain a new access token using a valid refresh token.
 */
export interface RefreshTokenRequest {
  refreshToken: string;   // Valid refresh token
}

/**
 * Interface extending Express Request with authenticated user data.
 * Available after successful JWT authentication.
 */
export interface AuthenticatedRequest {
  user: JwtPayload;      // Decoded JWT payload with user information
}

/**
 * Interface for MFA setup response.
 * Contains necessary information for TOTP setup.
 */
export interface MfaSetupResponse {
  secretKey: string;     // TOTP secret key
  qrCodeUrl: string;     // QR code URL for TOTP app scanning
  recoveryKeys: string[]; // Backup recovery codes
}

/**
 * Interface for MFA verification request.
 * Used to validate TOTP codes during authentication.
 */
export interface MfaVerifyRequest {
  totpCode: string;      // Time-based one-time password
}

/**
 * Interface for password reset request.
 * Initiates the password recovery process.
 */
export interface PasswordResetRequest {
  email: string;         // User's email for reset link
}

/**
 * Interface for password reset confirmation.
 * Completes the password recovery process.
 */
export interface PasswordResetConfirmation {
  token: string;         // Password reset verification token
  newPassword: string;   // New password
  confirmPassword: string; // Password confirmation
}