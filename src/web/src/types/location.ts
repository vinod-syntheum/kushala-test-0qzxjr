/**
 * TypeScript type definitions and interfaces for location-related functionality.
 * Provides comprehensive types for location management, operating hours, and map integration.
 * @version 1.0.0
 */

import { ApiResponse, PaginatedResponse, Coordinates } from './common';
import type { Point } from 'geojson'; // v2.0.0

/**
 * Enum representing possible status values for a location
 */
export enum LocationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TEMPORARILY_CLOSED = 'TEMPORARILY_CLOSED'
}

/**
 * Interface representing a time range with validation
 */
export interface TimeRange {
  open: string;  // 24-hour format: "HH:mm"
  close: string; // 24-hour format: "HH:mm"
  isValid: boolean;
}

/**
 * Interface for comprehensive operating hours including split shifts and holidays
 */
export interface OperatingHours {
  monday: TimeRange[];
  tuesday: TimeRange[];
  wednesday: TimeRange[];
  thursday: TimeRange[];
  friday: TimeRange[];
  saturday: TimeRange[];
  sunday: TimeRange[];
  holidayHours: Record<string, TimeRange[]>; // ISO date string keys
}

/**
 * Interface for structured address information
 */
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  formatted: string;
}

/**
 * Interface for location amenities categorization
 */
export interface Amenity {
  id: string;
  name: string;
  category: string;
  icon?: string;
}

/**
 * Interface for location form data with comprehensive fields
 */
export interface LocationFormData {
  name: string;
  address: Address;
  coordinates: Coordinates;
  operatingHours: OperatingHours;
  phone: string;
  email: string;
  isPrimary: boolean;
  description: string;
  amenities: string[];
}

/**
 * Interface for complete location information
 */
export interface Location extends LocationFormData {
  id: string;
  restaurantId: string;
  status: LocationStatus;
  geoLocation: Point;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for location list item with essential information
 */
export interface LocationListItem {
  id: string;
  name: string;
  address: Address;
  status: LocationStatus;
  isPrimary: boolean;
}

/**
 * Type for location API responses
 */
export type LocationResponse = ApiResponse<Location>;
export type LocationListResponse = PaginatedResponse<LocationListItem>;

/**
 * Interface for location search parameters
 */
export interface LocationSearchParams {
  query?: string;
  status?: LocationStatus;
  radius?: number;
  coordinates?: Coordinates;
  includeInactive?: boolean;
}

/**
 * Interface for location update operations
 */
export interface LocationUpdateParams extends Partial<LocationFormData> {
  id: string;
  status?: LocationStatus;
}

/**
 * Type guard to check if operating hours are valid
 */
export function isValidOperatingHours(hours: OperatingHours): boolean {
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return daysOfWeek.every(day => 
    Array.isArray(hours[day as keyof OperatingHours]) &&
    hours[day as keyof OperatingHours].every(timeRange => timeRange.isValid)
  );
}

/**
 * Type guard to check if coordinates are within valid ranges
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return (
    coords.latitude >= -90 && 
    coords.latitude <= 90 && 
    coords.longitude >= -180 && 
    coords.longitude <= 180 &&
    coords.accuracy >= 0
  );
}