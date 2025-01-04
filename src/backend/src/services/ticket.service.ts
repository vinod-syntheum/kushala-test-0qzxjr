/**
 * @fileoverview Enterprise-grade ticket service implementing comprehensive ticket management
 * with transaction support, caching, and monitoring capabilities.
 * @version 1.0.0
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Repository, EntityManager, QueryRunner } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';

import {
  ITicket,
  ITicketCreate,
  ITicketUpdate,
  TicketType,
  TicketStatus,
  ITicketStats,
  ITicketBatch
} from '../interfaces/ticket.interface';
import { Ticket } from '../models/postgresql/ticket.model';
import { PaymentService } from './payment.service';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly BATCH_SIZE = 100;

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly paymentService: PaymentService,
    private readonly cacheManager: Cache
  ) {}

  /**
   * Creates a batch of tickets for an event with transaction support
   * @param batchData Ticket batch creation data
   * @returns Promise<ITicket[]> Created tickets
   */
  async createTicketBatch(batchData: ITicketBatch): Promise<ITicket[]> {
    this.logger.debug(`Creating ticket batch for event: ${batchData.eventId}`);

    const queryRunner = this.ticketRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tickets: Ticket[] = [];
      
      // Create tickets in smaller batches for better performance
      for (let i = 0; i < batchData.quantity; i += this.BATCH_SIZE) {
        const batchTickets = await this.createBatchChunk(
          batchData,
          Math.min(this.BATCH_SIZE, batchData.quantity - i),
          queryRunner.manager
        );
        tickets.push(...batchTickets);
      }

      await queryRunner.commitTransaction();
      await this.invalidateEventCache(batchData.eventId);
      
      this.logger.debug(`Successfully created ${tickets.length} tickets`);
      return tickets;

    } catch (error) {
      this.logger.error('Failed to create ticket batch', error);
      await queryRunner.rollbackTransaction();
      throw new ConflictException('Failed to create ticket batch');

    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Purchases a ticket with payment processing and validation
   * @param ticketId Ticket identifier
   * @param userId User identifier
   * @returns Promise<ITicket> Updated ticket
   */
  async purchaseTicket(ticketId: string, userId: string): Promise<ITicket> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status !== TicketStatus.AVAILABLE) {
      throw new ConflictException('Ticket is not available for purchase');
    }

    const queryRunner = this.ticketRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create payment intent
      const paymentIntent = await this.paymentService.createPaymentIntent(ticketId, {
        amount: ticket.price,
        currency: 'usd',
        metadata: { ticketId, userId }
      });

      // Update ticket status
      ticket.status = TicketStatus.RESERVED;
      ticket.userId = userId;
      ticket.paymentId = paymentIntent.id;
      
      await queryRunner.manager.save(Ticket, ticket);
      await queryRunner.commitTransaction();
      
      await this.invalidateEventCache(ticket.eventId);
      return ticket;

    } catch (error) {
      this.logger.error('Failed to process ticket purchase', error);
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Failed to process ticket purchase');

    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validates a ticket for event entry
   * @param ticketId Ticket identifier
   * @returns Promise<boolean> Validation result
   */
  async validateTicket(ticketId: string): Promise<boolean> {
    const cacheKey = `ticket_validation_${ticketId}`;
    const cachedResult = await this.cacheManager.get<boolean>(cacheKey);

    if (cachedResult !== undefined) {
      return cachedResult;
    }

    const ticket = await this.ticketRepository.findOne({ 
      where: { id: ticketId },
      relations: ['event']
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isValid = ticket.status === TicketStatus.SOLD && 
                   new Date() <= ticket.event.endDate;

    await this.cacheManager.set(cacheKey, isValid, this.CACHE_TTL);
    return isValid;
  }

  /**
   * Retrieves ticket statistics for an event
   * @param eventId Event identifier
   * @returns Promise<ITicketStats> Ticket statistics
   */
  async getEventTicketStats(eventId: string): Promise<ITicketStats> {
    const cacheKey = `event_stats_${eventId}`;
    const cachedStats = await this.cacheManager.get<ITicketStats>(cacheKey);

    if (cachedStats) {
      return cachedStats;
    }

    const stats = await this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.eventId = :eventId', { eventId })
      .select([
        'COUNT(*) as totalTickets',
        'SUM(CASE WHEN status = :sold THEN 1 ELSE 0 END) as soldTickets',
        'SUM(CASE WHEN status = :available THEN 1 ELSE 0 END) as availableTickets',
        'SUM(CASE WHEN status = :sold THEN price ELSE 0 END) as revenue'
      ])
      .setParameters({
        sold: TicketStatus.SOLD,
        available: TicketStatus.AVAILABLE
      })
      .getRawOne();

    const ticketStats: ITicketStats = {
      totalTickets: parseInt(stats.totalTickets),
      soldTickets: parseInt(stats.soldTickets),
      availableTickets: parseInt(stats.availableTickets),
      revenue: parseInt(stats.revenue),
      refundedTickets: 0,
      averagePrice: stats.soldTickets > 0 ? stats.revenue / stats.soldTickets : 0
    };

    await this.cacheManager.set(cacheKey, ticketStats, this.CACHE_TTL);
    return ticketStats;
  }

  /**
   * Creates a chunk of tickets as part of a batch operation
   * @param batchData Ticket batch data
   * @param chunkSize Size of the chunk
   * @param manager Entity manager
   * @returns Promise<Ticket[]> Created tickets
   */
  private async createBatchChunk(
    batchData: ITicketBatch,
    chunkSize: number,
    manager: EntityManager
  ): Promise<Ticket[]> {
    const tickets = Array(chunkSize).fill(null).map(() => {
      const ticket = new Ticket();
      ticket.eventId = batchData.eventId;
      ticket.type = batchData.type;
      ticket.price = batchData.price;
      ticket.status = TicketStatus.AVAILABLE;
      return ticket;
    });

    return await manager.save(Ticket, tickets);
  }

  /**
   * Invalidates event-related cache entries
   * @param eventId Event identifier
   */
  private async invalidateEventCache(eventId: string): Promise<void> {
    const cacheKeys = [
      `event_stats_${eventId}`,
      `event_tickets_${eventId}`
    ];

    await Promise.all(
      cacheKeys.map(key => this.cacheManager.del(key))
    );
  }
}