import { MigrationInterface, QueryRunner } from 'typeorm'; // v0.3.0
import { UserRole } from '../../interfaces/auth.interface';
import { RestaurantStatus } from '../../interfaces/restaurant.interface';

export class InitialSchema1677721600 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension for secure primary keys
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enum types
    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM ('${UserRole.OWNER}', '${UserRole.MANAGER}', '${UserRole.STAFF}');
      CREATE TYPE restaurant_status AS ENUM ('${RestaurantStatus.ACTIVE}', '${RestaurantStatus.INACTIVE}', '${RestaurantStatus.SUSPENDED}');
    `);

    // Create users table with comprehensive security features
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role user_role NOT NULL,
        mfa_enabled BOOLEAN NOT NULL DEFAULT false,
        last_password_change TIMESTAMP WITH TIME ZONE,
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
      );

      -- Create index for email lookups during authentication
      CREATE INDEX idx_users_email ON users USING btree (email);

      -- Enable Row Level Security on users table
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies for users table
      CREATE POLICY users_owner_access ON users
        USING (role = '${UserRole.OWNER}'::user_role)
        WITH CHECK (role = '${UserRole.OWNER}'::user_role);
      
      CREATE POLICY users_self_access ON users
        USING (current_user = email)
        WITH CHECK (current_user = email);
    `);

    // Create restaurants table with multi-location support
    await queryRunner.query(`
      CREATE TABLE restaurants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) NOT NULL UNIQUE,
        status restaurant_status NOT NULL DEFAULT '${RestaurantStatus.ACTIVE}',
        settings JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_modified_by UUID REFERENCES users(id),
        CONSTRAINT domain_format CHECK (domain ~* '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.[a-z]{2,}$'),
        CONSTRAINT name_length CHECK (char_length(name) >= 2)
      );

      -- Create indices for common query patterns
      CREATE UNIQUE INDEX idx_restaurants_domain ON restaurants USING btree (domain);
      CREATE INDEX idx_restaurants_owner ON restaurants USING btree (owner_id);
      CREATE INDEX idx_restaurants_active_status ON restaurants USING btree (status) WHERE status = '${RestaurantStatus.ACTIVE}';

      -- Enable Row Level Security on restaurants table
      ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies for restaurants table
      CREATE POLICY restaurants_owner_access ON restaurants
        USING (owner_id IN (SELECT id FROM users WHERE role = '${UserRole.OWNER}'::user_role))
        WITH CHECK (owner_id IN (SELECT id FROM users WHERE role = '${UserRole.OWNER}'::user_role));
      
      CREATE POLICY restaurants_manager_access ON restaurants
        USING (id IN (
          SELECT restaurant_id FROM restaurant_staff 
          WHERE user_id IN (SELECT id FROM users WHERE role = '${UserRole.MANAGER}'::user_role)
        ));
    `);

    // Create function for automatic timestamp updates
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Create triggers for automatic timestamp updates
      CREATE TRIGGER update_users_timestamp
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();

      CREATE TRIGGER update_restaurants_timestamp
        BEFORE UPDATE ON restaurants
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_restaurants_timestamp ON restaurants;
      DROP TRIGGER IF EXISTS update_users_timestamp ON users;
      DROP FUNCTION IF EXISTS update_updated_at();
    `);

    // Drop RLS policies
    await queryRunner.query(`
      DROP POLICY IF EXISTS restaurants_manager_access ON restaurants;
      DROP POLICY IF EXISTS restaurants_owner_access ON restaurants;
      DROP POLICY IF EXISTS users_self_access ON users;
      DROP POLICY IF EXISTS users_owner_access ON users;
    `);

    // Drop tables with CASCADE to handle dependencies
    await queryRunner.query(`
      DROP TABLE IF EXISTS restaurants CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Drop custom types
    await queryRunner.query(`
      DROP TYPE IF EXISTS restaurant_status;
      DROP TYPE IF EXISTS user_role;
    `);

    // Disable UUID extension if not needed by other parts
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}