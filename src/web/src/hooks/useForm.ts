/**
 * Enhanced React hook for secure form management with comprehensive validation and accessibility support.
 * Implements form validation states, error handling, and XSS prevention.
 * @version 1.0.0
 */

import { useState, useCallback, useRef } from 'react'; // v18.0.0
import { debounce } from 'lodash'; // v4.17.21
import xss from 'xss'; // v1.0.14
import { ValidationError } from '../types/common';
import { validateEmail, validatePassword } from '../utils/validation';

/**
 * Configuration options for form validation behavior
 */
interface ValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

/**
 * Security configuration for form input handling
 */
interface SecurityOptions {
  enableXssPrevention?: boolean;
  maxFieldLength?: number;
  allowedTags?: string[];
}

/**
 * Props for the useForm hook
 */
interface UseFormProps<T extends Record<string, any>> {
  initialValues: T;
  validateFn?: (values: T) => ValidationError[];
  onSubmit: (values: T) => Promise<void>;
  validationOptions?: ValidationOptions;
  securityOptions?: SecurityOptions;
}

/**
 * Return type for the useForm hook
 */
interface UseFormReturn<T> {
  values: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  handleChange: (field: keyof T, value: any) => void;
  handleBlur: (field: keyof T) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  setFieldValue: (field: keyof T, value: any) => void;
  validateField: (field: keyof T) => Promise<ValidationError[]>;
  validateForm: () => Promise<ValidationError[]>;
}

/**
 * Enhanced form management hook with security, validation, and accessibility features
 */
export function useForm<T extends Record<string, any>>({
  initialValues,
  validateFn,
  onSubmit,
  validationOptions = {
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 300
  },
  securityOptions = {
    enableXssPrevention: true,
    maxFieldLength: 1000,
    allowedTags: []
  }
}: UseFormProps<T>): UseFormReturn<T> {
  // Form state
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const initialRender = useRef(true);

  /**
   * Sanitize input value based on security options
   */
  const sanitizeValue = useCallback((value: any): any => {
    if (!securityOptions.enableXssPrevention || typeof value !== 'string') {
      return value;
    }

    return xss(value.slice(0, securityOptions.maxFieldLength), {
      whiteList: securityOptions.allowedTags?.reduce((acc, tag) => ({
        ...acc,
        [tag]: []
      }), {}),
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
  }, [securityOptions]);

  /**
   * Validate a specific field with built-in and custom validation
   */
  const validateField = useCallback(async (field: keyof T): Promise<ValidationError[]> => {
    const value = values[field];
    const fieldErrors: ValidationError[] = [];

    // Built-in validation for common fields
    if (field === 'email' && typeof value === 'string') {
      fieldErrors.push(...validateEmail(value));
    }
    if (field === 'password' && typeof value === 'string') {
      fieldErrors.push(...validatePassword(value));
    }

    // Custom validation
    if (validateFn) {
      const customErrors = validateFn(values).filter(error => error.field === String(field));
      fieldErrors.push(...customErrors);
    }

    return fieldErrors;
  }, [values, validateFn]);

  /**
   * Debounced validation function
   */
  const debouncedValidation = useRef(
    debounce(async (field: keyof T) => {
      const fieldErrors = await validateField(field);
      setErrors(prev => [...prev.filter(e => e.field !== String(field)), ...fieldErrors]);
    }, validationOptions.debounceMs)
  ).current;

  /**
   * Handle form field changes with validation and sanitization
   */
  const handleChange = useCallback((field: keyof T, value: any) => {
    const sanitizedValue = sanitizeValue(value);
    setValues(prev => ({ ...prev, [field]: sanitizedValue }));
    setIsDirty(true);

    if (validationOptions.validateOnChange) {
      debouncedValidation(field);
    }
  }, [sanitizeValue, validationOptions.validateOnChange, debouncedValidation]);

  /**
   * Handle field blur events with validation
   */
  const handleBlur = useCallback(async (field: keyof T) => {
    if (validationOptions.validateOnBlur) {
      const fieldErrors = await validateField(field);
      setErrors(prev => [...prev.filter(e => e.field !== String(field)), ...fieldErrors]);
    }
  }, [validateField, validationOptions.validateOnBlur]);

  /**
   * Validate entire form
   */
  const validateForm = useCallback(async (): Promise<ValidationError[]> => {
    const formErrors: ValidationError[] = [];
    
    // Validate all fields
    for (const field of Object.keys(values)) {
      const fieldErrors = await validateField(field as keyof T);
      formErrors.push(...fieldErrors);
    }

    setErrors(formErrors);
    return formErrors;
  }, [values, validateField]);

  /**
   * Handle form submission with validation
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formErrors = await validateForm();
      if (formErrors.length === 0) {
        await onSubmit(values);
        setIsDirty(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, onSubmit]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors([]);
    setIsDirty(false);
    setIsSubmitting(false);
  }, [initialValues]);

  /**
   * Set field value directly
   */
  const setFieldValue = useCallback((field: keyof T, value: any) => {
    const sanitizedValue = sanitizeValue(value);
    setValues(prev => ({ ...prev, [field]: sanitizedValue }));
    setIsDirty(true);
  }, [sanitizeValue]);

  // Validate form on initial render if needed
  if (initialRender.current && validateFn) {
    initialRender.current = false;
    const initialErrors = validateFn(values);
    if (initialErrors.length > 0) {
      setErrors(initialErrors);
    }
  }

  return {
    values,
    errors,
    isSubmitting,
    isDirty,
    isValid: errors.length === 0,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    validateField,
    validateForm
  };
}