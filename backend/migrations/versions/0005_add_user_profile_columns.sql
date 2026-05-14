-- Restore columns expected by the current auth/signup code
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS student_id_url VARCHAR,
  ADD COLUMN IF NOT EXISTS shop_name VARCHAR,
  ADD COLUMN IF NOT EXISTS shop_address VARCHAR;

COMMIT;
