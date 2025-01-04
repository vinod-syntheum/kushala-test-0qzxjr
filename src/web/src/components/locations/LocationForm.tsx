import React, { memo, useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import Input from '../common/Input';
import { useLocationManager } from '../../hooks/useLocationManager';
import type { Location, LocationFormData, OperatingHours } from '../../types/location';

// Constants
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const DEFAULT_MAP_CENTER = { lat: 40.7128, lng: -74.0060 }; // New York
const DEFAULT_ZOOM = 13;

// Operating hours validation schema
const timeRangeSchema = z.object({
  open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  closed: z.boolean()
});

const operatingHoursSchema = z.array(z.object({
  day: z.string(),
  open: z.string(),
  close: z.string(),
  closed: z.boolean()
})).length(7);

// Location form validation schema
const locationFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  address: z.object({
    street1: z.string().min(5, 'Street address is required'),
    street2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid postal code'),
    country: z.string().min(2, 'Country is required')
  }),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(0)
  }),
  operatingHours: operatingHoursSchema,
  phone: z.string().regex(/^\+?[\d\s-()]{10,}$/, 'Invalid phone number'),
  email: z.string().email('Invalid email address'),
  description: z.string().max(500, 'Description must be less than 500 characters'),
  isPrimary: z.boolean()
});

// Default operating hours
const DEFAULT_OPERATING_HOURS: OperatingHours = {
  monday: [{ open: '09:00', close: '17:00', isValid: true }],
  tuesday: [{ open: '09:00', close: '17:00', isValid: true }],
  wednesday: [{ open: '09:00', close: '17:00', isValid: true }],
  thursday: [{ open: '09:00', close: '17:00', isValid: true }],
  friday: [{ open: '09:00', close: '17:00', isValid: true }],
  saturday: [{ open: '09:00', close: '17:00', isValid: true }],
  sunday: [{ open: '09:00', close: '17:00', isValid: true }],
  holidayHours: {}
};

interface LocationFormProps {
  location: Location | null;
  onSubmit: (data: LocationFormData) => Promise<void>;
  onCancel: () => void;
}

const LocationForm: React.FC<LocationFormProps> = memo(({ location, onSubmit, onCancel }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [markerPosition, setMarkerPosition] = useState(DEFAULT_MAP_CENTER);
  const { createLocation, updateLocation, validateLocationLimit } = useLocationManager();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: location?.name || '',
      address: location?.address || {
        street1: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
      },
      coordinates: location?.coordinates || {
        latitude: DEFAULT_MAP_CENTER.lat,
        longitude: DEFAULT_MAP_CENTER.lng,
        accuracy: 0
      },
      operatingHours: location?.operatingHours || DEFAULT_OPERATING_HOURS,
      phone: location?.phone || '',
      email: location?.email || '',
      description: location?.description || '',
      isPrimary: location?.isPrimary || false
    }
  });

  // Watch coordinates for map updates
  const coordinates = watch('coordinates');

  useEffect(() => {
    if (mapLoaded && coordinates) {
      setMarkerPosition({
        lat: coordinates.latitude,
        lng: coordinates.longitude
      });
    }
  }, [coordinates, mapLoaded]);

  const handleMapClick = useCallback((event: google.maps.MouseEvent) => {
    const lat = event.latLng?.lat() || 0;
    const lng = event.latLng?.lng() || 0;
    
    setMarkerPosition({ lat, lng });
    setValue('coordinates', {
      latitude: lat,
      longitude: lng,
      accuracy: 0
    });
  }, [setValue]);

  const handleFormSubmit = async (data: LocationFormData) => {
    try {
      if (!location && !(await validateLocationLimit())) {
        throw new Error('Maximum location limit reached');
      }

      if (location) {
        await updateLocation(location.id, data);
      } else {
        await createLocation(data);
      }

      await onSubmit(data);
    } catch (error) {
      console.error('Location submission failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <div className="space-y-4">
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="name"
                type="text"
                label="Location Name"
                error={errors.name?.message}
                required
              />
            )}
          />

          <Controller
            name="address.street1"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="street1"
                type="text"
                label="Street Address"
                error={errors.address?.street1?.message}
                required
              />
            )}
          />

          <Controller
            name="address.street2"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="street2"
                type="text"
                label="Street Address 2"
                error={errors.address?.street2?.message}
              />
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="address.city"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="city"
                  type="text"
                  label="City"
                  error={errors.address?.city?.message}
                  required
                />
              )}
            />

            <Controller
              name="address.state"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="state"
                  type="text"
                  label="State"
                  error={errors.address?.state?.message}
                  required
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="address.postalCode"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="postalCode"
                  type="text"
                  label="Postal Code"
                  error={errors.address?.postalCode?.message}
                  required
                />
              )}
            />

            <Controller
              name="address.country"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="country"
                  type="text"
                  label="Country"
                  error={errors.address?.country?.message}
                  required
                />
              )}
            />
          </div>
        </div>

        {/* Map */}
        <div className="h-[400px]">
          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} onLoad={() => setMapLoaded(true)}>
            <GoogleMap
              mapContainerClassName="w-full h-full rounded-lg"
              center={markerPosition}
              zoom={DEFAULT_ZOOM}
              onClick={handleMapClick}
            >
              <Marker position={markerPosition} />
            </GoogleMap>
          </LoadScript>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="phone"
              type="tel"
              label="Phone Number"
              error={errors.phone?.message}
              required
            />
          )}
        />

        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="email"
              type="email"
              label="Email Address"
              error={errors.email?.message}
              required
            />
          )}
        />
      </div>

      {/* Operating Hours */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Operating Hours</h3>
        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, index) => (
          <div key={day} className="grid grid-cols-3 gap-4 items-center">
            <span className="capitalize">{day}</span>
            <Controller
              name={`operatingHours.${index}.open`}
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id={`${day}-open`}
                  type="time"
                  label="Open"
                  error={errors.operatingHours?.[index]?.open?.message}
                />
              )}
            />
            <Controller
              name={`operatingHours.${index}.close`}
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id={`${day}-close`}
                  type="time"
                  label="Close"
                  error={errors.operatingHours?.[index]?.close?.message}
                />
              )}
            />
          </div>
        ))}
      </div>

      {/* Description */}
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              {...field}
              id="description"
              rows={4}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              maxLength={500}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>
        )}
      />

      {/* Primary Location Toggle */}
      <Controller
        name="isPrimary"
        control={control}
        render={({ field: { value, onChange } }) => (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isPrimary" className="text-sm font-medium text-gray-700">
              Set as primary location
            </label>
          </div>
        )}
      />

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : location ? 'Update Location' : 'Create Location'}
        </button>
      </div>
    </form>
  );
});

LocationForm.displayName = 'LocationForm';

export default LocationForm;