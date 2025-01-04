import { faker } from '@faker-js/faker'; // ^8.0.0
import type { LoginFormData } from '../../src/components/auth/LoginForm';
import type { RegisterFormValues } from '../../src/components/auth/RegisterForm';

// Test constants
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!@#',
  firstName: 'Test',
  lastName: 'User'
};

const API_ROUTES = {
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',
  REFRESH: '/api/v1/auth/refresh',
  LOGOUT: '/api/v1/auth/logout',
  MFA: '/api/v1/auth/mfa'
};

const TEST_TIMEOUTS = {
  pageLoad: 10000,
  apiResponse: 5000,
  animation: 1000
};

const SECURITY_CONSTANTS = {
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  tokenRefreshWindow: 5 * 60 * 1000 // 5 minutes
};

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear all storage and cookies
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearAllSessionStorage();

    // Visit the login page with retry strategy
    cy.visit('/login', {
      timeout: TEST_TIMEOUTS.pageLoad,
      retryOnStatusCodeFailure: true,
      retryOnNetworkFailure: true
    });

    // Set up API route interceptors
    cy.intercept('POST', API_ROUTES.LOGIN).as('loginRequest');
    cy.intercept('POST', API_ROUTES.REGISTER).as('registerRequest');
    cy.intercept('POST', API_ROUTES.REFRESH).as('refreshRequest');
    cy.intercept('POST', API_ROUTES.LOGOUT).as('logoutRequest');
  });

  describe('Smoke Tests', () => {
    it('should successfully login with valid credentials', () => {
      const loginData: LoginFormData = {
        email: TEST_USER.email,
        password: TEST_USER.password
      };

      cy.get('[data-cy=login-form]').within(() => {
        cy.get('input[name="email"]').type(loginData.email);
        cy.get('input[name="password"]').type(loginData.password);
        cy.get('button[type="submit"]').click();
      });

      cy.wait('@loginRequest')
        .its('response.statusCode')
        .should('eq', 200);

      cy.url().should('include', '/dashboard');
      cy.get('[data-cy=user-menu]').should('be.visible');
    });

    it('should successfully register a new user', () => {
      const registerData: RegisterFormValues = {
        email: faker.internet.email(),
        password: 'NewPass123!@#',
        confirmPassword: 'NewPass123!@#',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      cy.get('[data-cy=register-link]').click();
      cy.get('[data-cy=register-form]').within(() => {
        cy.get('input[name="firstName"]').type(registerData.firstName);
        cy.get('input[name="lastName"]').type(registerData.lastName);
        cy.get('input[name="email"]').type(registerData.email);
        cy.get('input[name="password"]').type(registerData.password);
        cy.get('input[name="confirmPassword"]').type(registerData.confirmPassword);
        cy.get('button[type="submit"]').click();
      });

      cy.wait('@registerRequest')
        .its('response.statusCode')
        .should('eq', 201);

      cy.url().should('include', '/dashboard');
    });
  });

  describe('Security Tests', () => {
    it('should enforce rate limiting after max failed attempts', () => {
      const invalidData = {
        email: TEST_USER.email,
        password: 'WrongPass123!'
      };

      // Attempt login multiple times
      for (let i = 0; i < SECURITY_CONSTANTS.maxLoginAttempts + 1; i++) {
        cy.get('[data-cy=login-form]').within(() => {
          cy.get('input[name="email"]').clear().type(invalidData.email);
          cy.get('input[name="password"]').clear().type(invalidData.password);
          cy.get('button[type="submit"]').click();
        });

        if (i < SECURITY_CONSTANTS.maxLoginAttempts) {
          cy.wait('@loginRequest')
            .its('response.statusCode')
            .should('eq', 401);
        } else {
          cy.wait('@loginRequest')
            .its('response.statusCode')
            .should('eq', 429);
        }
      }

      cy.get('[data-cy=rate-limit-message]')
        .should('be.visible')
        .and('contain', 'Too many failed attempts');
    });

    it('should handle token refresh correctly', () => {
      // Login first
      cy.login(TEST_USER);

      // Wait for token refresh window
      cy.clock();
      cy.tick(SECURITY_CONSTANTS.tokenRefreshWindow);

      // Verify token refresh
      cy.wait('@refreshRequest')
        .its('response.statusCode')
        .should('eq', 200);

      // Verify new token is used
      cy.window().then((win) => {
        expect(win.localStorage.getItem('auth_token')).to.exist;
      });
    });

    it('should prevent XSS attacks in form inputs', () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      cy.get('[data-cy=login-form]').within(() => {
        cy.get('input[name="email"]').type(`test${xssPayload}@example.com`);
        cy.get('input[name="password"]').type(`pass${xssPayload}`);
      });

      cy.get('body').should('not.contain.html', '<script>');
    });
  });

  describe('Error Handling', () => {
    it('should display validation errors for invalid inputs', () => {
      cy.get('[data-cy=login-form]').within(() => {
        // Test email validation
        cy.get('input[name="email"]').type('invalid-email');
        cy.get('input[name="email"]').blur();
        cy.get('[data-cy=email-error]')
          .should('be.visible')
          .and('contain', 'Please enter a valid email');

        // Test password validation
        cy.get('input[name="password"]').type('weak');
        cy.get('input[name="password"]').blur();
        cy.get('[data-cy=password-error]')
          .should('be.visible')
          .and('contain', 'Password must contain');
      });
    });

    it('should handle network errors gracefully', () => {
      cy.intercept('POST', API_ROUTES.LOGIN, {
        forceNetworkError: true
      }).as('networkError');

      cy.get('[data-cy=login-form]').within(() => {
        cy.get('input[name="email"]').type(TEST_USER.email);
        cy.get('input[name="password"]').type(TEST_USER.password);
        cy.get('button[type="submit"]').click();
      });

      cy.get('[data-cy=error-message]')
        .should('be.visible')
        .and('contain', 'Network error');
    });

    it('should handle server errors appropriately', () => {
      cy.intercept('POST', API_ROUTES.LOGIN, {
        statusCode: 500,
        body: {
          error: 'Internal server error'
        }
      }).as('serverError');

      cy.get('[data-cy=login-form]').within(() => {
        cy.get('input[name="email"]').type(TEST_USER.email);
        cy.get('input[name="password"]').type(TEST_USER.password);
        cy.get('button[type="submit"]').click();
      });

      cy.get('[data-cy=error-message]')
        .should('be.visible')
        .and('contain', 'server error');
    });
  });
});