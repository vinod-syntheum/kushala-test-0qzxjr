import React, { FC, useCallback, useMemo, useRef, useEffect } from 'react'; // v18.2.0
import classNames from 'classnames'; // v2.3.2
import { motion, AnimatePresence } from 'framer-motion'; // v6.0.0

import { useDragAndDrop } from '../../../hooks/useDragAndDrop';
import { useWebsiteBuilder } from '../../../hooks/useWebsiteBuilder';
import { ContentBlock, ContentBlockType } from '../../../types/website';

interface DropZoneProps {
  id: string;
  index: number;
  acceptedTypes: ContentBlockType[];
  className?: string;
  onValidationError?: (error: { field: string; message: string }) => void;
  ariaLabel?: string;
  isNested?: boolean;
}

const DropZone: FC<DropZoneProps> = ({
  id,
  index,
  acceptedTypes,
  className,
  onValidationError,
  ariaLabel = 'Drop zone for content blocks',
  isNested = false
}) => {
  // Refs for measurements and animations
  const zoneRef = useRef<HTMLDivElement>(null);
  const lastDropTime = useRef<number>(0);

  // Website builder state and operations
  const { moveBlock, addBlock, undo, redo } = useWebsiteBuilder();

  // Enhanced drag and drop functionality
  const {
    dropRef,
    isDragging,
    isOver,
    canDrop,
    dropClassName,
    dragPreview
  } = useDragAndDrop({
    type: 'CONTENT_BLOCK',
    canDrop: (item: { type: ContentBlockType }) => acceptedTypes.includes(item.type)
  });

  // Memoized styles for performance
  const dropZoneStyles = useMemo(() => ({
    minHeight: isNested ? '2rem' : '4rem',
    transition: 'all 0.2s ease-in-out',
    opacity: isDragging ? 1 : 0.6,
    transform: isOver && canDrop ? 'scale(1.02)' : 'scale(1)',
  }), [isDragging, isOver, canDrop, isNested]);

  // Enhanced drop handler with validation and undo/redo support
  const handleDrop = useCallback(async (item: {
    id: string;
    type: ContentBlockType;
    index: number;
  }) => {
    try {
      // Debounce drops to prevent duplicates
      const now = Date.now();
      if (now - lastDropTime.current < 200) return;
      lastDropTime.current = now;

      // Validate block type
      if (!acceptedTypes.includes(item.type)) {
        onValidationError?.({
          field: 'type',
          message: `Block type ${item.type} is not allowed in this zone`
        });
        return;
      }

      // Handle block movement or addition
      if (item.id) {
        moveBlock(item.index, index);
      } else {
        addBlock(item.type, index);
      }

      // Announce successful drop for screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = `Content block ${item.type} dropped successfully`;
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);

    } catch (error) {
      console.error('Drop operation failed:', error);
      onValidationError?.({
        field: 'operation',
        message: 'Failed to process drop operation'
      });
    }
  }, [index, acceptedTypes, moveBlock, addBlock, onValidationError]);

  // Set up keyboard navigation
  useEffect(() => {
    const element = zoneRef.current;
    if (!element) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        element.click();
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Composite ref combining drag and drop with measurements
  const compositeRef = useCallback((node: HTMLDivElement | null) => {
    dropRef(node);
    if (node) {
      zoneRef.current = node;
    }
  }, [dropRef]);

  return (
    <AnimatePresence>
      <motion.div
        ref={compositeRef}
        className={classNames(
          'drop-zone',
          dropClassName,
          {
            'drop-zone--active': isOver && canDrop,
            'drop-zone--nested': isNested,
          },
          className
        )}
        style={dropZoneStyles}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        layout
        data-testid={`drop-zone-${id}`}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-dropeffect="move"
        aria-disabled={!canDrop}
      >
        {isOver && canDrop && (
          <motion.div
            className="drop-zone__indicator"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
        <div 
          className="drop-zone__content"
          aria-hidden={isDragging}
        >
          {!isDragging && !isOver && (
            <div className="drop-zone__placeholder">
              Drop content blocks here
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DropZone;