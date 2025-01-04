import { Location, LocationStatus, Address } from '../../src/types/location';
import type { TimeRange, OperatingHours } from '../../src/types/location';
import type { Coordinates } from '../../src/types/common';

// Test data constants
const TEST_LOCATION: Partial<Location> = {
  name: 'Test Restaurant',
  address: {
    street1: '123 Test St',
    city: 'Test City',
    state: 'TS',
    postalCode: '12345',
    country: 'USA',
    formatted: '123 Test St, Test City, TS 12345'
  } as Address,
  coordinates: {
    latitude: 40.7128,
    longitude: -74.006,
    accuracy: 0.0001
  },
  status: LocationStatus.ACTIVE
};

const TEST_OPERATING_HOURS: OperatingHours = {
  monday: [{ open: '09:00', close: '14:00', isValid: true }, { open: '17:00', close: '22:00', isValid: true }],
  tuesday: [{ open: '09:00', close: '22:00', isValid: true }],
  wednesday: [{ open: '09:00', close: '22:00', isValid: true }],
  thursday: [{ open: '09:00', close: '22:00', isValid: true }],
  friday: [{ open: '09:00', close: '23:00', isValid: true }],
  saturday: [{ open: '10:00', close: '23:00', isValid: true }],
  sunday: [{ open: '10:00', close: '21:00', isValid: true }],
  holidayHours: {
    '2024-12-25': [],  // Closed
    '2024-12-31': [{ open: '09:00', close: '20:00', isValid: true }]
  }
};

describe('Location Management', () => {
  beforeEach(() => {
    // Intercept API calls
    cy.intercept('GET', '/api/v1/locations*').as('getLocations');
    cy.intercept('POST', '/api/v1/locations').as('createLocation');
    cy.intercept('PUT', '/api/v1/locations/*').as('updateLocation');
    cy.intercept('DELETE', '/api/v1/locations/*').as('deleteLocation');
    cy.intercept('PATCH', '/api/v1/locations/*/status').as('updateStatus');

    // Mock Google Maps API
    cy.window().then((win) => {
      win.google = {
        maps: {
          Geocoder: class {
            geocode() {
              return Promise.resolve([{
                geometry: {
                  location: {
                    lat: () => TEST_LOCATION.coordinates?.latitude,
                    lng: () => TEST_LOCATION.coordinates?.longitude
                  }
                }
              }]);
            }
          }
        }
      };
    });

    // Set up test environment
    cy.visit('/dashboard/locations');
    cy.login({ email: 'test@example.com', password: 'password123' });
    cy.wait('@getLocations');
  });

  describe('Location Creation', () => {
    it('should create a new location with all fields', () => {
      cy.get('[data-cy="add-location-btn"]').click();
      cy.get('[data-cy="location-form"]').within(() => {
        // Basic Information
        cy.get('[data-cy="location-name"]').type(TEST_LOCATION.name!);
        cy.get('[data-cy="location-address-street1"]').type(TEST_LOCATION.address!.street1);
        cy.get('[data-cy="location-address-city"]').type(TEST_LOCATION.address!.city);
        cy.get('[data-cy="location-address-state"]').type(TEST_LOCATION.address!.state);
        cy.get('[data-cy="location-address-postal"]').type(TEST_LOCATION.address!.postalCode);
        
        // Operating Hours
        cy.get('[data-cy="hours-monday"]').within(() => {
          cy.get('[data-cy="add-time-range"]').click();
          cy.get('[data-cy="time-range-0-open"]').type('09:00');
          cy.get('[data-cy="time-range-0-close"]').type('14:00');
          cy.get('[data-cy="add-time-range"]').click();
          cy.get('[data-cy="time-range-1-open"]').type('17:00');
          cy.get('[data-cy="time-range-1-close"]').type('22:00');
        });

        // Holiday Hours
        cy.get('[data-cy="add-holiday-hours"]').click();
        cy.get('[data-cy="holiday-date"]').type('2024-12-25');
        cy.get('[data-cy="holiday-closed"]').check();

        cy.get('[data-cy="submit-location"]').click();
      });

      cy.wait('@createLocation').its('response.statusCode').should('eq', 201);
      cy.get('[data-cy="location-list"]').should('contain', TEST_LOCATION.name);
    });

    it('should validate coordinates accuracy', () => {
      cy.get('[data-cy="add-location-btn"]').click();
      cy.get('[data-cy="location-form"]').within(() => {
        cy.get('[data-cy="location-address-street1"]').type('Invalid Address');
        cy.get('[data-cy="validate-coordinates"]').click();
        cy.get('[data-cy="coordinates-error"]')
          .should('be.visible')
          .and('contain', 'Unable to validate address coordinates');
      });
    });
  });

  describe('Location Management', () => {
    it('should update location status', () => {
      cy.get('[data-cy="location-item"]').first().within(() => {
        cy.get('[data-cy="status-dropdown"]').click();
        cy.get('[data-cy="status-option-TEMPORARILY_CLOSED"]').click();
      });

      cy.wait('@updateStatus').its('response.statusCode').should('eq', 200);
      cy.get('[data-cy="status-badge"]')
        .should('contain', 'Temporarily Closed')
        .and('have.class', 'temporarily-closed');
    });

    it('should handle split operating hours', () => {
      cy.get('[data-cy="location-item"]').first().click();
      cy.get('[data-cy="edit-hours"]').click();
      
      cy.get('[data-cy="hours-monday"]').within(() => {
        cy.get('[data-cy="add-time-range"]').click();
        cy.get('[data-cy="time-range-1-open"]').type('17:00');
        cy.get('[data-cy="time-range-1-close"]').type('22:00');
      });

      cy.get('[data-cy="save-hours"]').click();
      cy.wait('@updateLocation').its('response.statusCode').should('eq', 200);
    });
  });

  describe('Location Validation', () => {
    it('should enforce maximum location limit', () => {
      // Create maximum allowed locations
      for (let i = 0; i < 3; i++) {
        cy.get('[data-cy="add-location-btn"]').click();
        cy.get('[data-cy="location-form"]').within(() => {
          cy.get('[data-cy="location-name"]').type(`Test Location ${i + 1}`);
          cy.get('[data-cy="submit-location"]').click();
        });
        cy.wait('@createLocation');
      }

      cy.get('[data-cy="add-location-btn"]').should('be.disabled');
      cy.get('[data-cy="max-locations-message"]')
        .should('be.visible')
        .and('contain', 'Maximum number of locations (3) reached');
    });

    it('should validate required fields', () => {
      cy.get('[data-cy="add-location-btn"]').click();
      cy.get('[data-cy="submit-location"]').click();

      cy.get('[data-cy="name-error"]').should('be.visible');
      cy.get('[data-cy="address-error"]').should('be.visible');
      cy.get('[data-cy="hours-error"]').should('be.visible');
    });
  });

  describe('Accessibility Tests', () => {
    it('should support keyboard navigation', () => {
      cy.get('[data-cy="add-location-btn"]').focus().type('{enter}');
      cy.get('[data-cy="location-form"]').should('be.visible');

      cy.get('[data-cy="location-name"]').focus()
        .type(TEST_LOCATION.name!)
        .tab()
        .should('have.focus');
    });

    it('should have proper ARIA attributes', () => {
      cy.get('[data-cy="location-list"]')
        .should('have.attr', 'role', 'list');
      
      cy.get('[data-cy="location-item"]')
        .first()
        .should('have.attr', 'role', 'listitem');

      cy.get('[data-cy="status-badge"]')
        .should('have.attr', 'aria-label');
    });
  });
});