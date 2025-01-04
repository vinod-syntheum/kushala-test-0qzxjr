'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form'; // v7.0.0
import { z } from 'zod'; // v3.0.0
import toast from 'react-hot-toast'; // v2.0.0
import { Input } from '../../../../components/common/Input';
import { Button } from '../../../../components/common/Button';
import type { SEOMetadata } from '../../../../types/website';

// Form validation schema using zod
const websiteSettingsSchema = z.object({
  seoTitle: z.string().min(10).max(60),
  seoDescription: z.string().min(50).max(160),
  seoKeywords: z.string(),
  ogImage: z.string().url().optional(),
  customDomain: z.string().regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/),
  forceSsl: z.boolean(),
  googleAnalyticsId: z.string().regex(/^UA-\d+-\d+$|^G-[A-Z0-9]+$/),
  metaRobots: z.string(),
  domainVerificationToken: z.string(),
  lastSslRenewal: z.date().optional()
});

type WebsiteSettingsFormData = z.infer<typeof websiteSettingsSchema>;

/**
 * Website settings page component providing comprehensive configuration options
 * for restaurant websites including SEO, domain settings, and security features.
 */
const WebsiteSettingsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sslStatus, setSslStatus] = useState<'valid' | 'expired' | 'none'>('none');
  const [domainStatus, setDomainStatus] = useState<'verified' | 'pending' | 'none'>('none');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<WebsiteSettingsFormData>({
    defaultValues: {
      forceSsl: true,
      metaRobots: 'index, follow'
    }
  });

  // Watch form values for real-time preview
  const seoTitle = watch('seoTitle');
  const seoDescription = watch('seoDescription');

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        // API call to fetch existing settings would go here
        const mockSettings = {
          seoTitle: 'Restaurant Name - Authentic Cuisine in City',
          seoDescription: 'Experience authentic cuisine at Restaurant Name. Fresh ingredients, warm atmosphere, and unforgettable flavors await you.',
          seoKeywords: 'restaurant, authentic cuisine, dining, city',
          customDomain: 'www.restaurantname.com',
          googleAnalyticsId: 'UA-12345678-1'
        };
        
        Object.entries(mockSettings).forEach(([key, value]) => {
          setValue(key as keyof WebsiteSettingsFormData, value);
        });
      } catch (error) {
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [setValue]);

  // Form submission handler
  const onSubmit = async (data: WebsiteSettingsFormData) => {
    try {
      setIsLoading(true);

      // Format SEO keywords into array
      const formattedData = {
        ...data,
        seoKeywords: data.seoKeywords.split(',').map(k => k.trim())
      };

      // API call to save settings would go here
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Check SSL certificate status
  const checkSslStatus = async (domain: string) => {
    try {
      // API call to check SSL status would go here
      const status = 'valid';
      setSslStatus(status as 'valid' | 'expired' | 'none');
    } catch (error) {
      setSslStatus('none');
    }
  };

  // Verify domain ownership
  const verifyDomain = async () => {
    try {
      setIsLoading(true);
      // API call to verify domain would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDomainStatus('verified');
      toast.success('Domain verified successfully');
    } catch (error) {
      setDomainStatus('pending');
      toast.error('Domain verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Website Settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* SEO Settings Section */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">SEO Settings</h2>
          
          <div className="space-y-4">
            <Input
              id="seoTitle"
              label="Page Title"
              type="text"
              error={errors.seoTitle?.message}
              helperText={`${seoTitle?.length || 0}/60 characters`}
              {...register('seoTitle')}
            />

            <Input
              id="seoDescription"
              label="Meta Description"
              type="text"
              error={errors.seoDescription?.message}
              helperText={`${seoDescription?.length || 0}/160 characters`}
              {...register('seoDescription')}
            />

            <Input
              id="seoKeywords"
              label="Keywords"
              type="text"
              helperText="Separate keywords with commas"
              error={errors.seoKeywords?.message}
              {...register('seoKeywords')}
            />

            <Input
              id="ogImage"
              label="Social Share Image"
              type="url"
              helperText="URL for social media preview image"
              error={errors.ogImage?.message}
              {...register('ogImage')}
            />
          </div>
        </section>

        {/* Domain Settings Section */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Domain Settings</h2>
          
          <div className="space-y-4">
            <Input
              id="customDomain"
              label="Custom Domain"
              type="text"
              error={errors.customDomain?.message}
              helperText="Enter your custom domain (e.g., www.restaurant.com)"
              {...register('customDomain')}
            />

            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={verifyDomain}
                loading={isLoading}
                disabled={!watch('customDomain')}
              >
                Verify Domain
              </Button>
              
              <span className={`text-sm ${
                domainStatus === 'verified' ? 'text-green-600' :
                domainStatus === 'pending' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {domainStatus === 'verified' ? '✓ Domain Verified' :
                 domainStatus === 'pending' ? '⚠ Verification Pending' :
                 'Domain Not Verified'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="forceSsl"
                className="rounded border-gray-300"
                {...register('forceSsl')}
              />
              <label htmlFor="forceSsl" className="text-sm text-gray-700">
                Force SSL (HTTPS)
              </label>
            </div>
          </div>
        </section>

        {/* Analytics Settings Section */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Analytics Settings</h2>
          
          <div className="space-y-4">
            <Input
              id="googleAnalyticsId"
              label="Google Analytics ID"
              type="text"
              error={errors.googleAnalyticsId?.message}
              helperText="Enter your Google Analytics tracking ID"
              {...register('googleAnalyticsId')}
            />
          </div>
        </section>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          >
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

export default WebsiteSettingsPage;