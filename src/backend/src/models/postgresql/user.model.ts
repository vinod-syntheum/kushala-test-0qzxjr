/**
 * User Entity Model
 * Version: 1.0.0
 * 
 * TypeORM entity class for user data persistence with comprehensive validation,
 * security features, and role-based access control implementation.
 * 
 * @package models/postgresql
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm'; // ^0.3.0
import { Exclude } from 'class-transformer'; // ^0.5.1
import { IUser } from '../../interfaces/user.interface';
import { UserRole } from '../../interfaces/auth.interface';

/**
 * User entity implementing TypeORM decorators for PostgreSQL persistence
 * with built-in validation and security features.
 */
@Entity('users')
export class User implements IUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    unique: true,
    length: 255,
    nullable: false
  })
  email: string;

  @Column({ nullable: false })
  @Exclude({ toPlainOnly: true })
  passwordHash: string;

  @Column({
    length: 100,
    nullable: false
  })
  firstName: string;

  @Column({
    length: 100,
    nullable: false
  })
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.OWNER
  })
  role: UserRole;

  @Column({
    type: 'boolean',
    default: false
  })
  mfaEnabled: boolean;

  @Column({
    type: 'timestamp with time zone',
    nullable: true
  })
  lastPasswordChange: Date;

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'PENDING', 'SUSPENDED', 'DEACTIVATED'],
    default: 'PENDING'
  })
  accountStatus: string;

  @CreateDateColumn({
    type: 'timestamp with time zone'
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone'
  })
  updatedAt: Date;

  /**
   * Validates email format using RFC 5322 standard before insert/update
   * @throws {Error} If email format is invalid
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateEmail() {
    // RFC 5322 compliant email regex pattern
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!this.email || !emailRegex.test(this.email)) {
      throw new Error('Invalid email format');
    }
    
    // Normalize email to lowercase
    this.email = this.email.toLowerCase();
  }

  /**
   * Custom serialization method to ensure sensitive data removal
   * @returns {object} Sanitized user object
   */
  toJSON(): Partial<IUser> {
    const user = { ...this };
    delete user.passwordHash;
    return user;
  }

  /**
   * Validates user name fields before insert/update
   * @throws {Error} If name fields are invalid
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateNames() {
    if (!this.firstName || this.firstName.length < 1 || this.firstName.length > 100) {
      throw new Error('First name must be between 1 and 100 characters');
    }
    if (!this.lastName || this.lastName.length < 1 || this.lastName.length > 100) {
      throw new Error('Last name must be between 1 and 100 characters');
    }
  }

  /**
   * Updates the lastPasswordChange timestamp when password is changed
   */
  updatePasswordTimestamp() {
    this.lastPasswordChange = new Date();
  }
}