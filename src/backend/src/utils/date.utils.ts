// External dependencies
// dayjs: ^1.11.0 - Modern date manipulation library
import dayjs from 'dayjs';
// dayjs/plugin/utc: ^1.11.0 - UTC timezone support
import utc from 'dayjs/plugin/utc';
// dayjs/plugin/timezone: ^1.11.0 - Timezone support
import timezone from 'dayjs/plugin/timezone';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Global constants
export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DEFAULT_TIMEZONE = 'UTC';
export const MAX_EVENT_DURATION_DAYS = 14;
export const BUSINESS_HOURS = {
  start: '09:00',
  end: '23:00'
};

// Type definitions
interface EventDateValidationOptions {
  timezone?: string;
  enforceBusinessHours?: boolean;
  maxDurationDays?: number;
}

interface EventDateValidationResult {
  isValid: boolean;
  messages: string[];
}

interface DateRangeOptions {
  timezone?: string;
  businessDaysOnly?: boolean;
  includeTime?: boolean;
}

/**
 * Formats a date object or string into a standardized string format with timezone support
 * @param date - Date to format (Date object or string)
 * @param format - Output format string (defaults to DEFAULT_DATE_FORMAT)
 * @param timezone - Target timezone (defaults to DEFAULT_TIMEZONE)
 * @returns Formatted date string
 * @throws Error if date is invalid
 */
export const formatDate = (
  date: Date | string,
  format: string = DEFAULT_DATE_FORMAT,
  timezone: string = DEFAULT_TIMEZONE
): string => {
  try {
    const dateObj = dayjs(date);
    if (!dateObj.isValid()) {
      throw new Error('Invalid date provided');
    }

    return dateObj.tz(timezone).format(format);
  } catch (error) {
    throw new Error(`Date formatting error: ${(error as Error).message}`);
  }
};

/**
 * Validates if a given date string or object is valid and within acceptable range
 * @param date - Date to validate
 * @param validationOptions - Optional validation constraints
 * @returns Boolean indicating if date is valid
 */
export const isValidDate = (
  date: Date | string,
  validationOptions?: {
    minDate?: Date;
    maxDate?: Date;
    timezone?: string;
  }
): boolean => {
  try {
    const dateObj = dayjs(date);
    if (!dateObj.isValid()) {
      return false;
    }

    if (validationOptions?.timezone && !dayjs.tz.zone(validationOptions.timezone)) {
      return false;
    }

    if (validationOptions?.minDate && dateObj.isBefore(validationOptions.minDate)) {
      return false;
    }

    if (validationOptions?.maxDate && dateObj.isAfter(validationOptions.maxDate)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Validates start and end dates for an event with enhanced business rules
 * @param startDate - Event start date
 * @param endDate - Event end date
 * @param options - Validation options
 * @returns Validation result with status and messages
 */
export const validateEventDates = (
  startDate: Date,
  endDate: Date,
  options: EventDateValidationOptions = {}
): EventDateValidationResult => {
  const messages: string[] = [];
  const timezone = options.timezone || DEFAULT_TIMEZONE;
  const maxDuration = options.maxDurationDays || MAX_EVENT_DURATION_DAYS;

  const start = dayjs(startDate).tz(timezone);
  const end = dayjs(endDate).tz(timezone);

  // Validate basic date validity
  if (!start.isValid() || !end.isValid()) {
    return {
      isValid: false,
      messages: ['Invalid date format provided']
    };
  }

  // Validate future dates
  if (start.isBefore(dayjs(), 'day')) {
    messages.push('Event start date must be in the future');
  }

  // Validate end date is after start date
  if (end.isBefore(start)) {
    messages.push('Event end date must be after start date');
  }

  // Validate maximum duration
  const duration = end.diff(start, 'days');
  if (duration > maxDuration) {
    messages.push(`Event duration cannot exceed ${maxDuration} days`);
  }

  // Validate business hours if required
  if (options.enforceBusinessHours) {
    const startTime = start.format('HH:mm');
    const endTime = end.format('HH:mm');
    
    if (startTime < BUSINESS_HOURS.start || endTime > BUSINESS_HOURS.end) {
      messages.push(`Event must be within business hours (${BUSINESS_HOURS.start} - ${BUSINESS_HOURS.end})`);
    }
  }

  return {
    isValid: messages.length === 0,
    messages
  };
};

/**
 * Gets an optimized array of dates between start and end date with timezone support
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @param options - Range generation options
 * @returns Array of dates in the specified range
 * @throws Error if date range is invalid
 */
export const getDateRange = (
  startDate: Date,
  endDate: Date,
  options: DateRangeOptions = {}
): Date[] => {
  const timezone = options.timezone || DEFAULT_TIMEZONE;
  const start = dayjs(startDate).tz(timezone).startOf('day');
  const end = dayjs(endDate).tz(timezone).endOf('day');

  if (!start.isValid() || !end.isValid()) {
    throw new Error('Invalid date range provided');
  }

  if (end.isBefore(start)) {
    throw new Error('End date must be after start date');
  }

  const dates: Date[] = [];
  let current = start;

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    if (!options.businessDaysOnly || (current.day() !== 0 && current.day() !== 6)) {
      dates.push(options.includeTime ? current.toDate() : current.startOf('day').toDate());
    }
    current = current.add(1, 'day');
  }

  return dates;
};