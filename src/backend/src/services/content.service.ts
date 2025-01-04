/**
 * @fileoverview Content service implementing website content management with caching,
 * validation, versioning, and performance optimizations.
 * @version 1.0.0
 */

import { Types } from 'mongoose'; // v6.0.0
import { createClient } from 'redis'; // v4.0.0
import NodeCache from 'node-cache'; // v5.1.2
import WebsiteContent from '../models/mongodb/content.model';
import { IWebsiteContent, IContentBlock, ISEOMetadata, ContentBlockType } from '../interfaces/content.interface';
import { ContentValidator } from '../validators/content.validator';
import { ERROR_MESSAGES, ERROR_TYPES, HTTP_STATUS } from '../constants/error.constants';

/**
 * Service class for managing website content with enhanced features
 * Implements caching, validation, and versioning support
 */
export class ContentService {
  private readonly cache: NodeCache;
  private readonly redisClient;
  private readonly validator: ContentValidator;
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'content:';

  constructor() {
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL, checkperiod: 120 });
    this.redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
      }
    });
    this.validator = new ContentValidator();
    this.initializeRedis();
  }

  /**
   * Initializes Redis connection with error handling
   * @private
   */
  private async initializeRedis(): Promise<void> {
    try {
      await this.redisClient.connect();
      this.redisClient.on('error', (error) => {
        console.error('Redis connection error:', error);
      });
    } catch (error) {
      console.error('Redis initialization failed:', error);
    }
  }

  /**
   * Retrieves website content for a specific restaurant with caching
   * @param restaurantId - Restaurant identifier
   * @returns Promise resolving to website content
   */
  public async getContentByRestaurantId(restaurantId: string): Promise<IWebsiteContent> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${restaurantId}`;
      
      // Check local cache
      const localCached = this.cache.get<IWebsiteContent>(cacheKey);
      if (localCached) return localCached;

      // Check Redis cache
      const redisCached = await this.redisClient.get(cacheKey);
      if (redisCached) {
        const content = JSON.parse(redisCached);
        this.cache.set(cacheKey, content);
        return content;
      }

      // Database query
      const content = await WebsiteContent.findOne({ restaurantId }).lean();
      if (!content) {
        throw new Error(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      }

      // Update caches
      await this.updateCaches(cacheKey, content);
      return content;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Creates new website content with validation
   * @param contentData - Website content data
   * @returns Promise resolving to created content
   */
  public async createContent(contentData: Partial<IWebsiteContent>): Promise<IWebsiteContent> {
    try {
      // Validate restaurant ID
      if (!Types.ObjectId.isValid(contentData.restaurantId)) {
        throw new Error('Invalid restaurant ID');
      }

      // Validate content blocks
      if (contentData.blocks) {
        await this.validator.validateBlocks(contentData.blocks);
      }

      // Validate SEO metadata
      if (contentData.seo) {
        await this.validator.validateSEO(contentData.seo);
      }

      // Initialize version and status
      const initialContent: Partial<IWebsiteContent> = {
        ...contentData,
        version: 1,
        published: false,
        lastPublishedAt: null
      };

      const content = await WebsiteContent.create(initialContent);
      return content.toObject();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Updates content with version tracking
   * @param restaurantId - Restaurant identifier
   * @param updateData - Content update data
   * @returns Promise resolving to updated content
   */
  public async updateContent(
    restaurantId: string,
    updateData: Partial<IWebsiteContent>
  ): Promise<IWebsiteContent> {
    try {
      const existingContent = await WebsiteContent.findOne({ restaurantId });
      if (!existingContent) {
        throw new Error(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      }

      // Validate updates
      if (updateData.blocks) {
        await this.validator.validateBlocks(updateData.blocks);
      }
      if (updateData.seo) {
        await this.validator.validateSEO(updateData.seo);
      }

      // Increment version
      const updatedContent = await WebsiteContent.findOneAndUpdate(
        { restaurantId },
        {
          ...updateData,
          version: existingContent.version + 1,
          updatedAt: new Date()
        },
        { new: true }
      ).lean();

      // Invalidate caches
      await this.invalidateCaches(restaurantId);
      return updatedContent;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Manages content publishing workflow
   * @param restaurantId - Restaurant identifier
   * @param publish - Publishing flag
   * @returns Promise resolving to updated content
   */
  public async publishContent(restaurantId: string, publish: boolean): Promise<IWebsiteContent> {
    try {
      const content = await WebsiteContent.findOneAndUpdate(
        { restaurantId },
        {
          published: publish,
          lastPublishedAt: publish ? new Date() : null
        },
        { new: true }
      ).lean();

      if (!content) {
        throw new Error(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      }

      // Invalidate caches
      await this.invalidateCaches(restaurantId);
      return content;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Deletes content with cleanup
   * @param restaurantId - Restaurant identifier
   * @returns Promise resolving to deletion status
   */
  public async deleteContent(restaurantId: string): Promise<boolean> {
    try {
      const result = await WebsiteContent.deleteOne({ restaurantId });
      if (result.deletedCount === 0) {
        throw new Error(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      }

      // Cleanup caches
      await this.invalidateCaches(restaurantId);
      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Updates both local and Redis caches
   * @private
   */
  private async updateCaches(key: string, content: IWebsiteContent): Promise<void> {
    this.cache.set(key, content);
    await this.redisClient.setEx(key, this.CACHE_TTL, JSON.stringify(content));
  }

  /**
   * Invalidates content in both caches
   * @private
   */
  private async invalidateCaches(restaurantId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${restaurantId}`;
    this.cache.del(cacheKey);
    await this.redisClient.del(cacheKey);
  }

  /**
   * Standardized error handling
   * @private
   */
  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(ERROR_MESSAGES.SERVER_ERROR);
  }
}

export default new ContentService();