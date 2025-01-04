import React, { useCallback, useEffect } from 'react';
import classNames from 'classnames'; // v2.3.2
import xss from 'xss'; // v1.0.14
import { useDebouncedCallback } from 'use-debounce'; // v9.0.0
import Input from '../common/Input';
import { useForm } from '../../hooks/useForm';
import { ValidationError } from '../../types/common';

// Ticket type enumeration
export enum TicketType {
  GENERAL = 'GENERAL',
  VIP = 'VIP',
  EARLY_BIRD = 'EARLY_BIRD'
}

// Ticket form validation constants
const VALIDATION_RULES = {
  price: { min: 0.01, max: 10000 },
  quantity: { min: 1, max: 10000 },
  description: { minLength: 10, maxLength: 500 }
};

// Ticket type options with descriptions
const TICKET_TYPE_OPTIONS = [
  { value: TicketType.GENERAL, label: 'General Admission', description: 'Standard entry ticket' },
  { value: TicketType.VIP, label: 'VIP Access', description: 'Premium experience with added benefits' },
  { value: TicketType.EARLY_BIRD, label: 'Early Bird', description: 'Limited time discounted tickets' }
];

// Form interfaces
export interface TicketFormValues {
  type: TicketType;
  price: number;
  quantity: number;
  description: string;
  isAvailable: boolean;
  saleStartDate: Date;
  saleEndDate: Date;
}

export interface TicketFormProps {
  eventId: string;
  onSubmit: (values: TicketFormValues) => Promise<void>;
  initialValues?: Partial<TicketFormValues>;
  isSubmitting?: boolean;
  onValidationError?: (errors: ValidationError[]) => void;
}

// Default form values
const defaultValues: TicketFormValues = {
  type: TicketType.GENERAL,
  price: 0,
  quantity: 1,
  description: '',
  isAvailable: true,
  saleStartDate: new Date(),
  saleEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
};

// Form validation function
const validateTicketForm = (values: TicketFormValues): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Sanitize description
  const sanitizedDescription = xss(values.description, { whiteList: {} });

  // Validate ticket type
  if (!Object.values(TicketType).includes(values.type)) {
    errors.push({
      field: 'type',
      message: 'Please select a valid ticket type',
      code: 'INVALID_TICKET_TYPE'
    });
  }

  // Validate price
  if (values.price < VALIDATION_RULES.price.min || values.price > VALIDATION_RULES.price.max) {
    errors.push({
      field: 'price',
      message: `Price must be between $${VALIDATION_RULES.price.min} and $${VALIDATION_RULES.price.max}`,
      code: 'INVALID_PRICE'
    });
  }

  // Validate quantity
  if (values.quantity < VALIDATION_RULES.quantity.min || values.quantity > VALIDATION_RULES.quantity.max) {
    errors.push({
      field: 'quantity',
      message: `Quantity must be between ${VALIDATION_RULES.quantity.min} and ${VALIDATION_RULES.quantity.max}`,
      code: 'INVALID_QUANTITY'
    });
  }

  // Validate description
  if (sanitizedDescription.length < VALIDATION_RULES.description.minLength) {
    errors.push({
      field: 'description',
      message: `Description must be at least ${VALIDATION_RULES.description.minLength} characters`,
      code: 'DESCRIPTION_TOO_SHORT'
    });
  }

  if (sanitizedDescription.length > VALIDATION_RULES.description.maxLength) {
    errors.push({
      field: 'description',
      message: `Description cannot exceed ${VALIDATION_RULES.description.maxLength} characters`,
      code: 'DESCRIPTION_TOO_LONG'
    });
  }

  // Validate dates
  if (values.saleEndDate <= values.saleStartDate) {
    errors.push({
      field: 'saleEndDate',
      message: 'Sale end date must be after start date',
      code: 'INVALID_DATE_RANGE'
    });
  }

  return errors;
};

export const TicketForm: React.FC<TicketFormProps> = ({
  eventId,
  onSubmit,
  initialValues = {},
  isSubmitting = false,
  onValidationError
}) => {
  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    validateField,
    setFieldValue
  } = useForm<TicketFormValues>({
    initialValues: { ...defaultValues, ...initialValues },
    validateFn: validateTicketForm,
    onSubmit,
    validationOptions: {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 300
    },
    securityOptions: {
      enableXssPrevention: true,
      maxFieldLength: VALIDATION_RULES.description.maxLength,
      allowedTags: []
    }
  });

  // Debounced validation callback
  const debouncedValidation = useDebouncedCallback(
    async () => {
      const formErrors = await validateTicketForm(values);
      if (onValidationError) {
        onValidationError(formErrors);
      }
    },
    300
  );

  // Effect to trigger validation on value changes
  useEffect(() => {
    debouncedValidation();
  }, [values, debouncedValidation]);

  // Price formatter for currency input
  const formatPrice = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      noValidate
      aria-label="Ticket configuration form"
    >
      {/* Ticket Type Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Ticket Type
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="ticketType"
          name="type"
          value={values.type}
          onChange={(e) => handleChange('type', e.target.value as TicketType)}
          className={classNames(
            'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500',
            { 'border-red-500': errors.some(e => e.field === 'type') }
          )}
          aria-invalid={errors.some(e => e.field === 'type')}
          required
        >
          {TICKET_TYPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Price Input */}
      <Input
        id="price"
        name="price"
        type="number"
        label="Price"
        value={values.price.toString()}
        onChange={(e) => handleChange('price', parseFloat(e.target.value))}
        onBlur={() => validateField('price')}
        error={errors.find(e => e.field === 'price')?.message}
        placeholder="0.00"
        min={VALIDATION_RULES.price.min}
        max={VALIDATION_RULES.price.max}
        step="0.01"
        required
        aria-describedby="price-format"
      />
      <small id="price-format" className="text-gray-500">
        Enter price in USD (e.g., {formatPrice(19.99)})
      </small>

      {/* Quantity Input */}
      <Input
        id="quantity"
        name="quantity"
        type="number"
        label="Quantity Available"
        value={values.quantity.toString()}
        onChange={(e) => handleChange('quantity', parseInt(e.target.value, 10))}
        onBlur={() => validateField('quantity')}
        error={errors.find(e => e.field === 'quantity')?.message}
        min={VALIDATION_RULES.quantity.min}
        max={VALIDATION_RULES.quantity.max}
        required
      />

      {/* Description Input */}
      <div className="space-y-2">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Description
          <span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={values.description}
          onChange={(e) => handleChange('description', e.target.value)}
          onBlur={() => validateField('description')}
          className={classNames(
            'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500',
            { 'border-red-500': errors.some(e => e.field === 'description') }
          )}
          rows={4}
          maxLength={VALIDATION_RULES.description.maxLength}
          aria-invalid={errors.some(e => e.field === 'description')}
          required
        />
        <small className="text-gray-500">
          {values.description.length}/{VALIDATION_RULES.description.maxLength} characters
        </small>
      </div>

      {/* Date Range Inputs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="saleStartDate"
          name="saleStartDate"
          type="datetime-local"
          label="Sale Start Date"
          value={values.saleStartDate.toISOString().slice(0, 16)}
          onChange={(e) => handleChange('saleStartDate', new Date(e.target.value))}
          onBlur={() => validateField('saleStartDate')}
          error={errors.find(e => e.field === 'saleStartDate')?.message}
          required
        />
        <Input
          id="saleEndDate"
          name="saleEndDate"
          type="datetime-local"
          label="Sale End Date"
          value={values.saleEndDate.toISOString().slice(0, 16)}
          onChange={(e) => handleChange('saleEndDate', new Date(e.target.value))}
          onBlur={() => validateField('saleEndDate')}
          error={errors.find(e => e.field === 'saleEndDate')?.message}
          required
        />
      </div>

      {/* Availability Toggle */}
      <div className="flex items-center space-x-3">
        <input
          id="isAvailable"
          name="isAvailable"
          type="checkbox"
          checked={values.isAvailable}
          onChange={(e) => handleChange('isAvailable', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <label
          htmlFor="isAvailable"
          className="text-sm font-medium text-gray-700"
        >
          Make tickets available for sale
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || errors.length > 0}
          className={classNames(
            'inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2',
            {
              'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500':
                !isSubmitting && errors.length === 0,
              'bg-gray-400 cursor-not-allowed': isSubmitting || errors.length > 0
            }
          )}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Ticket Configuration'}
        </button>
      </div>
    </form>
  );
};

export default React.memo(TicketForm);