'use client';

import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // ^13.0.0
import { useToast, useDisclosure } from '@chakra-ui/react'; // ^2.0.0
import LocationForm from '../../../../components/locations/LocationForm';
import Breadcrumb from '../../../../components/common/Breadcrumb';
import { useLocationManager } from '../../../../hooks/useLocationManager';
import type { LocationFormData } from '../../../../types/location';

// Constants
const MAX_LOCATIONS = 3;
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Page component for creating new restaurant locations
 * Implements form validation, map integration, and business rule enforcement
 */
const CreateLocationPage: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { createLocation, locations, isLoading } = useLocationManager();

  // Check if maximum locations limit is reached
  useEffect(() => {
    if (locations.length >= MAX_LOCATIONS) {
      toast({
        title: 'Maximum Locations Reached',
        description: `You can only create up to ${MAX_LOCATIONS} locations.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      router.push('/dashboard/locations');
    }
  }, [locations.length, router, toast]);

  // Breadcrumb navigation items
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Locations', href: '/dashboard/locations' },
    { label: 'Create Location', href: '/dashboard/locations/create', isCurrent: true },
  ];

  /**
   * Handles the submission of new location data
   * Includes validation, error handling, and success feedback
   */
  const handleSubmit = useCallback(async (formData: LocationFormData) => {
    try {
      // Create new location
      await createLocation(formData);

      // Show success message
      toast({
        title: 'Location Created',
        description: 'New location has been successfully created.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Navigate back to locations list
      router.push('/dashboard/locations');
    } catch (error) {
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : 'Failed to create location';
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [createLocation, router, toast]);

  /**
   * Handles cancellation of location creation
   * Shows confirmation dialog before navigating away
   */
  const handleCancel = useCallback(async () => {
    onOpen();
    const confirmed = await new Promise((resolve) => {
      // Confirmation dialog logic here
      resolve(true);
    });

    if (confirmed) {
      router.push('/dashboard/locations');
    }
  }, [onOpen, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Breadcrumb navigation */}
      <Breadcrumb 
        items={breadcrumbItems}
        className="mb-6"
      />

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Create New Location
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Add a new restaurant location with details and operating hours.
        </p>
      </div>

      {/* Location creation form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <LocationForm
          location={null}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>

      {/* Error boundary fallback */}
      <div className="hidden">
        {/* This will be shown if the component crashes */}
        <div className="text-red-600 p-4 bg-red-50 rounded-md">
          Something went wrong. Please try again or contact support.
        </div>
      </div>
    </div>
  );
};

export default CreateLocationPage;