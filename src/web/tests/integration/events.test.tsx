import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';

import EventForm from '../../src/components/events/EventForm';
import EventList from '../../src/components/events/EventList';
import { useEventManager } from '../../src/hooks/useEventManager';
import eventReducer from '../../store/slices/eventSlice';
import { Event, EventStatus, TicketType } from '../../types/event';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock data
const mockEvent: Event = {
  id: '123',
  restaurantId: 'rest_123',
  locationId: 'loc_123',
  name: 'Wine Tasting Event',
  description: 'A sophisticated evening of wine tasting and pairing',
  startDate: '2024-03-15T19:00:00Z',
  endDate: '2024-03-15T22:00:00Z',
  timezone: 'UTC',
  status: EventStatus.DRAFT,
  capacity: 50,
  maxTicketsPerPerson: 2,
  ticketTypes: [TicketType.GENERAL, TicketType.VIP],
  categories: ['wine', 'tasting'],
  isRefundable: true,
  refundCutoffDate: '2024-03-14T19:00:00Z',
  imageUrl: 'https://example.com/event.jpg',
  location: {
    id: 'loc_123',
    name: 'Main Restaurant',
    address: {
      street1: '123 Main St',
      city: 'Example City',
      state: 'EX',
      postalCode: '12345',
      country: 'US',
      formatted: '123 Main St, Example City, EX 12345'
    },
    coordinates: { latitude: 40.7128, longitude: -74.0060, accuracy: 100 }
  },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z'
};

// MSW server setup
const server = setupServer(
  rest.get('/api/v1/events', (req, res, ctx) => {
    return res(ctx.json([mockEvent]));
  }),
  rest.post('/api/v1/events', (req, res, ctx) => {
    return res(ctx.json({ ...mockEvent, id: '124' }));
  }),
  rest.put('/api/v1/events/:id', (req, res, ctx) => {
    return res(ctx.json({ ...mockEvent, ...req.body }));
  }),
  rest.delete('/api/v1/events/:id', (req, res, ctx) => {
    return res(ctx.status(204));
  })
);

// Test store setup
const createTestStore = () => configureStore({
  reducer: {
    events: eventReducer
  }
});

describe('Event Management Integration', () => {
  let store: ReturnType<typeof createTestStore>;
  let performanceTimer: number;

  beforeAll(() => {
    server.listen();
    vi.useFakeTimers();
  });

  beforeEach(() => {
    store = createTestStore();
    performanceTimer = performance.now();
  });

  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
    vi.useRealTimers();
  });

  it('should create and publish event within time limit', async () => {
    const user = userEvent.setup();
    const startTime = performance.now();

    const { container } = render(
      <Provider store={store}>
        <EventForm
          initialValues={{}}
          onSubmit={vi.fn()}
          isSubmitting={false}
        />
      </Provider>
    );

    // Fill form fields
    await user.type(screen.getByLabelText(/event name/i), 'Wine Tasting Event');
    await user.type(
      screen.getByLabelText(/description/i),
      'A sophisticated evening of wine tasting and pairing'
    );
    
    // Set dates
    const startDate = screen.getByLabelText(/start date/i);
    const endDate = screen.getByLabelText(/end date/i);
    await user.type(startDate, '2024-03-15T19:00');
    await user.type(endDate, '2024-03-15T22:00');

    // Set capacity
    await user.type(screen.getByLabelText(/capacity/i), '50');

    // Select ticket types
    const ticketTypeCheckboxes = screen.getAllByRole('checkbox');
    await user.click(ticketTypeCheckboxes[0]); // General
    await user.click(ticketTypeCheckboxes[1]); // VIP

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create event/i });
    await user.click(submitButton);

    // Verify API call and response
    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });

    // Verify performance requirement
    const endTime = performance.now();
    const operationTime = endTime - startTime;
    expect(operationTime).toBeLessThan(15 * 60 * 1000); // 15 minutes in milliseconds

    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should handle event listing with filters and pagination', async () => {
    const { container } = render(
      <Provider store={store}>
        <EventList
          events={[mockEvent]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onPublish={vi.fn()}
          sortBy="date"
          filterBy={{
            status: [EventStatus.DRAFT],
            dateRange: {
              start: '2024-01-01',
              end: '2024-12-31'
            },
            searchTerm: ''
          }}
        />
      </Provider>
    );

    // Verify initial render
    expect(screen.getByText('Wine Tasting Event')).toBeInTheDocument();

    // Test filtering
    const filterInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(filterInput, 'wine');
    
    await waitFor(() => {
      expect(screen.getByText('Wine Tasting Event')).toBeInTheDocument();
    });

    // Test sorting
    const sortButton = screen.getByRole('button', { name: /sort/i });
    await userEvent.click(sortButton);
    
    // Verify list updates
    await waitFor(() => {
      const events = screen.getAllByRole('article');
      expect(events.length).toBeGreaterThan(0);
    });

    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should handle event deletion with optimistic updates', async () => {
    const onDelete = vi.fn();
    
    render(
      <Provider store={store}>
        <EventList
          events={[mockEvent]}
          onEdit={vi.fn()}
          onDelete={onDelete}
          onPublish={vi.fn()}
        />
      </Provider>
    );

    // Find and click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await userEvent.click(deleteButton);

    // Verify confirmation dialog
    expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await userEvent.click(confirmButton);

    // Verify optimistic update
    await waitFor(() => {
      expect(screen.queryByText('Wine Tasting Event')).not.toBeInTheDocument();
    });

    // Verify API call
    expect(onDelete).toHaveBeenCalledWith(mockEvent.id);
  });

  it('should validate form inputs and display errors', async () => {
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <EventForm
          initialValues={{}}
          onSubmit={vi.fn()}
          isSubmitting={false}
        />
      </Provider>
    );

    // Submit without required fields
    const submitButton = screen.getByRole('button', { name: /create event/i });
    await user.click(submitButton);

    // Verify validation errors
    await waitFor(() => {
      expect(screen.getByText(/event name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description must be at least/i)).toBeInTheDocument();
    });

    // Test field-level validation
    await user.type(screen.getByLabelText(/event name/i), 'a');
    expect(screen.getByText(/name cannot exceed/i)).toBeInTheDocument();
  });
});