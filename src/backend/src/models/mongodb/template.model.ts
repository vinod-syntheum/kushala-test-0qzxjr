import { Schema, model, Document } from 'mongoose'; // v6.0.0
import { ContentBlockType, IContentBlock } from '../../interfaces/content.interface';

/**
 * Interface for restaurant website template document with strict typing
 * Extends MongoDB Document for persistence capabilities
 */
export interface ITemplate extends Document {
  name: string;
  description: string;
  category: 'casual' | 'fine-dining' | 'cafe' | 'bistro';
  thumbnail: string;
  blocks: IContentBlock[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema definition for content blocks within templates
 * Enforces structure and validation for each block type
 */
const ContentBlockSchema = new Schema<IContentBlock>({
  type: {
    type: String,
    required: true,
    enum: Object.values(ContentBlockType),
    message: 'Invalid content block type'
  },
  content: {
    type: Schema.Types.Mixed,
    required: true
  },
  order: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

/**
 * Schema definition for restaurant website templates
 * Includes comprehensive validation and indexing for optimal performance
 */
const TemplateSchema = new Schema<ITemplate>({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Template description is required'],
    trim: true,
    maxlength: [500, 'Template description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Restaurant category is required'],
    enum: {
      values: ['casual', 'fine-dining', 'cafe', 'bistro'],
      message: 'Invalid restaurant category'
    },
    index: true
  },
  thumbnail: {
    type: String,
    required: [true, 'Template thumbnail URL is required'],
    validate: {
      validator: isValidUrl,
      message: 'Invalid thumbnail URL format'
    }
  },
  blocks: {
    type: [ContentBlockSchema],
    required: [true, 'Content blocks are required'],
    validate: {
      validator: validateBlocks,
      message: 'Invalid content blocks structure'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false
});

/**
 * Validates URL format using a comprehensive regex pattern
 * @param url - URL string to validate
 * @returns boolean indicating if URL is valid
 */
function isValidUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates content blocks array structure and ordering
 * @param blocks - Array of content blocks to validate
 * @returns boolean indicating if blocks are valid
 */
function validateBlocks(blocks: IContentBlock[]): boolean {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return false;
  }

  // Validate block order sequence
  const orders = blocks.map(block => block.order);
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    return false;
  }

  // Validate each block structure
  return blocks.every(block => {
    return (
      Object.values(ContentBlockType).includes(block.type) &&
      typeof block.order === 'number' &&
      block.order >= 0 &&
      typeof block.content === 'object' &&
      block.content !== null
    );
  });
}

// Create compound indexes for optimized queries
TemplateSchema.index({ name: 1, category: 1 });
TemplateSchema.index({ isActive: 1, category: 1 });

// Add static methods for common queries
TemplateSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

TemplateSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, isActive: true });
};

// Create and export the Template model
const Template = model<ITemplate>('Template', TemplateSchema);
export default Template;