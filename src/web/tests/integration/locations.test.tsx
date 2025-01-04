import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MockGeocoder } from '@googlemaps/jest-mocks';

// Mock data for locations
const mockLocations = [
  {
    id: '1',
    name: 'Downtown Restaurant',
    address: '123 Main St, City, ST 12345',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    hours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '23:00', closed: false },
      saturday: { open: '10:00', close: '23:00', closed: false },
      sunday: { open: '10:00', close: '21:00', closed: false }
    },
    phone: '(555) 123-4567',
    isActive: true,
    images: ['location1.jpg']
  },
  {
    id: '2',
    name: 'Uptown Branch',
    address: '456 Park Ave, City, ST 12345',
    coordinates: { lat: 40.7589, lng: -73.9851 },
    hours: {
      monday: { open: '11:00', close: '21:00', closed: false },
      tuesday: { open: '11:00', close: '21:00', closed: false },
      wednesday: { open: '11:00', close: '21:00', closed: false },
      thursday: { open: '11:00', close: '21:00', closed: false },
      friday: { open: '11:00', close: '22:00', closed: false },
      saturday: { open: '11:00', close: '22:00', closed: false },
      sunday: { open: '11:00', close: '20:00', closed: false }
    },
    phone: '(555) 987-6543',
    isActive: true,
    images: ['location2.jpg']
  }
];

// Mock API responses
const mockLocationAPI = {
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  list: jest.fn(),
  validate: jest.fn()
};

// Setup test environment
const setupTest = (customMocks = {}) => {
  // Configure Redux store
  const store = configureStore({
    reducer: {
      locations: {
        items: mockLocations,
        loading: false,
        error: null
      }
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware()
  });

  // Setup Google Maps mocks
  const mockGeocoder = new MockGeocoder();
  mockGeocoder.geocode.mockResolvedValue([{
    geometry: { location: { lat: () => 40.7128, lng: () => -74.0060 } },
    formatted_address: '123 Main St, City, ST 12345'
  }]);

  // Setup test utilities
  const user = userEvent.setup();

  return {
    store,
    mockGeocoder,
    user,
    ...customMocks
  };
};

// Helper to render with providers
const renderWithProvider = (component, store) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('Location List Integration', () => {
  beforeEach(() => {
    mockLocationAPI.list.mockResolvedValue({ data: mockLocations });
  });

  test('displays locations with proper sorting and filtering', async () => {
    const { store } = setupTest();
    renderWithProvider(<LocationList />, store);

    await waitFor(() => {
      expect(screen.getByText('Downtown Restaurant')).toBeInTheDocument();
      expect(screen.getByText('Uptown Branch')).toBeInTheDocument();
    });

    // Test sorting
    const sortButton = screen.getByRole('button', { name: /sort/i });
    await userEvent.click(sortButton);
    await waitFor(() => {
      const locations = screen.getAllByRole('listitem');
      expect(locations[0]).toHaveTextContent('Uptown Branch');
    });

    // Test filtering
    const filterInput = screen.getByRole('textbox', { name: /filter locations/i });
    await userEvent.type(filterInput, 'downtown');
    await waitFor(() => {
      expect(screen.getByText('Downtown Restaurant')).toBeInTheDocument();
      expect(screen.queryByText('Uptown Branch')).not.toBeInTheDocument();
    });
  });

  test('handles empty location list with proper message', async () => {
    mockLocationAPI.list.mockResolvedValue({ data: [] });
    const { store } = setupTest();
    renderWithProvider(<LocationList />, store);

    await waitFor(() => {
      expect(screen.getByText(/no locations found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add location/i })).toBeEnabled();
    });
  });

  test('enforces 3-location limit properly', async () => {
    const threeLocations = [...mockLocations, {
      id: '3',
      name: 'Third Location',
      address: '789 Third St',
      coordinates: { lat: 40.7829, lng: -73.9654 }
    }];
    mockLocationAPI.list.mockResolvedValue({ data: threeLocations });
    
    const { store } = setupTest();
    renderWithProvider(<LocationList />, store);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add location/i })).toBeDisabled();
      expect(screen.getByText(/maximum locations reached/i)).toBeInTheDocument();
    });
  });
});

describe('Location Form Integration', () => {
  test('creates new location with map coordinate selection', async () => {
    const { store, mockGeocoder, user } = setupTest();
    mockLocationAPI.create.mockResolvedValue({ data: mockLocations[0] });

    renderWithProvider(<LocationForm />, store);

    // Fill form fields
    await user.type(screen.getByLabelText(/location name/i), 'Test Location');
    await user.type(screen.getByLabelText(/address/i), '123 Test St');
    await user.type(screen.getByLabelText(/phone/i), '(555) 123-4567');

    // Simulate map coordinate selection
    const mapContainer = screen.getByTestId('map-container');
    fireEvent.click(mapContainer, { clientX: 100, clientY: 100 });

    await waitFor(() => {
      expect(mockGeocoder.geocode).toHaveBeenCalled();
    });

    // Set business hours
    const hoursSection = screen.getByTestId('business-hours');
    const mondayInputs = within(hoursSection).getAllByRole('textbox', { name: /monday/i });
    await user.type(mondayInputs[0], '09:00');
    await user.type(mondayInputs[1], '22:00');

    // Submit form
    await user.click(screen.getByRole('button', { name: /save location/i }));

    await waitFor(() => {
      expect(mockLocationAPI.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Location',
        address: '123 Test St',
        phone: '(555) 123-4567'
      }));
    });
  });

  test('validates all required fields with proper messages', async () => {
    const { store, user } = setupTest();
    renderWithProvider(<LocationForm />, store);

    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /save location/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/phone is required/i)).toBeInTheDocument();
      expect(screen.getByText(/business hours are required/i)).toBeInTheDocument();
    });
  });
});

describe('Map Integration', () => {
  test('handles map initialization errors', async () => {
    const { store } = setupTest({
      mockGeocoder: {
        geocode: jest.fn().mockRejectedValue(new Error('Maps API error'))
      }
    });

    renderWithProvider(<LocationForm />, store);

    await waitFor(() => {
      expect(screen.getByText(/error loading map/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeEnabled();
    });
  });

  test('validates address through geocoding', async () => {
    const { store, mockGeocoder, user } = setupTest();
    renderWithProvider(<LocationForm />, store);

    await user.type(screen.getByLabelText(/address/i), '123 Invalid St');
    await user.tab();

    await waitFor(() => {
      expect(mockGeocoder.geocode).toHaveBeenCalledWith({
        address: '123 Invalid St'
      });
    });

    // Simulate geocoding error
    mockGeocoder.geocode.mockRejectedValueOnce(new Error('Invalid address'));

    await waitFor(() => {
      expect(screen.getByText(/invalid address/i)).toBeInTheDocument();
    });
  });

  test('updates form fields on map selection', async () => {
    const { store, mockGeocoder } = setupTest();
    renderWithProvider(<LocationForm />, store);

    const mapContainer = screen.getByTestId('map-container');
    fireEvent.click(mapContainer, { clientX: 100, clientY: 100 });

    await waitFor(() => {
      expect(mockGeocoder.geocode).toHaveBeenCalled();
      expect(screen.getByLabelText(/address/i)).toHaveValue('123 Main St, City, ST 12345');
      expect(screen.getByTestId('lat-input')).toHaveValue('40.7128');
      expect(screen.getByTestId('lng-input')).toHaveValue('-74.0060');
    });
  });
});