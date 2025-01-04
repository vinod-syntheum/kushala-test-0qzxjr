import { Event } from '../../src/types/event';
import dayjs from 'dayjs'; // ^1.11.10
import '@testing-library/cypress'; // ^10.0.0

// Test event data
const testEvent: Partial<Event> = {
  name: 'Wine Tasting Event',
  description: 'An evening of fine wine tasting and appetizers',
  startDate: dayjs().add(1, 'day').toISOString(),
  endDate: dayjs().add(1, 'day').add(3, 'hours').toISOString()
};

// Selectors object for maintainability
const selectors = {
  createEventBtn: '[data-cy=create-event-btn]',
  eventForm: {
    nameInput: '[data-cy=event-name-input]',
    descriptionInput: '[data-cy=event-description-input]',
    startDateInput: '[data-cy=event-start-date]',
    endDateInput: '[data-cy=event-end-date]',
    capacityInput: '[data-cy=event-capacity]',
    ticketTypeSelect: '[data-cy=ticket-type-select]',
    ticketPriceInput: '[data-cy=ticket-price-input]',
    ticketQuantityInput: '[data-cy=ticket-quantity-input]',
    imageUpload: '[data-cy=event-image-upload]',
    submitBtn: '[data-cy=event-submit-btn]'
  },
  eventList: {
    container: '[data-cy=event-list]',
    eventItem: '[data-cy=event-item]',
    editBtn: '[data-cy=edit-event-btn]',
    deleteBtn: '[data-cy=delete-event-btn]'
  },
  ticketManagement: {
    salesStatus: '[data-cy=ticket-sales-status]',
    attendeeList: '[data-cy=attendee-list]',
    checkInBtn: '[data-cy=check-in-btn]'
  }
};

describe('Event Management E2E Tests', () => {
  beforeEach(() => {
    // Reset application state
    cy.task('db:reset');
    
    // Intercept API calls
    cy.intercept('POST', '/api/v1/events').as('createEvent');
    cy.intercept('GET', '/api/v1/events/*').as('getEvent');
    cy.intercept('PUT', '/api/v1/events/*').as('updateEvent');
    cy.intercept('DELETE', '/api/v1/events/*').as('deleteEvent');
    
    // Login and navigate to event management
    cy.login('restaurant-owner@example.com', 'password123');
    cy.visit('/dashboard/events');
    
    // Set viewport for consistent testing
    cy.viewport(1280, 720);
  });

  describe('Event Creation Performance', () => {
    it('should create event within 15 minutes', () => {
      const startTime = Date.now();
      
      // Click create event button
      cy.get(selectors.createEventBtn).click();
      
      // Fill event details
      cy.get(selectors.eventForm.nameInput).type(testEvent.name!);
      cy.get(selectors.eventForm.descriptionInput).type(testEvent.description!);
      cy.get(selectors.eventForm.startDateInput).type(testEvent.startDate!);
      cy.get(selectors.eventForm.endDateInput).type(testEvent.endDate!);
      cy.get(selectors.eventForm.capacityInput).type('100');
      
      // Configure ticket types
      cy.get(selectors.eventForm.ticketTypeSelect).click();
      cy.contains('General Admission').click();
      cy.get(selectors.eventForm.ticketPriceInput).type('50');
      cy.get(selectors.eventForm.ticketQuantityInput).type('100');
      
      // Upload event image
      cy.get(selectors.eventForm.imageUpload)
        .attachFile('test-event-image.jpg');
      
      // Submit form
      cy.get(selectors.eventForm.submitBtn).click();
      
      // Wait for API response
      cy.wait('@createEvent').its('response.statusCode').should('eq', 201);
      
      // Verify creation time
      const endTime = Date.now();
      const creationTimeMinutes = (endTime - startTime) / (1000 * 60);
      expect(creationTimeMinutes).to.be.lessThan(15);
      
      // Verify event details
      cy.get(selectors.eventList.container)
        .should('contain', testEvent.name);
    });
  });

  describe('Event Management Operations', () => {
    it('should handle event updates correctly', () => {
      // Create test event first
      cy.createTestEvent(testEvent);
      
      // Edit event
      cy.get(selectors.eventList.editBtn).first().click();
      const updatedName = 'Updated Wine Tasting';
      cy.get(selectors.eventForm.nameInput)
        .clear()
        .type(updatedName);
      cy.get(selectors.eventForm.submitBtn).click();
      
      // Verify update
      cy.wait('@updateEvent');
      cy.get(selectors.eventList.container)
        .should('contain', updatedName);
    });

    it('should handle event deletion', () => {
      // Create test event first
      cy.createTestEvent(testEvent);
      
      // Delete event
      cy.get(selectors.eventList.deleteBtn).first().click();
      cy.contains('Confirm').click();
      
      // Verify deletion
      cy.wait('@deleteEvent');
      cy.get(selectors.eventList.container)
        .should('not.contain', testEvent.name);
    });
  });

  describe('Ticket Management', () => {
    it('should process ticket sales correctly', () => {
      // Create event with tickets
      cy.createTestEvent({
        ...testEvent,
        ticketPrice: 50,
        ticketQuantity: 100
      });
      
      // Simulate ticket purchase
      cy.visit(`/events/${testEvent.name}`);
      cy.get('[data-cy=buy-ticket-btn]').click();
      cy.get('[data-cy=quantity-select]').select('2');
      cy.get('[data-cy=checkout-btn]').click();
      
      // Fill payment details
      cy.fillStripeElements({
        cardNumber: '4242424242424242',
        cardExpiry: '12/25',
        cardCvc: '123'
      });
      
      // Complete purchase
      cy.get('[data-cy=complete-purchase-btn]').click();
      
      // Verify ticket sale
      cy.get(selectors.ticketManagement.salesStatus)
        .should('contain', '2 tickets sold');
    });

    it('should track attendees correctly', () => {
      // Create event and sell tickets
      cy.createTestEvent(testEvent);
      cy.sellTestTickets(2);
      
      // Check attendee list
      cy.get(selectors.ticketManagement.attendeeList)
        .find('li')
        .should('have.length', 2);
      
      // Test check-in functionality
      cy.get(selectors.ticketManagement.checkInBtn)
        .first()
        .click();
      
      // Verify check-in status
      cy.get(selectors.ticketManagement.attendeeList)
        .find('li')
        .first()
        .should('have.class', 'checked-in');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      cy.get(selectors.createEventBtn).click();
      cy.get(selectors.eventForm.submitBtn).click();
      
      // Verify error messages
      cy.get('[data-cy=error-message]')
        .should('be.visible')
        .and('contain', 'Name is required')
        .and('contain', 'Description is required')
        .and('contain', 'Start date is required')
        .and('contain', 'End date is required');
    });

    it('should handle network errors appropriately', () => {
      cy.intercept('POST', '/api/v1/events', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      });
      
      cy.createTestEvent(testEvent);
      
      // Verify error notification
      cy.get('[data-cy=error-notification]')
        .should('be.visible')
        .and('contain', 'Failed to create event');
    });
  });
});