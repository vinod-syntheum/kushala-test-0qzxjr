import React from 'react'; // v18.2.0
import { IconGripVertical } from '@tabler/icons-react'; // v2.0.0
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { ContentBlock } from '../../../types/website';

interface DragHandleProps {
  block: ContentBlock;
  onDrop: (sourceId: string, targetId: string) => Promise<void>;
  className?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/**
 * Enhanced drag handle component with accessibility and touch support
 * for the website builder interface.
 */
const DragHandle: React.FC<DragHandleProps> = React.memo(({
  block,
  onDrop,
  className = '',
  onDragStart,
  onDragEnd
}) => {
  // Initialize drag and drop functionality with touch support
  const {
    dragRef,
    isDragging,
    opacity,
    dropClassName
  } = useDragAndDrop({
    type: 'CONTENT_BLOCK',
    item: {
      id: block.id,
      type: block.type,
      index: block.order,
      parentId: 'content-area',
      dimensions: { width: 0, height: 0 }
    },
    onDrop: async (draggedItem, targetId) => {
      try {
        await onDrop(draggedItem.id, targetId);
      } catch (error) {
        console.error('Error during drop operation:', error);
      }
    }
  });

  // Handle drag start with callback
  const handleDragStart = React.useCallback(() => {
    // Provide haptic feedback for touch devices
    if (window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    onDragStart?.();
  }, [onDragStart]);

  // Handle drag end with callback
  const handleDragEnd = React.useCallback(() => {
    onDragEnd?.();
  }, [onDragEnd]);

  // Combine CSS classes
  const combinedClassName = React.useMemo(() => {
    return [
      'drag-handle',
      className,
      dropClassName,
      isDragging ? 'dragging' : ''
    ].filter(Boolean).join(' ');
  }, [className, dropClassName, isDragging]);

  return (
    <div
      ref={dragRef}
      className={combinedClassName}
      style={{ opacity }}
      role="button"
      tabIndex={0}
      aria-label={`Drag handle for ${block.type.toLowerCase()} block`}
      aria-grabbed={isDragging}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleDragStart();
        }
      }}
      data-testid={`drag-handle-${block.id}`}
    >
      <IconGripVertical
        size={24}
        stroke={1.5}
        className="drag-handle-icon"
        aria-hidden="true"
      />
    </div>
  );
});

// Display name for debugging
DragHandle.displayName = 'DragHandle';

export default DragHandle;