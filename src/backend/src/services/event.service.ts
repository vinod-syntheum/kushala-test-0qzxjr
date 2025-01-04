/**
 * Event Service Implementation
 * Version: 1.0.0
 * 
 * Comprehensive service for managing restaurant events with integrated payment processing,
 * location management, and caching capabilities.
 */

import { Injectable, Logger } from '@nestjs/common'; // ^10.0.0
import { Repository, EntityManager } from 'typeorm'; // ^0.3.x
import { Cache } from '@nestjs/cache-manager'; // ^2.0.0
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Event } from '../models/postgresql/event.model';
import { 
  IEvent, 
  IEventCreate, 
  IEventUpdate, 
  EventStatus, 
  ITicketConfig 
} from '../interfaces/event.interface';
import { PaymentService } from './payment.service';
import { LocationService } from './location.service';

/**
 * Constants for event service configuration
 */
const EVENT_CONSTANTS = {
  CACHE_TTL: 3600, // 1 hour
  MAX_EVENTS_PER_LOCATION: 50,
  CACHE_KEYS: {
    EVENT: 'event:',
    LOCATION_EVENTS: 'location-events:'
  }
} as const;

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly eventRepository: Repository<Event>,
    private readonly paymentService: PaymentService,
    private readonly locationService: LocationService,
    private readonly cacheManager: Cache
  ) {}

  /**
   * Creates a new event with comprehensive validation and location checking
   * @param eventData Event creation data
   * @returns Created event details
   */
  public async createEvent(eventData: IEventCreate): Promise<IEvent> {
    const correlationId = crypto.randomUUID();
    this.logger.debug(`Creating event`, { correlationId, locationId: eventData.locationId });

    // Start transaction
    return await this.eventRepository.manager.transaction(async (entityManager) => {
      try {
        // Check location availability
        const locationAvailable = await this.locationService.checkLocationAvailability(
          eventData.locationId,
          eventData.startDate,
          eventData.endDate
        );

        if (!locationAvailable) {
          throw new ConflictException('Location is not available for the specified time period');
        }

        // Validate event data
        await this.validateEventData(eventData);

        // Create event entity
        const event = this.eventRepository.create({
          ...eventData,
          status: EventStatus.DRAFT
        });

        // Save event
        const savedEvent = await entityManager.save(Event, event);

        // Update location capacity
        await this.locationService.updateLocationCapacity(
          entityManager,
          eventData.locationId,
          savedEvent.id,
          eventData.capacity
        );

        // Clear relevant caches
        await this.clearEventCaches(eventData.locationId);

        this.logger.debug(`Event created successfully`, { 
          correlationId, 
          eventId: savedEvent.id 
        });

        return savedEvent;

      } catch (error) {
        this.logger.error(`Event creation failed`, {
          correlationId,
          error,
          locationId: eventData.locationId
        });
        throw error;
      }
    });
  }

  /**
   * Updates an existing event with validation
   * @param eventId Event ID
   * @param updateData Event update data
   * @returns Updated event
   */
  public async updateEvent(
    eventId: string,
    updateData: IEventUpdate
  ): Promise<IEvent> {
    const correlationId = crypto.randomUUID();
    this.logger.debug(`Updating event`, { correlationId, eventId });

    return await this.eventRepository.manager.transaction(async (entityManager) => {
      try {
        const event = await this.getEventById(eventId);

        if (event.status === EventStatus.CANCELLED) {
          throw new BadRequestException('Cannot update cancelled event');
        }

        // Validate update data
        if (updateData.startDate || updateData.endDate) {
          await this.validateEventDates(
            updateData.startDate || event.startDate,
            updateData.endDate || event.endDate,
            event.locationId,
            eventId
          );
        }

        // Update event
        Object.assign(event, updateData);
        const updatedEvent = await entityManager.save(Event, event);

        // Clear caches
        await this.clearEventCaches(event.locationId);

        this.logger.debug(`Event updated successfully`, { 
          correlationId, 
          eventId 
        });

        return updatedEvent;

      } catch (error) {
        this.logger.error(`Event update failed`, {
          correlationId,
          error,
          eventId
        });
        throw error;
      }
    });
  }

  /**
   * Publishes an event making it visible to customers
   * @param eventId Event ID
   * @returns Published event
   */
  public async publishEvent(eventId: string): Promise<IEvent> {
    const correlationId = crypto.randomUUID();
    this.logger.debug(`Publishing event`, { correlationId, eventId });

    return await this.eventRepository.manager.transaction(async (entityManager) => {
      try {
        const event = await this.getEventById(eventId);

        if (event.status !== EventStatus.DRAFT) {
          throw new BadRequestException('Only draft events can be published');
        }

        // Validate event is ready for publishing
        await this.validateEventForPublishing(event);

        // Update status
        event.status = EventStatus.PUBLISHED;
        const publishedEvent = await entityManager.save(Event, event);

        // Clear caches
        await this.clearEventCaches(event.locationId);

        this.logger.debug(`Event published successfully`, { 
          correlationId, 
          eventId 
        });

        return publishedEvent;

      } catch (error) {
        this.logger.error(`Event publishing failed`, {
          correlationId,
          error,
          eventId
        });
        throw error;
      }
    });
  }

  /**
   * Cancels an event with refund processing
   * @param eventId Event ID
   * @param reason Cancellation reason
   * @returns Cancelled event
   */
  public async cancelEvent(
    eventId: string,
    reason: string
  ): Promise<IEvent> {
    const correlationId = crypto.randomUUID();
    this.logger.debug(`Cancelling event`, { correlationId, eventId });

    return await this.eventRepository.manager.transaction(async (entityManager) => {
      try {
        const event = await this.getEventById(eventId);

        if (event.status === EventStatus.CANCELLED) {
          throw new BadRequestException('Event is already cancelled');
        }

        // Process refunds if needed
        if (event.status === EventStatus.PUBLISHED) {
          await this.processEventCancellationRefunds(event, reason);
        }

        // Update status
        event.status = EventStatus.CANCELLED;
        const cancelledEvent = await entityManager.save(Event, event);

        // Clear caches
        await this.clearEventCaches(event.locationId);

        this.logger.debug(`Event cancelled successfully`, { 
          correlationId, 
          eventId 
        });

        return cancelledEvent;

      } catch (error) {
        this.logger.error(`Event cancellation failed`, {
          correlationId,
          error,
          eventId
        });
        throw error;
      }
    });
  }

  /**
   * Retrieves an event by ID with caching
   * @param eventId Event ID
   * @returns Event details
   */
  private async getEventById(eventId: string): Promise<Event> {
    const cacheKey = `${EVENT_CONSTANTS.CACHE_KEYS.EVENT}${eventId}`;
    
    // Check cache
    const cachedEvent = await this.cacheManager.get<Event>(cacheKey);
    if (cachedEvent) {
      return cachedEvent;
    }

    // Get from database
    const event = await this.eventRepository.findOne({ 
      where: { id: eventId } 
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Cache result
    await this.cacheManager.set(cacheKey, event, EVENT_CONSTANTS.CACHE_TTL);

    return event;
  }

  /**
   * Validates event data before creation/update
   * @param eventData Event data to validate
   */
  private async validateEventData(eventData: IEventCreate | IEventUpdate): Promise<void> {
    // Validate dates
    if (eventData.startDate && eventData.endDate) {
      await this.validateEventDates(
        eventData.startDate,
        eventData.endDate,
        eventData.locationId
      );
    }

    // Validate capacity
    if (eventData.capacity && eventData.capacity < 1) {
      throw new BadRequestException('Event capacity must be greater than 0');
    }

    // Validate ticket configuration
    if (eventData.ticketConfig) {
      this.validateTicketConfig(eventData.ticketConfig);
    }
  }

  /**
   * Validates event dates for conflicts
   */
  private async validateEventDates(
    startDate: Date,
    endDate: Date,
    locationId: string,
    excludeEventId?: string
  ): Promise<void> {
    const now = new Date();

    if (startDate <= now) {
      throw new BadRequestException('Event start date must be in the future');
    }

    if (endDate <= startDate) {
      throw new BadRequestException('Event end date must be after start date');
    }

    // Check for conflicts
    const conflicts = await this.eventRepository.createQueryBuilder('event')
      .where('event.locationId = :locationId', { locationId })
      .andWhere('event.status != :status', { status: EventStatus.CANCELLED })
      .andWhere('event.startDate < :endDate', { endDate })
      .andWhere('event.endDate > :startDate', { startDate })
      .andWhere('event.id != :excludeEventId', { excludeEventId: excludeEventId || '' })
      .getCount();

    if (conflicts > 0) {
      throw new ConflictException('Event time conflicts with existing events');
    }
  }

  /**
   * Validates ticket configuration
   */
  private validateTicketConfig(ticketConfig: ITicketConfig): void {
    if (!ticketConfig.types || ticketConfig.types.length === 0) {
      throw new BadRequestException('At least one ticket type is required');
    }

    for (const type of ticketConfig.types) {
      if (type.price < 0) {
        throw new BadRequestException('Ticket price cannot be negative');
      }
      if (type.quantity < 1) {
        throw new BadRequestException('Ticket quantity must be greater than 0');
      }
    }
  }

  /**
   * Validates event is ready for publishing
   */
  private async validateEventForPublishing(event: Event): Promise<void> {
    if (!event.ticketConfig || !event.ticketConfig.types.length) {
      throw new BadRequestException('Event must have ticket types configured before publishing');
    }

    if (!event.description || !event.name) {
      throw new BadRequestException('Event must have name and description before publishing');
    }

    const startDate = new Date(event.startDate);
    if (startDate <= new Date()) {
      throw new BadRequestException('Cannot publish event with past start date');
    }
  }

  /**
   * Processes refunds for cancelled event
   */
  private async processEventCancellationRefunds(
    event: Event,
    reason: string
  ): Promise<void> {
    // Implementation would handle refund processing through PaymentService
    // This is a placeholder for the actual implementation
    this.logger.debug(`Processing refunds for cancelled event`, { 
      eventId: event.id 
    });
  }

  /**
   * Clears event-related caches
   */
  private async clearEventCaches(locationId: string): Promise<void> {
    const cacheKeys = [
      `${EVENT_CONSTANTS.CACHE_KEYS.LOCATION_EVENTS}${locationId}`,
      `${EVENT_CONSTANTS.CACHE_KEYS.EVENT}*`
    ];

    await Promise.all(
      cacheKeys.map(key => this.cacheManager.del(key))
    );
  }
}