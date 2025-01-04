/**
 * Frontend utility functions for formatting various data types with internationalization support.
 * Provides consistent formatting across the web application with enhanced error handling and validation.
 * @version 1.0.0
 */

import { format as dateFormat } from 'date-fns'; // v2.30.0
import 'intl'; // v1.2.5
import { Coordinates } from '../types/common';

// Global constants for formatting configuration
const DEFAULT_LOCALE = 'en-US';
const CURRENCY_CODE = 'USD';
const DECIMAL_PLACES = 2;
const COORDINATE_PRECISION = 6;
const PHONE_FORMATS = {
  US: '(XXX) XXX-XXXX',
  INTL: '+X XXX XXX XXXX'
};

/**
 * Formats a number as currency with proper symbol and internationalization support
 * @param amount - The numeric amount to format
 * @param currencyCode - ISO 4217 currency code (default: USD)
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Formatted currency string
 * @throws Error if amount is not a valid number
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = CURRENCY_CODE,
  decimalPlaces: number = DECIMAL_PLACES
): string {
  if (!Number.isFinite(amount)) {
    throw new Error('Invalid amount provided for currency formatting');
  }

  try {
    const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });

    return formatter.format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${currencyCode} ${amount.toFixed(decimalPlaces)}`;
  }
}

/**
 * Formats a phone number string into a standardized format with international support
 * @param phoneNumber - The phone number to format
 * @param format - Desired format template (default: US)
 * @returns Formatted phone number string
 * @throws Error if phone number is invalid
 */
export function formatPhoneNumber(
  phoneNumber: string,
  format: 'US' | 'INTL' = 'US'
): string {
  const digits = phoneNumber.replace(/\D/g, '');
  
  if (format === 'US' && digits.length !== 10) {
    throw new Error('US phone numbers must be 10 digits');
  }

  if (format === 'US') {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // International format
  return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

/**
 * Formats an address into a standardized string with international support
 * @param street - Street address
 * @param city - City name
 * @param state - State/Province/Region
 * @param zipCode - Postal/ZIP code
 * @param country - Country name
 * @returns Formatted address string
 */
export function formatAddress(
  street: string,
  city: string,
  state: string,
  zipCode: string,
  country: string = 'USA'
): string {
  const components = [
    street,
    city,
    state,
    zipCode,
    country
  ].filter(Boolean);

  if (country === 'USA') {
    return `${street}\n${city}, ${state} ${zipCode}`;
  }

  return components.join(', ');
}

/**
 * Formats a decimal number as a percentage with validation and precision control
 * @param value - Number to format as percentage (0-1 or 0-100)
 * @param decimalPlaces - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 * @throws Error if value is invalid
 */
export function formatPercentage(
  value: number,
  decimalPlaces: number = 0
): string {
  if (!Number.isFinite(value)) {
    throw new Error('Invalid number provided for percentage formatting');
  }

  // Convert decimal to percentage if needed
  const percentValue = value <= 1 ? value * 100 : value;

  try {
    const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'percent',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });

    return formatter.format(value <= 1 ? value : value / 100);
  } catch (error) {
    console.error('Percentage formatting error:', error);
    return `${percentValue.toFixed(decimalPlaces)}%`;
  }
}

/**
 * Formats geographic coordinates into a readable string with high precision
 * @param coordinates - Coordinate object with latitude and longitude
 * @param format - Output format ('dms' for degrees/minutes/seconds or 'decimal')
 * @returns Formatted coordinates string
 * @throws Error if coordinates are invalid
 */
export function formatCoordinates(
  coordinates: Coordinates,
  format: 'dms' | 'decimal' = 'decimal'
): string {
  const { latitude, longitude } = coordinates;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Invalid coordinates provided');
  }

  if (format === 'decimal') {
    return `${latitude.toFixed(COORDINATE_PRECISION)}, ${longitude.toFixed(COORDINATE_PRECISION)}`;
  }

  // Convert to degrees, minutes, seconds format
  const formatDMS = (value: number, isLatitude: boolean): string => {
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutes = Math.floor((absolute - degrees) * 60);
    const seconds = ((absolute - degrees - minutes / 60) * 3600).toFixed(1);
    
    const direction = isLatitude
      ? value >= 0 ? 'N' : 'S'
      : value >= 0 ? 'E' : 'W';

    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  return `${formatDMS(latitude, true)} ${formatDMS(longitude, false)}`;
}