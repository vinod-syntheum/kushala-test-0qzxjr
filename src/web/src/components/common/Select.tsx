import React, { forwardRef, FocusEvent } from 'react';
import classNames from 'classnames'; // v2.3.2
import { ValidationError } from '../../types/common';

/**
 * Interface defining the structure of select options
 */
export interface Option {
  value: string;
  label: string;
}

/**
 * Props interface for the Select component defining all available configuration options
 */
export interface SelectProps {
  /** Unique identifier for the select element */
  id: string;
  /** Name attribute for form integration */
  name: string;
  /** Label text to display above the select */
  label: string;
  /** Current selected value */
  value: string;
  /** Array of available options */
  options: Option[];
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Validation error message or object */
  error?: ValidationError | string;
  /** Change handler for value updates */
  onChange: (value: string) => void;
  /** Blur handler for form validation */
  onBlur?: (event: FocusEvent<HTMLSelectElement>) => void;
}

/**
 * A form-integrated select component with support for validation states,
 * accessibility, and ref forwarding
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      id,
      name,
      label,
      value,
      options,
      required = false,
      disabled = false,
      error,
      onChange,
      onBlur
    },
    ref
  ) => {
    // Generate unique IDs for accessibility
    const errorId = `${id}-error`;
    const labelId = `${id}-label`;

    // Determine if there's an error and get the message
    const hasError = !!error;
    const errorMessage = typeof error === 'string' ? error : error?.message;

    // Generate class names based on component state
    const selectClasses = classNames(
      'w-full',
      'px-3',
      'py-2',
      'border',
      'rounded-md',
      'shadow-sm',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      {
        'border-gray-300 focus:border-blue-500 focus:ring-blue-500': !hasError,
        'border-red-300 focus:border-red-500 focus:ring-red-500': hasError,
        'bg-gray-50 cursor-not-allowed': disabled,
      }
    );

    const labelClasses = classNames(
      'block',
      'text-sm',
      'font-medium',
      'mb-1',
      {
        'text-gray-700': !hasError,
        'text-red-600': hasError,
      }
    );

    // Handle value change
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(event.target.value);
    };

    return (
      <div className="w-full">
        <label
          htmlFor={id}
          id={labelId}
          className={labelClasses}
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>

        <select
          ref={ref}
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          aria-labelledby={labelId}
          className={selectClasses}
        >
          <option value="" disabled>
            Select an option
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {hasError && (
          <p
            id={errorId}
            className="mt-1 text-sm text-red-600"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

// Set display name for debugging
Select.displayName = 'Select';

export default Select;