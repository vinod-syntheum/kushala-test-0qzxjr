import { Types } from 'mongoose'; // v6.0.0
import RedisMock from 'redis-mock'; // v0.56.3
import NodeCache from 'node-cache'; // v5.1.2
import ContentService from '../../../src/services/content.service';
import WebsiteContent from '../../../src/models/mongodb/content.model';
import { ContentBlockType, IWebsiteContent } from '../../../src/interfaces/content.interface';
import { ERROR_MESSAGES } from '../../../src/constants/error.constants';

// Mock dependencies
jest.mock('../../../src/models/mongodb/content.model');
jest.mock('redis', () => RedisMock);

describe('ContentService Unit Tests', () => {
  let contentService: ContentService;
  let mockWebsiteContent: Partial<IWebsiteContent>;

  beforeAll(() => {
    // Initialize test timeouts
    jest.setTimeout(10000);
  });

  beforeEach(() => {
    // Reset mocks and initialize service
    jest.clearAllMocks();
    contentService = new ContentService();

    // Setup test data
    mockWebsiteContent = {
      restaurantId: new Types.ObjectId().toString(),
      blocks: [
        {
          type: ContentBlockType.HEADER,
          content: {
            title: 'Test Restaurant',
            subtitle: 'Best Food in Town'
          },
          order: 0,
          isActive: true
        }
      ],
      seo: {
        title: 'Test Restaurant | Best Food',
        description: 'Experience the finest dining at Test Restaurant with our award-winning cuisine',
        keywords: ['restaurant', 'fine dining', 'test'],
        ogImage: 'https://example.com/image.jpg'
      },
      published: false,
      version: 1,
      lastPublishedAt: null
    };
  });

  describe('Service Initialization', () => {
    it('should initialize service with cache and Redis client', () => {
      expect(contentService).toBeDefined();
      expect(contentService['cache']).toBeInstanceOf(NodeCache);
      expect(contentService['redisClient']).toBeDefined();
    });

    it('should handle Redis connection errors gracefully', async () => {
      const mockError = new Error('Redis connection failed');
      jest.spyOn(contentService['redisClient'], 'connect').mockRejectedValueOnce(mockError);
      
      await expect(contentService['initializeRedis']()).resolves.not.toThrow();
    });
  });

  describe('getContentByRestaurantId', () => {
    const restaurantId = new Types.ObjectId().toString();
    const cacheKey = `content:${restaurantId}`;

    it('should return content from local cache if available', async () => {
      // Setup local cache hit
      contentService['cache'].set(cacheKey, mockWebsiteContent);
      
      const result = await contentService.getContentByRestaurantId(restaurantId);
      
      expect(result).toEqual(mockWebsiteContent);
      expect(WebsiteContent.findOne).not.toHaveBeenCalled();
    });

    it('should return content from Redis cache if local cache misses', async () => {
      // Setup Redis cache hit
      await contentService['redisClient'].set(cacheKey, JSON.stringify(mockWebsiteContent));
      
      const result = await contentService.getContentByRestaurantId(restaurantId);
      
      expect(result).toEqual(mockWebsiteContent);
      expect(WebsiteContent.findOne).not.toHaveBeenCalled();
      expect(contentService['cache'].get(cacheKey)).toEqual(mockWebsiteContent);
    });

    it('should fetch from database and update caches on cache miss', async () => {
      // Setup database response
      jest.spyOn(WebsiteContent, 'findOne').mockResolvedValueOnce({
        ...mockWebsiteContent,
        lean: () => mockWebsiteContent
      } as any);

      const result = await contentService.getContentByRestaurantId(restaurantId);

      expect(result).toEqual(mockWebsiteContent);
      expect(WebsiteContent.findOne).toHaveBeenCalledWith({ restaurantId });
      expect(contentService['cache'].get(cacheKey)).toEqual(mockWebsiteContent);
      expect(await contentService['redisClient'].get(cacheKey)).toBeDefined();
    });

    it('should throw error when content not found', async () => {
      jest.spyOn(WebsiteContent, 'findOne').mockResolvedValueOnce(null);

      await expect(contentService.getContentByRestaurantId(restaurantId))
        .rejects.toThrow(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
    });
  });

  describe('createContent', () => {
    it('should create new content with validation', async () => {
      jest.spyOn(WebsiteContent, 'create').mockResolvedValueOnce({
        ...mockWebsiteContent,
        toObject: () => mockWebsiteContent
      } as any);

      const result = await contentService.createContent(mockWebsiteContent);

      expect(result).toEqual(mockWebsiteContent);
      expect(WebsiteContent.create).toHaveBeenCalledWith({
        ...mockWebsiteContent,
        version: 1,
        published: false,
        lastPublishedAt: null
      });
    });

    it('should validate restaurant ID', async () => {
      const invalidContent = { ...mockWebsiteContent, restaurantId: 'invalid-id' };

      await expect(contentService.createContent(invalidContent))
        .rejects.toThrow('Invalid restaurant ID');
    });

    it('should validate content blocks', async () => {
      const invalidBlocks = [{
        type: 'INVALID_TYPE',
        content: {},
        order: 0,
        isActive: true
      }];

      await expect(contentService.createContent({
        ...mockWebsiteContent,
        blocks: invalidBlocks as any
      })).rejects.toThrow();
    });
  });

  describe('updateContent', () => {
    const restaurantId = new Types.ObjectId().toString();

    it('should update content and increment version', async () => {
      // Setup existing content mock
      jest.spyOn(WebsiteContent, 'findOne').mockResolvedValueOnce({
        ...mockWebsiteContent,
        version: 1
      } as any);

      // Setup update mock
      jest.spyOn(WebsiteContent, 'findOneAndUpdate').mockResolvedValueOnce({
        ...mockWebsiteContent,
        version: 2,
        lean: () => ({ ...mockWebsiteContent, version: 2 })
      } as any);

      const updateData = {
        blocks: [{
          type: ContentBlockType.MENU,
          content: { sections: [] },
          order: 1,
          isActive: true
        }]
      };

      const result = await contentService.updateContent(restaurantId, updateData);

      expect(result.version).toBe(2);
      expect(WebsiteContent.findOneAndUpdate).toHaveBeenCalledWith(
        { restaurantId },
        expect.objectContaining({
          ...updateData,
          version: 2
        }),
        { new: true }
      );
    });

    it('should invalidate caches after update', async () => {
      // Setup mocks
      jest.spyOn(WebsiteContent, 'findOne').mockResolvedValueOnce(mockWebsiteContent as any);
      jest.spyOn(WebsiteContent, 'findOneAndUpdate').mockResolvedValueOnce({
        ...mockWebsiteContent,
        lean: () => mockWebsiteContent
      } as any);

      // Pre-populate caches
      const cacheKey = `content:${restaurantId}`;
      contentService['cache'].set(cacheKey, mockWebsiteContent);
      await contentService['redisClient'].set(cacheKey, JSON.stringify(mockWebsiteContent));

      await contentService.updateContent(restaurantId, { published: true });

      expect(contentService['cache'].get(cacheKey)).toBeUndefined();
      expect(await contentService['redisClient'].get(cacheKey)).toBeNull();
    });
  });

  describe('publishContent', () => {
    const restaurantId = new Types.ObjectId().toString();

    it('should update publish status and timestamp', async () => {
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      jest.spyOn(WebsiteContent, 'findOneAndUpdate').mockResolvedValueOnce({
        ...mockWebsiteContent,
        published: true,
        lastPublishedAt: now,
        lean: () => ({
          ...mockWebsiteContent,
          published: true,
          lastPublishedAt: now
        })
      } as any);

      const result = await contentService.publishContent(restaurantId, true);

      expect(result.published).toBe(true);
      expect(result.lastPublishedAt).toEqual(now);
      expect(WebsiteContent.findOneAndUpdate).toHaveBeenCalledWith(
        { restaurantId },
        {
          published: true,
          lastPublishedAt: now
        },
        { new: true }
      );
    });

    it('should handle unpublish operation', async () => {
      jest.spyOn(WebsiteContent, 'findOneAndUpdate').mockResolvedValueOnce({
        ...mockWebsiteContent,
        published: false,
        lastPublishedAt: null,
        lean: () => ({
          ...mockWebsiteContent,
          published: false,
          lastPublishedAt: null
        })
      } as any);

      const result = await contentService.publishContent(restaurantId, false);

      expect(result.published).toBe(false);
      expect(result.lastPublishedAt).toBeNull();
    });
  });

  describe('deleteContent', () => {
    const restaurantId = new Types.ObjectId().toString();

    it('should delete content and clear caches', async () => {
      // Setup delete mock
      jest.spyOn(WebsiteContent, 'deleteOne').mockResolvedValueOnce({ deletedCount: 1 } as any);

      // Pre-populate caches
      const cacheKey = `content:${restaurantId}`;
      contentService['cache'].set(cacheKey, mockWebsiteContent);
      await contentService['redisClient'].set(cacheKey, JSON.stringify(mockWebsiteContent));

      const result = await contentService.deleteContent(restaurantId);

      expect(result).toBe(true);
      expect(contentService['cache'].get(cacheKey)).toBeUndefined();
      expect(await contentService['redisClient'].get(cacheKey)).toBeNull();
    });

    it('should throw error when content not found', async () => {
      jest.spyOn(WebsiteContent, 'deleteOne').mockResolvedValueOnce({ deletedCount: 0 } as any);

      await expect(contentService.deleteContent(restaurantId))
        .rejects.toThrow(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
    });
  });

  describe('Cache Operations', () => {
    it('should handle cache update failures gracefully', async () => {
      const cacheKey = 'test-key';
      jest.spyOn(contentService['redisClient'], 'setEx').mockRejectedValueOnce(new Error('Redis error'));

      await expect(contentService['updateCaches'](cacheKey, mockWebsiteContent))
        .resolves.not.toThrow();
    });

    it('should handle cache invalidation failures gracefully', async () => {
      const restaurantId = new Types.ObjectId().toString();
      jest.spyOn(contentService['redisClient'], 'del').mockRejectedValueOnce(new Error('Redis error'));

      await expect(contentService['invalidateCaches'](restaurantId))
        .resolves.not.toThrow();
    });
  });
});