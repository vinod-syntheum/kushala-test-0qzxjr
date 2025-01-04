import React, { useCallback, useMemo } from 'react';
import { z } from 'zod'; // v3.22.0
import dayjs from 'dayjs'; // v1.11.10
import DOMPurify from 'dompurify'; // v3.0.6
import { Widget as UploadcareWidget } from '@uploadcare/react-widget'; // v2.4.3

import { Event, TicketType } from '../../types/event';
import { useForm } from '../../hooks/useForm';
import Input from '../common/Input';

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MIN_TICKET_TYPES = 1;

// Validation schema using Zod
const eventSchema = z.object({
  name: z.string()
    .min(1, 'Event name is required')
    .max(200, 'Event name cannot exceed 200 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  startDate: z.string()
    .refine(date => dayjs(date).isAfter(dayjs()), 'Start date must be in the future'),
  endDate: z.string()
    .refine(date => dayjs(date).isAfter(dayjs()), 'End date must be in the future'),
  capacity: z.number()
    .int()
    .positive('Capacity must be greater than 0')
    .max(10000, 'Maximum capacity is 10000'),
  ticketTypes: z.array(z.nativeEnum(TicketType))
    .min(MIN_TICKET_TYPES, 'At least one ticket type is required'),
  imageUrl: z.string()
    .url('Invalid image URL')
    .optional()
});

interface EventFormProps {
  initialValues: Partial<Event>;
  onSubmit: (values: Partial<Event>) => Promise<void>;
  isEdit?: boolean;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const EventForm: React.FC<EventFormProps> = ({
  initialValues,
  onSubmit,
  isEdit = false,
  onCancel,
  isSubmitting = false
}) => {
  // Form validation function
  const validateEventForm = useCallback((values: Partial<Event>) => {
    try {
      // Sanitize text inputs
      const sanitizedValues = {
        ...values,
        name: values.name ? DOMPurify.sanitize(values.name) : '',
        description: values.description ? DOMPurify.sanitize(values.description) : ''
      };

      eventSchema.parse(sanitizedValues);
      return [];
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'VALIDATION_ERROR'
        }));
      }
      return [];
    }
  }, []);

  // Image upload handler
  const handleImageUpload = useCallback(async (file: File) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPG, PNG, or WebP images.');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit.');
    }

    return file.cdnUrl;
  }, []);

  // Initialize form with useForm hook
  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    setFieldValue,
    validateField
  } = useForm({
    initialValues: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      capacity: 0,
      ticketTypes: [TicketType.GENERAL],
      imageUrl: '',
      ...initialValues
    },
    validateFn: validateEventForm,
    onSubmit,
    validationOptions: {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 300
    },
    securityOptions: {
      enableXssPrevention: true,
      maxFieldLength: 2000,
      allowedTags: []
    }
  });

  // Available ticket types for selection
  const availableTicketTypes = useMemo(() => 
    Object.values(TicketType).map(type => ({
      value: type,
      label: type.replace('_', ' ').toLowerCase()
    })),
    []
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Input
        id="event-name"
        name="name"
        type="text"
        label="Event Name"
        value={values.name}
        onChange={e => handleChange('name', e.target.value)}
        error={errors.find(e => e.field === 'name')?.message}
        required
        aria-label="Event name"
        placeholder="Enter event name"
      />

      <div className="space-y-2">
        <label htmlFor="event-description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="event-description"
          name="description"
          value={values.description}
          onChange={e => handleChange('description', e.target.value)}
          className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
          rows={4}
          aria-label="Event description"
          placeholder="Enter event description"
        />
        {errors.find(e => e.field === 'description')?.message && (
          <p className="text-sm text-red-600" role="alert">
            {errors.find(e => e.field === 'description')?.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="event-start-date"
          name="startDate"
          type="datetime-local"
          label="Start Date"
          value={values.startDate}
          onChange={e => handleChange('startDate', e.target.value)}
          error={errors.find(e => e.field === 'startDate')?.message}
          required
          min={dayjs().format('YYYY-MM-DDTHH:mm')}
        />

        <Input
          id="event-end-date"
          name="endDate"
          type="datetime-local"
          label="End Date"
          value={values.endDate}
          onChange={e => handleChange('endDate', e.target.value)}
          error={errors.find(e => e.field === 'endDate')?.message}
          required
          min={values.startDate || dayjs().format('YYYY-MM-DDTHH:mm')}
        />
      </div>

      <Input
        id="event-capacity"
        name="capacity"
        type="number"
        label="Capacity"
        value={values.capacity.toString()}
        onChange={e => handleChange('capacity', parseInt(e.target.value, 10))}
        error={errors.find(e => e.field === 'capacity')?.message}
        required
        min="1"
        max="10000"
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Ticket Types
        </label>
        <div className="space-y-2">
          {availableTicketTypes.map(({ value, label }) => (
            <label key={value} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={values.ticketTypes.includes(value)}
                onChange={e => {
                  const newTypes = e.target.checked
                    ? [...values.ticketTypes, value]
                    : values.ticketTypes.filter(t => t !== value);
                  setFieldValue('ticketTypes', newTypes);
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
        {errors.find(e => e.field === 'ticketTypes')?.message && (
          <p className="text-sm text-red-600" role="alert">
            {errors.find(e => e.field === 'ticketTypes')?.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Event Image
        </label>
        <UploadcareWidget
          publicKey="YOUR_UPLOADCARE_PUBLIC_KEY"
          onChange={async (file) => {
            if (file) {
              try {
                const imageUrl = await handleImageUpload(file);
                setFieldValue('imageUrl', imageUrl);
              } catch (error) {
                if (error instanceof Error) {
                  setFieldValue('imageUrl', '');
                  // Handle error appropriately
                }
              }
            }
          }}
          tabs="file camera url"
          imageShrink="1024x1024"
          previewStep
          clearable
        />
        {errors.find(e => e.field === 'imageUrl')?.message && (
          <p className="text-sm text-red-600" role="alert">
            {errors.find(e => e.field === 'imageUrl')?.message}
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || errors.length > 0}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </form>
  );
};

export default React.memo(EventForm);