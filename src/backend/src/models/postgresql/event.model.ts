/**
 * PostgreSQL Event Model
 * Version: 1.0.0
 * 
 * Database model for event management with optimized indexes and data validation.
 * Supports event creation, ticketing, and lifecycle management with performance
 * optimizations for fast queries and efficient data retrieval.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'; // v0.3.x

import {
  IEvent,
  EventStatus
} from '../../interfaces/event.interface';

import { TicketType } from '../../interfaces/ticket.interface';

@Entity('events')
@Index(['restaurantId', 'locationId']) // Optimize queries by location
@Index(['status', 'startDate']) // Optimize event listing queries
@Index(['startDate', 'endDate']) // Optimize date range queries
export class Event implements IEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  restaurantId: string;

  @Column({ type: 'uuid', nullable: false })
  locationId: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: false })
  description: string;

  @Column({ type: 'timestamp with time zone', nullable: false })
  startDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: false })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT
  })
  status: EventStatus;

  @Column({ type: 'integer', nullable: false })
  capacity: number;

  @Column({
    type: 'jsonb',
    array: true,
    nullable: false,
    default: []
  })
  ticketTypes: TicketType[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  timezone: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * Validates event date ranges and business rules
   * @returns boolean indicating if dates are valid
   */
  validateDates(): boolean {
    const now = new Date();
    
    // Event must start in the future
    if (this.startDate <= now) {
      return false;
    }

    // End date must be after start date
    if (this.endDate <= this.startDate) {
      return false;
    }

    // Event duration should not exceed 24 hours
    const duration = this.endDate.getTime() - this.startDate.getTime();
    const maxDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (duration > maxDuration) {
      return false;
    }

    return true;
  }

  /**
   * Transforms the event entity into a plain JSON object
   * Formats dates and sanitizes data for API responses
   */
  toJSON(): Partial<IEvent> {
    return {
      id: this.id,
      restaurantId: this.restaurantId,
      locationId: this.locationId,
      name: this.name,
      description: this.description,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
      status: this.status,
      capacity: this.capacity,
      ticketTypes: this.ticketTypes,
      imageUrl: this.imageUrl,
      timezone: this.timezone,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}