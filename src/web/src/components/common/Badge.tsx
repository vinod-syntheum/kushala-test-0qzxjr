import React from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0

interface BadgeProps {
  /** Content to be displayed inside the badge */
  children: React.ReactNode;
  /** Visual style variant of the badge */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  /** Size variant of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the badge should have fully rounded corners */
  rounded?: boolean;
  /** Additional CSS classes to apply */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Mapping of variant names to their corresponding Tailwind CSS classes
 */
const VARIANT_CLASSES = {
  primary: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 focus:ring-blue-500',
  secondary: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 focus:ring-gray-500',
  success: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 focus:ring-green-500',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 focus:ring-yellow-500',
  error: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 focus:ring-red-500',
  info: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200 focus:ring-indigo-500'
} as const;

/**
 * Mapping of size variants to their corresponding Tailwind CSS classes
 */
const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5 leading-4',
  md: 'text-sm px-2.5 py-1 leading-5',
  lg: 'text-base px-3 py-1.5 leading-6'
} as const;

/**
 * Base classes applied to all badge variants
 */
const BASE_CLASSES = 'inline-flex items-center justify-center font-medium border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

/**
 * Generates the complete set of variant-specific classes
 * @param variant - The badge variant
 * @returns Combined Tailwind CSS classes for the variant
 */
const getVariantClasses = (variant: keyof typeof VARIANT_CLASSES): string => {
  return VARIANT_CLASSES[variant];
};

/**
 * Badge component for displaying status indicators, labels, and counts
 * with support for multiple variants, sizes, and accessibility features.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = false,
  className,
  ariaLabel,
}) => {
  const combinedClasses = clsx(
    BASE_CLASSES,
    getVariantClasses(variant),
    SIZE_CLASSES[size],
    rounded ? 'rounded-full' : 'rounded-md',
    className
  );

  return (
    <span
      className={combinedClasses}
      role="status"
      aria-label={ariaLabel}
    >
      {children}
    </span>
  );
};

// Default export for convenient importing
export default Badge;