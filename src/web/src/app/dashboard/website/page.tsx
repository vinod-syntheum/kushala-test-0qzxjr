'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics';
import { QuickActions } from '../../../components/dashboard/QuickActions';
import { TemplateList } from '../../../components/website/Templates/TemplateList';
import { useWebsiteBuilder } from '../../../hooks/useWebsiteBuilder';
import type { DeviceType } from '../../../types/website';

/**
 * Website Dashboard Page Component
 * Provides an intuitive interface for website management with template selection
 * and quick access to the website builder.
 */
const WebsiteDashboardPage: React.FC = () => {
  // Hooks
  const router = useRouter();
  const { 
    blocks, 
    selectedBlockId,
    updateBlock,
    setPreviewDevice 
  } = useWebsiteBuilder();

  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('DESKTOP');
  const [templateFilters, setTemplateFilters] = useState({
    category: 'all',
    search: '',
    sort: 'popular'
  });

  /**
   * Handles template selection with analytics tracking
   */
  const handleTemplateSelect = useCallback(async (templateId: string) => {
    try {
      setIsLoading(true);
      Analytics.track('template_selected', { templateId });

      // Update selected template in builder state
      await updateBlock(selectedBlockId!, {
        templateId,
        updatedAt: new Date().toISOString()
      });

      // Navigate to builder
      router.push('/dashboard/website/builder');
    } catch (error) {
      toast.error('Failed to select template. Please try again.');
      console.error('Template selection error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBlockId, updateBlock, router]);

  /**
   * Handles navigation to website builder
   */
  const handleBuilderNavigation = useCallback(() => {
    Analytics.track('builder_accessed');
    router.push('/dashboard/website/builder');
  }, [router]);

  /**
   * Updates preview device type
   */
  const handleDeviceChange = useCallback((device: DeviceType) => {
    setSelectedDevice(device);
    setPreviewDevice(device);
  }, [setPreviewDevice]);

  /**
   * Updates template filters
   */
  const handleFilterChange = useCallback((filters: typeof templateFilters) => {
    setTemplateFilters(filters);
    Analytics.track('templates_filtered', { filters });
  }, []);

  // Set up initial device preview
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        handleDeviceChange('MOBILE');
      } else if (width < 1024) {
        handleDeviceChange('TABLET');
      } else {
        handleDeviceChange('DESKTOP');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [handleDeviceChange]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Website Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage your restaurant's website and choose from our professional templates
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActions
          className="mb-8"
          onActionStart={() => setIsLoading(true)}
          onActionComplete={() => setIsLoading(false)}
        />

        {/* Website Preview (if exists) */}
        {blocks.length > 0 && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Current Website
            </h2>
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              {/* Website preview iframe or component */}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleBuilderNavigation}
                className="inline-flex items-center px-4 py-2 border border-transparent 
                  rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 
                  hover:bg-primary-700 focus:outline-none focus:ring-2 
                  focus:ring-offset-2 focus:ring-primary-500"
              >
                Edit Website
              </button>
            </div>
          </div>
        )}

        {/* Template Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Website Templates
            </h2>
            
            {/* Template Filters */}
            <div className="mb-6 flex flex-wrap gap-4">
              <input
                type="text"
                placeholder="Search templates..."
                className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 
                  rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={templateFilters.search}
                onChange={(e) => handleFilterChange({
                  ...templateFilters,
                  search: e.target.value
                })}
              />
              
              <select
                value={templateFilters.category}
                onChange={(e) => handleFilterChange({
                  ...templateFilters,
                  category: e.target.value
                })}
                className="px-4 py-2 border border-gray-300 rounded-md 
                  focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Categories</option>
                <option value="modern">Modern</option>
                <option value="classic">Classic</option>
                <option value="casual">Casual</option>
                <option value="elegant">Elegant</option>
              </select>
            </div>

            {/* Template Grid */}
            <TemplateList
              templates={[]} // Templates would be fetched from API
              selectedTemplateId={selectedBlockId}
              onTemplateSelect={handleTemplateSelect}
              filterCategory={templateFilters.category !== 'all' ? templateFilters.category : undefined}
              searchQuery={templateFilters.search}
              isLoading={isLoading}
              className="min-h-[400px]"
            />
          </div>
        </div>
      </div>

      {/* Analytics */}
      <Analytics />
    </div>
  );
};

export default WebsiteDashboardPage;