/**
 * TypeScript type definitions and interfaces for website builder functionality
 * Includes content blocks, templates, styling, and builder state management
 * @version 1.0.0
 */

import { ApiResponse } from './common';

/**
 * Available content block types for restaurant websites
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
 * Comprehensive styling options for content blocks
 */
export interface BlockStyles {
  backgroundColor: string;
  padding: string;
  margin: string;
  textColor: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  borderRadius: string;
  boxShadow: string;
}

/**
 * Structure for website content blocks with responsive design support
 */
export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: Record<string, any>;
  order: number;
  styles: BlockStyles;
  isVisible: boolean;
  mobileStyles: BlockStyles;
  tabletStyles: BlockStyles;
}

/**
 * Enhanced restaurant website template structure with versioning
 */
export interface Template {
  id: string;
  name: string;
  thumbnail: string;
  blocks: ContentBlock[];
  category: string;
  version: string;
  previewUrl: string;
}

/**
 * Available preview modes for responsive design
 */
export enum ViewMode {
  DESKTOP = 'DESKTOP',
  TABLET = 'TABLET',
  MOBILE = 'MOBILE'
}

/**
 * Comprehensive website builder state management with history
 */
export interface WebsiteState {
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  isDragging: boolean;
  isEditing: boolean;
  history: ContentBlock[][];
  currentHistoryIndex: number;
  viewMode: ViewMode;
}

/**
 * Enhanced SEO metadata with structured data support
 */
export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  structuredData: Record<string, any>;
  canonicalUrl: string;
}

/**
 * API response types for website operations
 */
export type WebsiteResponse = ApiResponse<{
  blocks: ContentBlock[];
  seo: SEOMetadata;
}>;

export type TemplateResponse = ApiResponse<Template>;
export type TemplatesResponse = ApiResponse<Template[]>;

/**
 * Type guard to check if a block is of a specific type
 */
export function isBlockType(block: ContentBlock, type: ContentBlockType): boolean {
  return block.type === type;
}

/**
 * Type guard to check if styles are responsive
 */
export function hasResponsiveStyles(block: ContentBlock): boolean {
  return !!(block.mobileStyles && block.tabletStyles);
}

/**
 * Type for block content validation
 */
export type BlockContentValidator = (content: Record<string, any>) => boolean;

/**
 * Block content validators by type
 */
export const blockValidators: Record<ContentBlockType, BlockContentValidator> = {
  [ContentBlockType.HEADER]: (content) => 
    typeof content.title === 'string' && typeof content.subtitle === 'string',
  [ContentBlockType.MENU]: (content) =>
    Array.isArray(content.items) && content.items.every((item: any) => 
      typeof item.name === 'string' && typeof item.price === 'number'),
  [ContentBlockType.GALLERY]: (content) =>
    Array.isArray(content.images) && content.images.every((img: any) => 
      typeof img.url === 'string'),
  [ContentBlockType.CONTACT]: (content) =>
    typeof content.email === 'string' && typeof content.phone === 'string',
  [ContentBlockType.EVENTS]: (content) =>
    Array.isArray(content.events) && content.events.every((event: any) => 
      typeof event.title === 'string' && typeof event.date === 'string'),
  [ContentBlockType.HOURS]: (content) =>
    Array.isArray(content.schedule) && content.schedule.every((day: any) => 
      typeof day.day === 'string' && typeof day.hours === 'string')
};