import { ContentBlockType } from '../../src/types/website';
import type { BlockStyles } from '../../src/types/website';

// @version cypress@12.0.0
describe('Website Builder E2E Tests', () => {
  // Test selectors for consistent element targeting
  const TEST_SELECTORS = {
    COMPONENT_PANEL: '[data-cy=component-panel]',
    CANVAS: '[data-cy=builder-canvas]',
    DROP_ZONE: '[data-cy=drop-zone]',
    CONTENT_BLOCK: '[data-cy=content-block]',
    HEADER_COMPONENT: '[data-cy=component-header]',
    MENU_COMPONENT: '[data-cy=component-menu]',
    GALLERY_COMPONENT: '[data-cy=component-gallery]',
    PREVIEW_MODE: '[data-cy=preview-mode]',
    UNDO_BUTTON: '[data-cy=undo-button]',
    REDO_BUTTON: '[data-cy=redo-button]'
  } as const;

  // Viewport sizes for responsive testing
  const VIEWPORT_SIZES = {
    DESKTOP: { width: 1024, height: 768 },
    TABLET: { width: 768, height: 1024 },
    MOBILE: { width: 320, height: 568 }
  } as const;

  // Performance metrics thresholds
  const PERFORMANCE_METRICS = {
    MAX_LOAD_TIME: 3000,
    INTERACTION_DELAY: 100,
    ANIMATION_DURATION: 300,
    API_TIMEOUT: 5000
  } as const;

  beforeEach(() => {
    // Intercept API calls and provide test data
    cy.intercept('GET', '/api/v1/templates', { fixture: 'templates.json' }).as('getTemplates');
    cy.intercept('GET', '/api/v1/website/blocks', { fixture: 'blocks.json' }).as('getBlocks');
    cy.intercept('POST', '/api/v1/website/blocks', {}).as('saveBlocks');

    // Visit website builder page and wait for initial load
    cy.visit('/website-builder');
    cy.get(TEST_SELECTORS.COMPONENT_PANEL, { timeout: PERFORMANCE_METRICS.API_TIMEOUT }).should('be.visible');
    
    // Set default viewport
    cy.viewport(VIEWPORT_SIZES.DESKTOP.width, VIEWPORT_SIZES.DESKTOP.height);
  });

  it('should complete website setup within 30 minutes', () => {
    const startTime = Date.now();

    // Test complete website setup flow
    cy.get(TEST_SELECTORS.COMPONENT_PANEL).within(() => {
      cy.get(TEST_SELECTORS.HEADER_COMPONENT).should('be.visible');
      cy.get(TEST_SELECTORS.MENU_COMPONENT).should('be.visible');
      cy.get(TEST_SELECTORS.GALLERY_COMPONENT).should('be.visible');
    });

    // Add and configure each required component
    cy.addHeaderBlock();
    cy.addMenuBlock();
    cy.addGalleryBlock();

    // Verify setup completion time
    cy.wrap(null).then(() => {
      const setupTime = Date.now() - startTime;
      expect(setupTime).to.be.lessThan(30 * 60 * 1000); // 30 minutes in milliseconds
    });
  });

  it('should handle all drag-drop interactions', () => {
    // Test drag start behavior
    cy.get(TEST_SELECTORS.HEADER_COMPONENT)
      .trigger('mousedown')
      .trigger('dragstart');

    // Verify drop zone activation
    cy.get(TEST_SELECTORS.DROP_ZONE).should('be.visible');

    // Test successful drop
    cy.get(TEST_SELECTORS.CANVAS)
      .trigger('dragover')
      .trigger('drop');

    // Verify block placement
    cy.get(TEST_SELECTORS.CONTENT_BLOCK).should('exist');

    // Test undo/redo functionality
    cy.get(TEST_SELECTORS.UNDO_BUTTON).click();
    cy.get(TEST_SELECTORS.CONTENT_BLOCK).should('not.exist');
    cy.get(TEST_SELECTORS.REDO_BUTTON).click();
    cy.get(TEST_SELECTORS.CONTENT_BLOCK).should('exist');
  });

  it('should maintain responsive behavior', () => {
    // Add test content block
    cy.addHeaderBlock();

    // Test desktop layout
    cy.viewport(VIEWPORT_SIZES.DESKTOP.width, VIEWPORT_SIZES.DESKTOP.height);
    cy.get(TEST_SELECTORS.CONTENT_BLOCK).should('have.css', 'width', '100%');

    // Test tablet layout
    cy.viewport(VIEWPORT_SIZES.TABLET.width, VIEWPORT_SIZES.TABLET.height);
    cy.get(TEST_SELECTORS.CONTENT_BLOCK).should('have.css', 'width', '100%');

    // Test mobile layout
    cy.viewport(VIEWPORT_SIZES.MOBILE.width, VIEWPORT_SIZES.MOBILE.height);
    cy.get(TEST_SELECTORS.CONTENT_BLOCK).should('have.css', 'width', '100%');

    // Test preview mode across viewports
    cy.get(TEST_SELECTORS.PREVIEW_MODE).click();
    cy.checkResponsivePreview();
  });

  // Custom command to add a header block
  Cypress.Commands.add('addHeaderBlock', () => {
    cy.get(TEST_SELECTORS.HEADER_COMPONENT)
      .trigger('mousedown')
      .trigger('dragstart');
    cy.get(TEST_SELECTORS.CANVAS)
      .trigger('dragover')
      .trigger('drop');
  });

  // Custom command to add a menu block
  Cypress.Commands.add('addMenuBlock', () => {
    cy.get(TEST_SELECTORS.MENU_COMPONENT)
      .trigger('mousedown')
      .trigger('dragstart');
    cy.get(TEST_SELECTORS.CANVAS)
      .trigger('dragover')
      .trigger('drop');
  });

  // Custom command to add a gallery block
  Cypress.Commands.add('addGalleryBlock', () => {
    cy.get(TEST_SELECTORS.GALLERY_COMPONENT)
      .trigger('mousedown')
      .trigger('dragstart');
    cy.get(TEST_SELECTORS.CANVAS)
      .trigger('dragover')
      .trigger('drop');
  });

  // Custom command to check responsive preview
  Cypress.Commands.add('checkResponsivePreview', () => {
    // Check desktop preview
    cy.viewport(VIEWPORT_SIZES.DESKTOP.width, VIEWPORT_SIZES.DESKTOP.height);
    cy.get(TEST_SELECTORS.CONTENT_BLOCK).should('be.visible');

    // Check tablet preview
    cy.viewport(VIEWPORT_SIZES.TABLET.width, VIEWPORT_SIZES.TABLET.height);
    cy.get(TEST_SELECTORS.CONTENT_BLOCK).should('be.visible');

    // Check mobile preview
    cy.viewport(VIEWPORT_SIZES.MOBILE.width, VIEWPORT_SIZES.MOBILE.height);
    cy.get(TEST_SELECTORS.CONTENT_BLOCK).should('be.visible');
  });
});

// Extend Cypress types for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      addHeaderBlock(): Chainable<void>;
      addMenuBlock(): Chainable<void>;
      addGalleryBlock(): Chainable<void>;
      checkResponsivePreview(): Chainable<void>;
    }
  }
}