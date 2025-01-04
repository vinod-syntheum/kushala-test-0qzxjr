'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Card from '../../../components/common/Card';
import Input from '../../../components/common/Input';
import { useForm } from '../../../hooks/useForm';
import { useAuth } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';
import { validateEmail, validatePassword } from '../../../utils/validation';

interface SettingsFormData {
  email: string;
  currentPassword: string;
  newPassword: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

const SettingsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with current user data
  const initialValues: SettingsFormData = {
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    emailNotifications: true,
    smsNotifications: false
  };

  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    validateField,
    setFieldValue
  } = useForm<SettingsFormData>({
    initialValues,
    validateFn: (formData) => {
      const formErrors = [];
      
      // Validate email
      if (formData.email) {
        formErrors.push(...validateEmail(formData.email));
      }

      // Validate new password if provided
      if (formData.newPassword) {
        if (!formData.currentPassword) {
          formErrors.push({
            field: 'currentPassword',
            message: 'Current password is required to set new password',
            code: 'REQUIRED'
          });
        }
        formErrors.push(...validatePassword(formData.newPassword));
      }

      return formErrors;
    }
  });

  // Handle settings update
  const handleSettingsSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await handleSubmit(e);
      toast.success('Settings updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  }, [handleSubmit]);

  // Update form when user data changes
  useEffect(() => {
    if (user?.email) {
      setFieldValue('email', user.email);
    }
  }, [user, setFieldValue]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold mb-6">Account Settings</h1>

      <form onSubmit={handleSettingsSubmit} className="space-y-6">
        {/* Account Settings Section */}
        <Card
          header={<h2 className="text-xl font-semibold">Account Information</h2>}
          padding="large"
        >
          <div className="space-y-4">
            <Input
              id="email"
              name="email"
              type="email"
              label="Email Address"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => validateField('email')}
              error={errors.find(e => e.field === 'email')?.message}
              required
              aria-label="Email Address"
            />

            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              label="Current Password"
              value={values.currentPassword}
              onChange={(e) => handleChange('currentPassword', e.target.value)}
              error={errors.find(e => e.field === 'currentPassword')?.message}
              helperText="Required only when changing password"
              aria-label="Current Password"
            />

            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              label="New Password"
              value={values.newPassword}
              onChange={(e) => handleChange('newPassword', e.target.value)}
              onBlur={() => validateField('newPassword')}
              error={errors.find(e => e.field === 'newPassword')?.message}
              helperText="Minimum 8 characters, must include uppercase, lowercase, number and special character"
              aria-label="New Password"
            />
          </div>
        </Card>

        {/* Notification Settings Section */}
        <Card
          header={<h2 className="text-xl font-semibold">Notification Preferences</h2>}
          padding="large"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="emailNotifications" className="font-medium text-gray-700">
                Email Notifications
              </label>
              <input
                id="emailNotifications"
                name="emailNotifications"
                type="checkbox"
                checked={values.emailNotifications}
                onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="smsNotifications" className="font-medium text-gray-700">
                SMS Notifications
              </label>
              <input
                id="smsNotifications"
                name="smsNotifications"
                type="checkbox"
                checked={values.smsNotifications}
                onChange={(e) => handleChange('smsNotifications', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving || errors.length > 0}
            className={`px-4 py-2 rounded-md text-white font-medium
              ${isSaving || errors.length > 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
              }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;