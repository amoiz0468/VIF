-- Add hashed_password column required by auth/login flow
BEGIN;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS hashed_password VARCHAR;

COMMIT;
