import React, { memo, useCallback } from 'react';
import clsx from 'clsx'; // v2.0.0
import Card, { CardProps } from '../common/Card';
import Badge from '../common/Badge';
import type { Location } from '../../types/location';

/**
 * Props interface for the LocationCard component
 */
export interface LocationCardProps {
  /** Location data to display including holiday hours */
  location: Location;
  /** Handler for edit action with location ID */
  onEdit: (id: string) => void;
  /** Handler for delete action with location ID */
  onDelete: (id: string) => void;
  /** Optional custom CSS classes */
  className?: string;
  /** Optional test ID for testing */
  testId?: string;
}

/**
 * Formats the location address into a display string with proper separators
 */
const formatAddress = (address: Location['address']): string => {
  const components = [
    address.street1,
    address.street2,
    address.city,
    address.state,
    address.postalCode
  ].filter(Boolean);
  
  return components.join(', ');
};

/**
 * Formats operating hours into a display string with support for split shifts
 */
const formatOperatingHours = (
  hours: Location['operatingHours'],
  today: string = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' })
): string => {
  const todayHours = hours[today as keyof typeof hours];
  
  if (!Array.isArray(todayHours) || todayHours.length === 0) {
    return 'Closed';
  }

  return todayHours
    .map(range => `${range.open} - ${range.close}`)
    .join(', ');
};

/**
 * Maps location status to badge variants
 */
const STATUS_BADGE_VARIANTS = {
  ACTIVE: 'success',
  INACTIVE: 'error',
  TEMPORARILY_CLOSED: 'warning'
} as const;

/**
 * Enhanced component for displaying location information with accessibility features
 */
export const LocationCard = memo<LocationCardProps>(({
  location,
  onEdit,
  onDelete,
  className,
  testId
}) => {
  // Memoized handlers
  const handleEdit = useCallback(() => {
    onEdit(location.id);
  }, [location.id, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(location.id);
  }, [location.id, onDelete]);

  return (
    <Card
      variant="default"
      className={clsx(
        'transition-all duration-200',
        'hover:shadow-md',
        className
      )}
      testId={testId}
      role="article"
      aria-labelledby={`location-name-${location.id}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <h3
            id={`location-name-${location.id}`}
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            {location.name}
          </h3>
          {location.isPrimary && (
            <Badge
              variant="primary"
              size="sm"
              rounded
              ariaLabel="Primary location"
            >
              Primary
            </Badge>
          )}
        </div>
        <Badge
          variant={STATUS_BADGE_VARIANTS[location.status]}
          size="sm"
          ariaLabel={`Status: ${location.status.toLowerCase().replace('_', ' ')}`}
        >
          {location.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="space-y-3">
        <div
          className="text-gray-600 dark:text-gray-300"
          aria-label="Address"
        >
          {formatAddress(location.address)}
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          <div className="font-medium mb-1">Today's Hours</div>
          <div aria-live="polite">
            {formatOperatingHours(location.operatingHours)}
          </div>
        </div>

        {location.phone && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium">Phone: </span>
            <a
              href={`tel:${location.phone}`}
              className="hover:text-primary-600 dark:hover:text-primary-400"
              aria-label={`Call ${location.name}`}
            >
              {location.phone}
            </a>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleEdit}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-md',
            'text-primary-600 hover:text-primary-700',
            'dark:text-primary-400 dark:hover:text-primary-300',
            'focus:outline-none focus:ring-2 focus:ring-primary-500'
          )}
          aria-label={`Edit ${location.name}`}
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-md',
            'text-red-600 hover:text-red-700',
            'dark:text-red-400 dark:hover:text-red-300',
            'focus:outline-none focus:ring-2 focus:ring-red-500'
          )}
          aria-label={`Delete ${location.name}`}
        >
          Delete
        </button>
      </div>
    </Card>
  );
});

LocationCard.displayName = 'LocationCard';

export default LocationCard;