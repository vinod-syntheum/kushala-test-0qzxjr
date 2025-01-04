/**
 * PostgreSQL Ticket Model
 * Version: 1.0.0
 * 
 * Database model for ticket management with comprehensive payment tracking,
 * security measures, and performance optimizations. Implements the ITicket
 * interface with enhanced validation and data integrity features.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'; // v0.3.x

import {
  ITicket,
  TicketType,
  TicketStatus
} from '../../interfaces/ticket.interface';

import { Event } from './event.model';

@Entity('tickets')
@Index(['eventId', 'status'], { name: 'IDX_TICKET_EVENT_STATUS' })
@Index(['purchaseDate'], { name: 'IDX_TICKET_PURCHASE_DATE' })
export class Ticket implements ITicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @JoinColumn({ name: 'eventId' })
  eventId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: TicketType
  })
  type: TicketType;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.AVAILABLE
  })
  status: TicketStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value)
    }
  })
  price: number;

  @Column({
    type: 'timestamp with time zone',
    nullable: true
  })
  purchaseDate: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  paymentId: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true
  })
  paymentProvider: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @CreateDateColumn({
    type: 'timestamp with time zone'
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone'
  })
  updatedAt: Date;

  /**
   * Validates payment information before saving
   * @param paymentId - Payment transaction identifier
   * @param provider - Payment provider name
   * @returns boolean indicating if payment info is valid
   */
  validatePayment(paymentId: string, provider: string): boolean {
    // Validate payment ID format
    if (!paymentId || paymentId.length < 10) {
      return false;
    }

    // Validate provider
    const validProviders = ['stripe', 'paypal'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return false;
    }

    // Validate price format
    if (this.price <= 0 || isNaN(this.price)) {
      return false;
    }

    // Validate status consistency
    if (this.status !== TicketStatus.RESERVED) {
      return false;
    }

    return true;
  }

  /**
   * Transforms the ticket entity into a secure JSON object
   * Formats dates and masks sensitive payment information
   */
  toJSON(): Partial<ITicket> & { eventTitle?: string } {
    const ticket = {
      id: this.id,
      eventId: this.eventId,
      userId: this.userId,
      type: this.type,
      status: this.status,
      price: this.price,
      purchaseDate: this.purchaseDate?.toISOString(),
      // Mask sensitive payment information
      paymentId: this.paymentId ? `${this.paymentId.slice(0, 4)}...${this.paymentId.slice(-4)}` : null,
      paymentProvider: this.paymentProvider,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };

    // Include event title if relation is loaded
    if (this.event) {
      Object.assign(ticket, { eventTitle: this.event.name });
    }

    return ticket;
  }
}