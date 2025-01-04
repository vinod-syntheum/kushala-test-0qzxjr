import { useState, useCallback, useEffect, ReactNode } from 'react'; // v18.2.0
import { ApiError } from '../types/common';

/**
 * Interface defining the modal state structure with enhanced error handling
 */
interface ModalState {
  isOpen: boolean;
  content: ReactNode;
  error: ApiError | null;
}

/**
 * Interface defining the return type of useModal hook with comprehensive modal controls
 */
interface UseModalReturn {
  isOpen: boolean;
  modalContent: ReactNode;
  error: ApiError | null;
  openModal: (content?: ReactNode) => void;
  closeModal: () => void;
  setModalContent: (content: ReactNode) => void;
  setModalError: (error: ApiError | null) => void;
}

/**
 * Custom hook for managing modal state and handlers with error handling support.
 * Provides comprehensive modal management functionality with accessibility features.
 * 
 * @param initialState - Optional initial content for the modal
 * @param defaultIsOpen - Optional flag to set initial visibility state
 * @returns Object containing modal state and control functions
 */
export const useModal = (
  initialState?: ReactNode,
  defaultIsOpen = false
): UseModalReturn => {
  // Initialize modal state
  const [isOpen, setIsOpen] = useState<boolean>(defaultIsOpen);
  const [modalContent, setContent] = useState<ReactNode>(initialState || null);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Opens the modal with optional new content
   */
  const openModal = useCallback((content?: ReactNode) => {
    if (content) {
      setContent(content);
    }
    setIsOpen(true);
    // Prevent background scrolling when modal is open
    document.body.style.overflow = 'hidden';
  }, []);

  /**
   * Closes the modal and resets error state
   */
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setError(null);
    // Restore background scrolling when modal is closed
    document.body.style.overflow = 'unset';
  }, []);

  /**
   * Updates modal content
   */
  const setModalContent = useCallback((content: ReactNode) => {
    setContent(content);
  }, []);

  /**
   * Updates modal error state
   */
  const setModalError = useCallback((error: ApiError | null) => {
    setError(error);
  }, []);

  /**
   * Handle escape key press to close modal
   */
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, closeModal]);

  /**
   * Focus trap management for accessibility
   */
  useEffect(() => {
    if (!isOpen) return;

    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return;

    // Store last focused element
    const lastFocusedElement = document.activeElement as HTMLElement;
    
    // Focus first focusable element in modal
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length) {
      (focusableElements[0] as HTMLElement).focus();
    }

    return () => {
      // Restore focus when modal closes
      if (lastFocusedElement) {
        lastFocusedElement.focus();
      }
    };
  }, [isOpen]);

  /**
   * Cleanup effect
   */
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return {
    isOpen,
    modalContent,
    error,
    openModal,
    closeModal,
    setModalContent,
    setModalError
  };
};