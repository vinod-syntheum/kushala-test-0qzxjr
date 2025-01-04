'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod'; // ^3.0.0
import { Card } from '../../../components/common/Card';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import type { UserProfile } from '../../../types/auth';

// Profile validation schema with enhanced security rules
const profileSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'First name contains invalid characters'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must not exceed 255 characters'),
  mfaEnabled: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile } = useAuth();
  const { show: showToast } = useToast();
  
  // Form state with optimistic updates
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    mfaEnabled: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mfaEnabled: user.mfaEnabled,
      });
    }
  }, [user]);

  // Protect route
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Handle form input changes with validation
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));
    setHasChanges(true);
  }, []);

  // Handle profile update with optimistic updates and error handling
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Validate form data
      const validatedData = profileSchema.parse(formData);
      
      // Store original data for rollback
      const originalData = { ...formData };
      
      // Optimistic update
      setFormData(validatedData);
      
      // Attempt to update profile
      await updateProfile(validatedData);
      
      showToast({
        variant: 'success',
        message: 'Profile updated successfully',
        duration: 3000,
      });
      
      setHasChanges(false);
    } catch (error) {
      // Handle validation errors
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => err.message).join(', ');
        showToast({
          variant: 'error',
          message: `Validation error: ${errorMessages}`,
          duration: 5000,
        });
      } else {
        showToast({
          variant: 'error',
          message: 'Failed to update profile. Please try again.',
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData, updateProfile, showToast]);

  // Handle MFA toggle with confirmation
  const handleMfaToggle = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enableMfa = e.target.checked;
    
    if (enableMfa) {
      // Redirect to MFA setup page
      router.push('/dashboard/profile/mfa-setup');
    } else {
      // Show confirmation dialog
      const confirmed = window.confirm(
        'Are you sure you want to disable two-factor authentication? This will make your account less secure.'
      );
      
      if (confirmed) {
        handleInputChange(e);
      }
    }
  }, [handleInputChange, router]);

  return (
    <Card
      variant="default"
      padding="large"
      className="max-w-2xl mx-auto"
      testId="profile-page"
    >
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Profile Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your account information and security settings
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* First Name */}
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
              aria-required="true"
              disabled={isLoading}
            />
          </div>

          {/* Last Name */}
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
              aria-required="true"
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
              aria-required="true"
              disabled={isLoading}
            />
          </div>

          {/* MFA Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="mfaEnabled"
                name="mfaEnabled"
                checked={formData.mfaEnabled}
                onChange={handleMfaToggle}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                disabled={isLoading}
              />
              <label
                htmlFor="mfaEnabled"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Enable Two-Factor Authentication
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className={`
                inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm
                ${isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
                }
              `}
              disabled={isLoading || !hasChanges}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </Card>
  );
};

export default ProfilePage;