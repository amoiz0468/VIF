BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

DO $$
BEGIN
    CREATE TYPE claim_status AS ENUM ('pending', 'collected', 'ghosted');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE shops
    ADD COLUMN IF NOT EXISTS inventory_costs JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE pulses
    ADD COLUMN IF NOT EXISTS item_name TEXT,
    ADD COLUMN IF NOT EXISTS is_donation BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE claims
    ADD COLUMN IF NOT EXISTS shop_id UUID,
    ADD COLUMN IF NOT EXISTS qr_token TEXT,
    ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ;

ALTER TABLE claims
    ADD CONSTRAINT claims_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;

ALTER TABLE claims
    ADD CONSTRAINT claims_qr_token_key UNIQUE (qr_token);

CREATE TABLE IF NOT EXISTS student_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location geography(POINT,4326) NOT NULL,
    push_token TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_locations_verified ON student_locations (is_verified);
CREATE INDEX IF NOT EXISTS idx_student_locations_geography ON student_locations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_pulses_shop_id ON pulses (shop_id);
CREATE INDEX IF NOT EXISTS idx_claims_shop_status ON claims (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_qr_token ON claims (qr_token);
CREATE INDEX IF NOT EXISTS idx_tax_reports_shop_period ON tax_reports (shop_id, year, month);

COMMIT;
