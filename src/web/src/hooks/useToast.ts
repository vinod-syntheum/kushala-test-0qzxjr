import React, { useCallback, useState, useEffect, useRef } from 'react';
import { AlertProps } from '../components/common/Alert';

// Constants for toast configuration
const DEFAULT_DURATION = 3000;
const ANIMATION_DURATION = 300;
const Z_INDEX_BASE = 1000;
const TOUCH_THRESHOLD = 50;

export interface ToastOptions {
  variant: AlertProps['type'];
  message: string;
  duration?: number;
  dismissible?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  zIndex?: number;
  ariaLive?: 'polite' | 'assertive';
}

interface ToastState {
  visible: boolean;
  options: ToastOptions;
  queue: ToastOptions[];
  isPaused: boolean;
  animationState: 'entering' | 'entered' | 'exiting' | 'exited';
}

const defaultOptions: ToastOptions = {
  variant: 'info',
  message: '',
  duration: DEFAULT_DURATION,
  dismissible: true,
  position: 'top-right',
  zIndex: Z_INDEX_BASE,
  ariaLive: 'polite',
};

export function useToast() {
  const [state, setState] = useState<ToastState>({
    visible: false,
    options: defaultOptions,
    queue: [],
    isPaused: false,
    animationState: 'exited',
  });

  const timerRef = useRef<number>();
  const animationFrameRef = useRef<number>();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const processQueue = useCallback(() => {
    setState(prevState => {
      if (prevState.queue.length === 0) return prevState;

      const [nextToast, ...remainingQueue] = prevState.queue;
      return {
        ...prevState,
        visible: true,
        options: { ...defaultOptions, ...nextToast },
        queue: remainingQueue,
        animationState: 'entering',
      };
    });
  }, []);

  const hide = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      animationState: 'exiting',
    }));

    timerRef.current = window.setTimeout(() => {
      setState(prevState => ({
        ...prevState,
        visible: false,
        animationState: 'exited',
      }));

      animationFrameRef.current = window.requestAnimationFrame(() => {
        processQueue();
      });
    }, ANIMATION_DURATION);
  }, [processQueue]);

  const show = useCallback((options: ToastOptions) => {
    setState(prevState => {
      const newOptions = { ...defaultOptions, ...options };
      
      if (!prevState.visible) {
        return {
          ...prevState,
          visible: true,
          options: newOptions,
          animationState: 'entering',
        };
      }

      return {
        ...prevState,
        queue: [...prevState.queue, newOptions],
      };
    });
  }, []);

  const pause = useCallback(() => {
    setState(prevState => ({ ...prevState, isPaused: true }));
    clearTimers();
  }, [clearTimers]);

  const resume = useCallback(() => {
    setState(prevState => {
      if (!prevState.isPaused) return prevState;

      const duration = prevState.options.duration || DEFAULT_DURATION;
      timerRef.current = window.setTimeout(hide, duration);

      return { ...prevState, isPaused: false };
    });
  }, [hide]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    touchStartRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchStartRef.current) return;

    const deltaX = event.touches[0].clientX - touchStartRef.current.x;
    const deltaY = event.touches[0].clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > TOUCH_THRESHOLD) {
      hide();
      touchStartRef.current = null;
    } else if (Math.abs(deltaY) > TOUCH_THRESHOLD) {
      pause();
    }
  }, [hide, pause]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    resume();
  }, [resume]);

  useEffect(() => {
    if (state.visible && !state.isPaused && state.animationState === 'entered') {
      const duration = state.options.duration || DEFAULT_DURATION;
      timerRef.current = window.setTimeout(hide, duration);
    }

    return clearTimers;
  }, [state.visible, state.isPaused, state.animationState, state.options.duration, hide, clearTimers]);

  useEffect(() => {
    if (state.animationState === 'entering') {
      timerRef.current = window.setTimeout(() => {
        setState(prevState => ({ ...prevState, animationState: 'entered' }));
      }, ANIMATION_DURATION);
    }
  }, [state.animationState]);

  useEffect(() => {
    const toastElement = document.getElementById('toast-container');
    if (toastElement) {
      toastElement.addEventListener('touchstart', handleTouchStart);
      toastElement.addEventListener('touchmove', handleTouchMove);
      toastElement.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (toastElement) {
        toastElement.removeEventListener('touchstart', handleTouchStart);
        toastElement.removeEventListener('touchmove', handleTouchMove);
        toastElement.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    return () => {
      clearTimers();
      setState(prevState => ({
        ...prevState,
        visible: false,
        queue: [],
        animationState: 'exited',
      }));
    };
  }, [clearTimers]);

  return {
    show,
    hide,
    pause,
    resume,
    visible: state.visible,
    options: state.options,
    animationState: state.animationState,
  };
}