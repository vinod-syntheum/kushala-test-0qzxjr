import { MigrationInterface, QueryRunner } from 'typeorm';
import { EventStatus } from '../../interfaces/event.interface';
import { TicketType, TicketStatus } from '../../interfaces/ticket.interface';

export class AddEventsTickets1677810000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create events table
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "restaurant_id" UUID NOT NULL,
        "location_id" UUID NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "capacity" INTEGER NOT NULL CHECK (capacity > 0),
        "status" VARCHAR(20) NOT NULL CHECK (status IN ('${EventStatus.DRAFT}', '${EventStatus.PUBLISHED}', '${EventStatus.CANCELLED}', '${EventStatus.COMPLETED}')),
        "image_url" TEXT,
        "timezone" VARCHAR(50) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_events_restaurant" FOREIGN KEY ("restaurant_id") 
          REFERENCES "restaurants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_events_location" FOREIGN KEY ("location_id") 
          REFERENCES "locations"("id") ON DELETE CASCADE,
        CONSTRAINT "check_event_dates" CHECK ("end_date" > "start_date")
      );
    `);

    // Create tickets table
    await queryRunner.query(`
      CREATE TABLE "tickets" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "event_id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "type" VARCHAR(20) NOT NULL CHECK (type IN ('${TicketType.GENERAL}', '${TicketType.VIP}', '${TicketType.EARLY_BIRD}')),
        "status" VARCHAR(20) NOT NULL CHECK (status IN ('${TicketStatus.AVAILABLE}', '${TicketStatus.SOLD}', '${TicketStatus.CANCELLED}')),
        "price" INTEGER NOT NULL CHECK (price >= 0),
        "payment_id" VARCHAR(100),
        "purchase_date" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_tickets_event" FOREIGN KEY ("event_id") 
          REFERENCES "events"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_tickets_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // Create indices for performance
    await queryRunner.query(`
      CREATE INDEX "idx_events_restaurant_dates" ON "events" ("restaurant_id", "start_date");
      CREATE INDEX "idx_events_status" ON "events" ("status");
      CREATE INDEX "idx_events_location" ON "events" ("location_id");
      CREATE INDEX "idx_tickets_event_status" ON "tickets" ("event_id", "status");
      CREATE INDEX "idx_tickets_user" ON "tickets" ("user_id");
    `);

    // Enable Row Level Security
    await queryRunner.query(`
      ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
    `);

    // Create RLS policies for events
    await queryRunner.query(`
      CREATE POLICY "events_restaurant_access" ON "events"
        USING (restaurant_id IN (
          SELECT id FROM restaurants WHERE user_id = current_user_id()
        ));
      
      CREATE POLICY "events_public_view" ON "events"
        FOR SELECT
        USING (status = '${EventStatus.PUBLISHED}');
    `);

    // Create RLS policies for tickets
    await queryRunner.query(`
      CREATE POLICY "tickets_user_access" ON "tickets"
        USING (
          user_id = current_user_id()
          OR 
          event_id IN (
            SELECT id FROM events WHERE restaurant_id IN (
              SELECT id FROM restaurants WHERE user_id = current_user_id()
            )
          )
        );
    `);

    // Create audit trigger function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION audit_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create audit triggers
    await queryRunner.query(`
      CREATE TRIGGER events_audit_timestamp
        BEFORE UPDATE ON "events"
        FOR EACH ROW
        EXECUTE FUNCTION audit_timestamp();

      CREATE TRIGGER tickets_audit_timestamp
        BEFORE UPDATE ON "tickets"
        FOR EACH ROW
        EXECUTE FUNCTION audit_timestamp();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS events_audit_timestamp ON "events";
      DROP TRIGGER IF EXISTS tickets_audit_timestamp ON "tickets";
      DROP FUNCTION IF EXISTS audit_timestamp();
    `);

    // Drop RLS policies
    await queryRunner.query(`
      DROP POLICY IF EXISTS "events_restaurant_access" ON "events";
      DROP POLICY IF EXISTS "events_public_view" ON "events";
      DROP POLICY IF EXISTS "tickets_user_access" ON "tickets";
    `);

    // Disable RLS
    await queryRunner.query(`
      ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
      ALTER TABLE "tickets" DISABLE ROW LEVEL SECURITY;
    `);

    // Drop indices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_events_restaurant_dates";
      DROP INDEX IF EXISTS "idx_events_status";
      DROP INDEX IF EXISTS "idx_events_location";
      DROP INDEX IF EXISTS "idx_tickets_event_status";
      DROP INDEX IF EXISTS "idx_tickets_user";
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events";`);
  }
}