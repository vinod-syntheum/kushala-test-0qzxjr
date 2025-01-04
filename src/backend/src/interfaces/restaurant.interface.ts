/**
 * Restaurant Interface Definitions
 * Version: 1.0.0
 * 
 * This module defines TypeScript interfaces for restaurant-related data structures,
 * providing comprehensive type definitions for restaurant entities with support for
 * multi-location management and website content integration.
 */

import { ILocation } from './location.interface';
import { IWebsiteContent } from './content.interface';
import { User } from './user.interface';

/**
 * Enumeration of possible restaurant operational statuses.
 * Used to track and manage the lifecycle of restaurant entities.
 */
export enum RestaurantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

/**
 * Interface for restaurant configuration settings.
 * Controls feature availability and system limitations.
 */
export interface IRestaurantSettings {
  /** IANA timezone identifier for the restaurant */
  timezone: string;

  /** ISO 4217 currency code for pricing */
  currency: string;

  /** Flag to enable/disable event management features */
  enableEvents: boolean;

  /** Flag to enable/disable website and online presence features */
  enableOnlinePresence: boolean;

  /** Maximum number of locations allowed (up to 3) */
  maxLocations: number;
}

/**
 * Primary interface representing a restaurant entity.
 * Supports comprehensive restaurant management with multi-location
 * and website content integration capabilities.
 */
export interface IRestaurant {
  /** Unique identifier for the restaurant */
  id: string;

  /** Reference to the restaurant owner's user ID */
  ownerId: string;

  /** Restaurant business name */
  name: string;

  /** Custom domain for restaurant website */
  domain: string;

  /** Current operational status */
  status: RestaurantStatus;

  /** Restaurant configuration settings */
  settings: IRestaurantSettings;

  /** Array of restaurant locations (max 3) */
  locations: ILocation[];

  /** Array of website content versions */
  websiteContent: IWebsiteContent[];

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Interface for restaurant creation payload.
 * Contains required fields for initializing a new restaurant entity.
 */
export interface IRestaurantCreate {
  /** Reference to the owner's user ID */
  ownerId: string;

  /** Restaurant business name */
  name: string;

  /** Custom domain for restaurant website */
  domain: string;

  /** Initial restaurant configuration settings */
  settings: IRestaurantSettings;
}

/**
 * Interface for restaurant update payload.
 * Supports partial updates to restaurant properties.
 */
export interface IRestaurantUpdate {
  /** Updated restaurant name */
  name?: string;

  /** Updated custom domain */
  domain?: string;

  /** Updated operational status */
  status?: RestaurantStatus;

  /** Partial update to configuration settings */
  settings?: Partial<IRestaurantSettings>;
}