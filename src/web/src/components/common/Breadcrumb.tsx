// External imports - versions specified for production stability
import React from 'react'; // v18.0.0
import classNames from 'classnames'; // v2.3.2
import Link from 'next/link'; // v13.0.0

// TypeScript interfaces for component props and items
export interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: string;
}

/**
 * Breadcrumb component for displaying hierarchical navigation
 * Implements responsive design, accessibility, and keyboard navigation
 * 
 * @param {BreadcrumbProps} props - Component props
 * @returns {JSX.Element} Rendered breadcrumb navigation
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = React.memo(({
  items,
  className,
  separator = '/'
}) => {
  // Early return for empty items array
  if (!items?.length) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={classNames(
        'flex items-center flex-wrap gap-2 py-2 text-sm md:text-base',
        className
      )}
    >
      <ol className="flex items-center flex-wrap gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={`${item.href}-${index}`}
              className="flex items-center"
              {...(isLast && { 'aria-current': 'page' })}
            >
              {!item.isCurrent ? (
                // Interactive link for non-current items
                <Link
                  href={item.href}
                  className={classNames(
                    'text-gray-600 hover:text-gray-900',
                    'font-medium transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                    'text-sm md:text-base'
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                // Non-interactive span for current item
                <span
                  className={classNames(
                    'text-gray-900 font-medium',
                    'text-sm md:text-base'
                  )}
                >
                  {item.label}
                </span>
              )}

              {/* Render separator for all items except the last one */}
              {!isLast && (
                <span
                  className={classNames(
                    'text-gray-400 mx-2 select-none',
                    'sm:mx-1 md:mx-2'
                  )}
                  aria-hidden="true"
                >
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

// Display name for debugging purposes
Breadcrumb.displayName = 'Breadcrumb';

// Default export for the component
export default Breadcrumb;