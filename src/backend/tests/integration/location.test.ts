import request from 'supertest';
import { Point } from 'geojson';
import { TestAuth } from '@test/utils';
import { LocationService } from '../../src/services/location.service';
import { 
  ILocation, 
  ILocationCreate, 
  LocationStatus, 
  IAddress, 
  IOperatingHours 
} from '../../src/interfaces/location.interface';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../src/constants/error.constants';
import logger from '../../src/utils/logger.utils';

/**
 * Integration test suite for location management endpoints
 * Version: 1.0.0
 */
describe('Location Management API Integration Tests', () => {
  let app: Express.Application;
  let testAuth: TestAuth;
  let locationService: LocationService;
  let testRestaurantId: string;
  let testLocationId: string;
  let authToken: string;

  // Test data constants
  const TEST_COORDINATES: Point = {
    type: 'Point',
    coordinates: [-73.935242, 40.730610], // New York coordinates
  };

  const TEST_ADDRESS: IAddress = {
    street: '123 Test Street',
    unit: 'Suite 100',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    postalCode: '10001',
    formatted: '123 Test Street, Suite 100, New York, NY 10001, USA'
  };

  const TEST_OPERATING_HOURS: IOperatingHours = {
    monday: [{ open: '09:00', close: '22:00', isClosed: false, note: '' }],
    tuesday: [{ open: '09:00', close: '22:00', isClosed: false, note: '' }],
    wednesday: [{ open: '09:00', close: '22:00', isClosed: false, note: '' }],
    thursday: [{ open: '09:00', close: '22:00', isClosed: false, note: '' }],
    friday: [{ open: '09:00', close: '23:00', isClosed: false, note: '' }],
    saturday: [{ open: '10:00', close: '23:00', isClosed: false, note: '' }],
    sunday: [{ open: '10:00', close: '21:00', isClosed: false, note: '' }],
    holidays: {},
    seasonal: {}
  };

  beforeAll(async () => {
    // Initialize test environment
    testAuth = new TestAuth();
    app = await setupTestApp();
    locationService = new LocationService();
    
    // Create test restaurant and get auth token
    const { restaurantId, token } = await testAuth.createTestRestaurantWithAuth();
    testRestaurantId = restaurantId;
    authToken = token;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/locations', () => {
    it('should create a new location with valid data', async () => {
      const locationData: ILocationCreate = {
        restaurantId: testRestaurantId,
        name: 'Test Location',
        address: TEST_ADDRESS,
        coordinates: TEST_COORDINATES,
        operatingHours: TEST_OPERATING_HOURS,
        phone: '+1-555-555-5555',
        email: 'test@location.com',
        timezone: 'America/New_York',
        features: ['parking', 'wifi']
      };

      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(locationData);

      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        restaurantId: testRestaurantId,
        name: locationData.name,
        status: LocationStatus.ACTIVE
      });

      testLocationId = response.body.id;
    });

    it('should enforce location limit of 3', async () => {
      // Create maximum allowed locations
      for (let i = 0; i < 3; i++) {
        await createTestLocation(testRestaurantId, `Location ${i}`);
      }

      // Attempt to create one more location
      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateTestLocation(testRestaurantId));

      expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(response.body.message).toContain('Maximum location limit');
    });

    it('should validate required fields', async () => {
      const invalidLocation = {
        restaurantId: testRestaurantId,
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidLocation);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.errors).toContain('name is required');
    });
  });

  describe('GET /api/v1/locations/:id', () => {
    it('should retrieve location by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/locations/${testLocationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.id).toBe(testLocationId);
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .get('/api/v1/locations/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT /api/v1/locations/:id', () => {
    it('should update location with valid data', async () => {
      const updateData = {
        name: 'Updated Location Name',
        phone: '+1-555-555-5556'
      };

      const response = await request(app)
        .put(`/api/v1/locations/${testLocationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.phone).toBe(updateData.phone);
    });

    it('should validate address updates', async () => {
      const invalidAddress = {
        address: {
          street: '',  // Invalid empty street
          city: 'Test City',
          state: 'TS',
          country: 'USA',
          postalCode: '12345'
        }
      };

      const response = await request(app)
        .put(`/api/v1/locations/${testLocationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAddress);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.errors).toContain('street is required');
    });
  });

  describe('DELETE /api/v1/locations/:id', () => {
    it('should delete location', async () => {
      const response = await request(app)
        .delete(`/api/v1/locations/${testLocationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/v1/locations/${testLocationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('GET /api/v1/restaurants/:restaurantId/locations', () => {
    it('should list all locations for a restaurant', async () => {
      const response = await request(app)
        .get(`/api/v1/restaurants/${testRestaurantId}/locations`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0].restaurantId).toBe(testRestaurantId);
    });
  });

  // Helper functions
  async function createTestLocation(restaurantId: string, name: string): Promise<ILocation> {
    const locationData = generateTestLocation(restaurantId, name);
    const response = await request(app)
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${authToken}`)
      .send(locationData);
    return response.body;
  }

  function generateTestLocation(restaurantId: string, name: string = 'Test Location'): ILocationCreate {
    return {
      restaurantId,
      name,
      address: TEST_ADDRESS,
      coordinates: TEST_COORDINATES,
      operatingHours: TEST_OPERATING_HOURS,
      phone: '+1-555-555-5555',
      email: 'test@location.com',
      timezone: 'America/New_York',
      features: ['parking', 'wifi']
    };
  }

  async function cleanupTestData(): Promise<void> {
    try {
      await testAuth.cleanup();
    } catch (error) {
      logger.error('Error cleaning up test data', { error });
    }
  }
});