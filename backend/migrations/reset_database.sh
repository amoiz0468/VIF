#!/usr/bin/env bash
set -euo pipefail

# Reset the Vif schema objects created by the migration.
# WARNING: This will DROP TABLES and TYPES and cannot be undone.
# Usage:
#   export DATABASE_URL="postgresql://user:pass@host:port/dbname"
#   bash backend/migrations/reset_database.sh

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Export it and re-run."
  exit 1
fi

echo "Resetting database objects listed in migrations/versions/0001_initial.sql"

psql "$DATABASE_URL" <<'SQL'
BEGIN;
-- Drop tables if they exist (order matters because of FKs)
DROP TABLE IF EXISTS tax_reports CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS pulses CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop enum types if they exist
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_status') THEN DROP TYPE claim_status; END IF; END$$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pulse_type') THEN DROP TYPE pulse_type; END IF; END$$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN DROP TYPE user_role; END IF; END$$;

-- Optionally drop extensions (only if you created them for this DB)
-- DROP EXTENSION IF EXISTS postgis;
-- DROP EXTENSION IF EXISTS "uuid-ossp";

COMMIT;
SQL

echo "Reset complete. Re-run migrations to recreate schema."
