-- Add SIRET column for shopkeeper verification
BEGIN;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS siret VARCHAR(14) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_siret ON users(siret);

COMMIT;
