import React, { memo } from 'react';
import clsx from 'clsx'; // v2.x
import { IntlNumberFormat } from '@formatjs/intl'; // v2.x
import Card, { CardProps } from '../common/Card';
import type { CommonProps } from '../../types/common';

/**
 * Props interface for the AnalyticsCard component with enhanced type safety
 */
export interface AnalyticsCardProps extends CommonProps {
  /** Title of the analytics metric */
  title: string;
  /** Current value of the metric */
  value: string | number;
  /** Percentage change trend */
  trend: number;
  /** Time period for the trend calculation */
  trendPeriod: 'daily' | 'weekly' | 'monthly';
  /** Optional icon to display with the title */
  icon?: React.ReactNode;
  /** Visual style variant */
  variant?: 'success' | 'warning' | 'danger' | 'info';
  /** Optional tooltip content for additional context */
  tooltipContent?: string;
  /** Loading state indicator */
  loading?: boolean;
  /** Locale for number formatting */
  locale?: string;
}

/**
 * A specialized card component for displaying analytics metrics with enhanced visualization
 * and accessibility features. Supports various metric types, trends, and interactive elements.
 */
export const AnalyticsCard = memo<AnalyticsCardProps>(({
  title,
  value,
  trend,
  trendPeriod,
  icon,
  variant = 'info',
  tooltipContent,
  loading = false,
  locale = 'en-US',
  className,
}) => {
  // Initialize number formatter with locale support
  const numberFormatter = new IntlNumberFormat(locale, {
    maximumFractionDigits: 1,
    signDisplay: 'always'
  });

  // Calculate trend direction and accessibility text
  const trendDirection = trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral';
  const trendText = `${Math.abs(trend)}% ${trendDirection} ${trendPeriod}`;
  
  // Determine variant-specific styles
  const variantStyles = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  // Format value based on type and loading state
  const formattedValue = React.useMemo(() => {
    if (loading) return '---';
    if (typeof value === 'number') {
      return new IntlNumberFormat(locale, {
        maximumFractionDigits: 0,
        notation: 'compact'
      }).format(value);
    }
    return value;
  }, [value, loading, locale]);

  // Trend indicator icons
  const trendIcon = React.useMemo(() => ({
    up: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    neutral: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    )
  })[trendDirection], [trendDirection]);

  return (
    <Card
      className={clsx(
        'h-32 md:h-40',
        'flex flex-col justify-between',
        'transition-all duration-200',
        className
      )}
      variant="default"
      padding="medium"
      role="region"
      aria-label={`${title} analytics card`}
    >
      {/* Title Section */}
      <div className="flex items-center justify-between">
        <div 
          className="flex items-center gap-2 text-sm md:text-base font-medium text-gray-600"
          title={tooltipContent}
        >
          {icon && <span className="text-gray-400">{icon}</span>}
          <span>{title}</span>
        </div>
      </div>

      {/* Value Section */}
      <div className={clsx(
        'text-2xl md:text-3xl font-semibold text-gray-900',
        loading && 'animate-pulse bg-gray-200 rounded'
      )}>
        {formattedValue}
      </div>

      {/* Trend Section */}
      <div
        className={clsx(
          'flex items-center gap-1 text-sm md:text-base',
          variantStyles[variant]
        )}
        aria-live="polite"
        role="status"
      >
        <span className="sr-only">Trend indicator showing</span>
        {trendIcon}
        <span>
          {numberFormatter.format(trend)}%
        </span>
        <span className="text-gray-500 text-sm">
          {trendPeriod}
        </span>
        <span className="sr-only">{trendText}</span>
      </div>
    </Card>
  );
});

// Display name for debugging
AnalyticsCard.displayName = 'AnalyticsCard';

export default AnalyticsCard;