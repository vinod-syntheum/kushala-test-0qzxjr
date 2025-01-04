// External imports with versions
import { useRef, useMemo, useCallback } from 'react'; // v18.2.0
import { useDrag, useDrop } from 'react-dnd'; // v16.0.1
import { getEmptyImage } from 'react-dnd-html5-backend'; // v16.0.1

// Interface definitions
interface DragItem {
  id: string;
  type: string;
  index: number;
  parentId: string;
  dimensions: {
    width: number;
    height: number;
  };
}

interface UseDragAndDropOptions {
  type: string;
  item?: DragItem;
  onDrop?: (item: DragItem, dropZoneId: string) => void;
  canDrop?: (item: DragItem) => boolean;
  collect?: (monitor: any) => any; // DragSourceMonitor type from react-dnd
}

interface DragCollectedProps {
  isDragging: boolean;
  opacity: number;
}

interface DropCollectedProps {
  isOver: boolean;
  canDrop: boolean;
}

/**
 * Custom hook providing enterprise-grade drag and drop functionality with visual feedback
 * and performance optimizations for the website builder interface.
 * 
 * @param options - Configuration options for drag and drop behavior
 * @returns Object containing drag and drop refs, state, and visual feedback properties
 */
export const useDragAndDrop = ({
  type,
  item,
  onDrop,
  canDrop: canDropProp,
  collect: collectProp,
}: UseDragAndDropOptions) => {
  // Initialize refs for drag source, drop target, and preview
  const dragRef = useRef<HTMLElement>(null);
  const dropRef = useRef<HTMLElement>(null);
  const dragPreview = useRef<HTMLElement>(null);

  // Memoize the drag collection configuration
  const dragCollect = useMemo(() => (
    (monitor: any) => ({
      isDragging: monitor.isDragging(),
      opacity: monitor.isDragging() ? 0.5 : 1,
      ...collectProp?.(monitor),
    })
  ), [collectProp]);

  // Position calculation for accurate dropping
  const calculateDropPosition = useCallback((monitor: any, component: HTMLElement) => {
    const hoverBoundingRect = component.getBoundingClientRect();
    const clientOffset = monitor.getClientOffset();

    return {
      x: clientOffset.x - hoverBoundingRect.left,
      y: clientOffset.y - hoverBoundingRect.top,
    };
  }, []);

  // Configure drag behavior with performance optimizations
  const [{ isDragging, opacity }, drag, preview] = useDrag({
    type,
    item: () => ({
      ...item,
      dimensions: {
        width: dragRef.current?.offsetWidth || 0,
        height: dragRef.current?.offsetHeight || 0,
      },
    }),
    collect: dragCollect,
    end: (draggedItem: DragItem | null, monitor) => {
      const dropResult = monitor.getDropResult();
      if (draggedItem && dropResult && onDrop) {
        onDrop(draggedItem, dropResult.dropZoneId);
      }
    },
  });

  // Configure drop behavior with position detection
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: type,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: canDropProp ? canDropProp(monitor.getItem()) : monitor.canDrop(),
    }),
    hover: (hoveredItem: DragItem, monitor) => {
      if (!dropRef.current) return;

      const position = calculateDropPosition(monitor, dropRef.current);
      // Store position data for potential use in drop handling
      (hoveredItem as any).dropPosition = position;
    },
    drop: (droppedItem: DragItem, monitor) => {
      if (!dropRef.current) return;

      return {
        dropZoneId: dropRef.current.id,
        position: calculateDropPosition(monitor, dropRef.current),
      };
    },
  });

  // Set up composite refs for drag and drop
  const compositeDropRef = useCallback(
    (element: HTMLElement | null) => {
      drop(element);
      dropRef.current = element;
    },
    [drop]
  );

  const compositeDragRef = useCallback(
    (element: HTMLElement | null) => {
      drag(element);
      dragRef.current = element;
    },
    [drag]
  );

  // Initialize custom drag preview
  useMemo(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  // Calculate drop zone highlight class
  const dropClassName = useMemo(() => {
    if (isOver && canDrop) return 'drop-zone-active';
    if (canDrop) return 'drop-zone-valid';
    return '';
  }, [isOver, canDrop]);

  return {
    dragRef: compositeDragRef,
    dropRef: compositeDropRef,
    isDragging,
    isOver,
    canDrop,
    opacity,
    dropClassName,
    dragPreview,
  };
};

// Type exports for consuming components
export type { DragItem, UseDragAndDropOptions };