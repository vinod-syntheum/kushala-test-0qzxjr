import React, { useState, useCallback } from 'react';
import clsx from 'clsx'; // v2.x
import { useDebounce } from 'use-debounce'; // v9.x
import { Card, CardProps } from '../../../components/common/Card';
import type { Template } from '../../../types/website';

/**
 * Props interface for the TemplateCard component
 */
export interface TemplateCardProps {
  /** Template data object */
  template: Template;
  /** Whether the template is currently selected */
  isSelected: boolean;
  /** Callback function when template is selected */
  onSelect: (templateId: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Optional ARIA label for accessibility */
  ariaLabel?: string;
  /** Optional test ID for automated testing */
  testId?: string;
}

/**
 * A card component that displays a restaurant website template with preview image,
 * name, and selection functionality. Implements accessibility features and optimized
 * image loading.
 */
export const TemplateCard = React.memo<TemplateCardProps>(({
  template,
  isSelected,
  onSelect,
  className,
  ariaLabel,
  testId = 'template-card'
}) => {
  // State for image loading and error handling
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Debounce selection handler to prevent rapid re-renders
  const [debouncedSelect] = useDebounce(
    useCallback(() => onSelect(template.id), [onSelect, template.id]),
    300
  );

  // Handle image load events
  const handleImageLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsImageLoading(false);
    setImageError(true);
  }, []);

  // Handle keyboard interaction for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      debouncedSelect();
    }
  }, [debouncedSelect]);

  // Compose CSS classes
  const cardClasses = clsx(
    'group relative transition-all duration-200 ease-in-out',
    'hover:transform hover:-translate-y-1',
    'focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500',
    isSelected && 'ring-2 ring-primary-500 scale-[1.02]',
    className
  );

  const imageClasses = clsx(
    'w-full h-48 object-cover rounded-t-lg transition-opacity duration-300',
    isImageLoading && 'opacity-50 bg-gray-100',
    imageError && 'bg-red-50 border border-red-300'
  );

  return (
    <Card
      className={cardClasses}
      onClick={debouncedSelect}
      role="button"
      testId={testId}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel || `Select ${template.name} template`}
      aria-pressed={isSelected}
    >
      <div className="relative">
        <img
          src={template.thumbnail}
          alt={`Preview of ${template.name} template`}
          className={imageClasses}
          loading="lazy"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse w-full h-full bg-gray-200 rounded-t-lg" />
          </div>
        )}
      </div>

      <div className="p-4 text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {template.name}
        </h3>
        {template.category && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {template.category}
          </p>
        )}
      </div>

      {isSelected && (
        <div
          className="absolute inset-0 bg-primary-500 bg-opacity-10 rounded-lg"
          aria-hidden="true"
        />
      )}
    </Card>
  );
});

// Display name for debugging
TemplateCard.displayName = 'TemplateCard';

export default TemplateCard;