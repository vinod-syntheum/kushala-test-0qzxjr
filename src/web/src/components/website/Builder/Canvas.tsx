import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'; // v18.2.0
import classNames from 'classnames'; // v2.3.2
import { debounce } from 'lodash'; // v4.17.21

import DropZone from './DropZone';
import { useWebsiteBuilder } from '../../../hooks/useWebsiteBuilder';
import { ContentBlock, ContentBlockType, DeviceType } from '../../../types/website';

interface CanvasProps {
  scale: number;
  previewMode: boolean;
  deviceType: DeviceType;
}

const Canvas: React.FC<CanvasProps> = ({ scale, previewMode, deviceType }) => {
  // Refs for canvas measurements and scroll handling
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Local state for canvas interactions
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Get website builder state and operations
  const {
    blocks,
    addBlock,
    moveBlock,
    selectBlock,
    updateBlock,
    undo,
    redo
  } = useWebsiteBuilder();

  // Calculate canvas dimensions based on device type
  const canvasDimensions = useMemo(() => {
    switch (deviceType) {
      case 'MOBILE':
        return { width: 375, height: '100%' };
      case 'TABLET':
        return { width: 768, height: '100%' };
      default:
        return { width: 1280, height: '100%' };
    }
  }, [deviceType]);

  // Handle block dropping with position calculation
  const handleDrop = useCallback((
    item: { type: ContentBlockType; id?: string; content?: Record<string, any> },
    zoneId: string,
    position: { x: number; y: number }
  ) => {
    const dropIndex = parseInt(zoneId.split('-')[1], 10);
    const scaledPosition = {
      x: position.x / scale,
      y: position.y / scale
    };

    if (item.id) {
      // Move existing block
      const sourceIndex = blocks.findIndex(block => block.id === item.id);
      if (sourceIndex !== -1) {
        moveBlock(sourceIndex, dropIndex);
      }
    } else {
      // Add new block
      addBlock(item.type, dropIndex);
    }

    setDropTarget(null);
    setIsDraggingOver(false);
  }, [scale, blocks, moveBlock, addBlock]);

  // Handle scroll position updates
  const handleScroll = useCallback(debounce((event: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(event.currentTarget.scrollTop);
  }, 16), []); // 60fps throttle

  // Apply device-specific styles to blocks
  const getBlockStyles = useCallback((block: ContentBlock) => {
    switch (deviceType) {
      case 'MOBILE':
        return block.mobileStyles;
      case 'TABLET':
        return block.tabletStyles;
      default:
        return block.styles;
    }
  }, [deviceType]);

  // Render blocks with virtualization for performance
  const renderBlocks = useMemo(() => {
    return blocks.map((block, index) => {
      const blockStyles = getBlockStyles(block);
      const isVisible = block.isVisible;

      return (
        <React.Fragment key={block.id}>
          <DropZone
            id={`zone-${index}`}
            index={index}
            onDrop={(item, position) => handleDrop(item, `zone-${index}`, position)}
            isHighlighted={dropTarget === `zone-${index}`}
          />
          {isVisible && (
            <div
              className={classNames('canvas-block', {
                'canvas-block--preview': previewMode,
                'canvas-block--selected': !previewMode && block.id === selectBlock
              })}
              style={{
                ...blockStyles,
                transform: `scale(${scale})`,
                transformOrigin: 'top left'
              }}
              onClick={() => !previewMode && selectBlock(block.id)}
              role="region"
              aria-label={`${block.type} content block`}
            >
              {/* Block content rendering would be handled by a separate BlockRenderer component */}
              {block.content && JSON.stringify(block.content)}
            </div>
          )}
        </React.Fragment>
      );
    });
  }, [blocks, scale, previewMode, deviceType, dropTarget, handleDrop, selectBlock, getBlockStyles]);

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [undo, redo]);

  return (
    <div
      ref={canvasRef}
      className={classNames('canvas-container', {
        'canvas-container--preview': previewMode,
        [`canvas-container--${deviceType.toLowerCase()}`]: true
      })}
      style={{
        width: canvasDimensions.width,
        height: canvasDimensions.height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }}
      role="main"
      aria-label="Website builder canvas"
    >
      <div
        ref={scrollRef}
        className="canvas-scroll-container"
        onScroll={handleScroll}
      >
        {renderBlocks}
        <DropZone
          id={`zone-${blocks.length}`}
          index={blocks.length}
          onDrop={(item, position) => handleDrop(item, `zone-${blocks.length}`, position)}
          isHighlighted={dropTarget === `zone-${blocks.length}`}
        />
      </div>
    </div>
  );
};

export default Canvas;