import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { ValidationError } from '../../types/common';

// Base styling classes following design system specifications
const BASE_INPUT_CLASSES = 'w-full px-4 py-2 text-gray-900 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200';
const ERROR_INPUT_CLASSES = 'border-red-500 focus:ring-red-500 focus:border-red-500 pr-10';
const DISABLED_INPUT_CLASSES = 'bg-gray-100 cursor-not-allowed opacity-75';
const VALID_INPUT_CLASSES = 'border-green-500 focus:ring-green-500 focus:border-green-500 pr-10';
const LABEL_CLASSES = 'block text-sm font-medium text-gray-700 mb-1';
const ERROR_TEXT_CLASSES = 'mt-1 text-sm text-red-600';
const HELPER_TEXT_CLASSES = 'mt-1 text-sm text-gray-500';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Unique identifier for the input */
  id: string;
  /** Input name attribute */
  name: string;
  /** Input type (text, email, password, etc.) */
  type: string;
  /** Current input value */
  value: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is required */
  required?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Change event handler */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Blur event handler */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Additional CSS classes */
  className?: string;
  /** Label text */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Aria label for accessibility */
  'aria-label'?: string;
  /** Aria describedby for accessibility */
  'aria-describedby'?: string;
}

/**
 * A reusable form input component that implements the design system specifications
 * with comprehensive validation states and accessibility support.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    id,
    name,
    type,
    value,
    placeholder,
    required = false,
    disabled = false,
    error,
    onChange,
    onBlur,
    className,
    label,
    helperText,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...restProps
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  // Combine base classes with state-based classes
  const inputClasses = classNames(
    BASE_INPUT_CLASSES,
    {
      [ERROR_INPUT_CLASSES]: error,
      [DISABLED_INPUT_CLASSES]: disabled,
      [VALID_INPUT_CLASSES]: !error && value && required,
    },
    className
  );

  // Set up accessibility attributes
  const ariaProps = {
    'aria-invalid': error ? 'true' : 'false',
    'aria-required': required ? 'true' : 'false',
    'aria-label': ariaLabel,
    'aria-describedby': classNames(
      error ? errorId : null,
      helperText ? helperId : null,
      ariaDescribedBy
    ),
  };

  // Focus management
  useEffect(() => {
    if (error && inputRef.current) {
      inputRef.current.focus();
    }
  }, [error]);

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className={LABEL_CLASSES}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref || inputRef}
          id={id}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onChange={onChange}
          onBlur={onBlur}
          className={inputClasses}
          {...ariaProps}
          {...restProps}
        />
        
        {/* Validation state icons */}
        {error && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className="h-5 w-5 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
        
        {!error && value && required && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className="h-5 w-5 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className={ERROR_TEXT_CLASSES} id={errorId} role="alert">
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p className={HELPER_TEXT_CLASSES} id={helperId}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default React.memo(Input);