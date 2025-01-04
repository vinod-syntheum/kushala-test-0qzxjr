import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { Point } from 'geojson';
import { LocationService } from '../../../src/services/location.service';
import { LocationModel } from '../../../src/models/postgresql/location.model';
import { MapsService } from '../../../src/services/maps.service';
import { ILocation, ILocationCreate, ILocationUpdate, LocationStatus, IAddress } from '../../../src/interfaces/location.interface';

// Mock implementations
jest.mock('../../../src/models/postgresql/location.model');
jest.mock('../../../src/services/maps.service');

describe('LocationService', () => {
  // Mock repository and services
  let mockLocationRepository: jest.Mocked<Repository<LocationModel>>;
  let mockMapsService: jest.Mocked<MapsService>;
  let locationService: LocationService;

  // Test data fixtures
  const mockValidAddress: IAddress = {
    street: '123 Test St',
    unit: 'Suite 100',
    city: 'Test City',
    state: 'TS',
    country: 'Test Country',
    postalCode: '12345',
    formatted: '123 Test St, Test City, TS 12345'
  };

  const mockCoordinates: Point = {
    type: 'Point',
    coordinates: [-122.4194, 37.7749]
  };

  const mockLocation: ILocation = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    restaurantId: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Location',
    address: mockValidAddress,
    coordinates: mockCoordinates,
    operatingHours: {
      monday: [{ open: '09:00', close: '17:00', isClosed: false, note: '' }],
      tuesday: [{ open: '09:00', close: '17:00', isClosed: false, note: '' }],
      wednesday: [{ open: '09:00', close: '17:00', isClosed: false, note: '' }],
      thursday: [{ open: '09:00', close: '17:00', isClosed: false, note: '' }],
      friday: [{ open: '09:00', close: '17:00', isClosed: false, note: '' }],
      saturday: [{ open: '10:00', close: '15:00', isClosed: false, note: '' }],
      sunday: [{ open: '00:00', close: '00:00', isClosed: true, note: 'Closed' }],
      holidays: {},
      seasonal: {}
    },
    phone: '+1-555-555-5555',
    email: 'test@location.com',
    status: LocationStatus.ACTIVE,
    isPrimary: false,
    timezone: 'America/Los_Angeles',
    features: ['parking', 'wifi'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Reset mocks
    mockLocationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      manager: {
        connection: {
          createQueryRunner: jest.fn().mockReturnValue({
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
              save: jest.fn()
            }
          })
        }
      }
    } as unknown as jest.Mocked<Repository<LocationModel>>;

    mockMapsService = {
      geocodeAddress: jest.fn(),
      validateAddress: jest.fn(),
      validateCoordinates: jest.fn()
    } as unknown as jest.Mocked<MapsService>;

    // Initialize service with mocks
    locationService = new LocationService(mockLocationRepository, mockMapsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLocation', () => {
    const createLocationData: ILocationCreate = {
      restaurantId: mockLocation.restaurantId,
      name: mockLocation.name,
      address: mockLocation.address,
      operatingHours: mockLocation.operatingHours,
      phone: mockLocation.phone,
      email: mockLocation.email,
      timezone: mockLocation.timezone,
      features: mockLocation.features
    };

    it('should successfully create a location with valid data', async () => {
      // Setup mocks
      mockMapsService.validateAddress.mockResolvedValue(true);
      mockMapsService.geocodeAddress.mockResolvedValue(mockCoordinates);
      mockLocationRepository.count.mockResolvedValue(0);
      mockLocationRepository.create.mockReturnValue(mockLocation);
      mockLocationRepository.manager.connection.createQueryRunner().manager.save.mockResolvedValue(mockLocation);

      // Execute test
      const result = await locationService.createLocation(createLocationData);

      // Verify results
      expect(result).toEqual(mockLocation);
      expect(mockMapsService.validateAddress).toHaveBeenCalledWith(createLocationData.address);
      expect(mockMapsService.geocodeAddress).toHaveBeenCalledWith(createLocationData.address);
      expect(mockLocationRepository.create).toHaveBeenCalled();
    });

    it('should throw error when location limit is exceeded', async () => {
      // Setup mocks
      mockLocationRepository.count.mockResolvedValue(3);

      // Execute and verify
      await expect(locationService.createLocation(createLocationData))
        .rejects
        .toThrow('Maximum location limit of 3 reached');
    });

    it('should validate address and geocode coordinates', async () => {
      // Setup mocks
      mockMapsService.validateAddress.mockResolvedValue(true);
      mockMapsService.geocodeAddress.mockResolvedValue(mockCoordinates);
      mockLocationRepository.count.mockResolvedValue(0);
      mockLocationRepository.create.mockReturnValue(mockLocation);
      mockLocationRepository.manager.connection.createQueryRunner().manager.save.mockResolvedValue(mockLocation);

      // Execute test
      await locationService.createLocation(createLocationData);

      // Verify address validation and geocoding
      expect(mockMapsService.validateAddress).toHaveBeenCalledWith(createLocationData.address);
      expect(mockMapsService.geocodeAddress).toHaveBeenCalledWith(createLocationData.address);
    });
  });

  describe('updateLocation', () => {
    const updateData: ILocationUpdate = {
      name: 'Updated Location',
      address: mockValidAddress,
      operatingHours: mockLocation.operatingHours
    };

    it('should successfully update an existing location', async () => {
      // Setup mocks
      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockLocationRepository.save.mockResolvedValue({ ...mockLocation, ...updateData });

      // Execute test
      const result = await locationService.updateLocation(mockLocation.id, updateData);

      // Verify results
      expect(result.name).toBe(updateData.name);
      expect(mockLocationRepository.findOne).toHaveBeenCalledWith({ 
        where: { id: mockLocation.id } 
      });
      expect(mockLocationRepository.save).toHaveBeenCalled();
    });

    it('should revalidate address when address is updated', async () => {
      // Setup mocks
      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockMapsService.validateAddress.mockResolvedValue(true);
      mockMapsService.geocodeAddress.mockResolvedValue(mockCoordinates);
      mockLocationRepository.save.mockResolvedValue({ ...mockLocation, ...updateData });

      // Execute test
      await locationService.updateLocation(mockLocation.id, updateData);

      // Verify address validation
      expect(mockMapsService.validateAddress).toHaveBeenCalledWith(updateData.address);
      expect(mockMapsService.geocodeAddress).toHaveBeenCalledWith(updateData.address);
    });
  });

  describe('getLocation', () => {
    it('should return location by ID', async () => {
      // Setup mock
      mockLocationRepository.findOne.mockResolvedValue(mockLocation);

      // Execute test
      const result = await locationService.getLocation(mockLocation.id);

      // Verify results
      expect(result).toEqual(mockLocation);
      expect(mockLocationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockLocation.id }
      });
    });

    it('should throw error for non-existent location', async () => {
      // Setup mock
      mockLocationRepository.findOne.mockResolvedValue(null);

      // Execute and verify
      await expect(locationService.getLocation('non-existent-id'))
        .rejects
        .toThrow('Location not found');
    });
  });

  describe('getRestaurantLocations', () => {
    it('should return all locations for a restaurant', async () => {
      // Setup mock
      const locations = [mockLocation];
      mockLocationRepository.find.mockResolvedValue(locations);

      // Execute test
      const result = await locationService.getRestaurantLocations(mockLocation.restaurantId);

      // Verify results
      expect(result).toEqual(locations);
      expect(mockLocationRepository.find).toHaveBeenCalledWith({
        where: { restaurantId: mockLocation.restaurantId },
        order: { createdAt: 'ASC' }
      });
    });
  });

  describe('validateLocationLimit', () => {
    it('should allow creation when under limit', async () => {
      // Setup mock
      mockLocationRepository.count.mockResolvedValue(2);

      // Execute test
      await expect(locationService['validateLocationLimit'](mockLocation.restaurantId))
        .resolves
        .not
        .toThrow();
    });

    it('should throw error when at limit', async () => {
      // Setup mock
      mockLocationRepository.count.mockResolvedValue(3);

      // Execute and verify
      await expect(locationService['validateLocationLimit'](mockLocation.restaurantId))
        .rejects
        .toThrow('Maximum location limit of 3 reached');
    });
  });
});