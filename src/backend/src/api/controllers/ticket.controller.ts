/**
 * @fileoverview Ticket controller handling HTTP endpoints for ticket operations
 * with comprehensive validation, security, monitoring and error handling.
 * @version 1.0.0
 */

import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  UseInterceptors, 
  UsePipes,
  Logger,
  HttpStatus,
  HttpException
} from '@nestjs/common'; // ^10.0.0
import { Request, Response } from 'express'; // 4.18.2
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'; // ^7.0.0
import { RateLimit } from '@nestjs/throttler'; // ^5.0.0
import { TransactionManager } from '@nestjs/typeorm'; // ^10.0.0

import { TicketService } from '../../services/ticket.service';
import { ITicket, ITicketCreate, ITicketStats, TicketStatus } from '../../interfaces/ticket.interface';
import { AuthGuard } from '../../guards/auth.guard';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { ValidationPipe } from '../../pipes/validation.pipe';
import { ERROR_MESSAGES } from '../../constants/error.constants';

@Controller('api/tickets')
@UseGuards(AuthGuard)
@ApiTags('tickets')
@UseInterceptors(LoggingInterceptor)
@UsePipes(ValidationPipe)
export class TicketController {
  private readonly logger = new Logger(TicketController.name);

  constructor(
    private readonly ticketService: TicketService,
    @TransactionManager() private readonly transactionManager: TransactionManager
  ) {}

  /**
   * Creates a new ticket for an event
   */
  @Post()
  @RateLimit({ ttl: 60, limit: 10 })
  @ApiOperation({ summary: 'Create new ticket' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Ticket created successfully' })
  async createTicket(
    @Body() ticketData: ITicketCreate
  ): Promise<ITicket> {
    this.logger.debug(`Creating ticket for event: ${ticketData.eventId}`);
    
    try {
      const ticket = await this.ticketService.createTicket(ticketData);
      this.logger.debug(`Ticket created successfully: ${ticket.id}`);
      return ticket;
    } catch (error) {
      this.logger.error('Failed to create ticket', error);
      throw new HttpException(
        ERROR_MESSAGES.SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Initiates ticket purchase process
   */
  @Post(':id/purchase')
  @RateLimit({ ttl: 60, limit: 5 })
  @ApiOperation({ summary: 'Purchase ticket' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ticket purchase initiated' })
  async purchaseTicket(
    @Param('id') ticketId: string,
    @Body('userId') userId: string
  ): Promise<ITicket> {
    this.logger.debug(`Initiating ticket purchase: ${ticketId}`);

    try {
      const ticket = await this.ticketService.purchaseTicket(ticketId, userId);
      this.logger.debug(`Ticket purchase initiated: ${ticket.id}`);
      return ticket;
    } catch (error) {
      this.logger.error('Failed to purchase ticket', error);
      throw new HttpException(
        ERROR_MESSAGES.SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Confirms ticket purchase after payment
   */
  @Put(':id/confirm')
  @ApiOperation({ summary: 'Confirm ticket purchase' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ticket purchase confirmed' })
  async confirmPurchase(
    @Param('id') ticketId: string,
    @Body('paymentId') paymentId: string
  ): Promise<ITicket> {
    this.logger.debug(`Confirming ticket purchase: ${ticketId}`);

    try {
      const ticket = await this.ticketService.confirmTicketPurchase(ticketId, paymentId);
      this.logger.debug(`Ticket purchase confirmed: ${ticket.id}`);
      return ticket;
    } catch (error) {
      this.logger.error('Failed to confirm ticket purchase', error);
      throw new HttpException(
        ERROR_MESSAGES.SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Cancels a ticket
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel ticket' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ticket cancelled successfully' })
  async cancelTicket(
    @Param('id') ticketId: string
  ): Promise<void> {
    this.logger.debug(`Cancelling ticket: ${ticketId}`);

    try {
      await this.ticketService.cancelTicket(ticketId);
      this.logger.debug(`Ticket cancelled successfully: ${ticketId}`);
    } catch (error) {
      this.logger.error('Failed to cancel ticket', error);
      throw new HttpException(
        ERROR_MESSAGES.SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves ticket by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ticket retrieved successfully' })
  async getTicketById(
    @Param('id') ticketId: string
  ): Promise<ITicket> {
    this.logger.debug(`Retrieving ticket: ${ticketId}`);

    try {
      const ticket = await this.ticketService.getTicketById(ticketId);
      if (!ticket) {
        throw new HttpException(
          ERROR_MESSAGES.RESOURCE_NOT_FOUND,
          HttpStatus.NOT_FOUND
        );
      }
      return ticket;
    } catch (error) {
      this.logger.error('Failed to retrieve ticket', error);
      throw new HttpException(
        ERROR_MESSAGES.SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves tickets for an event
   */
  @Get('event/:eventId')
  @ApiOperation({ summary: 'Get tickets by event' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tickets retrieved successfully' })
  async getTicketsByEvent(
    @Param('eventId') eventId: string
  ): Promise<ITicket[]> {
    this.logger.debug(`Retrieving tickets for event: ${eventId}`);

    try {
      const tickets = await this.ticketService.getTicketsByEvent(eventId);
      return tickets;
    } catch (error) {
      this.logger.error('Failed to retrieve event tickets', error);
      throw new HttpException(
        ERROR_MESSAGES.SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves ticket statistics for an event
   */
  @Get('event/:eventId/stats')
  @ApiOperation({ summary: 'Get ticket statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ticket statistics retrieved successfully' })
  async getTicketStats(
    @Param('eventId') eventId: string
  ): Promise<ITicketStats> {
    this.logger.debug(`Retrieving ticket statistics for event: ${eventId}`);

    try {
      const stats = await this.ticketService.getTicketStats(eventId);
      return stats;
    } catch (error) {
      this.logger.error('Failed to retrieve ticket statistics', error);
      throw new HttpException(
        ERROR_MESSAGES.SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}