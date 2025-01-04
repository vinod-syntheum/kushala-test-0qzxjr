/**
 * User Routes Configuration
 * Version: 1.0.0
 * 
 * Implements secure REST endpoints for user management with comprehensive
 * validation, rate limiting, and audit logging capabilities.
 */

import { Router } from 'express'; // v4.18.2
import { container } from 'tsyringe'; // ^4.7.0
import helmet from 'helmet'; // ^7.0.0
import rateLimit from 'express-rate-limit'; // ^6.7.0

import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validation.middleware';
import { createUserSchema, updateUserSchema } from '../../validators/user.validator';

// Initialize router with strict security options
const router = Router();

// Initialize dependency injection
const userController = container.resolve(UserController);

/**
 * Rate limiting configurations for different operations
 */
const createUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many user creation attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const updateUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many update attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const getUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many profile requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const deleteUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many deletion attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route POST /api/users
 * @desc Create a new user with enhanced security and validation
 * @access Private - Owner only
 */
router.post('/',
  helmet(),
  createUserLimiter,
  authenticate,
  authorize('OWNER'),
  validate(createUserSchema),
  userController.createUser
);

/**
 * @route PUT /api/users/:id
 * @desc Update existing user with role-based validation
 * @access Private - Owner only
 */
router.put('/:id',
  helmet(),
  updateUserLimiter,
  authenticate,
  authorize('OWNER'),
  validate(updateUserSchema),
  userController.updateUser
);

/**
 * @route GET /api/users/:id
 * @desc Retrieve user profile with security checks
 * @access Private - Owner only
 */
router.get('/:id',
  helmet(),
  getUserLimiter,
  authenticate,
  authorize('OWNER'),
  userController.getUserProfile
);

/**
 * @route DELETE /api/users/:id
 * @desc Delete user account with security validation
 * @access Private - Owner only
 */
router.delete('/:id',
  helmet(),
  deleteUserLimiter,
  authenticate,
  authorize('OWNER'),
  userController.deleteUser
);

export default router;