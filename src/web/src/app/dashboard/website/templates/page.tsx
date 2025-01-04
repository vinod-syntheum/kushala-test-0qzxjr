'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { analytics } from '@segment/analytics-next'; // v1.55.0
import { TemplateList } from '../../../../components/website/Templates/TemplateList';
import { useWebsiteBuilder } from '../../../../hooks/useWebsiteBuilder';
import type { Template, ContentBlock } from '../../../../types/website';

// Analytics event constants
const ANALYTICS_EVENTS = {
  TEMPLATE_SELECT: 'template_select',
  TEMPLATE_PREVIEW: 'template_preview',
  TEMPLATE_SEARCH: 'template_search',
  TEMPLATE_FILTER: 'template_filter'
} as const;

// Template categories based on restaurant types
const TEMPLATE_CATEGORIES = [
  'Fine Dining',
  'Casual Dining',
  'Cafe',
  'Bistro',
  'Family Restaurant',
  'Fast Casual'
] as const;

// Mock templates data - replace with API call in production
const TEMPLATES: Template[] = [
  {
    id: 'modern-fine-dining',
    name: 'Modern Fine Dining',
    description: 'Elegant and sophisticated design for upscale restaurants',
    thumbnail: '/templates/modern-fine-dining.jpg',
    category: 'Fine Dining',
    version: '1.0.0',
    previewUrl: '/preview/modern-fine-dining',
    blocks: [],
    metadata: {
      tags: ['elegant', 'upscale', 'modern'],
      style: 'modern',
      features: ['menu', 'reservations', 'wine-list'],
      lastUpdated: new Date('2024-01-15'),
      popularity: 4.8
    }
  }
  // Additional templates would be defined here
];

/**
 * Enhanced page component for website template selection with advanced features
 * including search, filtering, and analytics tracking.
 */
const TemplatesPage: React.FC = () => {
  const router = useRouter();
  const { addBlock, undoTemplateApplication } = useWebsiteBuilder();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track page view on mount
  useEffect(() => {
    analytics.page('Website Templates');
  }, []);

  /**
   * Handles template selection with validation and analytics
   */
  const handleTemplateSelect = useCallback(async (templateId: string) => {
    try {
      setIsLoading(true);
      const template = TEMPLATES.find(t => t.id === templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }

      // Track template selection
      analytics.track(ANALYTICS_EVENTS.TEMPLATE_SELECT, {
        templateId,
        templateName: template.name,
        templateCategory: template.category
      });

      // Apply template blocks
      template.blocks.forEach((block: ContentBlock, index: number) => {
        addBlock(block.type, index);
      });

      setSelectedTemplateId(templateId);
      
      // Navigate to website builder
      router.push('/dashboard/website/builder');
    } catch (error) {
      console.error('Error applying template:', error);
      undoTemplateApplication();
    } finally {
      setIsLoading(false);
    }
  }, [router, addBlock, undoTemplateApplication]);

  /**
   * Handles template preview with analytics tracking
   */
  const handlePreview = useCallback((template: Template) => {
    analytics.track(ANALYTICS_EVENTS.TEMPLATE_PREVIEW, {
      templateId: template.id,
      templateName: template.name
    });
    window.open(template.previewUrl, '_blank');
  }, []);

  /**
   * Handles search query changes with analytics
   */
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    analytics.track(ANALYTICS_EVENTS.TEMPLATE_SEARCH, {
      searchQuery: query
    });
  }, []);

  /**
   * Handles category filter changes with analytics
   */
  const handleCategoryChange = useCallback((category: string | null) => {
    setSelectedCategory(category);
    analytics.track(ANALYTICS_EVENTS.TEMPLATE_FILTER, {
      category: category || 'all'
    });
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Choose a Template
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Select a professional template designed specifically for restaurants
        </p>
      </header>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search input */}
        <input
          type="search"
          placeholder="Search templates..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
            focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 
            dark:border-gray-700"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          aria-label="Search templates"
        />

        {/* Category filter */}
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
            focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 
            dark:border-gray-700"
          value={selectedCategory || ''}
          onChange={(e) => handleCategoryChange(e.target.value || null)}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {TEMPLATE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Template grid */}
      <TemplateList
        templates={TEMPLATES}
        selectedTemplateId={selectedTemplateId}
        onTemplateSelect={handleTemplateSelect}
        onPreview={handlePreview}
        filterCategory={selectedCategory}
        searchQuery={searchQuery}
        isLoading={isLoading}
        className="min-h-[600px]"
      />
    </div>
  );
};

export default TemplatesPage;