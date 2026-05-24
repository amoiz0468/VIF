BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS karma_score INTEGER NOT NULL DEFAULT 50,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS id_verification_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE pulses
    ADD COLUMN IF NOT EXISTS quantity_remaining INTEGER NOT NULL DEFAULT 0;

UPDATE pulses
SET quantity_remaining = quantity
WHERE quantity_remaining IS NULL OR quantity_remaining = 0;

ALTER TABLE claims
    ADD COLUMN IF NOT EXISTS qr_code_token TEXT,
    ADD COLUMN IF NOT EXISTS claim_deadline TIMESTAMPTZ;

UPDATE claims
SET qr_code_token = COALESCE(qr_code_token, qr_token),
    claim_deadline = COALESCE(claim_deadline, expires_at, created_at + INTERVAL '20 minutes');

ALTER TABLE claims
    ALTER COLUMN qr_code_token SET NOT NULL,
    ALTER COLUMN claim_deadline SET NOT NULL;

DO $$
BEGIN
    ALTER TABLE claims
        ADD CONSTRAINT claims_qr_code_token_key UNIQUE (qr_code_token);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
