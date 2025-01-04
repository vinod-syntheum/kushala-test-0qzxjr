import { MongoMemoryServer } from 'mongodb-memory-server'; // v8.0.0
import { connect, connection } from 'mongoose'; // v6.0.0
import ContentService from '../../src/services/content.service';
import WebsiteContent from '../../src/models/mongodb/content.model';
import { ContentBlockType, IWebsiteContent } from '../../src/interfaces/content.interface';
import { ERROR_MESSAGES } from '../../src/constants/error.constants';

describe('Content Service Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let contentService: ContentService;
  const mockRestaurantId = 'test-restaurant-id';

  // Mock valid content data
  const validContentBlock = {
    type: ContentBlockType.HEADER,
    content: {
      title: 'Test Restaurant',
      subtitle: 'Best Food in Town',
      backgroundImage: 'https://example.com/image.jpg'
    },
    order: 0,
    isActive: true
  };

  const validSEOData = {
    title: 'Test Restaurant - Best Food in Town',
    description: 'Experience the finest dining with our award-winning cuisine and exceptional service.',
    keywords: ['restaurant', 'fine dining', 'cuisine'],
    ogImage: 'https://example.com/og-image.jpg'
  };

  beforeAll(async () => {
    // Setup MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await connect(mongoUri);
    contentService = new ContentService();
  });

  afterAll(async () => {
    // Cleanup
    await connection.dropDatabase();
    await connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database before each test
    await WebsiteContent.deleteMany({});
  });

  describe('Content CRUD Operations', () => {
    test('should create new content with validation', async () => {
      const contentData = {
        restaurantId: mockRestaurantId,
        blocks: [validContentBlock],
        seo: validSEOData,
        published: false
      };

      const result = await contentService.createContent(contentData);

      expect(result).toBeDefined();
      expect(result.restaurantId).toBe(mockRestaurantId);
      expect(result.blocks).toHaveLength(1);
      expect(result.version).toBe(1);
      expect(result.published).toBe(false);
    });

    test('should retrieve content with caching', async () => {
      // Create initial content
      const contentData = {
        restaurantId: mockRestaurantId,
        blocks: [validContentBlock],
        seo: validSEOData,
        published: false
      };
      await contentService.createContent(contentData);

      // First retrieval - should hit database
      const firstFetch = await contentService.getContentByRestaurantId(mockRestaurantId);
      expect(firstFetch).toBeDefined();

      // Second retrieval - should hit cache
      const secondFetch = await contentService.getContentByRestaurantId(mockRestaurantId);
      expect(secondFetch).toEqual(firstFetch);
    });

    test('should update content with version tracking', async () => {
      // Create initial content
      const initialContent = await contentService.createContent({
        restaurantId: mockRestaurantId,
        blocks: [validContentBlock],
        seo: validSEOData,
        published: false
      });

      const updateData = {
        blocks: [
          {
            ...validContentBlock,
            content: {
              ...validContentBlock.content,
              title: 'Updated Restaurant'
            }
          }
        ]
      };

      const updatedContent = await contentService.updateContent(
        mockRestaurantId,
        updateData
      );

      expect(updatedContent.version).toBe(initialContent.version + 1);
      expect(updatedContent.blocks[0].content.title).toBe('Updated Restaurant');
    });

    test('should delete content with cleanup', async () => {
      // Create content
      await contentService.createContent({
        restaurantId: mockRestaurantId,
        blocks: [validContentBlock],
        seo: validSEOData,
        published: false
      });

      // Delete content
      const result = await contentService.deleteContent(mockRestaurantId);
      expect(result).toBe(true);

      // Verify deletion
      await expect(
        contentService.getContentByRestaurantId(mockRestaurantId)
      ).rejects.toThrow(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
    });
  });

  describe('Content Security Validation', () => {
    test('should prevent XSS in content blocks', async () => {
      const maliciousContent = {
        restaurantId: mockRestaurantId,
        blocks: [{
          ...validContentBlock,
          content: {
            title: '<script>alert("xss")</script>Test',
            subtitle: 'Clean subtitle'
          }
        }],
        seo: validSEOData,
        published: false
      };

      const result = await contentService.createContent(maliciousContent);
      expect(result.blocks[0].content.title).not.toContain('<script>');
    });

    test('should validate image URLs', async () => {
      const invalidContent = {
        restaurantId: mockRestaurantId,
        blocks: [{
          ...validContentBlock,
          content: {
            title: 'Test Restaurant',
            backgroundImage: 'invalid-url'
          }
        }],
        seo: validSEOData,
        published: false
      };

      await expect(
        contentService.createContent(invalidContent)
      ).rejects.toThrow();
    });

    test('should enforce content size limits', async () => {
      const oversizedContent = {
        restaurantId: mockRestaurantId,
        blocks: Array(21).fill(validContentBlock), // Exceeds 20 block limit
        seo: validSEOData,
        published: false
      };

      await expect(
        contentService.createContent(oversizedContent)
      ).rejects.toThrow();
    });
  });

  describe('Performance and Caching', () => {
    test('should handle concurrent operations', async () => {
      const operations = Array(5).fill(null).map(() => 
        contentService.createContent({
          restaurantId: `${mockRestaurantId}-${Math.random()}`,
          blocks: [validContentBlock],
          seo: validSEOData,
          published: false
        })
      );

      const results = await Promise.all(operations);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.version).toBe(1);
      });
    });

    test('should maintain cache consistency after updates', async () => {
      // Create initial content
      const content = await contentService.createContent({
        restaurantId: mockRestaurantId,
        blocks: [validContentBlock],
        seo: validSEOData,
        published: false
      });

      // First read - cache miss
      const firstRead = await contentService.getContentByRestaurantId(mockRestaurantId);

      // Update content
      await contentService.updateContent(mockRestaurantId, {
        blocks: [{ ...validContentBlock, order: 1 }]
      });

      // Second read - should get updated content
      const secondRead = await contentService.getContentByRestaurantId(mockRestaurantId);
      expect(secondRead.version).toBe(firstRead.version + 1);
      expect(secondRead.blocks[0].order).toBe(1);
    });

    test('should handle large content blocks efficiently', async () => {
      const largeContent = {
        restaurantId: mockRestaurantId,
        blocks: Array(20).fill(null).map((_, index) => ({
          ...validContentBlock,
          order: index,
          content: {
            ...validContentBlock.content,
            description: 'A'.repeat(1000) // Large content
          }
        })),
        seo: validSEOData,
        published: false
      };

      const startTime = Date.now();
      const result = await contentService.createContent(largeContent);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.blocks).toHaveLength(20);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid restaurant ID', async () => {
      await expect(
        contentService.getContentByRestaurantId('invalid-id')
      ).rejects.toThrow();
    });

    test('should handle invalid content structure', async () => {
      const invalidContent = {
        restaurantId: mockRestaurantId,
        blocks: [{ 
          type: 'INVALID_TYPE',
          content: {},
          order: 0
        }],
        seo: validSEOData,
        published: false
      };

      await expect(
        contentService.createContent(invalidContent as any)
      ).rejects.toThrow();
    });

    test('should handle concurrent updates gracefully', async () => {
      // Create initial content
      await contentService.createContent({
        restaurantId: mockRestaurantId,
        blocks: [validContentBlock],
        seo: validSEOData,
        published: false
      });

      // Attempt concurrent updates
      const updates = Array(3).fill(null).map((_, index) => 
        contentService.updateContent(mockRestaurantId, {
          blocks: [{ ...validContentBlock, order: index }]
        })
      );

      const results = await Promise.allSettled(updates);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThan(0);
    });
  });
});