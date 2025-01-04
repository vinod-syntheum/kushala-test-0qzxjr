import React, { useCallback, useEffect, useRef, useState } from 'react'; // v18.0.0
import classNames from 'classnames'; // v2.3.2
import { createPortal } from 'react-dom'; // v18.0.0
import { getViewportDimensions } from '../../utils/responsive';

// Interface for tooltip position calculation props
interface TooltipPositionProps {
  triggerRect: DOMRect;
  tooltipRect: DOMRect;
  position: TooltipProps['position'];
  offset: number;
}

// Main tooltip component props interface
export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  contentClassName?: string;
  delay?: number;
  disabled?: boolean;
  maxWidth?: number;
  offset?: number;
  zIndex?: number;
  animationDuration?: number;
  ariaLabel?: string;
  interactive?: boolean;
  onShow?: () => void;
  onHide?: () => void;
}

// Custom hook for calculating optimal tooltip position
const useTooltipPosition = ({
  triggerRect,
  tooltipRect,
  position = 'top',
  offset = 8
}: TooltipPositionProps) => {
  const { width: viewportWidth, height: viewportHeight } = getViewportDimensions();

  // Calculate initial position
  const getBasePosition = useCallback(() => {
    const positions = {
      top: {
        x: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
        y: triggerRect.top - tooltipRect.height - offset
      },
      right: {
        x: triggerRect.right + offset,
        y: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
      },
      bottom: {
        x: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
        y: triggerRect.bottom + offset
      },
      left: {
        x: triggerRect.left - tooltipRect.width - offset,
        y: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
      }
    };

    return positions[position];
  }, [triggerRect, tooltipRect, position, offset]);

  // Check viewport boundaries and adjust position
  const getFinalPosition = useCallback(() => {
    const basePosition = getBasePosition();
    let finalPosition = { ...basePosition };
    let finalPlacement = position;

    // Horizontal bounds check
    if (basePosition.x < 0) {
      finalPosition.x = Math.max(offset, basePosition.x);
    } else if (basePosition.x + tooltipRect.width > viewportWidth) {
      finalPosition.x = Math.min(
        viewportWidth - tooltipRect.width - offset,
        basePosition.x
      );
    }

    // Vertical bounds check
    if (basePosition.y < 0) {
      if (position === 'top') {
        finalPosition = getBasePosition();
        finalPlacement = 'bottom';
      }
      finalPosition.y = Math.max(offset, basePosition.y);
    } else if (basePosition.y + tooltipRect.height > viewportHeight) {
      if (position === 'bottom') {
        finalPosition = getBasePosition();
        finalPlacement = 'top';
      }
      finalPosition.y = Math.min(
        viewportHeight - tooltipRect.height - offset,
        basePosition.y
      );
    }

    return { position: finalPosition, placement: finalPlacement };
  }, [getBasePosition, position, tooltipRect, viewportWidth, viewportHeight, offset]);

  return getFinalPosition();
};

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  className = '',
  contentClassName = '',
  delay = 200,
  disabled = false,
  maxWidth = 300,
  offset = 8,
  zIndex = 50,
  animationDuration = 200,
  ariaLabel,
  interactive = false,
  onShow,
  onHide
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [placement, setPlacement] = useState(position);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate and update tooltip position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const { position: newPosition, placement: newPlacement } = useTooltipPosition({
      triggerRect,
      tooltipRect,
      position,
      offset
    });

    setTooltipPosition(newPosition);
    setPlacement(newPlacement);
  }, [position, offset]);

  // Event handlers
  const handleShow = useCallback(() => {
    clearTimeout(hideTimeoutRef.current);
    if (!disabled) {
      showTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        onShow?.();
        // Update position after visibility change
        requestAnimationFrame(updatePosition);
      }, delay);
    }
  }, [disabled, delay, onShow, updatePosition]);

  const handleHide = useCallback(() => {
    clearTimeout(showTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      onHide?.();
    }, delay);
  }, [delay, onHide]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isVisible) {
      setIsVisible(false);
      onHide?.();
    }
  }, [isVisible, onHide]);

  // Setup event listeners and cleanup
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      clearTimeout(showTimeoutRef.current);
      clearTimeout(hideTimeoutRef.current);
    };
  }, [handleKeyDown, updatePosition]);

  // Update position when content changes
  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [content, isVisible, updatePosition]);

  // Render tooltip content through portal
  const renderTooltip = () => {
    if (!isVisible) return null;

    const tooltipStyles: React.CSSProperties = {
      position: 'fixed',
      left: tooltipPosition.x,
      top: tooltipPosition.y,
      maxWidth,
      zIndex,
      transition: `all ${animationDuration}ms ease-in-out`
    };

    return createPortal(
      <div
        ref={tooltipRef}
        role="tooltip"
        aria-label={ariaLabel}
        className={classNames(
          'absolute px-2 py-1 text-sm bg-gray-900 text-white rounded shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          {
            'cursor-pointer select-none': interactive,
            'border-2 border-white dark:border-gray-800': true,
            'mb-2 transform -translate-y-1': placement === 'top',
            'ml-2 transform translate-x-1': placement === 'right',
            'mt-2 transform translate-y-1': placement === 'bottom',
            'mr-2 transform -translate-x-1': placement === 'left'
          },
          contentClassName
        )}
        style={tooltipStyles}
        onMouseEnter={interactive ? handleShow : undefined}
        onMouseLeave={interactive ? handleHide : undefined}
      >
        {content}
      </div>,
      document.body
    );
  };

  return (
    <div
      ref={triggerRef}
      className={classNames('inline-block', className)}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
      tabIndex={disabled ? undefined : 0}
      aria-describedby={isVisible ? 'tooltip' : undefined}
    >
      {children}
      {renderTooltip()}
    </div>
  );
};