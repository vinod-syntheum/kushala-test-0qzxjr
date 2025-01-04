/**
 * Restaurant Entity Model
 * Version: 1.0.0
 * 
 * TypeORM entity class for restaurant data persistence with comprehensive validation,
 * security features, and multi-location support implementation.
 * 
 * @package models/postgresql
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
  getRepository,
  Index
} from 'typeorm'; // ^0.3.0

import {
  IRestaurant,
  RestaurantStatus,
} from '../../interfaces/restaurant.interface';
import { User } from './user.model';

/**
 * Restaurant entity implementing TypeORM decorators for PostgreSQL persistence
 * with built-in validation and security features.
 */
@Entity('restaurants')
@Index(['domain'], { unique: true })
@Index(['ownerId'])
export class RestaurantModel implements IRestaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true, length: 255, nullable: true })
  domain: string;

  @Column({
    type: 'enum',
    enum: RestaurantStatus,
    default: RestaurantStatus.ACTIVE
  })
  status: RestaurantStatus;

  @Column({
    type: 'jsonb',
    default: {
      maxLocations: 3,
      enableOnlinePresence: false,
      timezone: 'UTC',
      currency: 'USD',
      enableEvents: true
    }
  })
  settings: {
    maxLocations: number;
    enableOnlinePresence: boolean;
    timezone: string;
    currency: string;
    enableEvents: boolean;
  };

  @CreateDateColumn({
    type: 'timestamp with time zone'
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone'
  })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  /**
   * Validates that restaurant does not exceed maximum location limit
   * @throws {Error} If location limit is exceeded without override
   */
  @BeforeInsert()
  @BeforeUpdate()
  async validateLocationLimit(): Promise<boolean> {
    const locationRepository = getRepository('Location');
    
    // Count active locations for this restaurant
    const locationCount = await locationRepository.count({
      where: {
        restaurantId: this.id,
        status: 'ACTIVE'
      }
    });

    const maxLocations = this.settings?.maxLocations || 3;
    
    if (locationCount > maxLocations) {
      throw new Error(`Restaurant cannot exceed ${maxLocations} active locations`);
    }

    return true;
  }

  /**
   * Validates restaurant domain format and configuration
   * @throws {Error} If domain validation fails
   */
  @BeforeInsert()
  @BeforeUpdate()
  async validateDomain(): Promise<boolean> {
    if (!this.domain) {
      return true;
    }

    // RFC 1035 compliant domain regex
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

    if (!domainRegex.test(this.domain)) {
      throw new Error('Invalid domain format');
    }

    // Normalize domain to lowercase
    this.domain = this.domain.toLowerCase();

    // Verify domain uniqueness
    const existingRestaurant = await getRepository(RestaurantModel).findOne({
      where: { domain: this.domain },
      select: ['id']
    });

    if (existingRestaurant && existingRestaurant.id !== this.id) {
      throw new Error('Domain is already in use');
    }

    return true;
  }

  /**
   * Validates restaurant settings object structure and values
   * @throws {Error} If settings validation fails
   */
  @BeforeInsert()
  @BeforeUpdate()
  async validateSettings(): Promise<boolean> {
    if (!this.settings) {
      this.settings = {
        maxLocations: 3,
        enableOnlinePresence: false,
        timezone: 'UTC',
        currency: 'USD',
        enableEvents: true
      };
      return true;
    }

    // Validate maxLocations
    if (
      typeof this.settings.maxLocations !== 'number' ||
      this.settings.maxLocations < 1 ||
      this.settings.maxLocations > 3
    ) {
      throw new Error('maxLocations must be between 1 and 3');
    }

    // Validate timezone
    if (!this.settings.timezone) {
      this.settings.timezone = 'UTC';
    }

    // Validate currency
    if (!this.settings.currency) {
      this.settings.currency = 'USD';
    }

    // Ensure boolean flags
    this.settings.enableOnlinePresence = !!this.settings.enableOnlinePresence;
    this.settings.enableEvents = !!this.settings.enableEvents;

    return true;
  }

  /**
   * Transforms restaurant entity for JSON serialization
   * @returns {object} Formatted restaurant object
   */
  toJSON(): Partial<IRestaurant> {
    const restaurant = { ...this };
    
    // Format dates for API response
    restaurant.createdAt = this.createdAt?.toISOString();
    restaurant.updatedAt = this.updatedAt?.toISOString();

    // Add computed fields
    if (this.settings?.enableOnlinePresence && this.domain) {
      restaurant.websiteUrl = `https://${this.domain}`;
    }

    return restaurant;
  }
}