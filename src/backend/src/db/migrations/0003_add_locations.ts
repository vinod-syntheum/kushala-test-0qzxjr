import { MigrationInterface, QueryRunner } from "typeorm";
import { LocationStatus } from "../../interfaces/location.interface";

/**
 * Migration to create locations table with spatial capabilities, security policies,
 * and proper relationships for multi-location restaurant management
 * 
 * @version 1.0.0
 * @implements {MigrationInterface}
 */
export class AddLocations1677900000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable PostGIS extension for spatial capabilities
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

        // Create locations table with comprehensive schema
        await queryRunner.query(`
            CREATE TABLE locations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                restaurant_id UUID NOT NULL,
                name VARCHAR(255) NOT NULL,
                address JSONB NOT NULL CHECK (jsonb_typeof(address) = 'object'),
                coordinates GEOMETRY(Point, 4326) NOT NULL,
                operating_hours JSONB NOT NULL CHECK (jsonb_typeof(operating_hours) = 'object'),
                phone VARCHAR(50),
                email VARCHAR(255),
                status VARCHAR(20) NOT NULL CHECK (status IN ('${LocationStatus.ACTIVE}', '${LocationStatus.INACTIVE}', '${LocationStatus.TEMPORARILY_CLOSED}')),
                is_primary BOOLEAN NOT NULL DEFAULT false,
                timezone VARCHAR(100) NOT NULL,
                features JSONB DEFAULT '[]'::jsonb CHECK (jsonb_typeof(features) = 'array'),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) 
                    REFERENCES restaurants(id) ON DELETE CASCADE
            );
        `);

        // Create spatial index for efficient location queries
        await queryRunner.query(`
            CREATE INDEX idx_locations_coordinates 
            ON locations USING GIST (coordinates);
        `);

        // Create index on restaurant_id for relationship queries
        await queryRunner.query(`
            CREATE INDEX idx_locations_restaurant_id 
            ON locations(restaurant_id);
        `);

        // Ensure only one primary location per restaurant
        await queryRunner.query(`
            CREATE UNIQUE INDEX idx_locations_primary 
            ON locations(restaurant_id) 
            WHERE is_primary = true;
        `);

        // Limit to maximum 3 locations per restaurant
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION check_location_limit()
            RETURNS TRIGGER AS $$
            BEGIN
                IF (SELECT COUNT(*) FROM locations WHERE restaurant_id = NEW.restaurant_id) >= 3 THEN
                    RAISE EXCEPTION 'Maximum of 3 locations per restaurant allowed';
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE TRIGGER enforce_location_limit
            BEFORE INSERT ON locations
            FOR EACH ROW
            EXECUTE FUNCTION check_location_limit();
        `);

        // Add updated_at trigger
        await queryRunner.query(`
            CREATE TRIGGER update_locations_timestamp
            BEFORE UPDATE ON locations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `);

        // Add RLS policy for location access control
        await queryRunner.query(`
            ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
        `);

        await queryRunner.query(`
            CREATE POLICY location_restaurant_access ON locations
            FOR ALL
            USING (restaurant_id IN (
                SELECT id FROM restaurants 
                WHERE user_id = current_user_id()
            ));
        `);

        // Add location reference to events table
        await queryRunner.query(`
            ALTER TABLE events 
            ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            CREATE INDEX idx_events_location_id ON events(location_id);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove location reference from events
        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_events_location_id;
        `);

        await queryRunner.query(`
            ALTER TABLE events DROP COLUMN IF EXISTS location_id;
        `);

        // Remove locations table and related objects
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS enforce_location_limit ON locations;
        `);

        await queryRunner.query(`
            DROP FUNCTION IF EXISTS check_location_limit;
        `);

        await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_locations_timestamp ON locations;
        `);

        await queryRunner.query(`
            DROP POLICY IF EXISTS location_restaurant_access ON locations;
        `);

        await queryRunner.query(`
            DROP TABLE IF EXISTS locations;
        `);

        // Note: We don't disable PostGIS as other tables might need it
    }
}