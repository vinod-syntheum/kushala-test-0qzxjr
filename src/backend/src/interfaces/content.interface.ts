// @ts-nocheck
import { Document } from 'mongoose'; // v6.0.0

/**
 * Enum defining available content block types for restaurant-specific website components
 * Used to identify and validate different sections of the website content
 */
export enum ContentBlockType {
  HEADER = 'HEADER',
  MENU = 'MENU',
  GALLERY = 'GALLERY',
  CONTACT = 'CONTACT',
  EVENTS = 'EVENTS',
  HOURS = 'HOURS'
}

/**
 * Interface defining the structure of a content block in the website builder
 * Provides type safety for content block manipulation and rendering
 */
export interface IContentBlock {
  /** Type of the content block from predefined restaurant-specific components */
  type: ContentBlockType;
  
  /** Dynamic content data structure specific to each block type */
  content: Record<string, unknown>;
  
  /** Position order of the block in the page layout */
  order: number;
  
  /** Flag indicating if the block is currently active/visible */
  isActive: boolean;
}

/**
 * Interface defining SEO metadata structure with social media optimization support
 * Ensures consistent SEO data structure across restaurant websites
 */
export interface ISEOMetadata {
  /** Page title optimized for search engines */
  title: string;
  
  /** Meta description for search engine results */
  description: string;
  
  /** SEO keywords for the website */
  keywords: string[];
  
  /** Open Graph image URL for social media sharing */
  ogImage: string;
}

/**
 * Main interface for website content document with versioning support
 * Extends MongoDB Document for persistence capabilities
 */
export interface IWebsiteContent extends Document {
  /** Reference to the restaurant owner */
  restaurantId: string;
  
  /** Array of content blocks forming the website structure */
  blocks: IContentBlock[];
  
  /** SEO metadata for the website */
  seo: ISEOMetadata;
  
  /** Flag indicating if the content version is published */
  published: boolean;
  
  /** Content version number for tracking changes */
  version: number;
  
  /** Timestamp of last published version */
  lastPublishedAt: Date;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}