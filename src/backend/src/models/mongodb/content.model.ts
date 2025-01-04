import { Schema, model, Document } from 'mongoose'; // v6.0.0
import { 
  IWebsiteContent, 
  IContentBlock, 
  ISEOMetadata,
  ContentBlockType 
} from '../../interfaces/content.interface';

/**
 * Schema definition for content blocks with enhanced validation
 * Implements restaurant-specific components with strict type checking
 */
const ContentBlockSchema = new Schema<IContentBlock>({
  type: {
    type: String,
    required: [true, 'Content block type is required'],
    enum: {
      values: Object.values(ContentBlockType),
      message: 'Invalid content block type'
    },
    index: true
  },
  content: {
    type: Schema.Types.Mixed,
    required: [true, 'Content block data is required'],
    validate: {
      validator: function(v: unknown) {
        return v !== null && typeof v === 'object';
      },
      message: 'Content must be a valid object structure'
    }
  },
  order: {
    type: Number,
    required: [true, 'Block order is required'],
    min: [0, 'Order must be a non-negative number'],
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
});

/**
 * Schema definition for SEO metadata with validation rules
 * Implements best practices for restaurant website SEO
 */
const SEOMetadataSchema = new Schema<ISEOMetadata>({
  title: {
    type: String,
    required: [true, 'SEO title is required'],
    trim: true,
    maxlength: [60, 'SEO title cannot exceed 60 characters'],
    minlength: [10, 'SEO title must be at least 10 characters']
  },
  description: {
    type: String,
    required: [true, 'SEO description is required'],
    trim: true,
    maxlength: [160, 'SEO description cannot exceed 160 characters'],
    minlength: [50, 'SEO description must be at least 50 characters']
  },
  keywords: {
    type: [String],
    required: [true, 'SEO keywords are required'],
    validate: [
      {
        validator: Array.isArray,
        message: 'Keywords must be an array'
      },
      {
        validator: function(v: string[]) {
          return v.length <= 10;
        },
        message: 'Maximum 10 keywords allowed'
      }
    ]
  },
  ogImage: {
    type: String,
    required: [true, 'Open Graph image is required'],
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid Open Graph image URL'
    }
  }
});

/**
 * Main schema for website content with versioning support
 * Implements optimized indexes and validation for restaurant websites
 */
const WebsiteContentSchema = new Schema<IWebsiteContent>({
  restaurantId: {
    type: String,
    required: [true, 'Restaurant ID is required'],
    index: true
  },
  blocks: {
    type: [ContentBlockSchema],
    required: [true, 'Content blocks are required'],
    validate: [
      {
        validator: Array.isArray,
        message: 'Blocks must be an array'
      },
      {
        validator: function(v: IContentBlock[]) {
          return v.length > 0;
        },
        message: 'At least one content block is required'
      }
    ]
  },
  seo: {
    type: SEOMetadataSchema,
    required: [true, 'SEO metadata is required']
  },
  published: {
    type: Boolean,
    default: false,
    index: true
  },
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be greater than 0'],
    index: true
  },
  lastPublishedAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      return ret;
    }
  }
});

// Compound indexes for optimized queries
WebsiteContentSchema.index({ restaurantId: 1, version: 1 });
WebsiteContentSchema.index({ restaurantId: 1, published: 1 });

// Pre-save middleware to ensure block order integrity
WebsiteContentSchema.pre('save', function(next) {
  if (this.isModified('blocks')) {
    this.blocks.sort((a, b) => a.order - b.order);
  }
  next();
});

// Create and export the model
const WebsiteContent = model<IWebsiteContent>('WebsiteContent', WebsiteContentSchema);

export default WebsiteContent;