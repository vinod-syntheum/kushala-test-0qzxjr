import React, { memo } from 'react';
import clsx from 'clsx'; // v2.x
import { LinearProgress } from '@mui/material'; // v5.x
import Card, { CardProps } from '../common/Card';
import { Event, EventStatus } from '../../types/event';
import { formatDate } from '../../utils/date';

/**
 * Props interface for the EventCard component
 */
export interface EventCardProps {
  /** Event data to display */
  event: Event;
  /** Callback for edit action */
  onEdit: () => void;
  /** Callback for delete action */
  onDelete: () => void;
  /** Optional CSS class name */
  className?: string;
  /** Dark mode flag */
  isDarkMode?: boolean;
  /** Locale for date formatting */
  locale?: string;
}

/**
 * Get appropriate color classes based on event status and theme
 */
const getStatusColor = (status: EventStatus, isDarkMode: boolean): string => {
  const baseColors = {
    [EventStatus.DRAFT]: clsx(
      'text-gray-500 bg-gray-100',
      isDarkMode && 'dark:text-gray-400 dark:bg-gray-700'
    ),
    [EventStatus.PUBLISHED]: clsx(
      'text-green-500 bg-green-100',
      isDarkMode && 'dark:text-green-400 dark:bg-green-900'
    ),
    [EventStatus.CANCELLED]: clsx(
      'text-red-500 bg-red-100',
      isDarkMode && 'dark:text-red-400 dark:bg-red-900'
    ),
    [EventStatus.COMPLETED]: clsx(
      'text-blue-500 bg-blue-100',
      isDarkMode && 'dark:text-blue-400 dark:bg-blue-900'
    )
  };

  return baseColors[status] || baseColors[EventStatus.DRAFT];
};

/**
 * Calculate ticket sales progress percentage
 */
const calculateProgress = (sold: number, total: number): number => {
  if (!total || total <= 0) return 0;
  const percentage = (sold / total) * 100;
  return Math.min(Math.max(Math.round(percentage), 0), 100);
};

/**
 * EventCard component displays event information in a card format
 * with responsive design and accessibility features
 */
export const EventCard = memo<EventCardProps>(({
  event,
  onEdit,
  onDelete,
  className,
  isDarkMode = false,
  locale = 'en-US'
}) => {
  const {
    name,
    startDate,
    status,
    ticketsSold = 0,
    totalTickets = 0,
    revenue = 0
  } = event;

  const formattedDate = formatDate(startDate, 'MMM D, YYYY h:mm A', locale);
  const progress = calculateProgress(ticketsSold, totalTickets);
  const statusColor = getStatusColor(status, isDarkMode);

  return (
    <Card
      className={clsx(
        'transition-all duration-200',
        'hover:shadow-md',
        isDarkMode ? 'bg-gray-800' : 'bg-white',
        className
      )}
      role="article"
      aria-label={`Event: ${name}`}
    >
      <div className="flex flex-col space-y-4">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <h3 className={clsx(
            'text-lg font-semibold',
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          )}>
            {name}
          </h3>
          <span className={clsx(
            'px-2 py-1 rounded-full text-sm font-medium',
            statusColor
          )}>
            {status}
          </span>
        </div>

        {/* Date and Time */}
        <div className={clsx(
          'text-sm',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {formattedDate}
        </div>

        {/* Ticket Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Tickets Sold: {ticketsSold}/{totalTickets}
            </span>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              {progress}%
            </span>
          </div>
          <LinearProgress
            variant="determinate"
            value={progress}
            className={clsx(
              'rounded-full',
              isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
            )}
          />
        </div>

        {/* Revenue */}
        <div className={clsx(
          'text-sm font-medium',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          Revenue: ${revenue.toLocaleString(locale)}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onEdit}
            className={clsx(
              'text-sm font-medium px-3 py-1 rounded',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              isDarkMode
                ? 'text-blue-400 hover:text-blue-300 focus:ring-blue-500'
                : 'text-blue-600 hover:text-blue-700 focus:ring-blue-500'
            )}
            aria-label="Edit event"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className={clsx(
              'text-sm font-medium px-3 py-1 rounded',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              isDarkMode
                ? 'text-red-400 hover:text-red-300 focus:ring-red-500'
                : 'text-red-600 hover:text-red-700 focus:ring-red-500'
            )}
            aria-label="Delete event"
          >
            Delete
          </button>
        </div>
      </div>
    </Card>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;