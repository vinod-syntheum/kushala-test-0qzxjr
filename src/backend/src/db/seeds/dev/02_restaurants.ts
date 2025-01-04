/**
 * Restaurant Development Seed File
 * Version: 1.0.0
 * 
 * Provides comprehensive test data for restaurant entities with various configurations
 * and settings for development and testing purposes.
 */

import { Knex } from 'knex'; // v2.4.0
import { IRestaurant, IRestaurantSettings, RestaurantStatus } from '../../interfaces/restaurant.interface';

/**
 * Sample restaurant data with varying configurations to test different scenarios
 */
const SAMPLE_RESTAURANTS: Array<Partial<IRestaurant>> = [
  {
    id: '1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
    ownerId: '1', // Will be replaced with actual user ID during seeding
    name: 'The Rustic Kitchen',
    domain: 'rustickitchen.test',
    status: RestaurantStatus.ACTIVE,
    settings: {
      timezone: 'America/New_York',
      currency: 'USD',
      enableEvents: true,
      enableOnlinePresence: true,
      maxLocations: 3
    }
  },
  {
    id: '2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
    ownerId: '2', // Will be replaced with actual user ID during seeding
    name: 'Sushi Master',
    domain: 'sushimaster.test',
    status: RestaurantStatus.ACTIVE,
    settings: {
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      enableEvents: true,
      enableOnlinePresence: true,
      maxLocations: 2
    }
  },
  {
    id: '3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
    ownerId: '3', // Will be replaced with actual user ID during seeding
    name: 'Café Parisienne',
    domain: 'cafeparisienne.test',
    status: RestaurantStatus.PENDING,
    settings: {
      timezone: 'Europe/Paris',
      currency: 'EUR',
      enableEvents: false,
      enableOnlinePresence: true,
      maxLocations: 1
    }
  },
  {
    id: '4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s',
    ownerId: '1', // Will be replaced with actual user ID during seeding
    name: 'Pizza Express',
    domain: 'pizzaexpress.test',
    status: RestaurantStatus.INACTIVE,
    settings: {
      timezone: 'America/Chicago',
      currency: 'USD',
      enableEvents: false,
      enableOnlinePresence: false,
      maxLocations: 1
    }
  }
];

/**
 * Seeds the restaurants table with development data
 * @param knex - Knex instance
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Clean the restaurants table
    await knex('restaurants').del();

    // Get available user IDs from the users table
    const users = await knex('users').select('id');
    
    if (users.length === 0) {
      throw new Error('No users found in the database. Please seed users first.');
    }

    // Map sample restaurants to available user IDs
    const restaurantsToInsert = SAMPLE_RESTAURANTS.map((restaurant, index) => ({
      ...restaurant,
      ownerId: users[index % users.length].id, // Distribute restaurants among available users
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Insert the restaurants
    await knex('restaurants').insert(restaurantsToInsert);

    // Update the sequence if using PostgreSQL
    if (knex.client.config.client === 'postgresql') {
      await knex.raw("SELECT setval('restaurants_id_seq', (SELECT MAX(id) FROM restaurants));");
    }

    console.log('Restaurant seed completed successfully');
  } catch (error) {
    console.error('Error seeding restaurants:', error);
    throw error;
  }
}

/**
 * Cleans up the restaurants table
 * @param knex - Knex instance
 */
export async function cleanup(knex: Knex): Promise<void> {
  try {
    await knex('restaurants').del();
    
    // Reset sequence if using PostgreSQL
    if (knex.client.config.client === 'postgresql') {
      await knex.raw("ALTER SEQUENCE restaurants_id_seq RESTART WITH 1;");
    }
    
    console.log('Restaurant cleanup completed successfully');
  } catch (error) {
    console.error('Error cleaning up restaurants:', error);
    throw error;
  }
}

export default { seed };