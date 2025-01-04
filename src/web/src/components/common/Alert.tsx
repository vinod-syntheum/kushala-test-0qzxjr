import React, { useEffect, useRef, forwardRef } from 'react';
import classNames from 'classnames';
import { ErrorResponse } from '../../types/common';

// Icons for different alert types
const CheckCircleIcon: React.FC = () => (
  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const XCircleIcon: React.FC = () => (
  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const ExclamationIcon: React.FC = () => (
  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const InformationIcon: React.FC = () => (
  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  className?: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  role?: 'alert' | 'status';
  testId?: string;
}

const getAlertIcon = (type: AlertProps['type']): JSX.Element => {
  switch (type) {
    case 'success':
      return <CheckCircleIcon />;
    case 'error':
      return <XCircleIcon />;
    case 'warning':
      return <ExclamationIcon />;
    case 'info':
      return <InformationIcon />;
  }
};

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      type,
      message,
      className,
      onClose,
      autoClose = false,
      duration = 5000,
      role = 'alert',
      testId = 'alert',
    },
    ref
  ) => {
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
      if (autoClose && onClose) {
        timeoutRef.current = setTimeout(() => {
          onClose();
        }, duration);
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [autoClose, duration, onClose]);

    const baseClasses = 'rounded-md p-4 mb-4 flex items-center justify-between transition-all duration-300 ease-in-out focus:outline-none focus:ring-2';
    
    const variantClasses = {
      success: 'bg-green-50 text-green-800 border border-green-200 focus:ring-green-500',
      error: 'bg-red-50 text-red-800 border border-red-200 focus:ring-red-500',
      warning: 'bg-yellow-50 text-yellow-800 border border-yellow-200 focus:ring-yellow-500',
      info: 'bg-blue-50 text-blue-800 border border-blue-200 focus:ring-blue-500',
    };

    const alertClasses = classNames(
      baseClasses,
      variantClasses[type],
      'animate-fade-in duration-200',
      className
    );

    return (
      <div
        ref={ref}
        role={role}
        className={alertClasses}
        data-testid={testId}
        data-type={type}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">{getAlertIcon(type)}</div>
          <div className="ml-3">
            <p className="text-sm font-medium">{message}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            className={classNames(
              'ml-4 inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2',
              {
                'text-green-500 hover:bg-green-100 focus:ring-green-600': type === 'success',
                'text-red-500 hover:bg-red-100 focus:ring-red-600': type === 'error',
                'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600': type === 'warning',
                'text-blue-500 hover:bg-blue-100 focus:ring-blue-600': type === 'info',
              }
            )}
            onClick={onClose}
            aria-label="Close alert"
          >
            <span className="sr-only">Close</span>
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert;