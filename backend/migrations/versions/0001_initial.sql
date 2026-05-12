-- Initial migration: create extensions, types, tables, indexes
-- Run in a transaction
BEGIN;

-- extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('student','shopkeeper');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pulse_type') THEN
    CREATE TYPE pulse_type AS ENUM ('donation','wholesale');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_status') THEN
    CREATE TYPE claim_status AS ENUM ('pending','collected','ghosted');
  END IF;
END$$;

-- users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL,
  karma_score INTEGER NOT NULL DEFAULT 0,
  student_id_verified BOOLEAN NOT NULL DEFAULT FALSE,
  student_id_document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- shops
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  siret VARCHAR(14) UNIQUE NOT NULL,
  address TEXT,
  location geography(POINT,4326),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shops_location_gist ON shops USING GIST(location);

-- pulses
CREATE TABLE IF NOT EXISTS pulses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  type pulse_type NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  available_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pulses_shop_id ON pulses(shop_id);
CREATE INDEX IF NOT EXISTS idx_pulses_expires_at ON pulses(expires_at);

-- claims
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pulse_id UUID NOT NULL REFERENCES pulses(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  status claim_status NOT NULL DEFAULT 'pending',
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  qr_scanned_at TIMESTAMP WITH TIME ZONE,
  ghosted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claims_pulse_id ON claims(pulse_id);
CREATE INDEX IF NOT EXISTS idx_claims_student_user_id ON claims(student_user_id);
CREATE INDEX IF NOT EXISTS idx_claims_expires_at ON claims(expires_at);

-- tax_reports
CREATE TABLE IF NOT EXISTS tax_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_donated_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  items_count INTEGER NOT NULL DEFAULT 0,
  cerfa_payload JSONB,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (shop_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_tax_reports_shop_year_month ON tax_reports(shop_id, year, month);

COMMIT;
