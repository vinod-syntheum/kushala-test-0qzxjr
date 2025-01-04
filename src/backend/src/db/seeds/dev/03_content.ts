import { Knex } from 'knex'; // v2.5.0
import WebsiteContent from '../../../models/mongodb/content.model';
import { ContentBlockType } from '../../../interfaces/content.interface';
import { RestaurantModel } from '../../../models/postgresql/restaurant.model';

/**
 * Generates SEO-optimized sample content for a restaurant
 */
const generateSampleContent = async (restaurantId: string, details: any) => {
  const blocks = [
    // Header Block with branding and navigation
    {
      type: ContentBlockType.HEADER,
      content: {
        logo: 'https://storage.example.com/restaurants/default-logo.png',
        title: details.name,
        navigation: [
          { label: 'Home', link: '/' },
          { label: 'Menu', link: '/menu' },
          { label: 'Events', link: '/events' },
          { label: 'Contact', link: '/contact' }
        ],
        mobileBreakpoint: 768,
        stickyHeader: true
      },
      order: 0,
      isActive: true
    },

    // Menu Block with categorized items
    {
      type: ContentBlockType.MENU,
      content: {
        categories: [
          {
            name: 'Appetizers',
            items: [
              {
                name: 'Bruschetta',
                description: 'Fresh tomatoes, garlic, and basil on toasted bread',
                price: '12.99',
                image: 'https://storage.example.com/restaurants/menu/bruschetta.jpg'
              },
              {
                name: 'Calamari',
                description: 'Crispy fried squid with marinara sauce',
                price: '14.99',
                image: 'https://storage.example.com/restaurants/menu/calamari.jpg'
              }
            ]
          },
          {
            name: 'Main Courses',
            items: [
              {
                name: 'Grilled Salmon',
                description: 'Fresh Atlantic salmon with seasonal vegetables',
                price: '28.99',
                image: 'https://storage.example.com/restaurants/menu/salmon.jpg'
              },
              {
                name: 'Ribeye Steak',
                description: '12oz prime ribeye with garlic mashed potatoes',
                price: '34.99',
                image: 'https://storage.example.com/restaurants/menu/steak.jpg'
              }
            ]
          }
        ],
        layout: 'grid',
        showPrices: true,
        enableFilters: true
      },
      order: 1,
      isActive: true
    },

    // Gallery Block with optimized images
    {
      type: ContentBlockType.GALLERY,
      content: {
        images: [
          {
            url: 'https://storage.example.com/restaurants/gallery/interior-1.jpg',
            alt: 'Elegant dining room interior',
            caption: 'Our main dining area',
            width: 1200,
            height: 800
          },
          {
            url: 'https://storage.example.com/restaurants/gallery/food-1.jpg',
            alt: 'Signature dish presentation',
            caption: 'Chef\'s special creation',
            width: 1200,
            height: 800
          }
        ],
        layout: 'masonry',
        lightbox: true,
        lazyLoad: true
      },
      order: 2,
      isActive: true
    },

    // Contact Block with social integration
    {
      type: ContentBlockType.CONTACT,
      content: {
        address: '123 Restaurant Street, Foodville, FD 12345',
        phone: '+1 (555) 123-4567',
        email: 'info@restaurant.com',
        socialMedia: {
          facebook: 'https://facebook.com/restaurant',
          instagram: 'https://instagram.com/restaurant',
          twitter: 'https://twitter.com/restaurant'
        },
        mapEmbed: {
          latitude: 40.7128,
          longitude: -74.0060,
          zoom: 15
        },
        contactForm: {
          enabled: true,
          fields: ['name', 'email', 'message']
        }
      },
      order: 3,
      isActive: true
    },

    // Events Block with upcoming events
    {
      type: ContentBlockType.EVENTS,
      content: {
        upcomingEvents: [
          {
            title: 'Wine Tasting Evening',
            date: '2024-03-15T19:00:00Z',
            description: 'Join us for an evening of fine wines and appetizers',
            price: '45.00',
            image: 'https://storage.example.com/restaurants/events/wine-tasting.jpg'
          },
          {
            title: 'Chef\'s Table Experience',
            date: '2024-03-20T18:00:00Z',
            description: 'Exclusive 5-course tasting menu with wine pairings',
            price: '120.00',
            image: 'https://storage.example.com/restaurants/events/chefs-table.jpg'
          }
        ],
        layout: 'calendar',
        ticketing: {
          enabled: true,
          provider: 'stripe'
        }
      },
      order: 4,
      isActive: true
    },

    // Hours Block with special notes
    {
      type: ContentBlockType.HOURS,
      content: {
        regularHours: {
          monday: { open: '11:00', close: '22:00' },
          tuesday: { open: '11:00', close: '22:00' },
          wednesday: { open: '11:00', close: '22:00' },
          thursday: { open: '11:00', close: '23:00' },
          friday: { open: '11:00', close: '23:00' },
          saturday: { open: '10:00', close: '23:00' },
          sunday: { open: '10:00', close: '22:00' }
        },
        specialHours: [
          {
            date: '2024-12-24',
            hours: { open: '11:00', close: '20:00' },
            note: 'Christmas Eve - Early Closing'
          }
        ],
        timezone: 'America/New_York',
        displayFormat: '12h'
      },
      order: 5,
      isActive: true
    }
  ];

  return {
    restaurantId,
    blocks,
    seo: {
      title: `${details.name} - Fine Dining Restaurant`,
      description: `Experience exceptional cuisine at ${details.name}. We offer a sophisticated dining atmosphere with carefully crafted dishes using the finest ingredients.`,
      keywords: [
        'fine dining',
        'restaurant',
        details.name.toLowerCase(),
        'gourmet food',
        'fine cuisine',
        'dining experience',
        'reservations',
        'events',
        'wine tasting',
        'chef\'s table'
      ],
      ogImage: 'https://storage.example.com/restaurants/seo/main-image.jpg'
    },
    published: true,
    version: 1,
    lastPublishedAt: new Date()
  };
};

/**
 * Seeds initial website content for development restaurants
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Clear existing content
    await WebsiteContent.deleteMany({});

    // Get all restaurants from PostgreSQL
    const restaurants = await knex('restaurants')
      .select('id', 'name', 'domain')
      .where('status', 'ACTIVE');

    // Generate and insert content for each restaurant
    for (const restaurant of restaurants) {
      const content = await generateSampleContent(restaurant.id, restaurant);
      await WebsiteContent.create(content);
    }

    console.log(`Successfully seeded website content for ${restaurants.length} restaurants`);
  } catch (error) {
    console.error('Error seeding website content:', error);
    throw error;
  }
}

export default { seed };