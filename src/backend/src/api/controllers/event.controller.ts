/**
 * Event Controller Implementation
 * Version: 1.0.0
 * 
 * Handles HTTP requests for event management operations with enhanced validation,
 * logging, and location-specific functionality.
 */

import { 
  Controller, 
  Post, 
  Put, 
  Get, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  Query,
  HttpStatus,
  HttpException
} from '@nestjs/common'; // ^10.0.0
import { Request, Response } from 'express'; // ^4.18.2
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'; // ^7.0.0
import { RateLimit } from '@nestjs/throttler'; // ^5.0.0

import { EventService } from '../../services/event.service';
import { AuthGuard } from '../../guards/auth.guard';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { MonitoringInterceptor } from '../../interceptors/monitoring.interceptor';
import logger from '../../utils/logger.utils';
import { IEvent, EventStatus } from '../../interfaces/event.interface';

/**
 * Controller handling event-related HTTP endpoints with comprehensive validation,
 * monitoring, and error handling capabilities.
 */
@Controller('events')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor, MonitoringInterceptor)
@ApiTags('Events')
export class EventController {
  private readonly CREATION_TIME_TARGET = 15 * 60 * 1000; // 15 minutes in milliseconds

  constructor(
    private readonly eventService: EventService
  ) {}

  /**
   * Creates a new event with validation for 15-minute creation target
   */
  @Post()
  @RateLimit({ points: 10, duration: 60 })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create new event' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Event created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid event data' })
  async createEvent(
    @Body() eventData: IEvent,
    @Param('restaurantId') restaurantId: string
  ): Promise<IEvent> {
    const correlationId = logger.logRequest(eventData, 'createEvent');
    const startTime = Date.now();

    try {
      // Validate restaurant ownership and location availability
      await this.validateEventCreation(restaurantId, eventData.locationId);

      const event = await this.eventService.createEvent({
        ...eventData,
        restaurantId,
        status: EventStatus.DRAFT
      });

      // Check creation time against target
      const creationTime = Date.now() - startTime;
      if (creationTime > this.CREATION_TIME_TARGET) {
        logger.warn('Event creation exceeded target time', {
          correlationId,
          creationTime,
          target: this.CREATION_TIME_TARGET
        });
      }

      logger.info('Event created successfully', {
        correlationId,
        eventId: event.id,
        creationTime
      });

      return event;
    } catch (error) {
      logger.error('Event creation failed', {
        correlationId,
        error,
        restaurantId,
        locationId: eventData.locationId
      });
      throw error;
    }
  }

  /**
   * Updates an existing event with validation
   */
  @Put(':eventId')
  @RateLimit({ points: 20, duration: 60 })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update event' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Event updated successfully' })
  async updateEvent(
    @Param('eventId') eventId: string,
    @Body() updateData: Partial<IEvent>
  ): Promise<IEvent> {
    const correlationId = logger.logRequest(updateData, 'updateEvent');

    try {
      const event = await this.eventService.updateEvent(eventId, updateData);
      
      logger.info('Event updated successfully', {
        correlationId,
        eventId
      });

      return event;
    } catch (error) {
      logger.error('Event update failed', {
        correlationId,
        error,
        eventId
      });
      throw error;
    }
  }

  /**
   * Publishes an event making it visible to customers
   */
  @Put(':eventId/publish')
  @RateLimit({ points: 10, duration: 60 })
  @ApiOperation({ summary: 'Publish event' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Event published successfully' })
  async publishEvent(
    @Param('eventId') eventId: string
  ): Promise<IEvent> {
    const correlationId = logger.logRequest({ eventId }, 'publishEvent');

    try {
      const event = await this.eventService.publishEvent(eventId);
      
      logger.info('Event published successfully', {
        correlationId,
        eventId
      });

      return event;
    } catch (error) {
      logger.error('Event publication failed', {
        correlationId,
        error,
        eventId
      });
      throw error;
    }
  }

  /**
   * Cancels an event with refund processing
   */
  @Put(':eventId/cancel')
  @RateLimit({ points: 5, duration: 60 })
  @ApiOperation({ summary: 'Cancel event' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Event cancelled successfully' })
  async cancelEvent(
    @Param('eventId') eventId: string,
    @Body('reason') reason: string
  ): Promise<IEvent> {
    const correlationId = logger.logRequest({ eventId, reason }, 'cancelEvent');

    try {
      const event = await this.eventService.cancelEvent(eventId, reason);
      
      logger.info('Event cancelled successfully', {
        correlationId,
        eventId,
        reason
      });

      return event;
    } catch (error) {
      logger.error('Event cancellation failed', {
        correlationId,
        error,
        eventId
      });
      throw error;
    }
  }

  /**
   * Retrieves events for a specific location
   */
  @Get('location/:locationId')
  @RateLimit({ points: 100, duration: 60 })
  @ApiOperation({ summary: 'Get location events' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Events retrieved successfully' })
  async getLocationEvents(
    @Param('locationId') locationId: string,
    @Query('status') status?: EventStatus,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date
  ): Promise<IEvent[]> {
    const correlationId = logger.logRequest({ locationId, status, startDate, endDate }, 'getLocationEvents');

    try {
      const events = await this.eventService.getEventsByLocation(
        locationId,
        { status, startDate, endDate }
      );
      
      logger.info('Location events retrieved successfully', {
        correlationId,
        locationId,
        count: events.length
      });

      return events;
    } catch (error) {
      logger.error('Location events retrieval failed', {
        correlationId,
        error,
        locationId
      });
      throw error;
    }
  }

  /**
   * Validates event creation prerequisites
   */
  private async validateEventCreation(
    restaurantId: string,
    locationId: string
  ): Promise<void> {
    // Implementation would check restaurant ownership and location availability
    // This is a placeholder for the actual implementation
    if (!restaurantId || !locationId) {
      throw new HttpException(
        'Invalid restaurant or location ID',
        HttpStatus.BAD_REQUEST
      );
    }
  }
}