/**
 * Date Utility Module
 * Provides comprehensive date manipulation utilities with timezone support
 * for event management and global deployment requirements.
 * @module utils/date
 * @version 1.0.0
 */

import dayjs from 'dayjs'; // v1.11.10
import utc from 'dayjs/plugin/utc'; // v1.11.10
import timezone from 'dayjs/plugin/timezone'; // v1.11.10
import customParseFormat from 'dayjs/plugin/customParseFormat'; // v1.11.10
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'; // v1.11.10
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'; // v1.11.10

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Global constants for date formatting
export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_TIME_FORMAT = 'HH:mm';
export const DEFAULT_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Formats a date string or Date object to the specified format with timezone awareness
 * @param date - Date to format
 * @param format - Output format
 * @param timezone - Optional timezone (defaults to UTC)
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (
  date: string | Date | null,
  format: string = DEFAULT_DATE_FORMAT,
  timezone: string = DEFAULT_TIMEZONE
): string => {
  if (!date) return '';
  
  try {
    const dateObj = dayjs.tz(date, timezone);
    if (!dateObj.isValid()) return '';
    return dateObj.format(format);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Parses a date string in the specified format to a Date object with timezone handling
 * @param dateStr - Date string to parse
 * @param format - Expected input format
 * @param timezone - Optional timezone (defaults to UTC)
 * @returns Parsed Date object or null if invalid
 */
export const parseDate = (
  dateStr: string,
  format: string = DEFAULT_DATE_FORMAT,
  timezone: string = DEFAULT_TIMEZONE
): Date | null => {
  try {
    const parsed = dayjs.tz(dateStr, format, timezone);
    return parsed.isValid() ? parsed.toDate() : null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Validates if a date string is in the correct format and represents a valid date
 * @param dateStr - Date string to validate
 * @param format - Expected format
 * @returns Boolean indicating validity
 */
export const isValidDate = (
  dateStr: string,
  format: string = DEFAULT_DATE_FORMAT
): boolean => {
  if (!dateStr) return false;
  
  try {
    const parsed = dayjs(dateStr, format, true);
    return parsed.isValid() && parsed.format(format) === dateStr;
  } catch {
    return false;
  }
};

/**
 * Checks if a date is in the future relative to current time with timezone awareness
 * @param date - Date to check
 * @param timezone - Optional timezone (defaults to UTC)
 * @returns Boolean indicating if date is in future
 */
export const isDateInFuture = (
  date: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): boolean => {
  try {
    const dateObj = dayjs.tz(date, timezone);
    const now = dayjs().tz(timezone);
    return dateObj.isAfter(now);
  } catch (error) {
    console.error('Error checking future date:', error);
    return false;
  }
};

/**
 * Validates if start date is before or equal to end date with timezone consideration
 * @param startDate - Start date
 * @param endDate - End date
 * @param timezone - Optional timezone (defaults to UTC)
 * @returns Boolean indicating valid range
 */
export const isValidDateRange = (
  startDate: string | Date,
  endDate: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): boolean => {
  try {
    const start = dayjs.tz(startDate, timezone);
    const end = dayjs.tz(endDate, timezone);
    return start.isSameOrBefore(end);
  } catch (error) {
    console.error('Error validating date range:', error);
    return false;
  }
};

/**
 * Converts UTC date to local timezone date string with format specification
 * @param utcDate - UTC date string
 * @param timezone - Target timezone
 * @param format - Output format
 * @returns Localized date string
 */
export const getLocalizedDate = (
  utcDate: string,
  timezone: string,
  format: string = DEFAULT_DATETIME_FORMAT
): string => {
  try {
    const dateObj = dayjs.utc(utcDate).tz(timezone);
    return dateObj.isValid() ? dateObj.format(format) : '';
  } catch (error) {
    console.error('Error localizing date:', error);
    return '';
  }
};

/**
 * Converts local date to UTC date string for standardized storage
 * @param localDate - Local date string
 * @param timezone - Source timezone
 * @param format - Output format
 * @returns UTC date string
 */
export const getUtcDate = (
  localDate: string,
  timezone: string,
  format: string = DEFAULT_DATETIME_FORMAT
): string => {
  try {
    const dateObj = dayjs.tz(localDate, timezone).utc();
    return dateObj.isValid() ? dateObj.format(format) : '';
  } catch (error) {
    console.error('Error converting to UTC:', error);
    return '';
  }
};