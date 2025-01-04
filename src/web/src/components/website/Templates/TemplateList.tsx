import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.x
import clsx from 'clsx'; // v2.x
import TemplateCard, { TemplateCardProps } from './TemplateCard';
import { Template } from '../../../types/website';
import { useWebsiteBuilder } from '../../../hooks/useWebsiteBuilder';

/**
 * Props interface for the TemplateList component
 */
export interface TemplateListProps {
  /** Array of available templates */
  templates: Template[];
  /** Currently selected template ID */
  selectedTemplateId: string | null;
  /** Callback for template selection */
  onTemplateSelect: (templateId: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Optional category filter */
  filterCategory?: string;
  /** Optional search query */
  searchQuery?: string;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Optional preview callback */
  onPreview?: (template: Template) => void;
}

/**
 * A responsive, accessible grid of restaurant website templates with virtual scrolling
 * and advanced filtering capabilities.
 */
export const TemplateList = React.memo<TemplateListProps>(({
  templates,
  selectedTemplateId,
  onTemplateSelect,
  className,
  filterCategory,
  searchQuery,
  isLoading = false,
  onPreview
}) => {
  // Refs and state
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const { setTemplate } = useWebsiteBuilder();

  // Calculate optimal grid layout based on container width
  const columnCount = useMemo(() => {
    if (containerWidth < 640) return 1;
    if (containerWidth < 1024) return 2;
    if (containerWidth < 1280) return 3;
    return 4;
  }, [containerWidth]);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    return templates
      .filter(template => {
        const matchesCategory = !filterCategory || template.category === filterCategory;
        const matchesSearch = !searchQuery || 
          template.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, filterCategory, searchQuery]);

  // Virtual scrolling setup
  const rowCount = Math.ceil(filteredTemplates.length / columnCount);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 320, // Estimated row height
    overscan: 2
  });

  // Handle container resize
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const [entry] = entries;
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Template selection handler
  const handleTemplateSelect = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onTemplateSelect(templateId);
      setTemplate(template);
    }
  }, [onTemplateSelect, setTemplate, templates]);

  // Template preview handler
  const handlePreview = useCallback((template: Template) => {
    if (onPreview) {
      onPreview(template);
    }
  }, [onPreview]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent, templateId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTemplateSelect(templateId);
    }
  }, [handleTemplateSelect]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative min-h-[200px] overflow-auto',
        className
      )}
      role="grid"
      aria-busy={isLoading}
      aria-label="Website templates grid"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => {
          const startIndex = virtualRow.index * columnCount;
          const rowTemplates = filteredTemplates.slice(startIndex, startIndex + columnCount);

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
              className={clsx(
                'grid gap-6',
                {
                  'grid-cols-1': columnCount === 1,
                  'grid-cols-2': columnCount === 2,
                  'grid-cols-3': columnCount === 3,
                  'grid-cols-4': columnCount === 4
                }
              )}
              role="row"
            >
              {rowTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={template.id === selectedTemplateId}
                  onSelect={handleTemplateSelect}
                  className="h-full"
                  ariaLabel={`Select ${template.name} template`}
                  testId={`template-${template.id}`}
                  onKeyDown={(e) => handleKeyDown(e, template.id)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {isLoading && (
        <div
          className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 
            flex items-center justify-center"
          role="progressbar"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-4 
            border-primary-500 border-t-transparent" />
        </div>
      )}

      {!isLoading && filteredTemplates.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center 
            text-gray-500 dark:text-gray-400"
          role="status"
        >
          No templates found
        </div>
      )}
    </div>
  );
});

// Display name for debugging
TemplateList.displayName = 'TemplateList';

export default TemplateList;