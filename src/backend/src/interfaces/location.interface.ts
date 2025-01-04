// External imports - geojson v2.0.0
import { Point } from 'geojson';

/**
 * Enumeration of possible location operational statuses
 */
export enum LocationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TEMPORARILY_CLOSED = 'TEMPORARILY_CLOSED'
}

/**
 * Interface representing a standardized address structure
 */
export interface IAddress {
  street: string;
  unit: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  formatted: string;
}

/**
 * Interface representing a time range with support for closure notes
 */
export interface ITimeRange {
  open: string;      // Format: HH:mm in 24-hour
  close: string;     // Format: HH:mm in 24-hour
  isClosed: boolean; // Indicates if location is closed during this time range
  note: string;      // Optional note about the time range (e.g., "Kitchen closes at 21:00")
}

/**
 * Interface representing operating hours with support for multiple time slots
 * and special schedules (holidays, seasonal hours)
 */
export interface IOperatingHours {
  monday: ITimeRange[];
  tuesday: ITimeRange[];
  wednesday: ITimeRange[];
  thursday: ITimeRange[];
  friday: ITimeRange[];
  saturday: ITimeRange[];
  sunday: ITimeRange[];
  holidays: Record<string, ITimeRange[]>;  // Key format: YYYY-MM-DD
  seasonal: Record<string, ITimeRange[]>;  // Key format: YYYY-MM-DD/YYYY-MM-DD
}

/**
 * Primary interface representing a restaurant location
 * Supports up to 3 locations per restaurant with comprehensive location management
 */
export interface ILocation {
  /** Unique identifier for the location */
  id: string;

  /** Reference to the parent restaurant */
  restaurantId: string;

  /** Location name/branch identifier */
  name: string;

  /** Structured address information */
  address: IAddress;

  /** GeoJSON Point coordinates for map integration */
  coordinates: Point;

  /** Detailed operating hours schedule */
  operatingHours: IOperatingHours;

  /** Contact phone number with country code */
  phone: string;

  /** Contact email address */
  email: string;

  /** Current operational status */
  status: LocationStatus;

  /** Indicates if this is the main/primary location */
  isPrimary: boolean;

  /** IANA timezone identifier */
  timezone: string;

  /** Array of location features/amenities */
  features: string[];

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}