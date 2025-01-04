import React, { memo } from 'react';
import clsx from 'clsx'; // v2.x
import type { CommonProps } from '../../types/common';

/**
 * Props interface for the Card component extending CommonProps for consistent styling
 */
export interface CardProps extends CommonProps {
  /** Primary content of the card */
  children: React.ReactNode;
  /** Visual style variant of the card */
  variant?: 'default' | 'outlined' | 'elevated';
  /** Optional header content */
  header?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Padding size applied to the card */
  padding?: 'none' | 'small' | 'medium' | 'large';
  /** Optional click handler for interactive cards */
  onClick?: () => void;
  /** ARIA role override */
  role?: string;
  /** Test ID for automated testing */
  testId?: string;
}

/**
 * A flexible card component that provides a container layout with customizable styling and sections.
 * Implements the design system's visual styles, spacing, and interactive states.
 */
export const Card = memo<CardProps>(({
  children,
  className,
  variant = 'default',
  header,
  footer,
  padding = 'medium',
  onClick,
  role,
  testId,
}) => {
  // Base styles following design system specifications
  const baseStyles = clsx(
    // Typography and colors
    'font-inter text-gray-900 dark:text-gray-100',
    // Background and border radius
    'bg-white dark:bg-gray-800 rounded-lg',
    // Transition effects
    'transition-all duration-200 ease-in-out'
  );

  // Variant-specific styles
  const variantStyles = {
    default: 'border border-gray-200 dark:border-gray-700',
    outlined: 'border-2 border-primary-500 dark:border-primary-400',
    elevated: 'shadow-md hover:shadow-lg focus:shadow-lg'
  }[variant];

  // Padding styles based on design system spacing scale
  const paddingStyles = {
    none: 'p-0',
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6'
  }[padding];

  // Interactive styles when onClick is provided
  const interactiveStyles = onClick ? clsx(
    'cursor-pointer',
    'hover:bg-gray-50 dark:hover:bg-gray-700',
    'focus:outline-none focus:ring-2 focus:ring-primary-500'
  ) : '';

  // Combine all styles
  const cardStyles = clsx(
    baseStyles,
    variantStyles,
    paddingStyles,
    interactiveStyles,
    className
  );

  // Handle keyboard interaction for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === 'Space')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cardStyles}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={role || (onClick ? 'button' : 'article')}
      tabIndex={onClick ? 0 : undefined}
      data-testid={testId}
    >
      {header && (
        <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          {header}
        </div>
      )}
      
      <div className={clsx(
        !header && !footer && 'h-full w-full',
        header && 'mt-4',
        footer && 'mb-4'
      )}>
        {children}
      </div>

      {footer && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          {footer}
        </div>
      )}
    </div>
  );
});

// Display name for debugging
Card.displayName = 'Card';

export default Card;