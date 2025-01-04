/**
 * Development Seed File - Users
 * Version: 1.0.0
 * 
 * Seeds the users table with initial test data for development and testing.
 * Creates users with different roles (owner, manager, staff) with securely hashed passwords.
 */

import { Knex } from 'knex'; // v2.5.0
import { IUser } from '../../interfaces/user.interface';
import { UserRole } from '../../interfaces/auth.interface';
import { hashPassword } from '../../utils/crypto.utils';
import { AccountStatus } from '../../interfaces/user.interface';

// Test users data with different roles for comprehensive testing
const TEST_USERS = [
  {
    email: 'owner@restaurant.test',
    password: 'Owner123!@#',
    firstName: 'John',
    lastName: 'Owner',
    role: UserRole.OWNER
  },
  {
    email: 'manager@restaurant.test',
    password: 'Manager123!@#',
    firstName: 'Jane',
    lastName: 'Manager',
    role: UserRole.MANAGER
  },
  {
    email: 'staff@restaurant.test',
    password: 'Staff123!@#',
    firstName: 'Bob',
    lastName: 'Staff',
    role: UserRole.STAFF
  }
];

/**
 * Seeds the users table with development test data
 * @param knex - Knex instance
 * @returns Promise<void>
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Begin transaction for atomic operation
    await knex.transaction(async (trx) => {
      // Clean existing entries
      await trx('users').truncate();

      // Create users with hashed passwords
      const usersToInsert: Partial<IUser>[] = await Promise.all(
        TEST_USERS.map(async (user) => {
          const now = new Date();
          return {
            email: user.email,
            passwordHash: await hashPassword(user.password),
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            accountStatus: AccountStatus.ACTIVE,
            mfaEnabled: false,
            lastPasswordChange: now,
            createdAt: now,
            updatedAt: now
          };
        })
      );

      // Insert all users
      await trx('users').insert(usersToInsert);

      // Verify insertion
      const insertedCount = await trx('users').count('* as count').first();
      if (insertedCount?.count !== TEST_USERS.length) {
        throw new Error('Failed to insert all test users');
      }

      console.log(`Successfully seeded ${TEST_USERS.length} users`);
    });
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}