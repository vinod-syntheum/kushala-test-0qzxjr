/**
 * Location Entity Model
 * Version: 1.0.0
 * 
 * TypeORM entity class for location data persistence with comprehensive validation,
 * spatial data support, and advanced business logic for location management.
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
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
  getRepository
} from 'typeorm'; // ^0.3.0

import { Point } from 'geojson'; // ^2.0.0
import { IsLatLong, IsPhoneNumber, IsEmail, ValidateNested } from 'class-validator'; // ^0.14.0

import {
  ILocation,
  LocationStatus,
  IAddress,
  IOperatingHours
} from '../../interfaces/location.interface';
import { RestaurantModel } from './restaurant.model';

/**
 * Location entity implementing TypeORM decorators with comprehensive validation
 * and spatial data support for restaurant location management.
 */
@Entity('locations')
@Index('idx_location_coordinates', ['coordinates'], { spatial: true })
@Index('idx_location_restaurant', ['restaurantId'])
export class LocationModel implements ILocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  restaurantId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  address: IAddress;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326
  })
  @IsLatLong()
  coordinates: Point;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  operatingHours: IOperatingHours;

  @Column()
  @IsPhoneNumber()
  phone: string;

  @Column()
  @IsEmail()
  email: string;

  @Column({
    type: 'enum',
    enum: LocationStatus,
    default: LocationStatus.ACTIVE
  })
  status: LocationStatus;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ length: 50 })
  timezone: string;

  @Column('text', { array: true, default: [] })
  features: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => RestaurantModel)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: RestaurantModel;

  /**
   * Validates that restaurant does not exceed maximum location limit
   * and handles primary location constraints
   * @throws {Error} If validation fails
   */
  @BeforeInsert()
  async validateLocationLimit(): Promise<boolean> {
    const restaurantRepo = getRepository(RestaurantModel);
    const restaurant = await restaurantRepo.findOne({
      where: { id: this.restaurantId }
    });

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const locationRepo = getRepository(LocationModel);
    const activeLocations = await locationRepo.count({
      where: {
        restaurantId: this.restaurantId,
        status: LocationStatus.ACTIVE
      }
    });

    if (activeLocations >= restaurant.settings.maxLocations) {
      throw new Error(`Maximum location limit of ${restaurant.settings.maxLocations} reached`);
    }

    // Handle primary location constraints
    if (this.isPrimary) {
      const existingPrimary = await locationRepo.findOne({
        where: {
          restaurantId: this.restaurantId,
          isPrimary: true
        }
      });

      if (existingPrimary && existingPrimary.id !== this.id) {
        throw new Error('Another primary location already exists');
      }
    }

    return true;
  }

  /**
   * Validates GeoJSON Point coordinates with bounds checking
   * @throws {Error} If coordinates are invalid
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateCoordinates(): boolean {
    if (!this.coordinates || !this.coordinates.type || this.coordinates.type !== 'Point') {
      throw new Error('Invalid GeoJSON Point format');
    }

    const [longitude, latitude] = this.coordinates.coordinates;

    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }

    return true;
  }

  /**
   * Validates operating hours structure and timezone
   * @throws {Error} If operating hours validation fails
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateOperatingHours(): boolean {
    if (!this.operatingHours) {
      throw new Error('Operating hours are required');
    }

    const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of weekDays) {
      if (!Array.isArray(this.operatingHours[day])) {
        throw new Error(`Invalid operating hours format for ${day}`);
      }

      for (const timeRange of this.operatingHours[day]) {
        if (!timeRange.open || !timeRange.close) {
          if (!timeRange.isClosed) {
            throw new Error(`Invalid time range for ${day}`);
          }
        }

        // Validate time format (HH:mm)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRange.isClosed) {
          if (!timeRegex.test(timeRange.open) || !timeRegex.test(timeRange.close)) {
            throw new Error(`Invalid time format for ${day}`);
          }
        }
      }
    }

    // Validate timezone
    const timezoneRegex = /^[A-Za-z]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)*$/;
    if (!timezoneRegex.test(this.timezone)) {
      throw new Error('Invalid timezone format');
    }

    return true;
  }

  /**
   * Transforms location entity for API responses
   * @returns {object} Formatted location object
   */
  toJSON(): Partial<ILocation> {
    const location = { ...this };

    // Format dates
    location.createdAt = this.createdAt?.toISOString();
    location.updatedAt = this.updatedAt?.toISOString();

    // Format coordinates for GeoJSON compatibility
    if (this.coordinates) {
      location.coordinates = {
        type: 'Point',
        coordinates: [
          Number(this.coordinates.coordinates[0].toFixed(6)),
          Number(this.coordinates.coordinates[1].toFixed(6))
        ]
      };
    }

    return location;
  }
}