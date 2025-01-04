import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // v10.0.0
import classNames from 'classnames'; // v2.3.2
import FocusTrap from 'focus-trap-react'; // v10.1.4
import { ApiError } from '../../types/common';

/**
 * Props interface for the Modal component with comprehensive configuration options
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  zIndex?: number;
  animationConfig?: {
    initial?: object;
    animate?: object;
    exit?: object;
    transition?: object;
  };
}

/**
 * Default animation configuration for modal transitions
 */
const defaultAnimationConfig = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 }
};

/**
 * Size class mappings for modal dimensions
 */
const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

/**
 * A reusable modal component with accessibility features, animations, and error handling
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  ariaLabel,
  ariaDescribedBy,
  zIndex = 1000,
  animationConfig = defaultAnimationConfig
}) => {
  const previousFocus = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentId = useRef(`modal-content-${Math.random().toString(36).substr(2, 9)}`);

  // Store previously focused element before modal opens
  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      return () => {
        previousFocus.current?.focus();
      };
    }
  }, [isOpen]);

  // Handle escape key press
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }, [onClose]);

  // Add/remove escape key event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleEscapeKey]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Error boundary handler
  const handleError = (error: Error | ApiError) => {
    console.error('Modal error:', error);
    onClose();
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex }}
          role="presentation"
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
            onClick={handleOverlayClick}
            onTouchEnd={handleOverlayClick}
          />

          {/* Modal Content */}
          <FocusTrap>
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? contentId.current : undefined}
              aria-label={ariaLabel}
              aria-describedby={ariaDescribedBy}
              className={classNames(
                'relative w-full mx-4 bg-white rounded-lg shadow-xl',
                sizeClasses[size]
              )}
              {...animationConfig}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  {title && (
                    <h2 id={contentId.current} className="text-xl font-semibold text-gray-900">
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-label="Close modal"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="px-6 py-4">
                {children}
              </div>
            </motion.div>
          </FocusTrap>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;