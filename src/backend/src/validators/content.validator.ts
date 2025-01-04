/**
 * @fileoverview Content validation schemas using Zod for website content, SEO metadata,
 * and content blocks. Implements comprehensive validation with security measures.
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.0.0
import { ContentBlockType, IContentBlock, ISEOMetadata, IWebsiteContent } from '../interfaces/content.interface';
import { validateUrl } from '../utils/validation.utils';

/**
 * Schema for validating content based on block type
 * Implements specific validation rules for each content type
 */
const contentByTypeSchema = z.discriminatedUnion('type', [
  // Header block validation
  z.object({
    type: z.literal(ContentBlockType.HEADER),
    content: z.object({
      title: z.string().min(2).max(100).trim(),
      subtitle: z.string().max(200).trim().optional(),
      backgroundImage: z.string().url().optional(),
      logoUrl: z.string().url().optional()
    })
  }),
  
  // Menu block validation
  z.object({
    type: z.literal(ContentBlockType.MENU),
    content: z.object({
      sections: z.array(z.object({
        name: z.string().min(2).max(50).trim(),
        items: z.array(z.object({
          name: z.string().min(2).max(100).trim(),
          description: z.string().max(500).trim(),
          price: z.number().min(0).max(10000),
          image: z.string().url().optional()
        })).max(50)
      })).max(10)
    })
  }),
  
  // Gallery block validation
  z.object({
    type: z.literal(ContentBlockType.GALLERY),
    content: z.object({
      images: z.array(z.object({
        url: z.string().url(),
        caption: z.string().max(200).trim().optional(),
        altText: z.string().max(100).trim()
      })).max(50)
    })
  }),
  
  // Contact block validation
  z.object({
    type: z.literal(ContentBlockType.CONTACT),
    content: z.object({
      email: z.string().email(),
      phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
      address: z.string().min(10).max(200).trim(),
      socialLinks: z.record(z.string().url()).optional()
    })
  }),
  
  // Events block validation
  z.object({
    type: z.literal(ContentBlockType.EVENTS),
    content: z.object({
      events: z.array(z.object({
        title: z.string().min(5).max(100).trim(),
        description: z.string().max(2000).trim(),
        date: z.string().datetime(),
        image: z.string().url().optional(),
        ticketUrl: z.string().url().optional()
      })).max(20)
    })
  }),
  
  // Hours block validation
  z.object({
    type: z.literal(ContentBlockType.HOURS),
    content: z.object({
      schedule: z.record(
        z.string(),
        z.object({
          open: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
          close: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
          closed: z.boolean().optional()
        })
      )
    })
  })
]);

/**
 * Schema for validating individual content blocks
 * Includes security measures and version tracking
 */
export const contentBlockSchema = z.object({
  type: z.nativeEnum(ContentBlockType),
  content: z.unknown().refine(
    (content) => contentByTypeSchema.safeParse({ type: content.type, content }).success,
    { message: 'Invalid content structure for block type' }
  ),
  order: z.number().int().min(0),
  active: z.boolean(),
  version: z.number().int().min(1)
}).strict();

/**
 * Schema for validating SEO metadata
 * Implements search engine optimization best practices
 */
export const seoMetadataSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(60, 'Title must not exceed 60 characters')
    .trim(),
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(160, 'Description must not exceed 160 characters')
    .trim(),
  keywords: z.array(z.string()
    .min(2, 'Keywords must be at least 2 characters')
    .max(50, 'Keywords must not exceed 50 characters')
    .trim()
  ).min(1, 'At least one keyword is required')
   .max(10, 'Maximum 10 keywords allowed'),
  ogImage: z.string()
    .url('Invalid Open Graph image URL')
    .refine(async (url) => await validateUrl(url), {
      message: 'Invalid or inaccessible image URL'
    })
    .optional()
}).strict();

/**
 * Schema for validating complete website content
 * Implements comprehensive validation with version tracking
 */
export const websiteContentSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  blocks: z.array(contentBlockSchema)
    .min(1, 'At least one content block is required')
    .max(20, 'Maximum 20 content blocks allowed')
    .refine(
      (blocks) => {
        const orders = blocks.map(b => b.order);
        return new Set(orders).size === orders.length;
      },
      { message: 'Block orders must be unique' }
    ),
  seo: seoMetadataSchema,
  published: z.boolean(),
  version: z.number().int().min(1),
  lastPublishedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
}).strict();

// Type assertions for runtime type safety
export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type SEOMetadata = z.infer<typeof seoMetadataSchema>;
export type WebsiteContent = z.infer<typeof websiteContentSchema>;